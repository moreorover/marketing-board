import { useForm } from "@tanstack/react-form";
import { Loader2, Star, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import z from "zod";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { PostcodeDrawer } from "@/components/PostcodeDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";

const FormSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	location: z.string().min(1), // Will be auto-filled from admin_ward
	phone: z.string().startsWith("+44").min(13).max(13),
	postcode: z.string().min(1, "Postcode is required"),
	city: z.string().min(1), // Will be auto-filled from admin_district
});

export type ListingFormData = z.infer<typeof FormSchema>;

export type ListingPhoto = {
	id: string;
	userId: string | null;
	listingId: string | null;
	isMain: boolean;
	objectKey: string;
	uploadedAt: string;
	signedUrl: string;
};

interface ListingFormProps {
	photos: ListingPhoto[] | undefined;
	initialData?: Partial<ListingFormData>;
	onSubmit: (data: {
		formData: ListingFormData;
		photoIds?: string[];
		mainPhotoId?: string;
	}) => Promise<void>;
	onUpload: () => void;
	onPhotoDelete: (listingPhotoId: string) => void;
	onCancel: () => void;
	submitButtonText: string;
	isSubmitting?: boolean;
	mode: "create" | "edit";
}

export function ListingForm({
	photos,
	initialData = {},
	onSubmit,
	onUpload,
	onPhotoDelete,
	onCancel,
	submitButtonText,
	isSubmitting = false,
	mode,
}: ListingFormProps) {
	const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
	const [mainPhotoId, setMainPhotoId] = useState<string | undefined>();

	const form = useForm({
		defaultValues: {
			title: initialData.title || "",
			description: initialData.description || "",
			location: initialData.location || "",
			phone: initialData.phone || "",
			postcode: initialData.postcode || "",
			city: initialData.city || "",
		} as ListingFormData,
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			// Call the onSubmit callback with all the data
			await onSubmit({
				formData: value,
				photoIds: selectedPhotos.length > 0 ? selectedPhotos : undefined,
				mainPhotoId,
			});
		},
	});

	const handlePostcodeChange = useCallback(
		(postcode: string) => {
			form.setFieldValue("postcode", postcode);
		},
		[form],
	);

	const handleLocationUpdate = useCallback(
		(data: { city: string; location: string; postcode: string }) => {
			form.setFieldValue("city", data.city);
			form.setFieldValue("location", data.location);
			form.setFieldValue("postcode", data.postcode);
		},
		[form],
	);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<form.Field name="title">
				{({ name, state, handleChange, handleBlur }) => (
					<div>
						<Label htmlFor={name}>Title</Label>
						<Input
							id={name}
							name={name}
							value={state.value}
							onBlur={handleBlur}
							onChange={(e) => handleChange(e.target.value)}
							placeholder="Enter listing title..."
							disabled={isSubmitting}
						/>
						{state.meta.errors.length > 0 && state.meta.isTouched && (
							<div className="mt-1 text-red-500 text-sm">
								{state.meta.errors[0]?.message}
							</div>
						)}
					</div>
				)}
			</form.Field>

			{/* Postcode Field with Auto-filled Location Details */}
			<div className="grid gap-4 md:grid-cols-3">
				<form.Field name="postcode">
					{({ state }) => (
						<div>
							<Label>Postcode</Label>
							<PostcodeDrawer
								initialPostcode={initialData.postcode}
								onLocationUpdate={handleLocationUpdate}
								disabled={isSubmitting}
								triggerText={state.value || "Enter Postcode"}
							/>
							{state.meta.errors.length > 0 && state.meta.isTouched && (
								<div className="mt-1 text-red-500 text-sm">
									{state.meta.errors[0]?.message}
								</div>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="city">
					{({ name, state }) => (
						<div>
							<Label htmlFor={name}>City</Label>
							<Input
								id={name}
								name={name}
								value={state.value}
								placeholder="Auto-filled from postcode"
								disabled={true}
								className="cursor-not-allowed bg-muted text-muted-foreground"
							/>
							{state.value && (
								<div className="mt-1 text-green-600 text-sm">
									Auto-filled: {state.value}
								</div>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="location">
					{({ name, state }) => (
						<div>
							<Label htmlFor={name}>Location</Label>
							<Input
								id={name}
								name={name}
								value={state.value}
								placeholder="Auto-filled from postcode"
								disabled={true}
								className="cursor-not-allowed bg-muted text-muted-foreground"
							/>
							{state.value && (
								<div className="mt-1 text-green-600 text-sm">
									Auto-filled: {state.value}
								</div>
							)}
						</div>
					)}
				</form.Field>
			</div>

			<form.Field name="description">
				{({ name, state, handleChange, handleBlur }) => (
					<div>
						<Label htmlFor={name}>Description</Label>
						<Textarea
							id={name}
							name={name}
							value={state.value}
							onBlur={handleBlur}
							onChange={(e) => handleChange(e.target.value)}
							placeholder="Enter listing description..."
							disabled={isSubmitting}
							rows={4}
						/>
						{state.meta.errors.length > 0 && state.meta.isTouched && (
							<div className="mt-1 text-red-500 text-sm">
								{state.meta.errors[0]?.message}
							</div>
						)}
					</div>
				)}
			</form.Field>

			<form.Field name="phone">
				{({ name, state, handleChange, handleBlur }) => (
					<div>
						<Label htmlFor={name}>Phone</Label>
						<Input
							id={name}
							name={name}
							value={state.value}
							onBlur={handleBlur}
							onChange={(e) => handleChange(e.target.value)}
							placeholder="+44"
							disabled={isSubmitting}
						/>
						{state.meta.errors.length > 0 && state.meta.isTouched && (
							<div className="mt-1 text-red-500 text-sm">
								{state.meta.errors[0]?.message}
							</div>
						)}
					</div>
				)}
			</form.Field>

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
							const isMain = mainPhotoId === photo.id;

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
											{isMain && (
												<div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 text-xs">
													<Star className="h-3 w-3 fill-current" />
													Main
												</div>
											)}
										</div>
									</div>

									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												setMainPhotoId(photo.id);
											}}
											disabled={isMain}
										>
											<Star className="mr-1 h-4 w-4" />
											{isMain ? "Main" : "Set as Main"}
										</Button>

										<Button
											type="button"
											variant="destructive"
											size="sm"
											onClick={() => {
												onPhotoDelete(photo.id);
											}}
											// disabled={true}
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

			{/* Form Actions */}
			<div className="flex space-x-3">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isFormSubmitting]) => (
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting || isFormSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								submitButtonText
							)}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
