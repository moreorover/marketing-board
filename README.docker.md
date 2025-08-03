# Docker Deployment Guide

This guide explains how to deploy the marketing-board application using Docker with SSL certificates via Caddy.

## Prerequisites

- Docker and Docker Compose installed
- A domain name pointing to your server
- Ports 80 and 443 available on your server

## Quick Start

1. **Clone and configure environment:**
   ```bash
   git clone <your-repo>
   cd marketing-board
   cp .env.example .env
   ```

2. **Edit `.env` file with your configuration:**
   ```bash
   # Required: Replace with your actual domain
   DOMAIN=yourdomain.com
   BETTER_AUTH_URL=https://yourdomain.com
   CORS_ORIGIN=https://yourdomain.com
   VITE_SERVER_URL=https://yourdomain.com
   
   # Required: Set secure passwords
   POSTGRES_PASSWORD=your_secure_database_password
   BETTER_AUTH_SECRET=your_very_long_random_secret_key_here
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database:**
   ```bash
   # Wait for services to be healthy, then run migrations
   docker-compose exec server pnpm db:push
   ```

## Services

The Docker Compose setup includes:

- **PostgreSQL** (port 5432) - Database
- **Server** (port 3000) - Hono + tRPC API
- **Web** (port 3001) - React frontend served by Nginx  
- **Caddy** (ports 80/443) - Reverse proxy with automatic SSL

## SSL Certificates

Caddy automatically obtains and renews SSL certificates from Let's Encrypt for your domain. No manual certificate management required.

## Monitoring

Check service health:
```bash
docker-compose ps
docker-compose logs -f [service-name]
```

## Updating

```bash
docker-compose pull
docker-compose up -d --build
```

## Production Considerations

- Ensure `.env` file is not committed to version control
- Use strong passwords for `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET`
- Consider using Docker secrets for sensitive data
- Set up proper backup procedures for the PostgreSQL volume
- Monitor logs and set up log rotation