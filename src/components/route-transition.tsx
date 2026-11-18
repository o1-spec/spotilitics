"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { NAVIGATION_ARRIVAL_KEY } from "@/lib/navigation-transition";

gsap.registerPlugin(useGSAP);

export function RouteTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const sourcePath = useRef("");
  const targetPath = useRef("");
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;
      const anchor = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname.startsWith("/api/") ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search)
      ) return;

      event.preventDefault();
      sourcePath.current = pathname;
      targetPath.current = destination.pathname;
      startedAt.current = performance.now();
      try {
        window.sessionStorage.setItem(NAVIGATION_ARRIVAL_KEY, "1");
      } catch {
        // The transition still works when session storage is unavailable.
      }
      setActive(true);
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  useEffect(() => {
    if (!active) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    const routeChanged = pathname !== sourcePath.current;
    const minimumVisible = reduced ? 100 : 360;
    const elapsed = performance.now() - startedAt.current;
    const delay = routeChanged
      ? Math.max(0, minimumVisible - elapsed)
      : targetPath.current === sourcePath.current
        ? 760
        : 12_000;
    timer.current = window.setTimeout(() => setActive(false), delay);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    };
  }, [active, pathname, reduced]);

  useGSAP(
    () => {
      if (!active || reduced || !root.current) return;
      const record = root.current.querySelector<HTMLElement>(".route-loader-record");
      const bars = root.current.querySelectorAll<HTMLElement>(".route-loader-bars b");
      if (!record) return;
      const entrance = gsap.fromTo(
        record,
        { scale: 0.76 },
        { scale: 1, duration: 0.32, ease: "back.out(1.5)" },
      );
      const spin = gsap.to(record, {
        rotation: 360,
        duration: 2.4,
        delay: 0.32,
        ease: "none",
        repeat: -1,
      });
      const rhythm = gsap.fromTo(
        bars,
        { scaleY: 0.35, opacity: 0.45 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.34,
          stagger: { each: 0.04, from: "center" },
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        },
      );
      return () => {
        entrance.kill();
        spin.kill();
        rhythm.kill();
      };
    },
    { scope: root, dependencies: [active, reduced], revertOnUpdate: true },
  );

  return (
    <>
      {children}
      <div
        ref={root}
        className={`route-transition-loader${active ? " active" : ""}`}
        role="status"
        aria-live="polite"
        aria-hidden={!active}
        aria-label="Changing the listening scene"
      >
        <div className="route-loader-card">
          <div className="route-loader-art" aria-hidden="true">
            <i className="route-loader-ring" />
            <i className="route-loader-record">
              <i className="route-loader-label" />
            </i>
            <i className="route-loader-bars">
              {Array.from({ length: 9 }, (_, index) => <b key={index} />)}
            </i>
          </div>
          <span className="route-loader-wordmark">SPOTLYTICS <i>✳</i></span>
          <span className="route-loader-caption">Finding your frequency</span>
        </div>
      </div>
    </>
  );
}
