const participantTokenKey = "hengames.participantToken";
const sessionProfileKey = "hengames.sessionProfile";

export type SessionProfile = {
  displayName: string;
  avatar: {
    emoji: string;
    color: string;
  };
};

const adjectives = ["brave", "clever", "cozy", "curious", "dapper", "lucky", "peeking", "snappy"];
const animals = ["badger", "fox", "otter", "penguin", "raven", "turtle", "walrus", "wombat"];
const avatars = [
  { emoji: "🦊", color: "#f97316" },
  { emoji: "🐧", color: "#38bdf8" },
  { emoji: "🦉", color: "#a78bfa" },
  { emoji: "🐢", color: "#22c55e" }
];

export function saveParticipantToken(token: string) {
  window.localStorage.setItem(participantTokenKey, token);
}

export function loadParticipantToken(): string | undefined {
  return window.localStorage.getItem(participantTokenKey) ?? undefined;
}

export function loadSessionProfile(): SessionProfile {
  const existing = window.localStorage.getItem(sessionProfileKey);
  if (existing) {
    return JSON.parse(existing) as SessionProfile;
  }

  const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  const profile = {
    displayName: `${adjectives[seed % adjectives.length]}-${animals[Math.floor(seed / adjectives.length) % animals.length]}`,
    avatar: avatars[seed % avatars.length]!
  };
  window.localStorage.setItem(sessionProfileKey, JSON.stringify(profile));
  return profile;
}
