# ==============================================================================
# Initialisation Acte de Service & Suppléance (Windows PowerShell - Jour 3)
# ==============================================================================
$ErrorActionPreference = "Stop"

$serverName = "localhost"
$baseUrl = "http://localhost"
$adminUser = "admin"
$adminPass = "AdminSecret2026!"
$botUser = "bot"
$botPass = "CHANGEME_BOT_PASSWORD_24B"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if ($k -eq "SYNAPSE_ADMIN_USER") { $adminUser = $v }
            if ($k -eq "SYNAPSE_ADMIN_PASSWORD") { $adminPass = $v }
            if ($k -eq "BOT_USER") { $botUser = $v }
            if ($k -eq "BOT_PASSWORD") { $botPass = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
        }
    }
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   INITIALISATION DU SOCLE ACTES DE SERVICE & SUPPLÉANCE (JOUR 3)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

# 0. Attente de la disponibilité de Synapse
Write-Host "[*] Verification de la disponibilite du conteneur Synapse sur $baseUrl..." -ForegroundColor Yellow
$maxRetries = 20
$retries = 0
$synapseReady = $false
while (-not $synapseReady -and $retries -lt $maxRetries) {
    try {
        $check = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/versions" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($check.versions) {
            $synapseReady = $true
            Write-Host "    [SUCCES] Synapse operationnel et pret." -ForegroundColor Green
        }
    } catch {
        $retries++
        Write-Host "    -> En attente de Synapse (tentative $retries/$maxRetries)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
}

if (-not $synapseReady) {
    Write-Host "    [ATTENTION] Synapse n'a pas repondu en 40s. Verification de l'etat Docker..." -ForegroundColor Yellow
    docker compose ps
}

# 1. Création agent3 et bot
function Register-User {
    param($u, $p, [bool]$adm)
    Write-Host "[*] Création du compte @${u}:${serverName}..."
    $admFlag = if ($adm) { "-a" } else { "--no-admin" }
    try {
        $cmd = "docker compose exec -T synapse register_new_matrix_user -u $u -p $p $admFlag -c /data/homeserver.yaml"
        $res = Invoke-Expression $cmd 2>&1 | Out-String
        if ($res -match "already exists|already taken") {
            Write-Host "    [INFO] Le compte '$u' existe deja." -ForegroundColor DarkGray
        } elseif ($res -match "success") {
            Write-Host "    [SUCCES] Compte '$u' cree avec succes." -ForegroundColor Green
        }
    } catch {
        Write-Host "    [INFO] Inscription traitee : $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

Register-User -u "agent3" -p "Agent3Secret2026!" -adm $false
Register-User -u $botUser -p $botPass -adm $false

# 2. Login admin
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $adminUser }
    password = $adminPass
} | ConvertTo-Json -Depth 3

$loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
$adminToken = $loginRes.access_token

# 3. Création des 3 salons
function Create-Room {
    param($name, [bool]$encrypted, $invites)
    $initState = @()
    if ($encrypted) {
        $initState = @(@{ type = "m.room.encryption"; state_key = ""; content = @{ algorithm = "m.megolm.v1.aes-sha2" } })
    }
    $body = @{
        name = $name
        preset = "private_chat"
        visibility = "private"
        initial_state = $initState
        invite = $invites
    } | ConvertTo-Json -Depth 5

    $res = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/createRoom" -Method Post -Body $body -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json"
    return $res.room_id
}

Write-Host "[1/3] Création de #actes-service (chiffré Megolm)..." -ForegroundColor Yellow
$serviceRoom = Create-Room -name "Actes de Service Confidentiels" -encrypted $true -invites @("@agent1:${serverName}", "@agent2:${serverName}")

Write-Host "[2/3] Création de #actes-coordination (non chiffré)..." -ForegroundColor Yellow
$coordRoom = Create-Room -name "Actes Coordination" -encrypted $false -invites @("@${botUser}:${serverName}", "@agent1:${serverName}", "@agent2:${serverName}", "@agent3:${serverName}")

Write-Host "[3/3] Création de #actes-admin (supervision)..." -ForegroundColor Yellow
$adminRoom = Create-Room -name "Actes Admin Supervision" -encrypted $false -invites @("@${botUser}:${serverName}")

# Faire rejoindre le bot
$botLogin = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $botUser }
    password = $botPass
} | ConvertTo-Json -Depth 3
try {
    $botRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $botLogin -ContentType "application/json"
    $botToken = $botRes.access_token
    Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$coordRoom/join" -Method Post -Headers @{ Authorization = "Bearer $botToken" } | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$adminRoom/join" -Method Post -Headers @{ Authorization = "Bearer $botToken" } | Out-Null
} catch {}

# Mise a jour .env garantie (mise a jour ou ajout en fin de fichier)
if (Test-Path ".env") {
    $envLines = [System.IO.File]::ReadAllLines((Resolve-Path ".env"))
    $keysToSet = @{
        "COORDINATION_ROOM_ID" = $coordRoom
        "ADMIN_ROOM_ID" = $adminRoom
        "ACTES_SERVICE_ROOM_ID" = $serviceRoom
    }
    $updatedKeys = @{}
    $newLines = @()
    foreach ($line in $envLines) {
        $replaced = $false
        foreach ($k in $keysToSet.Keys) {
            if ($line -match "^$k\s*=") {
                $newLines += "$k=$($keysToSet[$k])"
                $updatedKeys[$k] = $true
                $replaced = $true
                break
            }
        }
        if (-not $replaced) {
            $newLines += $line
        }
    }
    foreach ($k in $keysToSet.Keys) {
        if (-not $updatedKeys[$k]) {
            $newLines += "$k=$($keysToSet[$k])"
        }
    }
    [System.IO.File]::WriteAllLines((Resolve-Path ".env"), $newLines)
}

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host " [SUCCÈS] Salons Jour 3 créés et enregistrés :" -ForegroundColor Green
Write-Host " - Salon chiffré #actes-service  : $serviceRoom (Bot strictement exclu : OUI)"
Write-Host " - Salon coordination            : $coordRoom"
Write-Host " - Salon supervision admin       : $adminRoom"
Write-Host "==============================================================================" -ForegroundColor Green
