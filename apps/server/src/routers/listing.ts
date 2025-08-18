import {TRPCError} from "@trpc/server";
import {and, asc, desc, eq, isNull} from "drizzle-orm";
import z from "zod";
import {db} from "@/db";
import {listing} from "@/db/schema/listing";
import {listingPhoto} from "@/db/schema/listing-photo";
import {listingPricing} from "@/db/schema/listing-pricing";
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
				postcodeOutcode: true,
				inCall: true,
				outCall: true,
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
					postcodeOutcode: listingItem.postcodeOutcode,
					inCall: listingItem.inCall,
					outCall: listingItem.outCall,
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
				postcodeOutcode: true,
				inCall: true,
				outCall: true,
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
					postcodeOutcode: listingItem.postcodeOutcode,
					inCall: listingItem.inCall,
					outCall: listingItem.outCall,
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
					pricing: {
						columns: { duration: true, price: true },
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
					postcodeOutcode: true,
				},
				where: eq(listing.id, input.listingId),
				with: {
					images: {
						orderBy: [desc(listingPhoto.isMain), asc(listingPhoto.uploadedAt)],
					},
					pricing: {
						columns: { duration: true, price: true },
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
				postcodeOutcode: z.string().min(1, "Postcode Outcode is required"),
				postcodeIncode: z.string().min(1, "Postcode Incode is required"),
				inCall: z.boolean(),
				outCall: z.boolean(),
				pricing: z.array(
					z.object({
						duration: z.string(),
						price: z.number().min(0),
					}),
				),
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
					city: input.city,
					phone: input.phone,
					postcodeOutcode: input.postcodeOutcode,
					postcodeIncode: input.postcodeIncode,
					inCall: input.inCall,
					outCall: input.outCall,
					userId: ctx.session.user.id,
				})
				.returning();

			const listingId = createdListing[0].id;

			// Create pricing entries for non-zero prices
			const pricingEntries = input.pricing.map(({ duration, price }) => ({
				listingId,
				duration,
				price,
			}));

			if (pricingEntries.length > 0) {
				await db.insert(listingPricing).values(pricingEntries);
			}

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
				postcodeOutcode: z.string().min(1, "Postcode Outcode is required"),
				postcodeIncode: z.string().min(1, "Postcode Incode is required"),
				inCall: z.boolean(),
				outCall: z.boolean(),
				pricing: z.array(
					z.object({
						duration: z.string(),
						price: z.number().min(0),
					}),
				),
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
			await db
				.update(listing)
				.set({
					title: input.title,
					description: input.description,
					location: input.location,
					phone: input.phone,
					city: input.city,
					postcodeOutcode: input.postcodeOutcode,
					postcodeIncode: input.postcodeIncode,
					inCall: input.inCall,
					outCall: input.outCall,
				})
				.where(eq(listing.id, input.id));

			// Delete existing pricing
			await db
				.delete(listingPricing)
				.where(eq(listingPricing.listingId, input.id));

			// Create new pricing entries for non-zero prices
			const pricingEntries = input.pricing.map(({ duration, price }) => ({
				listingId: input.id,
				duration,
				price,
			}));

			if (pricingEntries.length > 0) {
				await db.insert(listingPricing).values(pricingEntries);
			}

			return { success: true };
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
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Listing not found",
				});
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
