import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, X } from "lucide-react";
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
	const [pendingImageOperations, setPendingImageOperations] = useState<{
		deleteImages: string[];
		mainImageUrl: string | null;
	}>({ deleteImages: [], mainImageUrl: null });

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
				// Update listing with all operations in a single call
				await updateListingMutation.mutateAsync({
					id: listingId,
					...value,
					imagesToDelete: pendingImageOperations.deleteImages.length > 0 
						? pendingImageOperations.deleteImages 
						: undefined,
					newMainImageUrl: pendingImageOperations.mainImageUrl && 
						pendingImageOperations.mainImageUrl !== availableImages[0]?.url
						? pendingImageOperations.mainImageUrl
						: undefined,
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
		if (listing && images.length > 0 && pendingImageOperations.mainImageUrl === null) {
			setPendingImageOperations({
				deleteImages: [],
				mainImageUrl: images[0]?.url || null,
			});
		}
	}, [listing, images, pendingImageOperations.mainImageUrl]);

	const handleDeleteImage = (imageUrl: string) => {
		if (availableImages.length <= 1) {
			toast.error("Cannot delete the last image from a listing");
			return;
		}

		// Add to local deleted images set
		setDeletedImages((prev) => new Set(prev.add(imageUrl)));

		// Add to pending operations
		setPendingImageOperations((prev) => ({
			...prev,
			deleteImages: [...prev.deleteImages, imageUrl],
		}));

		// If the deleted image was the selected main image, select the first available image
		if (selectedMainImageUrl === imageUrl) {
			const remainingImages = availableImages.filter((img) => img.url !== imageUrl);
			if (remainingImages.length > 0) {
				const newMainImageUrl = remainingImages[0].url;
				setSelectedMainImageUrl(newMainImageUrl);
				setPendingImageOperations((prev) => ({
					...prev,
					mainImageUrl: newMainImageUrl,
				}));
			}
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

						{/* Main Image Selection */}
						{availableImages.length > 0 && (
							<div>
								<Label className="font-medium text-sm">
									{availableImages.length > 1
										? "Select Main Image & Delete Images"
										: "Current Image"}
								</Label>
								<div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{availableImages.map((image, index) => (
										<div key={image.url} className="group relative">
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
													className="h-32 w-full rounded object-cover"
												/>
												<div className="mt-2 text-center">
													<span className="text-gray-500 text-xs">
														Image {index + 1}
													</span>
													{index === 0 && (
														<span className="ml-1 font-medium text-blue-600 text-xs">
															(Current Main)
														</span>
													)}
												</div>
											</div>

											{/* Main image indicator */}
											{selectedMainImageUrl === image.url &&
												availableImages.length > 1 && (
													<div className="-right-2 -top-2 absolute z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 font-bold text-white text-xs">
														★
													</div>
												)}

											{/* Delete button - only show if more than one image */}
											{availableImages.length > 1 && (
												<Button
													variant="destructive"
													size="icon"
													className="-right-1 -top-1 absolute z-20 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteImage(image.url);
													}}
													type="button"
												>
													<X className="h-3 w-3" />
												</Button>
											)}
										</div>
									))}
								</div>
								{availableImages.length > 1 && (
									<p className="mt-3 text-gray-500 text-xs">
										Click on an image to set it as the main image. Hover over an
										image to see the delete button.
									</p>
								)}
								{availableImages.length === 1 && (
									<p className="mt-3 text-gray-500 text-xs">
										You need at least one image for your listing.
									</p>
								)}
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
