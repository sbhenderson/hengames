import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@hengames/server/src/routers/appRouter";

export const trpc = createTRPCReact<AppRouter>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RoomSnapshot = RouterOutputs["getRoom"];

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/trpc"
      })
    ]
  });
}
