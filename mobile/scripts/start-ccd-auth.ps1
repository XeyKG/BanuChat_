# Public local configuration only. The operator starts Metro; no ADB action here.
param([switch]$ExpoGo)
$ErrorActionPreference = 'Stop'
if (Get-NetTCPConnection -State Listen -LocalPort 8084 -ErrorAction SilentlyContinue) {
    throw 'Port 8084 already in use; preserve its process and resolve explicitly.'
}
$env:EXPO_PUBLIC_DEMO_MODE = 'ccd_authenticated'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3004/api/v2'
$env:EXPO_PUBLIC_AUTH_LOCAL_CHANNEL = 'adb_reverse'
$env:EXPO_NO_TELEMETRY = '1'
Push-Location (Split-Path -Parent $PSScriptRoot)
# ADB reverse targets IPv4; Windows may resolve localhost to ::1 first.
# Use the existing development build by default; -ExpoGo requires a matching SDK.
$metroArguments = @('start','--localhost','--port','8084')
if ($ExpoGo) { $metroArguments += '--go' } else { $metroArguments += '--dev-client' }
try { node --dns-result-order=ipv4first node_modules/expo/bin/cli @metroArguments }
finally { Pop-Location }
