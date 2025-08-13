import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/$listingId/edit")({
	component: EditListingRoute,
});

const FormSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	location: z.string().min(1),
	phone: z.string().startsWith("+44").min(13).max(13),
});

type FormData = z.infer<typeof FormSchema>;

function EditListingRoute() {
	const { listingId } = Route.useParams();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const navigate = Route.useNavigate();

	const [selectedMainImageUrl, setSelectedMainImageUrl] = useState<string>("");
	const [deletedImages, setDeletedImages] = useState<Set<string>>(new Set());
	const [newFiles, setNewFiles] = useState<File[]>([]);
	const [newFileUrls, setNewFileUrls] = useState<string[]>([]);
	const [pendingImageOperations, setPendingImageOperations] = useState<{
		deleteImages: string[];
		mainImageUrl: string | null;
		newFiles: File[];
	}>({ deleteImages: [], mainImageUrl: null, newFiles: [] });

	const listingQuery = useQuery(
		trpc.listing.getById.queryOptions({ listingId }),
	);
	const listing = listingQuery.data?.[0];

	// Check if current user owns this listing
	const isOwner = listing?.userId === session?.user.id;

	const images = listing?.images || [];

	useEffect(() => {
		if (!session && !sessionPending) {
			navigate({
				to: "/login",
			});
		}
	}, [session, sessionPending]);

	useEffect(() => {
		if (!isOwner) {
			navigate({
				to: "/",
			});
		}
	}, [isOwner]);

	// Filter out deleted images
	const availableImages = images.filter((img) => !deletedImages.has(img.url));

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

	const updateListingMutation = useMutation(
		trpc.listing.update.mutationOptions({
			onSuccess: () => {
				toast.success("Listing updated successfully!");
				navigate({ to: "/listings/$listingId", params: { listingId } });
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update listing.");
			},
		}),
	);

	const form = useForm({
		defaultValues: {
			title: "",
			description: "",
			location: "",
			phone: "",
		} as FormData,
		validators: { onChange: FormSchema },
		onSubmit: async ({ value }) => {
			try {
				// Convert new files to base64 data
				let fileData: { name: string; type: string; data: string }[] = [];
				if (pendingImageOperations.newFiles.length > 0) {
					fileData = await Promise.all(
						pendingImageOperations.newFiles.map(async (file) => {
							return new Promise<{ name: string; type: string; data: string }>(
								(resolve) => {
									const reader = new FileReader();
									reader.onloadend = () => {
										const base64String = (reader.result as string).split(
											",",
										)[1];
										resolve({
											name: file.name,
											type: file.type,
											data: base64String,
										});
									};
									reader.readAsDataURL(file);
								},
							);
						}),
					);
				}

				// Determine main image info
				let mainImageInfo: {
					newMainImageUrl?: string;
					mainImageIsNewFile?: boolean;
					mainImageNewFileIndex?: number;
				} = {};

				// Only set main image info if we're not deleting all existing images
				const remainingImages = availableImages.filter(
					(img) => !pendingImageOperations.deleteImages.includes(img.url),
				);
				const willHaveImages =
					remainingImages.length > 0 ||
					pendingImageOperations.newFiles.length > 0;

				if (
					pendingImageOperations.mainImageUrl &&
					willHaveImages &&
					pendingImageOperations.mainImageUrl !== availableImages[0]?.url
				) {
					// Check if main image is a new file
					const isNewFile =
						pendingImageOperations.mainImageUrl.startsWith("blob:");
					if (isNewFile) {
						// Find the index of the selected file
						const selectedFileIndex = pendingImageOperations.newFiles.findIndex(
							(file) =>
								URL.createObjectURL(file) ===
								pendingImageOperations.mainImageUrl,
						);
						mainImageInfo = {
							newMainImageUrl: pendingImageOperations.mainImageUrl,
							mainImageIsNewFile: true,
							mainImageNewFileIndex:
								selectedFileIndex >= 0 ? selectedFileIndex : 0,
						};
					} else {
						// Existing image
						mainImageInfo = {
							newMainImageUrl: pendingImageOperations.mainImageUrl,
							mainImageIsNewFile: false,
						};
					}
				}

				// Update listing with all operations in a single call
				await updateListingMutation.mutateAsync({
					id: listingId,
					...value,
					imagesToDelete:
						pendingImageOperations.deleteImages.length > 0
							? pendingImageOperations.deleteImages
							: undefined,
					newFiles: fileData.length > 0 ? fileData : undefined,
					...mainImageInfo,
				});
			} catch (error) {
				// Error handling is done in mutation options
			}
		},
	});

	// Update form default values when listing loads
	useEffect(() => {
		if (listing) {
			form.setFieldValue("title", listing.title);
			form.setFieldValue("description", listing.description);
			form.setFieldValue("location", listing.location);
			form.setFieldValue("phone", listing.phone);
		}
	}, [listing, form]);

	// Initialize pending operations when images first load
	useEffect(() => {
		if (
			listing &&
			images.length > 0 &&
			pendingImageOperations.mainImageUrl === null &&
			pendingImageOperations.deleteImages.length === 0
		) {
			setPendingImageOperations({
				deleteImages: [],
				mainImageUrl: images[0]?.url || null,
				newFiles: [],
			});
		}
	}, [listing, images]);

	const handleDeleteImage = (imageUrl: string) => {
		// Add to local deleted images set
		setDeletedImages((prev) => new Set(prev.add(imageUrl)));

		// Add to pending operations
		setPendingImageOperations((prev) => {
			const updated = {
				...prev,
				deleteImages: [...prev.deleteImages, imageUrl],
			};
			return updated;
		});

		// If the deleted image was the selected main image, select another or clear
		if (selectedMainImageUrl === imageUrl) {
			const remainingImages = availableImages.filter(
				(img) => img.url !== imageUrl,
			);
			if (remainingImages.length > 0) {
				const newMainImageUrl = remainingImages[0].url;
				setSelectedMainImageUrl(newMainImageUrl);
				setPendingImageOperations((prev) => ({
					...prev,
					mainImageUrl: newMainImageUrl,
				}));
			} else if (newFiles.length > 0 && newFileUrls.length > 0) {
				// If no existing images remain, select first new file
				setSelectedMainImageUrl(newFileUrls[0]);
				setPendingImageOperations((prev) => ({
					...prev,
					mainImageUrl: newFileUrls[0],
				}));
			} else {
				// No images left, clear main image
				setSelectedMainImageUrl("");
				setPendingImageOperations((prev) => ({
					...prev,
					mainImageUrl: null,
				}));
			}
		}
	};

	const handleFilesUpload = (files: File[]) => {
		setNewFiles(files);

		// Create stable URLs for the files
		const urls = files.map((file) => URL.createObjectURL(file));
		setNewFileUrls(urls);

		setPendingImageOperations((prev) => ({
			...prev,
			newFiles: files,
		}));

		// If no main image is selected and we have new files, select the first one
		if (!selectedMainImageUrl && files.length > 0) {
			setSelectedMainImageUrl(urls[0]);
			setPendingImageOperations((prev) => ({
				...prev,
				mainImageUrl: urls[0],
			}));
		}
	};

	if (sessionPending || listingQuery.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!listing) {
		return (
			<div className="mx-auto w-full max-w-md py-10">
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-gray-500">Listing not found</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-4xl py-10">
			<Card>
				<CardHeader>
					<CardTitle>Edit Listing</CardTitle>
					<CardDescription>
						Update your listing details and main image
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-6"
					>
						{/* Listing Details Form Fields */}
						<div className="grid gap-4 md:grid-cols-2">
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
											disabled={updateListingMutation.isPending}
										/>
										{state.meta.errors.length > 0 && state.meta.isTouched && (
											<div className="mt-1 text-red-500 text-sm">
												{state.meta.errors[0]?.message}
											</div>
										)}
									</div>
								)}
							</form.Field>

							<form.Field name="location">
								{({ name, state, handleChange, handleBlur }) => (
									<div>
										<Label htmlFor={name}>Location</Label>
										<Input
											id={name}
											name={name}
											value={state.value}
											onBlur={handleBlur}
											onChange={(e) => handleChange(e.target.value)}
											placeholder="Enter location..."
											disabled={updateListingMutation.isPending}
										/>
										{state.meta.errors.length > 0 && state.meta.isTouched && (
											<div className="mt-1 text-red-500 text-sm">
												{state.meta.errors[0]?.message}
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
										disabled={updateListingMutation.isPending}
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
										disabled={updateListingMutation.isPending}
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
							<Label>Add More Images</Label>
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
									Select Main Image & Manage Images
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
													setPendingImageOperations((prev) => ({
														...prev,
														mainImageUrl: image.url,
													}));
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
															setPendingImageOperations((prev) => ({
																...prev,
																mainImageUrl: image.url,
															}));
														}}
														type="button"
													>
														<Star className="mr-1 h-4 w-4" />
														Set as Main
													</Button>
												)}

												<Button
													variant="destructive"
													size="sm"
													onClick={() => handleDeleteImage(image.url)}
													type="button"
												>
													<Trash2 className="mr-1 h-4 w-4" />
													Delete
												</Button>
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
														setPendingImageOperations((prev) => ({
															...prev,
															mainImageUrl: fileUrl,
														}));
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
														<span className="font-medium text-sm">
															{file.name}
														</span>
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
																	setPendingImageOperations((prev) => ({
																		...prev,
																		mainImageUrl: fileUrl,
																	}));
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
															setPendingImageOperations((prev) => ({
																...prev,
																newFiles: updatedFiles,
															}));

															// If deleted file was main image, select another
															if (selectedMainImageUrl === fileUrl) {
																if (availableImages.length > 0) {
																	setSelectedMainImageUrl(
																		availableImages[0].url,
																	);
																	setPendingImageOperations((prev) => ({
																		...prev,
																		mainImageUrl: availableImages[0].url,
																	}));
																} else if (updatedUrls.length > 0) {
																	setSelectedMainImageUrl(updatedUrls[0]);
																	setPendingImageOperations((prev) => ({
																		...prev,
																		mainImageUrl: updatedUrls[0],
																	}));
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
									Click on an image or use the "Set as Main" button to select
									the main image. Use the "Delete" button to remove images.
								</p>
							</div>
						) : (
							<div className="rounded-lg border border-gray-300 border-dashed bg-gray-50 p-6 text-center">
								<p className="text-gray-500 text-sm">
									This listing currently has no images. You can add images using
									the upload area above.
								</p>
							</div>
						)}

						{/* Form Actions */}
						<div className="flex space-x-3">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate({
										to: "/listings/$listingId",
										params: { listingId },
									})
								}
								disabled={updateListingMutation.isPending}
							>
								Cancel
							</Button>
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
							>
								{([canSubmit, isSubmitting]) => (
									<Button
										type="submit"
										disabled={!canSubmit || updateListingMutation.isPending}
									>
										{updateListingMutation.isPending || isSubmitting ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"Update Listing"
										)}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
