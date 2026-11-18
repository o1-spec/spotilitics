"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Brand } from "./brand";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { NAVIGATION_ARRIVAL_KEY } from "@/lib/navigation-transition";

gsap.registerPlugin(useGSAP);

const phrases = ["Tuning your taste…", "Reading your rhythm…", "Finding your frequency…"];

export function InitialLoader({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [phrase, setPhrase] = useState(phrases[0]);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const finish = () => {
        gsap.set(el, { autoAlpha: 0, pointerEvents: "none" });
        onComplete();
      };
      try {
        if (window.sessionStorage.getItem(NAVIGATION_ARRIVAL_KEY) === "1") {
          window.sessionStorage.removeItem(NAVIGATION_ARRIVAL_KEY);
          finish();
          return;
        }
      } catch {
        // Continue with the standard intro when storage is unavailable.
      }
      if (reduced) {
        const timer = window.setTimeout(finish, 280);
        return () => window.clearTimeout(timer);
      }

      const tl = gsap.timeline({ onComplete: finish });
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.34, ease: "power2.out" })
        .fromTo(".intro-record", { scale: 0.76, rotation: -28, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, 0.08)
        .fromTo(".intro-ring", { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.9, stagger: 0.1, ease: "power2.out" }, 0.14)
        .fromTo(".intro-brand", { y: 12, autoAlpha: 0, filter: "blur(8px)" }, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.62, ease: "power3.out" }, 0.45)
        .fromTo(".intro-caption", { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "power2.out" }, 0.72)
        .fromTo(".intro-progress-fill", { scaleX: 0 }, { scaleX: 1, duration: 1.62, ease: "power1.inOut" }, 0.35)
        .fromTo(".intro-bar", { scaleY: 0.3, autoAlpha: 0.35 }, { scaleY: 1, autoAlpha: 1, duration: 0.35, stagger: { each: 0.025, from: "center" }, repeat: 3, yoyo: true, ease: "sine.inOut" }, 0.45)
        .to(".intro-orbit-pulse", { scale: 1.14, autoAlpha: 0, duration: 1.1, repeat: 1, ease: "power1.out" }, 0.4)
        .call(() => setPhrase(phrases[1]), [], 1.04)
        .to(".intro-caption", { autoAlpha: 0, y: -4, duration: 0.16, ease: "power1.in" }, 1.76)
        .call(() => setPhrase(phrases[2]), [], 1.93)
        .fromTo(".intro-caption", { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 1.93)
        .to(el, { yPercent: -100, duration: 0.64, delay: 0.08, ease: "power4.inOut" }, 2.2);

      return () => tl.kill();
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="initial-loader" role="status" aria-live="polite" aria-label="Spotlytics is preparing your listening experience">
      <div className="intro-grain" aria-hidden="true" />
      <div className="intro-topline" aria-hidden="true">
        <span className="intro-brand"><Brand /></span>
        <span>AN INTRODUCTION TO YOU</span>
      </div>
      <div className="intro-center" aria-hidden="true">
        <div className="intro-object">
          <span className="intro-ring intro-ring-outer" />
          <span className="intro-ring intro-ring-inner" />
          <span className="intro-orbit-pulse" />
          <div className="intro-record">
            <span className="intro-groove" />
            <span className="intro-label"><i>✳</i></span>
          </div>
          <div className="intro-equalizer">
            {Array.from({ length: 19 }, (_, index) => (
              <i className="intro-bar" key={index} />
            ))}
          </div>
        </div>
        <p className="intro-caption">{phrase}</p>
      </div>
      <div className="intro-footer" aria-hidden="true">
        <span>LISTEN CLOSELY</span>
        <div className="intro-progress"><i className="intro-progress-fill" /></div>
        <span>33⅓ RPM <b>·</b> ALWAYS YOU</span>
      </div>
      <span className="sr-only">{phrase}</span>
    </div>
  );
}
