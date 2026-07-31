import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  createEmptyGameStats,
  type GameId,
  type GameStats,
  type ParticipantAvatar
} from "@hengames/shared";
import { trpc } from "../api/trpc";
import {
  generateSessionProfile,
  loadProfileToken,
  loadSessionProfile,
  saveSessionProfile,
  type SessionProfile
} from "../session";

export type ProfileContextValue = {
  /** Durable token identifying this browser to the server. */
  token: string;
  displayName: string;
  avatar: ParticipantAvatar;
  /** True once the server has confirmed the profile. */
  synced: boolean;
  setDisplayName(displayName: string): void;
  setAvatar(avatar: ParticipantAvatar): void;
  regenerate(): void;
  statsFor(gameId: GameId): GameStats;
  refresh(): void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * App-wide player identity. The profile is mirrored in localStorage so the name
 * and icon survive a server restart, and pushed to the server so solo scores and
 * room participants share one identity.
 */
export function ProfileProvider(props: { children: ReactNode }) {
  const [token] = useState(loadProfileToken);
  const [local, setLocal] = useState<SessionProfile>(loadSessionProfile);
  const [stats, setStats] = useState<Partial<Record<GameId, GameStats>>>({});
  const [synced, setSynced] = useState(false);
  const bootstrapped = useRef(false);

  const ensureProfile = trpc.ensureProfile.useMutation({
    onSuccess(profile) {
      setLocal(saveSessionProfile({ displayName: profile.displayName, avatar: profile.avatar }));
      setStats(profile.stats);
      setSynced(true);
    }
  });
  const updateProfile = trpc.updateProfile.useMutation({
    onSuccess(profile) {
      setStats(profile.stats);
    }
  });

  useEffect(() => {
    if (bootstrapped.current) {
      return;
    }
    bootstrapped.current = true;
    ensureProfile.mutate({
      profileToken: token,
      displayName: local.displayName,
      avatar: local.avatar
    });
  }, [ensureProfile, local.avatar, local.displayName, token]);

  const push = useCallback(
    (next: SessionProfile) => {
      setLocal(saveSessionProfile(next));
      updateProfile.mutate({
        profileToken: token,
        displayName: next.displayName,
        avatar: next.avatar
      });
    },
    [token, updateProfile]
  );

  const setDisplayName = useCallback(
    (displayName: string) => {
      const trimmed = displayName.trim();
      if (!trimmed) {
        return;
      }
      push({ displayName: trimmed, avatar: local.avatar });
    },
    [local.avatar, push]
  );

  const setAvatar = useCallback(
    (avatar: ParticipantAvatar) => {
      push({ displayName: local.displayName, avatar });
    },
    [local.displayName, push]
  );

  const regenerate = useCallback(() => {
    push(generateSessionProfile());
  }, [push]);

  const refresh = useCallback(() => {
    ensureProfile.mutate({ profileToken: token });
  }, [ensureProfile, token]);

  const statsFor = useCallback(
    (gameId: GameId) => stats[gameId] ?? createEmptyGameStats(),
    [stats]
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      token,
      displayName: local.displayName,
      avatar: local.avatar,
      synced,
      setDisplayName,
      setAvatar,
      regenerate,
      statsFor,
      refresh
    }),
    [local.avatar, local.displayName, refresh, regenerate, setAvatar, setDisplayName, statsFor, synced, token]
  );

  return <ProfileContext.Provider value={value}>{props.children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error("useProfile must be used inside a ProfileProvider");
  }
  return value;
}
