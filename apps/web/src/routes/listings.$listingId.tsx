import {useQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {ArrowLeft, ChevronLeft, ChevronRight} from "lucide-react";
import {useState} from "react";
import Loader from "@/components/loader";
import {PhoneRevealButton} from "@/components/phone-reveal-button";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {trpc} from "@/utils/trpc";

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
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	const listingQuery = useQuery(
		trpc.listing.getById.queryOptions({ listingId }),
	);
	const listing = listingQuery.data?.[0];

	if (!listing) {
		return <Loader />;
	}

	const images = listing.images || [];
	const hasImages = images.length > 0;

	const nextImage = () => {
		setCurrentImageIndex((prev) => (prev + 1) % images.length);
	};

	const prevImage = () => {
		setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
	};

	return (
		<div className="mx-auto w-full max-w-4xl py-10">
			<div className="mb-6 flex items-center justify-between">
				<Link to="/listings">
					<Button variant="ghost" className="p-0">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Listings
					</Button>
				</Link>
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
											alt={"Thumbnail"}
											className="h-full w-full object-cover"
										/>
									</Button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Listing Details */}
				<div className={hasImages ? "space-y-6" : "space-y-6 lg:col-span-2"}>
					<Card>
						<CardHeader>
							<CardTitle className="text-2xl">{listing.title}</CardTitle>
							{listing.location && (
								<div className="flex items-center text-muted-foreground">
									<span className="mr-1">📍</span>
									<span>
										{listing.postcodeOutcode}, {listing.city},{" "}
										{listing.location}
									</span>
								</div>
							)}
						</CardHeader>
						<CardContent>
							<CardDescription className="text-base leading-relaxed">
								{listing.description}
							</CardDescription>

							{/* Service Type Badges */}
							{(listing.inCall || listing.outCall) && (
								<div className="mt-4 flex gap-2">
									{listing.inCall && (
										<span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 text-sm">
											In Call
										</span>
									)}
									{listing.outCall && (
										<span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 text-sm">
											Out Call
										</span>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Pricing Section */}
					{listing.pricing && listing.pricing.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Pricing</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid gap-3 sm:grid-cols-2">
									{listing.pricing
										.filter((price) => price.price > 0)
										.map((price) => (
											<div
												key={price.duration}
												className="flex items-center justify-between rounded-lg p-3"
											>
												<span className="font-medium capitalize">
													{price.duration === "15min" && "15 minutes"}
													{price.duration === "30min" && "30 minutes"}
													{price.duration === "1h" && "1 hour"}
													{price.duration === "2h" && "2 hours"}
													{price.duration === "3h" && "3 hours"}
													{price.duration === "24h" && "24 hours"}
												</span>
												<span className="font-semibold text-lg text-primary">
													£{price.price}
												</span>
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Phone Reveal Section */}
					<PhoneRevealButton listingId={listing.id} />
				</div>
			</div>
		</div>
	);
}
