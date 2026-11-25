# Pixel Worker — Agentgateway + Infisical + OpenRC + Firewall

Setup for running **Agentgateway** on `pixel-worker-01` (postmarketOS / Alpine ARM64) with:

- Agentgateway exposed to the LAN
- Persistent nftables firewall rules
- Infisical secret injection
- GitHub MCP authentication
- OpenRC service management
- Automatic startup after reboot
- Agentgateway running as the `gmiranda` user

## Architecture

```text
VS Code / MCP Client
        │
        │ http://10.0.0.115:4000/mcp
        ▼
   Agentgateway
   pixel-worker-01
        │
        │ Authorization: Bearer $GITHUB_PAT
        ▼
   GitHub MCP
   https://api.githubcopilot.com/mcp/
        ▲
        │
    github_pat_home
        │
    Infisical
        ▲
        │
 Machine Identity
```

Startup flow:

```text
postmarketOS boot
        │
        ├── nftables
        │     ├── TCP 4000 → Agentgateway
        │     └── TCP 6379 → Redis
        │
        └── OpenRC
              │
              └── agentgateway
                     │
                     ▼
              start-agentgateway
                     │
                     ├── Infisical Universal Auth
                     ├── retrieve secrets
                     └── github_pat_home
                              │
                              ▼
                         Agentgateway
                         user: gmiranda
```

---

## 1. Agentgateway Configuration

Agentgateway configuration:

```text
/home/gmiranda/.config/agentgateway/config.yaml
```

Example:

```yaml
# yaml-language-server: $schema=https://agentgateway.dev/schema/config

config:
  database:
    url: sqlite:///home/gmiranda/.config/agentgateway/data.db

  modelCatalog:
    - file: /home/gmiranda/.config/agentgateway/base-costs.json

gateways:
  default:
    port: 4000

ui:
  gateways: default

llm:
  gateways: default
  models: []
  providers: []
  virtualModels: []

frontendPolicies:
  http:
    maxBufferSize: 33554432

mcp:
  gateways: default

  targets:
    - name: github
      mcp:
        host: https://api.githubcopilot.com/mcp/

      policies:
        backendAuth:
          key:
            value: $github_pat_home
```

The important part is:

```yaml
policies:
  backendAuth:
    key:
      value: $github_pat_home
```

The actual GitHub PAT is **not stored in this file**. It is injected into Agentgateway's environment by Infisical.

---

## 2. Install Infisical CLI

The Pixel runs:

```text
postmarketOS v26.06
aarch64
Alpine-based
```

Check:

```sh
uname -m
cat /etc/os-release
```

Install the Infisical Alpine repository:

```sh
wget -qO- 'https://artifacts-cli.infisical.com/setup.apk.sh' | sudo sh
```

Then:

```sh
sudo apk update
sudo apk add infisical
```

Verify:

```sh
infisical --version
```

Example:

```text
infisical version 0.43.138
```

---

## 3. Infisical Machine Identity

Create an Infisical Machine Identity for the server. For example:

```text
pixel-worker-01
```

Use **Universal Auth** and generate a Client ID and Client Secret. Give the identity read access to the Infisical project containing `github_pat_home`.

The GitHub PAT should exist as an Infisical secret:

```text
github_pat_home=github_pat_...
```

Do **not** store the PAT directly on the Pixel.

---

## 4. Test Infisical Authentication

Temporarily export the Machine Identity credentials:

```sh
export INFISICAL_CLIENT_ID='...'
export INFISICAL_CLIENT_SECRET='...'
```

Authenticate:

```sh
export INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --silent \
  --plain)
```

Verify without printing the token:

```sh
if [ -n "$INFISICAL_TOKEN" ]; then
  echo "Infisical authentication successful"
else
  echo "Infisical authentication failed"
fi
```

Expected:

```text
Infisical authentication successful
```

---

## 5. Test Secret Injection

Do not print the GitHub PAT. Instead:

```sh
infisical run \
  --projectId="<PROJECT_ID>" \
  --env=prod \
  -- sh -c 'if [ -n "$github_pat_home" ]; then echo "github_pat_home loaded successfully"; else echo "github_pat_home NOT found"; fi'
```

Expected:

```text
github_pat_home loaded successfully
```

This verifies the flow:

```text
Machine Identity
      ↓
Infisical
      ↓
github_pat_home
      ↓
process environment
```

---

## 6. Store Infisical Bootstrap Credentials

Create the credentials file:

```sh
sudo mkdir -p /etc/agentgateway
sudo vi /etc/agentgateway/infisical.env
```

Contents:

```sh
INFISICAL_CLIENT_ID='YOUR_CLIENT_ID'
INFISICAL_CLIENT_SECRET='YOUR_CLIENT_SECRET'
INFISICAL_PROJECT_ID='YOUR_PROJECT_ID'
INFISICAL_ENV='prod'
```

Protect the file:

```sh
sudo chown root:root /etc/agentgateway/infisical.env
sudo chmod 600 /etc/agentgateway/infisical.env
```

Verify:

```sh
sudo ls -l /etc/agentgateway/infisical.env
```

Expected permissions:

```text
-rw------- root root
```

The Machine Identity credentials are therefore readable only by root.

---

## 7. Agentgateway Startup Script

Create `/usr/local/bin/start-agentgateway`:

```sh
sudo vi /usr/local/bin/start-agentgateway
```

Contents:

```sh
#!/bin/sh

set -e

. /etc/agentgateway/infisical.env

export INFISICAL_CLIENT_ID
export INFISICAL_CLIENT_SECRET

INFISICAL_TOKEN="$(
    infisical login \
        --method=universal-auth \
        --client-id="$INFISICAL_CLIENT_ID" \
        --client-secret="$INFISICAL_CLIENT_SECRET" \
        --silent \
        --plain
)"

export INFISICAL_TOKEN

exec infisical run \
    --projectId="$INFISICAL_PROJECT_ID" \
    --env="$INFISICAL_ENV" \
    -- su -s /bin/sh gmiranda -c \
       '/usr/local/bin/agentgateway --file /home/gmiranda/.config/agentgateway/config.yaml'
```

Set ownership and permissions:

```sh
sudo chown root:root /usr/local/bin/start-agentgateway
sudo chmod 755 /usr/local/bin/start-agentgateway
```

### Important: shebang

The first line **must** be:

```sh
#!/bin/sh
```

Otherwise execution may fail with:

```text
Exec format error (os error 8)
```

Check:

```sh
sudo head -n 4 /usr/local/bin/start-agentgateway | cat -A
```

Expected:

```text
#!/bin/sh$
$
set -e$
```

---

## 8. Why the Launcher Starts as Root

The launcher needs access to `/etc/agentgateway/infisical.env`, which is `root:root` with mode `600`. Therefore, the startup chain initially runs as root.

After Infisical retrieves the secrets, the launcher executes:

```sh
su -s /bin/sh gmiranda -c \
  '/usr/local/bin/agentgateway --file /home/gmiranda/.config/agentgateway/config.yaml'
```

The actual Agentgateway process runs as `gmiranda`, rather than root.

Verify on BusyBox/postmarketOS:

```sh
ps -o user,pid,ppid,args | grep '[a]gentgateway'
```

Expected process chain:

```text
root      ... infisical run ...
root      ... su ... gmiranda ...
gmiranda  ... /usr/local/bin/agentgateway ...
```

---

## 9. Test Agentgateway Manually

Before using OpenRC:

```sh
sudo /usr/local/bin/start-agentgateway
```

Expected logs include:

```text
serving UI at http://localhost:4000/ui
started bind bind="bind/4000"
```

Local test:

```sh
curl -I http://127.0.0.1:4000/ui
```

LAN:

```text
http://10.0.0.115:4000/ui
```

---

## 10. Persistent Firewall Rules

The Pixel uses nftables. Main configuration:

```text
/etc/nftables.nft
```

Additional rules:

```text
/etc/nftables.d/
```

Verify nftables:

```sh
sudo rc-service nftables status
```

Expected:

```text
status: started
```

Verify the main config includes the directory:

```sh
grep -n "nftables.d" /etc/nftables.nft
```

---

## 11. Homelab Firewall Rules

Create:

```sh
sudo vi /etc/nftables.d/60_homelab-services.nft
```

Contents:

```nft
# Homelab services accessible from the local LAN

add rule inet filter input ip saddr 10.0.0.0/24 tcp dport 4000 accept comment "Agentgateway"

add rule inet filter input ip saddr 10.0.0.0/24 tcp dport 6379 accept comment "Redis"
```

This permits LAN access to:

| Port | Service |
| --- | --- |
| 4000 | Agentgateway |
| 6379 | Redis |

Only devices from `10.0.0.0/24` are allowed by these rules.

---

## 12. Validate Firewall Before Applying

Always validate first:

```sh
sudo nft -c -f /etc/nftables.nft
```

No output generally means the configuration is valid.

Then reload:

```sh
sudo rc-service nftables restart
```

Verify:

```sh
sudo nft list chain inet filter input | grep -E '4000|6379'
```

---

## 13. Why Agentgateway Became Unreachable After Reboot

A firewall rule created with:

```sh
sudo nft add rule ...
```

changes only the **current in-memory nftables ruleset**. For example:

```sh
sudo nft add rule inet filter input \
  ip saddr 10.0.0.0/24 \
  tcp dport 4000 accept
```

This works immediately but disappears after reboot unless saved into the persistent nftables configuration. Therefore, permanent rules belong under:

```text
/etc/nftables.d/
```

---

## 14. OpenRC Service

Agentgateway service:

```text
/etc/init.d/agentgateway
```

Contents:

```sh
#!/sbin/openrc-run

name="agentgateway"
description="Agentgateway AI Gateway"

command="/usr/local/bin/start-agentgateway"
command_background="yes"
pidfile="/run/${RC_SVCNAME}.pid"

directory="/home/gmiranda"

depend() {
    need net
    after nftables
}
```

Set permissions:

```sh
sudo chown root:root /etc/init.d/agentgateway
sudo chmod 755 /etc/init.d/agentgateway
```

---

## 15. Start / Stop / Restart Agentgateway

Start:

```sh
sudo rc-service agentgateway start
```

Stop:

```sh
sudo rc-service agentgateway stop
```

Restart:

```sh
sudo rc-service agentgateway restart
```

Status:

```sh
sudo rc-service agentgateway status
```

If Agentgateway was started manually with `agentgateway`, OpenRC does **not** own that process. Therefore, `sudo rc-service agentgateway stop` may report:

```text
WARNING: agentgateway is already stopped
```

even though a manually launched Agentgateway process exists. Use OpenRC consistently once the service is configured.

---

## 16. Enable Agentgateway at Boot

Add the service to the default runlevel:

```sh
sudo rc-update add agentgateway default
```

Verify:

```sh
rc-update show | grep agentgateway
```

Agentgateway should appear under `default`.

---

## 17. OpenRC Dependency Warnings

When starting Agentgateway, OpenRC may display unrelated dependency warnings such as:

```text
Service '81voltd' needs non existent service 'modemmanager'
Error: swap is the name of a real and virtual service.
```

These come from OpenRC rebuilding/caching its overall dependency graph. They are **not necessarily Agentgateway failures**.

The important line is:

```text
* Starting agentgateway ... [ ok ]
```

Confirm with:

```sh
sudo rc-service agentgateway status
```

and:

```sh
ps -o user,pid,ppid,args | grep '[a]gentgateway'
```

---

## 18. Check Agentgateway Process

postmarketOS uses BusyBox `ps`, so GNU syntax such as:

```sh
ps -C agentgateway
```

does not work.

Use:

```sh
ps -o user,pid,ppid,args | grep '[a]gentgateway'
```

The actual Agentgateway process should be owned by `gmiranda`.

---

## 19. Check Listening Port

Check port 4000:

```sh
sudo ss -lntp | grep 4000
```

Test locally:

```sh
curl -I http://127.0.0.1:4000/ui
```

Test from another LAN machine:

```text
http://10.0.0.115:4000/ui
```

---

## 20. VS Code MCP Configuration

VS Code should connect to **Agentgateway**, not directly to GitHub MCP. Use the VS Code **User/Profile MCP configuration** so the server is available across repositories. Do not create a per-repository `.vscode/mcp.json` unless the MCP server is genuinely project-specific.

Example user `mcp.json`:

```jsonc
{
  "servers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v2/mcp",
    },
    "homelab-agentgateway": {
      "type": "http",
      "url": "http://10.0.0.115:4000/mcp",
    },
  },
}
```

VS Code uses JSONC for this configuration, so trailing commas may be added automatically by the formatter and are valid.

VS Code does **not** need the GitHub PAT. The flow is:

```text
VS Code / Copilot Agent
       │
       │ MCP Streamable HTTP
       ▼
http://10.0.0.115:4000/mcp
       │
       ▼
Agentgateway
       │
       │ backendAuth: $github_pat_home
       ▼
GitHub MCP
       │
       ▼
GitHub API
```

### Validate the MCP endpoint directly

A plain GET without the required MCP `Accept` header may return `406 Not Acceptable`. That does **not** mean the endpoint is broken.

Use an MCP `initialize` request:

```sh
curl -i \
  -X POST \
  http://10.0.0.115:4000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0"
      }
    }
  }'
```

A healthy setup returns `HTTP/1.1 200 OK`, `content-type: text/event-stream`, an `mcp-session-id`, and an MCP response whose server name is `github-mcp-server`. This validates the path from the laptop through Agentgateway to the upstream GitHub MCP server.

### Validate from GitHub Copilot

In Copilot **Agent mode**, use a prompt that prevents fallback to the terminal or local Git context:

```text
Using only the GitHub MCP tools, call get_me and tell me the authenticated
GitHub username. Do not use the terminal, git, gh CLI, workspace files, or web.
Tell me which MCP tool you called.
```

A second useful test is:

```text
Use only the GitHub MCP tools to inspect goncalomiranda/home-dashboard.
List the open pull requests and the current Next.js version from package.json.
Do not use the terminal, git, gh CLI, workspace context, or web.
```

This was successfully validated: Copilot retrieved live repository information through the GitHub MCP tools, confirming the complete VS Code → Agentgateway → GitHub MCP path.

---

## 21. Reboot Verification

After changing startup or firewall configuration:

```sh
sudo reboot
```

After reconnecting, do **not** manually start Agentgateway.

Check OpenRC:

```sh
sudo rc-service agentgateway status
```

Check process ownership:

```sh
ps -o user,pid,ppid,args | grep '[a]gentgateway'
```

Check firewall:

```sh
sudo nft list chain inet filter input | grep -E '4000|6379'
```

Check local HTTP:

```sh
curl -I http://127.0.0.1:4000/ui
```

Finally, test from the laptop:

```text
http://10.0.0.115:4000/ui
```

---

## Quick Health Check

When Agentgateway is not reachable:

### 1. Is the service running?

```sh
sudo rc-service agentgateway status
```

### 2. Is the process running?

```sh
ps -o user,pid,ppid,args | grep '[a]gentgateway'
```

### 3. Is port 4000 listening?

```sh
sudo ss -lntp | grep 4000
```

### 4. Does it work locally?

```sh
curl -I http://127.0.0.1:4000/ui
```

### 5. Is the firewall rule present?

```sh
sudo nft list chain inet filter input | grep 4000
```

### 6. Is nftables running?

```sh
sudo rc-service nftables status
```

### 7. Is the Infisical GitHub secret present in the Agentgateway process?

Find the Agentgateway PID:

```sh
ps -o user,pid,ppid,args | grep '[a]gentgateway'
```

Then check only for the variable name without printing its value:

```sh
PID=1234 # Replace with the Agentgateway PID from above.
sudo sh -c 'tr "\0" "\n" < "/proc/$1/environ" | grep -q "^github_pat_home=" \
  && echo "GitHub PAT is present" \
  || echo "GitHub PAT is missing"' sh "$PID"
```

### 8. Test the full launcher manually

```sh
sudo /usr/local/bin/start-agentgateway
```

This tests:

```text
Infisical authentication
        ↓
secret retrieval
        ↓
github_pat_home injection
        ↓
Agentgateway startup
```

---

## Important Files

| File | Purpose |
| --- | --- |
| `/home/gmiranda/.config/agentgateway/config.yaml` | Agentgateway configuration |
| `/home/gmiranda/.config/agentgateway/data.db` | Agentgateway SQLite database |
| `/etc/agentgateway/infisical.env` | Infisical Machine Identity credentials |
| `/usr/local/bin/start-agentgateway` | Infisical + Agentgateway launcher |
| `/etc/init.d/agentgateway` | OpenRC service |
| `/etc/nftables.nft` | Main nftables configuration |
| `/etc/nftables.d/60_homelab-services.nft` | Homelab LAN firewall rules |

---

## Security Model

Secrets are intentionally separated:

```text
/etc/agentgateway/infisical.env
    │
    │ root:root 600
    │
    └── Infisical Machine Identity credentials
                │
                ▼
            Infisical
                │
                └── github_pat_home
                        │
                        │ runtime environment only
                        ▼
                  Agentgateway
```

The GitHub PAT is therefore **not stored in**:

```text
config.yaml
OpenRC service
start-agentgateway
VS Code mcp.json
```

Agentgateway receives it only at runtime through Infisical.
