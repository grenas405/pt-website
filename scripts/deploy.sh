#!/usr/bin/env bash
#
# deploy.sh — put this checkout into service on the machine it is run on.
#
# The install flows documented in README.md, in the same order, made idempotent
# and made to stop at the first thing that goes wrong. Running it twice changes
# nothing the second time; running it against a broken tree changes nothing at
# all, because the verification suite runs before anything is installed.
#
#   sudo scripts/deploy.sh
#
# The application runs from this checkout — there is no second copy under /srv
# or /var/www to drift out of step with git, and updating is `git pull && sudo
# scripts/deploy.sh --skip-verify --skip-certbot`. It does not run *as* the
# user who owns the checkout: a system account with no shell gets group read
# and nothing else, so the running code is not writable by the process that
# runs it.
#
# Nothing here is specific to one host beyond the variables below, and each of
# those can be overridden from the environment:
#
#   SITE_NAME=staging.praxedistechnologies.com sudo -E scripts/deploy.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The checkout is the deployment, and two users share it. OWNER is whoever
# invoked sudo: they own the files and can `git pull` without root. SERVICE is
# a system account with no shell and no home that gets group read and nothing
# else, so a bug in the request path cannot rewrite the code it runs.
APP_DIR="${APP_DIR:-$REPO_ROOT}"
OWNER_USER="${OWNER_USER:-${SUDO_USER:-root}}"
OWNER_GROUP="${OWNER_GROUP:-$(id -gn "$OWNER_USER" 2>/dev/null || echo "$OWNER_USER")}"
SERVICE_USER="${SERVICE_USER:-ptweb}"
SERVICE_GROUP="${SERVICE_GROUP:-$SERVICE_USER}"
SERVICE_NAME="${SERVICE_NAME:-praxedis-technologies}"
SITE_NAME="${SITE_NAME:-praxedistechnologies.com}"

# State (the Deno KV database) and the module cache live outside the checkout,
# in the unit's StateDirectory / CacheDirectory, so `git pull` never touches
# them and the read-only app tree stays read-only. systemd derives both from
# SERVICE_NAME, so these are not independently relocatable.
STATE_DIR="/var/lib/$SERVICE_NAME"
CACHE_DIR="/var/cache/$SERVICE_NAME"
DENO_CACHE="$CACHE_DIR/deno"

# Secrets and per-host overrides, read by the unit's EnvironmentFile.
ENV_DIR="${ENV_DIR:-/etc/$SERVICE_NAME}"
ENV_FILE="${ENV_FILE:-$ENV_DIR/$SERVICE_NAME.env}"

# Certificates. CERT_DOMAINS is a space-separated list; the first is the
# lineage name, which is what the vhost names in its ssl_certificate paths, so
# it has to stay in step with SITE_NAME.
CERT_DOMAINS="${CERT_DOMAINS:-$SITE_NAME www.$SITE_NAME}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-pedro.dfedro@gmail.com}"
WEBROOT="${WEBROOT:-/var/www/certbot}"

SKIP_VERIFY=0
SKIP_NGINX=0
SKIP_CERTBOT=0
SKIP_FAIL2BAN=0
CERTBOT_STAGING=0
FORCE_RENEWAL=0

UNIT_SRC="$REPO_ROOT/systemd/$SERVICE_NAME.service"
ENV_SRC="$REPO_ROOT/systemd/$SERVICE_NAME.env.example"
NGINX_SRC="$REPO_ROOT/nginx/$SITE_NAME.conf"
SNIPPET_SRC="$REPO_ROOT/nginx/snippets/deny-probes.conf"
DEFAULT_DROP_SRC="$REPO_ROOT/nginx/00-default-drop"
F2B_FILTER_SRC="$REPO_ROOT/fail2ban/filter.d/nginx-probes.conf"
F2B_JAIL_SRC="$REPO_ROOT/fail2ban/jail.local"

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
  --skip-fail2ban Do not install the jail or the probe filter.
  --staging       Issue from Let's Encrypt's staging CA. Untrusted by
                  browsers, but not rate limited — use it to rehearse.
  --force-renewal Renew even though the current certificate is still valid.
                  Rate limited by the CA; do not put this in a loop.
  -h, --help      This text.

Environment: APP_DIR, OWNER_USER, OWNER_GROUP, SERVICE_USER, SERVICE_GROUP,
SERVICE_NAME, SITE_NAME, ENV_FILE, CERT_DOMAINS, CERTBOT_EMAIL, WEBROOT, DENO.
(STATE_DIR and CACHE_DIR follow SERVICE_NAME under /var/lib and /var/cache.)
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-verify) SKIP_VERIFY=1 ;;
    --skip-nginx) SKIP_NGINX=1 ;;
    --skip-certbot) SKIP_CERTBOT=1 ;;
    --skip-fail2ban) SKIP_FAIL2BAN=1 ;;
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

# --- preflight ---------------------------------------------------------------
# Everything that could stop the deployment is checked before the first change,
# so a missing tool is a message rather than a half-installed service.

step "Preflight"

[ "$(id -u)" -eq 0 ] || fail "run with sudo: installing units and reloading nginx needs root"

for f in "$UNIT_SRC" "$ENV_SRC" "$APP_DIR/server/main.ts" "$APP_DIR/deno.json"; do
  [ -f "$f" ] || fail "missing $f — run this from a checkout of the repository"
done
if [ "$SKIP_NGINX" -eq 0 ]; then
  for f in "$NGINX_SRC" "$SNIPPET_SRC" "$DEFAULT_DROP_SRC"; do
    [ -f "$f" ] || fail "missing $f (SITE_NAME=$SITE_NAME names nginx/$SITE_NAME.conf)"
  done
fi
if [ "$SKIP_FAIL2BAN" -eq 0 ]; then
  for f in "$F2B_FILTER_SRC" "$F2B_JAIL_SRC"; do
    [ -f "$f" ] || fail "missing $f (pass --skip-fail2ban to leave fail2ban alone)"
  done
fi

for cmd in systemctl install sed useradd; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is not installed"
done

id -u "$OWNER_USER" >/dev/null 2>&1 || fail "no such user: $OWNER_USER"
[ "$OWNER_USER" != root ] ||
  fail "refusing to deploy a root-owned checkout — invoke through sudo from a login user, or set OWNER_USER"

# The unit names an absolute interpreter path. A ~/.deno/bin install is
# invisible to systemd once it drops privileges, and under ProtectHome=tmpfs a
# /home path does not exist inside the unit's namespace at all.
DENO="${DENO:-/usr/bin/deno}"
if [ ! -x "$DENO" ]; then
  if command -v deno >/dev/null 2>&1; then
    fail "no deno at $DENO — install a real copy there: sudo install -m 0755 \"\$(command -v deno)\" $DENO"
  fi
  fail "no deno at $DENO — install Deno, then: sudo install -m 0755 ~/.deno/bin/deno $DENO"
fi

# -x above is answered for root. The service account is neither root nor in
# root's group, so what matters is the other-execute bit — and `deno upgrade`
# has been known to drop it, surfacing much later as "Permission denied".
deno_real="$(readlink -f "$DENO")"
case "$deno_real" in
  /home/*)
    fail "$DENO resolves to $deno_real, under /home — ProtectHome=tmpfs hides it from the unit.
       Install a real copy: sudo install -m 0755 $deno_real $DENO"
    ;;
esac
deno_mode="$(stat -c '%a' "$deno_real")"
case "${deno_mode: -1}" in
  1 | 3 | 5 | 7) ;;
  *) fail "$deno_real is mode $deno_mode: $SERVICE_USER cannot execute it (sudo chmod 0755 $deno_real)" ;;
esac
info "deno:    $deno_real ($("$DENO" --version | head -n 1))"

# The unit file is the single source of truth for the port. Reading it back
# here means the health check below cannot drift from what was installed.
APP_PORT="$(sed -n 's/^Environment=PORT=\([0-9]\+\).*/\1/p' "$UNIT_SRC" | tail -n 1)"
[ -n "$APP_PORT" ] || fail "no Environment=PORT= line in $UNIT_SRC"
info "source:  $APP_DIR (owned by $OWNER_USER:$SERVICE_GROUP)"
info "runs as: $SERVICE_USER:$SERVICE_GROUP on 127.0.0.1:$APP_PORT"
info "state:   $STATE_DIR (owned by $SERVICE_USER)"

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

if [ "$SKIP_FAIL2BAN" -eq 0 ] && ! command -v fail2ban-client >/dev/null 2>&1; then
  fail "fail2ban is not installed: sudo apt-get install -y fail2ban (or --skip-fail2ban)"
fi

# --- verify ----------------------------------------------------------------
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

# --- account -------------------------------------------------------------------
# No shell, no home directory, no password: there is nothing to log into and
# nothing to leave behind. This account exists to read one directory.

step "Account"

if id -u "$SERVICE_USER" >/dev/null 2>&1; then
  info "user $SERVICE_USER already exists"
else
  useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  info "created system user $SERVICE_USER (no shell, no home)"
fi

# --- ownership ---------------------------------------------------------------
# The half of the sandbox that systemd cannot do. The owner keeps write access
# so `git pull` needs no root; the service account reaches the tree only
# through the group, read-only, and so cannot rewrite the code that will run at
# the next restart.

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

# --- environment file ------------------------------------------------------------
# Installed only when absent — it is the one file on the server meant to
# diverge from git. The session secret is appended only if the file carries
# none: without it the /admin dashboard rejects every sign-in.

step "Environment"

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48
  else
    "$DENO" eval 'const b=new Uint8Array(48);crypto.getRandomValues(b);console.log(btoa(String.fromCharCode(...b)));'
  fi
}

install -d -m 0755 "$ENV_DIR"
if [ -e "$ENV_FILE" ]; then
  info "$ENV_FILE exists, left alone"
else
  install -o root -g "$SERVICE_GROUP" -m 0640 "$ENV_SRC" "$ENV_FILE"
  info "installed $ENV_FILE from the example — review it"
fi

if grep -q '^ADMIN_SESSION_SECRET=.\+' "$ENV_FILE"; then
  info "ADMIN_SESSION_SECRET already set, left alone"
else
  # The example ships a commented placeholder; append the real value below it.
  printf 'ADMIN_SESSION_SECRET=%s\n' "$(gen_secret)" >>"$ENV_FILE"
  chown "root:$SERVICE_GROUP" "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
  info "generated ADMIN_SESSION_SECRET into $ENV_FILE"
fi
info "admin password: run scripts/setup_vps_admin.sh to set or change it"

# --- module cache ----------------------------------------------------------------
# Resolved once here, under review, so the unit can run --cached-only and the
# service never contacts a registry — not at start, not after a restart at 3am.
# CacheDirectory= in the unit owns this path once systemd takes over. The app
# has no third-party imports today; this keeps that guarantee enforced.

step "Module cache"

install -d -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 0750 "$CACHE_DIR" "$DENO_CACHE"
DENO_DIR="$DENO_CACHE" "$DENO" cache "$APP_DIR/server/main.ts" >&2 ||
  fail "could not populate the module cache at $DENO_CACHE"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DENO_CACHE"
info "cached into $DENO_CACHE, owned by $SERVICE_USER"

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
  -e "s|^ConditionPathExists=.*|ConditionPathExists=$APP_DIR/server/main.ts|" \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=$APP_DIR|" \
  -e "s|^BindReadOnlyPaths=.*|BindReadOnlyPaths=$APP_DIR|" \
  -e "s|^User=.*|User=$SERVICE_USER|" \
  -e "s|^Group=.*|Group=$SERVICE_GROUP|" \
  -e "s|^ExecStart=[^ ]*/deno |ExecStart=$DENO |" \
  -e "s|^Environment=KV_PATH=.*|Environment=KV_PATH=$STATE_DIR/site.kv|" \
  -e "s|^Environment=DENO_DIR=.*|Environment=DENO_DIR=$DENO_CACHE|" \
  -e "s|^StateDirectory=.*|StateDirectory=$SERVICE_NAME|" \
  -e "s|^CacheDirectory=.*|CacheDirectory=$SERVICE_NAME|" \
  -e "s|^\( *--allow-read=\)[^ ]*|\1public,$STATE_DIR|" \
  -e "s|^\( *--allow-write=\)[^ ]*|\1$STATE_DIR|" \
  "$UNIT_SRC" >"$unit_tmp"

if command -v systemd-analyze >/dev/null 2>&1; then
  # Advisory: the real gate is daemon-reload + restart + the health poll.
  systemd-analyze verify "$unit_tmp" >&2 ||
    info "warning: systemd-analyze verify had complaints (see above) — continuing"
fi

install -o root -g root -m 0644 "$unit_tmp" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true

# restart, not reload: Type=exec has no reload semantics.
systemctl restart "$SERVICE_NAME"
info "$SERVICE_NAME restarted (WorkingDirectory=$APP_DIR)"

# --- health ----------------------------------------------------------------
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

# --- certificates --------------------------------------------------------------
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
# The vhost, plus the two box-wide pieces it depends on: the probe snippet it
# includes, and the catch-all that closes the connection on requests addressed
# to no server_name at all. Both are shared with every other site on the host,
# and installing them is idempotent.

step "Reverse proxy"

if [ "$SKIP_NGINX" -eq 1 ]; then
  info "skipped (--skip-nginx)"
else
  install -d -m 0755 /etc/nginx/snippets
  install -o root -g root -m 0644 "$SNIPPET_SRC" /etc/nginx/snippets/deny-probes.conf
  install -o root -g root -m 0644 "$DEFAULT_DROP_SRC" /etc/nginx/sites-available/00-default-drop

  # The distro default site answers for any unmatched Host, which is exactly
  # what 00-default-drop is here to stop doing.
  rm -f /etc/nginx/sites-enabled/default
  ln -sfn /etc/nginx/sites-available/00-default-drop /etc/nginx/sites-enabled/00-default-drop

  install -o root -g root -m 0644 "$NGINX_SRC" "/etc/nginx/sites-available/$SITE_NAME.conf"
  ln -sfn "/etc/nginx/sites-available/$SITE_NAME.conf" "/etc/nginx/sites-enabled/$SITE_NAME.conf"

  nginx_apply
  info "nginx serving $SITE_NAME, probes dropped, default site removed"
fi

# --- fail2ban --------------------------------------------------------------------------
# The filter is this repository's and is kept current. jail.local is the box's,
# shared with every other site, and carries edits that are deliberately not in
# git (the real sshd port) — so it is installed only when absent.

step "fail2ban"

if [ "$SKIP_FAIL2BAN" -eq 1 ]; then
  info "skipped (--skip-fail2ban)"
else
  install -o root -g root -m 0644 "$F2B_FILTER_SRC" /etc/fail2ban/filter.d/nginx-probes.conf

  if [ -e /etc/fail2ban/jail.local ]; then
    info "/etc/fail2ban/jail.local exists, left alone"
  else
    install -o root -g root -m 0644 "$F2B_JAIL_SRC" /etc/fail2ban/jail.local
    info "installed /etc/fail2ban/jail.local — set the real sshd port in it"
  fi

  # Restart, not reload: apt starts fail2ban before jail.local exists, and a
  # running daemon does not pick the file up any other way.
  systemctl restart fail2ban

  # systemctl returns before fail2ban has bound its socket, and a client that
  # cannot connect looks exactly like a jail that does not exist. Ask until it
  # answers something that is actually about the jail.
  jail_status=""
  for _ in $(seq 1 20); do
    jail_status="$(fail2ban-client status nginx-probes 2>&1 || true)"
    case "$jail_status" in
      *"File list:"* | *"Journal matches:"* | *"does not exist"*) break ;;
    esac
    sleep 0.4
  done

  # Two ways to be wrong, and they need different fixes: the jail can be
  # missing from a jail.local this script declined to overwrite, or it can be
  # present and reading the journal, where nginx access logs never appear.
  case "$jail_status" in
    *"File list:"*)
      info "jail nginx-probes is reading the access logs"
      ;;
    *"Journal matches:"*)
      info "warning: nginx-probes is reading the journal, where nginx logs never appear."
      info "         add 'backend = polling' to its stanza in /etc/fail2ban/jail.local"
      ;;
    *)
      info "warning: no working nginx-probes jail. fail2ban-client said:"
      printf '        %s\n' "$jail_status" >&2
      info "         this host's jail.local was left alone; add the stanza from $F2B_JAIL_SRC"
      ;;
  esac
fi

step "Deployed"
info "journalctl -u $SERVICE_NAME -f"
info "systemctl status $SERVICE_NAME"
info "sudo fail2ban-client status nginx-probes"
info "sudo scripts/setup_vps_admin.sh   # set the admin password"
