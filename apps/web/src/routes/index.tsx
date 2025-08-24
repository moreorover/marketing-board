import {useQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Loader2} from "lucide-react";
import {ListingCard} from "@/components/listing-card";
import Loader from "@/components/loader";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import {trpc} from "@/utils/trpc";

export const Route = createFileRoute("/")({
	loader: async ({ context: { trpc, queryClient } }) => {
		await queryClient.ensureQueryData(trpc.listing.getPublic.queryOptions());
		await queryClient.ensureQueryData(trpc.healthCheck.queryOptions());
	},
	pendingComponent: Loader,
	component: HomeComponent,
});

function HomeComponent() {
	const version = __APP_VERSION__;
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());
	const postcodesIsHealthy = useQuery(trpc.postcodes.isHealthy.queryOptions());
	const listings = useQuery(trpc.listing.getPublic.queryOptions());

	return (
		<div className="flex min-h-[100vh] flex-col">
			<div className="container mx-auto max-w-3xl flex-1 px-4 py-2">
				<div className="grid gap-6">
					<section>
						<div className="mb-4 flex items-center justify-between">
							<h2 className="font-semibold text-xl">Recent Listings</h2>
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
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<span className="text-muted-foreground text-xs">v{version}</span>
						</div>

						<div className="flex items-center gap-4">
							<span className="text-muted-foreground text-xs">API Status</span>
							{/* Main API Status */}
							<div className="flex items-center gap-1.5">
								<div
									className={cn(
										"h-1.5 w-1.5 rounded-full transition-colors",
										healthCheck.isLoading && "animate-pulse bg-yellow-500",
										healthCheck.data && "bg-green-500",
										!healthCheck.data && !healthCheck.isLoading && "bg-red-500",
									)}
								/>
								<span className="text-muted-foreground text-xs">API</span>
							</div>

							{/* Postcodes API Status */}
							<div className="flex items-center gap-1.5">
								<div
									className={cn(
										"h-1.5 w-1.5 rounded-full transition-colors",
										postcodesIsHealthy.isLoading &&
											"animate-pulse bg-yellow-500",
										postcodesIsHealthy.data && "bg-green-500",
										!postcodesIsHealthy.data && "bg-red-500",
										postcodesIsHealthy.error && "bg-red-500",
									)}
								/>
								<span className="text-muted-foreground text-xs">Postcodes</span>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
