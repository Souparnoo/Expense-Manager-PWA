import React, { createContext, useContext, useState, useCallback } from 'react';

export type TourStepId =
  | 'paid-by'
  | 'paid-for'
  | 'category'
  | 'quick-add'
  | 'manual-entry'
  | 'nav-history'
  | 'nav-analytics'
  | 'nav-friends'
  | 'nav-settle'
  | 'nav-inbox'
  | 'nav-settings'
  | 'done';

export interface TourStep {
  id: TourStepId;
  target: string;
  title: string;
  description: string;
  autoAdvance: boolean;
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'paid-by',
    target: 'paid-by',
    title: '👤 Who paid?',
    description: 'Select who paid for this expense — yourself or a friend. Tap the dropdown now to try it.',
    autoAdvance: true,
    tooltipPosition: 'bottom',
  },
  {
    id: 'paid-for',
    target: 'paid-for',
    title: '🎯 Paid for whom?',
    description: 'Select who the expense was for. Tap "Me + Multiple Friends" to cover several people at once — great for group dinners where everyone had the same thing.',
    autoAdvance: true,
    tooltipPosition: 'bottom',
  },
  {
    id: 'category',
    target: 'category-selector',
    title: '🏷️ Pick a category',
    description: 'Tag every expense with a category — Food, Transport, Shopping and more. Tap one now. This unlocks category charts in Analytics.',
    autoAdvance: true,
    tooltipPosition: 'bottom',
  },
  {
    id: 'quick-add',
    target: 'quick-add',
    title: '⚡ Quick Add',
    description: 'One tap to record a frequent expense — Tea, Bus, Lunch. No typing needed. You can create your own shortcuts by tapping the + icon.',
    autoAdvance: false,
    tooltipPosition: 'bottom',
  },
  {
    id: 'manual-entry',
    target: 'manual-entry',
    title: '✏️ Manual entry',
    description: 'For anything not in Quick Add — type a name, enter the amount, and tap +. The date, time, category and people you selected above are attached automatically.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
  {
    id: 'nav-history',
    target: 'nav-history',
    title: '📅 History',
    description: 'Every expense you ever log lives here, grouped by date. Search by name, filter by date range or category, and sort however you like. Nothing is ever deleted automatically.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
  {
    id: 'nav-analytics',
    target: 'nav-analytics',
    title: '📊 Analytics',
    description: 'Charts showing where your money goes — monthly trends, daily spending, category breakdown pie chart, top 5 categories, and a visual summary of friend balances.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
  {
    id: 'nav-friends',
    target: 'nav-friends',
    title: '👥 Friends',
    description: 'Add friends to track shared expenses. Link their Gmail and they\'ll receive live notifications when you pay for them — they can Accept or Reject right from their own app.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
  {
    id: 'nav-settle',
    target: 'nav-settle',
    title: '🤝 Settlements',
    description: 'See exactly who owes whom and how much, calculated automatically from all your shared expenses. Record a cash or UPI settlement and the balance updates instantly.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
  {
    id: 'nav-inbox',
    target: 'nav-inbox',
    title: '🔔 Inbox',
    description: 'Sign in with Google to receive payment confirmations from friends. The Received tab shows requests for you to Accept/Reject. The Sent tab shows replies to payments you sent.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
  {
    id: 'nav-settings',
    target: 'nav-settings',
    title: '⚙️ Settings',
    description: 'Toggle dark mode, set a monthly budget, connect Google Drive for encrypted cloud backup, and export your full history to Excel. You can also replay this tour from here anytime.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
  {
    id: 'done',
    target: '',
    title: '🎉 All done!',
    description: 'You know everything. Start recording expenses and let the app do the maths. Tap "Start using app" to dismiss this tour — it won\'t show again unless you replay it from Settings.',
    autoAdvance: false,
    tooltipPosition: 'top',
  },
];

// Steps shown in progress dots (exclude done step)
export const PROGRESS_STEP_COUNT = TOUR_STEPS.length - 1;

interface TourContextType {
  active: boolean;
  stepIndex: number;
  currentStep: TourStep | null;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
  advance: (fromStepId: TourStepId) => void;
}

const TourContext = createContext<TourContextType | null>(null);

interface Props {
  children: React.ReactNode;
  onComplete: () => void;
}

export function TourProvider({ children, onComplete }: Props) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = active && stepIndex < TOUR_STEPS.length
    ? TOUR_STEPS[stepIndex]
    : null;

  const startTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    // Scroll home page back to top so first steps are visible
    setTimeout(() => {
      document.querySelector('[data-tour="paid-by"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex(prev => {
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) {
        setActive(false);
        onComplete();
        return prev;
      }
      return next;
    });
  }, [onComplete]);

  const skipTour = useCallback(() => {
    setActive(false);
    onComplete();
  }, [onComplete]);

  const advance = useCallback((fromStepId: TourStepId) => {
    if (!active) return;
    const step = TOUR_STEPS[stepIndex];
    if (step?.id === fromStepId && step.autoAdvance) {
      setTimeout(() => {
        setStepIndex(prev => {
          const next = prev + 1;
          if (next >= TOUR_STEPS.length) {
            setActive(false);
            onComplete();
            return prev;
          }
          return next;
        });
      }, 600);
    }
  }, [active, stepIndex, onComplete]);

  return (
    <TourContext.Provider value={{
      active, stepIndex, currentStep,
      startTour, nextStep, skipTour, advance,
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
