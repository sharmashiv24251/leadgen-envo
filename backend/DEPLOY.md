# GCP VM setup — outreach-leadgen

Run these in order, in the browser SSH session (Compute Engine → VM instances → SSH on `outreach-leadgen`).

Swap and sudo are already done. Start from step 1.

## 1. Install prerequisites
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates build-essential
```

## 2. Install Node.js 22 (current LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

## 3. Install the Claude Code CLI
```bash
sudo npm install -g @anthropic-ai/claude-code
claude --version
```

## 4. Clone the repo (public, no auth needed)
```bash
git clone https://github.com/sharmashiv24251/leadgen-envo.git
cd leadgen-envo/backend
```

## 5. Create `.env`
This repo is **public** — never put real secrets in a committed file. Copy the actual values
from your local `backend/.env` (open it on your Mac) and substitute them below, then paste the
whole block as one command on the VM:
```bash
cat > .env << 'EOF'
SUPABASE_URL=<same as local backend/.env>
SUPABASE_SERVICE_KEY=<same as local backend/.env>
SUPABASE_FN_URL=<same as local backend/.env>
AGENT_TOKEN=<same as local backend/.env>
CLIENT_SLUG=workenvo
TZ=Europe/Dublin
CLAUDE_CODE_OAUTH_TOKEN=<same as local backend/.env>
EOF
chmod 600 .env
```

## 6. Install backend dependencies
```bash
npm install
```

## 7. Smoke test — Claude auth + Supabase connectivity
```bash
set -a; source .env; set +a
claude -p "say hello"
node -e "
import('./src/supabaseClient.js').then(async ({ getClientId }) => {
  console.log('client id:', await getClientId('workenvo'));
}).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
"
```
Both must succeed (a greeting, then a client id) before continuing.

## 8. Set up the systemd service (auto-restart, survives reboot)
```bash
sudo tee /etc/systemd/system/workenvo-scheduler.service > /dev/null <<EOF
[Unit]
Description=Workenvo Outreach Scheduler
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$HOME/leadgen-envo/backend
ExecStart=$(which npm) start
Restart=always
RestartSec=10
EnvironmentFile=$HOME/leadgen-envo/backend/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable workenvo-scheduler
sudo systemctl start workenvo-scheduler
sudo systemctl status workenvo-scheduler
```
Status should show `active (running)` in green.

## 9. Watch it live
```bash
sudo journalctl -u workenvo-scheduler -f
```
Ctrl+C to stop watching (doesn't stop the service).

## Redeploying later
```bash
cd ~/leadgen-envo/backend
git pull
npm install
sudo systemctl restart workenvo-scheduler
sudo systemctl status workenvo-scheduler
sudo journalctl -u workenvo-scheduler -f
```

## Second client: thehrcompany-scheduler

Same repo checkout, same `npm start` entrypoint — only the `.env` and the systemd unit name
differ. `runOnce.js` branches per `CLIENT_SLUG` to spawn `agy` instead of `claude`, downloads
skill files from the `thehrcompany-skill` bucket, and runs in its own `workspace/thehrcompany`
subdirectory so it can never collide with a concurrently-running workenvo run.

### 1. Install and authenticate `agy` (one-time, interactive)
```bash
# install per Antigravity's own instructions, then:
agy
```
Complete the one-time interactive login (OAuth or API key) as the `info` OS user — same user
`workenvo-scheduler` already runs as, confirmed via `systemctl show workenvo-scheduler -p User`.
The credential is cached per-OS-user, so this only needs to happen once; after that `agy -p
"..."` runs fully headless. Confirm with:
```bash
agy -p "say hello"
```

### 2. Create `thehrcompany.env`
```bash
cd ~/leadgen-envo/backend
cat > thehrcompany.env << 'EOF'
SUPABASE_URL=<same as workenvo's .env>
SUPABASE_SERVICE_KEY=<same as workenvo's .env>
SUPABASE_FN_URL=<same as workenvo's .env>
AGENT_TOKEN=<same as workenvo's .env>
CLIENT_SLUG=thehrcompany
TZ=Europe/Dublin
EOF
chmod 600 thehrcompany.env
```
Notice there's no per-client schedule setting here at all. The daily trigger time and the quota
both live in Supabase (`config.daily_run_time` and `config.daily_quota`) and are read fresh on
every 30s poll tick — changing either one is a single `UPDATE`, no `.env` edit, no redeploy,
ever. `runBatch()` already chunks whatever quota comes back into groups of 3 regardless of the
total (10 → 3+3+3+1, 20 → 3+3+3+3+3+3+2, etc.) — that part needed no changes. Leave
`config.daily_run_time` unset for Workenvo and it keeps its original 07:00 default.

### 3. Smoke test before wiring up the service
```bash
set -a; source thehrcompany.env; set +a
node -e "
import('./src/supabaseClient.js').then(async ({ getClientId }) => {
  console.log('client id:', await getClientId('thehrcompany'));
}).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
"
```

### 4. Set up the systemd service
```bash
sudo tee /etc/systemd/system/thehrcompany-scheduler.service > /dev/null <<EOF
[Unit]
Description=The HR Company Outreach Scheduler
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$HOME/leadgen-envo/backend
ExecStart=$(which npm) start
Restart=always
RestartSec=10
EnvironmentFile=$HOME/leadgen-envo/backend/thehrcompany.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable thehrcompany-scheduler
sudo systemctl start thehrcompany-scheduler
sudo systemctl status thehrcompany-scheduler
```
`workenvo-scheduler` and `thehrcompany-scheduler` are two independent systemd units running the
same code with different `EnvironmentFile`s — starting/restarting one never touches the other.

### 5. Watch the first real run
```bash
sudo journalctl -u thehrcompany-scheduler -f
```
`config.paused=true` is still set for `thehrcompany` — nothing will actually fire until that's
flipped to `false` in Supabase, once someone's ready to watch the first unattended run complete
end to end.

### Redeploying later (affects both clients — same code)
```bash
cd ~/leadgen-envo/backend
git pull
npm install
sudo systemctl restart workenvo-scheduler
sudo systemctl restart thehrcompany-scheduler
```
