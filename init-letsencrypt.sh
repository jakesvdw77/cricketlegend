#!/bin/bash
# First-run script to obtain a Let's Encrypt certificate for cricketlegend.co.za.
# Run this ONCE on the server before starting the stack normally.
# Usage: sudo bash init-letsencrypt.sh [--staging]

set -e

DOMAIN="cricketlegend.co.za"
EMAIL="admin@cricketlegend.co.za"   # <-- change to a real contact email
STAGING=${1:-""}                    # pass --staging to test without rate-limits

# ── 1. Create dummy cert so nginx can start ───────────────────────────────────
echo "### Creating temporary self-signed certificate..."
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out    /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
    -subj   '/CN=localhost'" \
  certbot

# ── 2. Start nginx with the dummy cert ───────────────────────────────────────
echo "### Starting nginx..."
docker compose up --detach ui

# ── 3. Obtain the real certificate ───────────────────────────────────────────
STAGING_FLAG=""
if [ "$STAGING" = "--staging" ]; then
  STAGING_FLAG="--staging"
  echo "### Running in STAGING mode (no rate limits, cert not trusted)"
fi

echo "### Requesting Let's Encrypt certificate for ${DOMAIN}..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot \
    -w /var/www/certbot \
    ${STAGING_FLAG} \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${DOMAIN} \
    -d www.${DOMAIN}" \
  certbot

# ── 4. Reload nginx with the real cert ───────────────────────────────────────
echo "### Reloading nginx..."
docker compose exec ui nginx -s reload

echo ""
echo "Done! Certificate obtained for ${DOMAIN}."
echo "Start the full stack with: docker compose up -d"
