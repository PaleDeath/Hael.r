import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
  Suspense,
  lazy,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { MoodEntry, MoodState, MoodActivity, MoodTag } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../contexts/AuthContext';
import firebaseMoodService from '../../../services/firebase.mood.service';
import { analyzeNotes } from '../../../services/analysis.service';
import CustomSlider from './CustomSlider';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const MoodTrendChart = lazy(() => import('./MoodTrendChart'));

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True if any entry is logged for the user's local calendar day (avoids locale string mismatches). */
function hasEntryForCalendarToday(entries: MoodEntry[], from: Date = new Date()): boolean {
  return entries.some((e) => {
    const t = new Date(e.date).getTime();
    if (Number.isNaN(t)) return false;
    const d = new Date(t);
    return (
      d.getFullYear() === from.getFullYear() &&
      d.getMonth() === from.getMonth() &&
      d.getDate() === from.getDate()
    );
  });
}

function computeMoodStreakFromEntries(entries: MoodEntry[], from: Date = new Date()): number {
  const daySet = new Set(
    entries.map((e) => {
      const t = new Date(e.date).getTime();
      if (Number.isNaN(t)) return ymd(from);
      return ymd(new Date(t));
    })
  );
  let streak = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (;;) {
    if (daySet.has(ymd(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function moodAccentColor(m: number): string {
  if (m <= 3) return '#C4654A';
  if (m <= 6) return '#B5AFA3';
  return '#2D4A3E';
}

function ChartSkeleton() {
  return (
    <div className="flex h-64 min-w-0 flex-col justify-center gap-4 px-2" aria-hidden>
      <div className="h-px w-full animate-pulse bg-[#E8E2D6]" />
      <div className="h-px w-full animate-pulse bg-[#E8E2D6]" style={{ animationDelay: '150ms' }} />
    </div>
  );
}

const MoodTracker: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const [, setMoodStats] = useState<any>(null);
  const [moodState, setMoodState] = useState<MoodState>({
    entries: [],
    streak: 0,
    lastEntryDate: null,
  });

  const [newEntry, setNewEntry] = useState<Omit<MoodEntry, 'id' | 'date'>>({
    mood: 5,
    energy: 5,
    sleep: 7,
    activities: [],
    notes: '',
    tags: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [, setSubmitting] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const streakWrapRef = useRef<HTMLDivElement>(null);
  const streakNumRef = useRef<HTMLSpanElement>(null);
  const streakRingRef = useRef<SVGSVGElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const heroHairlineRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const pastSectionRef = useRef<HTMLDivElement>(null);
  const formScrollRef = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const stepIndicatorNumRef = useRef<HTMLSpanElement>(null);
  const formCollapseRef = useRef<HTMLDivElement>(null);
  const successBlockRef = useRef<HTMLDivElement>(null);
  const successLinesRef = useRef<(HTMLDivElement | null)[]>([]);
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const saveLabelRef = useRef<HTMLSpanElement>(null);
  const saveCheckRef = useRef<HTMLSpanElement>(null);
  const saveFillRef = useRef<HTMLSpanElement>(null);
  const saveRippleRef = useRef<HTMLSpanElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const sleepNumRef = useRef<HTMLDivElement>(null);
  const tagsActRef = useRef<HTMLDivElement>(null);
  const tagsFeelRef = useRef<HTMLDivElement>(null);
  const timelineLineRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const emptyArrowRef = useRef<HTMLDivElement>(null);
  const streakGlowRef = useRef<HTMLDivElement>(null);

  const prevStepIndicatorRef = useRef(1);
  const newEntryIdRef = useRef<string | null>(null);
  const streakBeforeSubmitRef = useRef(0);
  const entryJustAddedRef = useRef(false);
  const notesLength = newEntry.notes.length;

  const activities: MoodActivity[] = [
    'exercise',
    'meditation',
    'reading',
    'socializing',
    'work',
    'hobbies',
    'nature',
    'rest',
  ];

  const tags: MoodTag[] = [
    'stressed',
    'motivated',
    'anxious',
    'calm',
    'sad',
    'happy',
    'tired',
    'energetic',
    'distracted',
    'focused',
  ];

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqMob = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      setPrefersReducedMotion(mq.matches);
      setIsMobile(mqMob.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    mqMob.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      mqMob.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    const loadFromLocalStorage = () => {
      try {
        const savedData = localStorage.getItem('moodData');
        if (!savedData) return;
        const parsedData = JSON.parse(savedData) as MoodState;
        const entries = parsedData.entries ?? [];
        const streak = computeMoodStreakFromEntries(entries);
        if (cancelled) return;
        setMoodState({
          ...parsedData,
          entries,
          streak,
        });

        const today = new Date().toLocaleDateString();
        const lastEntryDate = parsedData.lastEntryDate;
        if (lastEntryDate === today || hasEntryForCalendarToday(entries)) {
          setFormSubmitted(true);
        }
      } catch (error) {
        console.error('Error loading mood data from localStorage:', error);
      }
    };

    const loadMoodData = async () => {
      if (isAuthenticated && currentUser) {
        try {
          let mappedEntries: MoodEntry[] | null = null;

          let todaysEntryResult = await firebaseMoodService.getTodaysMoodEntry();
          if (!todaysEntryResult.success) {
            await new Promise((r) => setTimeout(r, 50));
            todaysEntryResult = await firebaseMoodService.getTodaysMoodEntry();
          }
          if (cancelled) return;
          if (todaysEntryResult.success && todaysEntryResult.hasEntry) {
            setFormSubmitted(true);
          }

          let entriesResult = await firebaseMoodService.getUserMoodEntries(30);
          if (!entriesResult.success) {
            await new Promise((r) => setTimeout(r, 80));
            entriesResult = await firebaseMoodService.getUserMoodEntries(30);
          }

          if (cancelled) return;

          if (entriesResult.success) {
            mappedEntries = entriesResult.moodEntries!.map((entry) => ({
              id: entry.id || uuidv4(),
              date: entry.date.toLocaleDateString(),
              mood: entry.mood,
              energy: entry.energy,
              sleep: entry.sleep,
              activities: entry.activities as MoodActivity[],
              notes: entry.notes,
              tags: entry.tags as MoodTag[],
            }));

            const lastEntry = mappedEntries[mappedEntries.length - 1];
            setMoodState({
              entries: mappedEntries,
              streak: 0,
              lastEntryDate: lastEntry ? lastEntry.date : null,
            });

            if (hasEntryForCalendarToday(mappedEntries)) {
              setFormSubmitted(true);
            }
          } else {
            console.warn('MoodTracker: Firebase entries unavailable after retry, using local cache if any');
            loadFromLocalStorage();
          }

          let statsResult = await firebaseMoodService.getMoodStats();
          if (!statsResult.success) {
            await new Promise((r) => setTimeout(r, 80));
            statsResult = await firebaseMoodService.getMoodStats();
          }
          if (cancelled) return;
          if (statsResult.success) {
            setMoodStats(statsResult.stats);
            setMoodState((prev) => ({
              ...prev,
              streak: statsResult.stats!.currentStreak,
            }));
          } else if (mappedEntries && mappedEntries.length > 0) {
            const localStreak = computeMoodStreakFromEntries(mappedEntries);
            setMoodState((prev) => ({ ...prev, streak: localStreak }));
          }
        } catch (error) {
          console.error('Error loading mood data from Firebase, falling back to localStorage:', error);
          if (!cancelled) loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
    };

    loadMoodData();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, currentUser?.uid, location.pathname]);

  useEffect(() => {
    if (!showForm) return;
    setFormStep(1);
    setFurthestStep(1);
  }, [showForm]);

  const moodTrendData = useMemo(() => {
    const slice = moodState.entries.slice(0, 14).reverse();
    return slice.map((e) => ({
      label: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      mood: e.mood,
      energy: e.energy,
    }));
  }, [moodState.entries]);

  const scrollFormIntoView = useCallback(() => {
    const el = formScrollRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - (isMobile ? 72 : 100);
    if (prefersReducedMotion) {
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      return;
    }
    gsap.to(window, {
      duration: 0.4,
      ease: 'power2.inOut',
      scrollTo: { y, autoKill: true },
    });
  }, [isMobile, prefersReducedMotion]);

  const goToStep = useCallback(
    (next: number) => {
      const run = () => {
        setFormStep(next);
        requestAnimationFrame(() => {
          if (prefersReducedMotion || !stepContentRef.current) {
            scrollFormIntoView();
            return;
          }
          gsap.fromTo(
            stepContentRef.current,
            { opacity: 0, x: 30 },
            {
              opacity: 1,
              x: 0,
              duration: 0.4,
              ease: 'power2.out',
              delay: 0.1,
              onComplete: scrollFormIntoView,
            }
          );
        });
      };

      if (prefersReducedMotion || !stepContentRef.current || formStep === next) {
        setFormStep(next);
        scrollFormIntoView();
        return;
      }
      gsap.to(stepContentRef.current, {
        opacity: 0,
        x: -30,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: run,
      });
    },
    [formStep, prefersReducedMotion, scrollFormIntoView]
  );

  const continueFromStep = (current: number) => {
    const next = current + 1;
    setFurthestStep((f) => Math.max(f, next));
    goToStep(next);
  };

  useEffect(() => {
    if (prefersReducedMotion || !stepIndicatorNumRef.current) return;
    if (formStep === prevStepIndicatorRef.current) return;
    const el = stepIndicatorNumRef.current;
    const wrap = el.parentElement;
    if (!wrap) {
      prevStepIndicatorRef.current = formStep;
      return;
    }
    gsap.fromTo(
      el,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
    );
    prevStepIndicatorRef.current = formStep;
  }, [formStep, prefersReducedMotion]);

  useLayoutEffect(() => {
    if (prefersReducedMotion) return;
    const root = formStep === 3 ? tagsActRef.current : formStep === 4 ? tagsFeelRef.current : null;
    if (!root) return;
    const nodes = root.querySelectorAll('[data-mood-tag]');
    if (!nodes.length) return;
    gsap.set(nodes, { opacity: 0, y: 8 });
    gsap.to(nodes, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      stagger: 0.03,
      ease: 'power2.out',
      delay: 0.15,
    });
  }, [formStep, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return;
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      if (titleRef.current) gsap.set(titleRef.current, { clipPath: 'inset(0 100% 0 0)' });
      if (streakWrapRef.current) gsap.set(streakWrapRef.current, { opacity: 0, scale: 0.8 });
      if (backRef.current) gsap.set(backRef.current, { opacity: 0, x: -20 });
      if (heroHairlineRef.current)
        gsap.set(heroHairlineRef.current, { scaleX: 0, transformOrigin: 'left center' });
      if (formSectionRef.current) gsap.set(formSectionRef.current, { opacity: 0, y: 30 });
      if (pastSectionRef.current) gsap.set(pastSectionRef.current, { opacity: 0, y: 40 });

      const tl = gsap.timeline();
      if (titleRef.current) {
        tl.to(titleRef.current, {
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.8,
          ease: 'power3.inOut',
        });
      }
      if (streakWrapRef.current) {
        tl.to(
          streakWrapRef.current,
          { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' },
          0.3
        );
      }
      if (backRef.current) {
        tl.to(backRef.current, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, 0.4);
      }
      if (heroHairlineRef.current) {
        tl.to(heroHairlineRef.current, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, 0.5);
      }
      if (formSectionRef.current) {
        tl.to(formSectionRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.6);
      }
      if (pastSectionRef.current) {
        tl.to(pastSectionRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.8);
      }

      const markWillChange = () => {
        [titleRef, streakWrapRef, backRef, heroHairlineRef, formSectionRef, pastSectionRef].forEach((r) => {
          if (r.current) gsap.set(r.current, { willChange: 'transform, opacity' });
        });
      };
      const clearWillChange = () => {
        [titleRef, streakWrapRef, backRef, heroHairlineRef, formSectionRef, pastSectionRef].forEach((r) => {
          if (r.current) gsap.set(r.current, { clearProps: 'willChange' });
        });
      };
      markWillChange();
      tl.eventCallback('onComplete', clearWillChange);
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || !emptyArrowRef.current || moodState.entries.length > 0) return;
    const a = emptyArrowRef.current;
    gsap.to(a, { y: 8, duration: 0.75, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    return () => {
      gsap.killTweensOf(a);
    };
  }, [moodState.entries.length, prefersReducedMotion]);

  useLayoutEffect(() => {
    const ta = notesRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, isMobile ? 100 : 80)}px`;
  }, [newEntry.notes, isMobile, formStep]);

  useEffect(() => {
    if (!notesRef.current || typeof window === 'undefined' || !window.visualViewport) return;
    const ta = notesRef.current;
    const onFocus = () => {
      setTimeout(() => {
        ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 280);
    };
    ta.addEventListener('focus', onFocus);
    return () => ta.removeEventListener('focus', onFocus);
  }, []);

  useLayoutEffect(() => {
    const root = pastSectionRef.current;
    if (prefersReducedMotion || !root || moodState.entries.length === 0 || isMobile) {
      return;
    }

    const ctx = gsap.context(() => {
      const line = timelineLineRef.current;
      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: root,
              start: 'top 85%',
              end: 'bottom 20%',
              scrub: true,
            },
          }
        );
      }

      const cards = root.querySelectorAll('[data-mood-entry]');
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
            delay: i * 0.1,
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );
        const dot = card.querySelector('[data-mood-dot]');
        if (dot) {
          gsap.fromTo(
            dot,
            { scale: 0 },
            {
              scale: 1,
              duration: 0.35,
              ease: 'back.out(1.6)',
              delay: 0.05 + i * 0.1,
              scrollTrigger: {
                trigger: card,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          );
        }
      });
    }, root);

    return () => ctx.revert();
  }, [moodState.entries, prefersReducedMotion, isMobile]);

  useEffect(() => {
    if (
      prefersReducedMotion ||
      moodState.entries.length === 0 ||
      !pastSectionRef.current ||
      !scrollHintRef.current
    ) {
      return;
    }

    const hint = scrollHintRef.current;
    gsap.set(hint, { opacity: 0.45 });
    gsap.to(hint, { opacity: 0.15, duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    const st = ScrollTrigger.create({
      trigger: pastSectionRef.current!,
      start: 'top 75%',
      onEnter: () => gsap.to(hint, { autoAlpha: 0, duration: 0.35 }),
    });

    return () => {
      st.kill();
      gsap.killTweensOf(hint);
    };
  }, [moodState.entries.length, prefersReducedMotion]);

  const tagBounce = (el: HTMLElement | null) => {
    if (!el || prefersReducedMotion) return;
    gsap.fromTo(
      el,
      { scale: 1 },
      { scale: 1.08, duration: 0.125, yoyo: true, repeat: 1, ease: 'back.out(1.7)' }
    );
  };

  const handleActivityToggle = (activity: MoodActivity, ev: React.MouseEvent<HTMLButtonElement>) => {
    tagBounce(ev.currentTarget);
    setNewEntry((prev) => {
      const acts = [...prev.activities];
      if (acts.includes(activity)) {
        return { ...prev, activities: acts.filter((a) => a !== activity) };
      }
      return { ...prev, activities: [...acts, activity] };
    });
  };

  const handleTagToggle = (tag: MoodTag, ev: React.MouseEvent<HTMLButtonElement>) => {
    tagBounce(ev.currentTarget);
    setNewEntry((prev) => {
      const t = [...prev.tags];
      if (t.includes(tag)) {
        return { ...prev, tags: t.filter((x) => x !== tag) };
      }
      return { ...prev, tags: [...t, tag] };
    });
  };

  const nudgeSleep = (delta: number) => {
    setNewEntry((prev) => {
      const next = Math.round((prev.sleep + delta) * 2) / 2;
      return { ...prev, sleep: Math.min(24, Math.max(0, next)) };
    });
    if (!prefersReducedMotion && sleepNumRef.current) {
      gsap.fromTo(
        sleepNumRef.current,
        { y: 10, opacity: 0.4 },
        { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
      );
    }
  };

  const persistEntry = useCallback(async (): Promise<boolean> => {
    const today = new Date();
    const todayStr = today.toLocaleDateString();
    streakBeforeSubmitRef.current = moodState.streak;

    if (isAuthenticated && currentUser) {
      try {
        const result = await firebaseMoodService.createMoodEntry({
          mood: newEntry.mood,
          energy: newEntry.energy,
          sleep: newEntry.sleep,
          activities: newEntry.activities as MoodActivity[],
          notes: newEntry.notes,
          tags: newEntry.tags as MoodTag[],
        });

        if (result.success) {
          if (result.moodEntry?.id) newEntryIdRef.current = result.moodEntry.id;
          const entriesResult = await firebaseMoodService.getUserMoodEntries(30);
          if (entriesResult.success) {
            const entries: MoodEntry[] = entriesResult.moodEntries!.map((entry) => ({
              id: entry.id || uuidv4(),
              date: entry.date.toLocaleDateString(),
              mood: entry.mood,
              energy: entry.energy,
              sleep: entry.sleep,
              activities: entry.activities as MoodActivity[],
              notes: entry.notes,
              tags: entry.tags as MoodTag[],
            }));
            const streak = computeMoodStreakFromEntries(entries);
            setMoodState((prev) => ({
              ...prev,
              entries,
              lastEntryDate: todayStr,
              streak,
            }));
          }
          const statsResult = await firebaseMoodService.getMoodStats();
          if (statsResult.success) {
            setMoodStats(statsResult.stats!);
            setMoodState((prev) => ({
              ...prev,
              streak: statsResult.stats!.currentStreak,
            }));
          }
          entryJustAddedRef.current = true;
          return true;
        }
        throw new Error(result.message);
      } catch (error) {
        console.error('Error saving to Firebase, using localStorage fallback:', error);
      }
    }

    const newMoodEntry: MoodEntry = {
      id: uuidv4(),
      date: todayStr,
      ...newEntry,
    };
    newEntryIdRef.current = newMoodEntry.id;

    const nextEntries = [newMoodEntry, ...moodState.entries];
    const streak = computeMoodStreakFromEntries(nextEntries);
    const updatedState: MoodState = {
      entries: nextEntries,
      streak,
      lastEntryDate: todayStr,
    };
    setMoodState(updatedState);
    localStorage.setItem('moodData', JSON.stringify(updatedState));
    entryJustAddedRef.current = true;
    return true;
  }, [currentUser, isAuthenticated, moodState.entries, newEntry]);

  const playSaveButtonAnimation = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (prefersReducedMotion) {
        resolve();
        return;
      }
      const label = saveLabelRef.current;
      const check = saveCheckRef.current;
      const fill = saveFillRef.current;
      const ripple = saveRippleRef.current;
      const btn = saveBtnRef.current;

      const tl = gsap.timeline({
        onComplete: () => resolve(),
      });
      if (label) tl.to(label, { opacity: 0, duration: 0.12 });
      if (check) tl.to(check, { opacity: 1, duration: 0.18 }, '<0.05');
      if (ripple) tl.to(ripple, { scale: 3, opacity: 0, duration: 0.55, ease: 'power2.out' }, '<');
      if (fill) tl.to(fill, { scaleX: 1, duration: 0.45, ease: 'power2.inOut' }, '<0.08');
      tl.to({}, { duration: 0.15 });

      if (btn) gsap.to(btn, { color: '#FFFDF7', duration: 0.35, delay: 0.05 });
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    const btn = saveBtnRef.current;
    const label = saveLabelRef.current;
    if (!btn || !label || prefersReducedMotion) return;
    const onEnter = () => gsap.to(label, { letterSpacing: '0.15em', duration: 0.3, ease: 'power2.out' });
    const onLeave = () => gsap.to(label, { letterSpacing: '0.05em', duration: 0.3, ease: 'power2.out' });
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    gsap.set(label, { letterSpacing: '0.05em' });
    return () => {
      btn.removeEventListener('mouseenter', onEnter);
      btn.removeEventListener('mouseleave', onLeave);
    };
  }, [formStep, prefersReducedMotion, showForm]);

  const collapseFormAndCelebrate = useCallback(() => {
    const finishSubmitUi = () => {
      setFormSubmitted(true);
      setShowForm(false);
      setShowSuccessSplash(true);
    };

    const playDecoLines = () => {
      if (successBlockRef.current) {
        gsap.fromTo(
          successBlockRef.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
        );
      }
      successLinesRef.current.forEach((line, i) => {
        if (!line) return;
        gsap.fromTo(
          line,
          { scaleX: 0, transformOrigin: 'left center' },
          {
            scaleX: 1,
            duration: 0.55,
            ease: 'power2.out',
            delay: 0.2 + i * 0.14,
          }
        );
      });
    };

    const wrap = formCollapseRef.current;

    if (!wrap || prefersReducedMotion) {
      finishSubmitUi();
      requestAnimationFrame(() => {
        if (successBlockRef.current) {
          gsap.set(successBlockRef.current, { opacity: 1, y: 0 });
        }
        successLinesRef.current.forEach((line, i) => {
          if (!line) return;
          gsap.fromTo(
            line,
            { scaleX: 0, transformOrigin: 'left center' },
            { scaleX: 1, duration: 0.55, ease: 'power2.out', delay: i * 0.12 }
          );
        });
      });
      return;
    }

    const h = wrap.offsetHeight;
    gsap.set(wrap, { height: h, overflow: 'hidden' });
    gsap.to(wrap, {
      height: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: () => {
        finishSubmitUi();
        requestAnimationFrame(() => playDecoLines());
      },
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!entryJustAddedRef.current || prefersReducedMotion) return;
    const prev = streakBeforeSubmitRef.current;
    if (moodState.streak <= prev) {
      entryJustAddedRef.current = false;
      return;
    }
    entryJustAddedRef.current = false;

    const num = streakNumRef.current;
    const ring = streakRingRef.current;
    const glow = streakGlowRef.current;

    if (num) {
      gsap.timeline()
        .to(num, { rotationX: -90, duration: 0.18, transformPerspective: 400 })
        .set(num, { rotationX: 90 })
        .to(num, { rotationX: 0, duration: 0.22 });
    }
    if (ring) {
      gsap.fromTo(ring, { rotation: 0 }, { rotation: 360, duration: 0.65, ease: 'power2.inOut' });
    }
    if (glow) {
      gsap.fromTo(
        glow,
        { boxShadow: '0 0 0 rgba(196,101,74,0)' },
        {
          boxShadow: '0 0 28px rgba(196,101,74,0.45)',
          duration: 0.35,
          yoyo: true,
          repeat: 1,
        }
      );
    }
  }, [moodState.streak, prefersReducedMotion]);

  const resetSaveButtonVisual = useCallback(() => {
    if (saveLabelRef.current) gsap.set(saveLabelRef.current, { opacity: 1 });
    if (saveCheckRef.current) gsap.set(saveCheckRef.current, { opacity: 0 });
    if (saveFillRef.current)
      gsap.set(saveFillRef.current, { scaleX: 0, transformOrigin: 'left center' });
    if (saveRippleRef.current) gsap.set(saveRippleRef.current, { scale: 0, opacity: 0.35 });
    if (saveBtnRef.current) gsap.set(saveBtnRef.current, { color: '#1A1A1A' });
  }, []);

  useEffect(() => {
    if (!showForm) return;
    setShowSuccessSplash(false);
    resetSaveButtonVisual();
  }, [showForm, resetSaveButtonVisual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSubmitting(true);

    if (!prefersReducedMotion) {
      await playSaveButtonAnimation();
    }
    const ok = await persistEntry();
    setSubmitting(false);
    setIsSaving(false);

    if (ok) {
      collapseFormAndCelebrate();
    } else {
      resetSaveButtonVisual();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 9) return '😁';
    if (mood >= 7) return '🙂';
    if (mood >= 5) return '😐';
    if (mood >= 3) return '🙁';
    return '😞';
  };

  const getEnergyEmoji = (energy: number) => {
    if (energy >= 9) return '⚡';
    if (energy >= 7) return '✓';
    if (energy >= 5) return '○';
    if (energy >= 3) return '·';
    return '·';
  };

  const scrollToLatestEntry = () => {
    const id = newEntryIdRef.current;
    if (!id) return;
    const el = document.getElementById(`mood-entry-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    if (prefersReducedMotion) {
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      gsap.to(window, { duration: 0.55, ease: 'power2.inOut', scrollTo: { y, autoKill: true } });
    }
  };

  const baseUnsel =
    'min-h-[44px] rounded-full border border-[#D4CFC4] bg-transparent px-4 py-2 font-inter text-xs uppercase tracking-[0.15em] text-[#6B6459] transition-colors duration-200 hover:border-[#2D4A3E] hover:text-[#2D4A3E] md:min-h-0 md:py-2 [-webkit-tap-highlight-color:transparent] active:scale-95';
  const baseSel =
    'min-h-[44px] rounded-full border border-[#2D4A3E] bg-[#2D4A3E] px-4 py-2 font-inter text-xs uppercase tracking-[0.15em] text-[#FFFDF7] md:min-h-0 md:py-2 [-webkit-tap-highlight-color:transparent] active:scale-95';

  const jumpToStep = (s: number) => {
    if (s > furthestStep) return;
    goToStep(s);
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#F5F0E8] font-inter [-webkit-tap-highlight-color:transparent]"
      style={{ boxShadow: 'none' }}
    >
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-12 md:py-24">
        <button
          ref={backRef}
          type="button"
          onClick={() => navigate('/')}
          className="mb-8 inline-block font-inter text-sm text-[#1A1A1A] underline decoration-[#E8E2D6] underline-offset-4 transition hover:decoration-[#2D4A3E]"
          aria-label="Back to home"
        >
          ←
        </button>

        <header className="relative border-t border-[#E8E2D6] pt-10 md:min-h-[5.5rem]">
          <div className="flex flex-col gap-6 md:block">
            <h1
              ref={titleRef}
              className="font-inter text-3xl font-thin tracking-wide text-[#1A1A1A] md:text-6xl"
            >
              Mood
            </h1>

            <div
              ref={streakGlowRef}
              className="relative flex flex-col items-start md:absolute md:right-0 md:top-6 md:items-end"
            >
              <div ref={streakWrapRef} className="relative flex flex-col items-center md:items-end">
                <div className="relative flex h-28 w-28 items-center justify-center md:h-32 md:w-32">
                  <svg
                    ref={streakRingRef}
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                    aria-hidden
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="#C4654A"
                      strokeWidth={1}
                    />
                  </svg>
                  <div
                    className="relative text-center"
                    style={{ transformStyle: 'preserve-3d' as const }}
                  >
                    <span
                      ref={streakNumRef}
                      className="inline-block transform-gpu font-inter text-5xl font-thin tabular-nums text-[#C4654A]"
                      aria-live="polite"
                    >
                      {moodState.streak}
                    </span>
                    <span className="mt-1 block font-inter text-[0.65rem] uppercase tracking-[0.2em] text-[#8A8474]">
                      day streak
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div
          ref={heroHairlineRef}
          className="my-12 border-t border-[#E8E2D6]"
          aria-hidden
        />

        <section ref={formSectionRef} className="border-t border-[#E8E2D6] pt-12">
          <p className="font-inter text-sm uppercase tracking-[0.2em] text-[#8A8474]">
            Daily check-in
          </p>
          <p className="mt-3 max-w-xl text-[#4A4A4A]">
            {formSubmitted
              ? "You've tracked your mood today."
              : 'How are you feeling today?'}
            {!currentUser && (
              <span className="mt-2 block text-xs text-[#6B6459]">
                Sign in to sync across devices.
              </span>
            )}
          </p>

          {!formSubmitted && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-8 border border-[#2D4A3E] bg-[#2D4A3E] px-8 py-3 font-inter text-xs uppercase tracking-[0.2em] text-[#FFFDF7] transition-colors duration-300 hover:bg-[#243d32]"
            >
              Check in
            </button>
          )}

          {formSubmitted && !showForm && (
            <p className="mt-6 text-sm text-[#2D4A3E]">Tracked for today.</p>
          )}
        </section>

        <div ref={formScrollRef} className="scroll-mt-24">
          {showForm && (
            <div
              ref={formCollapseRef}
              className="mt-10 border-t border-[#E8E2D6] pt-10 md:px-0"
            >
              <div
                className={`mb-6 flex flex-wrap items-center justify-end gap-2 font-inter text-xs tracking-wide text-[#B5AFA3] ${isMobile ? 'justify-center' : ''}`}
                aria-label="Form steps"
              >
                <span className={`mr-1 inline-flex items-baseline gap-0.5 ${isMobile ? 'order-first w-full justify-center' : ''}`}>
                  <span ref={stepIndicatorNumRef} className="tabular-nums text-[#1A1A1A]">
                    {String(formStep).padStart(2, '0')}
                  </span>
                  <span>/ 05</span>
                </span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={s > furthestStep}
                    onClick={() => jumpToStep(s)}
                    className={`min-h-[44px] min-w-[44px] rounded-full px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      formStep === s ? 'text-[#1A1A1A]' : 'text-[#B5AFA3] hover:text-[#2D4A3E]'
                    }`}
                  >
                    {String(s).padStart(2, '0')}
                  </button>
                ))}
              </div>

              <div className="relative overflow-hidden">
                <form onSubmit={handleSubmit} className="pt-2">
                  <div ref={stepContentRef} className="min-h-[12rem]">
                    {formStep === 1 && (
                      <div className="mx-auto max-w-lg py-4">
                        <CustomSlider
                          label="Mood"
                          emoji={getMoodEmoji(newEntry.mood)}
                          min={1}
                          max={10}
                          value={newEntry.mood}
                          onChange={(v) => setNewEntry((p) => ({ ...p, mood: v }))}
                          mobileThumb={isMobile}
                          prefersReducedMotion={prefersReducedMotion}
                        />
                      </div>
                    )}

                    {formStep === 2 && (
                      <div className="grid gap-10 md:grid-cols-2 md:gap-12">
                        <CustomSlider
                          label="Energy"
                          emoji={getEnergyEmoji(newEntry.energy)}
                          min={1}
                          max={10}
                          value={newEntry.energy}
                          onChange={(v) => setNewEntry((p) => ({ ...p, energy: v }))}
                          mobileThumb={isMobile}
                          prefersReducedMotion={prefersReducedMotion}
                        />
                        <div>
                          <p className="mb-3 font-inter text-xs uppercase tracking-[0.2em] text-[#8A8474]">
                            Hours of sleep
                          </p>
                          <div className="flex items-center justify-center gap-6">
                            <button
                              type="button"
                              onClick={() => nudgeSleep(-0.5)}
                              className={`flex shrink-0 items-center justify-center rounded-full border border-[#D4CFC4] font-inter text-[#1A1A1A] transition-colors hover:border-[#2D4A3E] hover:bg-[#2D4A3E] hover:text-[#FFFDF7] ${isMobile ? 'h-11 w-11' : 'h-8 w-8'}`}
                              aria-label="Decrease sleep"
                            >
                              −
                            </button>
                            <div
                              ref={sleepNumRef}
                              className="min-w-[4rem] text-center font-inter text-3xl font-thin tabular-nums text-[#1A1A1A]"
                            >
                              {newEntry.sleep % 1 === 0 ? newEntry.sleep : newEntry.sleep.toFixed(1)}
                            </div>
                            <button
                              type="button"
                              onClick={() => nudgeSleep(0.5)}
                              className={`flex shrink-0 items-center justify-center rounded-full border border-[#D4CFC4] font-inter text-[#1A1A1A] transition-colors hover:border-[#2D4A3E] hover:bg-[#2D4A3E] hover:text-[#FFFDF7] ${isMobile ? 'h-11 w-11' : 'h-8 w-8'}`}
                              aria-label="Increase sleep"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {formStep === 3 && (
                      <div>
                        <p className="mb-4 font-inter text-xs uppercase tracking-[0.2em] text-[#8A8474]">
                          Activities today
                        </p>
                        <div
                          ref={tagsActRef}
                          className={`flex flex-wrap ${isMobile ? 'gap-3' : 'gap-2'}`}
                        >
                          {activities.map((activity) => (
                            <button
                              key={activity}
                              type="button"
                              data-mood-tag
                              onClick={(e) => handleActivityToggle(activity, e)}
                              className={
                                newEntry.activities.includes(activity) ? baseSel : baseUnsel
                              }
                            >
                              {activity.charAt(0).toUpperCase() + activity.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formStep === 4 && (
                      <div>
                        <p className="mb-4 font-inter text-xs uppercase tracking-[0.2em] text-[#8A8474]">
                          How would you describe your feelings?
                        </p>
                        <div
                          ref={tagsFeelRef}
                          className={`flex flex-wrap ${isMobile ? 'gap-3' : 'gap-2'}`}
                        >
                          {tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              data-mood-tag
                              onClick={(e) => handleTagToggle(tag, e)}
                              className={newEntry.tags.includes(tag) ? baseSel : baseUnsel}
                            >
                              {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formStep === 5 && (
                      <div className="space-y-6">
                        <div>
                          <label htmlFor="mood-notes" className="sr-only">
                            Notes
                          </label>
                          <textarea
                            id="mood-notes"
                            ref={notesRef}
                            value={newEntry.notes}
                            onChange={(e) =>
                              setNewEntry((p) => ({ ...p, notes: e.target.value }))
                            }
                            placeholder="How was your day?"
                            rows={3}
                            className="min-h-[100px] w-full resize-none border-0 border-b border-[#E8E2D6] bg-transparent py-2 font-inter text-sm text-[#1A1A1A] placeholder:font-light placeholder:italic placeholder:text-[#B5AFA3] focus:border-[#2D4A3E] focus:outline-none md:min-h-[80px]"
                          />
                          <p className="mt-1 text-right font-inter text-xs text-[#B5AFA3]">
                            {notesLength}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`mt-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}
                  >
                    {formStep > 1 ? (
                      <button
                        type="button"
                        onClick={() => goToStep(formStep - 1)}
                        className="order-2 font-inter text-sm text-[#4A4A4A] underline decoration-[#E8E2D6] underline-offset-4 hover:decoration-[#2D4A3E] md:order-1"
                      >
                        Back
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="order-2 text-left font-inter text-sm text-[#4A4A4A] underline decoration-[#E8E2D6] underline-offset-4 md:order-1"
                      >
                        Close
                      </button>
                    )}

                    {formStep < 5 ? (
                      <button
                        type="button"
                        onClick={() => continueFromStep(formStep)}
                        className={`order-1 border border-[#1A1A1A] bg-transparent px-8 py-3 font-inter text-xs uppercase tracking-[0.2em] text-[#1A1A1A] transition-all duration-300 hover:bg-[#1A1A1A] hover:text-[#FFFDF7] md:order-2 ${isMobile ? 'w-full' : ''}`}
                      >
                        Continue
                      </button>
                    ) : (
                      <button
                        ref={saveBtnRef}
                        type="submit"
                        disabled={isSaving}
                        className={`relative order-1 overflow-hidden border border-[#1A1A1A] bg-transparent px-8 py-3 font-inter text-xs uppercase tracking-[0.2em] text-[#1A1A1A] transition-all duration-300 md:order-2 ${isMobile ? 'w-full' : ''} disabled:opacity-60`}
                      >
                        <span
                          ref={saveFillRef}
                          className="pointer-events-none absolute inset-0 z-0 bg-[#2D4A3E]"
                          style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
                        />
                        <span
                          ref={saveRippleRef}
                          className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2D4A3E]/25"
                          style={{ transform: 'scale(0)' }}
                        />
                        <span ref={saveLabelRef} className="relative z-20">
                          Save
                        </span>
                        <span
                          ref={saveCheckRef}
                          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 opacity-0"
                        >
                          ✓
                        </span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {showSuccessSplash && (
          <div ref={successBlockRef} className="mt-10 border-t border-[#E8E2D6] pt-10">
            <div className="relative space-y-2 py-6">
              <div
                ref={(el) => {
                  successLinesRef.current[0] = el;
                }}
                className="h-px w-full max-w-md bg-[#E8E2D6]"
                style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
              />
              <div
                ref={(el) => {
                  successLinesRef.current[1] = el;
                }}
                className="h-px w-full max-w-sm bg-[#E8E2D6]"
                style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
              />
              <div
                ref={(el) => {
                  successLinesRef.current[2] = el;
                }}
                className="h-px w-full max-w-xs bg-[#E8E2D6]"
                style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
              />
            </div>
            <h2 className="font-inter text-3xl font-thin text-[#1A1A1A]">Tracked ✓</h2>
            <p className="mt-2 font-inter text-sm text-[#8A8474]">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <button
              type="button"
              onClick={scrollToLatestEntry}
              className="mt-6 font-inter text-sm text-[#2D4A3E] underline decoration-[#E8E2D6] underline-offset-4"
            >
              View entry →
            </button>
          </div>
        )}

        <div className="my-16 border-t border-[#E8E2D6]" aria-hidden />

        {moodTrendData.length >= 2 && (
          <section className="border-t border-[#E8E2D6] pt-12">
            <h2 className="font-inter text-sm uppercase tracking-[0.2em] text-[#8A8474]">
              Last {moodTrendData.length} check-ins
            </h2>
            <p className="mt-2 text-sm text-[#4A4A4A]">Mood and energy trend.</p>
            <Suspense fallback={<ChartSkeleton />}>
              <MoodTrendChart data={moodTrendData} />
            </Suspense>
          </section>
        )}

        <section
          ref={pastSectionRef}
          className="relative mt-16 border-t border-[#E8E2D6] pt-12 md:pl-10"
        >
          <h2 className="mb-10 font-inter text-sm uppercase tracking-[0.2em] text-[#8A8474]">
            Timeline
          </h2>

          <div
            ref={timelineLineRef}
            className="absolute bottom-0 left-[11px] top-8 hidden w-px origin-top bg-[#E8E2D6] md:block"
            aria-hidden
            style={{ transform: 'scaleY(0)' }}
          />

          {moodState.entries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="font-serif text-5xl font-thin text-[#1A1A1A]">Begin</p>
              <p className="mt-4 font-inter text-sm text-[#8A8474]">
                Your first check-in starts your timeline.
              </p>
              <div ref={emptyArrowRef} className="mt-8 text-2xl text-[#B5AFA3]">
                ↓
              </div>
            </div>
          ) : (
            <ul className="space-y-12 md:space-y-14">
              {moodState.entries.map((entry) => {
                const mc = moodAccentColor(entry.mood);
                return (
                  <li
                    key={entry.id}
                    id={`mood-entry-${entry.id}`}
                    data-mood-entry
                    className="group relative md:pl-8"
                  >
                    <span
                      data-mood-dot
                      className="absolute left-0 top-1 hidden h-2 w-2 -translate-x-[7px] rounded-full md:block"
                      style={{ backgroundColor: mc }}
                      aria-hidden
                    />
                    <article
                      className="border-l-[3px] border-[#E8E2D6] pl-6 opacity-95 transition-[transform,opacity] md:group-hover:translate-x-1 md:group-hover:opacity-100"
                      style={{ borderLeftColor: mc }}
                    >
                      <p className="date-label mb-2 font-inter text-xs uppercase tracking-[0.15em] text-[#8A8474] transition-transform md:group-hover:translate-x-[3px]">
                        {formatDate(entry.date)}
                      </p>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#2D4A3E]/10 px-3 py-1 font-inter text-xs text-[#2D4A3E]">
                          Mood {entry.mood} {getMoodEmoji(entry.mood)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#C4654A]/12 px-3 py-1 font-inter text-xs text-[#C4654A]">
                          Energy {entry.energy} {getEnergyEmoji(entry.energy)}
                        </span>
                        <span className="font-inter text-xs text-[#8A8474]">{entry.sleep}h sleep</span>
                      </div>
                      {entry.activities.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {entry.activities.map((a) => (
                            <span
                              key={a}
                              className="rounded-full border border-[#D4CFC4] px-2 py-0.5 font-inter text-[10px] uppercase tracking-[0.12em] text-[#6B6459]"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.tags.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {entry.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-[#D4CFC4] px-2 py-0.5 font-inter text-[10px] uppercase tracking-[0.12em] text-[#6B6459]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.notes && (
                        <div className="relative mt-3 pl-2">
                          <span
                            className="pointer-events-none absolute -left-1 top-0 font-serif text-4xl leading-none text-[#E8E2D6]"
                            aria-hidden
                          >
                            ❝
                          </span>
                          <p className="font-inter text-sm italic text-[#6B6459]">{entry.notes}</p>
                          {(() => {
                            const snap = analyzeNotes(entry.notes);
                            return (
                              <p className="mt-2 font-inter text-[10px] uppercase tracking-[0.12em] text-[#B5AFA3]">
                                Local note read · stress {snap.stressLevel} · tone {snap.sentiment}
                              </p>
                            );
                          })()}
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div
        ref={scrollHintRef}
        className="pointer-events-none fixed bottom-6 left-1/2 z-20 hidden h-10 w-px -translate-x-1/2 bg-[#B5AFA3] md:block"
        aria-hidden
      />
    </div>
  );
};

export default MoodTracker;
