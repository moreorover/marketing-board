import { and, eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { listing } from "../db/schema/listing";
import { protectedProcedure, router } from "../lib/trpc";

export const listingRouter = router({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		return db
			.select()
			.from(listing)
			.where(eq(listing.userId, ctx.session.user.id));
	}),

	getById: protectedProcedure
		.input(z.object({ listingId: z.string() }))
		.query(async ({ ctx, input }) => {
			return db
				.select()
				.from(listing)
				.where(
					and(
						eq(listing.userId, ctx.session.user.id),
						eq(listing.id, input.listingId),
					),
				);
		}),

	create: protectedProcedure
		.input(
			z.object({ title: z.string().min(1), description: z.string().min(1) }),
		)
		.mutation(async ({ input, ctx }) => {
			return db.insert(listing).values({
				title: input.title,
				description: input.description,
				userId: ctx.session.user.id,
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				title: z.string().min(1),
				description: z.string().min(1),
			}),
		)
		.mutation(async ({ input }) => {
			return db.update(listing).set({
				title: input.title,
				description: input.description,
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			return db.delete(listing).where(eq(listing.id, input.id));
		}),
});
