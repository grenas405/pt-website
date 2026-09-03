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
├── nginx/
│   └── praxedistechnologies.com.conf
└── systemd/
    └── praxedis-technologies.service
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
VPS:

```sh
./scripts/setup_vps_admin.sh
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

It runs in order: preflight checks → `deno task verify` → create the service
account if missing → tighten ownership → add `ADMIN_SESSION_SECRET` to
`/etc/praxedis-technologies.env` if absent → render the systemd unit with this
host's paths and install it → restart and health-poll `/api/health` → bootstrap
the ACME challenge, run `certbot`, install a renewal reload hook → install the
nginx vhost. It is idempotent and stops at the first failure; nothing is
installed until verification passes.

| Flag | Effect |
| --- | --- |
| `--skip-verify` | Skip the verification suite (redeploy of an already-verified tree). |
| `--skip-nginx` | Leave the reverse proxy alone (implies `--skip-certbot`). |
| `--skip-certbot` | Do not touch certificates. |
| `--staging` | Issue from Let's Encrypt's staging CA (untrusted, not rate limited). |
| `--force-renewal` | Renew even if the current certificate is still valid. |

Host layout is overridable from the environment: `APP_DIR`, `OWNER_USER`,
`SERVICE_USER`, `SERVICE_NAME`, `SITE_NAME`, `STATE_DIR`, `KV_PATH`, `ENV_FILE`,
`CERT_DOMAINS`, `CERTBOT_EMAIL`, `WEBROOT`, `DENO`. Set the admin password with
`scripts/setup_vps_admin.sh` after the first deploy. The manual `nginx` and
`systemd` steps below are what the script automates.

## Versioning

The root `VERSION` file is the source of truth for the site release version. It
uses SemVer format:

```txt
MAJOR.MINOR.PATCH
```

Use numeric segments only, no leading `v`, and keep the file to a single line.

## Production

```sh
PORT=8000 HOST=127.0.0.1 PUBLIC_DIR=/var/www/praxedistechnologies/public \
ALLOWED_HOSTS=www.praxedistechnologies.com,praxedistechnologies.com,127.0.0.1,localhost \
DENO_DIR=/tmp/deno-cache \
deno run \
  --allow-net=127.0.0.1:8000 \
  --allow-read=/var/www/praxedistechnologies/public \
  --allow-env=PORT,PUBLIC_DIR,HOST,ALLOWED_HOSTS,DENO_DIR \
  server/main.ts
```

nginx config at `nginx/praxedistechnologies.com.conf` handles TLS termination
and proxies to the Deno process.

## nginx

```sh
# Install
sudo cp nginx/praxedistechnologies.com.conf \
        /etc/nginx/sites-available/praxedistechnologies.com.conf
sudo ln -s /etc/nginx/sites-available/praxedistechnologies.com.conf \
           /etc/nginx/sites-enabled/praxedistechnologies.com.conf

# Obtain TLS certificate (first time)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d praxedistechnologies.com -d www.praxedistechnologies.com

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

## systemd (User Service)

```sh
# Install
sudo cp ~/.local/src/development/pt-website/systemd/praxedis-technologies.service \
        /etc/systemd/user/praxedis-technologies.service

# Enable and start
systemctl --user daemon-reload
systemctl --user enable --now praxedis-technologies

# Status / logs
systemctl --user status praxedis-technologies
journalctl --user -u praxedis-technologies -f
```

---

_Operated with pride by Pedro M. Dominguez._
