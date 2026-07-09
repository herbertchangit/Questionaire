# Production Deploy

Production domain:

```text
monsterhurdle.jingjiqingcheng.com
```

The domain currently resolves to:

```text
38.49.217.59
```

## Server Requirements

- Docker Engine
- Docker Compose plugin
- Ports `80` and `443` open from the internet
- SSH access from the deployment machine

## First Deploy

Clone the repo on the server:

```bash
git clone https://github.com/herbertchangit/Questionaire.git monster-hurdle
cd monster-hurdle
```

Create a production `.env` file:

```bash
cat > .env <<'EOF'
JWT_SECRET=replace-with-a-long-random-production-secret-at-least-32-bytes
DB_NAME=monster_huddle
EOF
```

Start the app:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Seed initial demo/admin data if needed:

```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

Verify:

```bash
curl -I http://monsterhurdle.jingjiqingcheng.com
curl http://monsterhurdle.jingjiqingcheng.com/api/health
```

## Update Deploy

```bash
cd monster-hurdle
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## HTTPS

This Compose file exposes the frontend on port `80`. For HTTPS, terminate TLS with one of:

- Cloudflare proxy in front of the domain
- Host-level Nginx/Caddy/Traefik reverse proxy with Let's Encrypt
- A load balancer that forwards HTTPS traffic to port `80`

The frontend uses same-origin `/api` requests, so no separate public backend URL is required.
