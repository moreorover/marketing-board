import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { phoneView } from "@/db/schema/phone-view";
import { db } from "../db";
import { listing } from "../db/schema/listing";
import { listingImage } from "../db/schema/listing-image";
import {
	deleteImage,
	extractKeyFromUrl,
	generateSignedImageUrl,
	generateSignedImageUrls,
	uploadImage,
} from "../lib/spaces";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

export const listingRouter = router({
	getPublic: publicProcedure.query(async () => {
		const listingsWithMainImage = await db.query.listing.findMany({
			columns: {
				id: true,
				title: true,
				location: true,
			},
			with: {
				images: {
					where: eq(listingImage.isMain, true),
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
			},
			where: eq(listing.userId, ctx.session.user.id),
			with: {
				images: {
					where: eq(listingImage.isMain, true),
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
					images: {},
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
				columns: { id: true, title: true, location: true, description: true },
				where: eq(listing.id, input.listingId),
				with: {
					images: {},
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
				files: z
					.array(
						z.object({
							name: z.string(),
							type: z.string(),
							data: z.string(),
							main: z.boolean().default(false),
						}),
					)
					.optional(),
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
					phone: input.phone,
					userId: ctx.session.user.id,
				})
				.returning();

			const listingId = createdListing[0].id;

			// Upload images and save to database
			if (input.files && input.files.length > 0) {
				for (const file of input.files) {
					const buffer = Buffer.from(file.data, "base64");

					// Upload to S3 and get object key
					const objectKey = await uploadImage(buffer, listingId);

					// Save image metadata to database
					await db.insert(listingImage).values({
						listingId,
						objectKey,
						isMain: file.main,
					});
				}
			}

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
				keepImages: z.array(z.string()).optional(),
				newMainImageUrl: z.string().optional(),
				mainImageIsNewFile: z.boolean().optional(),
				mainImageNewFileIndex: z.number().int().min(0).optional(),
				newFiles: z
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
			// Verify user owns the listing
			const listingResult = await db
				.select({ userId: listing.userId })
				.from(listing)
				.where(eq(listing.id, input.id))
				.limit(1);

			if (listingResult.length === 0) {
				throw new Error("Listing not found");
			}

			if (listingResult[0].userId !== ctx.session.user.id) {
				throw new Error("Unauthorized: You can only edit your own listings");
			}

			// Get current images from database
			const currentImages = await db.query.listingImage.findMany({
				where: eq(listingImage.listingId, input.id),
			});

			// Convert keepImages URLs to keys if needed
			const keepImageKeys = (input.keepImages || []).map(extractKeyFromUrl);
			const imagesToDelete = currentImages.filter(
				(img) => !keepImageKeys.includes(img.objectKey),
			);

			// Delete images from both S3 and database
			for (const image of imagesToDelete) {
				await deleteImage(image.objectKey);
				await db.delete(listingImage).where(eq(listingImage.id, image.id));
			}

			// Upload new images if provided
			const newImageKeys: string[] = [];
			if (input.newFiles && input.newFiles.length > 0) {
				for (const file of input.newFiles) {
					const buffer = Buffer.from(file.data, "base64");
					const objectKey = await uploadImage(buffer, input.id);

					// Save to database
					await db.insert(listingImage).values({
						listingId: input.id,
						objectKey,
						isMain: false,
					});

					newImageKeys.push(objectKey);
				}
			}

			// Update main image if specified
			if (input.newMainImageUrl) {
				const newMainImageKey = extractKeyFromUrl(input.newMainImageUrl);

				// Clear current main image flag
				await db
					.update(listingImage)
					.set({ isMain: false })
					.where(eq(listingImage.listingId, input.id));

				// Set new main image
				if (
					input.mainImageIsNewFile &&
					input.mainImageNewFileIndex !== undefined
				) {
					// New file selected as main image
					const selectedKey = newImageKeys[input.mainImageNewFileIndex];
					if (selectedKey) {
						await db
							.update(listingImage)
							.set({ isMain: true })
							.where(eq(listingImage.objectKey, selectedKey));
					}
				} else {
					// Existing image selected as main
					await db
						.update(listingImage)
						.set({ isMain: true })
						.where(eq(listingImage.objectKey, newMainImageKey));
				}
			}

			// Update listing details
			return db
				.update(listing)
				.set({
					title: input.title,
					description: input.description,
					location: input.location,
					phone: input.phone,
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
