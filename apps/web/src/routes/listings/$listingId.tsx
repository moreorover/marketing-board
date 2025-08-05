import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import Loader from "@/components/loader";
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
	return (
		<div>
			<div>{listingId}</div>
			<div>{JSON.stringify(listing, null, 2)}</div>
		</div>
	);
}
