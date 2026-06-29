import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ─── Phase definitions ────────────────────────────────────────────────────────

export type TourPhase =
  | 'idle'
  | 'p1-nav-friends'          // spotlight Friends in nav, tell user to tap
  | 'p1-friends-fab'          // spotlight + FAB on friends page
  | 'p1-friend-dialog'        // spotlight dialog fields — user types & saves
  | 'p1-friend-saved'         // brief success, transition to phase 2
  | 'p2-nav-quick'            // navigate to Quick Expenses (auto), spotlight FAB
  | 'p2-quick-fab'            // spotlight QE FAB — user taps
  | 'p2-quick-dialog'         // user fills name + amount fields
  | 'p2-quick-saved'          // QE created — brief success, transition
  | 'p3-home-paid-by'         // on Home: spotlight Paid By — info only
  | 'p4-home-paid-for'        // spotlight Paid For dropdown
  | 'p4-paid-for-open'        // user opens dropdown — spotlight multi-select option
  | 'p4-paid-for-checkbox'    // spotlight checkbox list — user checks both
  | 'p4-paid-for-confirmed'   // multi-select chip visible
  | 'p5-quick-chip'           // spotlight the specific QE chip the user created
  | 'p5-chip-done'            // success message
  | 'p6-inbox-intro'          // optional — link account; give skip button
  | 'p6-inbox-nav'            // tell user to tap Inbox
  | 'p7-done';                // finale

export interface TourCaptured {
  friendName: string;
  qeName: string;
  qeAmount: string;
}

interface TourContextType {
  active: boolean;
  phase: TourPhase;
  captured: TourCaptured;
  navigateTo: ((tab: string, subPage?: string) => void) | null;

  registerNavigate: (fn: (tab: string, subPage?: string) => void) => void;

  startTour: () => void;
  skipTour: () => void;
  skipPhase: () => void;  // skip only optional steps (e.g. Inbox), falls back to skipTour

  onFriendsNavTapped: () => void;
  onFriendFabTapped: () => void;
  onFriendSaved: (name: string) => void;
  onQEFabTapped: () => void;
  onQESaved: (name: string, amount: string) => void;
  onPaidForOpened: () => void;
  onMultiSelectChosen: () => void;
  onMultiSelectConfirmed: () => void;
  onQuickChipTapped: () => void;
  onInboxNavTapped: () => void;
  nextPhase: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

interface Props {
  children: React.ReactNode;
  onComplete: () => void;
}

export function TourProvider({ children, onComplete }: Props) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<TourPhase>('idle');
  const [captured, setCaptured] = useState<TourCaptured>({ friendName: '', qeName: '', qeAmount: '' });
  const navigateRef = useRef<((tab: string, subPage?: string) => void) | null>(null);

  const registerNavigate = useCallback((fn: (tab: string, subPage?: string) => void) => {
    navigateRef.current = fn;
  }, []);

  const go = (p: TourPhase) => setPhase(p);

  const endTour = useCallback(() => {
    setActive(false);
    go('idle');
    onComplete();
  }, [onComplete]);

  const startTour = useCallback(() => {
    setCaptured({ friendName: '', qeName: '', qeAmount: '' });
    setActive(true);
    // Stay on current page (likely home) so the nav spotlight makes sense
    // The user taps Friends → onFriendsNavTapped navigates and advances
    go('p1-nav-friends');
  }, []);

  const skipTour = useCallback(() => endTour(), [endTour]);

  // ─── Phase transition handlers ─────────────────────────────────────────────

  const onFriendsNavTapped = useCallback(() => {
    if (phase !== 'p1-nav-friends') return;
    navigateRef.current?.('friends');
    setTimeout(() => go('p1-friends-fab'), 300);
  }, [phase]);

  const onFriendFabTapped = useCallback(() => {
    if (phase !== 'p1-friends-fab') return;
    go('p1-friend-dialog');
  }, [phase]);

  const onFriendSaved = useCallback((name: string) => {
    if (phase !== 'p1-friend-dialog') return;
    setCaptured(c => ({ ...c, friendName: name }));
    go('p1-friend-saved');
    setTimeout(() => {
      navigateRef.current?.('home');        // go to Home, not QE subpage
      setTimeout(() => go('p2-quick-fab'), 500);
    }, 1400);
  }, [phase]);

  const onQEFabTapped = useCallback(() => {
    if (phase !== 'p2-quick-fab') return;
    go('p2-quick-dialog'); // set phase BEFORE navigation so QE page sees it on mount
  }, [phase]);

  const onQESaved = useCallback((name: string, amount: string) => {
    if (phase !== 'p2-quick-dialog') return;
    setCaptured(c => ({ ...c, qeName: name, qeAmount: amount }));
    go('p2-quick-saved');
    setTimeout(() => {
      navigateRef.current?.('home');
      setTimeout(() => go('p3-home-paid-by'), 400);
    }, 1200);
  }, [phase]);

  const onPaidForOpened = useCallback(() => {
    if (phase !== 'p4-home-paid-for') return;
    go('p4-paid-for-open');
  }, [phase]);

  const onMultiSelectChosen = useCallback(() => {
    if (phase !== 'p4-paid-for-open') return;
    go('p4-paid-for-checkbox');
  }, [phase]);

  const onMultiSelectConfirmed = useCallback(() => {
    if (phase !== 'p4-paid-for-checkbox') return;
    go('p4-paid-for-confirmed');
    setTimeout(() => go('p5-quick-chip'), 800);
  }, [phase]);

  const onQuickChipTapped = useCallback(() => {
    if (phase !== 'p5-quick-chip') return;
    go('p5-chip-done');
  }, [phase]);

  const onInboxNavTapped = useCallback(() => {
    if (phase !== 'p6-inbox-nav') return;
    navigateRef.current?.('inbox');
    setTimeout(() => go('p7-done'), 300);
  }, [phase]);

  // Generic continue — used for info-only steps
  const nextPhase = useCallback(() => {
    switch (phase) {
      case 'p3-home-paid-by':   go('p4-home-paid-for'); break;
      case 'p4-paid-for-confirmed': go('p5-quick-chip'); break;
      case 'p5-chip-done':      go('p6-inbox-intro'); break;
      case 'p6-inbox-intro':    go('p6-inbox-nav'); break;  // "Show me" → nav step
      case 'p6-inbox-nav':      go('p7-done'); break;
      case 'p7-done':           endTour(); break;
      default: break;
    }
  }, [phase, endTour]);

  // Skip for optional steps (p6 inbox)
  const skipPhase = useCallback(() => {
    switch (phase) {
      case 'p6-inbox-intro': go('p7-done'); break;  // skip straight to done
      default: skipTour(); break;
    }
  }, [phase, skipTour]);

  return (
    <TourContext.Provider value={{
      active, phase, captured, navigateTo: navigateRef.current,
      registerNavigate,
      startTour, skipTour, skipPhase, nextPhase,
      onFriendsNavTapped, onFriendFabTapped, onFriendSaved,
      onQEFabTapped, onQESaved,
      onPaidForOpened, onMultiSelectChosen, onMultiSelectConfirmed,
      onQuickChipTapped, onInboxNavTapped,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextType {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be inside TourProvider');
  return ctx;
}

// ─── Legacy compat — keep TourStepId type so old imports don't break ────────
export type TourStepId = string;
