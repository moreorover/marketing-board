import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/listings/")({
	component: ListingsRoute,
});

function ListingsRoute() {
	const [newListingTitle, setNewListingTitle] = useState("");

	const listings = useQuery(trpc.listing.getAll.queryOptions());
	const createMutation = useMutation(
		trpc.listing.create.mutationOptions({
			onSuccess: () => {
				listings.refetch();
				setNewListingTitle("");
			},
			onError: () => {
				toast.error("Was unable to create listing.");
			},
		}),
	)
	const deleteMutation = useMutation(
		trpc.listing.delete.mutationOptions({
			onSuccess: () => {
				listings.refetch();
			},
		}),
	)

	const handleAddListing = (e: React.FormEvent) => {
		e.preventDefault();
		if (newListingTitle.trim()) {
			createMutation.mutate({ title: newListingTitle, description: "xxxx" });
		}
	}

	const handleDeleteListing = (id: string) => {
		deleteMutation.mutate({ id });
	}

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Listings</CardTitle>
					<CardDescription>Manage your listings efficiently</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={handleAddListing}
						className="mb-6 flex items-center space-x-2"
					>
						<Input
							value={newListingTitle}
							onChange={(e) => setNewListingTitle(e.target.value)}
							placeholder="Add a new listing..."
							disabled={createMutation.isPending}
						/>
						<Button
							type="submit"
							disabled={createMutation.isPending || !newListingTitle.trim()}
						>
							{createMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Add"
							)}
						</Button>
					</form>

					{listings.isLoading ? (
						<div className="flex justify-center py-4">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : listings.data?.length === 0 ? (
						<p className="py-4 text-center">No listings yet. Add one above!</p>
					) : (
						<ul className="space-y-2">
							{listings.data?.map((listing) => (
								<li
									key={listing.id}
									className="flex items-center justify-between rounded-md border p-2"
								>
									<div className="flex items-center space-x-2">
										<label htmlFor={`todo-${listing.id}`}>
											{listing.title}
										</label>
									</div>
									<Link to="/listings/$id" params={{ id: listing.id }}>
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
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
