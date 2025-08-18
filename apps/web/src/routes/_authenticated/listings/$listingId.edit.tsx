import {useMutation, useQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {useEffect} from "react";
import {toast} from "sonner";
import {ListingForm, type ListingFormData} from "@/components/ListingForm";
import Loader from "@/components/loader";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {useAuth} from "@/hooks/useAuth";
import {trpc} from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/listings/$listingId/edit",
)({
	// TODO: beforeLoad: check if user owns $listingId
	loader: async ({ context: { trpc, queryClient }, params: { listingId } }) => {
		await queryClient.ensureQueryData(
			trpc.listing.getEditById.queryOptions({ listingId }),
		);
	},
	pendingComponent: Loader,
	component: EditListingRoute,
});

function EditListingRoute() {
	const { user } = useAuth();
	const { listingId } = Route.useParams();

	const navigate = Route.useNavigate();

	const listingQuery = useQuery(
		trpc.listing.getEditById.queryOptions({ listingId }),
	);
	const listing = listingQuery.data;

	const photosQuery = useQuery(
		trpc.listingPhoto.listPhotos.queryOptions({ listingId }),
	);
	const photos = photosQuery.data || [];

	// Check if current user owns this listing
	const isOwner = listing?.userId === user.id;

	useEffect(() => {
		if (!isOwner) {
			navigate({
				to: "/",
			});
		}
	}, [isOwner]);

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

	const handleSubmit = (formData: ListingFormData) => {
		updateListingMutation.mutate({ id: listingId, ...formData });
	};

	const handleCancel = () => {
		navigate({
			to: "/listings/$listingId",
			params: { listingId },
		});
	};

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
					<ListingForm
						photos={photos}
						listingId={listingId}
						initialData={{
							title: listing.title,
							description: listing.description,
							location: listing.location,
							phone: listing.phone,
							city: listing.city,
							postcode: listing.postcode,
						}}
						onUpload={() => {
							photosQuery.refetch();
						}}
						onPhotoDelete={() => {
							photosQuery.refetch();
						}}
						onMainPhotoChange={() => {
							photosQuery.refetch();
						}}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						submitButtonText="Update Listing"
						isSubmitting={updateListingMutation.isPending}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
