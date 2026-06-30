import { GameTable } from "../components/GameTable";
import { previewRoomSnapshot } from "./previewData";

export function GamePreview() {
  const room = previewRoomSnapshot();
  return (
    <GameTable
      room={room}
      participantToken="preview-token"
      notifications={[
        { id: 1, seq: 40, message: "wily-fox drew 2", at: new Date().toISOString() },
        { id: 2, seq: 42, message: "lively-lion melded three 6s", at: new Date().toISOString() }
      ]}
      onBack={() => undefined}
    />
  );
}
