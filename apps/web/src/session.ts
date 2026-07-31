import { DEFAULT_AVATAR_CHOICES, type ParticipantAvatar } from "@hengames/shared";

const participantTokenKey = "hengames.participantToken";
const sessionProfileKey = "hengames.sessionProfile";
const profileTokenKey = "hengames.profileToken";

export type SessionProfile = {
  displayName: string;
  avatar: ParticipantAvatar;
};

const adjectives = ["brave", "clever", "cozy", "curious", "dapper", "lucky", "peeking", "snappy"];
const animals = ["badger", "fox", "otter", "penguin", "raven", "turtle", "walrus", "wombat"];

export function saveParticipantToken(token: string) {
  window.localStorage.setItem(participantTokenKey, token);
}

export function loadParticipantToken(): string | undefined {
  return window.localStorage.getItem(participantTokenKey) ?? undefined;
}

export function generateSessionProfile(): SessionProfile {
  const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return {
    displayName: `${adjectives[seed % adjectives.length]}-${animals[Math.floor(seed / adjectives.length) % animals.length]}`,
    avatar: DEFAULT_AVATAR_CHOICES[seed % DEFAULT_AVATAR_CHOICES.length]!
  };
}

export function saveSessionProfile(profile: SessionProfile): SessionProfile {
  window.localStorage.setItem(sessionProfileKey, JSON.stringify(profile));
  return profile;
}

export function loadSessionProfile(): SessionProfile {
  const existing = window.localStorage.getItem(sessionProfileKey);
  if (existing) {
    try {
      return JSON.parse(existing) as SessionProfile;
    } catch {
      window.localStorage.removeItem(sessionProfileKey);
    }
  }

  return saveSessionProfile(generateSessionProfile());
}

function createToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Durable identifier for this browser. The server adopts unrecognised tokens so
 * a player keeps their profile and running high scores across server restarts.
 */
export function loadProfileToken(): string {
  const existing = window.localStorage.getItem(profileTokenKey);
  if (existing) {
    return existing;
  }

  const token = createToken();
  window.localStorage.setItem(profileTokenKey, token);
  return token;
}
