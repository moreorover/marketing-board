import type { Context as HonoContext } from "hono";
import { auth } from "./auth";
import { getConnInfo } from '@hono/node-server/conninfo'

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const info = getConnInfo(context);

  console.log(`info ${JSON.stringify(info)}`);

  console.log(`x-forwarded-for ${context.req.header("x-forwarded-for")}`)
  console.log(`x-real-ip ${context.req.header("x-real-ip")}`)

  const ip = context.req.header("x-forwarded-for") || 
            context.req.header("x-real-ip");
  
  return {
    session,
    ip,
  };
}


export type Context = Awaited<ReturnType<typeof createContext>>;
