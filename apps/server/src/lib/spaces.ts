import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import sharp from "sharp";

const spacesClient = new S3Client({
	endpoint: process.env.DO_SPACES_ENDPOINT,
	credentials: {
		accessKeyId: process.env.DO_SPACES_ACCESS_KEY!,
		secretAccessKey: process.env.DO_SPACES_SECRET_KEY!,
	},
});

/**
 * Compresses and uploads an image to S3-compatible storage
 * Returns the object key for database storage
 */
export async function uploadImage(
	imageBuffer: Buffer,
	listingId: string,
	quality = 100,
	nearLossless = true,
): Promise<string> {
	const uniqueFileName = `${randomUUID()}.webp`;
	const bucketName = process.env.DO_SPACES_BUCKET!;

	// Compress image using Sharp
	const compressedBuffer = await sharp(imageBuffer)
		.resize(1200, 800, {
			fit: "inside",
			withoutEnlargement: true,
		})
		.webp({ quality, nearLossless })
		.toBuffer();

	const objectKey = `listings/${listingId}/${uniqueFileName}`;

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
	const bucketName = process.env.DO_SPACES_BUCKET!;

	const command = new GetObjectCommand({
		Bucket: bucketName,
		Key: imageKey,
	});

	return await getSignedUrl(spacesClient, command, { expiresIn });
}

// Generate signed URLs for multiple images
export async function generateSignedImageUrls(
	imageKeys: string[],
	expiresIn = 3600,
): Promise<{ [key: string]: string }> {
	const signedUrls: { [key: string]: string } = {};

	await Promise.all(
		imageKeys.map(async (key) => {
			try {
				signedUrls[key] = await generateSignedImageUrl(key, expiresIn);
			} catch (error) {
				console.error(`Failed to generate signed URL for ${key}:`, error);
			}
		}),
	);

	return signedUrls;
}

/**
 * Deletes an image from S3-compatible storage
 */
export async function deleteImage(imageKey: string): Promise<void> {
	const bucketName = process.env.DO_SPACES_BUCKET!;

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
