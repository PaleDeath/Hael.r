import React, { useState, useEffect, useRef, useMemo } from 'react';
import { allQuestions } from './questions';
import { analyzeResponses } from './analyzer';
import { QuizState, AnalysisResult, Question } from './types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { determineNextQuestion } from './questionLogic';
import AnxietyIllustration from './illustrations/AnxietyIllustration';
import DepressionIllustration from './illustrations/DepressionIllustration';
import StressIllustration from './illustrations/StressIllustration';
import SleepIllustration from './illustrations/SleepIllustration';
import SocialIllustration from './illustrations/SocialIllustration';
import CrisisResources from './CrisisResources';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import firebaseAssessmentService from '../../services/firebase.assessment.service';
import { generateInsights, InsightReport } from '../../services/insights.service';
import { loadWellnessProgress, recordAssessmentDay, WellnessProgress } from '../../services/wellness-local.service';
import InsightsPanel from './InsightsPanel';
import QuizResultsCharts from './QuizResultsCharts';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    completed: false,
    questionPath: []
  });
  const [currentQuestion, setCurrentQuestion] = useState<Question>(allQuestions[0]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionHistory, setQuestionHistory] = useState<Question[]>([allQuestions[0]]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const streakRecordedRef = useRef(false);
  const [wellnessProgress, setWellnessProgress] = useState<WellnessProgress>(() => loadWellnessProgress());

  const containerRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const quizContentRef = useRef<HTMLDivElement>(null);
  const helperRef = useRef<HTMLParagraphElement>(null);
  const bgNumberRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const transitionTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const enterTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const resultsTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const resultsRootRef = useRef<HTMLDivElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const resultsInsightsRef = useRef<HTMLDivElement>(null);
  const resultsChartsRef = useRef<HTMLDivElement>(null);
  const resultsOverviewRef = useRef<HTMLDivElement>(null);
  const resultsCategoryGridRef = useRef<HTMLDivElement>(null);
  const resultsRecommendationsRef = useRef<HTMLDivElement>(null);
  const resultsShareSectionRef = useRef<HTMLDivElement>(null);
  const resultsDisclaimerRef = useRef<HTMLDivElement>(null);
  const resultsActionsRef = useRef<HTMLDivElement>(null);

  const progress = Math.min(
    ((Object.keys(state.answers).length) / 10) * 100,
    100
  );

  const questionNumber = Object.keys(state.answers).length + 1;

  const questionWords = useMemo(
    () => currentQuestion.text.split(/\s+/).filter(Boolean),
    [currentQuestion.id, currentQuestion.text]
  );

  const getMostSevereCategory = (): { category: string; severity: 'low' | 'moderate' | 'high' } => {
    if (!result) return { category: 'general', severity: 'low' };

    let mostSevereCategory = 'general';
    let highestSeverity: 'low' | 'moderate' | 'high' = 'low';

    Object.entries(result.categories).forEach(([category, data]) => {
      if (data.severity === 'high' && highestSeverity !== 'high') {
        mostSevereCategory = category;
        highestSeverity = 'high';
      } else if (data.severity === 'moderate' && highestSeverity === 'low') {
        mostSevereCategory = category;
        highestSeverity = 'moderate';
      }
    });

    return { category: mostSevereCategory, severity: highestSeverity };
  };

  const handleShareResults = () => {
    setShowShareOptions(!showShareOptions);
  };

  const saveToLocalStorage = () => {
    try {
      const savedAssessments = JSON.parse(localStorage.getItem('savedAssessments') || '[]');
      savedAssessments.push({
        date: new Date().toISOString(),
        result,
        answers: state.answers,
        questionPath: state.questionPath
      });
      localStorage.setItem('savedAssessments', JSON.stringify(savedAssessments));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      console.log('Assessment saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      alert('Failed to save assessment. Please try again.');
    }
  };

  const handleSaveResults = async () => {
    if (!result) {
      console.error('Cannot save: No result available');
      return;
    }

    if (currentUser) {
      try {
        const assessmentData = {
          answers: state.answers,
          questionPath: state.questionPath,
          categories: result.categories,
          overallAnalysis: result.overallAnalysis,
          recommendations: result.recommendations
        };

        const response = await firebaseAssessmentService.createAssessment(assessmentData);

        if (response.success) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          console.log('Assessment saved to Firebase:', response.assessment?.id);
        } else {
          console.error('Failed to save to Firebase, falling back to localStorage:', response.message);
          throw new Error(response.message);
        }
      } catch (error) {
        console.error('Error saving to Firebase, using localStorage fallback:', error);
        saveToLocalStorage();
      }
    } else {
      saveToLocalStorage();
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess(true);
    setTimeout(() => {
      setEmailSuccess(false);
      setShowEmailForm(false);
    }, 3000);
  };

  const insightReport: InsightReport | null = useMemo(() => {
    if (!result) return null;
    const dayKey = new Date().toISOString().slice(0, 10);
    return generateInsights(result, undefined, { variationKey: dayKey });
  }, [result]);

  useEffect(() => {
    if (!result || streakRecordedRef.current) return;
    streakRecordedRef.current = true;
    const next = recordAssessmentDay();
    setWellnessProgress(next);
  }, [result]);

  useEffect(() => {
    return () => {
      transitionTimelineRef.current?.kill();
      enterTimelineRef.current?.kill();
      resultsTimelineRef.current?.kill();
      const killTargets: gsap.TweenTarget[] = [
        containerRef.current,
        quizContentRef.current,
        questionRef.current,
        optionsRef.current,
        progressBarRef.current,
        progressTextRef.current,
        helperRef.current,
        bgNumberRef.current,
        resultsRootRef.current,
        resultsHeadingRef.current,
        badgesRef.current,
        resultsCategoryGridRef.current,
        resultsActionsRef.current,
        ...optionRefs.current.filter(Boolean)
      ].filter(Boolean) as gsap.TweenTarget[];
      if (killTargets.length) gsap.killTweensOf(killTargets);
    };
  }, []);

  useEffect(() => {
    if (state.completed || !quizContentRef.current) return;

    setIsLoading(true);
    setSelectedOption(null);

    enterTimelineRef.current?.kill();

    const reduced = prefersReducedMotion();
    const qRoot = quizContentRef.current;
    const qBlock = questionRef.current;
    const helper = helperRef.current;
    const bg = bgNumberRef.current;
    const wordInners = qBlock
      ? (Array.from(qBlock.querySelectorAll('.word-inner')) as HTMLElement[])
      : [];
    const optionEls = optionRefs.current.filter(Boolean) as HTMLButtonElement[];

    gsap.killTweensOf([qRoot, qBlock, helper, bg, ...wordInners, ...optionEls]);

    if (reduced) {
      gsap.set(qRoot, { opacity: 1, y: 0 });
      if (bg) gsap.set(bg, { opacity: 0.03, scale: 1 });
      gsap.set(wordInners, { y: 0, rotateX: 0, opacity: 1 });
      if (helper) gsap.set(helper, { opacity: 1, y: 0 });
      gsap.set(optionEls, { opacity: 1, y: 0 });
      optionEls.forEach((el) =>
        gsap.set(el, {
          clearProps:
            'backgroundColor,color,paddingLeft,paddingRight,marginLeft,marginRight,borderRadius,borderBottomColor'
        })
      );
      setIsLoading(false);
      return;
    }

    optionEls.forEach((el) =>
      gsap.set(el, {
        clearProps:
          'backgroundColor,color,paddingLeft,paddingRight,marginLeft,marginRight,borderRadius,borderBottomColor'
      })
    );

    gsap.set(qRoot, { opacity: 1, y: 0 });
    if (bg) gsap.set(bg, { opacity: 0, scale: 0.9 });
    gsap.set(wordInners, { y: '110%', rotateX: -30, transformOrigin: '50% 100%' });
    if (helper) gsap.set(helper, { opacity: 0, y: 10 });
    gsap.set(optionEls, { opacity: 0, y: 25 });

    const tl = gsap.timeline({
      onComplete: () => setIsLoading(false)
    });
    enterTimelineRef.current = tl;

    if (bg) {
      tl.fromTo(
        bg,
        { opacity: 0, scale: 0.9 },
        { opacity: 0.03, scale: 1, duration: 1.2, ease: 'power2.out' }
      );
    }

    if (wordInners.length) {
      tl.fromTo(
        wordInners,
        { y: '110%', rotateX: -30 },
        {
          y: '0%',
          rotateX: 0,
          duration: 0.7,
          stagger: 0.04,
          ease: 'power3.out'
        },
        '-=0.8'
      );
    }

    if (helper) {
      tl.fromTo(
        helper,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.3'
      );
    }

    if (optionEls.length) {
      tl.fromTo(
        optionEls,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.07,
          ease: 'power2.out'
        },
        '-=0.3'
      );
    }

    return () => {
      tl.kill();
    };
  }, [currentQuestion, state.completed]);

  useEffect(() => {
    if (!progressBarRef.current) return;
    const reduced = prefersReducedMotion();
    gsap.killTweensOf(progressBarRef.current);
    if (reduced) {
      gsap.set(progressBarRef.current, { width: `${progress}%` });
      return;
    }
    gsap.to(progressBarRef.current, {
      width: `${progress}%`,
      duration: 0.8,
      ease: 'power2.inOut'
    });
  }, [progress]);

  useEffect(() => {
    if (!state.completed || !result || !resultsRootRef.current) return;

    resultsTimelineRef.current?.kill();
    const reduced = prefersReducedMotion();
    const root = resultsRootRef.current;

    if (reduced) {
      gsap.set(root, { opacity: 1 });
      root.querySelectorAll('.results-reveal').forEach((el) => {
        gsap.set(el, { opacity: 1, y: 0 });
      });
      const cards = root.querySelectorAll('.category-card');
      cards.forEach((el) => {
        gsap.set(el, { opacity: 1, y: 0, scale: 1 });
      });
      const actions = root.querySelectorAll('.action-btn');
      actions.forEach((el) => {
        gsap.set(el, { opacity: 1, y: 0 });
      });
      return;
    }

    const heading = resultsHeadingRef.current;
    const badgeWrap = badgesRef.current;
    const revealEls = Array.from(root.querySelectorAll('.results-reveal')) as HTMLElement[];
    const categoryCards = Array.from(root.querySelectorAll('.category-card')) as HTMLElement[];
    const actionBtns = Array.from(root.querySelectorAll('.action-btn')) as HTMLElement[];

    gsap.set([heading, ...(badgeWrap?.children ?? []), ...revealEls, ...categoryCards, ...actionBtns].filter(Boolean), {
      opacity: 0
    });
    if (heading) gsap.set(heading, { y: 40 });
    if (badgeWrap?.children) gsap.set(badgeWrap.children, { scale: 0.9 });
    if (revealEls.length) gsap.set(revealEls, { y: 20 });
    gsap.set(categoryCards, { y: 30 });
    gsap.set(actionBtns, { y: 15 });

    const tl = gsap.timeline();
    resultsTimelineRef.current = tl;

    if (heading) {
      tl.fromTo(
        heading,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    }
    if (badgeWrap?.children?.length) {
      tl.fromTo(
        badgeWrap.children,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)' },
        '-=0.4'
      );
    }
    if (revealEls.length) {
      tl.fromTo(
        revealEls,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: 'power2.out' },
        '-=0.35'
      );
    }
    if (categoryCards.length) {
      tl.fromTo(
        categoryCards,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' },
        '-=0.3'
      );
    }
    if (actionBtns.length) {
      tl.fromTo(
        actionBtns,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
        '-=0.2'
      );
    }

    return () => {
      tl.kill();
    };
  }, [state.completed, result]);

  const handleAnswer = (value: number) => {
    if (isLoading) return;

    setSelectedOption(value);
    const optionsList = currentQuestion.options ?? [];
    const idx = optionsList.findIndex((o) => o.value === value);
    const btn = idx >= 0 ? optionRefs.current[idx] : null;

    if (btn && !prefersReducedMotion()) {
      gsap.killTweensOf(btn);
      gsap.to(btn, {
        backgroundColor: '#1A1A1A',
        color: '#FFFFFF',
        paddingLeft: 24,
        paddingRight: 24,
        marginLeft: -24,
        marginRight: -24,
        borderRadius: 16,
        borderBottomColor: 'transparent',
        duration: 0.4,
        ease: 'power3.out'
      });
    }

    setTimeout(() => {
      const newAnswers = {
        ...state.answers,
        [currentQuestion.id]: value
      };

      setIsLoading(true);
      transitionTimelineRef.current?.kill();

      const reduced = prefersReducedMotion();
      const optionEls = optionRefs.current.filter(Boolean) as HTMLButtonElement[];
      const qBlock = questionRef.current;
      const bg = bgNumberRef.current;

      const applyTransitionComplete = () => {
        if (reduced) {
          if (qBlock) gsap.set(qBlock, { clearProps: 'opacity,transform' });
          gsap.set(optionEls, {
            clearProps:
              'opacity,transform,backgroundColor,color,paddingLeft,paddingRight,marginLeft,marginRight,borderRadius,borderBottomColor'
          });
          if (bg) gsap.set(bg, { clearProps: 'opacity,transform' });
        } else {
          optionEls.forEach((el) =>
            gsap.set(el, {
              clearProps:
                'opacity,transform,backgroundColor,color,paddingLeft,paddingRight,marginLeft,marginRight,borderRadius,borderBottomColor'
            })
          );
          if (qBlock) gsap.set(qBlock, { opacity: 1, y: 0 });
          if (bg) gsap.set(bg, { opacity: 0.03, scale: 1 });
        }

        const nextQuestion =
          Object.keys(newAnswers).length >= 10
            ? null
            : determineNextQuestion(currentQuestion, newAnswers, questionHistory);

        if (!nextQuestion || Object.keys(newAnswers).length >= 10) {
          const analysisResult = analyzeResponses(newAnswers);
          setState({
            ...state,
            answers: newAnswers,
            completed: true
          });
          setResult(analysisResult);
          setIsLoading(false);

          console.log('Assessment completed:', {
            answers: newAnswers,
            result: analysisResult,
            timestamp: new Date().toISOString()
          });
        } else {
          setQuestionHistory((prev) => [...prev, nextQuestion]);
          setCurrentQuestion(nextQuestion);
          setState({
            ...state,
            answers: newAnswers,
            questionPath: [...state.questionPath, currentQuestion.id]
          });
        }
      };

      if (reduced) {
        applyTransitionComplete();
        return;
      }

      const exitTl = gsap.timeline({
        onComplete: applyTransitionComplete
      });
      transitionTimelineRef.current = exitTl;

      if (optionEls.length) {
        exitTl.to(optionEls, {
          opacity: 0,
          y: -20,
          duration: 0.35,
          stagger: 0.03,
          ease: 'power2.in'
        });
      }
      if (qBlock) {
        exitTl.to(
          qBlock,
          {
            opacity: 0,
            y: -30,
            duration: 0.4,
            ease: 'power2.in'
          },
          '-=0.2'
        );
      }
      if (bg) {
        exitTl.to(
          bg,
          {
            opacity: 0,
            duration: 0.3
          },
          '-=0.3'
        );
      }
    }, 400);
  };

  const goBackToHome = () => {
    navigate('/');
  };

  const severityBarColor = (severity: string) => {
    if (severity === 'low') return 'bg-[#3D6B50]';
    if (severity === 'moderate') return 'bg-[#8B6914]';
    return 'bg-[#9B2C2C]';
  };

  const severityBadgeClass = (severity: string) => {
    if (severity === 'low') return 'bg-[#E8F0EB] text-[#3D6B50]';
    if (severity === 'moderate') return 'bg-[#FDF6E3] text-[#8B6914]';
    return 'bg-[#FDE8E8] text-[#9B2C2C]';
  };

  const focusRing =
    'focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F5F0] focus-visible:outline-none';

  const secondaryBtn =
    `action-btn border border-[#D0D0D0] rounded-full px-6 py-3 min-h-[48px] text-sm font-inter text-[#666] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-all duration-300 ${focusRing}`;
  const primaryBtn =
    `action-btn bg-[#1A1A1A] text-white rounded-full px-8 py-3 min-h-[48px] text-sm font-inter hover:bg-[#333] transition-all duration-300 ${focusRing}`;

  const getQuestionFontClass = (text: string): string => {
    const len = text.length;
    if (len <= 60) return 'text-[clamp(2rem,4.5vw,3.25rem)]';
    if (len <= 100) return 'text-[clamp(1.75rem,3.5vw,2.75rem)]';
    if (len <= 140) return 'text-[clamp(1.5rem,3vw,2.25rem)]';
    return 'text-[clamp(1.25rem,2.5vw,2rem)]';
  };

  const renderQuestion = () => {
    const options = currentQuestion.options ?? [];
    const qText = currentQuestion.text;
    optionRefs.current = [];

    return (
      <>
        <div ref={questionRef} className="mb-6 md:mb-8">
          <h2
            id="quiz-question-heading"
            className={`font-lexend font-light leading-[1.2] tracking-[-0.01em] text-[#1A1A1A] ${getQuestionFontClass(qText)}`}
            style={{ perspective: '800px' }}
          >
            {questionWords.map((word, i) => (
              <span
                key={`${currentQuestion.id}-w-${i}`}
                className="inline-block mr-[0.3em] last:mr-0 overflow-hidden pb-[0.05em]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <span className="word-inner inline-block">{word}</span>
              </span>
            ))}
          </h2>
          <p
            ref={helperRef}
            className="font-inter text-sm text-[#999] mt-4 md:mt-6 max-w-xl"
          >
            Select the option that best describes your experience over the past two weeks.
          </p>
        </div>

        <div
          ref={optionsRef}
          className="w-full pl-0 md:pl-10 md:ml-6 border-t border-transparent overflow-hidden"
          role="radiogroup"
          aria-labelledby="quiz-question-heading"
        >
          {options.map((option, idx) => {
            const selected = selectedOption === option.value;
            const reduced = prefersReducedMotion();
            return (
              <button
                key={idx}
                type="button"
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                role="radio"
                aria-checked={selected}
                onClick={() => handleAnswer(option.value)}
                className={[
                  'group w-full min-h-[48px] text-left py-4 md:py-5 border-b border-[#E0E0E0]',
                  'flex items-center justify-between transition-all duration-300',
                  focusRing,
                  selected && reduced
                    ? '!bg-[#1A1A1A] text-white -mx-6 px-6 rounded-xl !border-transparent'
                    : !selected
                      ? 'hover:border-[#1A1A1A] bg-transparent'
                      : 'bg-transparent',
                  selected && !reduced ? '!border-transparent' : ''
                ].join(' ')}
              >
                <span
                  className={`min-w-0 flex-1 font-inter text-sm md:text-base transition-colors duration-300 pr-4 ${
                    selected ? 'text-white font-medium' : 'text-[#666] group-hover:text-[#1A1A1A]'
                  }`}
                >
                  {option.text}
                </span>
                <span
                  className={`w-5 h-5 min-w-[20px] min-h-[20px] shrink-0 rounded-full border flex items-center justify-center box-border transition-all duration-300 ${
                    selected
                      ? 'border-white bg-white'
                      : 'border-[#CCC] group-hover:border-[#1A1A1A] bg-transparent'
                  }`}
                  aria-hidden
                >
                  {selected && (
                    <span className="w-2 h-2 shrink-0 rounded-full bg-[#1A1A1A]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderResults = () => {
    if (!result) return null;

    const { category, severity } = getMostSevereCategory();
    const showCrisisResources = severity === 'high' || severity === 'moderate';

    return (
      <div ref={resultsRootRef} className="max-w-3xl mx-auto px-6 md:px-[10vw] lg:px-8 py-16">
        <h2
          ref={resultsHeadingRef}
          className="font-lexend text-[clamp(2rem,4vw,3rem)] font-light text-[#1A1A1A] mb-2 text-center"
        >
          Your Mental Health Assessment
        </h2>

        <div ref={badgesRef} className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E0] px-4 py-2 text-xs font-inter uppercase tracking-[0.1em] text-[#666]">
            <span aria-hidden>🔥</span>
            <span>
              {wellnessProgress.assessmentStreak} day assessment streak
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E0] px-4 py-2 text-xs font-inter uppercase tracking-[0.1em] text-[#666]">
            <span>
              {wellnessProgress.totalAssessments} total check-in
              {wellnessProgress.totalAssessments !== 1 ? 's' : ''} on this device
            </span>
          </div>
        </div>

        {showCrisisResources && (
          <CrisisResources
            severity={severity}
            category={category}
          />
        )}

        <div className="space-y-8">
          {insightReport && (
            <div ref={resultsInsightsRef} className="results-reveal">
              <InsightsPanel report={insightReport} />
            </div>
          )}

          <div ref={resultsChartsRef} className="results-reveal">
            <QuizResultsCharts result={result} />
          </div>

          <div
            ref={resultsOverviewRef}
            className="category-card bg-white border border-[#E8E8E8] rounded-2xl p-6 md:p-8 shadow-none hover:shadow-sm transition-shadow duration-300"
          >
            <h3 className="font-lexend text-lg font-normal text-[#1A1A1A] mb-4">Written overview</h3>
            <p className="font-inter text-sm text-[#666] leading-relaxed">{result.overallAnalysis}</p>
          </div>

          <div ref={resultsCategoryGridRef} className="grid grid-cols-1 gap-6">
            {Object.entries(result.categories).map(([cat, data]) => {
              const pct = Math.min(100, Math.max(0, data.score));
              return (
                <div
                  key={cat}
                  className="category-card bg-white border border-[#E8E8E8] rounded-2xl p-6 md:p-8 shadow-none hover:shadow-sm transition-shadow duration-300"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="font-lexend text-lg font-normal capitalize text-[#1A1A1A]">{cat}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium font-inter shrink-0 ${severityBadgeClass(data.severity)}`}>
                      {data.severity}
                    </span>
                  </div>
                  <div className="h-[3px] w-full rounded-full bg-[#EEEEEE] overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${severityBarColor(data.severity)} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="font-inter text-sm text-[#666] leading-relaxed mt-3">{data.summary}</p>

                  <div className="flex justify-center my-4">
                    {cat === 'anxiety' && (
                      <AnxietyIllustration severity={data.severity} size={150} />
                    )}
                    {cat === 'depression' && (
                      <DepressionIllustration severity={data.severity} size={150} />
                    )}
                    {cat === 'stress' && (
                      <StressIllustration severity={data.severity} size={150} />
                    )}
                    {cat === 'sleep' && (
                      <SleepIllustration severity={data.severity} size={150} />
                    )}
                    {cat === 'social' && (
                      <SocialIllustration severity={data.severity} size={150} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            ref={resultsRecommendationsRef}
            className="category-card bg-white border border-[#E8E8E8] rounded-2xl p-6 md:p-8 shadow-none hover:shadow-sm transition-shadow duration-300"
          >
            <h3 className="font-lexend text-lg font-normal text-[#1A1A1A] mb-4">Recommendations</h3>
            <ul className="list-disc pl-5 space-y-2 font-inter text-sm text-[#666] leading-relaxed">
              {result.recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </div>

          <div ref={resultsActionsRef} className="flex flex-wrap gap-3 justify-center mt-10">
            <button
              type="button"
              onClick={goBackToHome}
              className={secondaryBtn}
            >
              Back to Home
            </button>

            <button
              type="button"
              onClick={handleSaveResults}
              className={`${primaryBtn} relative`}
            >
              {saveSuccess ? 'Saved!' : 'Save Results'}
              {saveSuccess && (
                <span className="absolute -top-2 -right-2 bg-[#1A1A1A] text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-inter border border-white" aria-hidden>
                  ✓
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareResults}
              className={secondaryBtn}
            >
              Share Results
            </button>
          </div>

          <div ref={resultsShareSectionRef}>
            {showShareOptions && (
              <div className="mt-6 bg-white border border-[#E8E8E8] rounded-2xl p-6 md:p-8 shadow-sm">
                <h3 className="font-lexend text-lg font-normal text-[#1A1A1A] mb-4">Share Options</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className={`${secondaryBtn} flex items-center justify-center rounded-2xl py-4`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Results
                  </button>

                  <button
                    type="button"
                    className={`${secondaryBtn} flex items-center justify-center rounded-2xl py-4`}
                    onClick={() => {
                      alert('PDF download would start here.');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                </div>

                {showEmailForm && (
                  <form onSubmit={handleEmailSubmit} className="mt-6 p-4 border border-[#E8E8E8] rounded-xl bg-[#FAFAFA]">
                    <h4 className="font-inter font-medium mb-2 text-[#1A1A1A]">Send Results via Email</h4>

                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm font-medium text-[#666] mb-1 font-inter">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={`w-full p-2 border border-[#D0D0D0] rounded-lg font-inter ${focusRing}`}
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowEmailForm(false)}
                        className={`${secondaryBtn} px-4 py-2 text-sm`}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className={`${primaryBtn} px-6 py-2 text-sm`}
                      >
                        {emailSuccess ? 'Sent!' : 'Send Email'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div ref={resultsDisclaimerRef} className="font-inter text-xs text-[#AAA] text-center mt-12 max-w-md mx-auto leading-relaxed">
            <p>This assessment is based on standardized mental health screening tools. Results are not a clinical diagnosis.</p>
            <p className="mt-1">For professional help, consider consulting a licensed mental health provider.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={
        state.completed
          ? 'min-h-screen bg-[#F5F5F0] relative overflow-hidden font-inter text-[#1A1A1A]'
          : 'fixed inset-0 z-50 flex flex-col bg-[#F5F5F0] overflow-hidden font-inter text-[#1A1A1A]'
      }
      style={state.completed ? undefined : { cursor: 'auto' }}
    >
      {state.completed ? (
        renderResults()
      ) : (
        <>
          <div className="flex-shrink-0 flex items-center justify-between px-6 md:px-[10vw] pt-8 pb-4">
            <span
              ref={progressTextRef}
              className="font-inter text-xs uppercase tracking-[0.2em] text-[#999]"
            >
              {String(questionNumber).padStart(2, '0')} / 10
            </span>
            <button
              type="button"
              onClick={goBackToHome}
              className={`font-inter text-xs uppercase tracking-[0.15em] text-[#999] hover:text-[#1A1A1A] transition-colors duration-300 bg-transparent border-0 cursor-pointer ${focusRing} rounded-sm`}
            >
              ← Back
            </button>
          </div>

          <div
            className="flex-shrink-0 w-full h-[2px] bg-[#E8E8E8]"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Assessment progress"
          >
            <div
              ref={progressBarRef}
              className="h-full bg-[#1A1A1A] transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex-1 min-h-0 flex items-center relative overflow-hidden">
            <div
              ref={quizContentRef}
              className="w-full max-w-[750px] min-w-0 md:px-[10vw] px-6 py-8 max-h-full min-h-0 overflow-hidden relative z-10 md:pr-[5vw]"
            >
              {renderQuestion()}
            </div>

            <div
              ref={bgNumberRef}
              className="hidden md:block absolute right-[3vw] top-1/2 -translate-y-1/2 font-lexend font-thin text-[#1A1A1A] opacity-[0.03] select-none pointer-events-none leading-none z-0"
              style={{ fontSize: 'clamp(10rem, 18vw, 22rem)' }}
              aria-hidden
            >
              {String(questionNumber).padStart(2, '0')}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizPage;
