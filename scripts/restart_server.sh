#!/bin/sh
# Automatic backend restart script executed by cPanel deployment

echo "[Deploy] Attempting to restart Python backend on port 5001..."

# 1. Kill any existing process on port 5001
fuser -k -9 5001/tcp 2>/dev/null || true
pkill -9 -f "src.backend.server" 2>/dev/null || true
pkill -9 -f "server.py" 2>/dev/null || true
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:5001 | xargs -r kill -9 2>/dev/null || true
fi
sleep 2

# 2. Touch restart.txt for Phusion Passenger in all common app roots
touch /home/enzotay/public_html/draft/tmp/restart.txt 2>/dev/null || true
touch /home/enzotay/league-draft-predictor-backend/tmp/restart.txt 2>/dev/null || true

# 3. Locate Python binary (scan cPanel virtualenv first, then system python)
PYTHON_BIN=""

# Check if find returns a cPanel virtualenv python
for venv_path in \
  $(find /home/enzotay/virtualenv -name python 2>/dev/null) \
  /home/enzotay/virtualenv/league-draft-predictor-backend/*/bin/python \
  /home/enzotay/virtualenv/league-draft-predictor-backend/bin/python \
  /home/enzotay/league-draft-predictor-backend/.venv/bin/python \
  /home/enzotay/.venv/bin/python \
  /usr/bin/python3 \
  python3; do
  if [ -x "$venv_path" ]; then
    PYTHON_BIN="$venv_path"
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
  
  # Ensure dependencies are available
  "$PYTHON_BIN" -m pip install -r requirements.txt --quiet 2>/dev/null || true

  # Launch server on port 5001
  nohup "$PYTHON_BIN" -m src.backend.server > /home/enzotay/server.log 2>&1 &
  echo "[Deploy] Backend server launched in background from $TARGET_DIR on port 5001."
else
  echo "[Deploy] Warning: Python binary not found; relying on Passenger WSGI."
fi
