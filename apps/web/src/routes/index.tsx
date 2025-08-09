import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Loader2 } from "lucide-react";
import Loader from "@/components/loader";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
	loader: async ({ context: { trpc, queryClient } }) => {
		await queryClient.ensureQueryData(trpc.listing.getPublic.queryOptions());
	},
	pendingComponent: Loader,
	component: HomeComponent,
});

function HomeComponent() {
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());
	const listings = useQuery(trpc.listing.getPublic.queryOptions());

	return (
		<div className="flex min-h-[100vh] flex-col">
			<div className="container mx-auto max-w-3xl flex-1 px-4 py-2">
				<div className="grid gap-6">
					<section>
						<div className="mb-4 flex items-center justify-between">
							<h2 className="font-semibold text-xl">Recent Listings</h2>
							<Link to="/listings">
								<Button variant="outline" size="sm">
									View All
									<ArrowUpRight className="ml-1 h-4 w-4" />
								</Button>
							</Link>
						</div>

						{listings.isLoading ? (
							<div className="flex justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin" />
							</div>
						) : listings.data?.length === 0 ? (
							<Card>
								<CardContent className="py-8 text-center">
									<p className="text-muted-foreground">No listings yet.</p>
									<Link to="/listings/new">
										<Button className="mt-2">Create Your First Listing</Button>
									</Link>
								</CardContent>
							</Card>
						) : (
							<div className="grid gap-4">
								{listings.data?.slice(0, 3).map((listing) => (
									<ListingCard key={listing.id} listing={listing} />
								))}
							</div>
						)}
					</section>
				</div>
			</div>

			<footer className="border-t bg-muted/50 py-4">
				<div className="container mx-auto max-w-3xl px-4">
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">API Status:</span>
						<div
							className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{healthCheck.isLoading
								? "Checking..."
								: healthCheck.data
									? "Connected"
									: "Disconnected"}
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
