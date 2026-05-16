import { initTRPC } from "@trpc/server";

export type AppContext = {
  participantToken?: string;
};

const t = initTRPC.context<AppContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
