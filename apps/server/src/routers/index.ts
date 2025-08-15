import { listingRouter } from "@/routers/listing";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { todoRouter } from "./todo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: `My IP address is ${ctx.ip}`,
			user: ctx.session.user,
		};
	}),
	todo: todoRouter,
	listing: listingRouter,
});
export type AppRouter = typeof appRouter;
