import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data?.user.id) {
			throw redirect({ to: "/" });
		}
	},
});
