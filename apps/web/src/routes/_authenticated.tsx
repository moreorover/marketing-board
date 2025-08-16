import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		if (!context.auth?.session.id && !context.auth?.user.id) {
			throw redirect({ to: "/" });
		}
	},
});
