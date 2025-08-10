import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { useState } from "react";
import Loader from "@/components/loader";
import { PhoneRevealButton } from "@/components/phone-reveal-button";
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

export const Route = createFileRoute("/listings/$listingId/")({
	loader: async ({ context: { trpc, queryClient }, params: { listingId } }) => {
		await queryClient.ensureQueryData(
			trpc.listing.getById.queryOptions({ listingId }),
		)
	},
	pendingComponent: Loader,
	component: RouteComponent,
});

function RouteComponent() {
	const { listingId } = Route.useParams();
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const { data: session } = authClient.useSession();

	const listingQuery = useQuery(
		trpc.listing.getById.queryOptions({ listingId }),
	)
	const listing = listingQuery.data?.[0];

	// Check if current user owns this listing
	const isOwner = session?.user?.id && listing?.userId === session.user.id;

	if (!listing) {
		return <Loader />;
	}

	const images = listing.images || [];
	const hasImages = images.length > 0;

	const nextImage = () => {
		setCurrentImageIndex((prev) => (prev + 1) % images.length);
	}

	const prevImage = () => {
		setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
	}

	return (
		<div className="mx-auto w-full max-w-4xl py-10">
			<div className="mb-6 flex items-center justify-between">
				<Link to="/listings">
					<Button variant="ghost" className="p-0">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Listings
					</Button>
				</Link>
				
				{isOwner && images.length > 1 && (
					<Link to="/listings/$listingId/edit" params={{ listingId }}>
						<Button variant="outline" size="sm">
							<Edit className="mr-2 h-4 w-4" />
							Edit Main Image
						</Button>
					</Link>
				)}
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Image Gallery */}
				{hasImages && (
					<div className="space-y-4">
						{/* Main Image */}
						<div className="relative">
							<img
								src={images[currentImageIndex].url}
								alt={`${listing.title} - ${currentImageIndex + 1}`}
								className="h-96 w-full rounded-lg object-cover"
							/>
							{images.length > 1 && (
								<>
									<Button
										variant="secondary"
										size="icon"
										className="-translate-y-1/2 absolute top-1/2 left-2 transform"
										onClick={prevImage}
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										variant="secondary"
										size="icon"
										className="-translate-y-1/2 absolute top-1/2 right-2 transform"
										onClick={nextImage}
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</>
							)}
							{images.length > 1 && (
								<div className="-translate-x-1/2 absolute bottom-2 left-1/2 transform">
									<div className="flex space-x-1 rounded-full bg-black/50 px-2 py-1">
										{images.map((_, index) => (
											<Button
												key={images[index].url}
												className={`h-2 w-2 rounded-full ${
													index === currentImageIndex
														? "bg-white"
														: "bg-white/50"
												}`}
												onClick={() => setCurrentImageIndex(index)}
											/>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Thumbnail Gallery */}
						{images.length > 1 && (
							<div className="grid grid-cols-4 gap-2">
								{images.map((image, index) => (
									<Button
										key={images[index].url}
										onClick={() => setCurrentImageIndex(index)}
										className={`relative h-20 overflow-hidden rounded-md ${
											index === currentImageIndex
												? "ring-2 ring-primary"
												: "opacity-70 hover:opacity-100"
										}`}
									>
										<img
											src={image.url}
											alt={"Thumbnail ${index + 1}"}
											className="h-full w-full object-cover"
										/>
									</Button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Listing Details */}
				<div className={hasImages ? "space-y-6" : "lg:col-span-2 space-y-6"}>
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

					{/* Phone Reveal Section */}
					<PhoneRevealButton listingId={listing.id} />
				</div>
			</div>
		</div>
	)
}
