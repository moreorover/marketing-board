import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		const session = await context.queryClient.ensureQueryData({
			queryKey: ["session"],
			queryFn: () => authClient.getSession(),
			staleTime: 5 * 60 * 1000, // 5 minutes
		});

		if (!session.data) {
			throw redirect({ to: "/" });
		}

		return { auth: session.data };
	},
});
