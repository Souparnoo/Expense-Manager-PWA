import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut as fbSignOut, onAuthStateChanged,
  type User, type Auth
} from 'firebase/auth';
import {
  getDatabase, ref, set, get, remove, onValue,
  off, push, update, type Database
} from 'firebase/database';
import type { FirebaseNotification } from '../types';

const firebaseConfig = {
  apiKey:        import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:   import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:     import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:         import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'undefined' &&
    firebaseConfig.databaseURL
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) throw new Error('Firebase not configured. Add VITE_FIREBASE_* to your .env file.');
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    database = getDatabase(app);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  getFirebaseApp();
  return auth!;
}

export function getFirebaseDB(): Database {
  getFirebaseApp();
  return database!;
}

//  Auth

export async function signInWithGoogle(): Promise<User> {
  const a = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(a, provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  const a = getFirebaseAuth();
  await fbSignOut(a);
}

export function onAuthChanged(callback: (user: User | null) => void): () => void {
  const a = getFirebaseAuth();
  const unsub = onAuthStateChanged(a, callback);
  return unsub;
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null;
  try { return getFirebaseAuth().currentUser; }
  catch { return null; }
}

// ── User registry — so senders can look up a recipient's UID by email ─────────

export async function registerUser(user: User): Promise<void> {
  const db = getFirebaseDB();
  if (!user.email) return;

  await set(ref(db, `users/${user.uid}`), {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    updatedAt: Date.now(),
  });

  const emailKey = user.email.toLowerCase().replace(/\./g, ',');
  await set(ref(db, `emailIndex/${emailKey}`), {
    uid: user.uid,
    displayName: user.displayName ?? user.email,
  });
}

export async function findUserByEmail(email: string): Promise<{ uid: string; displayName: string } | null> {
  const db = getFirebaseDB();
  const emailKey = email.toLowerCase().replace(/\./g, ',');
  const snap = await get(ref(db, `emailIndex/${emailKey}`));
  if (!snap.exists()) return null;
  const data = snap.val();
  return { uid: data.uid, displayName: data.displayName ?? email };
}

// ── Notifications ─────────────────────────────────────────────────────────────
//
// DATA MODEL (important — read before touching this file):
//
//   /notifications/{recipientUid}/{notificationId}
//       The recipient's copy. Only the recipient can read this node (Firebase
//       rule: $recipientUid === auth.uid). The sender can WRITE here (to
//       deliver the notification) but can NEVER read it back — Firebase
//       denies that. This was the root cause of the original "sender never
//       sees accept/reject" bug: the sender's listener was trying to read
//       the recipient's private node and being silently denied.
//
//   /sentNotifications/{senderUid}/{notificationId}
//       The sender's OWN full copy of the same notification, written at send
//       time AND kept in sync by the recipient when they accept/reject. The
//       sender only ever reads their own node, which they always have
//       permission for. This is what "Sent" tab listens to.
//
// When the recipient accepts/rejects, they update BOTH:
//   notifications/{their own uid}/{id}/status        (their own node — allowed)
//   sentNotifications/{senderUid}/{id}/status         (sender's node — allowed,
//                                                       because the rule permits
//                                                       any signed-in user to
//                                                       write a status update,
//                                                       see firebase-rules.json)

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function sendNotification(
  recipientUid: string,
  payload: Omit<FirebaseNotification, 'id' | 'expiresAt'>
): Promise<string> {
  const db = getFirebaseDB();
  const notifRef = push(ref(db, `notifications/${recipientUid}`));
  const notifId = notifRef.key!;
  const fullPayload = {
    ...payload,
    expiresAt: payload.createdAt + SEVEN_DAYS_MS,
  };

  // Write recipient's copy AND sender's full mirror copy in a single atomic
  // multi-path update — both contain the FULL notification content, so
  // neither side ever needs to read a node they don't own.
  const updates: Record<string, any> = {
    [`notifications/${recipientUid}/${notifId}`]: fullPayload,
    [`sentNotifications/${payload.fromUid}/${notifId}`]: { ...fullPayload, recipientUid },
  };
  await update(ref(db), updates);

  return notifId;
}

/**
 * Called by the RECIPIENT when they accept/reject. Updates status on BOTH
 * copies in one atomic write:
 *   - their own `notifications/{recipientUid}/{id}/status`  (their node)
 *   - the sender's `sentNotifications/{senderUid}/{id}/status` (sender's node)
 *
 * This is why the reply now reaches the sender — we write directly into the
 * sender's own node (which Firebase rules allow any signed-in user to do for
 * a status update) instead of expecting the sender to read the recipient's
 * private node, which was always denied.
 */
export async function updateNotificationStatus(
  recipientUid: string,
  senderUid: string,
  notificationId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  const db = getFirebaseDB();
  const updates: Record<string, any> = {
    [`notifications/${recipientUid}/${notificationId}/status`]: status,
    [`sentNotifications/${senderUid}/${notificationId}/status`]: status,
  };
  await update(ref(db), updates);
}

export async function deleteNotification(
  recipientUid: string,
  notificationId: string
): Promise<void> {
  const db = getFirebaseDB();
  await remove(ref(db, `notifications/${recipientUid}/${notificationId}`));
}

// Removes only the sender-side copy (used when sender deletes from their own
// "Sent" list — does not touch the recipient's copy)
export async function deleteSentMirror(
  senderUid: string,
  notificationId: string
): Promise<void> {
  const db = getFirebaseDB();
  await remove(ref(db, `sentNotifications/${senderUid}/${notificationId}`));
}

// Listen for incoming notifications for current user (real-time) — Received tab
export function listenToMyNotifications(
  uid: string,
  callback: (notifications: FirebaseNotification[]) => void
): () => void {
  const db = getFirebaseDB();
  const notifRef = ref(db, `notifications/${uid}`);
  const handler = onValue(notifRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const raw = snap.val() as Record<string, any>;
    const now = Date.now();
    const notifs: FirebaseNotification[] = Object.entries(raw)
      .map(([id, data]) => ({ id, ...data } as FirebaseNotification))
      .filter(n => n.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(notifs);
  });
  return () => off(notifRef, 'value', handler);
}

/**
 * Real-time listener for ALL notifications the current user has sent — Sent tab.
 * Reads ONLY from `/sentNotifications/{uid}`, which the sender always has
 * permission to read (it's their own node) and which now contains the FULL
 * notification content including live status — no nested reads, no cross-user
 * permission issues, single direct listener.
 */
export function listenToMySentNotifications(
  uid: string,
  callback: (notifications: FirebaseNotification[]) => void
): () => void {
  const db = getFirebaseDB();
  const sentRef = ref(db, `sentNotifications/${uid}`);
  const handler = onValue(sentRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const raw = snap.val() as Record<string, any>;
    const notifs: FirebaseNotification[] = Object.entries(raw)
      .map(([id, data]) => ({ id, ...data } as FirebaseNotification))
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(notifs);
  });
  return () => off(sentRef, 'value', handler);
}

// Clean up expired notifications for a user (their received copies)
export async function cleanExpiredNotifications(uid: string): Promise<void> {
  const db = getFirebaseDB();
  const snap = await get(ref(db, `notifications/${uid}`));
  if (!snap.exists()) return;
  const now = Date.now();
  const tasks: Promise<void>[] = [];
  snap.forEach((child) => {
    const data = child.val();
    if (data.expiresAt && data.expiresAt < now) {
      tasks.push(remove(child.ref));
    }
  });
  await Promise.all(tasks);
}
