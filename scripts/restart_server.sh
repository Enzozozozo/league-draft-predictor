#!/bin/sh
# Instant backend restart script executed by cPanel deployment

PORT=5005
echo "[Deploy] Restarting Python backend on port $PORT..."

# 1. Sync updated files to public_html/draft if run from backend repo
if [ -d "/home/enzotay/public_html/draft" ]; then
  echo "[Deploy] Syncing updated backend & .htaccess to public_html/draft..."
  [ -f "dist/.htaccess" ] && cp "dist/.htaccess" "/home/enzotay/public_html/draft/.htaccess"
  [ -f "passenger_wsgi.py" ] && cp "passenger_wsgi.py" "/home/enzotay/public_html/draft/passenger_wsgi.py"
  [ -d "src" ] && cp -r src "/home/enzotay/public_html/draft/"
  [ -d "models" ] && cp -r models "/home/enzotay/public_html/draft/"
  mkdir -p "/home/enzotay/public_html/draft/tmp"
  touch "/home/enzotay/public_html/draft/tmp/restart.txt"
fi

# 2. Kill old backend process on port 5005
fuser -k -9 $PORT/tcp 2>/dev/null || true
python3 -c "
import os, signal

port_hex = f'{5005:04X}'
inodes = set()
for tcp_path in ('/proc/net/tcp', '/proc/net/tcp6'):
    if os.path.exists(tcp_path):
        try:
            with open(tcp_path, 'r') as f:
                for line in f:
                    parts = line.split()
                    if len(parts) > 9 and parts[1].endswith(':' + port_hex):
                        inodes.add(f'socket:[{parts[9]}]')
        except Exception:
            pass

my_pid = os.getpid()
if os.path.exists('/proc'):
    for p in os.listdir('/proc'):
        if p.isdigit() and int(p) != my_pid:
            pid = int(p)
            killed = False
            fd_dir = f'/proc/{p}/fd'
            if os.path.exists(fd_dir):
                try:
                    for fd in os.listdir(fd_dir):
                        try:
                            if os.readlink(f'{fd_dir}/{fd}') in inodes:
                                os.kill(pid, signal.SIGKILL)
                                killed = True
                                break
                        except Exception:
                            pass
                except Exception:
                    pass
            if not killed:
                try:
                    with open(f'/proc/{p}/cmdline', 'rb') as f:
                        c = f.read().decode('utf-8', errors='ignore')
                    if ('src.backend.server' in c or 'server.py' in c) and 'kill' not in c:
                        os.kill(pid, signal.SIGKILL)
                except Exception:
                    pass
" 2>/dev/null || true
pkill -9 -f "src.backend.server" 2>/dev/null || true
pkill -9 -f "server.py" 2>/dev/null || true
sleep 1

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
export DRAFT_PORT=$PORT
nohup "$PYTHON_BIN" -m src.backend.server > /home/enzotay/server.log 2>&1 &
echo "[Deploy] Backend server launched on port $PORT."
