import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

/* ═══════════════════════════════════════════════════════════════════════════
 *  Overlay — entry / exit for Hael.r
 *
 *  Layers: warm field + vignette → halo + core orb → rule + title → CTA → grain.
 *  Exit: CTA dematerializes, type lifts, orb expands away, curtain wipe.
 * ═══════════════════════════════════════════════════════════════════════════ */

interface OverlayProps {
  onEnter: () => void;
  isFadingOut: boolean;
}

const CHARS = ["H", "a", "e", "l", ".", "r"];

const GRAIN_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAJklEQVQIW2P4/5/hPwMDA8P///8ZGBkZGRhANJigoAADAwsLMwMAL2EF/jXEp14AAAAASUVORK5CYII=";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const Overlay: React.FC<OverlayProps> = ({ onEnter, isFadingOut }) => {
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const labelWrapRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);

  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const breathRef = useRef<gsap.core.Tween | null>(null);
  const driftRef = useRef<gsap.core.Tween | null>(null);
  const pulseRef = useRef<gsap.core.Tween | null>(null);
  const idleRef = useRef<gsap.core.Tween | null>(null);
  const exitRanRef = useRef(false);

  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setFontReady(true));
    } else {
      const t = window.setTimeout(() => setFontReady(true), 200);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!fontReady || isFadingOut) return;

    const reduce = prefersReducedMotion();

    const ctx = gsap.context(() => {
      const root = rootRef.current;
      const halo = haloRef.current;
      const circle = circleRef.current;
      const rule = ruleRef.current;
      const grain = grainRef.current;
      const content = contentRef.current;
      if (!root) return;

      gsap.set(root, { clipPath: "inset(0% 0% 0% 0%)" });

      if (fieldRef.current) {
        gsap.fromTo(
          fieldRef.current,
          { opacity: 0 },
          { opacity: 1, duration: reduce ? 0.2 : 0.9, ease: "power2.out" },
        );
      }

      const vMax = Math.max(window.innerWidth, window.innerHeight);
      const coreSize = vMax * (reduce ? 0.45 : 0.52);
      const haloSize = coreSize * 1.45;

      if (halo) {
        gsap.set(halo, {
          width: 0,
          height: 0,
          opacity: 0,
          xPercent: -50,
          yPercent: -50,
        });
        gsap.to(halo, {
          width: haloSize,
          height: haloSize,
          opacity: reduce ? 0.35 : 0.55,
          duration: reduce ? 0.35 : 1.85,
          delay: reduce ? 0 : 0.05,
          ease: reduce ? "power2.out" : "power3.out",
        });
      }

      if (circle) {
        gsap.set(circle, {
          width: 0,
          height: 0,
          opacity: 0,
          xPercent: -50,
          yPercent: -50,
          transformOrigin: "50% 50%",
        });
        gsap.to(circle, {
          width: coreSize,
          height: coreSize,
          opacity: 1,
          duration: reduce ? 0.35 : 1.55,
          delay: reduce ? 0 : 0.12,
          ease: reduce ? "power2.out" : "power4.out",
          onComplete() {
            if (reduce) return;
            breathRef.current = gsap.to(circle, {
              scale: 1.028,
              duration: 4.2,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            });
          },
        });
      }

      if (rule) {
        gsap.set(rule, { scaleX: 0.08, opacity: 0 });
        gsap.to(rule, {
          scaleX: 1,
          opacity: 0.18,
          duration: reduce ? 0.2 : 1.1,
          delay: reduce ? 0.05 : 0.35,
          ease: reduce ? "power2.out" : "power3.inOut",
          transformOrigin: "50% 50%",
        });
      }

      const chars = charRefs.current.filter(Boolean) as HTMLSpanElement[];
      const tl = gsap.timeline();
      entryTlRef.current = tl;

      gsap.set(chars, { yPercent: 118, opacity: 0, rotateX: reduce ? 0 : -12 });

      tl.to(chars, {
        yPercent: 0,
        opacity: 1,
        rotateX: 0,
        duration: reduce ? 0.35 : 1.05,
        ease: reduce ? "power2.out" : "power4.out",
        stagger: reduce ? 0.02 : 0.065,
      });

      if (dotRef.current) {
        gsap.set(dotRef.current, { width: 0, height: 0, opacity: 1, scale: 0.85 });
        tl.to(
          dotRef.current,
          {
            width: 7,
            height: 7,
            scale: 1,
            duration: reduce ? 0.25 : 0.55,
            ease: reduce ? "power2.out" : "back.out(2.8)",
          },
          reduce ? "+=0.05" : "+=0.35",
        );
      }

      if (labelRef.current) {
        gsap.set(labelRef.current, { opacity: 0, y: 14, letterSpacing: "0.38em" });
        tl.to(
          labelRef.current,
          {
            opacity: 0.85,
            y: 0,
            letterSpacing: "0.3em",
            duration: reduce ? 0.2 : 0.7,
            ease: reduce ? "power2.out" : "power3.out",
          },
          "-=0.15",
        );
        if (!reduce) {
          tl.add(() => {
            pulseRef.current = gsap.to(labelRef.current, {
              opacity: 0.38,
              duration: 1.6,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            });
          });
        }
      }

      if (content && !reduce) {
        idleRef.current = gsap.to(content, {
          y: 5,
          duration: 5.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }

      if (grain && !reduce) {
        gsap.set(grain, { opacity: 0 });
        gsap.to(grain, {
          opacity: 0.055,
          duration: 1.4,
          delay: 0.4,
          ease: "none",
        });
        driftRef.current = gsap.to(grain, {
          backgroundPosition: "240px 180px",
          duration: 14,
          ease: "none",
          repeat: -1,
        });
      } else if (grain) {
        gsap.set(grain, { opacity: 0.04 });
      }
    }, rootRef);

    return () => ctx.revert();
  }, [fontReady, isFadingOut]);

  useEffect(() => {
    if (!isFadingOut || exitRanRef.current) return;
    exitRanRef.current = true;

    pulseRef.current?.kill();
    breathRef.current?.kill();
    driftRef.current?.kill();
    idleRef.current?.kill();
    entryTlRef.current?.kill();

    const reduce = prefersReducedMotion();
    const root = rootRef.current;
    const halo = haloRef.current;
    const circle = circleRef.current;
    const grain = grainRef.current;
    const label = labelRef.current;
    const dot = dotRef.current;
    const rule = ruleRef.current;
    const content = contentRef.current;
    const chars = charRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (!root) return;

    const exit = gsap.timeline({
      onComplete: () => onEnterRef.current(),
    });

    exit.set(root, { pointerEvents: "none" });

    const fadeCTA = [label, dot].filter(Boolean);
    if (fadeCTA.length) {
      exit.to(fadeCTA, {
        opacity: 0,
        scale: reduce ? 1 : 0.9,
        y: reduce ? 0 : -6,
        duration: reduce ? 0.12 : 0.22,
        ease: "power3.in",
        stagger: 0.02,
        overwrite: "auto",
      });
    }

    if (content && !reduce) {
      exit.to(
        content,
        {
          filter: "blur(10px)",
          opacity: 0.35,
          scale: 0.99,
          duration: 0.42,
          ease: "power2.in",
          overwrite: "auto",
        },
        0.05,
      );
    }

    if (chars.length) {
      exit.to(
        chars,
        {
          yPercent: -40,
          opacity: 0,
          stagger: reduce ? 0 : { each: 0.028, from: "center" },
          duration: reduce ? 0.25 : 0.42,
          ease: "power4.in",
          overwrite: "auto",
        },
        0.08,
      );
    }

    if (rule) {
      exit.to(
        rule,
        {
          scaleX: 0.04,
          opacity: 0,
          duration: 0.35,
          ease: "power3.in",
        },
        0.06,
      );
    }

    if (halo) {
      exit.to(
        halo,
        {
          opacity: 0,
          scale: reduce ? 1 : 1.25,
          duration: reduce ? 0.2 : 0.45,
          ease: "power2.out",
        },
        0.12,
      );
    }

    if (circle) {
      gsap.set(circle, { scale: 1 });
      exit.to(
        circle,
        {
          opacity: 0,
          scale: reduce ? 1 : 1.22,
          duration: reduce ? 0.25 : 0.5,
          ease: "power3.out",
          overwrite: "auto",
        },
        0.14,
      );
    }

    if (grain) {
      exit.to(
        grain,
        {
          opacity: 0,
          duration: 0.22,
          ease: "power2.out",
        },
        0.12,
      );
    }

    exit.fromTo(
      root,
      { clipPath: "inset(0% 0% 0% 0%)" },
      {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: reduce ? 0.38 : 0.72,
        ease: reduce ? "power2.inOut" : "power3.inOut",
        overwrite: "auto",
      },
      reduce ? 0.12 : 0.22,
    );
  }, [isFadingOut]);

  const onHoverIn = useCallback(() => {
    if (prefersReducedMotion()) return;
    pulseRef.current?.kill();
    if (labelRef.current) {
      gsap.to(labelRef.current, {
        letterSpacing: "0.42em",
        opacity: 1,
        duration: 0.38,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        width: 10,
        height: 10,
        duration: 0.38,
        ease: "back.out(1.8)",
        overwrite: "auto",
      });
    }
    breathRef.current?.pause();
    if (circleRef.current) {
      gsap.to(circleRef.current, {
        scale: 1.06,
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }, []);

  const onHoverOut = useCallback(() => {
    if (prefersReducedMotion()) return;
    if (labelRef.current) {
      gsap.to(labelRef.current, {
        letterSpacing: "0.3em",
        duration: 0.38,
        ease: "power3.out",
        overwrite: "auto",
      });
      pulseRef.current = gsap.to(labelRef.current, {
        opacity: 0.38,
        duration: 1.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        width: 7,
        height: 7,
        duration: 0.38,
        ease: "power3.out",
        overwrite: "auto",
      });
    }
    if (circleRef.current && !isFadingOut) {
      gsap.to(circleRef.current, {
        scale: 1,
        duration: 0.65,
        ease: "power2.inOut",
        overwrite: "auto",
        onComplete: () => {
          breathRef.current?.resume?.();
        },
      });
    }
  }, [isFadingOut]);

  return (
    <div
      ref={rootRef}
      onClick={fontReady ? onEnter : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        cursor: fontReady ? "pointer" : "default",
        backgroundColor: "#fdfcfa",
        willChange: "clip-path",
      }}
    >
      {!fontReady ? null : (
        <>
          <div
            ref={fieldRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              opacity: 0,
              background:
                "radial-gradient(ellipse 85% 70% at 50% 42%, #faf8f4 0%, #f3efe8 52%, #ebe6df 100%)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 35%, rgba(26,26,26,0.045) 100%)",
            }}
          />

          <div
            ref={haloRef}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(196,149,106,0.22) 0%, rgba(240,237,232,0.65) 42%, rgba(240,237,232,0) 70%)",
              zIndex: 2,
              filter: "blur(1px)",
              willChange: "width, height, opacity, transform",
            }}
          />

          <div
            ref={circleRef}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 0,
              height: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 32%, #faf6f0 0%, #ebe4db 45%, #e2d9cf 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.65), 0 28px 80px rgba(196,149,106,0.12), 0 8px 32px rgba(26,26,26,0.06)",
              zIndex: 3,
              willChange: "width, height, transform, opacity",
            }}
          />

          <div
            ref={contentRef}
            style={{
              position: "relative",
              zIndex: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              width: "100%",
              perspective: "960px",
            }}
          >
            <h1
              ref={titleRef}
              style={{
                display: "flex",
                margin: 0,
                lineHeight: 1,
                userSelect: "none",
                transformStyle: "preserve-3d",
              }}
              className="font-inter font-thin text-[clamp(3rem,8vw,7rem)] text-[#1a1a1a]"
              aria-label="Hael.r"
            >
              {CHARS.map((char, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    overflow: "hidden",
                    verticalAlign: "bottom",
                    lineHeight: 1,
                  }}
                >
                  <span
                    ref={(el) => {
                      charRefs.current[i] = el;
                    }}
                    style={{ display: "inline-block", willChange: "transform, opacity" }}
                  >
                    {char}
                  </span>
                </span>
              ))}
            </h1>

            <div
              ref={ruleRef}
              style={{
                marginTop: "clamp(12px, 2.5vw, 22px)",
                height: 1,
                width: "clamp(160px, 32vw, 420px)",
                background: "linear-gradient(90deg, transparent, #1a1a1a 20%, #1a1a1a 80%, transparent)",
                opacity: 0,
                transformOrigin: "50% 50%",
              }}
              aria-hidden
            />

            <div
              ref={labelWrapRef}
              onMouseEnter={onHoverIn}
              onMouseLeave={onHoverOut}
              onClick={(e) => {
                e.stopPropagation();
                if (fontReady) onEnter();
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                marginTop: "clamp(28px, 5vh, 40px)",
                cursor: "pointer",
              }}
            >
              <div
                ref={dotRef}
                style={{
                  width: 0,
                  height: 0,
                  borderRadius: "50%",
                  backgroundColor: "#1a1a1a",
                  flexShrink: 0,
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
                }}
              />

              <span
                ref={labelRef}
                className="font-inter font-light"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#1a1a1a",
                  userSelect: "none",
                  willChange: "opacity, letter-spacing, transform",
                }}
              >
                enter
              </span>
            </div>
          </div>

          <div
            ref={grainRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              pointerEvents: "none",
              opacity: 0,
              mixBlendMode: "multiply",
              backgroundImage: `url("${GRAIN_URI}")`,
              backgroundRepeat: "repeat",
              backgroundSize: "120px 120px",
              backgroundPosition: "0 0",
            }}
          />
        </>
      )}
    </div>
  );
};

export default Overlay;
