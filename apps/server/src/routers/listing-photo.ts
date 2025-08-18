import {TRPCError} from "@trpc/server";
import {and, asc, desc, eq, isNull} from "drizzle-orm";
import z from "zod";
import {db} from "@/db";
import {type ListingPhoto, listingPhoto} from "@/db/schema/listing-photo";
import {deleteImage, generateSignedImageUrl, uploadImage,} from "@/lib/spaces";
import {protectedProcedure, router} from "@/lib/trpc";

export const listingPhotoRouter = router({
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
				listingId: z.string().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const whereCondition = input.listingId
				? eq(listingPhoto.listingId, input.listingId)
				: isNull(listingPhoto.listingId);

			const existingPhotos = await db
				.select()
				.from(listingPhoto)
				.where(
					and(eq(listingPhoto.userId, ctx.session.user.id), whereCondition),
				);

			if (existingPhotos.length >= 5) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Already 5 photos uploaded.",
					cause: "Up to 5 photos allowed.",
				});
			}

			const savedListingPhotos: ListingPhoto[] = [];
			const isFirstPhotoForListing = existingPhotos.length === 0;

			for (const [index, photo] of input.photos.entries()) {
				const buffer = Buffer.from(photo.data, "base64");
				const objectKey = await uploadImage(buffer, ctx.session.user.id);

				const savedListingPhoto = await db
					.insert(listingPhoto)
					.values({
						objectKey: objectKey,
						userId: ctx.session.user.id,
						listingId: input.listingId,
						isMain: isFirstPhotoForListing && index === 0, // Set first photo as main if no existing photos
					})
					.returning();

				savedListingPhotos.push(savedListingPhoto[0]);
			}

			return savedListingPhotos;
		}),

	listPhotos: protectedProcedure
		.input(z.object({ listingId: z.string().nullable() }))
		.query(async ({ ctx, input }) => {
			const whereCondition = input.listingId
				? eq(listingPhoto.listingId, input.listingId)
				: isNull(listingPhoto.listingId);

			const existingPhotos: ListingPhoto[] = await db
				.select()
				.from(listingPhoto)
				.where(
					and(eq(listingPhoto.userId, ctx.session.user.id), whereCondition),
				)
				.orderBy(desc(listingPhoto.isMain), asc(listingPhoto.uploadedAt));

			const result = await Promise.all(
				existingPhotos.map(async (photo) => {
					const signedUrl = await generateSignedImageUrl(photo.objectKey, 3600);
					return {
						id: photo.id,
						isMain: photo.isMain,
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

			if (photo.isMain) {
				const whereCondition = photo.listingId
					? eq(listingPhoto.listingId, photo.listingId)
					: isNull(listingPhoto.listingId);

				const firstPhoto = await db
					.select({ id: listingPhoto.id })
					.from(listingPhoto)
					.where(whereCondition)
					.limit(1);

				if (firstPhoto[0]) {
					await db
						.update(listingPhoto)
						.set({ isMain: true })
						.where(eq(listingPhoto.id, firstPhoto[0].id));
				}
			}

			return { success: true };
		}),
	setMainPhoto: protectedProcedure
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

			const whereCondition = photo.listingId
				? eq(listingPhoto.listingId, photo.listingId)
				: isNull(listingPhoto.listingId);

			await db
				.update(listingPhoto)
				.set({ isMain: false })
				.where(whereCondition);

			await db
				.update(listingPhoto)
				.set({ isMain: true })
				.where(eq(listingPhoto.id, input.listingPhotoId));

			return { success: true };
		}),
});
