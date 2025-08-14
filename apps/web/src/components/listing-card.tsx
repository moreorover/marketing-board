import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface ListingCardProps {
	listing: {
		id: string;
		title: string;
		description: string;
		location: string;
		images: Array<{ objectKey: string }>;
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
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onDelete(listing.id)}
								aria-label="Delete listing"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				{listing.images && listing.images.length > 0 && (
					<div className="mb-3">
						<img
							src={`https://img.prive.hair/${listing.images[0]}`}
							alt={listing.title}
							className="h-48 w-full rounded-md object-cover"
						/>
					</div>
				)}
				<CardDescription className="mb-2">
					{listing.description}
				</CardDescription>
				{listing.location && (
					<p className="text-muted-foreground text-sm">📍 {listing.location}</p>
				)}
			</CardContent>
		</Card>
	);
}
