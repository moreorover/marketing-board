import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/profile")({
	component: RouteComponent,
});

function RouteComponent() {
	const { auth } = useRouteContext({ from: "/_authenticated/profile" });

	const privateData = useQuery(trpc.privateData.queryOptions());

	return (
		<div>
			<h1>Profile</h1>
			<p>Welcome {auth.user.name}</p>
			<p>privateData: {privateData.data?.message}</p>
			<p>listings: {privateData.data?.message}</p>
		</div>
	);
}
