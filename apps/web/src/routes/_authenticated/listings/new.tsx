import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ListingForm, type ListingFormData } from "@/components/ListingForm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/listings/new")({
	component: NewListingRoute,
});

function NewListingRoute() {
	const navigate = Route.useNavigate();

	const unusedPhotosQuery = useQuery(
		trpc.listing.listUnusedPhotos.queryOptions(),
	);
	const unusedPhotos = unusedPhotosQuery.data;

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

	const deleteListingPhotoMutation = useMutation(
		trpc.listing.deletePhoto.mutationOptions({
			onSuccess: () => {
				toast.success("Listing photo deleted successfully!");
				unusedPhotosQuery.refetch();
			},
			onError: () => {
				toast.error("Failed to delete listing photo.");
			},
		}),
	);

	const handleSubmit = async ({
		formData,
		mainPhotoId,
	}: {
		formData: ListingFormData;
		photoIds?: string[];
		mainPhotoId?: string;
	}) => {
		createMutation.mutate({
			...formData,
			mainPhotoId,
		});
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
						photos={unusedPhotos}
						onSubmit={handleSubmit}
						onUpload={() => {
							unusedPhotosQuery.refetch();
						}}
						onPhotoDelete={(listingPhotoId) => {
							deleteListingPhotoMutation.mutate({ listingPhotoId });
						}}
						onCancel={handleCancel}
						submitButtonText="Create Listing"
						isSubmitting={createMutation.isPending}
						mode="create"
					/>
				</CardContent>
			</Card>
		</div>
	);
}
