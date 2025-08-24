# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands

- `pnpm dev` - Start all applications in development mode (web on :3001, server on :3000)
- `pnpm build` - Build all applications for production
- `pnpm check` - Run Biome linting and formatting with auto-fix
- `pnpm check-types` - Type check all applications

### Application-Specific Commands

- `pnpm dev:web` - Start only the web application (React + Vite)
- `pnpm dev:server` - Start only the server (Hono + tRPC)

### Database Commands

- `pnpm db:push` - Push schema changes to PostgreSQL database
- `pnpm db:studio` - Open Drizzle Studio for database management
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:start` - Start PostgreSQL via Docker Compose
- `pnpm db:watch` - Start PostgreSQL in watch mode (foreground)
- `pnpm db:stop` - Stop PostgreSQL containers
- `pnpm db:down` - Remove PostgreSQL containers

### Testing and Quality

After making code changes, always run:

1. `pnpm check` - Format and lint code
2. `pnpm check-types` - Verify TypeScript types
3. `pnpm build` - Ensure production build works

## Architecture Overview

### Monorepo Structure

This is a Turborepo monorepo with two main applications:

- `apps/web/` - Frontend React application using TanStack Router
- `apps/server/` - Backend API using Hono and tRPC

### Technology Stack

**Frontend (apps/web/):**

- React 19 with TypeScript
- TanStack Router for file-based routing with type safety
- TailwindCSS 4.x with shadcn/ui components
- Vite for build tooling
- tRPC client for type-safe API calls
- Better Auth React client for authentication

**Backend (apps/server/):**

- Hono web framework with Node.js
- tRPC for type-safe API endpoints
- Drizzle ORM with PostgreSQL
- Better Auth for authentication
- Docker Compose for local database

### Key Architectural Patterns

**Authentication Flow:**

- Better Auth handles email/password authentication
- Server exports auth handlers at `/api/auth/**`
- Client uses `authClient` from `apps/web/src/lib/auth-client.ts`
- Protected tRPC procedures use `protectedProcedure` from `apps/server/src/lib/trpc.ts`

**API Communication:**

- All API calls go through tRPC for end-to-end type safety
- tRPC client configured in `apps/web/src/utils/trpc.ts`
- Server router defined in `apps/server/src/routers/index.ts`
- Context creation in `apps/server/src/lib/context.ts` handles session management

**Database Schema:**

- Drizzle schema files in `apps/server/src/db/schema/`
- Auth tables: `user`, `session`, `account`, `verification`
- Todo tables: defined in `apps/server/src/db/schema/todo.ts`
- Listing tables: defined in `apps/server/src/db/schema/listing.ts`

**Routing:**

- TanStack Router with file-based routing in `apps/web/src/routes/`
- Route tree auto-generated in `routeTree.gen.ts` (excluded from version control)
- Root route in `__root.tsx` provides global layout and context

### Environment Setup

- Server requires PostgreSQL connection details in `apps/server/.env`
- Web app requires `VITE_SERVER_URL` pointing to server
- Better Auth needs `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
- CORS configured via `CORS_ORIGIN` environment variable

### Code Style

- Uses Biome for formatting and linting (tab indentation, double quotes)
- TypeScript strict mode enabled
- shadcn/ui component patterns with `cn()` utility for class merging
- tRPC procedures follow `publicProcedure` vs `protectedProcedure` pattern

### Error Handling

- tRPC client includes automatic error handling with toast notifications in `apps/web/src/utils/trpc.ts`
- Query cache configured to show error toasts with retry functionality
- Protected procedures throw `UNAUTHORIZED` errors when session is missing

### Development Notes

- Route tree (`routeTree.gen.ts`) is auto-generated and excluded from version control
- TanStack Router and React Query devtools are enabled in development mode
- Server uses `tsx watch` for hot reloading during development
- Web application uses Vite's HMR for fast development feedback