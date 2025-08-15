import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { ListingCard } from "@/components/listing-card";
import Loader from "@/components/loader";
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
	loader: async ({ context: { trpc, queryClient } }) => {
		await queryClient.ensureQueryData(
			trpc.listing.getMyListings.queryOptions(),
		);
	},
	pendingComponent: Loader,
	component: ListingsRoute,
});

function ListingsRoute() {
	const { data: session, isPending } = authClient.useSession();

	const navigate = Route.useNavigate();

	const listingsQuery = useQuery(trpc.listing.getMyListings.queryOptions());
	const listings = listingsQuery.data;
	const deleteMutation = useMutation(
		trpc.listing.delete.mutationOptions({
			onSuccess: () => {
				listingsQuery.refetch();
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

	if (!listings) {
		return (
			<div className="mx-auto w-full max-w-md py-10">
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-gray-500">Listings not found</p>
					</CardContent>
				</Card>
			</div>
		);
	}

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
					<div className="grid gap-4">
						{listings.map((listing) => (
							<ListingCard
								key={listing.id}
								listing={listing}
								showActions={true}
								onDelete={handleDeleteListing}
							/>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
