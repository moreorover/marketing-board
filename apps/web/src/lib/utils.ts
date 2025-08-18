import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export async function convertFilesToBase64(files: File[]) {
	// Convert new files to base64 data
	let fileData: {
		name: string;
		type: string;
		data: string;
	}[] = [];

	if (files.length > 0) {
		fileData = await Promise.all(
			files.map(async (file) => {
				return new Promise<{
					name: string;
					type: string;
					data: string;
				}>((resolve) => {
					const reader = new FileReader();
					reader.onloadend = () => {
						const base64String = (reader.result as string).split(",")[1];
						resolve({
							name: file.name,
							type: file.type,
							data: base64String,
						});
					};
					reader.readAsDataURL(file);
				});
			}),
		);
	}

	return fileData;
}
