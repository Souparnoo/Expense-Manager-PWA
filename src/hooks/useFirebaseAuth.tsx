import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import * as fb from '../utils/firebase';
import { useApp } from './useApp';
import type { FirebaseNotification } from '../types';

interface FirebaseAuthContextType {
  firebaseUser: User | null;
  firebaseLoading: boolean;
  firebaseConfigured: boolean;
  notifications: FirebaseNotification[];
  sentNotifications: FirebaseNotification[];
  pendingCount: number;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  acceptNotification: (n: FirebaseNotification) => Promise<void>;
  rejectNotification: (n: FirebaseNotification) => Promise<void>;
  deleteReceivedNotification: (n: FirebaseNotification) => Promise<void>;
  deleteSentNotification: (n: FirebaseNotification) => Promise<void>;
  refreshSentWatchers: () => void;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | null>(null);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [notifications, setNotifications] = useState<FirebaseNotification[]>([]);
  const [sentNotifications, setSentNotifications] = useState<FirebaseNotification[]>([]);
  const configured = fb.isFirebaseConfigured();
  const { reloadExpenses } = useApp();

  // Tracks previous status per notification ID so we only react when status
  // actually transitions away from 'pending' (avoids redundant DB writes).
  const prevStatusRef = useRef<Record<string, string>>({});

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!configured) { setFirebaseLoading(false); return; }
    const unsub = fb.onAuthChanged(async (user) => {
      setFirebaseUser(user);
      setFirebaseLoading(false);
      if (user) {
        await fb.registerUser(user);
        await fb.cleanExpiredNotifications(user.uid);
      }
    });
    return unsub;
  }, [configured]);

  // Real-time listener for incoming notifications — Received tab
  useEffect(() => {
    if (!firebaseUser) { setNotifications([]); return; }
    const unsub = fb.listenToMyNotifications(firebaseUser.uid, setNotifications);
    return unsub;
  }, [firebaseUser]);

  // Real-time listener for everything I've SENT — Sent tab.
  // Reads only from my own `sentNotifications/{uid}` node (always permitted),
  // which now contains the full notification content AND live status,
  // because the recipient writes their accept/reject directly into this node
  // too (see fb.updateNotificationStatus).
  const [watcherVersion, setWatcherVersion] = useState(0);
  const refreshSentWatchers = useCallback(() => setWatcherVersion(v => v + 1), []);

  useEffect(() => {
    if (!firebaseUser) { setSentNotifications([]); return; }

    const unsub = fb.listenToMySentNotifications(firebaseUser.uid, async (notifs) => {
      setSentNotifications(notifs);

      const { getExpense, saveExpense } = await import('../db');
      for (const n of notifs) {
        const prevStatus = prevStatusRef.current[n.id];
        if (prevStatus !== n.status && n.status !== 'pending') {
          const expense = await getExpense(n.expenseId);
          if (expense && expense.confirmationStatus !== n.status) {
            await saveExpense({
              ...expense,
              confirmationStatus: n.status,
              updatedAt: Date.now(),
            });
            await reloadExpenses();
          }
        }
        prevStatusRef.current[n.id] = n.status;
      }
    });

    return unsub;
  }, [firebaseUser, watcherVersion, reloadExpenses]);

  const pendingCount = notifications.filter(n => n.status === 'pending').length;

  const signIn = useCallback(async () => {
    await fb.signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    await fb.signOut();
    setFirebaseUser(null);
    setNotifications([]);
    setSentNotifications([]);
  }, []);

  // Accept: create expense locally AND write status to BOTH Firebase copies
  const acceptNotification = useCallback(async (n: FirebaseNotification) => {
    if (!firebaseUser) return;

    const { saveExpense, getAllFriends } = await import('../db');
    const { generateId } = await import('../utils');

    const friends = await getAllFriends();
    const senderFriend = friends.find(
      f => f.linkedEmail?.toLowerCase() === n.fromEmail.toLowerCase()
    );
    const senderRef = senderFriend?.id ?? n.fromEmail;

    const direction = n.direction ?? 'i_paid_for_you';
    const paidBy  = direction === 'i_paid_for_you' ? senderRef : 'me';
    const paidFor = direction === 'i_paid_for_you' ? 'me' : senderRef;

    const expense = {
      id: generateId(),
      date: n.date,
      time: n.time,
      timestamp: new Date(`${n.date}T${n.time}`).getTime(),
      name: n.expenseName,
      amount: n.amount,
      paidBy,
      paidFor,
      categoryId: n.categoryId || 'other',
      confirmationStatus: 'accepted' as const,
      notificationId: n.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveExpense(expense);

    // Writes status into BOTH my own `notifications/` copy AND the sender's
    // `sentNotifications/` copy — this is what actually delivers the reply
    // back to the sender (previously only the recipient's copy was updated,
    // and the sender had no permission to read that node).
    await fb.updateNotificationStatus(firebaseUser.uid, n.fromUid, n.id, 'accepted');
  }, [firebaseUser]);

  const rejectNotification = useCallback(async (n: FirebaseNotification) => {
    if (!firebaseUser) return;
    await fb.updateNotificationStatus(firebaseUser.uid, n.fromUid, n.id, 'rejected');
  }, [firebaseUser]);

  // Delete a notification someone sent TO me (Received list only)
  const deleteReceivedNotification = useCallback(async (n: FirebaseNotification) => {
    if (!firebaseUser) return;
    await fb.deleteNotification(firebaseUser.uid, n.id);
    setNotifications(prev => prev.filter(x => x.id !== n.id));
  }, [firebaseUser]);

  // Delete a notification I sent — removes the recipient's copy + my own mirror.
  // n.recipientUid is stored directly on the sent-notification object now, so
  // no extra lookup is needed.
  const deleteSentNotification = useCallback(async (n: FirebaseNotification) => {
    if (!firebaseUser) return;
    if (n.recipientUid) {
      await fb.deleteNotification(n.recipientUid, n.id);
    }
    await fb.deleteSentMirror(firebaseUser.uid, n.id);
    setSentNotifications(prev => prev.filter(x => x.id !== n.id));
  }, [firebaseUser]);

  return (
    <FirebaseAuthContext.Provider value={{
      firebaseUser,
      firebaseLoading,
      firebaseConfigured: configured,
      notifications,
      sentNotifications,
      pendingCount,
      signIn,
      signOut,
      acceptNotification,
      rejectNotification,
      deleteReceivedNotification,
      deleteSentNotification,
      refreshSentWatchers,
    }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth(): FirebaseAuthContextType {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) throw new Error('useFirebaseAuth must be used inside FirebaseAuthProvider');
  return ctx;
}
