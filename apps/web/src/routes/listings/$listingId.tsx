import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/$listingId")({
	loader: async ({ context: { trpc, queryClient }, params: { listingId } }) => {
		await queryClient.ensureQueryData(
			trpc.listing.getById.queryOptions({ listingId }),
		);
	},
	pendingComponent: Loader,
	component: RouteComponent,
});

function RouteComponent() {
	const { listingId } = Route.useParams();

	const listingQuery = useQuery(
		trpc.listing.getById.queryOptions({ listingId }),
	);
	const listing = listingQuery.data;

	if (!listing) {
		return <Loader />;
	}

	return (
		<div className="mx-auto w-full max-w-2xl py-10">
			<div className="mb-6">
				<Link to="/listings">
					<Button variant="ghost" className="p-0">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Listings
					</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">{listing.title}</CardTitle>
					{listing.location && (
						<div className="flex items-center text-muted-foreground">
							<span className="mr-1">📍</span>
							<span>{listing.location}</span>
						</div>
					)}
				</CardHeader>
				<CardContent>
					<CardDescription className="text-base leading-relaxed">
						{listing.description}
					</CardDescription>
				</CardContent>
			</Card>
		</div>
	);
}
