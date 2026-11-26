#!/usr/bin/env bash
# Pull-деплой ScheduleMASU для сервера за NAT.
# Запускается systemd-таймером, сам ходит в GHCR и не требует входящих портов.
set -euo pipefail

ENV_FILE="${DEPLOY_ENV_FILE:-/etc/schedulemasu/deploy.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${API_IMAGE:?API_IMAGE is required}"
: "${NGINX_IMAGE:?NGINX_IMAGE is required}"

IMAGE_TAG="${IMAGE_TAG:-production}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.tls.yml}"
PULL_GIT="${PULL_GIT:-1}"
GIT_BRANCH="${GIT_BRANCH:-main}"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-90}"
STATE_FILE="${STATE_FILE:-/var/lib/schedulemasu/deploy.state}"
LOCK_FILE="${LOCK_FILE:-/var/lock/schedulemasu-deploy.lock}"

API_REF="${API_IMAGE}:${IMAGE_TAG}"
NGINX_REF="${NGINX_IMAGE}:${IMAGE_TAG}"

# Compose читает API_IMAGE/NGINX_IMAGE напрямую. Передаём полные имена
# с тегом, иначе compose скачает :latest, а проверка ниже ищет :staging.
export API_IMAGE="$API_REF"
export NGINX_IMAGE="$NGINX_REF"

log() {
  printf '[deploy] %s %s\n' "$(date -Is)" "$*"
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "another deploy is already running"
  exit 0
fi

cd "$DEPLOY_PATH"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  log "logging in to ghcr.io as ${GHCR_USER:?GHCR_USER is required}"
  printf '%s' "$GHCR_TOKEN" |
    docker login ghcr.io --username "$GHCR_USER" --password-stdin >/dev/null
fi

log "pulling ${API_REF} and ${NGINX_REF}"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES pull api nginx

if ! docker image inspect "$API_REF" >/dev/null 2>&1; then
  log "image ${API_REF} not found after pull; check IMAGE_TAG and API_IMAGE"
  exit 1
fi
if ! docker image inspect "$NGINX_REF" >/dev/null 2>&1; then
  log "image ${NGINX_REF} not found after pull; check IMAGE_TAG and NGINX_IMAGE"
  exit 1
fi

NEW_API_ID="$(docker image inspect -f '{{.Id}}' "$API_REF")"
NEW_NGINX_ID="$(docker image inspect -f '{{.Id}}' "$NGINX_REF")"
REVISION="$(
  docker image inspect \
    -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
    "$API_REF" 2>/dev/null || true
)"

if [[ "$PULL_GIT" == "1" ]]; then
  if [[ -n "$REVISION" ]]; then
    log "checking out compose files at ${REVISION}"
    git fetch --prune --tags origin "$GIT_BRANCH"
    git checkout --force "$REVISION"
  else
    log "image has no revision label, updating ${GIT_BRANCH}"
    git fetch --prune origin "$GIT_BRANCH"
    git checkout --force "$GIT_BRANCH"
    git reset --hard "origin/${GIT_BRANCH}"
  fi
fi

CURRENT_API_ID="$(
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES ps -q api |
    xargs -r docker inspect -f '{{.Image}}' 2>/dev/null || true
)"
CURRENT_NGINX_ID="$(
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES ps -q nginx |
    xargs -r docker inspect -f '{{.Image}}' 2>/dev/null || true
)"
PREVIOUS_REVISION="$(cat "$STATE_FILE" 2>/dev/null || true)"

if [ "$CURRENT_API_ID" = "$NEW_API_ID" ] &&
  [ "$CURRENT_NGINX_ID" = "$NEW_NGINX_ID" ] &&
  [ "$PREVIOUS_REVISION" = "$REVISION" ]; then
  log "already up to date (${REVISION:-unknown revision})"
  exit 0
fi

log "recreating containers"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES up -d --no-build --remove-orphans

log "waiting for api health (timeout ${HEALTH_TIMEOUT_SEC}s)"
deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
status="unknown"

while ((SECONDS < deadline)); do
  # shellcheck disable=SC2086
  container_id="$(docker compose $COMPOSE_FILES ps -q api || true)"

  if [[ -n "$container_id" ]]; then
    status="$(
      docker inspect -f '{{.State.Health.Status}}' \
        "$container_id" 2>/dev/null || echo unknown
    )"
  fi

  [[ "$status" == "healthy" ]] && break
  sleep 3
done

if [[ "$status" != "healthy" ]]; then
  log "api is not healthy (status=${status})"
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILES logs --tail=100 api || true
  exit 1
fi

# shellcheck disable=SC2086
nginx_id="$(docker compose $COMPOSE_FILES ps -q nginx || true)"
if [[ -z "$nginx_id" ]] ||
  [[ "$(docker inspect -f '{{.State.Running}}' "$nginx_id" 2>/dev/null)" != "true" ]]; then
  log "nginx is not running"
  exit 1
fi

mkdir -p "$(dirname "$STATE_FILE")"
printf '%s\n' "$REVISION" >"$STATE_FILE"

docker image prune -f >/dev/null || true
log "deployed revision ${REVISION:-unknown} (${API_REF})"
