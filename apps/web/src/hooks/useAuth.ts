import { useRouteContext } from "@tanstack/react-router";
import type { Session, User } from "better-auth";

export function useAuth() {
	// Get auth from the _authenticated layout
	const { auth } = useRouteContext({ from: "/_authenticated" });

	return {
		session: auth.session as Session,
		user: auth.user as User,
		isAuthenticated: true, // Always true in authenticated routes
	};
}
