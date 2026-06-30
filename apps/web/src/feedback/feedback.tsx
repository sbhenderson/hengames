import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SoundEngine, type Cue } from "./sound";

const STORAGE_KEY = "hengames:feedback";

const VIBRATION: Partial<Record<Cue, number | number[]>> = {
  select: 6,
  deal: 8,
  draw: 10,
  discard: 14,
  meld: [12, 30, 18],
  error: [20, 50, 20],
  turn: [10, 40, 10]
};

type FeedbackContextValue = {
  enabled: boolean;
  toggle(): void;
  fire(cue: Cue): void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function readStored(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === "on";
}

export function FeedbackProvider(props: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(readStored);
  const engineRef = useRef<SoundEngine | null>(null);

  if (engineRef.current === null) {
    engineRef.current = new SoundEngine();
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (next) {
        // turning on happens inside a click — a valid gesture to unlock audio
        engineRef.current?.resume();
        engineRef.current?.play("select");
      }
      return next;
    });
  }, []);

  const fire = useCallback(
    (cue: Cue) => {
      if (!enabled) {
        return;
      }
      engineRef.current?.play(cue);
      const pattern = VIBRATION[cue];
      if (pattern !== undefined && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
      }
    },
    [enabled]
  );

  const value = useMemo<FeedbackContextValue>(() => ({ enabled, toggle, fire }), [enabled, toggle, fire]);

  return <FeedbackContext.Provider value={value}>{props.children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext);
  if (!value) {
    // A no-op fallback keeps components usable outside the provider (e.g. tests).
    return { enabled: false, toggle: () => {}, fire: () => {} };
  }
  return value;
}
