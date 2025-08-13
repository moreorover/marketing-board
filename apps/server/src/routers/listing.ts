import { eq } from "drizzle-orm";
import z from "zod";
import { phoneView } from "@/db/schema/phone-view";
import { db } from "../db";
import { listing } from "../db/schema/listing";
import { compressAndUploadImage, getListingImages, changeMainImage, deleteImage } from "../lib/spaces";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";

export const listingRouter = router({
	getPublic: publicProcedure.query(async () => {
		const listings = await db.select().from(listing);

		// Get images for each listing from S3
		const listingsWithImages = await Promise.all(
			listings.map(async (listingItem) => {
				const images = await getListingImages(listingItem.id);
				return {
					...listingItem,
					images: images.map((url) => ({ url })), // Convert to expected format
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
			const images = await getListingImages(listingItem.id);

			return [
				{
					...listingItem,
					images: images.map((url) => ({ url })),
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
					return compressAndUploadImage(buffer, file.name, listingId, isMainImage);
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
				imagesToDelete: z.array(z.string().url()).optional(),
				newMainImageUrl: z.string().url().optional(),
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

			// Get current images to validate operations
			const currentImages = await getListingImages(input.id);
			
			// Process image deletions
			if (input.imagesToDelete && input.imagesToDelete.length > 0) {
				// Ensure we're not deleting all images
				const remainingImages = currentImages.filter(
					(imageUrl) => !input.imagesToDelete!.includes(imageUrl)
				);
				
				if (remainingImages.length === 0) {
					throw new Error("Cannot delete all images from a listing");
				}

				// Delete images from S3
				for (const imageUrl of input.imagesToDelete) {
					await deleteImage(imageUrl);
				}
			}

			// Update main image if specified and it's not being deleted
			if (input.newMainImageUrl && (!input.imagesToDelete || !input.imagesToDelete.includes(input.newMainImageUrl))) {
				await changeMainImage(input.id, input.newMainImageUrl);
			}

			// Update listing details
			return db.update(listing)
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

	updateMainImage: protectedProcedure
		.input(
			z.object({
				listingId: z.string(),
				newMainImageUrl: z.string().url(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			// Verify user owns the listing
			const listingResult = await db
				.select({ userId: listing.userId })
				.from(listing)
				.where(eq(listing.id, input.listingId))
				.limit(1);

			if (listingResult.length === 0) {
				throw new Error("Listing not found");
			}

			if (listingResult[0].userId !== ctx.session.user.id) {
				throw new Error("Unauthorized: You can only edit your own listings");
			}

			// Change the main image in S3
			await changeMainImage(input.listingId, input.newMainImageUrl);

			return { success: true };
		}),

	deleteImage: protectedProcedure
		.input(
			z.object({
				listingId: z.string(),
				imageUrl: z.string().url(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			// Verify user owns the listing
			const listingResult = await db
				.select({ userId: listing.userId })
				.from(listing)
				.where(eq(listing.id, input.listingId))
				.limit(1);

			if (listingResult.length === 0) {
				throw new Error("Listing not found");
			}

			if (listingResult[0].userId !== ctx.session.user.id) {
				throw new Error("Unauthorized: You can only edit your own listings");
			}

			// Get current images to check if this is the only image
			const currentImages = await getListingImages(input.listingId);
			
			if (currentImages.length <= 1) {
				throw new Error("Cannot delete the last image from a listing");
			}

			// Delete the image from S3
			await deleteImage(input.imageUrl);

			return { success: true };
		}),
});
