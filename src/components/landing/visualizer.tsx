"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AudioLines, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface SoundGraph {
  context: AudioContext;
  analyser: AnalyserNode;
  dispose: () => void;
}

/** An original, quiet synthesized chord. No recordings, Spotify streams, or downloads. */
function createSound(): SoundGraph {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;
  const master = context.createGain();
  master.gain.setValueAtTime(0, context.currentTime);
  master.gain.linearRampToValueAtTime(0.035, context.currentTime + 1.5);
  master.connect(analyser);
  analyser.connect(context.destination);
  const oscillators = [130.81, 164.81, 196, 261.62].map((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index % 2 ? 3 : -3;
    oscillator.connect(master);
    oscillator.start();
    return oscillator;
  });
  const lfo = context.createOscillator();
  const depth = context.createGain();
  lfo.frequency.value = 0.22;
  depth.gain.value = 0.012;
  lfo.connect(depth);
  depth.connect(master.gain);
  lfo.start();
  return {
    context,
    analyser,
    dispose: () => {
      [...oscillators, lfo].forEach((oscillator) => {
        oscillator.stop();
        oscillator.disconnect();
      });
      depth.disconnect();
      master.disconnect();
      analyser.disconnect();
      void context.close().catch(() => {});
    },
  };
}

export function Visualizer({ motionPaused }: { motionPaused: boolean }) {
  const section = useRef<HTMLElement>(null);
  const graph = useRef<SoundGraph | null>(null);
  const mounted = useRef(true);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const staticVisual = reduced || motionPaused || paused;

  useEffect(() => {
    mounted.current = true;
    const node = section.current!;
    let intersecting = false;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        update();
      },
      { threshold: 0.08 },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => {
      mounted.current = false;
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      graph.current?.dispose();
      graph.current = null;
    };
  }, []);

  useEffect(() => {
    if (!graph.current) return;
    const context = graph.current.context;
    const operation = visible ? context.resume() : context.suspend();
    void operation.catch(() => {
      if (mounted.current)
        setError("Sound could not resume. Switch it off and enable it again.");
    });
  }, [visible, sound]);

  useEffect(() => {
    if (staticVisual || !visible || !section.current) return;
    const bars = [
      ...section.current.querySelectorAll<HTMLElement>(".frequency i"),
    ];
    const setters = bars.map((bar) => gsap.quickSetter(bar, "scaleY"));
    const samples = new Uint8Array(1024);
    let lastTime = 0;
    const frame = (time: number) => {
      if (time - lastTime < 1 / 30) return;
      lastTime = time;
      const source = graph.current;
      if (source) source.analyser.getByteFrequencyData(samples);
      setters.forEach((set, index) => {
        const ambient =
          0.22 +
          0.64 *
            Math.abs(
              Math.sin(time * 0.85 + index * 0.12) *
                Math.cos(index * 0.08 - time * 0.3),
            );
        // Actual low-frequency spectrum, mirrored around the centre of the sculpture.
        const bin =
          1 +
          Math.floor(
            (Math.abs(index - bars.length / 2) / (bars.length / 2)) * 18,
          );
        set(source ? 0.12 + (samples[bin] / 255) * 0.88 : ambient);
      });
    };
    gsap.ticker.add(frame);
    return () => {
      gsap.ticker.remove(frame);
      bars.forEach((bar) => {
        bar.style.transform = "";
      });
    };
  }, [staticVisual, visible, sound]);

  async function toggleSound() {
    if (pending) return;
    if (graph.current) {
      graph.current.dispose();
      graph.current = null;
      setSound(false);
      setError("");
      return;
    }
    setPending(true);
    setError("");
    try {
      const next = createSound();
      graph.current = next;
      await next.context.resume();
      if (mounted.current) setSound(true);
    } catch {
      graph.current?.dispose();
      graph.current = null;
      if (mounted.current)
        setError(
          "Audio is unavailable in this browser. The ambient visual experience still works.",
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return (
    <section
      ref={section}
      className="visualizer section-pad"
      id="frequency"
      aria-labelledby="frequency-title"
    >
      <div className="visualizer-top">
        <span className="section-kicker">A MOMENT BETWEEN TRACKS</span>
        <span className="visualizer-mode">
          <AudioLines size={16} />{" "}
          {sound && visible ? "Audio reactive" : "Ambient session"}
        </span>
      </div>
      <div className="visualizer-stage">
        <div className="visualizer-copy">
          <h2 id="frequency-title" className="reveal">
            Find your
            <br />
            <em>frequency.</em>
          </h2>
          <p>
            Take a breath. Stay a while.
            <br />
            Some things are better felt.
          </p>
        </div>
        <div className="frequency-sculpture" aria-hidden="true">
          <div className="frequency-ring" />
          <div className="frequency-ring inner" />
          <div className="frequency">
            {Array.from({ length: 49 }, (_, index) => (
              <i
                key={index}
                style={{
                  height: `${Math.round(18 + Math.sin((index / 48) * Math.PI) * 82)}%`,
                }}
              />
            ))}
          </div>
          <span className="frequency-axis">LOW</span>
          <span className="frequency-axis right">HIGH</span>
        </div>
      </div>
      <div className="visualizer-bottom">
        <div className="visualizer-controls">
          <button
            className="sound-control"
            aria-pressed={sound}
            disabled={pending}
            onClick={() => void toggleSound()}
          >
            {sound ? <VolumeX size={17} /> : <Volume2 size={17} />}
            {pending
              ? "Enabling sound…"
              : sound
                ? "Turn sound off"
                : "Enable original sound"}
          </button>
          <button
            className="sound-control secondary"
            disabled={reduced || motionPaused}
            aria-pressed={paused || reduced || motionPaused}
            onClick={() => setPaused((value) => !value)}
          >
            {staticVisual ? <Play size={16} /> : <Pause size={16} />}
            {reduced || motionPaused
              ? "Reduced motion"
              : paused
                ? "Resume visuals"
                : "Pause visuals"}
          </button>
        </div>
        <p>
          Silent by default. Sound is an original synthesized chord.
          <br />
          No recordings, no Spotify playback. Audio pauses offscreen.
        </p>
      </div>
      {error && (
        <p className="visualizer-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
