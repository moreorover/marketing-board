import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { useEffect } from "react";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/")({
	component: ListingsRoute,
});

function ListingsRoute() {
	const { data: session, isPending } = authClient.useSession();

	const navigate = Route.useNavigate();

	const listings = useQuery(trpc.listing.getPublic.queryOptions());
	const deleteMutation = useMutation(
		trpc.listing.delete.mutationOptions({
			onSuccess: () => {
				listings.refetch();
			},
		}),
	);

	useEffect(() => {
		if (!session && !isPending) {
			navigate({
				to: "/login",
			});
		}
	}, [session, isPending]);

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
							<CardDescription>
								Manage your listings efficiently
							</CardDescription>
						</div>
						<Link to="/listings/new">
							<Button>
								<Plus className="mr-2 h-4 w-4" />
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
								<ListingCard
									key={listing.id}
									listing={listing}
									showActions={true}
									onDelete={handleDeleteListing}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
