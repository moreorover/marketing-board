import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/")({
	component: ListingsRoute,
});

function ListingsRoute() {
	const listings = useQuery(trpc.listing.getAll.queryOptions());
	const deleteMutation = useMutation(
		trpc.listing.delete.mutationOptions({
			onSuccess: () => {
				listings.refetch();
			},
		}),
	);

	const handleDeleteListing = (id: string) => {
		deleteMutation.mutate({ id });
	};

	return (
		<div className="mx-auto w-full max-w-2xl py-10">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Listings</CardTitle>
							<CardDescription>Manage your listings efficiently</CardDescription>
						</div>
						<Link to="/listings/new">
							<Button>
								<Plus className="h-4 w-4 mr-2" />
								New Listing
							</Button>
						</Link>
					</div>
				</CardHeader>
				<CardContent>

					{listings.isLoading ? (
						<div className="flex justify-center py-4">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : listings.data?.length === 0 ? (
						<p className="py-4 text-center">No listings yet. Create one!</p>
					) : (
						<div className="grid gap-4">
							{listings.data?.map((listing) => (
								<Card key={listing.id}>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<CardTitle className="text-lg">{listing.title}</CardTitle>
											<div className="flex items-center space-x-1">
												<Link
													to="/listings/$listingId"
													params={{ listingId: listing.id }}
												>
													<Button
														variant="ghost"
														size="icon"
														aria-label="View listing"
													>
														<ArrowUpRight className="h-4 w-4" />
													</Button>
												</Link>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleDeleteListing(listing.id)}
													aria-label="Delete listing"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</CardHeader>
									<CardContent className="pt-0">
										<CardDescription className="mb-2">
											{listing.description}
										</CardDescription>
										{listing.location && (
											<p className="text-sm text-muted-foreground">
												📍 {listing.location}
											</p>
										)}
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
