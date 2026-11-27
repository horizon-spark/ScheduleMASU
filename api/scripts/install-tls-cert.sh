#!/usr/bin/env sh
# Установка доверенного TLS-сертификата для nginx.
#
# Использование:
#   ./scripts/install-tls-cert.sh <fullchain.pem> <privkey.pem> [ca-root.pem]
#
# fullchain.pem — лист + промежуточные сертификаты (без корневого).
# privkey.pem   — приватный ключ без пароля.
# ca-root.pem   — опционально: корневой сертификат для проверки цепочки.
#
# После установки перезапустите nginx с TLS-оверлеем:
#   docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --no-build
set -eu

usage() {
  echo "Usage: $0 <fullchain.pem> <privkey.pem> [ca-root.pem]" >&2
  exit 1
}

[ "$#" -ge 2 ] || usage

CERT_SRC="$1"
KEY_SRC="$2"
CA_SRC="${3:-}"

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CERT_DIR="$ROOT/nginx/certs"

[ -f "$CERT_SRC" ] || {
  echo "Certificate not found: $CERT_SRC" >&2
  exit 1
}
[ -f "$KEY_SRC" ] || {
  echo "Private key not found: $KEY_SRC" >&2
  exit 1
}

openssl x509 -in "$CERT_SRC" -noout >/dev/null
openssl pkey -in "$KEY_SRC" -noout >/dev/null

if [ -n "$CA_SRC" ]; then
  [ -f "$CA_SRC" ] || {
    echo "CA root not found: $CA_SRC" >&2
    exit 1
  }
  echo "Verifying certificate chain against $CA_SRC"
  openssl verify -CAfile "$CA_SRC" "$CERT_SRC"
fi

# Публичные ключи сертификата и ключа должны совпадать.
CERT_PUB="$(
  openssl x509 -in "$CERT_SRC" -noout -pubkey |
    openssl pkey -pubin -outform der |
    openssl dgst -sha256 |
    awk '{print $NF}'
)"
KEY_PUB="$(
  openssl pkey -in "$KEY_SRC" -pubout -outform der |
    openssl dgst -sha256 |
    awk '{print $NF}'
)"

if [ "$CERT_PUB" != "$KEY_PUB" ]; then
  echo "Certificate and private key do not match" >&2
  exit 1
fi

umask 077
install -d -m 700 "$CERT_DIR"
install -m 600 "$CERT_SRC" "$CERT_DIR/fullchain.pem"
install -m 600 "$KEY_SRC" "$CERT_DIR/privkey.pem"

echo
echo "Installed certificate:"
openssl x509 -in "$CERT_DIR/fullchain.pem" -noout \
  -subject -issuer -dates -ext subjectAltName

echo
echo "Next steps:"
echo "  1. Ensure /etc/schedulemasu/deploy.env has:"
echo "     COMPOSE_FILES=\"-f docker-compose.yml -f docker-compose.tls.yml\""
echo "  2. Recreate nginx:"
echo "     cd $ROOT && docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --no-build"
echo "  3. Check:"
echo "     curl https://srv-project.mspu.edu.ru/health"
