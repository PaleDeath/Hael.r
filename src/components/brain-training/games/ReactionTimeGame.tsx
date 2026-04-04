import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGameResult } from '../GameResultProvider';
import { useGameFlow } from '../game-engine/useGameFlow';
import { GameContainer } from '../ui/GameContainer';
import { AnimatedButton } from '../ui/AnimatedButton';
import { ScorePopup } from '../ui/ScorePopup';

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduceMotion;
}

const MAX_ROUNDS = 5;
const FEEDBACK_MS = 1400;
const GO_DELAY_MIN_MS = 2000;
const GO_DELAY_EXTRA_MS = 3000;

type TrialSub = 'wait' | 'go';

interface RoundStats {
  reactionTimes: number[];
  falseStarts: number;
}

interface SummaryState {
  averageMs: number | null;
  bestMs: number | null;
  falseStarts: number;
}

const initialStats = (): RoundStats => ({
  reactionTimes: [],
  falseStarts: 0,
});

const ReactionTimeGame: React.FC = () => {
  const navigate = useNavigate();
  const { saveResult } = useGameResult();
  const reduceMotion = usePrefersReducedMotion();
  const flow = useGameFlow();

  const [roundIndex, setRoundIndex] = useState(0);
  const [subPhase, setSubPhase] = useState<TrialSub | null>(null);
  const [announce, setAnnounce] = useState('');
  const [popupValue, setPopupValue] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [wrongPulse, setWrongPulse] = useState(false);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [displayMs, setDisplayMs] = useState(0);

  const statsRef = useRef<RoundStats>(initialStats());
  const goTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const goStartedAtRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (goTimerRef.current != null) {
      window.clearTimeout(goTimerRef.current);
      goTimerRef.current = null;
    }
    if (feedbackTimerRef.current != null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (summary?.averageMs == null) {
      setDisplayMs(0);
      return;
    }
    if (reduceMotion) {
      setDisplayMs(summary.averageMs);
      return;
    }
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: summary.averageMs,
      duration: 0.85,
      ease: 'power2.out',
      onUpdate: () => setDisplayMs(Math.round(obj.v)),
    });
    return () => {
      tween.kill();
    };
  }, [summary?.averageMs, reduceMotion]);

  const introRef = useRef<HTMLElement | null>(null);
  const playRef = useRef<HTMLDivElement | null>(null);
  const summaryWrapRef = useRef<HTMLDivElement | null>(null);
  const summaryCardRef = useRef<HTMLDivElement | null>(null);
  const signalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = signalRef.current;
    if (!el) return;
    if (reduceMotion) {
      gsap.killTweensOf(el);
      gsap.set(el, { scale: subPhase === 'go' ? 1.08 : 1, opacity: 1, x: 0 });
      return;
    }
    gsap.killTweensOf(el);
    if (wrongPulse) {
      gsap.fromTo(el, { x: 0 }, { x: [0, -5, 5, -3, 3, 0], duration: 0.4, ease: 'power2.out' });
      return;
    }
    if (subPhase === 'wait') {
      gsap.fromTo(
        el,
        { scale: 1, opacity: 0.92 },
        { scale: 1.06, opacity: 1, repeat: -1, yoyo: true, duration: 1.8, ease: 'sine.inOut' }
      );
    } else if (subPhase === 'go') {
      gsap.to(el, { scale: 1.08, opacity: 1, duration: 0.35, ease: 'power2.out' });
    } else {
      gsap.set(el, { scale: 1, opacity: 0.92, x: 0 });
    }
  }, [subPhase, wrongPulse, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (!sessionStarted && introRef.current) {
      gsap.fromTo(introRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }
  }, [sessionStarted, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (sessionStarted && flow.phase !== 'finished' && playRef.current) {
      gsap.fromTo(playRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
  }, [sessionStarted, flow.phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (sessionStarted && flow.phase === 'finished' && summaryWrapRef.current) {
      gsap.fromTo(summaryWrapRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    }
    if (!reduceMotion && summaryCardRef.current && sessionStarted && flow.phase === 'finished') {
      gsap.fromTo(summaryCardRef.current, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    }
  }, [sessionStarted, flow.phase, summary, reduceMotion]);

  const finishSession = useCallback(() => {
    clearTimers();
    flow.setPhase('finished');
    setSubPhase(null);
    setAnnounce('Session complete.');
    const s = statsRef.current;
    const attempts = MAX_ROUNDS;
    const falseStarts = s.falseStarts;
    const validTimes = s.reactionTimes;
    const accuracy = attempts > 0 ? Math.max(0, ((attempts - falseStarts) / attempts) * 100) : 0;
    const avg =
      validTimes.length > 0
        ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
        : 0;
    const best = validTimes.length > 0 ? Math.min(...validTimes) : null;

    setSummary({
      averageMs: validTimes.length > 0 ? Math.round(avg) : null,
      bestMs: best != null ? Math.round(best) : null,
      falseStarts,
    });

    const score =
      validTimes.length > 0
        ? Math.max(0, Math.round((10000 / Math.max(avg, 1)) * 100))
        : 0;

    void saveResult({
      gameType: 'reaction-time',
      score: Number.isFinite(score) ? score : 0,
      accuracy: Number.isFinite(accuracy) ? accuracy : 0,
      level: 1,
      duration: 0,
      details: {
        averageReactionTime: validTimes.length > 0 ? Math.round(avg) : undefined,
        bestReactionTime: best != null ? Math.round(best) : undefined,
        falseStarts,
        totalAttempts: attempts,
      },
    });
  }, [clearTimers, flow, saveResult]);

  const scheduleGoSignal = useCallback(
    (runId: number) => {
      if (goTimerRef.current != null) {
        window.clearTimeout(goTimerRef.current);
      }
      const delay = GO_DELAY_MIN_MS + Math.random() * GO_DELAY_EXTRA_MS;
      goTimerRef.current = window.setTimeout(() => {
        if (runId !== runIdRef.current) return;
        goStartedAtRef.current = performance.now();
        setSubPhase('go');
        setAnnounce('Go — tap now.');
        flow.unlockInput();
      }, delay);
    },
    [flow]
  );

  const beginRound = useCallback(
    (index: number) => {
      if (index >= MAX_ROUNDS) {
        finishSession();
        return;
      }
      runIdRef.current += 1;
      const capturedRun = runIdRef.current;
      flow.setPhase('playing');
      flow.lockInput();
      setSubPhase('wait');
      setAnnounce('Wait… screen turns green.');
      setPopupValue(null);
      setShowPopup(false);
      setWrongPulse(false);
      scheduleGoSignal(capturedRun);
    },
    [flow, finishSession, scheduleGoSignal]
  );

  const startSession = useCallback(() => {
    statsRef.current = initialStats();
    setRoundIndex(0);
    setSummary(null);
    setSessionStarted(true);
    flow.setPhase('playing');
    clearTimers();
    beginRound(0);
  }, [flow, clearTimers, beginRound]);

  const advanceAfterFeedback = useCallback(() => {
    feedbackTimerRef.current = window.setTimeout(() => {
      setShowPopup(false);
      setPopupValue(null);
      setWrongPulse(false);
      setRoundIndex((r) => {
        const next = r + 1;
        if (next >= MAX_ROUNDS) {
          queueMicrotask(() => finishSession());
        } else {
          queueMicrotask(() => beginRound(next));
        }

        return next;
      });
    }, FEEDBACK_MS);
  }, [finishSession, beginRound]);

  const handleArenaTap = useCallback(() => {
    if (flow.phase === 'finished') return;
    if (subPhase === 'wait') {
      runIdRef.current += 1;
      clearTimers();
      statsRef.current = {
        ...statsRef.current,
        falseStarts: statsRef.current.falseStarts + 1,
      };
      flow.setPhase('answered');
      setWrongPulse(true);
      setAnnounce('Too soon. Wait for green.');
      setSubPhase(null);
      goStartedAtRef.current = null;
      advanceAfterFeedback();
      return;
    }
    if (subPhase === 'go' && goStartedAtRef.current != null) {
      clearTimers();
      const ms = Math.round(performance.now() - goStartedAtRef.current);
      goStartedAtRef.current = null;
      statsRef.current = {
        ...statsRef.current,
        reactionTimes: [...statsRef.current.reactionTimes, ms],
      };
      flow.setPhase('answered');
      setSubPhase(null);
      setPopupValue(`${ms} ms`);
      setShowPopup(true);
      setAnnounce(`Result: ${ms} milliseconds.`);
      advanceAfterFeedback();
    }
  }, [subPhase, clearTimers, flow, advanceAfterFeedback]);

  const resetAll = useCallback(() => {
    clearTimers();
    statsRef.current = initialStats();
    setRoundIndex(0);
    setSubPhase(null);
    setSessionStarted(false);
    setPopupValue(null);
    setShowPopup(false);
    setSummary(null);
    setAnnounce('');
    setWrongPulse(false);
    flow.resetFlow();
  }, [clearTimers, flow]);

  const trialLabel = roundIndex < MAX_ROUNDS ? `Round ${roundIndex + 1} of ${MAX_ROUNDS}` : '';

  const bgStyle: React.CSSProperties =
    subPhase === 'go'
      ? { background: 'var(--bt-go-bg)' }
      : subPhase === 'wait'
        ? { background: 'var(--bt-wait-bg)' }
        : { background: 'var(--bt-game-bg)' };

  return (
    <GameContainer
      immersive={sessionStarted}
      theme="dark"
      onBack={() => navigate('/brain-training')}
      title={sessionStarted ? undefined : 'Reaction Time'}
      topAccessory={
        sessionStarted && flow.phase !== 'finished' && trialLabel ? (
          <span className="bt-glass-hud tabular-nums">{trialLabel}</span>
        ) : null
      }
      onErrorReset={resetAll}
    >
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      <>
        {!sessionStarted && (
          <section
            ref={introRef}
            className="flex flex-1 flex-col items-center justify-center gap-8 px-2 text-center"
          >
            <div className="max-w-md space-y-4">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--bt-text)' }}>
                When it turns green, tap fast.
              </h2>
              <p className="text-base" style={{ color: 'var(--bt-text-muted)' }}>
                Red means wait. Five rounds.
              </p>
            </div>
            <AnimatedButton
              onClick={startSession}
              className="min-h-12 min-w-[200px] text-lg"
              aria-label="Start reaction training"
            >
              Start
            </AnimatedButton>
          </section>
        )}

        {sessionStarted && flow.phase !== 'finished' && (
          <div ref={playRef} className="relative h-full min-h-0 flex-1">
            <button
              type="button"
              onClick={handleArenaTap}
              className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center border-0 p-6 outline-none transition-[background] duration-[400ms] ease-out focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              style={{
                ...bgStyle,
                boxShadow: wrongPulse ? `inset 0 0 0 3px var(--bt-error-soft)` : undefined,
              }}
              aria-label={
                subPhase === 'wait'
                  ? 'Waiting — do not tap until green'
                  : subPhase === 'go'
                    ? 'Tap now — reaction zone'
                    : 'Reaction training area'
              }
            >
              <div
                ref={signalRef}
                className="flex h-[160px] w-[160px] shrink-0 items-center justify-center rounded-full md:h-[220px] md:w-[220px]"
                style={{
                  background:
                    subPhase === 'go'
                      ? 'linear-gradient(145deg, var(--bt-success), #059669)'
                      : 'linear-gradient(145deg, #dc2626, #7f1d1d)',
                  boxShadow:
                    subPhase === 'go'
                      ? `0 0 48px var(--bt-success-glow)`
                      : '0 12px 40px rgba(0,0,0,0.35)',
                }}
              >
                <span className="text-5xl text-white md:text-6xl" aria-hidden>
                  {subPhase === 'go' ? '✓' : '◆'}
                </span>
              </div>

              <p className="mt-10 text-[20px] font-semibold text-white" aria-hidden>
                {subPhase === 'wait' && 'Wait…'}
                {subPhase === 'go' && 'Tap!'}
                {!subPhase && flow.phase === 'answered' && '…'}
              </p>

              <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-16">
                <ScorePopup value={popupValue} show={showPopup} />
              </div>
            </button>
          </div>
        )}

        {sessionStarted && flow.phase === 'finished' && summary && (
          <div
            ref={summaryWrapRef}
            className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
          >
            <div ref={summaryCardRef} className="bt-glass-dark w-full max-w-md p-8 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/50">Done</p>
              <h2 className="mt-3 text-4xl font-semibold tabular-nums text-white md:text-5xl">
                {summary.averageMs != null ? `${displayMs} ms` : '—'}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Average reaction
                {summary.bestMs != null ? ` · Best ${summary.bestMs} ms` : ''}
              </p>
              <p className="mt-2 text-sm text-white/60">False starts: {summary.falseStarts}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <AnimatedButton onClick={resetAll} variant="primary" aria-label="Play reaction game again">
                  Again
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => navigate('/brain-training')}
                  variant="ghost"
                  aria-label="Back to training hub"
                >
                  Hub
                </AnimatedButton>
              </div>
            </div>
          </div>
        )}
      </>

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </GameContainer>
  );
};

export default ReactionTimeGame;
