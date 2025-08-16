import { listingRouter } from "@/routers/listing";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

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
	listing: listingRouter,
});
export type AppRouter = typeof appRouter;
