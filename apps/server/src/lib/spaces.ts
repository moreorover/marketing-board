import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import sharp from "sharp";

const spacesClient = new S3Client({
	endpoint: process.env.DO_SPACES_ENDPOINT,
	region: process.env.DO_SPACES_REGION || "nyc3",
	credentials: {
		accessKeyId: process.env.DO_SPACES_ACCESS_KEY!,
		secretAccessKey: process.env.DO_SPACES_SECRET_KEY!,
	},
});

export async function compressAndUploadImage(
	imageBuffer: Buffer,
	fileName: string,
	listingId: string,
	isMainImage = false,
	quality = 80,
): Promise<string> {
	const fileExtension = fileName.split(".").pop()?.toLowerCase();
	const prefix = isMainImage ? "main_" : "";
	const uniqueFileName = `${prefix}${randomUUID()}.webp`; // Convert all to WebP for consistency
	const bucketName = process.env.DO_SPACES_BUCKET!;

	// Compress image using Sharp
	let compressedBuffer: Buffer;

	try {
		compressedBuffer = await sharp(imageBuffer)
			.resize(1200, 800, {
				fit: "inside",
				withoutEnlargement: true,
			}) // Resize to max 1200x800 maintaining aspect ratio
			.webp({ quality }) // Convert to WebP with specified quality
			.toBuffer();
	} catch (error) {
		console.error("Image compression failed:", error);
		throw new Error("Failed to compress image");
	}

	const uploadParams = {
		Bucket: bucketName,
		Key: `listings/${listingId}/${uniqueFileName}`,
		Body: compressedBuffer,
		ContentType: "image/webp",
		// Removed ACL to make private
	};

	await spacesClient.send(new PutObjectCommand(uploadParams));

	// Return the object key instead of direct URL since we'll use signed URLs
	return `listings/${listingId}/${uniqueFileName}`;
}

export async function getListingImages(listingId: string): Promise<string[]> {
	const bucketName = process.env.DO_SPACES_BUCKET!;
	const prefix = `listings/${listingId}/`;

	try {
		const listParams = {
			Bucket: bucketName,
			Prefix: prefix,
		};

		const data = await spacesClient.send(new ListObjectsV2Command(listParams));

		if (!data.Contents || data.Contents.length === 0) {
			return [];
		}

		// Return S3 keys sorted with main image first
		const imageKeys = data.Contents.filter(
			(obj) => obj.Key && obj.Key !== prefix,
		) // Exclude folder itself
			.map((obj) => ({
				key: obj.Key!,
				isMain: obj.Key!.includes("/main_"),
			}))
			.sort((a, b) => {
				// Main image first, then alphabetical
				if (a.isMain && !b.isMain) return -1;
				if (!a.isMain && b.isMain) return 1;
				return a.key.localeCompare(b.key);
			})
			.map((item) => item.key);

		return imageKeys;
	} catch (error) {
		console.error("Failed to list images:", error);
		return [];
	}
}

// Generate signed URL for private images
export async function generateSignedImageUrl(
	imageKey: string,
	expiresIn = 3600,
): Promise<string> {
	const bucketName = process.env.DO_SPACES_BUCKET!;

	const command = new GetObjectCommand({
		Bucket: bucketName,
		Key: imageKey,
	});

	try {
		const signedUrl = await getSignedUrl(spacesClient, command, { expiresIn });
		return signedUrl;
	} catch (error) {
		console.error("Failed to generate signed URL:", error);
		throw new Error("Failed to generate signed URL");
	}
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

// Extract S3 key from URL (either signed URL or CDN URL)
export function extractKeyFromUrl(url: string): string {
	try {
		const urlObj = new URL(url);

		// For signed URLs, the key is in the pathname
		if (urlObj.hostname.includes(".digitaloceanspaces.com")) {
			return urlObj.pathname.substring(1); // Remove leading slash
		}

		// For CDN URLs, extract from pathname
		if (urlObj.hostname.includes(".cdn.digitaloceanspaces.com")) {
			return urlObj.pathname.substring(1); // Remove leading slash
		}

		// If it's already a key (doesn't start with http), return as is
		if (!url.startsWith("http")) {
			return url;
		}

		throw new Error("Unable to extract key from URL");
	} catch (error) {
		// If URL parsing fails, assume it's already a key
		if (!url.startsWith("http")) {
			return url;
		}
		throw new Error(`Invalid URL format: ${url}`);
	}
}

// Utility function to create thumbnail versions
export async function createThumbnail(
	imageBuffer: Buffer,
	fileName: string,
	listingId: string,
	size = 300,
): Promise<string> {
	const uniqueFileName = `thumb_${randomUUID()}.webp`;
	const bucketName = process.env.DO_SPACES_BUCKET!;

	try {
		const thumbnailBuffer = await sharp(imageBuffer)
			.resize(size, size, {
				fit: "cover",
				position: "center",
			})
			.webp({ quality: 70 })
			.toBuffer();

		const uploadParams = {
			Bucket: bucketName,
			Key: `listings/${listingId}/thumbs/${uniqueFileName}`,
			Body: thumbnailBuffer,
			ContentType: "image/webp",
			// Removed ACL to make private
		};

		await spacesClient.send(new PutObjectCommand(uploadParams));

		return `listings/${listingId}/thumbs/${uniqueFileName}`;
	} catch (error) {
		console.error("Thumbnail creation failed:", error);
		throw new Error("Failed to create thumbnail");
	}
}

export async function changeMainImage(
	listingId: string,
	newMainImageKey: string,
): Promise<void> {
	const bucketName = process.env.DO_SPACES_BUCKET!;
	const prefix = `listings/${listingId}/`;

	try {
		// Get all images for this listing
		const listParams = {
			Bucket: bucketName,
			Prefix: prefix,
		};

		const data = await spacesClient.send(new ListObjectsV2Command(listParams));

		if (!data.Contents) {
			throw new Error("No images found for listing");
		}

		// Validate that the new main image key exists
		const keyExists = data.Contents.some((obj) => obj.Key === newMainImageKey);

		if (!keyExists) {
			throw new Error("New main image not found in listing images");
		}

		// Remove main_ prefix from current main image(s)
		const renamePromises: Promise<void>[] = [];

		for (const obj of data.Contents) {
			if (!obj.Key || obj.Key === prefix) continue;

			const fileName = obj.Key.split("/").pop()!;

			if (fileName.startsWith("main_") && obj.Key !== newMainImageKey) {
				// Remove main_ prefix from current main image
				const newKey = obj.Key.replace("/main_", "/");

				// Copy object with new key
				await spacesClient.send(
					new CopyObjectCommand({
						Bucket: bucketName,
						CopySource: `${bucketName}/${obj.Key}`,
						Key: newKey,
						// Removed ACL to keep private
					}),
				);

				// Delete old object
				renamePromises.push(
					spacesClient
						.send(
							new DeleteObjectCommand({
								Bucket: bucketName,
								Key: obj.Key,
							}),
						)
						.then(() => {}),
				);
			}
		}

		// Add main_ prefix to new main image (if it doesn't already have it)
		const newFileName = newMainImageKey.split("/").pop()!;
		if (!newFileName.startsWith("main_")) {
			const newKey = newMainImageKey.replace(
				newFileName,
				`main_${newFileName}`,
			);

			// Copy object with main_ prefix
			await spacesClient.send(
				new CopyObjectCommand({
					Bucket: bucketName,
					CopySource: `${bucketName}/${newMainImageKey}`,
					Key: newKey,
					// Removed ACL to keep private
				}),
			);

			// Delete old object
			renamePromises.push(
				spacesClient
					.send(
						new DeleteObjectCommand({
							Bucket: bucketName,
							Key: newMainImageKey,
						}),
					)
					.then(() => {}),
			);
		}

		// Wait for all rename operations to complete
		await Promise.all(renamePromises);
	} catch (error) {
		console.error("Failed to change main image:", error);
		throw new Error("Failed to change main image");
	}
}

export async function deleteImage(imageKey: string): Promise<void> {
	const bucketName = process.env.DO_SPACES_BUCKET!;

	try {
		if (!imageKey || !imageKey.startsWith("listings/")) {
			throw new Error("Invalid image key or path");
		}

		await spacesClient.send(
			new DeleteObjectCommand({
				Bucket: bucketName,
				Key: imageKey,
			}),
		);
	} catch (error) {
		console.error("Failed to delete image:", error);
		throw new Error("Failed to delete image");
	}
}
