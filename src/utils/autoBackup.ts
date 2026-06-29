/**
 * Silent auto-backup utility — called after every expense save.
 *
 * Rules (Option A — Local Wins):
 *  - After any local write, if Drive is connected and NOT encrypted, silently
 *    upload in the background. Fire-and-forget: errors are swallowed so they
 *    never interrupt the user's expense recording flow.
 *  - If encryption is enabled we do NOT auto-backup silently because we can't
 *    prompt for the password mid-flow. The user must backup manually.
 *  - Never auto-restore. Restore is always a manual, explicit action.
 */

import * as gdrive from './gdrive';
import * as db from '../db';
import type { AppSettings } from '../types';

let backupDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoBackup(settings: AppSettings): void {
  // Only auto-backup if Drive is connected, signed in, and encryption is OFF
  if (!gdrive.isDriveConfigured()) return;
  if (!gdrive.isSignedIn()) return;
  if (!settings.driveBackup?.hint) return;        // never connected
  if (settings.driveBackup.encryptionEnabled) return; // need password, skip

  // Debounce: if multiple expenses are saved quickly (e.g. group dinner
  // fan-out), wait 3s after the last write before uploading
  if (backupDebounceTimer) clearTimeout(backupDebounceTimer);
  backupDebounceTimer = setTimeout(async () => {
    try {
      const data = await db.exportAllData();
      const content = JSON.stringify(data, null, 2);
      await gdrive.uploadBackup(content);
      // Silently succeeds — no toast, no UI update needed
    } catch {
      // Silently fail — user doesn't need to know about background backup
      // failures; they can always trigger a manual backup from Settings
    }
  }, 3000);
}