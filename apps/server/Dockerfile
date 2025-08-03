FROM node:23-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

COPY package.json .
COPY pnpm-*.yaml .
COPY turbo.json .
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (web needs server for type imports)
COPY apps/web ./apps/web
COPY apps/server ./apps/server

# Build the application
RUN pnpm build

# Production stage
FROM node:23-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

COPY package.json .
COPY pnpm-*.yaml .
COPY turbo.json .
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=base /app/apps/server/dist ./apps/server/dist

# Set working directory to the server app where node_modules are accessible
WORKDIR /app/apps/server

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["node", "dist/index.js"]