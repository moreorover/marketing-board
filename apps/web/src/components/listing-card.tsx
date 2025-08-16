import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ListingCardProps {
	listing: {
		id: string;
		title: string;
		location: string;
		image: string | null;
	};
	showActions?: boolean;
	onDelete?: (id: string) => void;
}

export function ListingCard({
	listing,
	showActions = false,
	onDelete,
}: ListingCardProps) {
	return (
		<Card key={listing.id}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<CardTitle className="text-lg">{listing.title}</CardTitle>
					<div className="flex items-center space-x-1">
						<Link to="/listings/$listingId" params={{ listingId: listing.id }}>
							<Button variant="ghost" size="icon" aria-label="View listing">
								<ArrowUpRight className="h-4 w-4" />
							</Button>
						</Link>
						{showActions && onDelete && (
							<>
								<Link
									to="/listings/$listingId/edit"
									params={{ listingId: listing.id }}
								>
									<Button variant="ghost" size="icon" aria-label="Edit listing">
										<Pencil className="h-4 w-4" />
									</Button>
								</Link>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => onDelete(listing.id)}
									aria-label="Delete listing"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				{listing.image && (
					<div className="mb-3">
						<img
							src={listing.image}
							alt={listing.title}
							className="h-48 w-full rounded-md object-cover"
						/>
					</div>
				)}
				{listing.location && (
					<p className="text-muted-foreground text-sm">📍 {listing.location}</p>
				)}
			</CardContent>
		</Card>
	);
}
