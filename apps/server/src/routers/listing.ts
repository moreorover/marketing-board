import { eq } from "drizzle-orm";
import z from "zod";
import { phoneView } from "@/db/schema/phone-view";
import { db } from "../db";
import { listing } from "../db/schema/listing";
import {
	changeMainImage,
	compressAndUploadImage,
	deleteImage,
	extractKeyFromUrl,
	generateSignedImageUrls,
	getListingImages,
} from "../lib/spaces";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

export const listingRouter = router({
	getPublic: publicProcedure.query(async () => {
		const listings = await db.select().from(listing);

		// Get images for each listing from S3 with signed URLs
		const listingsWithImages = await Promise.all(
			listings.map(async (listingItem) => {
				const imageKeys = await getListingImages(listingItem.id);
				const signedUrls = await generateSignedImageUrls(imageKeys, 3600); // 1 hour expiry
				return {
					...listingItem,
					images: imageKeys.map((key) => ({ url: signedUrls[key] || '' })),
				};
			}),
		);

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
		.query(async ({ input }) => {
			const listingResult = await db
				.select()
				.from(listing)
				.where(eq(listing.id, input.listingId))
				.limit(1);

			if (listingResult.length === 0) {
				return [];
			}

			const listingItem = listingResult[0];
			const imageKeys = await getListingImages(listingItem.id);
			const signedUrls = await generateSignedImageUrls(imageKeys, 3600); // 1 hour expiry

			return [
				{
					...listingItem,
					images: imageKeys.map((key) => ({ url: signedUrls[key] || '' })),
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
						}),
					)
					.optional(),
				mainImageIndex: z.number().int().min(0).optional(),
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

			// Upload and compress images using the listing ID for folder structure
			if (input.files && input.files.length > 0) {
				const mainImageIndex = input.mainImageIndex ?? 0; // Default to first image if not specified

				const uploadPromises = input.files.map(async (file, index) => {
					const buffer = Buffer.from(file.data, "base64");
					const isMainImage = index === mainImageIndex;
					return compressAndUploadImage(
						buffer,
						file.name,
						listingId,
						isMainImage,
					);
				});

				await Promise.all(uploadPromises);
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

			// Get current images to determine what needs to be deleted
			const currentImages = await getListingImages(input.id);

			// Convert keepImages URLs to keys if needed
			const keepImageKeys = (input.keepImages || []).map(extractKeyFromUrl);
			const imagesToDelete = currentImages.filter(
				(key) => !keepImageKeys.includes(key),
			);

			// Delete images that are no longer wanted
			if (imagesToDelete.length > 0) {
				for (const imageKey of imagesToDelete) {
					await deleteImage(imageKey);
				}
			}

			// Upload new images if provided
			let newImageUrls: string[] = [];
			if (input.newFiles && input.newFiles.length > 0) {
				const uploadPromises = input.newFiles.map(async (file) => {
					const buffer = Buffer.from(file.data, "base64");
					return compressAndUploadImage(buffer, file.name, input.id, false);
				});

				newImageUrls = await Promise.all(uploadPromises);
			}

			// Get remaining images after deletions and new uploads
			const totalRemainingImages = keepImageKeys.length + newImageUrls.length;

			// Update main image if specified and there will be images remaining
			if (
				input.newMainImageUrl &&
				totalRemainingImages > 0
			) {
				const newMainImageKey = extractKeyFromUrl(input.newMainImageUrl);
				if (
					input.mainImageIsNewFile &&
					input.mainImageNewFileIndex !== undefined &&
					newImageUrls.length > input.mainImageNewFileIndex
				) {
					// New file selected as main image
					await changeMainImage(
						input.id,
						newImageUrls[input.mainImageNewFileIndex],
					);
				} else if (!input.mainImageIsNewFile && !imagesToDelete.includes(newMainImageKey)) {
					// Existing image key
					await changeMainImage(input.id, newMainImageKey);
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
