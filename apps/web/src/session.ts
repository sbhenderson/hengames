const participantTokenKey = "hengames.participantToken";

export function saveParticipantToken(token: string) {
  window.localStorage.setItem(participantTokenKey, token);
}

export function loadParticipantToken(): string | undefined {
  return window.localStorage.getItem(participantTokenKey) ?? undefined;
}
