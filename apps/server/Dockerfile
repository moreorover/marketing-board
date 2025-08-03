# Stage 1: Build environment
FROM node:23-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (a wildcard is used to ensure both package.json AND package-lock.json are copied)
COPY package*.json ./

# Install production dependencies only (no devDependencies)
#RUN npm ci --only=production
RUN npm i
# Copy source files
COPY . .

# Build the application (if you have a build step)
RUN npm run build

# Stage 2: Production environment
FROM node:23-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json from builder
COPY --from=builder /usr/src/app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /usr/src/app/dist ./dist

# Optional: Copy other necessary files like .env, configs, etc.
# COPY --from=builder /usr/src/app/config ./config

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["node", "./dist/index.js"]