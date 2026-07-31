import { DEFAULT_AVATAR_CHOICES, type ParticipantAvatar } from "@hengames/shared";

const ADJECTIVES = ["brave", "clever", "cozy", "curious", "dapper", "lucky", "peeking", "snappy"];
const ANIMALS = ["badger", "fox", "otter", "penguin", "raven", "turtle", "walrus", "wombat"];

export function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function normalizeDisplayName(displayName?: string): string | undefined {
  const trimmed = displayName?.trim();
  return trimmed ? trimmed : undefined;
}

export function generateDisplayName(id: string): string {
  const hash = hashText(id);
  return `${ADJECTIVES[hash % ADJECTIVES.length]}-${ANIMALS[Math.floor(hash / ADJECTIVES.length) % ANIMALS.length]}`;
}

export function generateAvatar(id: string): ParticipantAvatar {
  const hash = hashText(id);
  return { ...DEFAULT_AVATAR_CHOICES[hash % DEFAULT_AVATAR_CHOICES.length]! };
}

export function normalizeAvatar(avatar: ParticipantAvatar): ParticipantAvatar {
  const emoji = avatar.emoji.trim();
  const color = avatar.color.trim();
  if (!emoji || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Avatar requires an emoji and a hex color.");
  }
  return { emoji, color };
}
