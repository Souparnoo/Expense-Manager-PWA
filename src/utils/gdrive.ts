/**
 * Google Drive backup utility.
 * Uses the Google Identity Services (GIS) popup flow — no server required.
 * All data stays in the user's own Google Drive under appDataFolder (hidden app folder).
 *
 * To use:
 *  1. Create a project in Google Cloud Console.
 *  2. Enable Google Drive API.
 *  3. Create an OAuth 2.0 Web Client ID.
 *  4. Add your domain to Authorized JavaScript origins.
 *  5. Set VITE_GOOGLE_CLIENT_ID in your .env file.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPES    = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'expense-manager-backup.json';

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
}

let accessToken: string | null = null;

// ── Auth ─────────────────────────────────────────────────────────────────────

export function isDriveConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID');
}

export async function signInWithGoogle(): Promise<string> {
  if (!isDriveConfigured()) {
    throw new Error('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
  }

  return new Promise((resolve, reject) => {
    // Load GIS script if not already loaded
    const existingScript = document.getElementById('gis-script');
    const doAuth = () => {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            accessToken = response.access_token;
            resolve(response.access_token);
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    };

    if ((window as any).google?.accounts?.oauth2) {
      doAuth();
    } else {
      const script = document.createElement('script');
      script.id = 'gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = doAuth;
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    }
  });
}

export function signOut(): void {
  if (accessToken && (window as any).google?.accounts?.oauth2) {
    (window as any).google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
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
    accessToken = null;
    throw new Error('Google Drive session expired. Please reconnect.');
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
    // Update existing file
    res = await driveRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media&fields=id,name,size,modifiedTime`,
      { method: 'PATCH', body: blob, headers: { 'Content-Type': 'application/json' } }
    );
  } else {
    // Create new file in appDataFolder
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
  try {
    return await findBackupFile();
  } catch {
    return null;
  }
}
