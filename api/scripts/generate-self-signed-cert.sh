#!/usr/bin/env sh
# Self-signed certificate для локальной проверки TLS.
# Для релиза используйте доверенный сертификат (Let's Encrypt / корпоративный CA).
set -eu

DOMAIN="${1:-schedule.example.ru}"
IP="${2:-}"
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CERT_DIR="$ROOT/nginx/certs"

SAN="DNS:$DOMAIN"
if [ -n "$IP" ]; then
  SAN="$SAN,IP:$IP"
fi

umask 077
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 825 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN" \
  -addext "subjectAltName=$SAN"

chmod 600 "$CERT_DIR/privkey.pem"

echo "Created self-signed certificate for $DOMAIN ($SAN)"
echo "Files: $CERT_DIR/fullchain.pem, $CERT_DIR/privkey.pem"
echo "Use only for testing. Replace with a trusted certificate before release."
