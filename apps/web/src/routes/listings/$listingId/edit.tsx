import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/$listingId/edit")({
	component: EditListingRoute,
});

function EditListingRoute() {
	const { listingId } = Route.useParams();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const navigate = Route.useNavigate();

	const [selectedMainImageUrl, setSelectedMainImageUrl] = useState<string>("");

	useEffect(() => {
		if (!session && !sessionPending) {
			navigate({
				to: "/login",
			})
		}
	}, [session, sessionPending]);

	const listingQuery = useQuery(
		trpc.listing.getById.queryOptions({ listingId }),
	)
	const listing = listingQuery.data?.[0];

	const images = listing?.images || [];

	// Set initial main image (first image is main)
	useEffect(() => {
		if (images.length > 0 && !selectedMainImageUrl) {
			setSelectedMainImageUrl(images[0].url);
		}
	}, [images, selectedMainImageUrl]);

	const updateMainImageMutation = useMutation(
		trpc.listing.updateMainImage.mutationOptions({
			onSuccess: () => {
				toast.success("Main image updated successfully!");
				navigate({ to: "/listings/$listingId", params: { listingId } });
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update main image.");
			},
		}),
	)

	const handleUpdateMainImage = () => {
		if (!selectedMainImageUrl) {
			toast.error("Please select a main image");
			return
		}

		updateMainImageMutation.mutate({
			listingId,
			newMainImageUrl: selectedMainImageUrl,
		})
	}

	if (sessionPending || listingQuery.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		)
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
		)
	}

	if (images.length === 0) {
		return (
			<div className="mx-auto w-full max-w-md py-10">
				<Card>
					<CardHeader>
						<CardTitle>Edit Listing</CardTitle>
						<CardDescription>No images found for this listing</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							variant="outline"
							onClick={() =>
								navigate({ to: "/listings/$listingId", params: { listingId } })
							}
						>
							Back to Listing
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-2xl py-10">
			<Card>
				<CardHeader>
					<CardTitle>Edit Main Image</CardTitle>
					<CardDescription>
						Select which image should appear first in your listing
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<div>
							<Label className="font-medium text-sm">
								Current Listing: {listing.title}
							</Label>
							<p className="text-gray-600 text-sm">{listing.location}</p>
						</div>

						<div>
							<Label className="font-medium text-sm">
								Select Main Image (will appear first in listings)
							</Label>
							<div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{images.map((image, index) => (
									<div key={image.url} className="relative">
										<div
											className={`cursor-pointer rounded-lg border-2 p-2 transition-colors ${
												selectedMainImageUrl === image.url
													? "border-blue-500 bg-blue-50"
													: "border-gray-200 hover:border-gray-300"
											}`}
											onClick={() => setSelectedMainImageUrl(image.url)}
										>
											<img
												src={image.url}
												alt={"Listing img ${index + 1}"}
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
										{selectedMainImageUrl === image.url && (
											<div className="-right-2 -top-2 absolute flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 font-bold text-white text-xs">
												★
											</div>
										)}
									</div>
								))}
							</div>
							<p className="mt-3 text-gray-500 text-xs">
								Click on an image to set it as the main image
							</p>
						</div>

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
								disabled={updateMainImageMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								onClick={handleUpdateMainImage}
								disabled={
									updateMainImageMutation.isPending ||
									selectedMainImageUrl === images[0]?.url
								}
							>
								{updateMainImageMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Update Main Image"
								)}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
