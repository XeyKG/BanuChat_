#!/bin/sh
# Installs only the pinned package under its own unprivileged Linux account.
# Does not start n8n, import workflows, expose ports or touch the BanuChat API.
set -eu
test "$(id -u)" = 0
node -e 'if(Number(process.versions.node.split(".")[0])<24)process.exit(1)'
if getent passwd banuchat-n8n >/dev/null; then
 test "$(getent passwd banuchat-n8n | cut -d: -f6)" = /var/lib/banuchat-n8n
else
 useradd --system --home-dir /var/lib/banuchat-n8n --shell /sbin/nologin banuchat-n8n
fi
install -d -m 0700 -o banuchat-n8n -g banuchat-n8n /var/lib/banuchat-n8n
install -d -m 0755 /opt/banuchat/operations
install -d -m 0755 -o banuchat-n8n -g banuchat-n8n /opt/banuchat/operations/n8n
if test -e /opt/banuchat/operations/n8n/package.json; then
 node -e 'const p=require("/opt/banuchat/operations/n8n/package.json");if(p.dependencies?.n8n!=="2.40.5")process.exit(1)'
else
 runuser -u banuchat-n8n -- env NODE_OPTIONS=--max-old-space-size=1024 npm install --prefix /opt/banuchat/operations/n8n --save-exact --omit=dev --no-audit --no-fund n8n@2.40.5
fi
node -e 'const p=require("/opt/banuchat/operations/n8n/node_modules/n8n/package.json");if(p.version!=="2.40.5")process.exit(1);console.log("N8N_PACKAGE_INSTALLED "+p.version)'
