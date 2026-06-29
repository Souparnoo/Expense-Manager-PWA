import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, Paper, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTour, PROGRESS_STEP_COUNT } from '../../hooks/useTour';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

function getTargetRect(dataTarget: string): SpotlightRect | null {
  if (!dataTarget) return null;
  const el = document.querySelector(`[data-tour="${dataTarget}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top:    r.top    - PADDING,
    left:   r.left   - PADDING,
    width:  r.width  + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function scrollIntoViewIfNeeded(dataTarget: string) {
  const el = document.querySelector(`[data-tour="${dataTarget}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export default function TourOverlay() {
  const { active, currentStep, stepIndex, nextStep, skipTour } = useTour();
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [visible, setVisible] = useState(false);

  const recalculate = useCallback(() => {
    if (!currentStep?.target) {
      setRect(null);
      return;
    }
    const r = getTargetRect(currentStep.target);
    setRect(r);

    if (r) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tooltipWidth = Math.min(300, vw - 32);
      const tooltipHeight = 180;
      let top: number;
      let left = Math.max(16, Math.min(
        r.left + r.width / 2 - tooltipWidth / 2,
        vw - tooltipWidth - 16
      ));

      if (currentStep.tooltipPosition === 'top') {
        top = r.top - tooltipHeight - 16;
        if (top < 16) top = r.top + r.height + 16;
      } else {
        // bottom (default)
        top = r.top + r.height + 16;
        if (top + tooltipHeight > vh - 80) top = r.top - tooltipHeight - 16;
      }

      setTooltipStyle({
        position: 'fixed',
        zIndex: 10001,
        top,
        left,
        width: tooltipWidth,
      });
    }
  }, [currentStep]);

  useEffect(() => {
    if (!active) { setVisible(false); return; }

    setVisible(false);

    // 'done' step — no target, center on screen
    if (!currentStep?.target) {
      const vw = window.innerWidth;
      const tooltipWidth = Math.min(320, vw - 32);
      setRect(null);
      setTooltipStyle({
        position: 'fixed',
        zIndex: 10001,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: tooltipWidth,
      });
      setVisible(true);
      return;
    }

    if (currentStep.target) scrollIntoViewIfNeeded(currentStep.target);
    const t = setTimeout(() => {
      recalculate();
      setVisible(true);
    }, 350);
    return () => clearTimeout(t);
  }, [active, currentStep, stepIndex]);

  useEffect(() => {
    if (!active) return;
    const handler = () => recalculate();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [active, recalculate]);

  if (!active || !currentStep) return null;

  const isDoneStep = currentStep.id === 'done';
  // For auto-advance steps the user MUST interact with the real UI element.
  // Setting pointerEvents: 'none' on all scrims lets MUI portals (dropdown
  // menus, dialogs) receive clicks even though they render outside the DOM
  // tree of the spotlight. The tour advances via state-change watchers anyway.
  const blockOutside = !currentStep.autoAdvance && !isDoneStep;

  return (
    <>
      {/*
        Bug fix: the previous gradient-stacking approach created a fully
        black overlay with no transparent hole. The correct technique is to
        put a massive box-shadow on the spotlight element itself — the shadow
        extends outward to cover the rest of the screen while the element
        itself (the spotlight) stays fully visible and interactive.
      */}

      {/* Dark scrim — four separate rectangles that surround the spotlight,
          each individually positioned so the gap between them IS the spotlight.
          This is the correct, reliable cross-browser approach. */}
      {visible && rect && !isDoneStep && (
        <>
          {/* Top */}
          <Box sx={{
            position: 'fixed', zIndex: 9999,
            pointerEvents: blockOutside ? 'auto' : 'none',
            top: 0, left: 0, right: 0,
            height: rect.top,
            background: 'rgba(0,0,0,0.72)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }} onClick={blockOutside ? e => e.stopPropagation() : undefined} />
          {/* Bottom */}
          <Box sx={{
            position: 'fixed', zIndex: 9999,
            pointerEvents: blockOutside ? 'auto' : 'none',
            top: rect.top + rect.height, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.72)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }} onClick={blockOutside ? e => e.stopPropagation() : undefined} />
          {/* Left */}
          <Box sx={{
            position: 'fixed', zIndex: 9999,
            pointerEvents: blockOutside ? 'auto' : 'none',
            top: rect.top, left: 0,
            width: rect.left,
            height: rect.height,
            background: 'rgba(0,0,0,0.72)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }} onClick={blockOutside ? e => e.stopPropagation() : undefined} />
          {/* Right */}
          <Box sx={{
            position: 'fixed', zIndex: 9999,
            pointerEvents: blockOutside ? 'auto' : 'none',
            top: rect.top, left: rect.left + rect.width, right: 0,
            height: rect.height,
            background: 'rgba(0,0,0,0.72)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }} onClick={blockOutside ? e => e.stopPropagation() : undefined} />
          {/* Spotlight border glow — sits on top of the four scrims */}
          <Box sx={{
            position: 'fixed', zIndex: 10000, pointerEvents: 'none',
            borderRadius: 2.5,
            border: '2px solid',
            borderColor: 'warning.main',
            boxShadow: '0 0 0 4px rgba(245,124,0,0.2), 0 0 20px rgba(245,124,0,0.25)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
            style={{
              top:    rect.top,
              left:   rect.left,
              width:  rect.width,
              height: rect.height,
            }}
          />
        </>
      )}

      {/* Semi-transparent backdrop for done step (no spotlight) */}
      {visible && isDoneStep && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.55)',
          pointerEvents: 'auto',
        }} />
      )}

      {/* Tooltip card */}
      {visible && (
        <Paper
          className="tour-tooltip"
          elevation={8}
          sx={{
            ...tooltipStyle,
            borderRadius: 3,
            p: 2.5,
            border: '1px solid',
            borderColor: 'warning.main',
            backgroundImage: 'none',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.25s, top 0.35s cubic-bezier(0.4,0,0.2,1), left 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, pr: 1 }}>
              {currentStep.title}
            </Typography>
            <IconButton size="small" onClick={skipTour} sx={{ mt: -0.5, mr: -0.5, opacity: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Description */}
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 2 }}>
            {currentStep.description}
          </Typography>

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Progress dots */}
            {!isDoneStep ? (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {Array.from({ length: PROGRESS_STEP_COUNT }).map((_, i) => (
                  <Box key={i} sx={{
                    width: i === stepIndex ? 16 : 6,
                    height: 6, borderRadius: 3,
                    backgroundColor: i <= stepIndex ? 'warning.main' : 'action.disabled',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </Box>
            ) : <Box />}

            {/* Action */}
            {currentStep.autoAdvance ? (
              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                Interact above to continue →
              </Typography>
            ) : (
              <Button
                variant="contained"
                size="small"
                onClick={nextStep}
                endIcon={!isDoneStep ? <ArrowForwardIcon /> : undefined}
                color={isDoneStep ? 'success' : 'warning'}
                sx={{ fontWeight: 700, px: 2 }}
              >
                {isDoneStep ? 'Start using app' : 'Next'}
              </Button>
            )}
          </Box>

          {/* Skip */}
          {!isDoneStep && (
            <Box sx={{ mt: 1.5, textAlign: 'center' }}>
              <Typography
                variant="caption" color="text.disabled"
                onClick={skipTour}
                sx={{ cursor: 'pointer', '&:hover': { color: 'text.secondary' } }}
              >
                Skip tour
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
}