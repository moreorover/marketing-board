FROM node:23-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

COPY apps/server/package.json .

# Install dependencies
# RUN pnpm install --frozen-lockfile
RUN pnpm install

# Copy source code
COPY apps/server .

# Build the application
RUN pnpm build

# Production stage
FROM node:23-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY apps/server/package.json .

# Install production dependencies only
# RUN pnpm install --frozen-lockfile --prod
RUN pnpm install --prod

# Copy built application
COPY --from=base /app/dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]