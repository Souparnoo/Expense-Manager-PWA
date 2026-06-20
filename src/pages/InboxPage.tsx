import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Avatar,
  CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Tabs, Tab, Badge, IconButton
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import GoogleIcon from '@mui/icons-material/Google';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { useApp } from '../hooks/useApp';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import type { FirebaseNotification } from '../types';
import { formatDateLong, formatCurrency } from '../utils';

function StatusChip({ status }: { status: FirebaseNotification['status'] }) {
  if (status === 'pending') return (
    <Chip size="small" icon={<HourglassEmptyIcon sx={{ fontSize: '14px !important' }} />}
      label="Pending" color="warning" />
  );
  if (status === 'accepted') return (
    <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
      label="Accepted" color="success" />
  );
  return (
    <Chip size="small" icon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
      label="Rejected" color="error" />
  );
}

export default function InboxPage() {
  const {
    firebaseUser, firebaseLoading, firebaseConfigured,
    notifications, sentNotifications, pendingCount,
    signIn, signOut,
    acceptNotification, rejectNotification,
    deleteReceivedNotification, deleteSentNotification
  } = useFirebaseAuth();
  const { settings, reloadExpenses } = useApp();

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'accept' | 'reject'; notification: FirebaseNotification
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    notification: FirebaseNotification; mode: 'received' | 'sent'
  } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const pending  = notifications.filter(n => n.status === 'pending');
  const accepted = notifications.filter(n => n.status === 'accepted');
  const rejected = notifications.filter(n => n.status === 'rejected');

  const sentPending  = sentNotifications.filter(n => n.status === 'pending');
  const sentAccepted = sentNotifications.filter(n => n.status === 'accepted');
  const sentRejected = sentNotifications.filter(n => n.status === 'rejected');
  // "New" sent updates = accepted/rejected (i.e. resolved, ready for sender to see)
  const sentResolvedCount = sentAccepted.length + sentRejected.length;

  const handleSignIn = async () => {
    setSigningIn(true);
    try { await signIn(); }
    catch (e: any) { setStatusMsg({ msg: e.message || 'Sign-in failed', type: 'error' }); }
    setSigningIn(false);
  };

  const handleAccept = async (n: FirebaseNotification) => {
    setActionLoading(n.id);
    try {
      await acceptNotification(n);
      await reloadExpenses();
      setStatusMsg({ msg: `₹${n.amount} from ${n.fromName} added to your expenses.`, type: 'success' });
    } catch (e: any) {
      setStatusMsg({ msg: e.message || 'Failed to accept', type: 'error' });
    }
    setActionLoading(null);
    setConfirmDialog(null);
  };

  const handleReject = async (n: FirebaseNotification) => {
    setActionLoading(n.id);
    try {
      await rejectNotification(n);
      setStatusMsg({ msg: 'Payment rejected.', type: 'success' });
    } catch (e: any) {
      setStatusMsg({ msg: e.message || 'Failed to reject', type: 'error' });
    }
    setActionLoading(null);
    setConfirmDialog(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.notification.id);
    try {
      if (deleteTarget.mode === 'received') {
        await deleteReceivedNotification(deleteTarget.notification);
      } else {
        await deleteSentNotification(deleteTarget.notification);
      }
      setStatusMsg({ msg: 'Notification deleted.', type: 'success' });
    } catch (e: any) {
      setStatusMsg({ msg: e.message || 'Failed to delete', type: 'error' });
    }
    setActionLoading(null);
    setDeleteTarget(null);
  };

  // ── Not configured ──────────────────────────────────────────────────────────
  if (!firebaseConfigured) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="Inbox" />
        <EmptyState
          icon={<NotificationsIcon />}
          title="Firebase Not Configured"
          subtitle="Add VITE_FIREBASE_* keys to your .env file to enable collaborative notifications."
        />
      </Box>
    );
  }

  // ── Loading auth state ──────────────────────────────────────────────────────
  if (firebaseLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Not signed in ───────────────────────────────────────────────────────────
  if (!firebaseUser) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="Inbox" />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', px: 3, gap: 2 }}>
          <Box sx={{ opacity: 0.3, '& svg': { fontSize: 64 } }}>
            <NotificationsIcon />
          </Box>
          <Typography variant="h6" fontWeight={700} textAlign="center">
            Sign in to receive notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 300 }}>
            When a friend pays for you and tags your Gmail, you'll get a notification here to accept or reject it.
          </Typography>
          <Button
            variant="contained" size="large"
            startIcon={signingIn ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
            onClick={handleSignIn} disabled={signingIn}
            sx={{ backgroundColor: '#4285F4', '&:hover': { backgroundColor: '#3367D6' },
              boxShadow: '0 2px 10px rgba(66,133,244,0.4)', mt: 1 }}
          >
            Sign in with Google
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Signed in ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Inbox"
        subtitle={pendingCount > 0 ? `${pendingCount} pending` : 'All caught up'}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar src={firebaseUser.photoURL ?? ''} sx={{ width: 28, height: 28 }} />
            <Button size="small" color="inherit" onClick={signOut} sx={{ opacity: 0.6, fontSize: '0.75rem' }}>
              Sign out
            </Button>
          </Box>
        }
      />

      {/* Tabs: Received vs Sent */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ px: 2, minHeight: 40, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab
          value="received"
          label={
            <Badge badgeContent={pendingCount} color="error" sx={{ '& .MuiBadge-badge': { right: -10 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <InboxIcon sx={{ fontSize: 16 }} /> Received
              </Box>
            </Badge>
          }
          sx={{ minHeight: 40, textTransform: 'none' }}
        />
        <Tab
          value="sent"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SendIcon sx={{ fontSize: 16 }} /> Sent
            </Box>
          }
          sx={{ minHeight: 40, textTransform: 'none' }}
        />
      </Tabs>

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10, px: 2, pt: 2 }}>
        {statusMsg && (
          <Alert severity={statusMsg.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setStatusMsg(null)}>
            {statusMsg.msg}
          </Alert>
        )}

        {/* ── RECEIVED TAB ──────────────────────────────────────────────────── */}
        {tab === 'received' && (
          notifications.length === 0 ? (
            <EmptyState
              icon={<NotificationsIcon />}
              title="No Notifications"
              subtitle="When friends pay for you and tag your Gmail, requests will appear here."
            />
          ) : (
            <>
              {pending.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={700} color="warning.main"
                    sx={{ letterSpacing: '0.1em', display: 'block', mb: 1 }}>
                    ⏳ PENDING CONFIRMATION
                  </Typography>
                  {pending.map(n => (
                    <NotificationCard
                      key={n.id} n={n} currency={settings.currency}
                      actionLoading={actionLoading} mode="received"
                      onAccept={() => setConfirmDialog({ type: 'accept', notification: n })}
                      onReject={() => setConfirmDialog({ type: 'reject', notification: n })}
                      onDelete={() => setDeleteTarget({ notification: n, mode: 'received' })}
                    />
                  ))}
                </Box>
              )}
              {accepted.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={700} color="success.main"
                    sx={{ letterSpacing: '0.1em', display: 'block', mb: 1 }}>
                    ✅ ACCEPTED
                  </Typography>
                  {accepted.map(n => (
                    <NotificationCard key={n.id} n={n} currency={settings.currency}
                      actionLoading={null} mode="received"
                      onDelete={() => setDeleteTarget({ notification: n, mode: 'received' })} />
                  ))}
                </Box>
              )}
              {rejected.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={700} color="error.main"
                    sx={{ letterSpacing: '0.1em', display: 'block', mb: 1 }}>
                    ❌ REJECTED
                  </Typography>
                  {rejected.map(n => (
                    <NotificationCard key={n.id} n={n} currency={settings.currency}
                      actionLoading={null} mode="received"
                      onDelete={() => setDeleteTarget({ notification: n, mode: 'received' })} />
                  ))}
                </Box>
              )}
            </>
          )
        )}

        {/* ── SENT TAB ──────────────────────────────────────────────────────── */}
        {tab === 'sent' && (
          sentNotifications.length === 0 ? (
            <EmptyState
              icon={<SendIcon />}
              title="No Sent Notifications"
              subtitle="Payments you send to friends with linked Gmail will show their confirmation status here."
            />
          ) : (
            <>
              {sentPending.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={700} color="warning.main"
                    sx={{ letterSpacing: '0.1em', display: 'block', mb: 1 }}>
                    ⏳ WAITING FOR THEM
                  </Typography>
                  {sentPending.map(n => (
                    <NotificationCard key={n.id} n={n} currency={settings.currency}
                      actionLoading={null} mode="sent"
                      onDelete={() => setDeleteTarget({ notification: n, mode: 'sent' })} />
                  ))}
                </Box>
              )}
              {sentAccepted.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={700} color="success.main"
                    sx={{ letterSpacing: '0.1em', display: 'block', mb: 1 }}>
                    ✅ THEY ACCEPTED
                  </Typography>
                  {sentAccepted.map(n => (
                    <NotificationCard key={n.id} n={n} currency={settings.currency}
                      actionLoading={null} mode="sent"
                      onDelete={() => setDeleteTarget({ notification: n, mode: 'sent' })} />
                  ))}
                </Box>
              )}
              {sentRejected.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" fontWeight={700} color="error.main"
                    sx={{ letterSpacing: '0.1em', display: 'block', mb: 1 }}>
                    ❌ THEY REJECTED
                  </Typography>
                  {sentRejected.map(n => (
                    <NotificationCard key={n.id} n={n} currency={settings.currency}
                      actionLoading={null} mode="sent"
                      onDelete={() => setDeleteTarget({ notification: n, mode: 'sent' })} />
                  ))}
                </Box>
              )}
            </>
          )
        )}
      </Box>

      {/* Confirm dialog (only relevant for Received tab) */}
      <Dialog open={Boolean(confirmDialog)} onClose={() => setConfirmDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {confirmDialog?.type === 'accept' ? '✅ Accept Payment?' : '❌ Reject Payment?'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog && (
            <Typography variant="body2" color="text.secondary">
              {confirmDialog.type === 'accept'
                ? (confirmDialog.notification.direction === 'you_paid_for_me'
                    ? `This confirms YOU paid ₹${confirmDialog.notification.amount} for "${confirmDialog.notification.expenseName}" on behalf of ${confirmDialog.notification.fromName}. It will be added to your expenses as money ${confirmDialog.notification.fromName} owes you.`
                    : `This will add "${confirmDialog.notification.expenseName}" ₹${confirmDialog.notification.amount} paid by ${confirmDialog.notification.fromName} to your expenses.`)
                : `You will mark this payment as rejected. It will NOT be added to your expenses. ${confirmDialog.notification.fromName} will see it as rejected.`
              }
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirmDialog(null)} color="inherit" variant="outlined">Cancel</Button>
          <Button
            onClick={() => confirmDialog?.type === 'accept'
              ? handleAccept(confirmDialog.notification)
              : handleReject(confirmDialog.notification)}
            variant="contained"
            color={confirmDialog?.type === 'accept' ? 'success' : 'error'}
            disabled={Boolean(actionLoading)}
          >
            {actionLoading ? <CircularProgress size={18} color="inherit" /> :
              confirmDialog?.type === 'accept' ? 'Accept' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Notification"
        message={
          deleteTarget?.mode === 'sent'
            ? "This removes it from your Sent list only. It won't affect any expense already recorded on either side."
            : "This removes it from your Received list only. If it was already accepted/rejected, your expenses are not affected."
        }
        confirmText="Delete"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

// ── Single notification card ──────────────────────────────────────────────────
function NotificationCard({
  n, currency, actionLoading, mode, onAccept, onReject, onDelete
}: {
  n: FirebaseNotification;
  currency: string;
  actionLoading: string | null;
  mode: 'received' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
}) {
  const isLoading = actionLoading === n.id;
  return (
    <Card sx={{ mb: 1.5 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography fontWeight={700}>{n.expenseName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateLong(n.date)} · {n.time} · {n.categoryName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StatusChip status={n.status} />
            {onDelete && (
              <IconButton size="small" onClick={onDelete} sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}>
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: (mode === 'received' && n.status === 'pending') ? 1.5 : 0 }}>
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
            {n.fromName[0]}
          </Avatar>
          <Typography variant="body2" color="text.secondary">
            {mode === 'sent'
              ? (n.direction === 'you_paid_for_me'
                  ? <>Sent to confirm <strong>they</strong> paid you</>
                  : <>Sent to confirm <strong>you</strong> paid them</>)
              : (n.direction === 'you_paid_for_me'
                  ? <>You paid for <strong>{n.fromName}</strong></>
                  : <><strong>{n.fromName}</strong> paid</>)}
          </Typography>
          <Typography variant="body1" fontWeight={800} color="primary.main" sx={{ ml: 'auto' }}>
            {formatCurrency(n.amount, currency)}
          </Typography>
        </Box>

        {mode === 'received' && n.status === 'pending' && onAccept && onReject && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained" color="success" size="small" fullWidth
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
              onClick={onAccept} disabled={isLoading}
            >
              Accept
            </Button>
            <Button
              variant="outlined" color="error" size="small" fullWidth
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <CloseIcon />}
              onClick={onReject} disabled={isLoading}
            >
              Reject
            </Button>
          </Box>
        )}

        {mode === 'received' && n.status === 'accepted' && (
          <Typography variant="caption" color="success.main">✅ Added to your expenses</Typography>
        )}
        {mode === 'received' && n.status === 'rejected' && (
          <Typography variant="caption" color="error.main">❌ You rejected this payment</Typography>
        )}

        {mode === 'sent' && n.status === 'pending' && (
          <Typography variant="caption" color="warning.main">⏳ Waiting for them to respond</Typography>
        )}
        {mode === 'sent' && n.status === 'accepted' && (
          <Typography variant="caption" color="success.main">✅ They confirmed this payment</Typography>
        )}
        {mode === 'sent' && n.status === 'rejected' && (
          <Typography variant="caption" color="error.main">❌ They rejected this payment</Typography>
        )}
      </CardContent>
    </Card>
  );
}
