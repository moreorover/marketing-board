import { and, eq } from "drizzle-orm";
import z from "zod";
import { image } from "@/db/schema/image";
import { db } from "../db";
import { listing } from "../db/schema/listing";
import { uploadFileToSpaces } from "../lib/spaces";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

export const listingRouter = router({
	getPublic: publicProcedure.query(async () => {
		// If you want ALL images (including deleted ones), use this:
		const rows = await db
			.select()
			.from(listing)
			// .leftJoin(image, eq(listing.id, image.listingId));
			.leftJoin(
				image,
				and(eq(listing.id, image.listingId), eq(image.deleted, false)),
			);

		// If you want ONLY non-deleted images, use this instead:
		// const rows = await db
		//   .select()
		//   .from(listing)
		//   .leftJoin(
		//     image,
		//     and(eq(listing.id, image.listingId), eq(image.deleted, false))
		//   );

		// Group into listings with an images[] array
		const map = new Map<
			string,
			typeof listing.$inferSelect & { images: (typeof image.$inferSelect)[] }
		>();

		for (const row of rows) {
			const l = row.listing;
			const img = row.image; // may be null when no image matches

			if (!map.has(l.id)) {
				map.set(l.id, { ...l, images: [] });
			}
			if (img && img.id) {
				map.get(l.id)!.images.push(img);
			}
		}

		const listingsWithImages = Array.from(map.values());

		return listingsWithImages;
	}),

	getAll: protectedProcedure.query(async ({ ctx }) => {
		return db
			.select()
			.from(listing)
			.where(eq(listing.userId, ctx.session.user.id));
	}),

	getById: publicProcedure
		.input(z.object({ listingId: z.string() }))
		.query(async ({ ctx, input }) => {
			const rows = await db
				.select()
				.from(listing)
				.where(eq(listing.id, input.listingId))
				.leftJoin(
					image,
					and(eq(listing.id, image.listingId), eq(image.deleted, false)),
				);
			const map = new Map<
				string,
				typeof listing.$inferSelect & { images: (typeof image.$inferSelect)[] }
			>();

			for (const row of rows) {
				const l = row.listing;
				const img = row.image; // may be null when no image matches

				if (!map.has(l.id)) {
					map.set(l.id, { ...l, images: [] });
				}
				if (img && img.id) {
					map.get(l.id)!.images.push(img);
				}
			}

			const listingsWithImages = Array.from(map.values());

			return listingsWithImages;
		}),

	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1),
				description: z.string().min(1),
				location: z.string().min(1),
				phone: z.string().min(25).max(25).startsWith("+44"),
				files: z
					.array(
						z.object({
							name: z.string(),
							type: z.string(),
							data: z.string(),
						}),
					)
					.optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			let imageUrls: string[] = [];

			if (input.files && input.files.length > 0) {
				const uploadPromises = input.files.map(async (file) => {
					const buffer = Buffer.from(file.data, "base64");
					return uploadFileToSpaces(buffer, file.name, file.type);
				});

				imageUrls = await Promise.all(uploadPromises);
			}

			const createdListing = await db
				.insert(listing)
				.values({
					title: input.title,
					description: input.description,
					location: input.location,
					phone: input.phone,
					userId: ctx.session.user.id,
				})
				.returning();

			if (imageUrls && imageUrls.length > 0) {
				const images = imageUrls.map((imageUrl) => ({
					url: imageUrl,
					listingId: createdListing[0].id,
					userId: ctx.session.user.id,
				}));

				await db.insert(image).values(images);
			}

			return createdListing;
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
