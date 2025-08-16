import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = useAuth();

	const privateData = useQuery(trpc.privateData.queryOptions());

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {user.name}</p>
			<p>privateData: {privateData.data?.message}</p>
		</div>
	);
}
