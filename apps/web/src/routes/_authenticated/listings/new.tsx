import {useMutation, useQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {toast} from "sonner";
import {ListingForm, type ListingFormData} from "@/components/ListingForm";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {trpc} from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/listings/new")({
	component: NewListingRoute,
});

function NewListingRoute() {
	const navigate = Route.useNavigate();

	const photosQuery = useQuery(
		trpc.listingPhoto.listPhotos.queryOptions({ listingId: null }),
	);
	const photos = photosQuery.data || [];

	const createMutation = useMutation(
		trpc.listing.create.mutationOptions({
			onSuccess: () => {
				toast.success("Listing created successfully!");
				navigate({ to: "/listings" });
			},
			onError: () => {
				toast.error("Failed to create listing.");
			},
		}),
	);

	const setMainListingPhotoMutation = useMutation(
		trpc.listingPhoto.setMainPhoto.mutationOptions({
			onSuccess: () => {
				toast.success("Main listing photo updated successfully!");
				photosQuery.refetch();
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
				photosQuery.refetch();
			},
			onError: () => {
				toast.error("Failed to delete listing photo.");
			},
		}),
	);

	const handleSubmit = (formData: ListingFormData) => {
		createMutation.mutate(formData);
	};

	const handleCancel = () => {
		navigate({ to: "/listings" });
	};

	return (
		<div className="mx-auto w-full max-w-4xl py-10">
			<Card>
				<CardHeader>
					<CardTitle>Create New Listing</CardTitle>
					<CardDescription>Add a new listing to the board</CardDescription>
				</CardHeader>
				<CardContent>
					<ListingForm
						photos={photos}
						listingId={null}
						onSubmit={handleSubmit}
						onUpload={() => {
							photosQuery.refetch();
						}}
						onPhotoDelete={(listingPhotoId) => {
							deleteListingPhotoMutation.mutate({ listingPhotoId });
						}}
						onMainPhotoChange={(listingPhotoId) => {
							setMainListingPhotoMutation.mutate({ listingPhotoId });
						}}
						onCancel={handleCancel}
						submitButtonText="Create Listing"
						isSubmitting={createMutation.isPending}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
