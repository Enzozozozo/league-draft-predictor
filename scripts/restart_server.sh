#!/bin/sh
# Automatic backend restart script executed by cPanel deployment

echo "[Deploy] Attempting to restart Python backend on port 5001..."

# 1. Kill any existing process on port 5001
fuser -k 5001/tcp 2>/dev/null || pkill -f "src.backend.server" 2>/dev/null || true
sleep 1

# 2. Touch restart.txt for Phusion Passenger in all common app roots
touch /home/enzotay/public_html/draft/tmp/restart.txt 2>/dev/null || true
touch /home/enzotay/league-draft-predictor-backend/tmp/restart.txt 2>/dev/null || true

# 3. Locate Python binary (cPanel virtualenv or system python3)
PYTHON_BIN=""
for candidate in \
  /home/enzotay/virtualenv/league-draft-predictor-backend/*/bin/python \
  /home/enzotay/virtualenv/draft/*/bin/python \
  /home/enzotay/league-draft-predictor-backend/.venv/bin/python \
  /home/enzotay/.venv/bin/python \
  /usr/bin/python3 \
  python3; do
  if [ -x "$candidate" ]; then
    PYTHON_BIN="$candidate"
    break
  fi
done

# 4. If a Python binary was found, launch the updated server in the background
if [ -n "$PYTHON_BIN" ]; then
  echo "[Deploy] Using Python: $PYTHON_BIN"
  TARGET_DIR=""
  if [ -d "/home/enzotay/league-draft-predictor-backend" ]; then
    TARGET_DIR="/home/enzotay/league-draft-predictor-backend"
  elif [ -d "/home/enzotay/public_html/draft" ]; then
    TARGET_DIR="/home/enzotay/public_html/draft"
  else
    TARGET_DIR="."
  fi

  cd "$TARGET_DIR" || exit 0
  nohup "$PYTHON_BIN" -m src.backend.server > /home/enzotay/server.log 2>&1 &
  echo "[Deploy] Backend server launched in background from $TARGET_DIR on port 5001."
else
  echo "[Deploy] Warning: Python binary not found; relying on Passenger WSGI."
fi
