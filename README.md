# Praxedis Technologies

The official website for **Praxedis Technologies**
(`www.praxedistechnologies.com`), a disruptive, high-velocity technology firm
run and operated by **Pedro M. Dominguez**.

## Philosophy

Praxedis Technologies represents a new era of engineering: **One person
operating at the speed of a Mag 7 company.** By unifying the roles of developer,
marketer, analyst, and programmer into a single, high-frictionless execution
loop, we deliver industrial-grade solutions at unprecedented velocity.

The name is a tribute to **Praxedis G. Guerrero**, the revolutionary journalist
and intellectual from Chihuahua, Mexico. His spirit of disruption and pursuit of
progress is the heartbeat of our technological mission.

## Visual Identity

The site's aesthetic is a fusion of **Vibrant Mexican Heritage** and **High-Tech
Professionalism**.

- **Green (`#006847`)**: Represents growth, vitality, and the lush landscapes of
  Mexico.
- **Red (`#CE1126`)**: Represents the revolutionary fire and passion for
  disruption.
- **White (`#FFFFFF`)**: Represents the clarity and precision of our technical
  architecture.

## Tech Stack

- **Deno**: Native HTTP server — no npm, no frameworks, no build step.
- **HTML5**: Semantic and accessible structure.
- **CSS3**: Responsive design with custom properties, grid layouts, and smooth
  animations.
- **Typography**: Self-hosted Montserrat (Headers) and Inter (Body).
- **nginx**: Reverse proxy handling TLS, gzip, caching, and HTTP→HTTPS
  redirects.

## Project Structure

```
pt-website/
├── VERSION                    # Current SemVer release version
├── server/
│   ├── main.ts        # Entry point — Deno.serve()
│   ├── config.ts      # Runtime config from env (PORT, HOST, PUBLIC_DIR)
│   ├── router.ts      # Explicit page routes and static assets
│   ├── file.ts        # Stream-based file reader
│   ├── mime.ts        # Extension → Content-Type
│   └── headers.ts     # Cache and security headers
├── public/
│   ├── index.html                # Home — single-page marketing site
│   ├── main.css                  # Home styles
│   ├── main.js                   # Home animations
│   ├── navigation.js             # Shared nav behavior (scroll state, mobile overlay)
│   ├── about.html                # About — Pedro, stack, currently building
│   ├── about.css                 # About styles
│   ├── about.js                  # About animations (typewriters, terminal, canvas)
│   ├── case-study.html           # Client case study — Heavenly Roofing LLC
│   ├── case-study.css            # Case study styles
│   ├── case-study.js             # Case study animations
│   ├── mexico.html               # Mexico small-town technology campaign
│   ├── mexico.css                # Mexico campaign visual system
│   ├── mexico.js                 # Campaign and terminal animations
│   ├── mexico-hero.webp          # Generated Chihuahua hero visual
│   ├── admin-login.html           # Private administrator sign-in
│   ├── admin.html                 # Waitlist operations dashboard
│   ├── admin.css                  # Shared admin interface styles
│   ├── admin-login.js             # Password login and session storage
│   ├── admin-dashboard.js         # Search, filters, details, and CSV export
│   ├── 404.html                  # Custom 404 page — glitch animation, terminal typewriter
│   ├── 404.css                   # 404 styles
│   ├── 404.js                    # 404 animations (entry timeline, glitch, magnetic buttons)
│   └── vendor/                   # Self-hosted fonts, Font Awesome, and anime.js
├── scripts/
│   ├── deploy.sh                 # One-shot host deploy (unit, nginx, certs, fail2ban)
│   ├── setup_vps_admin.sh        # Seed the admin password + session secret
│   └── create_admin_password.ts  # KV password writer used by setup_vps_admin.sh
├── nginx/
│   ├── praxedistechnologies.com.conf   # The site vhost
│   ├── 00-default-drop                 # Catch-all: close unmatched Host; owns :443 socket opts
│   └── snippets/deny-probes.conf       # 444 on PHP/WordPress/dotfile probe paths
├── fail2ban/
│   ├── filter.d/nginx-probes.conf      # Regex for scanner hits in the access log
│   └── jail.local                      # nginx-probes + sshd jails (backend = polling)
└── systemd/
    ├── praxedis-technologies.service       # Hardened system unit, runs as `ptweb`
    └── praxedis-technologies.env.example   # Per-host overrides template
```

## Running Locally

```sh
deno run \
  --allow-net \
  --allow-read=./public \
  --allow-env=PORT,PUBLIC_DIR,HOST,ALLOWED_HOSTS \
  server/main.ts
```

Open `http://localhost:8000` (home), `http://localhost:8000/about` (about),
`http://localhost:8000/case-study` (client case study), or navigate to any
non-existent path to see the 404 page.

## Routes

Page routes are exact and extensionless:

```txt
/             # Home
/about        # About
/case-study   # Client case study
/mexico       # Mexico small-town technology campaign
/admin/login  # Administrator sign-in
/admin        # Waitlist dashboard
```

Legacy page URLs are not redirected. Old paths such as these return the custom
404 page with HTTP `404`:

```txt
/about.html
/case-study.html
/heavenly-roofing
/heavenly-roofing.html
```

Static assets such as `/main.css`, `/about.js`, `/case-study.js`, and
`/vendor/...` files are still served directly by filename.

## Admin Dashboard

Create the production password and session secret from the repository on the
VPS, after `scripts/deploy.sh` has run (it needs the `ptweb` account and the
KV directory):

```sh
sudo scripts/setup_vps_admin.sh
```

Then open `/admin/login`. Successful authentication stores the eight-hour bearer
token in browser session storage. The dashboard supports waitlist search, date
filtering, sorting, inquiry details, refresh, and authenticated CSV export.

## API

### Health Check

```http
GET /api/health
HEAD /api/health
```

Browsers receive a non-cacheable JSON response:

```json
{
  "status": "ok",
  "service": "praxedis-technologies-website",
  "timestamp": "2026-05-05T12:00:00.000Z",
  "uptimeSeconds": 42
}
```

Terminal and non-browser clients receive a non-cacheable ANSI status dashboard
by default, including service status, timestamp, uptime, Mexican flag colors,
and a tribute to Praxedis G. Guerrero:

```sh
curl http://localhost:8000/api/health
```

Unsupported methods return `405 Method Not Allowed` with `Allow: GET, HEAD`.

## Security

- All responses use strict same-origin security headers, including CSP, HSTS,
  `nosniff`, `DENY` framing protection, cross-origin isolation headers, and a
  restrictive `Permissions-Policy`.
- Third-party runtime assets are vendored under `public/vendor/`, so the CSP
  does not need CDN exceptions or inline script/style allowances.
- The router rejects malformed paths, encoded path separators, traversal
  segments, dotfiles, legacy `.html` page URLs, and unknown asset extensions
  before resolving files.
- Production should run with least-privilege Deno permissions:
  `--allow-net=127.0.0.1:8000`, `--allow-read=<public-dir>`, and only the
  documented environment variables.
- The systemd unit keeps the app tree read-only and points Deno's runtime cache
  at the service's private `/tmp`.

## Verification

```sh
deno task verify   # deno fmt --check && deno task check && deno task test
systemd-analyze verify systemd/praxedis-technologies.service
```

## Deploy

`scripts/deploy.sh` puts the current checkout into service on the machine it
runs on. The checkout **is** the deployment — there is no second copy under
`/var/www` — so updating is `git pull` then a redeploy.

```sh
# First install: verify, install the unit + nginx vhost, issue the certificate.
sudo scripts/deploy.sh

# Redeploy after `git pull` (tree already verified, certificate already issued).
sudo scripts/deploy.sh --skip-verify --skip-certbot
```

It runs in order: preflight checks → `deno task verify` → create the no-login
`ptweb` service account if missing → tighten ownership (owner writes, `ptweb`
reads through the group) → install the env file and add `ADMIN_SESSION_SECRET`
if absent → populate the module cache so the unit can run `--cached-only` →
render the systemd unit with this host's paths and install it as a **system**
unit → restart and health-poll `/api/health` → bootstrap the ACME challenge,
run `certbot`, install a renewal reload hook → install the nginx vhost, the
probe snippet, and the catch-all default-drop → install the fail2ban filter
and jail. It is idempotent and stops at the first failure; nothing is installed
until verification passes.

| Flag | Effect |
| --- | --- |
| `--skip-verify` | Skip the verification suite (redeploy of an already-verified tree). |
| `--skip-nginx` | Leave the reverse proxy alone (implies `--skip-certbot`). |
| `--skip-certbot` | Do not touch certificates. |
| `--skip-fail2ban` | Do not install the jail or the probe filter. |
| `--staging` | Issue from Let's Encrypt's staging CA (untrusted, not rate limited). |
| `--force-renewal` | Renew even if the current certificate is still valid. |

The service runs as a dedicated no-shell system user (`ptweb` by default) under
a strict systemd sandbox; the checkout stays owner-writable and group-readable,
and the KV database lives in `StateDirectory=/var/lib/praxedis-technologies`,
owned by the service. Host layout is overridable from the environment:
`APP_DIR`, `OWNER_USER`, `SERVICE_USER`, `SERVICE_GROUP`, `SERVICE_NAME`,
`SITE_NAME`, `STATE_DIR`, `ENV_FILE`, `CERT_DOMAINS`, `CERTBOT_EMAIL`,
`WEBROOT`, `DENO`. Set the admin password with `sudo scripts/setup_vps_admin.sh`
after the first deploy. The manual `nginx` and `systemd` steps below are what
the script automates.

## Versioning

The root `VERSION` file is the source of truth for the site release version. It
uses SemVer format:

```txt
MAJOR.MINOR.PATCH
```

Use numeric segments only, no leading `v`, and keep the file to a single line.

## Production

Use `sudo scripts/deploy.sh` (see [Deploy](#deploy)). It installs the hardened
systemd unit, which starts the process as:

```sh
KV_PATH=/var/lib/praxedis-technologies/site.kv \
DENO_DIR=/var/cache/praxedis-technologies/deno \
ALLOWED_HOSTS=www.praxedistechnologies.com,praxedistechnologies.com,127.0.0.1,localhost \
deno run \
  --unstable-kv \
  --allow-net=127.0.0.1:8000 \
  --allow-read=public,/var/lib/praxedis-technologies \
  --allow-write=/var/lib/praxedis-technologies \
  --allow-env=PORT,PUBLIC_DIR,HOST,ALLOWED_HOSTS,DENO_DIR,KV_PATH,ADMIN_SESSION_SECRET \
  --cached-only \
  server/main.ts
```

`ADMIN_SESSION_SECRET` comes from
`/etc/praxedis-technologies/praxedis-technologies.env`. nginx
(`nginx/praxedistechnologies.com.conf`) handles TLS termination and proxies to
the Deno process.

## nginx

`scripts/deploy.sh` does all of this. By hand:

```sh
# Box-wide pieces (install once, shared by every site)
sudo install -m 0644 nginx/snippets/deny-probes.conf /etc/nginx/snippets/deny-probes.conf
sudo install -m 0644 nginx/00-default-drop /etc/nginx/sites-available/00-default-drop
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/00-default-drop /etc/nginx/sites-enabled/00-default-drop

# The site vhost
sudo install -m 0644 nginx/praxedistechnologies.com.conf \
        /etc/nginx/sites-available/praxedistechnologies.com.conf
sudo ln -sf /etc/nginx/sites-available/praxedistechnologies.com.conf \
           /etc/nginx/sites-enabled/praxedistechnologies.com.conf

# Obtain TLS certificate (first time)
sudo certbot certonly --webroot -w /var/www/certbot \
  --cert-name praxedistechnologies.com \
  -d praxedistechnologies.com -d www.praxedistechnologies.com

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

## fail2ban

```sh
sudo install -m 0644 fail2ban/filter.d/nginx-probes.conf /etc/fail2ban/filter.d/nginx-probes.conf
# Only if absent — jail.local is the box's, and carries the real sshd port.
sudo install -m 0644 fail2ban/jail.local /etc/fail2ban/jail.local
sudo systemctl restart fail2ban
sudo fail2ban-client status nginx-probes   # must say "File list:", not "Journal matches:"
```

## systemd

Installed as a **system** unit that runs as the no-login `ptweb` account under
a strict sandbox. `scripts/deploy.sh` rewrites the checkout paths and installs
it; by hand:

```sh
# Edit User/Group/WorkingDirectory/BindReadOnlyPaths/ConditionPathExists for
# this host first, then:
sudo install -o root -g root -m 0644 \
  systemd/praxedis-technologies.service /etc/systemd/system/praxedis-technologies.service
sudo install -d -m 0755 /etc/praxedis-technologies
sudo install -o root -g ptweb -m 0640 \
  systemd/praxedis-technologies.env.example /etc/praxedis-technologies/praxedis-technologies.env

sudo systemctl daemon-reload
sudo systemctl enable --now praxedis-technologies

sudo systemctl status praxedis-technologies
sudo journalctl -u praxedis-technologies -f
```

---

_Operated with pride by Pedro M. Dominguez._
