import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Switch, FormControlLabel,
  Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, CircularProgress, Divider, InputAdornment, IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useApp } from '../../hooks/useApp';
import * as db from '../../db';
import * as gdrive from '../../utils/gdrive';
import { encryptData, decryptData, isEncryptedPayload } from '../../utils/crypto';
import type { DriveBackupMeta } from '../../types';

export default function DriveBackupCard() {
  const { settings, updateSettings, reloadAll } = useApp();

  const [connected, setConnected] = useState(gdrive.isSignedIn());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [encryptEnabled, setEncryptEnabled] = useState(settings.driveBackup?.encryptionEnabled ?? false);
  const [fileMeta, setFileMeta] = useState<{ size: number; modifiedTime: string } | null>(null);

  // Password dialogs
  const [backupPasswordDialog, setBackupPasswordDialog] = useState(false);
  const [restorePasswordDialog, setRestorePasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [restoreData, setRestoreData] = useState<string | null>(null);

  const driveConfigured = gdrive.isDriveConfigured();

  useEffect(() => {
    if (connected) fetchFileMeta();
  }, [connected]);

  const fetchFileMeta = async () => {
    try {
      const f = await gdrive.getBackupFileMeta();
      if (f) setFileMeta({ size: Number(f.size), modifiedTime: f.modifiedTime });
    } catch {}
  };

  const handleConnect = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await gdrive.signInWithGoogle();
      setConnected(true);
      await fetchFileMeta();
      // Persist connection metadata
      await updateSettings({
        driveBackup: {
          ...settings.driveBackup,
          connectedAt: Date.now(),
          lastBackupAt: settings.driveBackup?.lastBackupAt ?? null,
          lastBackupFileName: settings.driveBackup?.lastBackupFileName ?? null,
          lastBackupSize: settings.driveBackup?.lastBackupSize ?? null,
          encryptionEnabled: encryptEnabled,
        }
      });
      setStatus({ msg: 'Google Drive connected!', type: 'success' });
    } catch (err: any) {
      setStatus({ msg: err.message || 'Connection failed.', type: 'error' });
    }
    setLoading(false);
  };

  const handleDisconnect = () => {
    gdrive.signOut();
    setConnected(false);
    setFileMeta(null);
    setStatus({ msg: 'Disconnected from Google Drive.', type: 'info' });
  };

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
      const meta: DriveBackupMeta = {
        connectedAt: settings.driveBackup?.connectedAt ?? Date.now(),
        lastBackupAt: Date.now(),
        lastBackupFileName: uploaded.name,
        lastBackupSize: Number(uploaded.size),
        encryptionEnabled: encryptEnabled,
      };
      await updateSettings({ driveBackup: meta });
      await fetchFileMeta();
      setStatus({ msg: `Backup uploaded${encryptEnabled ? ' (encrypted)' : ''}!`, type: 'success' });
    } catch (err: any) {
      setStatus({ msg: err.message || 'Backup failed.', type: 'error' });
    }
    setLoading(false);
    setBackupPasswordDialog(false);
    setPasswordInput('');
    setPasswordConfirm('');
  };

  const handleBackupNow = () => {
    if (encryptEnabled) {
      setBackupPasswordDialog(true);
    } else {
      doBackup();
    }
  };

  const doRestore = async (content: string, password?: string) => {
    setLoading(true);
    setStatus(null);
    try {
      let jsonStr = content;
      const parsed = JSON.parse(content);

      if (isEncryptedPayload(parsed)) {
        if (!password) {
          // Need password — store raw and open dialog
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

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CloudUploadIcon fontSize="small" color="primary" />
            <Typography fontWeight={700}>Google Drive Backup</Typography>
            {connected && (
              <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                label="Connected" color="success" sx={{ ml: 'auto' }} />
            )}
          </Box>

          {!driveConfigured && (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
              Add <strong>VITE_GOOGLE_CLIENT_ID</strong> to your <code>.env</code> file to enable Google Drive backup.
              See <code>src/utils/gdrive.ts</code> for setup instructions.
            </Alert>
          )}

          {status && (
            <Alert severity={status.type} sx={{ mb: 1.5, borderRadius: 2 }} onClose={() => setStatus(null)}>
              {status.msg}
            </Alert>
          )}

          {/* Connect / Disconnect */}
          {!connected ? (
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
              onClick={handleConnect}
              disabled={loading || !driveConfigured}
              fullWidth sx={{ mb: 1.5 }}
            >
              Connect Google Drive
            </Button>
          ) : (
            <>
              {/* Status info */}
              {(fileMeta || settings.driveBackup?.lastBackupAt) && (
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'action.hover', mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
                    BACKUP STATUS
                  </Typography>
                  {settings.driveBackup?.lastBackupAt && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Last backup</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {new Date(settings.driveBackup.lastBackupAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                  )}
                  {settings.driveBackup?.lastBackupFileName && (
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
                      icon={encryptEnabled ? <LockIcon sx={{ fontSize: '12px !important' }} /> : <LockOpenIcon sx={{ fontSize: '12px !important' }} />}
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
                    <Switch checked={encryptEnabled} onChange={e => handleEncryptToggle(e.target.checked)} color="success" />
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
                    Backups are stored in readable form in your Google Drive.
                  </Alert>
                )}
                {encryptEnabled && (
                  <Alert severity="info" sx={{ mt: 0.75, py: 0.25, borderRadius: 2 }}>
                    Encrypted backups cannot be recovered if the backup password is forgotten.
                  </Alert>
                )}
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                  onClick={handleBackupNow}
                  disabled={loading}
                  fullWidth
                >
                  Backup Now
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloudDownloadIcon />}
                  onClick={handleRestoreFromDrive}
                  disabled={loading}
                  fullWidth
                >
                  Restore
                </Button>
              </Box>

              <Button
                variant="text"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={handleDisconnect}
                size="small"
                fullWidth
              >
                Disconnect Google Drive
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup password dialog */}
      <Dialog open={backupPasswordDialog} onClose={() => { setBackupPasswordDialog(false); setPasswordInput(''); setPasswordConfirm(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="success" />
            Set Backup Password
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
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
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
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              fullWidth size="small"
              error={Boolean(passwordConfirm && passwordInput !== passwordConfirm)}
              helperText={passwordConfirm && passwordInput !== passwordConfirm ? 'Passwords do not match' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => { setBackupPasswordDialog(false); setPasswordInput(''); setPasswordConfirm(''); }} color="inherit" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => doBackup(passwordInput)}
            variant="contained" color="success"
            disabled={!passwordInput || passwordInput !== passwordConfirm || loading}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Encrypt & Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore password dialog */}
      <Dialog open={restorePasswordDialog} onClose={() => { setRestorePasswordDialog(false); setPasswordInput(''); setRestoreData(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="warning" />
            Enter Backup Password
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This backup is encrypted. Enter the password you used when creating it.
          </Typography>
          <TextField
            label="Backup Password"
            type={showPassword ? 'text' : 'password'}
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
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
          <Button onClick={() => { setRestorePasswordDialog(false); setPasswordInput(''); setRestoreData(null); }} color="inherit" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => restoreData && doRestore(restoreData, passwordInput)}
            variant="contained"
            disabled={!passwordInput || loading}
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Decrypt & Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
