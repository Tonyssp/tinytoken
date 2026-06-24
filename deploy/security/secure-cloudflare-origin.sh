#!/usr/bin/env bash
set -euo pipefail

DOMAIN="tinyapi.org"
BACKEND="http://127.0.0.1:3000"
STAMP="$(date +%Y%m%d-%H%M%S)"
CF_V4_FILE="/etc/nginx/cloudflare-ips-v4.txt"
CF_V6_FILE="/etc/nginx/cloudflare-ips-v6.txt"
CF_REALIP_CONF="/etc/nginx/conf.d/cloudflare-realip.conf"
RATE_CONF="/etc/nginx/conf.d/tinyapi-rate-limit.conf"
SITE_CONF="/etc/nginx/sites-available/tinyapi.org"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ufw curl nginx

curl -fsSL https://www.cloudflare.com/ips-v4 -o "${CF_V4_FILE}.new"
curl -fsSL https://www.cloudflare.com/ips-v6 -o "${CF_V6_FILE}.new"
test -s "${CF_V4_FILE}.new"
test -s "${CF_V6_FILE}.new"
mv "${CF_V4_FILE}.new" "$CF_V4_FILE"
mv "${CF_V6_FILE}.new" "$CF_V6_FILE"

mkdir -p /root/tinyapi-security-backup
cp -a /etc/nginx "/root/tinyapi-security-backup/nginx-${STAMP}"
ufw status verbose > "/root/tinyapi-security-backup/ufw-${STAMP}.txt" || true

{
  echo "# Generated from Cloudflare's official IP lists."
  while read -r cidr; do
    [ -n "$cidr" ] && echo "set_real_ip_from $cidr;"
  done < "$CF_V4_FILE"
  while read -r cidr; do
    [ -n "$cidr" ] && echo "set_real_ip_from $cidr;"
  done < "$CF_V6_FILE"
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$CF_REALIP_CONF"

cat > "$RATE_CONF" <<'EOF'
limit_req_zone $binary_remote_addr zone=tinyapi_general:20m rate=100r/s;
limit_req_zone $binary_remote_addr zone=tinyapi_sensitive:10m rate=5r/s;
limit_conn_zone $binary_remote_addr zone=tinyapi_conn:20m;
limit_req_status 429;
limit_conn_status 429;

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
EOF

cat > "$SITE_CONF" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 444;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN} api.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN} www.${DOMAIN} api.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    server_tokens off;
    client_max_body_size 20m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    limit_conn tinyapi_conn 100;

    location ~* ^/(api/(user|oauth|token|login|register)|login|sign-in|sign-up) {
        limit_req zone=tinyapi_sensitive burst=15 nodelay;
        proxy_pass ${BACKEND};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_buffering off;
    }

    location / {
        limit_req zone=tinyapi_general burst=300 nodelay;
        proxy_pass ${BACKEND};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_buffering off;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sfn "$SITE_CONF" /etc/nginx/sites-enabled/tinyapi.org

ufw allow 22/tcp comment 'SSH'
ufw --force delete allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force delete allow 80/tcp >/dev/null 2>&1 || true
ufw --force delete allow 443/tcp >/dev/null 2>&1 || true

while read -r cidr; do
  [ -n "$cidr" ] || continue
  ufw allow proto tcp from "$cidr" to any port 80,443 comment 'Cloudflare only'
done < "$CF_V4_FILE"

while read -r cidr; do
  [ -n "$cidr" ] || continue
  ufw allow proto tcp from "$cidr" to any port 80,443 comment 'Cloudflare only'
done < "$CF_V6_FILE"

ufw default deny incoming
ufw default allow outgoing
ufw --force enable

nginx -t
systemctl reload nginx

test "$(docker inspect -f '{{json .HostConfig.PortBindings}}' tinyapi-app)" = '{"3000/tcp":[{"HostIp":"127.0.0.1","HostPort":"3000"}]}'

echo "SECURITY_SETUP_OK"
ufw status numbered
