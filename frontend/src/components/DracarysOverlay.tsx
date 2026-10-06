import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface DracarysOverlayProps {
  active: boolean;
  onComplete: () => void;
}

/**
 * Plays a synthesized dragon roar + fire crackle using the Web Audio API.
 * No audio files required -- built entirely from oscillators and filtered
 * noise, shaped with gain envelopes to read as "roar" rather than a tone.
 */
function playRoar() {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextClass();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  // --- Roar body: a low oscillator sweeping down ---
  const roarOsc = ctx.createOscillator();
  roarOsc.type = "sawtooth";
  roarOsc.frequency.setValueAtTime(160, now);
  roarOsc.frequency.exponentialRampToValueAtTime(55, now + 1.4);

  const roarFilter = ctx.createBiquadFilter();
  roarFilter.type = "lowpass";
  roarFilter.frequency.setValueAtTime(1800, now);
  roarFilter.frequency.exponentialRampToValueAtTime(300, now + 1.6);
  roarFilter.Q.value = 4;

  const roarGain = ctx.createGain();
  roarGain.gain.setValueAtTime(0, now);
  roarGain.gain.linearRampToValueAtTime(0.9, now + 0.15);
  roarGain.gain.linearRampToValueAtTime(0.6, now + 0.8);
  roarGain.gain.linearRampToValueAtTime(0, now + 2.0);

  roarOsc.connect(roarFilter).connect(roarGain).connect(master);
  roarOsc.start(now);
  roarOsc.stop(now + 2.0);

  // --- Growl texture: filtered noise underneath the tone ---
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(400, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(120, now + 1.6);
  noiseFilter.Q.value = 0.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.2);
  noiseGain.gain.linearRampToValueAtTime(0, now + 1.8);

  noise.connect(noiseFilter).connect(noiseGain).connect(master);
  noise.start(now);
  noise.stop(now + 1.8);

  // --- Fire crackle: short high-passed noise bursts, staggered ---
  [0.6, 0.9, 1.3, 1.7].forEach((offset) => {
    const crackle = ctx.createBufferSource();
    crackle.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now + offset);
    g.gain.linearRampToValueAtTime(0.15, now + offset + 0.02);
    g.gain.linearRampToValueAtTime(0, now + offset + 0.15);
    crackle.connect(hp).connect(g).connect(master);
    crackle.start(now + offset);
    crackle.stop(now + offset + 0.2);
  });

  setTimeout(() => ctx.close().catch(() => {}), 2500);
}

export default function DracarysOverlay({ active, onComplete }: DracarysOverlayProps) {
  const played = useRef(false);

  useEffect(() => {
    if (!active) {
      played.current = false;
      return;
    }
    if (!played.current) {
      played.current = true;
      try {
        playRoar();
      } catch {
        // Web Audio can fail without a prior user gesture in some browser
        // contexts -- the visual cinematic still plays either way.
      }
    }
    const timer = setTimeout(onComplete, 5200);
    return () => clearTimeout(timer);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-obsidian-950"
        >
          {/* Screen flash */}
          <motion.div
            className="absolute inset-0 bg-ember-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0, 0.25, 0] }}
            transition={{ duration: 1.2, times: [0, 0.08, 0.2, 0.3, 0.5] }}
          />

          {/* Ambient fire glow */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 65%, rgba(255,77,46,0.45) 0%, rgba(11,14,20,0) 60%)",
            }}
            animate={{ opacity: [0, 1, 0.7, 1, 0] }}
            transition={{ duration: 5, times: [0, 0.2, 0.5, 0.75, 1] }}
          />

          {/* Camera shake wrapper */}
          <motion.div
            animate={{
              x: [0, -12, 10, -8, 6, -4, 0],
              y: [0, 6, -8, 5, -3, 2, 0],
            }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative flex flex-col items-center"
          >
            <DragonSvg />
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.3em" }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 4, times: [0, 0.25, 0.75, 1] }}
              className="mt-6 font-display text-3xl font-bold uppercase tracking-[0.35em] text-ember-500"
              style={{ textShadow: "0 0 30px rgba(255,77,46,0.8)" }}
            >
              Dracarys
            </motion.p>
          </motion.div>

          {/* Rising embers */}
          {Array.from({ length: 24 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-ember-400"
              style={{ left: `${(i * 37) % 100}%` }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: "-90vh", opacity: [0, 0.9, 0] }}
              transition={{ duration: 2.5 + (i % 5) * 0.3, delay: (i % 8) * 0.15, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A stylized, code-drawn dragon silhouette -- wings, neck, head, glowing
 * eyes, and an animated fire-breath cone. Deliberately illustrative rather
 * than photorealistic since it's built from SVG paths, not a 3D asset. */
function DragonSvg() {
  return (
    <motion.svg
      width="420"
      height="280"
      viewBox="0 0 420 280"
      initial={{ x: -300, opacity: 0, scale: 0.85 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#262C37" />
          <stop offset="100%" stopColor="#05070B" />
        </linearGradient>
        <radialGradient id="fireGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD37A" />
          <stop offset="45%" stopColor="#FF7A52" />
          <stop offset="100%" stopColor="#FF4D2E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Wings */}
      <motion.path
        d="M210 140 L60 60 L110 130 L40 120 L120 165 L70 175 L150 190 Z"
        fill="url(#bodyGrad)"
        stroke="#C9A227"
        strokeOpacity="0.4"
        strokeWidth="1"
        animate={{ rotate: [0, -8, 0, -6, 0] }}
        transition={{ duration: 1.6, repeat: 2, ease: "easeInOut" }}
        style={{ transformOrigin: "210px 140px" }}
      />
      <motion.path
        d="M230 140 L380 55 L325 128 L395 112 L310 162 L360 168 L280 188 Z"
        fill="url(#bodyGrad)"
        stroke="#C9A227"
        strokeOpacity="0.4"
        strokeWidth="1"
        animate={{ rotate: [0, 8, 0, 6, 0] }}
        transition={{ duration: 1.6, repeat: 2, ease: "easeInOut" }}
        style={{ transformOrigin: "230px 140px" }}
      />

      {/* Body + neck */}
      <path
        d="M175 250 C160 200 170 170 210 150 C250 170 260 200 245 250 Z"
        fill="url(#bodyGrad)"
      />
      <path d="M205 155 C195 120 195 90 215 60 L235 60 C245 90 235 120 225 155 Z" fill="url(#bodyGrad)" />

      {/* Head */}
      <path
        d="M215 60 C205 40 205 25 220 15 C240 15 255 30 255 50 C255 62 245 68 232 68 C224 68 218 65 215 60 Z"
        fill="url(#bodyGrad)"
        stroke="#C9A227"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      {/* Horns */}
      <path d="M222 20 L216 2 L228 18 Z" fill="#8B92A5" />
      <path d="M238 18 L246 0 L244 20 Z" fill="#8B92A5" />

      {/* Glowing eye */}
      <motion.circle
        cx="234"
        cy="42"
        r="4"
        fill="#FF7A52"
        animate={{ opacity: [0.3, 1, 0.3, 1], r: [3, 5, 3, 5] }}
        transition={{ duration: 1, repeat: 3 }}
        style={{ filter: "drop-shadow(0 0 6px #FF4D2E)" }}
      />

      {/* Fire breath */}
      <motion.ellipse
        cx="300"
        cy="55"
        rx="70"
        ry="22"
        fill="url(#fireGrad)"
        initial={{ opacity: 0, scaleX: 0.3 }}
        animate={{ opacity: [0, 1, 1, 0], scaleX: [0.3, 1, 1.1, 0.6] }}
        transition={{ duration: 1.4, delay: 1.0, times: [0, 0.2, 0.7, 1] }}
        style={{ transformOrigin: "255px 50px" }}
      />
    </motion.svg>
  );
}
