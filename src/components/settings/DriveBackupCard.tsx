import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Switch, FormControlLabel,
  Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, CircularProgress, Divider, InputAdornment, IconButton, Avatar
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import GoogleIcon from '@mui/icons-material/Google';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SyncIcon from '@mui/icons-material/Sync';
import { useApp } from '../../hooks/useApp';
import * as db from '../../db';
import * as gdrive from '../../utils/gdrive';
import type { DriveSession } from '../../utils/gdrive';
import { encryptData, decryptData, isEncryptedPayload } from '../../utils/crypto';
import type { DriveBackupMeta } from '../../types';

interface Props {
  /** When true, shows a compact version for embedding in HomePage */
  compact?: boolean;
}

export default function DriveBackupCard({ compact = false }: Props) {
  const { settings, updateSettings, reloadAll } = useApp();

  const [session, setSession] = useState<DriveSession | null>(null);
  const [silentLoading, setSilentLoading] = useState(true); // true while attempting silent re-auth on mount
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [encryptEnabled, setEncryptEnabled] = useState(settings.driveBackup?.encryptionEnabled ?? false);
  const [fileMeta, setFileMeta] = useState<{ size: number; modifiedTime: string } | null>(null);

  const [backupPasswordDialog, setBackupPasswordDialog] = useState(false);
  const [restorePasswordDialog, setRestorePasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [restoreData, setRestoreData] = useState<string | null>(null);

  const driveConfigured = gdrive.isDriveConfigured();

  // ── Silent re-auth on app load ──────────────────────────────────────────────
  useEffect(() => {
    async function trySilentAuth() {
      if (!driveConfigured || !settings.driveBackup?.hint) {
        setSilentLoading(false);
        return;
      }
      const savedSession: DriveSession = {
        email: settings.driveBackup.email,
        name: settings.driveBackup.name,
        picture: settings.driveBackup.picture,
        hint: settings.driveBackup.hint,
        connectedAt: settings.driveBackup.connectedAt,
      };
      const result = await gdrive.silentSignIn(savedSession);
      if (result) {
        setSession(result);
        fetchFileMeta();
      }
      setSilentLoading(false);
    }
    trySilentAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFileMeta = useCallback(async () => {
    try {
      const f = await gdrive.getBackupFileMeta();
      if (f) setFileMeta({ size: Number(f.size), modifiedTime: f.modifiedTime });
    } catch {}
  }, []);

  // ── Sign in ─────────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const newSession = await gdrive.signInWithGoogle();
      setSession(newSession);
      await persistSession(newSession);
      await fetchFileMeta();
      setStatus({ msg: `Signed in as ${newSession.email}`, type: 'success' });
    } catch (err: any) {
      setStatus({ msg: err.message || 'Sign-in failed.', type: 'error' });
    }
    setLoading(false);
  };

  const persistSession = async (s: DriveSession) => {
    const meta: DriveBackupMeta = {
      email: s.email,
      name: s.name,
      picture: s.picture,
      hint: s.hint,
      connectedAt: s.connectedAt,
      lastBackupAt: settings.driveBackup?.lastBackupAt ?? null,
      lastBackupFileName: settings.driveBackup?.lastBackupFileName ?? null,
      lastBackupSize: settings.driveBackup?.lastBackupSize ?? null,
      encryptionEnabled: encryptEnabled,
    };
    await updateSettings({ driveBackup: meta });
  };

  // ── Sign out ────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    gdrive.signOut();
    setSession(null);
    setFileMeta(null);
    // Clear session from persisted settings
    await updateSettings({
      driveBackup: {
        email: '', name: '', picture: '', hint: '',
        connectedAt: 0,
        lastBackupAt: settings.driveBackup?.lastBackupAt ?? null,
        lastBackupFileName: settings.driveBackup?.lastBackupFileName ?? null,
        lastBackupSize: settings.driveBackup?.lastBackupSize ?? null,
        encryptionEnabled: encryptEnabled,
      }
    });
    setStatus({ msg: 'Signed out of Google Drive.', type: 'info' });
  };

  // ── Backup ──────────────────────────────────────────────────────────────────
  const doBackup = async (password?: string) => {
    setLoading(true);
    setStatus(null);
    try {
      const data = await db.exportAllData();
      let content: string;
      if (encryptEnabled && password) {
        const payload = await encryptData(JSON.stringify(data), password);
        content = JSON.stringify(payload);
      } else {
        content = JSON.stringify(data, null, 2);
      }
      const uploaded = await gdrive.uploadBackup(content);
      const updatedMeta: DriveBackupMeta = {
        email: session!.email,
        name: session!.name,
        picture: session!.picture,
        hint: session!.hint,
        connectedAt: session!.connectedAt,
        lastBackupAt: Date.now(),
        lastBackupFileName: uploaded.name,
        lastBackupSize: Number(uploaded.size),
        encryptionEnabled: encryptEnabled,
      };
      await updateSettings({ driveBackup: updatedMeta });
      await fetchFileMeta();
      setStatus({ msg: `Backup complete${encryptEnabled ? ' (encrypted)' : ''}!`, type: 'success' });
    } catch (err: any) {
      setStatus({ msg: err.message || 'Backup failed.', type: 'error' });
    }
    setLoading(false);
    setBackupPasswordDialog(false);
    setPasswordInput('');
    setPasswordConfirm('');
  };

  const handleBackupNow = () => {
    if (encryptEnabled) setBackupPasswordDialog(true);
    else doBackup();
  };

  // ── Restore ─────────────────────────────────────────────────────────────────
  const doRestore = async (content: string, password?: string) => {
    setLoading(true);
    setStatus(null);
    try {
      let jsonStr = content;
      const parsed = JSON.parse(content);
      if (isEncryptedPayload(parsed)) {
        if (!password) {
          setRestoreData(content);
          setRestorePasswordDialog(true);
          setLoading(false);
          return;
        }
        jsonStr = await decryptData(parsed, password);
      }
      const data = JSON.parse(jsonStr);
      await db.importAllData(data);
      await reloadAll();
      setStatus({ msg: 'Data restored successfully!', type: 'success' });
    } catch (err: any) {
      if (err.name === 'OperationError') {
        setStatus({ msg: 'Wrong password or corrupted backup.', type: 'error' });
      } else {
        setStatus({ msg: err.message || 'Restore failed.', type: 'error' });
      }
    }
    setLoading(false);
    setRestorePasswordDialog(false);
    setPasswordInput('');
    setRestoreData(null);
  };

  const handleRestoreFromDrive = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const content = await gdrive.downloadBackup();
      await doRestore(content);
    } catch (err: any) {
      setStatus({ msg: err.message || 'Download failed.', type: 'error' });
      setLoading(false);
    }
  };

  const handleEncryptToggle = async (val: boolean) => {
    setEncryptEnabled(val);
    if (settings.driveBackup) {
      await updateSettings({ driveBackup: { ...settings.driveBackup, encryptionEnabled: val } });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isConnected = Boolean(session) && gdrive.isSignedIn();

  // ── Compact mode (for HomePage quick-access card) ───────────────────────────
  if (compact) {
    if (!driveConfigured) return null;
    if (silentLoading) return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">Connecting to Google Drive…</Typography>
      </Box>
    );
    if (!isConnected) return null; // Only show compact card if signed in

    return (
      <Card sx={{ mb: 2, mx: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Avatar src={session!.picture} sx={{ width: 28, height: 28 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={700} noWrap>{session!.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.65rem' }}>
                {session!.email}
              </Typography>
            </Box>
            {settings.driveBackup?.lastBackupAt && (
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', flexShrink: 0 }}>
                {new Date(settings.driveBackup.lastBackupAt).toLocaleDateString('en-IN')}
              </Typography>
            )}
          </Box>
          {status && (
            <Alert severity={status.type} sx={{ mb: 1, py: 0.25, borderRadius: 2 }} onClose={() => setStatus(null)}>
              {status.msg}
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained" size="small" fullWidth
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon sx={{ fontSize: 16 }} />}
              onClick={handleBackupNow} disabled={loading}
              sx={{ fontSize: '0.75rem', py: 0.75 }}
            >
              Backup
            </Button>
            <Button
              variant="outlined" size="small" fullWidth
              startIcon={<CloudDownloadIcon sx={{ fontSize: 16 }} />}
              onClick={handleRestoreFromDrive} disabled={loading}
              sx={{ fontSize: '0.75rem', py: 0.75 }}
            >
              Restore
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ── Full settings card ───────────────────────────────────────────────────────
  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <GoogleIcon fontSize="small" sx={{ color: '#4285F4' }} />
            <Typography fontWeight={700}>Google Drive Backup</Typography>
            {isConnected && (
              <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                label="Connected" color="success" sx={{ ml: 'auto' }} />
            )}
          </Box>

          {!driveConfigured && (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
              Add <strong>VITE_GOOGLE_CLIENT_ID</strong> to your <code>.env</code> file to enable Google Drive backup.
            </Alert>
          )}

          {status && (
            <Alert severity={status.type} sx={{ mb: 1.5, borderRadius: 2 }} onClose={() => setStatus(null)}>
              {status.msg}
            </Alert>
          )}

          {/* Silent loading state */}
          {silentLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5,
              borderRadius: 2, backgroundColor: 'action.hover' }}>
              <SyncIcon fontSize="small" sx={{ animation: 'spin 1s linear infinite',
                '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
              <Typography variant="body2" color="text.secondary">Reconnecting to Google Drive…</Typography>
            </Box>
          )}

          {/* Not connected */}
          {!silentLoading && !isConnected && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Sign in with Google to back up your data to your own Drive. You only need to do this once — the app will stay signed in automatically.
              </Typography>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <GoogleIcon />}
                onClick={handleSignIn}
                disabled={loading || !driveConfigured}
                fullWidth
                sx={{
                  backgroundColor: '#4285F4',
                  '&:hover': { backgroundColor: '#3367D6' },
                  boxShadow: '0 2px 10px rgba(66,133,244,0.4)'
                }}
              >
                Sign in with Google
              </Button>
            </>
          )}

          {/* Connected */}
          {!silentLoading && isConnected && session && (
            <>
              {/* Account card */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                borderRadius: 2, backgroundColor: 'action.hover', mb: 1.5,
                border: '1px solid', borderColor: 'success.main' + '44'
              }}>
                <Avatar src={session.picture} sx={{ width: 40, height: 40 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>{session.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {session.email}
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" fontSize="small" />
              </Box>

              {/* Backup status */}
              {settings.driveBackup?.lastBackupAt && (
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'action.hover', mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
                    LAST BACKUP
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Date</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {new Date(settings.driveBackup.lastBackupAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Typography>
                  </Box>
                  {settings.driveBackup.lastBackupFileName && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                      <Typography variant="body2" color="text.secondary">File</Typography>
                      <Typography variant="body2" fontWeight={600}>{settings.driveBackup.lastBackupFileName}</Typography>
                    </Box>
                  )}
                  {fileMeta?.size && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                      <Typography variant="body2" color="text.secondary">Size</Typography>
                      <Typography variant="body2" fontWeight={600}>{formatBytes(fileMeta.size)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                    <Typography variant="body2" color="text.secondary">Encryption</Typography>
                    <Chip
                      size="small"
                      icon={encryptEnabled
                        ? <LockIcon sx={{ fontSize: '12px !important' }} />
                        : <LockOpenIcon sx={{ fontSize: '12px !important' }} />}
                      label={encryptEnabled ? 'Enabled' : 'Disabled'}
                      color={encryptEnabled ? 'success' : 'default'}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              )}

              {/* Encryption toggle */}
              <Box sx={{ mb: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch checked={encryptEnabled}
                      onChange={e => handleEncryptToggle(e.target.checked)} color="success" />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Encrypt before upload</Typography>
                      <Typography variant="caption" color="text.secondary">AES-256-GCM · Password protected</Typography>
                    </Box>
                  }
                />
                {!encryptEnabled && (
                  <Alert severity="warning" sx={{ mt: 0.75, py: 0.25, borderRadius: 2 }}>
                    Backups stored in readable form in your Google Drive.
                  </Alert>
                )}
                {encryptEnabled && (
                  <Alert severity="info" sx={{ mt: 0.75, py: 0.25, borderRadius: 2 }}>
                    Encrypted backups cannot be recovered if the password is forgotten.
                  </Alert>
                )}
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button
                  variant="contained" fullWidth
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                  onClick={handleBackupNow} disabled={loading}
                >
                  Backup Now
                </Button>
                <Button
                  variant="outlined" fullWidth
                  startIcon={<CloudDownloadIcon />}
                  onClick={handleRestoreFromDrive} disabled={loading}
                >
                  Restore
                </Button>
              </Box>

              <Button
                variant="text" color="error" fullWidth size="small"
                startIcon={<LogoutIcon />}
                onClick={handleSignOut}
              >
                Sign out of Google Drive
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup password dialog */}
      <Dialog
        open={backupPasswordDialog}
        onClose={() => { setBackupPasswordDialog(false); setPasswordInput(''); setPasswordConfirm(''); }}
        maxWidth="xs" fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="success" /> Set Backup Password
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            This password cannot be recovered. If forgotten, the backup cannot be restored.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Backup Password"
              type={showPassword ? 'text' : 'password'}
              value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              fullWidth size="small" autoFocus
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
              fullWidth size="small"
              error={Boolean(passwordConfirm && passwordInput !== passwordConfirm)}
              helperText={passwordConfirm && passwordInput !== passwordConfirm ? 'Passwords do not match' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => { setBackupPasswordDialog(false); setPasswordInput(''); setPasswordConfirm(''); }}
            color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={() => doBackup(passwordInput)} variant="contained" color="success"
            disabled={!passwordInput || passwordInput !== passwordConfirm || loading}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Encrypt & Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore password dialog */}
      <Dialog
        open={restorePasswordDialog}
        onClose={() => { setRestorePasswordDialog(false); setPasswordInput(''); setRestoreData(null); }}
        maxWidth="xs" fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="warning" /> Enter Backup Password
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This backup is encrypted. Enter the password you used when creating it.
          </Typography>
          <TextField
            label="Backup Password"
            type={showPassword ? 'text' : 'password'}
            value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
            fullWidth size="small" autoFocus
            onKeyDown={e => e.key === 'Enter' && restoreData && doRestore(restoreData, passwordInput)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => { setRestorePasswordDialog(false); setPasswordInput(''); setRestoreData(null); }}
            color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={() => restoreData && doRestore(restoreData, passwordInput)}
            variant="contained"
            disabled={!passwordInput || loading}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Decrypt & Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
