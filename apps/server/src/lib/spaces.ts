import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const spacesClient = new S3Client({
	endpoint: process.env.DO_SPACES_ENDPOINT,
	region: process.env.DO_SPACES_REGION || "nyc3",
	credentials: {
		accessKeyId: process.env.DO_SPACES_ACCESS_KEY!,
		secretAccessKey: process.env.DO_SPACES_SECRET_KEY!,
	},
});

export async function uploadFileToSpaces(
	file: Buffer,
	fileName: string,
	mimeType: string,
): Promise<string> {
	const fileExtension = fileName.split(".").pop();
	const uniqueFileName = `${randomUUID()}.${fileExtension}`;
	const bucketName = process.env.DO_SPACES_BUCKET!;

	const uploadParams = {
		Bucket: bucketName,
		Key: `uploads/${uniqueFileName}`,
		Body: file,
		ContentType: mimeType,
		ACL: "public-read" as const,
	};

	await spacesClient.send(new PutObjectCommand(uploadParams));

	return `https://${bucketName}.${process.env.DO_SPACES_REGION || "nyc3"}.cdn.digitaloceanspaces.com/uploads/${uniqueFileName}`;
}
