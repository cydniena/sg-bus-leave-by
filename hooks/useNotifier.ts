'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Option, Urgency } from '@/lib/plan';
import { formatTime } from '@/lib/format';

/**
 * Two ETAs a poll apart are usually the same bus drifting, not a new one.
 * Anything inside this window counts as "already warned about".
 */
const SAME_BUS_TOLERANCE_MS = 4 * 60 * 1000;

type Kind = 'soon' | 'now';

export type NotifierState = {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  /** Must be called from a click — browsers require a gesture, and it also
   *  unlocks the audio context for the fallback chime. */
  enable: () => Promise<void>;
  muted: boolean;
  setMuted: (m: boolean) => void;
};

function beep(ctx: AudioContext, times: number) {
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    const start = ctx.currentTime + i * 0.28;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.start(start);
    osc.stop(start + 0.22);
  }
}

export function useNotifier(args: {
  tripId: string | null;
  serviceNo: string;
  target: Option | null;
  urgency: Urgency;
}): NotifierState {
  const { tripId, serviceNo, target, urgency } = args;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'default',
  );
  const [muted, setMuted] = useState(false);
  const supported = typeof window !== 'undefined' && 'Notification' in window;

  const audio = useRef<AudioContext | null>(null);
  /** What we last alerted about, so ETA jitter doesn't re-fire it every poll. */
  const last = useRef<{ kind: Kind; arrivalMs: number } | null>(null);

  useEffect(() => {
    setPermission(supported ? Notification.permission : 'unsupported');
  }, [supported]);

  // A different trip is a clean slate.
  useEffect(() => {
    last.current = null;
  }, [tripId]);

  const enable = useCallback(async () => {
    if (!audio.current) {
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      if (Ctor) audio.current = new Ctor();
    }
    await audio.current?.resume();
    if (supported) setPermission(await Notification.requestPermission());
  }, [supported]);

  useEffect(() => {
    if (muted || !target) return;
    const kind: Kind | null = urgency === 'soon' ? 'soon' : urgency === 'now' ? 'now' : null;
    if (!kind) return;

    const arrivalMs = target.arrival.getTime();
    const prev = last.current;

    // Same alert for what is almost certainly the same bus — stay quiet.
    if (
      prev &&
      prev.kind === kind &&
      Math.abs(arrivalMs - prev.arrivalMs) < SAME_BUS_TOLERANCE_MS
    ) {
      return;
    }

    last.current = { kind, arrivalMs };

    const bus = `${serviceNo} at ${formatTime(target.arrival)}`;
    const title = kind === 'soon' ? 'Leave soon' : 'Leave now';
    const body =
      kind === 'soon'
        ? `Leave by ${formatTime(target.leaveBy)} to catch bus ${bus}.`
        : `Last chance ${formatTime(target.lastChance)} for bus ${bus}.`;

    if (permission === 'granted') {
      try {
        new Notification(title, { body, tag: `busapp-${tripId}`, renotify: true } as NotificationOptions);
      } catch {
        /* some browsers block constructor notifications; the chime still plays */
      }
    }
    if (audio.current) beep(audio.current, kind === 'now' ? 3 : 2);
  }, [urgency, target, permission, muted, serviceNo, tripId]);

  return { supported, permission, enable, muted, setMuted };
}
