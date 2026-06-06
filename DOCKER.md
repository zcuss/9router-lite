# Docker

Run 9Router Lite in a container.

---

# 👤 For Users

## Quick start

```bash
docker run -d \
  -p 45231:45231 \
  -v "$HOME/.9router-lite:/app/data" \
  -e DATA_DIR=/app/data \
  --name 9router-lite \
  ghcr.io/YOUR_GITHUB_USERNAME/9router-lite:latest
```

App listens on port `45231`. Open: http://localhost:45231

## Manage container

```bash
docker logs -f 9router-lite        # view logs
docker stop 9router-lite           # stop
docker start 9router-lite          # start again
docker rm -f 9router-lite          # remove
```

## Data persistence

```bash
-v "$HOME/.9router-lite:/app/data" \
-e DATA_DIR=/app/data
```

Without `DATA_DIR`, the app falls back to `~/.9router-lite/` (macOS/Linux) or `%APPDATA%\9router-lite\` (Windows). In the container, `DATA_DIR=/app/data` makes the bind mount work.

Data layout under `$DATA_DIR/`:

```text
$DATA_DIR/
├── db/
│   ├── data.sqlite       # main SQLite database
│   └── backups/          # auto backups
└── ...                   # certs, logs, runtime configs
```

Host path: `$HOME/.9router-lite/db/data.sqlite`
Container path: `/app/data/db/data.sqlite`

## Optional env vars

```bash
docker run -d \
  -p 45231:45231 \
  -v "$HOME/.9router-lite:/app/data" \
  -e DATA_DIR=/app/data \
  -e PORT=45231 \
  -e HOSTNAME=0.0.0.0 \
  -e DEBUG=true \
  --name 9router-lite \
  ghcr.io/YOUR_GITHUB_USERNAME/9router-lite:latest
```

## Update to latest

```bash
docker pull ghcr.io/YOUR_GITHUB_USERNAME/9router-lite:latest
docker rm -f 9router-lite
# re-run the quick start command
```

---

# 🛠 For Developers

## Build image locally (test)

```bash
docker build -t 9router-lite .

docker run --rm -p 45231:45231 \
  -v "$HOME/.9router-lite:/app/data" \
  -e DATA_DIR=/app/data \
  9router-lite
```

## Publish (automatic via CI)

Push a git tag `v*` → GitHub Actions builds multi-platform (amd64+arm64) and pushes to:
- `ghcr.io/YOUR_GITHUB_USERNAME/9router-lite:v{version}` + `:latest`

Workflow: `.github/workflows/docker-publish.yml`
