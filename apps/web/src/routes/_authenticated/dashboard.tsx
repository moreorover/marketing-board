import {useQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {useAuth} from "@/hooks/useAuth";
import {trpc} from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = useAuth();

	const privateData = useQuery(trpc.privateData.queryOptions());
	const random_postcode = useQuery(trpc.postcodes.getRandom.queryOptions());
	const lookup = useQuery(trpc.postcodes.lookup.queryOptions({postcode: "E17DB"}));

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {user.name}</p>
			<p>privateData: {privateData.data?.message}</p>
			<p>random postcode: {JSON.stringify(random_postcode.data, null, 2)}</p>
			<p>lookup `E1 7DB`: {JSON.stringify(lookup.data, null, 2)}</p>
		</div>
	);
}
