import {useForm} from "@tanstack/react-form";
import {useQuery} from "@tanstack/react-query";
import {CheckCircle, Loader2, MapPin, Star, Trash2, XCircle,} from "lucide-react";
import {useEffect, useState} from "react";
import z from "zod";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dropzone, DropzoneContent, DropzoneEmptyState,} from "@/components/ui/shadcn-io/dropzone";
import {Textarea} from "@/components/ui/textarea";
import {trpc} from "@/utils/trpc";

const FormSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	location: z.string().min(1), // Will be auto-filled from admin_ward
	phone: z.string().startsWith("+44").min(13).max(13),
	postcode: z.string().min(1, "Postcode is required"),
	city: z.string().min(1), // Will be auto-filled from admin_district
});

export type ListingFormData = z.infer<typeof FormSchema>;

export interface ListingImage {
	url: string;
}

interface ListingFormProps {
	initialData?: Partial<ListingFormData>;
	initialImages?: ListingImage[];
	onSubmit: (data: {
		formData: ListingFormData;
		newFiles: { name: string; type: string; data: string; main: boolean }[];
		keepImages?: string[];
		selectedMainImageUrl?: string;
		mainImageIsNewFile?: boolean;
		mainImageNewFileIndex?: number;
	}) => Promise<void>;
	onCancel: () => void;
	submitButtonText: string;
	isSubmitting?: boolean;
	mode: "create" | "edit";
}

// Custom hook for debounced postcode lookup
function usePostcodeLookup() {
	const [postcode, setPostcode] = useState("");
	const [debouncedPostcode, setDebouncedPostcode] = useState("");
	const [isValidating, setIsValidating] = useState(false);

	// Debounce the postcode input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedPostcode(postcode);
		}, 500); // 500ms delay

		return () => clearTimeout(timer);
	}, [postcode]);

	// TRPC query for postcode lookup using queryOptions
	const postcodeQuery = useQuery({
		...trpc.postcodes.lookup.queryOptions({ postcode: debouncedPostcode }),
		enabled: !!debouncedPostcode && debouncedPostcode.length >= 5,
		retry: false,
		refetchOnWindowFocus: false,
	});

	// Set validating state when debounced postcode changes
	useEffect(() => {
		if (debouncedPostcode && debouncedPostcode.length >= 5) {
			setIsValidating(true);
		} else {
			setIsValidating(false);
		}
	}, [debouncedPostcode]);

	return {
		postcode,
		setPostcode,
		isValidating: isValidating && postcodeQuery.isFetching,
		postcodeData: postcodeQuery.data,
		postcodeError: postcodeQuery.error,
		isSuccess: !!postcodeQuery.data && !postcodeQuery.error,
		isError: !!postcodeQuery.error,
	};
}

export function ListingForm({
	initialData = {},
	initialImages = [],
	onSubmit,
	onCancel,
	submitButtonText,
	isSubmitting = false,
	mode,
}: ListingFormProps) {
	const [selectedMainImageUrl, setSelectedMainImageUrl] = useState<string>("");
	const [deletedImages, setDeletedImages] = useState<Set<string>>(new Set());
	const [newFiles, setNewFiles] = useState<File[]>([]);
	const [newFileUrls, setNewFileUrls] = useState<string[]>([]);

	// Postcode lookup hook
	const {
		postcode,
		setPostcode,
		isValidating,
		postcodeData,
		postcodeError,
		isSuccess,
		isError,
	} = usePostcodeLookup();

	// Sync lookup postcode with form field on initialization
	useEffect(() => {
		if (initialData.postcode) {
			setPostcode(initialData.postcode);
		}
	}, [initialData.postcode]);

	// Filter out deleted images
	const availableImages = initialImages.filter(
		(img) => !deletedImages.has(img.url),
	);

	// Set initial main image (first image is main)
	useEffect(() => {
		if (availableImages.length > 0 && !selectedMainImageUrl) {
			setSelectedMainImageUrl(availableImages[0].url);
		}
	}, [availableImages, selectedMainImageUrl]);

	// Reset selectedMainImageUrl if the selected image was deleted
	useEffect(() => {
		if (
			selectedMainImageUrl &&
			deletedImages.has(selectedMainImageUrl) &&
			availableImages.length > 0
		) {
			setSelectedMainImageUrl(availableImages[0].url);
		}
	}, [selectedMainImageUrl, deletedImages, availableImages]);

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
			try {
				// Convert new files to base64 data
				let fileData: {
					name: string;
					type: string;
					data: string;
					main: boolean;
				}[] = [];
				if (newFiles.length > 0) {
					fileData = await Promise.all(
						newFiles.map(async (file, index) => {
							const isMainFile = newFileUrls[index] === selectedMainImageUrl;
							return new Promise<{
								name: string;
								type: string;
								data: string;
								main: boolean;
							}>((resolve) => {
								const reader = new FileReader();
								reader.onloadend = () => {
									const base64String = (reader.result as string).split(",")[1];
									resolve({
										name: file.name,
										type: file.type,
										data: base64String,
										main: isMainFile,
									});
								};
								reader.readAsDataURL(file);
							});
						}),
					);
				}

				// Calculate which existing images to keep (not deleted)
				const keepImages = availableImages
					.filter((img) => !deletedImages.has(img.url))
					.map((img) => img.url);

				// Determine main image info
				let mainImageInfo: {
					selectedMainImageUrl?: string;
					mainImageIsNewFile?: boolean;
					mainImageNewFileIndex?: number;
				} = {};

				const willHaveImages = keepImages.length > 0 || newFiles.length > 0;

				if (
					selectedMainImageUrl &&
					willHaveImages &&
					selectedMainImageUrl !== availableImages[0]?.url
				) {
					// Check if main image is a new file
					const isNewFile = selectedMainImageUrl.startsWith("blob:");
					if (isNewFile) {
						// Find the index of the selected file
						const selectedFileIndex = newFiles.findIndex(
							(file, index) => newFileUrls[index] === selectedMainImageUrl,
						);
						mainImageInfo = {
							selectedMainImageUrl: selectedMainImageUrl,
							mainImageIsNewFile: true,
							mainImageNewFileIndex:
								selectedFileIndex >= 0 ? selectedFileIndex : 0,
						};
					} else {
						// Existing image
						mainImageInfo = {
							selectedMainImageUrl: selectedMainImageUrl,
							mainImageIsNewFile: false,
						};
					}
				}

				// Call the onSubmit callback with all the data
				await onSubmit({
					formData: value,
					newFiles: fileData,
					keepImages: keepImages.length > 0 ? keepImages : undefined,
					selectedMainImageUrl: mainImageInfo.selectedMainImageUrl,
					mainImageIsNewFile: mainImageInfo.mainImageIsNewFile,
					mainImageNewFileIndex: mainImageInfo.mainImageNewFileIndex,
				});
			} catch (error) {
				// Error handling should be done by the parent component
				throw error;
			}
		},
	});

	// Auto-update city and location fields when postcode data is available
	useEffect(() => {
		if (postcodeData) {
			form.setFieldValue("city", postcodeData.admin_district);
			form.setFieldValue("location", postcodeData.admin_ward);
		}
	}, [postcodeData, form]);

	// Sync form postcode with lookup postcode
	useEffect(() => {
		form.setFieldValue("postcode", postcode);
	}, [postcode, form]);

	const handleDeleteImage = (imageUrl: string) => {
		// Add to local deleted images set
		setDeletedImages((prev) => new Set(prev.add(imageUrl)));

		// If the deleted image was the selected main image, select another or clear
		if (selectedMainImageUrl === imageUrl) {
			const remainingImages = availableImages.filter(
				(img) => img.url !== imageUrl,
			);
			if (remainingImages.length > 0) {
				setSelectedMainImageUrl(remainingImages[0].url);
			} else if (newFiles.length > 0 && newFileUrls.length > 0) {
				// If no existing images remain, select first new file
				setSelectedMainImageUrl(newFileUrls[0]);
			} else {
				// No images left, clear main image
				setSelectedMainImageUrl("");
			}
		}
	};

	const handleFilesUpload = (files: File[]) => {
		setNewFiles(files);

		// Create stable URLs for the files
		const urls = files.map((file) => URL.createObjectURL(file));
		setNewFileUrls(urls);

		// If no main image is selected and we have new files, select the first one
		if (!selectedMainImageUrl && files.length > 0) {
			setSelectedMainImageUrl(urls[0]);
		}
	};

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
					{({ name, state, handleChange, handleBlur }) => (
						<div>
							<Label htmlFor={name}>Postcode</Label>
							<div className="relative">
								<Input
									id={name}
									name={name}
									value={state.value}
									onBlur={handleBlur}
									onChange={(e) => {
										const upperValue = e.target.value.toUpperCase();
										handleChange(upperValue);
										setPostcode(upperValue);
									}}
									placeholder="Enter postcode (e.g., SW1A 1AA)"
									disabled={isSubmitting}
									className="pr-10"
								/>
								<div className="absolute inset-y-0 right-0 flex items-center pr-3">
									{isValidating && (
										<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
									)}
									{isSuccess && !isValidating && (
										<CheckCircle className="h-4 w-4 text-green-500" />
									)}
									{isError && !isValidating && (
										<XCircle className="h-4 w-4 text-red-500" />
									)}
								</div>
							</div>
							{state.meta.errors.length > 0 && state.meta.isTouched && (
								<div className="mt-1 text-red-500 text-sm">
									{state.meta.errors[0]?.message}
								</div>
							)}
							{isError && postcodeError && (
								<div className="mt-1 text-red-500 text-sm">
									{postcodeError.message}
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
							{postcodeData && (
								<div className="mt-1 text-green-600 text-sm">
									Auto-filled: {postcodeData.admin_district}
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
							{postcodeData && (
								<div className="mt-1 text-green-600 text-sm">
									Auto-filled: {postcodeData.admin_ward}
								</div>
							)}
						</div>
					)}
				</form.Field>
			</div>

			{/* Location Information Display */}
			{isSuccess && postcodeData && (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4">
					<div className="mb-2 flex items-center gap-2">
						<MapPin className="h-4 w-4 text-green-600" />
						<span className="font-medium text-green-800 text-sm">
							Location Details
						</span>
					</div>
					<div className="grid gap-2 text-green-700 text-sm">
						<div className="flex justify-between">
							<span>Postcode:</span>
							<span className="font-medium">{postcodeData.postcode}</span>
						</div>
						<div className="flex justify-between">
							<span>City:</span>
							<span className="font-medium">{postcodeData.admin_district}</span>
						</div>
						<div className="flex justify-between">
							<span>Location:</span>
							<span className="font-medium">{postcodeData.admin_ward}</span>
						</div>
						<div className="flex justify-between">
							<span>Region:</span>
							<span className="font-medium">{postcodeData.region}</span>
						</div>
					</div>
				</div>
			)}

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
				<Dropzone
					maxFiles={5}
					onDrop={handleFilesUpload}
					onError={console.error}
					src={newFiles}
				>
					<DropzoneEmptyState />
					<DropzoneContent />
				</Dropzone>
			</div>

			{/* Main Image Selection */}
			{availableImages.length > 0 || newFiles.length > 0 ? (
				<div>
					<Label className="font-medium text-sm">
						{mode === "edit"
							? "Select Main Image & Manage Images"
							: "Select Main Image (will appear first in listings)"}
					</Label>
					<div className="mt-3 space-y-3">
						{/* Existing Images */}
						{availableImages.map((image, index) => (
							<div
								key={image.url}
								className="flex items-center gap-3 rounded-lg border p-3"
							>
								<div
									className={`cursor-pointer rounded-lg border-2 p-2 transition-colors ${
										selectedMainImageUrl === image.url
											? "border-blue-500 bg-blue-50"
											: "border-gray-200 hover:border-gray-300"
									}`}
									onClick={() => {
										setSelectedMainImageUrl(image.url);
									}}
								>
									<img
										src={image.url}
										alt={`Listing img ${index + 1}`}
										className="h-20 w-20 rounded object-cover"
									/>
								</div>

								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="font-medium text-sm">
											Image {index + 1}
										</span>
										{selectedMainImageUrl === image.url && (
											<div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 text-xs">
												<Star className="h-3 w-3 fill-current" />
												Main
											</div>
										)}
										{index === 0 &&
											!newFiles.length &&
											selectedMainImageUrl !== image.url && (
												<span className="font-medium text-blue-600 text-xs">
													(Current Main)
												</span>
											)}
									</div>
								</div>

								<div className="flex gap-2">
									{selectedMainImageUrl !== image.url && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSelectedMainImageUrl(image.url);
											}}
											type="button"
										>
											<Star className="mr-1 h-4 w-4" />
											Set as Main
										</Button>
									)}

									{mode === "edit" && (
										<Button
											variant="destructive"
											size="sm"
											onClick={() => handleDeleteImage(image.url)}
											type="button"
										>
											<Trash2 className="mr-1 h-4 w-4" />
											Delete
										</Button>
									)}
								</div>
							</div>
						))}

						{/* New Files */}
						{newFiles.map((file, index) => {
							const fileUrl = newFileUrls[index];
							if (!fileUrl) return null;
							return (
								<div
									key={file.name}
									className="flex items-center gap-3 rounded-lg border p-3"
								>
									<div
										className={`cursor-pointer rounded-lg border-2 p-2 transition-colors ${
											selectedMainImageUrl === fileUrl
												? "border-blue-500 bg-blue-50"
												: "border-gray-200 hover:border-gray-300"
										}`}
										onClick={() => {
											setSelectedMainImageUrl(fileUrl);
										}}
									>
										<img
											src={fileUrl}
											alt={`New img ${index + 1}`}
											className="h-20 w-20 rounded object-cover"
										/>
									</div>

									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className="font-medium text-sm">{file.name}</span>
											{selectedMainImageUrl === fileUrl && (
												<div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 text-xs">
													<Star className="h-3 w-3 fill-current" />
													Main
												</div>
											)}
										</div>
									</div>

									<div className="flex gap-2">
										{selectedMainImageUrl !== fileUrl && (
											<>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setSelectedMainImageUrl(fileUrl);
													}}
													type="button"
												>
													<Star className="mr-1 h-4 w-4" />
													Set as Main
												</Button>
												<span className="flex items-center rounded bg-green-100 px-2 py-1 font-medium text-green-700 text-xs">
													New
												</span>
											</>
										)}

										{selectedMainImageUrl === fileUrl && (
											<span className="flex items-center rounded bg-green-100 px-2 py-1 font-medium text-green-700 text-xs">
												New
											</span>
										)}

										<Button
											variant="destructive"
											size="sm"
											onClick={() => {
												const updatedFiles = newFiles.filter(
													(_, i) => i !== index,
												);
												const updatedUrls = newFileUrls.filter(
													(_, i) => i !== index,
												);

												// Revoke the deleted URL to prevent memory leaks
												URL.revokeObjectURL(fileUrl);

												setNewFiles(updatedFiles);
												setNewFileUrls(updatedUrls);

												// If deleted file was main image, select another
												if (selectedMainImageUrl === fileUrl) {
													if (availableImages.length > 0) {
														setSelectedMainImageUrl(availableImages[0].url);
													} else if (updatedUrls.length > 0) {
														setSelectedMainImageUrl(updatedUrls[0]);
													}
												}
											}}
											type="button"
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
						Click on an image or use the "Set as Main" button to select the main
						image. Use the "Delete" button to remove images.
					</p>
				</div>
			) : (
				mode === "edit" && (
					<div className="rounded-lg border border-gray-300 border-dashed bg-gray-50 p-6 text-center">
						<p className="text-gray-500 text-sm">
							This listing currently has no images. You can add images using the
							upload area above.
						</p>
					</div>
				)
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
