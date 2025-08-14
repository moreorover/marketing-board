import type { Context as HonoContext } from "hono";
import { auth } from "./auth";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});

	const ip =
		context.req.header("CF-Connecting-IP") ||
		context.req.header("x-forwarded-for") ||
		context.req.header("x-real-ip");

	return {
		session,
		ip,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
