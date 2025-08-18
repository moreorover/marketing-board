import {Star, Trash2} from "lucide-react";
import {PhotoDropzone} from "@/components/PhotoDropzone";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";

export type ListingPhoto = {
	id: string;
	userId: string | null;
	listingId: string | null;
	isMain: boolean;
	objectKey: string;
	uploadedAt: string;
	signedUrl: string;
};

interface PhotoManagerProps {
	photos: ListingPhoto[];
	listingId: string | null;
	onUpload: () => void;
	onPhotoDelete: (listingPhotoId: string) => void;
	onMainPhotoChange: (photoId: string) => void;
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
												onMainPhotoChange(photo.id);
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
												onPhotoDelete(photo.id);
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
