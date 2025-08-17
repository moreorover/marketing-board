import {useMutation} from "@tanstack/react-query";
import {toast} from "sonner";
import {Dropzone, DropzoneContent, DropzoneEmptyState,} from "@/components/ui/shadcn-io/dropzone";
import {convertFilesToBase64} from "@/lib/utils";
import {trpc} from "@/utils/trpc";

interface Props {
	maxFiles: number;
	onUpload: () => void;
	disabled?: boolean;
}

export function PhotoDropzone({
	maxFiles = 5,
	onUpload,
	disabled = false,
}: Props) {
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
		const photos = await convertFilesToBase64(files);
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
			disabled={disabled}
		>
			{" "}
			<DropzoneEmptyState /> <DropzoneContent />{" "}
		</Dropzone>
	);
}
