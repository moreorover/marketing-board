import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
});

export const authQueries = {
	user: () =>
		queryOptions({
			queryKey: ["user"],
			queryFn: () => authClient.getSession(),
			staleTime: 5000,
		}),
};

export const useAuthentication = () => {
	const { data: userSession } = useSuspenseQuery(authQueries.user());

	return { userSession, isAuthenticated: !!userSession };
};

export const useAuthenticatedUser = () => {
	const { userSession } = useAuthentication();

	if (!userSession) {
		throw new Error("User is not authenticated!");
	}

	return userSession;
};
