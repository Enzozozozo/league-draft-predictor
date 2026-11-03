#!/bin/sh
# Instant backend restart script executed by cPanel deployment

echo "[Deploy] Restarting Python backend on port 5001..."

# 1. Kill old backend process on port 5001
python3 -c "
import os, signal
my_pid = os.getpid()
if os.path.exists('/proc'):
    for p in os.listdir('/proc'):
        if p.isdigit() and int(p) != my_pid:
            try:
                with open(f'/proc/{p}/cmdline', 'rb') as f:
                    c = f.read().decode('utf-8', errors='ignore')
                if 'src.backend.server' in c or 'server.py' in c:
                    os.kill(int(p), signal.SIGKILL)
            except:
                pass
" 2>/dev/null || true
pkill -9 -f "src.backend.server" 2>/dev/null || true
pkill -9 -f "server.py" 2>/dev/null || true

# 2. Touch restart.txt for Phusion Passenger
touch /home/enzotay/public_html/draft/tmp/restart.txt 2>/dev/null || true
touch /home/enzotay/league-draft-predictor-backend/tmp/restart.txt 2>/dev/null || true

# 3. Locate Python binary (direct check, no slow disk scanning)
PYTHON_BIN="/usr/bin/python3"
for candidate in \
  /home/enzotay/virtualenv/league-draft-predictor-backend/3.9/bin/python \
  /home/enzotay/virtualenv/league-draft-predictor-backend/3.10/bin/python \
  /home/enzotay/virtualenv/league-draft-predictor-backend/3.11/bin/python \
  /home/enzotay/virtualenv/league-draft-predictor-backend/bin/python \
  /home/enzotay/league-draft-predictor-backend/.venv/bin/python \
  /usr/bin/python3; do
  if [ -x "$candidate" ]; then
    PYTHON_BIN="$candidate"
    break
  fi
done

echo "[Deploy] Using Python: $PYTHON_BIN"
if [ -d "/home/enzotay/league-draft-predictor-backend" ]; then
  cd /home/enzotay/league-draft-predictor-backend || true
elif [ -d "/home/enzotay/public_html/draft" ]; then
  cd /home/enzotay/public_html/draft || true
fi

# 4. Launch backend in background
nohup "$PYTHON_BIN" -m src.backend.server > /home/enzotay/server.log 2>&1 &
echo "[Deploy] Backend server launched on port 5001."
