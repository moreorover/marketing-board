import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import z from "zod";
import { db } from "@/db";
import { listing } from "@/db/schema/listing";
import { type ListingPhoto, listingPhoto } from "@/db/schema/listing-photo";
import { phoneView } from "@/db/schema/phone-view";
import {
	deleteImage,
	extractKeyFromUrl,
	generateSignedImageUrl,
	generateSignedImageUrls,
	uploadImage,
} from "@/lib/spaces";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc";

export const listingRouter = router({
	uploadPhotos: protectedProcedure
		.input(
			z.object({
				photos: z.array(
					z.object({
						name: z.string(),
						type: z.string(),
						data: z.string(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existingUnusedPhotos = await db
				.select()
				.from(listingPhoto)
				.where(
					and(
						eq(listingPhoto.userId, ctx.session.user.id),
						isNull(listingPhoto.listingId),
					),
				);

			if (existingUnusedPhotos.length >= 5) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Already 5 photos uploaded.",
					cause: "Up to 5 photos allowed.",
				});
			}

			const savedListingPhotos: ListingPhoto[] = [];

			for (const photo of input.photos) {
				const buffer = Buffer.from(photo.data, "base64");
				const objectKey = await uploadImage(buffer, ctx.session.user.id);

				const savedListingPhoto = await db
					.insert(listingPhoto)
					.values({
						objectKey: objectKey,
						userId: ctx.session.user.id,
					})
					.returning();

				savedListingPhotos.push(savedListingPhoto[0]);
			}

			return savedListingPhotos;
		}),

	listUnusedPhotos: protectedProcedure.query(async ({ ctx }) => {
		const existingUnusedPhotos: ListingPhoto[] = await db
			.select()
			.from(listingPhoto)
			.where(
				and(
					eq(listingPhoto.userId, ctx.session.user.id),
					isNull(listingPhoto.listingId),
				),
			);

		const result = await Promise.all(
			existingUnusedPhotos.map(async (photo) => {
				const signedUrl = await generateSignedImageUrl(photo.objectKey, 3600);
				return {
					...photo,
					signedUrl,
				};
			}),
		);

		return result;
	}),

	deletePhoto: protectedProcedure
		.input(z.object({ listingPhotoId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify the photo belongs to the user
			const photo = await db.query.listingPhoto.findFirst({
				where: and(
					eq(listingPhoto.id, input.listingPhotoId),
					eq(listingPhoto.userId, ctx.session.user.id),
				),
			});

			if (!photo) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Photo not found.",
				});
			}

			// Delete from R2
			await deleteImage(photo.objectKey);

			// Delete from database
			await db
				.delete(listingPhoto)
				.where(eq(listingPhoto.id, input.listingPhotoId));

			return { success: true };
		}),

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
				columns: {
					id: true,
					title: true,
					city: true,
					location: true,
					description: true,
				},
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
				city: z.string().min(1),
				postcode: z.string().min(1, "Postcode is required"),
				photoIds: z.array(z.string()).optional(),
				mainPhotoId: z.string().optional(),
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

			// Update selected photos to be associated with this listing
			if (input.photoIds && input.photoIds.length > 0) {
				// Update photos to associate with the listing
				for (const photoId of input.photoIds) {
					await db
						.update(listingPhoto)
						.set({ listingId })
						.where(
							and(
								eq(listingPhoto.id, photoId),
								eq(listingPhoto.userId, ctx.session.user.id),
								isNull(listingPhoto.listingId),
							),
						);
				}

				// Set main photo if specified
				if (input.mainPhotoId) {
					await db
						.update(listingPhoto)
						.set({ isMain: true })
						.where(
							and(
								eq(listingPhoto.id, input.mainPhotoId),
								eq(listingPhoto.listingId, listingId),
							),
						);
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
				city: z.string().min(1),
				postcode: z.string().min(1),
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
			const currentImages = await db.query.listingPhoto.findMany({
				where: eq(listingPhoto.listingId, input.id),
			});

			// Convert keepImages URLs to keys if needed
			const keepImageKeys = (input.keepImages || []).map(extractKeyFromUrl);
			const imagesToDelete = currentImages.filter(
				(img) => !keepImageKeys.includes(img.objectKey),
			);

			// Delete images from both S3 and database
			for (const image of imagesToDelete) {
				await deleteImage(image.objectKey);
				await db.delete(listingPhoto).where(eq(listingPhoto.id, image.id));
			}

			// Upload new images if provided
			const newImageKeys: string[] = [];
			if (input.newFiles && input.newFiles.length > 0) {
				for (const file of input.newFiles) {
					const buffer = Buffer.from(file.data, "base64");
					const objectKey = await uploadImage(buffer, ctx.session.user.id);

					// Save to database
					await db.insert(listingPhoto).values({
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
					.update(listingPhoto)
					.set({ isMain: false })
					.where(eq(listingPhoto.listingId, input.id));

				// Set new main image
				if (
					input.mainImageIsNewFile &&
					input.mainImageNewFileIndex !== undefined
				) {
					// New file selected as main image
					const selectedKey = newImageKeys[input.mainImageNewFileIndex];
					if (selectedKey) {
						await db
							.update(listingPhoto)
							.set({ isMain: true })
							.where(eq(listingPhoto.objectKey, selectedKey));
					}
				} else {
					// Existing image selected as main
					await db
						.update(listingPhoto)
						.set({ isMain: true })
						.where(eq(listingPhoto.objectKey, newMainImageKey));
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
