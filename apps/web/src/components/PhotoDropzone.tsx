import {useMutation} from "@tanstack/react-query";
import {useState} from "react";
import {toast} from "sonner";
import {Dropzone, DropzoneContent, DropzoneEmptyState,} from "@/components/ui/shadcn-io/dropzone";
import {convertFilesToBase64} from "@/lib/utils";
import {trpc} from "@/utils/trpc";

interface Props {
	maxFiles: number;
	onUpload: () => void;
}

export function PhotoDropzone({ maxFiles = 5, onUpload }: Props) {
	const [files, setFiles] = useState<File[] | undefined>();

	const uploadMutation = useMutation(
		trpc.listing.uploadPhotos.mutationOptions({
			onSuccess: (data) => {
				toast.success(`${data.length} photos uploaded!`);
				onUpload();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to upload photos.");
			},
		}),
	);

	const handleDrop = async (files: File[]) => {
		console.log({ files });
		setFiles(files);
		const photos = await convertFilesToBase64(files);
		console.log({ photos });
		uploadMutation.mutate({ photos });
	};

	return (
		<Dropzone
			accept={{ "image/*": [] }}
			maxFiles={maxFiles}
			maxSize={1024 * 1024 * 10}
			minSize={1024}
			onDrop={handleDrop}
			onError={console.error}
			src={files}
		>
			{" "}
			<DropzoneEmptyState /> <DropzoneContent />{" "}
		</Dropzone>
	);
}
