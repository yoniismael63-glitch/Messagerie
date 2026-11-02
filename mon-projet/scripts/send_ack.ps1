# ==============================================================================
# Émission de l'Accusé Probant par Hash SHA-256 (PowerShell - Jour 3)
# ==============================================================================
param(
    [Parameter(Mandatory=$true)][string]$Agent,
    [Parameter(Mandatory=$true)][string]$EventId,
    [Parameter(Mandatory=$true)][string]$RoomId,
    [string]$ActeId = ""
)

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost"
$serverName = "localhost"
$coordinationId = ""

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if ($k -eq "COORDINATION_ROOM_ID") { $coordinationId = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
        }
    }
}

$cleanAgent = $Agent.TrimStart("@").Split(":")[0]
$agentPass = "CHANGEME_${cleanAgent.ToUpper()}_PASS_24B"
if ($cleanAgent -eq "admin") { $agentPass = "AdminSecret2026!" }
elseif ($cleanAgent -eq "agent3") { $agentPass = "Agent3Secret2026!" }

# 1. Login agent
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $cleanAgent }
    password = $agentPass
} | ConvertTo-Json -Depth 3

$loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.access_token

# 2. Récupération de l'événement chiffré depuis Synapse
$encRoom = [System.Uri]::EscapeDataString($RoomId)
$encEv = [System.Uri]::EscapeDataString($EventId)
$evRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$encRoom/event/$encEv" -Headers @{ Authorization = "Bearer $token" }

$ciphertext = $evRes.content.ciphertext
if (-not $ciphertext) {
    Write-Host "[ERREUR] Le champ 'ciphertext' est absent de l'événement $EventId" -ForegroundColor Red
    exit 1
}

# 3. Calcul du hash SHA-256
$cipherBytes = [System.Text.Encoding]::UTF8.GetBytes($ciphertext)
$shaBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash($cipherBytes)
$shaHex = ($shaBytes | ForEach-Object { $_.ToString("x2") }) -join ""
$ackHash = "sha256:$shaHex"

# Recherche de l'acte_id si non fourni
if (-not $ActeId -and (Test-Path "data/main_courante.jsonl")) {
    $match = Get-Content "data/main_courante.jsonl" | Select-String -Pattern [regex]::Escape($EventId) | Select-Object -Last 1
    if ($match -and $match.Line -match '"acte_id":\s*"([^"]+)"') {
        $ActeId = $matches[1]
    }
}
if (-not $ActeId) { $ActeId = "acte_inconnu" }

# 4. Envoi de l'accusé com.example.acte_service.ack dans #actes-coordination
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$ackBody = @{
    acte_id = $ActeId
    ack_hash = $ackHash
    ts = $now
} | ConvertTo-Json

$txn = "txn_ack_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$coordinationId/send/com.example.acte_service.ack/$txn" -Method Put -Body $ackBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" | Out-Null

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host " [ACCUSÉ PROBANT EXPÉDIÉ AVEC SUCCÈS]" -ForegroundColor Green
Write-Host " - acte_id  : $ActeId"
Write-Host " - ack_hash : $ackHash"
Write-Host " - Signé par: @${cleanAgent}:${serverName}"
Write-Host "==============================================================================" -ForegroundColor Green
