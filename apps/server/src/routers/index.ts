import {
  protectedProcedure, publicProcedure,
  router,
} from "../lib/trpc";
import { todoRouter } from "./todo";

export const appRouter = router({
  healthCheck: publicProcedure.query(({ctx}) => {
    console.log(`Healthcheck triggered by: ${ctx.ip}`)
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    console.log(`User ${ctx.session.user.id} from IP ${ctx.ip}`);
    return {
      message: `My IP address is ${ctx.ip}`,
      user: ctx.session.user,
    };
  }),
  todo: todoRouter,
});
export type AppRouter = typeof appRouter;
