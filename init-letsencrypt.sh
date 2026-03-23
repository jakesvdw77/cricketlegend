#!/bin/bash
# First-run script to obtain a Let's Encrypt certificate for cricketlegend.co.za.
# Run this ONCE on the server before starting the stack normally.
# Usage: sudo bash init-letsencrypt.sh [--staging]

set -e

DOMAIN="cricketlegend.co.za"
EMAIL="admin@cricketlegend.co.za"   # <-- change to a real contact email
STAGING_FLAG=""
if [ "${1}" = "--staging" ]; then
  STAGING_FLAG="--staging"
  echo "### Running in STAGING mode (cert not browser-trusted, no rate limits)"
fi

# ── 1. Bring everything down cleanly ─────────────────────────────────────────
echo "### Stopping any running containers..."
docker-compose down

# ── 2. Create dummy cert so nginx can start ───────────────────────────────────
echo "### Creating temporary self-signed certificate..."
docker-compose run --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/${DOMAIN} &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out    /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
    -subj '/CN=localhost'
"
docker-compose rm -f certbot

# ── 3. Start nginx (and the rest of the stack) with the dummy cert ────────────
echo "### Starting stack..."
docker-compose up --detach --no-deps ui backend db keycloak-db keycloak
echo "### Waiting for nginx to be ready..."
sleep 5

# ── 4. Obtain the real certificate via ACME webroot challenge ─────────────────
echo "### Requesting Let's Encrypt certificate for ${DOMAIN}..."
docker-compose run --entrypoint sh certbot -c "
  certbot certonly --webroot \
    -w /var/www/certbot \
    ${STAGING_FLAG} \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${DOMAIN} \
    -d www.${DOMAIN}
"
docker-compose rm -f certbot

# ── 5. Reload nginx with the real cert ───────────────────────────────────────
echo "### Reloading nginx..."
docker-compose exec ui nginx -s reload

# ── 6. Start certbot renewal loop ─────────────────────────────────────────────
docker-compose up --detach certbot

echo ""
echo "Done! Certificate obtained for ${DOMAIN}."
echo "The app is running at https://${DOMAIN}"
