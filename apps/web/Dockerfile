FROM node:23-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

COPY apps/web/package.json .

# Install dependencies
# RUN pnpm install --frozen-lockfile
RUN pnpm install

# Copy source code
COPY apps/web .

# Build the application
RUN pnpm build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy built files to nginx
COPY --from=base /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]