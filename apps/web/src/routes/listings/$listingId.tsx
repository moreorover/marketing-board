import { createFileRoute } from "@tanstack/react-router";
import Loader from "@/components/loader";

export const Route = createFileRoute("/listings/$listingId")({
	loader: async ({ context: { trpc, queryClient }, params: { listingId } }) => {
		await queryClient.ensureQueryData(trpc.listing.qu);
	},
	pendingComponent: Loader,
	component: RouteComponent,
});

function RouteComponent() {
	const { listingId } = Route.useParams();
	return <div>{listingId}</div>;
}
