import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, Paper, IconButton, LinearProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useTour, type TourPhase } from '../../hooks/useTour';

// ─── Spotlight rect ────────────────────────────────────────────────────────────
interface SpotlightRect { top: number; left: number; width: number; height: number; }
const PADDING = 8;

function getTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top:    r.top    - PADDING,
    left:   r.left   - PADDING,
    width:  r.width  + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function scrollTo(selector: string) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── Phase metadata ────────────────────────────────────────────────────────────
interface PhaseInfo {
  target?: string;          // CSS selector for spotlight
  title: string;
  body: (captured: { friendName: string; qeName: string; qeAmount: string }) => string;
  action: 'interact' | 'continue' | 'skip-or-continue' | 'done' | 'none';
  position?: 'top' | 'bottom' | 'center' | 'bottom-corner';
  blockOutside?: boolean;   // prevent clicks outside spotlight
  successMsg?: (captured: { friendName: string; qeName: string; qeAmount: string }) => string;
}

const PHASE_INFO: Partial<Record<TourPhase, PhaseInfo>> = {
  'p1-nav-friends': {
    target: '[data-tour="nav-friends"]',
    title: '👥 Step 1 of 6 — Friends',
    body: () => 'Before tracking expenses, add a friend you split costs with. Tap Friends in the menu now.',
    action: 'interact',
    position: 'bottom',
  },
  'p1-friends-fab': {
    target: '[data-tour="friends-fab"]',
    title: '➕ Add your first friend',
    body: () => 'Tap the + button to add a friend.',
    action: 'interact',
    position: 'top',
  },
  'p1-friend-dialog': {
    target: '[role="dialog"]',
    title: '✏️ Enter friend details',
    body: () => 'Type your friend\'s name. Optional: add their Gmail if they use Expense Manager — they\'ll get payment confirmations. Then tap Add.',
    action: 'interact',
    position: 'bottom-corner',
  },
  'p1-friend-saved': {
    title: '✅ Friend added!',
    body: c => `${c.friendName} is ready. Now let's set up a Quick Add shortcut.`,
    action: 'none',
    position: 'center',
    successMsg: c => `${c.friendName} added!`,
  },
  'p2-quick-fab': {
    target: '[data-tour="qe-fab"]',
    title: '⚡ Step 2 of 6 — Quick Expenses',
    body: () => 'Create a shortcut for expenses you pay often. Tap + next to "QUICK ADD" to add one.',
    action: 'interact',
    position: 'bottom',
  },
  'p2-quick-dialog': {
    target: '[role="dialog"]',
    title: '✏️ Name your shortcut',
    body: () => 'Enter an expense you pay often (e.g. Tea, Bus, Lunch) and the usual amount. Then tap Save.',
    action: 'interact',
    position: 'bottom-corner',
  },
  'p2-quick-saved': {
    title: '✅ Shortcut created!',
    body: c => `"${c.qeName} ₹${c.qeAmount}" is ready. Now let\'s use it to record an expense.`,
    action: 'none',
    position: 'center',
  },
  'p3-home-paid-by': {
    target: '[data-tour="paid-by"]',
    title: '👤 Step 3 of 6 — Paid By',
    body: c => `You paid, so leave this as "Me". We'll record ${c.qeName} for you and ${c.friendName}.`,
    action: 'continue',
    position: 'bottom',
    blockOutside: true,
  },
  'p4-home-paid-for': {
    target: '[data-tour="paid-for"]',
    title: '🎯 Step 4 of 6 — Paid For',
    body: c => `You paid for both yourself and ${c.friendName}. Tap here to select multiple people.`,
    action: 'interact',
    position: 'bottom',
  },
  'p4-paid-for-open': {
    target: '[data-tour="multi-select-option"]',
    title: '👥 Select multiple people',
    body: () => 'Choose "Select multiple people…" from the list.',
    action: 'interact',
    position: 'bottom',
  },
  'p4-paid-for-checkbox': {
    target: '[data-tour="paid-for-checkboxes"]',
    title: '☑️ Check both people',
    body: c => `Check both yourself and ${c.friendName}, then confirm.`,
    action: 'interact',
    position: 'bottom-corner',
  },
  'p4-paid-for-confirmed': {
    target: '[data-tour="paid-for-chips"]',
    title: '✅ Both selected!',
    body: c => `You'll split this between you and ${c.friendName}.`,
    action: 'none',
    position: 'bottom',
  },
  'p5-quick-chip': {
    target: '[data-tour="quick-chip-active"]',
    title: '⚡ Step 5 of 6 — Quick Add',
    body: c => `Tap "${c.qeName}" — it records ₹${c.qeAmount} instantly for both of you. One tap!`,
    action: 'interact',
    position: 'bottom',
  },
  'p5-chip-done': {
    title: '🎉 Expense recorded!',
    body: c => `${c.qeName} ₹${c.qeAmount} logged for you and ${c.friendName}. You can also type any expense in the manual entry field below Quick Add.`,
    action: 'continue',
    position: 'center',
  },
  'p6-inbox-intro': {
    title: '🔔 Step 6 of 6 — Inbox (optional)',
    body: c => `If ${c.friendName} uses this app and you linked their Gmail, they'll get a notification to confirm or reject the payment. Sign in with Google to activate this.`,
    action: 'skip-or-continue',
    position: 'center',
  },
  'p6-inbox-nav': {
    target: '[data-tour="nav-inbox"]',
    title: '📬 Open Inbox',
    body: () => 'Tap Inbox in the menu to see it.',
    action: 'interact',
    position: 'top',
  },
  'p7-done': {
    title: '🎉 You\'re all set!',
    body: () => 'Every expense you record is saved forever — search, filter, and export anytime from History. Replay this tour from Settings whenever you like.',
    action: 'done',
    position: 'center',
  },
};

const PROGRESS_PHASES: TourPhase[] = [
  'p1-nav-friends', 'p1-friends-fab', 'p1-friend-dialog',
  'p2-quick-fab', 'p2-quick-dialog',
  'p3-home-paid-by', 'p4-home-paid-for', 'p4-paid-for-checkbox',
  'p5-quick-chip',
  'p6-inbox-intro',
];

function phaseProgress(phase: TourPhase): number {
  const idx = PROGRESS_PHASES.indexOf(phase);
  if (idx < 0) return PROGRESS_PHASES.length;
  return idx;
}

// ─── Tooltip position ──────────────────────────────────────────────────────────
function calcTooltipStyle(
  rect: SpotlightRect | null,
  position: 'top' | 'bottom' | 'center' | 'bottom-corner',
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipWidth = Math.min(320, vw - 32);

  // Bottom-right corner — used when dialog is centered so tooltip never overlaps
  if (position === 'bottom-corner') {
    return {
      position: 'fixed', zIndex: 10001,
      bottom: 24, right: 24,
      width: tooltipWidth,
    };
  }

  if (!rect || position === 'center') {
    return {
      position: 'fixed', zIndex: 10001,
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: tooltipWidth,
    };
  }

  const tooltipHeight = 200;
  const centerX = rect.left + rect.width / 2;
  const left = Math.max(16, Math.min(centerX - tooltipWidth / 2, vw - tooltipWidth - 16));

  let top: number;
  if (position === 'top') {
    top = rect.top - tooltipHeight - 16;
    if (top < 16) top = rect.top + rect.height + 16;
  } else {
    top = rect.top + rect.height + 16;
    if (top + tooltipHeight > vh - 80) top = rect.top - tooltipHeight - 16;
  }

  return { position: 'fixed', zIndex: 10001, top, left, width: tooltipWidth };
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TourOverlay() {
  const {
    active, phase, captured,
    skipTour, skipPhase, nextPhase,
    onFriendsNavTapped, onInboxNavTapped,
  } = useTour();

  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [visible, setVisible] = useState(false);

  const info = PHASE_INFO[phase];

  const recalculate = useCallback(() => {
    if (!info?.target) { setRect(null); return; }
    const r = getTargetRect(info.target);
    setRect(r);
    setTooltipStyle(calcTooltipStyle(r, info.position ?? 'bottom'));
  }, [info]);

  useEffect(() => {
    if (!active || !info) { setVisible(false); return; }
    setVisible(false);

    if (info.target) scrollTo(info.target);

    const t = setTimeout(() => {
      recalculate();
      setVisible(true);
    }, 350);
    return () => clearTimeout(t);
  }, [active, phase]);

  useEffect(() => {
    if (!active) return;
    const h = () => recalculate();
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, true);
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h, true); };
  }, [active, recalculate]);

  if (!active || !info) return null;

  const isDialogPhase = phase === 'p1-friend-dialog' || phase === 'p2-quick-dialog';
  // Dropdown menu and checkbox dialog also render in MUI portals — don't block them
  const isPortalPhase = isDialogPhase || phase === 'p4-paid-for-open' || phase === 'p4-paid-for-checkbox';
  const isNavStep = phase === 'p1-nav-friends' || phase === 'p6-inbox-nav';
  const blockOutside = !isPortalPhase && !isNavStep && (info.blockOutside ?? (info.action === 'interact')) && !!rect;
  const isDone = phase === 'p7-done';
  const isSuccess = phase === 'p1-friend-saved' || phase === 'p2-quick-saved';
  const progressValue = (phaseProgress(phase) / PROGRESS_PHASES.length) * 100;

  const handleNavTarget = () => {
    if (phase === 'p1-nav-friends') onFriendsNavTapped();
    if (phase === 'p6-inbox-nav') onInboxNavTapped();
  };

  return (
    <>
      {/* Four-rect scrim — surrounds spotlight (skipped during portal phases so MUI popups stay interactive) */}
      {visible && rect && !isDone && !isSuccess && !isPortalPhase && (
        <>
          <Box sx={{ position: 'fixed', zIndex: 9999, pointerEvents: blockOutside && !isNavStep ? 'auto' : 'none', top: 0, left: 0, right: 0, height: rect.top, background: 'rgba(0,0,0,0.75)', transition: 'all 0.3s' }} onClick={blockOutside && !isNavStep ? e => e.stopPropagation() : undefined} />
          <Box sx={{ position: 'fixed', zIndex: 9999, pointerEvents: blockOutside && !isNavStep ? 'auto' : 'none', top: rect.top + rect.height, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', transition: 'all 0.3s' }} onClick={blockOutside && !isNavStep ? e => e.stopPropagation() : undefined} />
          <Box sx={{ position: 'fixed', zIndex: 9999, pointerEvents: blockOutside && !isNavStep ? 'auto' : 'none', top: rect.top, left: 0, width: rect.left, height: rect.height, background: 'rgba(0,0,0,0.75)', transition: 'all 0.3s' }} onClick={blockOutside && !isNavStep ? e => e.stopPropagation() : undefined} />
          <Box sx={{ position: 'fixed', zIndex: 9999, pointerEvents: blockOutside && !isNavStep ? 'auto' : 'none', top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height, background: 'rgba(0,0,0,0.75)', transition: 'all 0.3s' }} onClick={blockOutside && !isNavStep ? e => e.stopPropagation() : undefined} />
          {/* Spotlight glow ring */}
          <Box sx={{ position: 'fixed', zIndex: 10000, pointerEvents: isNavStep ? 'auto' : 'none', borderRadius: 2.5, border: '2px solid', borderColor: 'warning.main', boxShadow: '0 0 0 4px rgba(245,124,0,0.25), 0 0 20px rgba(245,124,0,0.3)', transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)', cursor: isNavStep ? 'pointer' : 'default' }}
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            onClick={isNavStep ? handleNavTarget : undefined}
          />
        </>
      )}

      {/* Full overlay for centered (non-spotlight) steps */}
      {visible && (!rect || isDone || isSuccess) && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.6)', pointerEvents: isPortalPhase ? 'none' : 'auto' }} />
      )}

      {/* Tooltip card */}
      {visible && (
        <Paper
          elevation={8}
          sx={{
            ...tooltipStyle,
            borderRadius: 3,
            p: 2.5,
            border: '1px solid',
            borderColor: isDone ? 'success.main' : isSuccess ? 'success.main' : 'warning.main',
            backgroundImage: 'none',
            opacity: 1,
            transition: 'opacity 0.25s, top 0.35s cubic-bezier(0.4,0,0.2,1), left 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Progress bar */}
          {!isDone && !isSuccess && (
            <LinearProgress
              variant="determinate"
              value={progressValue}
              color="warning"
              sx={{ mb: 1.5, borderRadius: 1, height: 3 }}
            />
          )}

          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, pr: 1 }}>
              {info.title}
            </Typography>
            {!isDone && (
              <IconButton size="small" onClick={skipTour} sx={{ mt: -0.5, mr: -0.5, opacity: 0.4, '&:hover': { opacity: 0.8 } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Body */}
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 2 }}>
            {info.body(captured)}
          </Typography>

          {/* Action row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            {info.action === 'interact' && (
              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                Interact above to continue →
              </Typography>
            )}
            {info.action === 'none' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption" color="success.main" fontWeight={600}>
                  {info.successMsg ? info.successMsg(captured) : 'Done!'}
                </Typography>
              </Box>
            )}
            {info.action === 'continue' && (
              <>
                <Box />
                <Button variant="contained" size="small" color="warning" endIcon={<ArrowForwardIcon />}
                  onClick={nextPhase} sx={{ fontWeight: 700, px: 2 }}>
                  Continue
                </Button>
              </>
            )}
            {info.action === 'skip-or-continue' && (
              <>
                <Button size="small" color="inherit" startIcon={<SkipNextIcon />}
                  onClick={skipPhase} sx={{ opacity: 0.6, fontWeight: 600 }}>
                  Skip
                </Button>
                <Button variant="contained" size="small" color="warning" endIcon={<ArrowForwardIcon />}
                  onClick={nextPhase} sx={{ fontWeight: 700, px: 2 }}>
                  Show me
                </Button>
              </>
            )}
            {info.action === 'done' && (
              <>
                <Box />
                <Button variant="contained" size="small" color="success"
                  onClick={nextPhase} sx={{ fontWeight: 700, px: 2 }}>
                  Start using app 🚀
                </Button>
              </>
            )}
          </Box>

          {/* Skip tour link */}
          {!isDone && info.action !== 'done' && (
            <Box sx={{ mt: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled"
                onClick={skipTour}
                sx={{ cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}>
                Skip tour
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}
