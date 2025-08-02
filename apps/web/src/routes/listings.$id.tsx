import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/listings/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/listings/$id"!</div>;
}
