import {useMutation} from "@tanstack/react-query";
import {Star, Trash2} from "lucide-react";
import {toast} from "sonner";
import {PhotoDropzone} from "@/components/PhotoDropzone";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {trpc} from "@/utils/trpc";

interface PhotoManagerProps {
	photos: {
		id: string;
		isMain: boolean;
		signedUrl: string;
	}[];
	listingId: string | null;
	onUpload: () => void;
	onPhotoDelete: () => void;
	onMainPhotoChange: () => void;
	isSubmitting?: boolean;
}

export function PhotoManager({
	photos,
	listingId,
	onUpload,
	onPhotoDelete,
	onMainPhotoChange,
	isSubmitting = false,
}: PhotoManagerProps) {
	const setMainListingPhotoMutation = useMutation(
		trpc.listingPhoto.setMainPhoto.mutationOptions({
			onSuccess: () => {
				toast.success("Main listing photo updated successfully!");
				onMainPhotoChange();
			},
			onError: () => {
				toast.error("Failed to update main listing photo.");
			},
		}),
	);

	const deleteListingPhotoMutation = useMutation(
		trpc.listingPhoto.deletePhoto.mutationOptions({
			onSuccess: () => {
				toast.success("Listing photo deleted successfully!");
				onPhotoDelete();
			},
			onError: () => {
				toast.error("Failed to delete listing photo.");
			},
		}),
	);

	return (
		<div className="space-y-6">
			{/* Image Upload */}
			<div>
				<Label>Images</Label>
				<PhotoDropzone maxFiles={5} onUpload={onUpload} listingId={listingId} />
			</div>

			{/* Photo Management */}
			{photos && photos.length > 0 && (
				<div>
					<Label className="font-medium text-sm">Manage Photos</Label>
					<div className="mt-3 space-y-3">
						{photos.map((photo) => {
							return (
								<div
									key={photo.id}
									className="flex items-center gap-3 rounded-lg border p-3"
								>
									<div className="cursor-pointer rounded-lg border-2 p-2 transition-colors hover:border-gray-300">
										<img
											src={photo.signedUrl}
											alt={`${photo.id}`}
											className="h-20 w-20 rounded object-cover"
										/>
									</div>

									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className="font-medium text-sm">
												Photo {photo.id}
											</span>
										</div>
									</div>

									<div className="flex gap-2">
										<Button
											type="button"
											variant={photo.isMain ? "default" : "outline"}
											size="sm"
											onClick={() => {
												setMainListingPhotoMutation.mutate({
													listingPhotoId: photo.id,
												});
											}}
											disabled={photo.isMain || isSubmitting}
										>
											<Star className="mr-1 h-4 w-4" />
											{photo.isMain ? "Main" : "Set as Main"}
										</Button>

										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => {
												deleteListingPhotoMutation.mutate({
													listingPhotoId: photo.id,
												});
											}}
											disabled={isSubmitting}
										>
											<Trash2 className="mr-1 h-4 w-4" />
											Delete
										</Button>
									</div>
								</div>
							);
						})}
					</div>
					<p className="mt-3 text-gray-500 text-xs">
						Click on a photo to select it for your listing. Use "Set as Main" to
						choose the primary photo.
					</p>
				</div>
			)}
		</div>
	);
}
