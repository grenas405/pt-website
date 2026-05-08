# Praxedis Technologies

The official website for **Praxedis Technologies** (`www.praxedistechnologies.com`), a disruptive, high-velocity technology firm run and operated by **Pedro M. Dominguez**.

## Philosophy

Praxedis Technologies represents a new era of engineering: **One person operating at the speed of a Mag 7 company.** By unifying the roles of developer, marketer, analyst, and programmer into a single, high-frictionless execution loop, we deliver industrial-grade solutions at unprecedented velocity.

The name is a tribute to **Praxedis G. Guerrero**, the revolutionary journalist and intellectual from Chihuahua, Mexico. His spirit of disruption and pursuit of progress is the heartbeat of our technological mission.

## Visual Identity

The site's aesthetic is a fusion of **Vibrant Mexican Heritage** and **High-Tech Professionalism**.
- **Green (`#006847`)**: Represents growth, vitality, and the lush landscapes of Mexico.
- **Red (`#CE1126`)**: Represents the revolutionary fire and passion for disruption.
- **White (`#FFFFFF`)**: Represents the clarity and precision of our technical architecture.

## Tech Stack

- **Deno**: Native HTTP server — no npm, no frameworks, no build step.
- **HTML5**: Semantic and accessible structure.
- **CSS3**: Responsive design with custom properties, grid layouts, and smooth animations.
- **Typography**: Montserrat (Headers) and Inter (Body) via Google Fonts.
- **nginx**: Reverse proxy handling TLS, gzip, caching, and HTTP→HTTPS redirects.

## Project Structure

```
pt-website/
├── VERSION                    # Current SemVer release version
├── server/
│   ├── main.ts        # Entry point — Deno.serve()
│   ├── config.ts      # Runtime config from env (PORT, HOST, PUBLIC_DIR)
│   ├── router.ts      # URL → filesystem path (traversal-safe)
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
│   ├── heavenly-roofing.html     # Client case study — Heavenly Roofing LLC
│   ├── heavenly-roofing.css      # Case study styles
│   ├── heavenly-roofing.js       # Case study animations
│   ├── 404.html                  # Custom 404 page — glitch animation, terminal typewriter
│   ├── 404.css                   # 404 styles
│   └── 404.js                    # 404 animations (entry timeline, glitch, magnetic buttons)
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
  --allow-env=PORT,PUBLIC_DIR,HOST \
  server/main.ts
```

Open `http://localhost:8000` (home), `http://localhost:8000/about.html` (about), `http://localhost:8000/heavenly-roofing.html` (client case study), or navigate to any non-existent path to see the 404 page.

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

## Versioning

The root `VERSION` file is the source of truth for the site release version. It uses SemVer format:

```txt
MAJOR.MINOR.PATCH
```

Use numeric segments only, no leading `v`, and keep the file to a single line.

## Production

```sh
PORT=8000 HOST=127.0.0.1 PUBLIC_DIR=/var/www/praxedistechnologies/public \
deno run \
  --allow-net=127.0.0.1:8000 \
  --allow-read=/var/www/praxedistechnologies/public \
  --allow-env=PORT,PUBLIC_DIR,HOST \
  server/main.ts
```

nginx config at `nginx/praxedistechnologies.com.conf` handles TLS termination and proxies to the Deno process.

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
*Operated with pride by Pedro M. Dominguez.*
