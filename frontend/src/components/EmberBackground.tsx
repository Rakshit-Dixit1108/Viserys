import { useMemo } from "react";

/**
 * A handful of slow-drifting embers rising through the background.
 * This is the app's one signature visual flourish -- deliberately subtle
 * (low opacity, few particles, slow) so it reads as ambient atmosphere
 * for a dragon-themed assistant rather than decoration.
 */
export default function EmberBackground() {
  const embers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        size: 2 + Math.random() * 3,
        delay: Math.random() * 14,
        duration: 10 + Math.random() * 10,
        hue: Math.random() > 0.5 ? "bg-ember-500" : "bg-scale-500",
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian-950 via-obsidian-900 to-obsidian-900" />
      <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-ember-600/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-arcane-500/10 blur-[100px]" />
      {embers.map((e) => (
        <span
          key={e.id}
          className={`absolute bottom-0 rounded-full ${e.hue} animate-drift`}
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            opacity: 0.35,
          }}
        />
      ))}
    </div>
  );
}
