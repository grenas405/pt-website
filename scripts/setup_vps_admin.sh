#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/setup_vps_admin.sh [options] [--stdin]

Creates or updates the admin password in the same Deno KV file used by the VPS
service. Run this from the repo on the VPS as the normal deploy user.

Options:
  --kv-path PATH    KV file path. Default: /var/lib/praxedis-technologies/site.kv
  --env-file PATH   Service env file. Default: /etc/praxedis-technologies.env
  --service NAME    systemd service name. Default: praxedis-technologies
  --deno PATH       Deno binary path. Default: deno on PATH, then ~/.deno/bin/deno
  --no-secret       Do not create ADMIN_SESSION_SECRET in the env file
  --no-restart      Do not restart the service after creating the secret
  --stdin           Read password and confirmation from stdin
  -h, --help        Show this help

Environment overrides:
  KV_PATH, ENV_FILE, SERVICE_NAME, DENO_BIN, OWNER, GROUP
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

KV_PATH="${KV_PATH:-/var/lib/praxedis-technologies/site.kv}"
ENV_FILE="${ENV_FILE:-/etc/praxedis-technologies.env}"
SERVICE_NAME="${SERVICE_NAME:-praxedis-technologies}"
DENO_BIN="${DENO_BIN:-}"
OWNER="${OWNER:-$(stat -c '%U' "$repo_root")}"
GROUP="${GROUP:-$(stat -c '%G' "$repo_root")}"
create_secret=1
restart_after_secret=1
deno_script_args=()

while (($# > 0)); do
  case "$1" in
    --kv-path)
      [[ $# -ge 2 ]] || die "--kv-path requires a path"
      KV_PATH="$2"
      shift 2
      ;;
    --env-file)
      [[ $# -ge 2 ]] || die "--env-file requires a path"
      ENV_FILE="$2"
      shift 2
      ;;
    --service)
      [[ $# -ge 2 ]] || die "--service requires a name"
      SERVICE_NAME="$2"
      shift 2
      ;;
    --deno)
      [[ $# -ge 2 ]] || die "--deno requires a path"
      DENO_BIN="$2"
      shift 2
      ;;
    --no-secret)
      create_secret=0
      shift
      ;;
    --no-restart)
      restart_after_secret=0
      shift
      ;;
    --stdin)
      deno_script_args+=("--stdin")
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

if [[ -z "$DENO_BIN" ]]; then
  if command -v deno >/dev/null 2>&1; then
    DENO_BIN="$(command -v deno)"
  elif [[ -x "$HOME/.deno/bin/deno" ]]; then
    DENO_BIN="$HOME/.deno/bin/deno"
  elif [[ -x "/home/$OWNER/.deno/bin/deno" ]]; then
    DENO_BIN="/home/$OWNER/.deno/bin/deno"
  else
    die "deno was not found; install Deno or pass --deno /path/to/deno"
  fi
fi

[[ -x "$DENO_BIN" ]] || die "Deno binary is not executable: $DENO_BIN"

sudo_cmd=()
if [[ "$(id -u)" -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || die "sudo is required for /etc and /var setup"
  sudo_cmd=(sudo)
fi

kv_dir="$(dirname "$KV_PATH")"

if [[ "$KV_PATH" != ":memory:" ]]; then
  echo "Preparing KV directory: $kv_dir"
  "${sudo_cmd[@]}" install -d -m 700 -o "$OWNER" -g "$GROUP" "$kv_dir"
fi

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48
  else
    "$DENO_BIN" eval 'const b = new Uint8Array(48); crypto.getRandomValues(b); console.log(btoa(String.fromCharCode(...b)));'
  fi
}

env_changed=0
if [[ "$create_secret" -eq 1 ]]; then
  if "${sudo_cmd[@]}" test -f "$ENV_FILE" &&
    "${sudo_cmd[@]}" grep -q '^ADMIN_SESSION_SECRET=' "$ENV_FILE"; then
    echo "ADMIN_SESSION_SECRET already exists in $ENV_FILE"
  else
    echo "Creating ADMIN_SESSION_SECRET in $ENV_FILE"
    secret="$(generate_secret)"
    printf '%s\n' "$secret" | "${sudo_cmd[@]}" env \
      ENV_FILE="$ENV_FILE" \
      sh -c '
        IFS= read -r ADMIN_SESSION_SECRET_VALUE
        umask 077
        touch "$ENV_FILE"
        if ! grep -q "^ADMIN_SESSION_SECRET=" "$ENV_FILE"; then
          printf "ADMIN_SESSION_SECRET=%s\n" "$ADMIN_SESSION_SECRET_VALUE" >> "$ENV_FILE"
        fi
        chmod 600 "$ENV_FILE"
      '
    env_changed=1
  fi
fi

deno_prefix=(env "KV_PATH=$KV_PATH")
if [[ "$(id -u)" -eq 0 && "$OWNER" != "root" ]]; then
  if command -v sudo >/dev/null 2>&1; then
    deno_prefix=(sudo -H -u "$OWNER" env "KV_PATH=$KV_PATH")
  elif command -v runuser >/dev/null 2>&1; then
    deno_prefix=(runuser -u "$OWNER" -- env "KV_PATH=$KV_PATH")
  fi
fi

echo "Creating admin password in KV: $KV_PATH"
(
  cd "$repo_root"
  "${deno_prefix[@]}" "$DENO_BIN" run \
    --unstable-kv \
    "--allow-read=/tmp,$kv_dir" \
    "--allow-write=/tmp,$kv_dir" \
    --allow-env=PORT,PUBLIC_DIR,HOST,ALLOWED_HOSTS,DENO_DIR,KV_PATH \
    scripts/create_admin_password.ts \
    "${deno_script_args[@]}"
)

if [[ "$env_changed" -eq 1 && "$restart_after_secret" -eq 1 ]]; then
  if command -v systemctl >/dev/null 2>&1 &&
    "${sudo_cmd[@]}" systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then
    echo "Restarting service: $SERVICE_NAME"
    "${sudo_cmd[@]}" systemctl restart "$SERVICE_NAME"
  else
    echo "Service not found; restart it later with: sudo systemctl restart $SERVICE_NAME"
  fi
fi

echo "Done."
