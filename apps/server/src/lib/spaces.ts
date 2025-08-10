import {
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
	quality = 80,
): Promise<string> {
	const fileExtension = fileName.split(".").pop()?.toLowerCase();
	const uniqueFileName = `${randomUUID()}.webp`; // Convert all to WebP for consistency
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

		// Convert S3 keys to CDN URLs
		const imageUrls = data.Contents.filter(
			(obj) => obj.Key && obj.Key !== prefix,
		) // Exclude folder itself
			.map(
				(obj) =>
					`https://${bucketName}.${process.env.DO_SPACES_REGION || "nyc3"}.cdn.digitaloceanspaces.com/${obj.Key}`,
			)
			.sort(); // Sort for consistent ordering

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
