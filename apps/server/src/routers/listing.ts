import {TRPCError} from "@trpc/server";
import {and, asc, desc, eq, isNull} from "drizzle-orm";
import z from "zod";
import {db} from "@/db";
import {listing} from "@/db/schema/listing";
import {listingPhoto} from "@/db/schema/listing-photo";
import {phoneView} from "@/db/schema/phone-view";
import {generateSignedImageUrl, generateSignedImageUrls} from "@/lib/spaces";
import {protectedProcedure, publicProcedure, router} from "@/lib/trpc";

export const listingRouter = router({
	getPublic: publicProcedure.query(async () => {
		const listingsWithMainImage = await db.query.listing.findMany({
			columns: {
				id: true,
				title: true,
				location: true,
				city: true,
			},
			with: {
				images: {
					where: eq(listingPhoto.isMain, true),
					columns: {
						objectKey: true,
					},
					limit: 1,
				},
			},
		});

		// Generate signed URLs for main images
		const listingsWithSignedUrl = await Promise.all(
			listingsWithMainImage.map(async (listingItem) => {
				let mainImageUrl: string | null = null;
				if (listingItem.images[0]?.objectKey) {
					mainImageUrl = await generateSignedImageUrl(
						listingItem.images[0].objectKey,
						3600,
					);
				}
				return {
					id: listingItem.id,
					title: listingItem.title,
					location: listingItem.location,
					city: listingItem.city,
					image: mainImageUrl,
				};
			}),
		);

		return listingsWithSignedUrl;
	}),

	getMyListings: protectedProcedure.query(async ({ ctx }) => {
		const listingsWithMainImage = await db.query.listing.findMany({
			columns: {
				id: true,
				title: true,
				location: true,
				city: true,
			},
			where: eq(listing.userId, ctx.session.user.id),
			with: {
				images: {
					where: eq(listingPhoto.isMain, true),
					columns: {
						objectKey: true,
					},
					limit: 1,
				},
			},
		});

		// Generate signed URLs for main images
		const listingsWithSignedUrl = await Promise.all(
			listingsWithMainImage.map(async (listingItem) => {
				let mainImageUrl: string | null = null;
				if (listingItem.images[0]?.objectKey) {
					mainImageUrl = await generateSignedImageUrl(
						listingItem.images[0].objectKey,
						3600,
					);
				}
				return {
					id: listingItem.id,
					title: listingItem.title,
					location: listingItem.location,
					city: listingItem.city,
					image: mainImageUrl,
				};
			}),
		);

		return listingsWithSignedUrl;
	}),

	getEditById: protectedProcedure
		.input(z.object({ listingId: z.string() }))
		.query(async ({ input, ctx }) => {
			const listingResult = await db.query.listing.findFirst({
				where: and(
					eq(listing.id, input.listingId),
					eq(listing.userId, ctx.session.user.id),
				),
				with: {
					images: {
						orderBy: [desc(listingPhoto.isMain), asc(listingPhoto.uploadedAt)],
					},
				},
			});

			if (!listingResult) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Listing not found.",
					cause: "Incorrect ID.",
				});
			}

			const imageKeys = listingResult.images.map((i) => ({
				imageKey: i.objectKey,
				isMain: i.isMain,
			}));
			const signedUrls = await generateSignedImageUrls(imageKeys, 3600); // 1 hour expiry

			return {
				...listingResult,
				images: signedUrls.map((image) => ({
					url: image.url,
					isMain: image.isMain,
				})),
			};
		}),

	getById: publicProcedure
		.input(z.object({ listingId: z.string() }))
		.query(async ({ input }) => {
			const listingResult = await db.query.listing.findFirst({
				columns: {
					id: true,
					title: true,
					city: true,
					location: true,
					description: true,
				},
				where: eq(listing.id, input.listingId),
				with: {
					images: {
						orderBy: [desc(listingPhoto.isMain), asc(listingPhoto.uploadedAt)],
					},
				},
			});

			if (!listingResult) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Listing not found.",
					cause: "Incorrect ID.",
				});
			}

			const imageKeys = listingResult.images.map((i) => ({
				imageKey: i.objectKey,
				isMain: i.isMain,
			}));
			const signedUrls = await generateSignedImageUrls(imageKeys, 3600); // 1 hour expiry

			return [
				{
					...listingResult,
					images: signedUrls.map((image) => ({
						url: image.url,
						isMain: image.isMain,
					})),
				},
			];
		}),

	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1),
				description: z.string().min(1),
				location: z.string().min(1),
				phone: z.string().min(13).max(13).startsWith("+44"),
				city: z.string().min(1),
				postcode: z.string().min(1, "Postcode is required"),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			// First create the listing to get the ID
			const createdListing = await db
				.insert(listing)
				.values({
					title: input.title,
					description: input.description,
					location: input.location,
					postcode: input.postcode,
					city: input.city,
					phone: input.phone,
					userId: ctx.session.user.id,
				})
				.returning();

			const listingId = createdListing[0].id;

			await db
				.update(listingPhoto)
				.set({ listingId })
				.where(
					and(
						eq(listingPhoto.userId, ctx.session.user.id),
						isNull(listingPhoto.listingId),
					),
				);

			return createdListing;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				title: z.string().min(1),
				description: z.string().min(1),
				location: z.string().min(1),
				phone: z.string().min(13).max(13).startsWith("+44"),
				city: z.string().min(1),
				postcode: z.string().min(1, "Postcode is required"),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			// Verify user owns the listing
			const listingResult = await db
				.select({ userId: listing.userId })
				.from(listing)
				.where(
					and(
						eq(listing.id, input.id),
						eq(listing.userId, ctx.session.user.id),
					),
				)
				.limit(1);

			if (listingResult.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Listing not found.",
				});
			}

			// Update listing details
			return db
				.update(listing)
				.set({
					title: input.title,
					description: input.description,
					location: input.location,
					phone: input.phone,
					city: input.city,
					postcode: input.postcode,
				})
				.where(eq(listing.id, input.id));
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input }) => {
			return db.delete(listing).where(eq(listing.id, input.id));
		}),

	revealPhone: publicProcedure
		.input(
			z.object({
				listingId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { listingId } = input;

			// Get the listing and its phone number
			const listingResult = await db
				.select({ phone: listing.phone })
				.from(listing)
				.where(eq(listing.id, listingId))
				.limit(1);

			if (listingResult.length === 0) {
				throw new Error("Listing not found");
			}

			const phone = listingResult[0].phone;
			const userId = ctx.session?.user?.id;

			// Record the view
			await db.insert(phoneView).values({
				listingId,
				userId,
				ipAddress: ctx.ip,
			});

			return { phone };
		}),
});
