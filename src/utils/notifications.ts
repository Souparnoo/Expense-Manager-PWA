/**
 * Helper to send a payment notification to a friend via Firebase
 * and cache the notification ID locally so we can watch status changes.
 */

import * as fb from './firebase';
import { saveNotificationCache } from '../db';
import type { Expense, Friend, Category, NotificationDirection } from '../types';

export async function sendPaymentNotification(
  expense: Expense,
  friend: Friend,
  senderUser: { uid: string; email: string; displayName: string | null },
  categories: Category[],
  direction: NotificationDirection
): Promise<string | null> {
  if (!friend.linkedEmail) return null;
  if (!fb.isFirebaseConfigured()) return null;

  try {
    const recipient = await fb.findUserByEmail(friend.linkedEmail);
    if (!recipient) {
      console.info(`Friend ${friend.linkedEmail} not found in Firebase user registry.`);
      return null;
    }

    const cat = categories.find(c => c.id === (expense.categoryId || 'other'));

    const notifId = await fb.sendNotification(recipient.uid, {
      fromUid: senderUser.uid,
      fromEmail: senderUser.email,
      fromName: senderUser.displayName || senderUser.email,
      expenseId: expense.id,
      expenseName: expense.name,
      amount: expense.amount,
      date: expense.date,
      time: expense.time,
      categoryId: expense.categoryId || 'other',
      categoryName: cat?.name ?? 'Other',
      direction,
      status: 'pending',
      createdAt: Date.now(),
    });

    await saveNotificationCache({
      notificationId: notifId,
      expenseId: expense.id,
      recipientUid: recipient.uid,
      recipientEmail: friend.linkedEmail,
      createdAt: Date.now(),
    });

    return notifId;
  } catch (err) {
    console.error('Failed to send payment notification:', err);
    return null;
  }
}
