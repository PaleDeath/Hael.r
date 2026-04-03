import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

/* ═══════════════════════════════════════════════════════════════════════════
 *  Overlay — Awwwards SOTD-level entry screen for Hael.r
 *
 *  LAYERS (bottom → top within the overlay):
 *    0  Solid white background
 *    1  Warm organic circle (div with border-radius: 50%, NOT SVG)
 *    2  Content — split-char title, sharp dot, "enter" label
 *    3  Film grain texture
 *
 *  ENTRY: chars slide up, warm circle blooms, dot pops, label fades in
 *  EXIT:  label/dot + chars + circle/grain, then root clipPath wipes up (reveals site)
 *
 *  App.tsx lifecycle:
 *    handleEnter() → setIsFadingOut(true) → setTimeout(setIsOverlayVisible(false), 1000)
 *    So exit must complete within ~950ms.
 * ═══════════════════════════════════════════════════════════════════════════ */

interface OverlayProps {
  onEnter: () => void;
  isFadingOut: boolean;
}

const CHARS = ["H", "a", "e", "l", ".", "r"];

// 4×4 noise PNG data URI — no network request needed
const GRAIN_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAJklEQVQIW2P4/5/hPwMDA8P///8ZGBkZGRhANJigoAADAwsLMwMAL2EF/jXEp14AAAAASUVORK5CYII=";

const Overlay: React.FC<OverlayProps> = ({ onEnter, isFadingOut }) => {
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  /* ── element refs ───────────────────────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const labelWrapRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);

  /* ── animation refs ─────────────────────────────────────────────────── */
  const entryTlRef = useRef<gsap.core.Timeline | null>(null);
  const breathRef = useRef<gsap.core.Tween | null>(null);
  const pulseRef = useRef<gsap.core.Tween | null>(null);
  const exitRanRef = useRef(false);

  /* ── font-ready gate (prevents bold fallback flash on hard refresh) ── */
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setFontReady(true));
    } else {
      const t = setTimeout(() => setFontReady(true), 200);
      return () => clearTimeout(t);
    }
  }, []);

  /* ══════════════════════════════════════════════════════════════════════
   *  ENTRY ANIMATION
   * ══════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!fontReady || isFadingOut) return;

    const ctx = gsap.context(() => {
      const root = rootRef.current;
      const circle = circleRef.current;
      if (!root) return;

      gsap.set(root, { clipPath: "inset(0% 0% 0% 0%)" });
      // Reveal overlay (was opacity:0 to prevent font flash)
      gsap.to(root, { opacity: 1, duration: 0.35, ease: "power2.out" });

      /* ── Warm circle bloom — xPercent/yPercent keeps center when GSAP scales ── */
      if (circle) {
        const vMax = Math.max(window.innerWidth, window.innerHeight);
        const size = vMax * 0.55;
        gsap.set(circle, {
          width: 0,
          height: 0,
          opacity: 0,
          xPercent: -50,
          yPercent: -50,
          transformOrigin: "50% 50%",
        });
        gsap.to(circle, {
          width: size,
          height: size,
          opacity: 1,
          duration: 2.2,
          ease: "power3.out",
          delay: 0.15,
          onComplete() {
            breathRef.current = gsap.to(circle, {
              scale: 1.035,
              duration: 3.5,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1,
            });
          },
        });
      }

      /* ── Title characters slide up ── */
      const chars = charRefs.current.filter(Boolean) as HTMLSpanElement[];
      gsap.set(chars, { y: "110%" });

      const tl = gsap.timeline();
      entryTlRef.current = tl;

      tl.to(chars, {
        y: "0%",
        duration: 1.4,
        ease: "expo.out",
        stagger: 0.1,
      });

      /* ── Dot (width/height, NOT scale — stays pixel-crisp at 7px) ── */
      if (dotRef.current) {
        gsap.set(dotRef.current, { width: 0, height: 0, opacity: 1 });
        tl.to(
          dotRef.current,
          { width: 7, height: 7, duration: 0.45, ease: "back.out(2)" },
          "+=0.4"
        );
      }

      /* ── "enter" label ── */
      if (labelRef.current) {
        gsap.set(labelRef.current, { opacity: 0, y: 8 });
        tl.to(
          labelRef.current,
          { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" },
          "-=0.1"
        );
        tl.add(() => {
          pulseRef.current = gsap.to(labelRef.current, {
            opacity: 0.3,
            duration: 1.3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      }
    }, rootRef);

    return () => ctx.revert();
  }, [fontReady, isFadingOut]);

  /* ══════════════════════════════════════════════════════════════════════
   *  EXIT — vertical clipPath wipe on root (~0.9s, under unmount deadline)
   * ══════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isFadingOut || exitRanRef.current) return;
    exitRanRef.current = true;

    pulseRef.current?.kill();
    breathRef.current?.kill();
    entryTlRef.current?.kill();

    const root = rootRef.current;
    const circle = circleRef.current;
    const grain = grainRef.current;
    const label = labelRef.current;
    const dot = dotRef.current;
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
        duration: 0.15,
        ease: "power2.out",
        overwrite: "auto",
      });
    }

    if (chars.length) {
      exit.to(
        chars,
        {
          y: "-110%",
          stagger: 0.03,
          duration: 0.4,
          ease: "power3.inOut",
          overwrite: "auto",
        },
        0.05
      );
    }

    if (circle) {
      gsap.set(circle, { scale: 1 });
      exit.to(
        circle,
        {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
        },
        0.2
      );
    }

    if (grain) {
      exit.to(
        grain,
        {
          opacity: 0,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
        },
        0.2
      );
    }

    exit.fromTo(
      root,
      { clipPath: "inset(0% 0% 0% 0%)" },
      {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 0.55,
        ease: "power4.inOut",
        overwrite: "auto",
      },
      0.35
    );
  }, [isFadingOut]);

  /* ── Hover interaction ──────────────────────────────────────────────── */
  const onHoverIn = useCallback(() => {
    pulseRef.current?.kill();
    if (labelRef.current) {
      gsap.to(labelRef.current, {
        letterSpacing: "0.45em",
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        width: 10,
        height: 10,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }, []);

  const onHoverOut = useCallback(() => {
    if (labelRef.current) {
      gsap.to(labelRef.current, {
        letterSpacing: "0.3em",
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
      pulseRef.current = gsap.to(labelRef.current, {
        opacity: 0.3,
        duration: 1.3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        width: 7,
        height: 7,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }, []);

  /* ══════════════════════════════════════════════════════════════════════
   *  RENDER
   * ══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={rootRef}
      onClick={onEnter}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        cursor: "pointer",
        opacity: 0, // invisible until font ready → GSAP fades in
        willChange: "opacity, clip-path",
      }}
    >
      {/* Layer 0 — White bg */}
      <div
        ref={bgRef}
        style={{ position: "absolute", inset: 0, backgroundColor: "#FFFFFF", zIndex: 0 }}
      />

      {/* Layer 1 — Warm organic circle */}
      <div
        ref={circleRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 0,
          height: 0,
          borderRadius: "50%",
          backgroundColor: "#f0ede8",
          zIndex: 1,
          willChange: "width, height, transform",
        }}
      />

      {/* Layer 2 — Content */}
      <div
        ref={contentRef}
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
        }}
      >
        {/* ── Title ── */}
        <h1
          style={{ display: "flex", margin: 0, lineHeight: 1, userSelect: "none" }}
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
                style={{ display: "inline-block", willChange: "transform" }}
              >
                {char}
              </span>
            </span>
          ))}
        </h1>

        {/* ── Dot + "enter" label ── */}
        <div
          ref={labelWrapRef}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            marginTop: 28,
            cursor: "pointer",
          }}
        >
          {/* Dot — width/height anim keeps it pixel-sharp, no subpixel blur */}
          <div
            ref={dotRef}
            style={{
              width: 0,
              height: 0,
              borderRadius: "50%",
              backgroundColor: "#1a1a1a",
              flexShrink: 0,
            }}
          />

          {/* Label */}
          <span
            ref={labelRef}
            className="font-inter font-light"
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#1a1a1a",
              userSelect: "none",
              willChange: "opacity, letter-spacing",
            }}
          >
            enter
          </span>
        </div>
      </div>

      {/* Layer 3 — Film grain */}
      <div
        ref={grainRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          opacity: 0.04,
          mixBlendMode: "multiply",
          backgroundImage: `url("${GRAIN_URI}")`,
          backgroundRepeat: "repeat",
        }}
      />

    </div>
  );
};

export default Overlay;
