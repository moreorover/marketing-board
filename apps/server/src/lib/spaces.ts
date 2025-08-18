import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client,} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {randomUUID} from "crypto";
import sharp from "sharp";

const spacesClient = new S3Client({
	region: "auto",
	endpoint: process.env.R2_ENDPOINT,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
	forcePathStyle: true,
});

/**
 * Compresses and uploads an image to S3-compatible storage
 * Returns the object key for database storage
 */
export async function uploadImage(
	imageBuffer: Buffer,
	userId: string,
	quality = 100,
	nearLossless = true,
): Promise<string> {
	const uniqueFileName = `${randomUUID()}.webp`;
	const bucketName = process.env.R2_BUCKET_NAME!;

	// Compress image using Sharp
	const compressedBuffer = await sharp(imageBuffer)
		.resize(1200, 800, {
			fit: "inside",
			withoutEnlargement: true,
		})
		.webp({ quality, nearLossless })
		.toBuffer();

	const objectKey = `photos/user-${userId}/${uniqueFileName}`;

	await spacesClient.send(
		new PutObjectCommand({
			Bucket: bucketName,
			Key: objectKey,
			Body: compressedBuffer,
			ContentType: "image/webp",
		}),
	);

	return objectKey;
}

/**
 * Generates a signed URL for private image access
 */
export async function generateSignedImageUrl(
	imageKey: string,
	expiresIn = 3600,
): Promise<string> {
	const bucketName = process.env.R2_BUCKET_NAME!;

	const command = new GetObjectCommand({
		Bucket: bucketName,
		Key: imageKey,
	});

	return await getSignedUrl(spacesClient, command, { expiresIn });
}

/**
 * Generate signed URLs for multiple images with metadata
 * Skips images that fail to generate signed URLs
 */
export async function generateSignedImageUrls(
	images: { imageKey: string; isMain: boolean }[],
	expiresIn = 3600,
): Promise<{ imageKey: string; isMain: boolean; url: string }[]> {
	const results: { imageKey: string; isMain: boolean; url: string }[] = [];

	await Promise.all(
		images.map(async (image) => {
			try {
				const url = await generateSignedImageUrl(image.imageKey, expiresIn);
				results.push({
					imageKey: image.imageKey,
					isMain: image.isMain,
					url,
				});
			} catch (error) {
				console.error(
					`Failed to generate signed URL for ${image.imageKey}:`,
					error,
				);
				// Skip this image by not pushing to results
			}
		}),
	);

	return results;
}

/**
 * Deletes an image from S3-compatible storage
 */
export async function deleteImage(imageKey: string): Promise<void> {
	const bucketName = process.env.R2_BUCKET_NAME!;

	await spacesClient.send(
		new DeleteObjectCommand({
			Bucket: bucketName,
			Key: imageKey,
		}),
	);
}

/**
 * Extracts S3 object key from a URL (signed URL, CDN URL, or plain key)
 */
export function extractKeyFromUrl(url: string): string {
	// If it's already a key (doesn't start with http), return as is
	if (!url.startsWith("http")) {
		return url;
	}

	try {
		const urlObj = new URL(url);
		// Extract pathname and remove leading slash
		return urlObj.pathname.substring(1);
	} catch (error) {
		throw new Error(`Invalid URL format: ${url}`);
	}
}
