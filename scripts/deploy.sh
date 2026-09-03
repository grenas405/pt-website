#!/usr/bin/env bash
#
# deploy.sh — put this checkout into service on the machine it is run on.
#
# The install flows documented in README.md (Production / nginx / systemd), in
# the same order, made idempotent and made to stop at the first thing that goes
# wrong. Running it twice changes nothing the second time; running it against a
# broken tree changes nothing at all, because the verification suite runs
# before anything is installed.
#
#   sudo scripts/deploy.sh
#
# The application runs from this checkout — there is no second copy under /srv
# or /var/www to drift out of step with git, and updating is
# `git pull && sudo scripts/deploy.sh --skip-verify --skip-certbot`.
#
# Nothing here is specific to one host beyond the variables below, and each of
# those can be overridden from the environment:
#
#   SITE_NAME=staging.praxedistechnologies.com sudo -E scripts/deploy.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The checkout is the deployment. OWNER is whoever invoked sudo: they own the
# files and can `git pull` without root. SERVICE is the account the unit runs
# as; by default it is the same login user (the committed unit ships
# User=sysadmin), but a dedicated system account can be named instead.
APP_DIR="${APP_DIR:-$REPO_ROOT}"
OWNER_USER="${OWNER_USER:-${SUDO_USER:-root}}"
OWNER_GROUP="${OWNER_GROUP:-$(id -gn "$OWNER_USER" 2>/dev/null || echo "$OWNER_USER")}"
SERVICE_USER="${SERVICE_USER:-sysadmin}"
SERVICE_GROUP="${SERVICE_GROUP:-$SERVICE_USER}"
SERVICE_NAME="${SERVICE_NAME:-praxedis-technologies}"
SITE_NAME="${SITE_NAME:-praxedistechnologies.com}"

# Deno KV lives outside the checkout, in the unit's StateDirectory, so a
# `git pull` never touches the database and the read-only app tree stays
# read-only.
STATE_DIR="${STATE_DIR:-/var/lib/praxedis-technologies}"
STATE_DIR_NAME="${STATE_DIR##*/}"
KV_PATH="${KV_PATH:-$STATE_DIR/site.kv}"

# Secrets and per-host overrides, read by the unit's EnvironmentFile.
ENV_FILE="${ENV_FILE:-/etc/praxedis-technologies.env}"

# Certificates. CERT_DOMAINS is a space-separated list; the first is the
# lineage name, which is what the vhost names in its ssl_certificate paths, so
# it has to stay in step with SITE_NAME.
CERT_DOMAINS="${CERT_DOMAINS:-$SITE_NAME www.$SITE_NAME}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-pedro.dfedro@gmail.com}"
WEBROOT="${WEBROOT:-/var/www/certbot}"

SKIP_VERIFY=0
SKIP_NGINX=0
SKIP_CERTBOT=0
CERTBOT_STAGING=0
FORCE_RENEWAL=0

UNIT_SRC="$REPO_ROOT/systemd/$SERVICE_NAME.service"
NGINX_SRC="$REPO_ROOT/nginx/$SITE_NAME.conf"

# --- output ----------------------------------------------------------------
# stderr, so that stdout stays empty and the script can be piped without noise.

step() { printf '\n\033[1m==> %s\033[0m\n' "$*" >&2; }
info() { printf '    %s\n' "$*" >&2; }
fail() {
  printf '\n\033[1;31mdeploy failed:\033[0m %s\n' "$*" >&2
  exit 1
}

usage() {
  cat >&2 <<EOF
usage: sudo scripts/deploy.sh [options]

  --skip-verify   Do not run the verification suite first. Only for a redeploy
                  of a tree that was already verified.
  --skip-nginx    Install and restart the service, leave the reverse proxy
                  alone. Use when Nginx lives on another host. Implies
                  --skip-certbot.
  --skip-certbot  Do not touch certificates. The Nginx configuration will
                  still fail to load without them.
  --staging       Issue from Let's Encrypt's staging CA. Untrusted by
                  browsers, but not rate limited — use it to rehearse.
  --force-renewal Renew even though the current certificate is still valid.
                  Rate limited by the CA; do not put this in a loop.
  -h, --help      This text.

Environment: APP_DIR, OWNER_USER, OWNER_GROUP, SERVICE_USER, SERVICE_GROUP,
SERVICE_NAME, SITE_NAME, STATE_DIR, KV_PATH, ENV_FILE, CERT_DOMAINS,
CERTBOT_EMAIL, WEBROOT, DENO.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-verify) SKIP_VERIFY=1 ;;
    --skip-nginx) SKIP_NGINX=1 ;;
    --skip-certbot) SKIP_CERTBOT=1 ;;
    --staging) CERTBOT_STAGING=1 ;;
    --force-renewal) FORCE_RENEWAL=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) fail "unknown option: $1 (try --help)" ;;
  esac
  shift
done

# Certificates exist to be presented by the proxy. If the proxy is somebody
# else's problem on this host, so are they.
[ "$SKIP_NGINX" -eq 0 ] || SKIP_CERTBOT=1

# The lineage is named after the first domain: that is how certbot names the
# directory, and it is the path the vhost reads its key material from.
CERT_NAME="${CERT_DOMAINS%% *}"
CERT_DIR="/etc/letsencrypt/live/$CERT_NAME"

# --- preflight -----------------------------------------------------------------
# Everything that could stop the deployment is checked before the first change,
# so a missing tool is a message rather than a half-installed service.

step "Preflight"

[ "$(id -u)" -eq 0 ] || fail "run with sudo: installing units and reloading nginx needs root"

for f in "$UNIT_SRC" "$APP_DIR/server/main.ts" "$APP_DIR/deno.json"; do
  [ -f "$f" ] || fail "missing $f — run this from a checkout of the repository"
done
if [ "$SKIP_NGINX" -eq 0 ]; then
  [ -f "$NGINX_SRC" ] || fail "missing $NGINX_SRC (SITE_NAME=$SITE_NAME names nginx/$SITE_NAME.conf)"
fi

for cmd in systemctl install sed; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is not installed"
done

id -u "$OWNER_USER" >/dev/null 2>&1 || fail "no such user: $OWNER_USER"
[ "$OWNER_USER" != root ] ||
  fail "refusing to deploy a root-owned checkout — invoke through sudo from a login user, or set OWNER_USER"

# The unit names an absolute interpreter path: a ~/.deno/bin install is
# invisible to systemd once it starts dropping privileges, so resolve a real
# one now. Order matches scripts/setup_vps_admin.sh.
if [ -n "${DENO:-}" ]; then
  :
elif command -v deno >/dev/null 2>&1; then
  DENO="$(command -v deno)"
elif [ -x "/home/$OWNER_USER/.deno/bin/deno" ]; then
  DENO="/home/$OWNER_USER/.deno/bin/deno"
elif [ -x "/usr/bin/deno" ]; then
  DENO="/usr/bin/deno"
else
  fail "no deno found — install it, or pass DENO=/path/to/deno"
fi
[ -x "$DENO" ] || fail "not executable: $DENO"

# ProtectHome=tmpfs would make a /home interpreter vanish inside the unit's
# namespace. The committed unit uses ProtectHome=read-only, but warn if that
# was hardened and the binary still lives under /home.
case "$DENO" in
  /home/*)
    if grep -q '^ProtectHome=tmpfs' "$UNIT_SRC"; then
      fail "$DENO is under /home but the unit sets ProtectHome=tmpfs — install a real copy: sudo install -m 0755 \"\$(readlink -f "$DENO")\" /usr/bin/deno"
    fi
    ;;
esac
info "deno:    $DENO ($("$DENO" --version | head -n 1))"

# The service account only reaches the tree through the group when it is not
# the owner, so the other-execute bit on the interpreter is what actually
# matters then.
if [ "$SERVICE_USER" != "$OWNER_USER" ]; then
  deno_mode="$(stat -c '%a' "$DENO")"
  case "${deno_mode: -1}" in
    1 | 3 | 5 | 7) ;;
    *) fail "$DENO is mode $deno_mode: $SERVICE_USER cannot execute it (sudo chmod 0755 $DENO)" ;;
  esac
fi

# The unit file is the single source of truth for the port. Reading it back
# here means the health check below cannot drift from what was installed.
APP_PORT="$(sed -n 's/^Environment=PORT=\([0-9]\+\).*/\1/p' "$UNIT_SRC" | tail -n 1)"
[ -n "$APP_PORT" ] || fail "no Environment=PORT= line in $UNIT_SRC"
info "source:  $APP_DIR"
info "runs as: $SERVICE_USER:$SERVICE_GROUP on 127.0.0.1:$APP_PORT"
info "kv:      $KV_PATH"

if [ "$SKIP_NGINX" -eq 0 ] && ! command -v nginx >/dev/null 2>&1; then
  fail "nginx is not installed (pass --skip-nginx if it lives elsewhere)"
fi

if [ "$SKIP_CERTBOT" -eq 0 ]; then
  command -v certbot >/dev/null 2>&1 ||
    fail "certbot is not installed: sudo apt-get install -y certbot (or --skip-certbot)"

  # The vhost names its key material by absolute path. If that path and the
  # lineage this script issues disagree, Nginx would load a certificate nobody
  # renews — refuse now rather than discover it in ninety days.
  conf_dir="$(sed -n 's|^[[:space:]]*ssl_certificate[[:space:]]\+\(/etc/letsencrypt/live/[^/]\+\)/.*|\1|p' \
    "$NGINX_SRC" | head -n 1)"
  if [ -n "$conf_dir" ] && [ "$conf_dir" != "$CERT_DIR" ]; then
    fail "$SITE_NAME reads $conf_dir but this deploy issues $CERT_DIR — set CERT_DOMAINS or SITE_NAME"
  fi

  case "$CERTBOT_EMAIL" in
    *@*.*) ;;
    *) fail "CERTBOT_EMAIL is not an address: '$CERTBOT_EMAIL' (expiry notices go there)" ;;
  esac
  info "certs:   $CERT_DOMAINS -> $CERT_DIR"
fi

# --- verify ------------------------------------------------------------------
# Formatting, type check and the full suite, against the tree about to be put
# into service. As the owning user: root has no reason to own a cache.

step "Verify"

if [ "$SKIP_VERIFY" -eq 1 ]; then
  info "skipped (--skip-verify)"
else
  # -H so HOME is the owner's: `deno task test` resolves an --allow-read path
  # under $HOME, and the module cache belongs to the login user, not root.
  sudo -u "$OWNER_USER" -H -- \
    sh -c "cd '$APP_DIR' && '$DENO' task verify" >&2 ||
    fail "the verification suite did not pass — nothing was deployed"
  info "all checks passed"
fi

# --- account ---------------------------------------------------------------------
# Only created when missing, and only ever as a no-login system account. An
# existing login user (the default SERVICE_USER=sysadmin) is left untouched.

step "Account"

if id -u "$SERVICE_USER" >/dev/null 2>&1; then
  info "user $SERVICE_USER already exists"
else
  useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  info "created system user $SERVICE_USER"
fi

# --- ownership -----------------------------------------------------------------
# The owner keeps write access so `git pull` needs no root; the service account
# reaches the tree only through the group, read-only, so it cannot rewrite the
# code it will run at the next restart. When owner and service are the same
# user this is a no-op beyond dropping world access.

step "Ownership"

chown -R "$OWNER_USER:$SERVICE_GROUP" "$APP_DIR"
# X, not x: the execute bit reaches directories and already-executable files,
# never a source file that has no business being executable.
chmod -R g+rX,g-w,o-rwx "$APP_DIR"

# The KV directory. systemd's StateDirectory= owns it once the unit runs; this
# just makes it exist now, so scripts/setup_vps_admin.sh can seed a password
# before the first start if you want one.
install -d -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 0750 "$STATE_DIR"
info "$APP_DIR is $OWNER_USER:$SERVICE_GROUP, group read-only"
info "$STATE_DIR is $SERVICE_USER:$SERVICE_GROUP"

# --- environment file ----------------------------------------------------------
# Touched only to add a session secret it does not already carry. Everything
# else in it is the host's own and is never overwritten.

step "Environment"

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48
  else
    "$DENO" eval 'const b=new Uint8Array(48);crypto.getRandomValues(b);console.log(btoa(String.fromCharCode(...b)));'
  fi
}

if [ -f "$ENV_FILE" ] && grep -q '^ADMIN_SESSION_SECRET=' "$ENV_FILE"; then
  info "$ENV_FILE already has ADMIN_SESSION_SECRET, left alone"
else
  secret="$(gen_secret)"
  (
    umask 077
    touch "$ENV_FILE"
    printf 'ADMIN_SESSION_SECRET=%s\n' "$secret" >>"$ENV_FILE"
  )
  chown "root:$SERVICE_GROUP" "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
  info "wrote ADMIN_SESSION_SECRET to $ENV_FILE"
fi
info "admin password: run scripts/setup_vps_admin.sh to set or change it"

# --- service -------------------------------------------------------------------
# The unit in git carries the paths for the machine it was written on. They are
# rewritten here rather than committed per host, so `git diff` on the server
# stays empty and the unit stays readable.

step "Service"

# A real .service filename in a scratch directory: `systemd-analyze verify`
# rejects a path without a valid unit suffix.
unit_tmp_dir="$(mktemp -d)"
unit_tmp="$unit_tmp_dir/$SERVICE_NAME.service"
trap 'rm -rf "$unit_tmp_dir"' EXIT
sed \
  -e "s|^User=.*|User=$SERVICE_USER|" \
  -e "s|^Group=.*|Group=$SERVICE_GROUP|" \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=$APP_DIR|" \
  -e "s|^Environment=PUBLIC_DIR=.*|Environment=PUBLIC_DIR=$APP_DIR/public|" \
  -e "s|^Environment=KV_PATH=.*|Environment=KV_PATH=$KV_PATH|" \
  -e "s|^ReadOnlyPaths=.*|ReadOnlyPaths=$APP_DIR|" \
  -e "s|^ReadWritePaths=.*|ReadWritePaths=$STATE_DIR|" \
  -e "s|^StateDirectory=.*|StateDirectory=$STATE_DIR_NAME|" \
  -e "s|^ExecStart=[^ ]*/deno |ExecStart=$DENO |" \
  -e "s|^\( *--allow-read=\)[^ ]*|\1$APP_DIR/public,$STATE_DIR|" \
  -e "s|^\( *--allow-write=\)[^ ]*|\1$STATE_DIR|" \
  "$UNIT_SRC" >"$unit_tmp"

if command -v systemd-analyze >/dev/null 2>&1; then
  # Advisory only: the real gate is daemon-reload + restart + the health poll.
  # verify is noisy about unresolved dependencies on a host it is not running.
  systemd-analyze verify "$unit_tmp" >&2 ||
    info "warning: systemd-analyze verify had complaints (see above) — continuing"
fi

install -o root -g root -m 0644 "$unit_tmp" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true

# restart, not reload: Type=simple has no reload semantics.
systemctl restart "$SERVICE_NAME"
info "$SERVICE_NAME restarted (WorkingDirectory=$APP_DIR)"

# --- health ------------------------------------------------------------------
# The deployment is not finished when systemd returns; it is finished when the
# application answers. Fifteen tries at a fifth of a second is generous for a
# process whose entire startup is reading a directory.

step "Health"

probe() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "http://127.0.0.1:$APP_PORT/api/health"
  else
    "$DENO" eval --allow-net=127.0.0.1 \
      "const r = await fetch('http://127.0.0.1:$APP_PORT/api/health');
       if (!r.ok) Deno.exit(1);
       console.log((await r.text()).split(String.fromCharCode(10))[0]);"
  fi
}

healthy=0
for _ in $(seq 1 15); do
  if probe >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 0.2
done

if [ "$healthy" -eq 0 ]; then
  systemctl --no-pager --lines=20 status "$SERVICE_NAME" >&2 || true
  fail "no answer on 127.0.0.1:$APP_PORT/api/health — the service is not serving"
fi
systemctl is-active --quiet "$SERVICE_NAME" ||
  fail "$SERVICE_NAME answered once but is not active — check journalctl -u $SERVICE_NAME"
info "127.0.0.1:$APP_PORT/api/health is answering"
info "the KV database is exercised on the first /admin sign-in, not here"

# --- certificates ----------------------------------------------------------------
# Before the reverse proxy, because the vhost names its key material by
# absolute path: `nginx -t` fails outright if the lineage is not on disk yet.
#
# The bootstrap is the chicken and egg of ACME. The certificate cannot be
# issued until the CA can reach http://$SITE_NAME/.well-known/acme-challenge/,
# and the real configuration cannot load until the certificate exists. So for a
# first issuance only, a plaintext server block that serves the challenge and
# nothing else goes up, and the real one replaces it a step later.

nginx_apply() {
  nginx -t >&2 || fail "nginx rejected the configuration; the running one was left alone"
  if systemctl is-active --quiet nginx; then
    systemctl reload nginx
  else
    systemctl enable --now nginx >/dev/null 2>&1 || systemctl start nginx
  fi
}

step "Certificates"

if [ "$SKIP_CERTBOT" -eq 1 ]; then
  info "skipped ($([ "$SKIP_NGINX" -eq 1 ] && echo --skip-nginx || echo --skip-certbot))"
else
  # World-readable, holds nothing but challenge tokens, which are public by
  # design and deleted as soon as they are answered.
  install -d -m 0755 "$WEBROOT"

  certbot_args="certonly --webroot -w $WEBROOT --cert-name $CERT_NAME --non-interactive --agree-tos -m $CERTBOT_EMAIL"
  for domain in $CERT_DOMAINS; do certbot_args="$certbot_args -d $domain"; done
  [ "$CERTBOT_STAGING" -eq 0 ] || certbot_args="$certbot_args --staging"
  if [ "$FORCE_RENEWAL" -eq 1 ]; then
    certbot_args="$certbot_args --force-renewal"
  else
    # Idempotence: a certificate with more than 30 days left is left alone.
    certbot_args="$certbot_args --keep-until-expiring"
  fi

  if [ ! -s "$CERT_DIR/fullchain.pem" ]; then
    info "no lineage at $CERT_DIR — bootstrapping over plaintext"

    cat >"/etc/nginx/sites-available/$SITE_NAME.conf" <<EOF
# Temporary: written by scripts/deploy.sh for the first ACME challenge only.
# Replaced by nginx/$SITE_NAME.conf as soon as the certificate exists.
server {
    listen 80;
    listen [::]:80;
    server_name ${CERT_DOMAINS};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        return 503;
    }
}
EOF
    ln -sfn "/etc/nginx/sites-available/$SITE_NAME.conf" "/etc/nginx/sites-enabled/$SITE_NAME.conf"
    nginx_apply
  else
    expiry="$(openssl x509 -enddate -noout -in "$CERT_DIR/fullchain.pem" 2>/dev/null | cut -d= -f2)"
    info "lineage exists${expiry:+, expires $expiry}"
  fi

  # shellcheck disable=SC2086
  certbot $certbot_args >&2 ||
    fail "certbot could not issue for $CERT_DOMAINS — check that DNS points here and 80/tcp is open"

  [ -s "$CERT_DIR/fullchain.pem" ] ||
    fail "certbot reported success but $CERT_DIR/fullchain.pem is not there"
  info "certificate in place at $CERT_DIR"

  # Renewal runs unattended from certbot's own timer. Nginx keeps the old
  # certificate in memory until told otherwise, so the reload is the half of
  # renewal that is this deployment's responsibility.
  install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
  cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
# Written by scripts/deploy.sh. Certbot renews the file; Nginx has to be told
# to read it again, or it serves the expired one it already has in memory.
set -eu
nginx -t && systemctl reload nginx
EOF
  chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

  if systemctl list-unit-files certbot.timer >/dev/null 2>&1; then
    systemctl enable --now certbot.timer >/dev/null 2>&1 || true
    info "renewal: certbot.timer, reload hook installed"
  else
    info "renewal: no certbot.timer on this host — schedule 'certbot renew' yourself"
  fi
fi

# --- reverse proxy -----------------------------------------------------------------
# The vhost from git, installed verbatim. `nginx -t` first, always: a
# configuration that does not parse must never reach a running Nginx.

step "Reverse proxy"

if [ "$SKIP_NGINX" -eq 1 ]; then
  info "skipped (--skip-nginx)"
else
  install -o root -g root -m 0644 "$NGINX_SRC" "/etc/nginx/sites-available/$SITE_NAME.conf"
  ln -sfn "/etc/nginx/sites-available/$SITE_NAME.conf" "/etc/nginx/sites-enabled/$SITE_NAME.conf"
  nginx_apply
  info "nginx serving $SITE_NAME"
fi

step "Deployed"
info "journalctl -u $SERVICE_NAME -f"
info "systemctl status $SERVICE_NAME"
info "sudo scripts/setup_vps_admin.sh   # set the admin password"
