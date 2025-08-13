import {
	CopyObjectCommand,
	DeleteObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
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
		ACL: "public-read" as const,
	};

	await spacesClient.send(new PutObjectCommand(uploadParams));

	// Return the CDN URL
	return `https://${bucketName}.${process.env.DO_SPACES_REGION || "nyc3"}.cdn.digitaloceanspaces.com/listings/${listingId}/${uniqueFileName}`;
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

		// Convert S3 keys to CDN URLs and sort with main image first
		const imageUrls = data.Contents
			.filter(obj => obj.Key && obj.Key !== prefix) // Exclude folder itself
			.map(obj => ({
				url: `https://${bucketName}.${process.env.DO_SPACES_REGION || "nyc3"}.cdn.digitaloceanspaces.com/${obj.Key}`,
				key: obj.Key!,
				isMain: obj.Key!.includes('/main_')
			}))
			.sort((a, b) => {
				// Main image first, then alphabetical
				if (a.isMain && !b.isMain) return -1;
				if (!a.isMain && b.isMain) return 1;
				return a.key.localeCompare(b.key);
			})
			.map(item => item.url);

		return imageUrls;
	} catch (error) {
		console.error("Failed to list images:", error);
		return [];
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
			ACL: "public-read" as const,
		};

		await spacesClient.send(new PutObjectCommand(uploadParams));

		return `https://${bucketName}.${process.env.DO_SPACES_REGION || "nyc3"}.cdn.digitaloceanspaces.com/listings/${listingId}/thumbs/${uniqueFileName}`;
	} catch (error) {
		console.error("Thumbnail creation failed:", error);
		throw new Error("Failed to create thumbnail");
	}
}

export async function changeMainImage(listingId: string, newMainImageUrl: string): Promise<void> {
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

		// Find the new main image key from URL
		const newMainImageKey = data.Contents.find(obj => {
			if (!obj.Key) return false;
			const imageUrl = `https://${bucketName}.${process.env.DO_SPACES_REGION || "nyc3"}.cdn.digitaloceanspaces.com/${obj.Key}`;
			return imageUrl === newMainImageUrl;
		})?.Key;

		if (!newMainImageKey) {
			throw new Error("New main image not found in listing images");
		}

		// Remove main_ prefix from current main image(s)
		const renamePromises: Promise<void>[] = [];
		
		for (const obj of data.Contents) {
			if (!obj.Key || obj.Key === prefix) continue;

			const fileName = obj.Key.split('/').pop()!;
			
			if (fileName.startsWith('main_') && obj.Key !== newMainImageKey) {
				// Remove main_ prefix from current main image
				const newKey = obj.Key.replace('/main_', '/');
				
				// Copy object with new key
				await spacesClient.send(new CopyObjectCommand({
					Bucket: bucketName,
					CopySource: `${bucketName}/${obj.Key}`,
					Key: newKey,
					ACL: "public-read",
				}));

				// Delete old object
				renamePromises.push(
					spacesClient.send(new DeleteObjectCommand({
						Bucket: bucketName,
						Key: obj.Key,
					})).then(() => {})
				);
			}
		}

		// Add main_ prefix to new main image (if it doesn't already have it)
		const newFileName = newMainImageKey.split('/').pop()!;
		if (!newFileName.startsWith('main_')) {
			const newKey = newMainImageKey.replace(newFileName, `main_${newFileName}`);
			
			// Copy object with main_ prefix
			await spacesClient.send(new CopyObjectCommand({
				Bucket: bucketName,
				CopySource: `${bucketName}/${newMainImageKey}`,
				Key: newKey,
				ACL: "public-read",
			}));

			// Delete old object
			renamePromises.push(
				spacesClient.send(new DeleteObjectCommand({
					Bucket: bucketName,
					Key: newMainImageKey,
				})).then(() => {})
			);
		}

		// Wait for all rename operations to complete
		await Promise.all(renamePromises);
		
	} catch (error) {
		console.error("Failed to change main image:", error);
		throw new Error("Failed to change main image");
	}
}

export async function deleteImage(imageUrl: string): Promise<void> {
	const bucketName = process.env.DO_SPACES_BUCKET!;
	
	try {
		// Extract the key from the URL
		// URL format: https://bucket.region.cdn.digitaloceanspaces.com/path/to/file
		const urlParts = imageUrl.split('/');
		const keyStartIndex = urlParts.findIndex(part => part.includes('.cdn.digitaloceanspaces.com')) + 1;
		const key = urlParts.slice(keyStartIndex).join('/');

		if (!key || !key.startsWith('listings/')) {
			throw new Error("Invalid image URL or path");
		}

		await spacesClient.send(new DeleteObjectCommand({
			Bucket: bucketName,
			Key: key,
		}));
		
	} catch (error) {
		console.error("Failed to delete image:", error);
		throw new Error("Failed to delete image");
	}
}
