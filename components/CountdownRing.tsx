'use client';
import type { Urgency } from '@/lib/plan';

/**
 * A ring that depletes as the deadline approaches.
 *
 * It tracks time until `lastChance` rather than until `leaveBy`, so the sweep
 * stays monotonic — measuring to `leaveBy` would make the ring jump back to
 * full the moment you crossed into the safety buffer.
 */
export function CountdownRing({
  fraction,
  urgency,
  children,
  size = 244,
  stroke = 11,
}: {
  fraction: number;
  urgency: Urgency;
  children: React.ReactNode;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <div className={`ring-wrap ring-${urgency}`} style={{ width: size, height: size }}>
      <svg className="ring" width={size} height={size} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="ring-bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <div className="ring-face">{children}</div>
    </div>
  );
}
