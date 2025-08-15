import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { ListingForm, type ListingFormData } from "@/components/ListingForm";
import Loader from "@/components/loader";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/$listingId/edit")({
	loader: async ({ context: { trpc, queryClient }, params: { listingId } }) => {
		await queryClient.ensureQueryData(
			trpc.listing.getEditById.queryOptions({ listingId }),
		);
	},
	pendingComponent: Loader,
	component: EditListingRoute,
});

function EditListingRoute() {
	const { listingId } = Route.useParams();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const navigate = Route.useNavigate();

	const listingQuery = useQuery(
		trpc.listing.getEditById.queryOptions({ listingId }),
	);
	const listing = listingQuery.data;

	// Check if current user owns this listing
	const isOwner = listing?.userId === session?.user.id;

	useEffect(() => {
		if (!session || !sessionPending || !isOwner) {
			navigate({
				to: "/",
			});
		}
	}, [session, sessionPending, isOwner]);

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

	const handleSubmit = async ({
		formData,
		newFiles,
		keepImages,
		selectedMainImageUrl,
		mainImageIsNewFile,
		mainImageNewFileIndex,
	}: {
		formData: ListingFormData;
		newFiles: { name: string; type: string; data: string }[];
		keepImages?: string[];
		selectedMainImageUrl?: string;
		mainImageIsNewFile?: boolean;
		mainImageNewFileIndex?: number;
	}) => {
		await updateListingMutation.mutateAsync({
			id: listingId,
			...formData,
			keepImages,
			newFiles: newFiles.length > 0 ? newFiles : undefined,
			newMainImageUrl: selectedMainImageUrl,
			mainImageIsNewFile,
			mainImageNewFileIndex,
		});
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
						initialData={{
							title: listing.title,
							description: listing.description,
							location: listing.location,
							phone: listing.phone,
						}}
						initialImages={listing.images || []}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						submitButtonText="Update Listing"
						isSubmitting={updateListingMutation.isPending}
						mode="edit"
					/>
				</CardContent>
			</Card>
		</div>
	);
}
