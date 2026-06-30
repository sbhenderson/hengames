// Tiny Web Audio cue engine. Sounds are synthesized so we ship no audio files
// and stay subtle. Everything is gated by the caller; this class only plays.

export type Cue = "select" | "deal" | "draw" | "discard" | "meld" | "error" | "turn";

type Tone = {
  type: OscillatorType;
  freq: number;
  /** seconds */
  start: number;
  duration: number;
  gain: number;
  /** optional glide target frequency */
  to?: number;
};

const CUES: Record<Cue, Tone[]> = {
  // soft, high tick when a card is picked up
  select: [{ type: "sine", freq: 920, start: 0, duration: 0.06, gain: 0.5, to: 1040 }],
  // airy flick when a card slides off the deck
  deal: [{ type: "triangle", freq: 540, start: 0, duration: 0.09, gain: 0.4, to: 300 }],
  draw: [
    { type: "triangle", freq: 500, start: 0, duration: 0.08, gain: 0.4, to: 320 },
    { type: "triangle", freq: 460, start: 0.07, duration: 0.08, gain: 0.35, to: 280 }
  ],
  // low, rounded tap when a card lands on the discard
  discard: [{ type: "sine", freq: 280, start: 0, duration: 0.12, gain: 0.6, to: 180 }],
  // bright two-note flourish when a meld lands
  meld: [
    { type: "sine", freq: 660, start: 0, duration: 0.12, gain: 0.5 },
    { type: "sine", freq: 990, start: 0.08, duration: 0.18, gain: 0.5 }
  ],
  // gentle "nope" — a falling minor step, never harsh
  error: [
    { type: "sine", freq: 320, start: 0, duration: 0.12, gain: 0.5 },
    { type: "sine", freq: 240, start: 0.1, duration: 0.16, gain: 0.5 }
  ],
  // warm bell to announce your turn
  turn: [
    { type: "sine", freq: 740, start: 0, duration: 0.22, gain: 0.45 },
    { type: "sine", freq: 1108, start: 0.06, duration: 0.3, gain: 0.32 }
  ]
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  /** Must be called from a user gesture so browsers allow audio. */
  resume(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  }

  play(cue: Cue): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) {
      return;
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    for (const tone of CUES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);
      if (tone.to !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(tone.to, now + tone.start + tone.duration);
      }
      // quick attack, smooth exponential release — no clicks
      const peak = tone.gain;
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(peak, now + tone.start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
      osc.connect(gain).connect(this.master);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration + 0.02);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) {
      return this.ctx;
    }
    if (typeof window === "undefined") {
      return null;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    // keep everything quiet and cozy
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }
}
