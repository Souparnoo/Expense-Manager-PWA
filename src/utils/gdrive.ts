const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPES    = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
const BACKUP_FILENAME = 'expense-manager-backup.json';

// Keys for IndexedDB settings store
export const GDRIVE_SESSION_KEY = 'gdrive-session';

export interface DriveSession {
  email: string;
  name: string;
  picture: string;
  hint: string;       // login_hint for silent re-auth
  connectedAt: number;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
}

// In-memory token — refreshed silently on expiry
let accessToken: string | null = null;
let tokenClient: any = null;

// ── Configuration check ───────────────────────────────────────────────────────

export function isDriveConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID');
}

// ── Load GIS script ───────────────────────────────────────────────────────────

function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) { resolve(); return; }
    const existing = document.getElementById('gis-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// ── Get user info from Google ─────────────────────────────────────────────────

async function fetchUserInfo(token: string): Promise<{ email: string; name: string; picture: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json();
}

// ── Core token request ────────────────────────────────────────────────────────

function requestToken(hint: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      hint,
      callback: (response: any) => {
        if (response.error) {
          // popup_closed_by_user or access_denied — user cancelled
          reject(new Error(response.error === 'access_denied' ? 'Sign-in cancelled.' : response.error));
        } else {
          accessToken = response.access_token;
          resolve(response.access_token);
        }
      },
    });
    tokenClient.requestAccessToken({ prompt });
  });
}

// ── Silent sign-in (on app load) ─────────────────────────────────────────────
// Returns session if silently re-authed, null if not previously connected.
// Never shows a popup — if silent fails, returns null gracefully.

export async function silentSignIn(savedSession: DriveSession | null): Promise<DriveSession | null> {
  if (!isDriveConfigured() || !savedSession) return null;
  try {
    await loadGISScript();
    // prompt: '' means silent — GIS will use the browser's existing Google session
    const token = await requestToken(savedSession.hint, '');
    accessToken = token;
    return savedSession; // session is still valid
  } catch {
    // Silent auth failed (no active Google session in browser) — user must sign in manually
    accessToken = null;
    return null;
  }
}

// ── Interactive sign-in (user clicks "Sign in with Google") ──────────────────

export async function signInWithGoogle(): Promise<DriveSession> {
  if (!isDriveConfigured()) {
    throw new Error('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
  }
  await loadGISScript();
  const token = await requestToken('', 'select_account');
  const userInfo = await fetchUserInfo(token);
  const session: DriveSession = {
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    hint: userInfo.email,   // used for silent re-auth next time
    connectedAt: Date.now(),
  };
  return session;
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export function signOut(): void {
  if (accessToken && (window as any).google?.accounts?.oauth2) {
    (window as any).google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenClient = null;
}

export function isSignedIn(): boolean {
  return Boolean(accessToken);
}

// ── Drive API helpers ─────────────────────────────────────────────────────────

async function driveRequest(url: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) throw new Error('Not signed in to Google Drive');
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    // Token expired — clear it so UI shows reconnect prompt
    accessToken = null;
    throw new Error('Session expired. Please reconnect Google Drive.');
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error ${res.status}: ${err}`);
  }
  return res;
}

// ── Find existing backup file ─────────────────────────────────────────────────

async function findBackupFile(): Promise<DriveFile | null> {
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,size,modifiedTime)&q=name='${BACKUP_FILENAME}'`
  );
  const data = await res.json();
  return data.files?.[0] ?? null;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadBackup(content: string): Promise<DriveFile> {
  const existing = await findBackupFile();
  const blob = new Blob([content], { type: 'application/json' });

  let res: Response;
  if (existing) {
    res = await driveRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media&fields=id,name,size,modifiedTime`,
      { method: 'PATCH', body: blob, headers: { 'Content-Type': 'application/json' } }
    );
  } else {
    const metadata = JSON.stringify({ name: BACKUP_FILENAME, parents: ['appDataFolder'] });
    const form = new FormData();
    form.append('metadata', new Blob([metadata], { type: 'application/json' }));
    form.append('file', blob);
    res = await driveRequest(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,modifiedTime',
      { method: 'POST', body: form }
    );
  }
  return res.json();
}

// ── Download ──────────────────────────────────────────────────────────────────

export async function downloadBackup(): Promise<string> {
  const file = await findBackupFile();
  if (!file) throw new Error('No backup found in Google Drive.');
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`
  );
  return res.text();
}

export async function getBackupFileMeta(): Promise<DriveFile | null> {
  try { return await findBackupFile(); }
  catch { return null; }
}
