"use client";

import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function useLandingMotion(
  root: RefObject<HTMLDivElement | null>,
  paused: boolean,
  introReady: boolean,
) {
  const heroIntroPlayed = useRef(false);
  useGSAP(
    () => {
      if (paused || !root.current) return;
      const container = root.current;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const lenis = new Lenis({
          duration: 0.9,
          anchors: true,
          autoRaf: false,
        });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (seconds: number) => lenis.raf(seconds * 1000);
        gsap.ticker.add(tick);

        // Begin the landing reveal only after the branded loader has exited.
        if (introReady && !heroIntroPlayed.current && window.scrollY < 100) {
          gsap.timeline({
            defaults: { ease: "power3.out" },
            onComplete: () => {
              heroIntroPlayed.current = true;
            },
          })
            .from(".hero-word", { yPercent: 108, duration: 0.9, stagger: 0.12 })
            .from(".hero-art", { opacity: 0, scale: 0.92, duration: 1.1 }, 0.12)
            .from(
              ".hero-copy, .hero-bottom",
              { opacity: 0, y: 14, duration: 0.65 },
              0.35,
            );
        }
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
          gsap.from(element, {
            y: 28,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 94%", once: true },
          });
        });

        const record = gsap.to(".record", {
          rotation: "+=360",
          duration: 50,
          ease: "none",
          repeat: -1,
          paused: true,
        });
        const hero = container.querySelector<HTMLElement>(".hero")!;
        let heroVisible = false;
        const syncRecord = () => record.paused(!heroVisible || document.hidden);
        const observer = new IntersectionObserver(([entry]) => {
          heroVisible = entry.isIntersecting;
          syncRecord();
        });
        observer.observe(hero);
        document.addEventListener("visibilitychange", syncRecord);

        const desktop = gsap.matchMedia();
        desktop.add("(min-width: 1000px) and (min-height: 650px)", () => {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: ".journey",
                start: "top top",
                end: () => `+=${Math.round(window.innerHeight * 0.85)}`,
                pin: true,
                scrub: 0.65,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            })
            .to(
              ".journey-art",
              { rotation: -7, scale: 1.1, xPercent: 8, ease: "none" },
              0,
            )
            .to(
              ".journey-orbit",
              { rotation: 35, scale: 1.08, ease: "none" },
              0,
            )
            .to(".journey-wash", { opacity: 0.85, ease: "none" }, 0)
            .fromTo(
              ".journey-progress span",
              { scaleX: 0 },
              { scaleX: 1, ease: "none" },
              0,
            );
        });
        desktop.add("(hover: hover) and (pointer: fine)", () => {
          // Reuse two tween instances instead of allocating one per pointer event.
          const x = gsap.quickTo(".hero-art-drift", "x", {
            duration: 0.7,
            ease: "power2.out",
          });
          const y = gsap.quickTo(".hero-art-drift", "y", {
            duration: 0.7,
            ease: "power2.out",
          });
          const move = (event: PointerEvent) => {
            const rect = hero.getBoundingClientRect();
            x(((event.clientX - rect.left) / rect.width - 0.5) * 16);
            y(((event.clientY - rect.top) / rect.height - 0.5) * 12);
          };
          const reset = () => {
            x(0);
            y(0);
          };
          hero.addEventListener("pointermove", move);
          hero.addEventListener("pointerleave", reset);
          return () => {
            hero.removeEventListener("pointermove", move);
            hero.removeEventListener("pointerleave", reset);
          };
        });
        gsap.from(".chart-bars i", {
          scaleY: 0,
          transformOrigin: "bottom",
          stagger: 0.018,
          ease: "power2.out",
          duration: 0.7,
          scrollTrigger: {
            trigger: ".preview",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
        // Re-measure only when fonts settle, then let ScrollTrigger handle viewport resizing.
        let disposed = false;
        void document.fonts.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh();
        });
        return () => {
          disposed = true;
          observer.disconnect();
          document.removeEventListener("visibilitychange", syncRecord);
          desktop.revert();
          lenis.off("scroll", ScrollTrigger.update);
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [paused, introReady], revertOnUpdate: true },
  );
}
