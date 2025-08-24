import {useQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {useAuth} from "@/hooks/useAuth";
import {trpc} from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/profile")({
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = useAuth();

	const privateData = useQuery(trpc.privateData.queryOptions());

	return (
		<div>
			<h1>Profile</h1>
			<p>Welcome {user.name}</p>
			<p>privateData: {privateData.data?.message}</p>
			<p>listings: {privateData.data?.message}</p>
		</div>
	);
}
