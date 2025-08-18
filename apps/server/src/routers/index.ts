import {protectedProcedure, publicProcedure, router} from "@/lib/trpc";
import {listingRouter} from "@/routers/listing";
import {listingPhotoRouter} from "@/routers/listing-photo";
import {postcodesRouter} from "@/routers/postcodes";

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
	listingPhoto: listingPhotoRouter,
	postcodes: postcodesRouter,
});
export type AppRouter = typeof appRouter;
