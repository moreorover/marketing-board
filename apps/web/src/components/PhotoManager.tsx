import {Star, Trash2} from "lucide-react";
import {useState} from "react";
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
	photos: ListingPhoto[] | undefined;
	onUpload: () => void;
	onPhotoDelete: (listingPhotoId: string) => void;
	onMainPhotoChange: (photoId: string | undefined) => void;
	mode: "create" | "edit";
	isSubmitting?: boolean;
	mainPhotoId?: string;
}

export function PhotoManager({
	photos,
	onUpload,
	onPhotoDelete,
	onMainPhotoChange,
	mode,
	isSubmitting = false,
	mainPhotoId,
}: PhotoManagerProps) {
	const [localMainPhotoId, setLocalMainPhotoId] = useState<string | undefined>(
		mainPhotoId,
	);

	const handleMainPhotoChange = (photoId: string | undefined) => {
		if (photoId) {
			setLocalMainPhotoId(photoId);
			onMainPhotoChange(photoId);
		} else {
			if (photos && photos.length > 0) {
				setLocalMainPhotoId(photos[0].id);
				onMainPhotoChange(photoId);
			}
		}
	};

	const handlePhotoDelete = (photoId: string) => {
		if (photoId === localMainPhotoId) {
			handleMainPhotoChange(undefined);
		}
		onPhotoDelete(photoId);
	};

	return (
		<div className="space-y-6">
			{/* Image Upload */}
			<div>
				<Label>{mode === "edit" ? "Add More Images" : "Images"}</Label>
				<PhotoDropzone maxFiles={5} onUpload={onUpload} />
			</div>

			{/* Photo Management */}
			{photos && photos.length > 0 && (
				<div>
					<Label className="font-medium text-sm">Manage Photos</Label>
					<div className="mt-3 space-y-3">
						{photos.map((photo) => {
							const isMain = localMainPhotoId === photo.id;

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
											variant={isMain ? "default" : "outline"}
											size="sm"
											onClick={() => {
												handleMainPhotoChange(photo.id);
											}}
											disabled={isMain || isSubmitting}
										>
											<Star className="mr-1 h-4 w-4" />
											{isMain ? "Main" : "Set as Main"}
										</Button>

										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => {
												handlePhotoDelete(photo.id);
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
