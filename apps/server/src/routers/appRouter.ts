import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { createRoomStore } from "../rooms/roomStore";

export type WsHub = {
  broadcastRoom: (code: string, roomStore: ReturnType<typeof createRoomStore>) => void;
};

const seatIdSchema = z.enum(["north", "east", "south", "west"]);

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("draw") }),
  z.object({
    type: z.literal("meld"),
    cardIds: z.array(z.string()).min(1),
    targetMeldId: z.string().optional()
  }),
  z.object({
    type: z.literal("discard"),
    cardId: z.string()
  })
]);

export function createAppRouter(input: {
  roomStore: ReturnType<typeof createRoomStore>;
  wsHub: WsHub;
}) {
  const { roomStore, wsHub } = input;

  return router({
    listRooms: publicProcedure.query(() => {
      return roomStore.listRooms();
    }),

    createRoom: publicProcedure
      .input(
        z.object({
          displayName: z.string().optional()
        })
      )
      .mutation(({ input }) => {
        return roomStore.createRoom(input);
      }),

    joinRoom: publicProcedure
      .input(
        z.object({
          code: z.string(),
          displayName: z.string().optional()
        })
      )
      .mutation(({ input }) => {
        return roomStore.joinRoom(input);
      }),

    getRoom: publicProcedure
      .input(
        z.object({
          code: z.string(),
          participantToken: z.string().optional()
        })
      )
      .query(({ input, ctx }) => {
        const token = input.participantToken ?? ctx.participantToken;
        return roomStore.getSnapshot({ code: input.code, token });
      }),

    chooseSeat: publicProcedure
      .input(
        z.object({
          code: z.string(),
          seatId: seatIdSchema
        })
      )
      .mutation(({ input, ctx }) => {
        const snapshot = roomStore.chooseSeat({
          code: input.code,
          token: ctx.participantToken!,
          seatId: input.seatId
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    setReady: publicProcedure
      .input(
        z.object({
          code: z.string(),
          ready: z.boolean()
        })
      )
      .mutation(({ input, ctx }) => {
        const snapshot = roomStore.setReady({
          code: input.code,
          token: ctx.participantToken!,
          ready: input.ready
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    startGame: publicProcedure
      .input(
        z.object({
          code: z.string()
        })
      )
      .mutation(({ input, ctx }) => {
        const snapshot = roomStore.startGame({
          code: input.code,
          token: ctx.participantToken!
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      }),

    gameAction: publicProcedure
      .input(
        z.object({
          code: z.string(),
          action: actionSchema
        })
      )
      .mutation(({ input, ctx }) => {
        const snapshot = roomStore.applyGameAction({
          code: input.code,
          token: ctx.participantToken!,
          action: input.action
        });
        wsHub.broadcastRoom(input.code, roomStore);
        return snapshot;
      })
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
