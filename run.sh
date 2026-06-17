#!/bin/bash
# 9router-lite auto-restart wrapper (direct server.js, no CLI TUI)
set -a
. /root/9router-lite/.env
set +a
cd /root/9router-lite/cli/app
while true; do
  echo "[wrapper] starting server.js at $(date -Iseconds)"
  PORT=20129 HOSTNAME=0.0.0.0 node --max-old-space-size=6144 server.js
  ec=$?
  echo "[wrapper] exited code=$ec at $(date -Iseconds)"
  if [ "$ec" = "0" ] || [ "$ec" = "130" ] || [ "$ec" = "143" ]; then
    echo "[wrapper] clean exit, stopping"
    break
  fi
  echo "[wrapper] restart in 2s..."
  sleep 2
done
