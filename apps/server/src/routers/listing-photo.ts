import {TRPCError} from "@trpc/server";
import {and, asc, desc, eq, isNull} from "drizzle-orm";
import z from "zod";
import {db} from "@/db";
import {type ListingPhoto, listingPhoto} from "@/db/schema/listing-photo";
import {deleteImage, generateSignedImageUrl, uploadImage} from "@/lib/spaces";
import {protectedProcedure, router} from "@/lib/trpc"; // Image file signature validation

// Image file signature validation
function isValidImageBuffer(buffer: Buffer, mimeType: string): boolean {
	if (buffer.length < 8) return false;

	const header = buffer.toString("hex", 0, 8).toLowerCase();

	switch (mimeType) {
		case "image/jpeg":
		case "image/jpg":
			return header.startsWith("ffd8ff");
		case "image/png":
			return header === "89504e47";
		case "image/gif":
			return header.startsWith("474946");
		case "image/webp":
			return (
				buffer.toString("ascii", 0, 4) === "RIFF" &&
				buffer.toString("ascii", 8, 12) === "WEBP"
			);
		default:
			return false;
	}
}

export const listingPhotoRouter = router({
	uploadPhotos: protectedProcedure
		.input(
			z.object({
				photos: z
					.array(
						z.object({
							name: z.string().max(255, "Filename too long"),
							type: z
								.string()
								.refine(
									(type) =>
										[
											"image/jpeg",
											"image/jpg",
											"image/png",
											"image/webp",
											"image/gif",
										].includes(type),
									{
										message: "Only JPEG, PNG, WebP and GIF images are allowed",
									},
								),
							data: z.string().refine(
								(data) => {
									try {
										const buffer = Buffer.from(data, "base64");
										const sizeInMB = buffer.length / (1024 * 1024);
										return sizeInMB <= 10; // 10MB limit per image
									} catch {
										return false;
									}
								},
								{ message: "Image must be under 10MB and valid base64" },
							),
						}),
					)
					.min(1, "At least one photo is required")
					.max(5, "Maximum 5 photos allowed per upload"),
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

			// Check if total photos would exceed limit
			if (existingPhotos.length + input.photos.length > 5) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Upload would exceed photo limit. You have ${existingPhotos.length} photos, attempting to add ${input.photos.length}. Maximum 5 photos allowed.`,
				});
			}

			const savedListingPhotos: ListingPhoto[] = [];
			const isFirstPhotoForListing = existingPhotos.length === 0;

			for (const [index, photo] of input.photos.entries()) {
				// Additional server-side validation
				const buffer = Buffer.from(photo.data, "base64");

				// Verify file size again on server
				const sizeInMB = buffer.length / (1024 * 1024);
				if (sizeInMB > 10) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Image ${photo.name} exceeds 10MB limit (${sizeInMB.toFixed(2)}MB)`,
					});
				}

				// Basic file signature validation (magic bytes)
				if (!isValidImageBuffer(buffer, photo.type)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Invalid image format for ${photo.name}`,
					});
				}

				const objectKey = await uploadImage(buffer, ctx.session.user.id);

				const savedListingPhoto = await db
					.insert(listingPhoto)
					.values({
						objectKey: objectKey,
						userId: ctx.session.user.id,
						listingId: input.listingId,
						isMain: isFirstPhotoForListing && index === 0,
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
