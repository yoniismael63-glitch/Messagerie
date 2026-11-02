# ==============================================================================
# Script PowerShell de peuplement (Seed) démo souveraine FasoMatrix
# Compatible Windows PowerShell 5.1 & PowerShell 7+
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   FASOMATRIX - VALIDATION DU SOCLE SOUVERAIN (JOUR 1 - WINDOWS)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

# Lecture des identifiants depuis .env
$adminUser = "admin"
$adminPass = "CHANGEME_ADMIN_PASSWORD_24B"
$agent1User = "agent1"
$agent1Pass = "CHANGEME_AGENT1_PASS_24B"
$agent2User = "agent2"
$agent2Pass = "CHANGEME_AGENT2_PASS_24B"
$serverName = "localhost"
$baseUrl = "http://localhost"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if ($k -eq "SYNAPSE_ADMIN_USER") { $adminUser = $v }
            if ($k -eq "SYNAPSE_ADMIN_PASSWORD") { $adminPass = $v }
            if ($k -eq "DEMO_AGENT1_USER") { $agent1User = $v }
            if ($k -eq "DEMO_AGENT1_PASSWORD") { $agent1Pass = $v }
            if ($k -eq "DEMO_AGENT2_USER") { $agent2User = $v }
            if ($k -eq "DEMO_AGENT2_PASSWORD") { $agent2Pass = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
        }
    }
}

Write-Host "`n[1/5] Verification de la disponibilite de Synapse sur $baseUrl..." -ForegroundColor Yellow
$maxRetries = 20
$retries = 0
$synapseReady = $false
while (-not $synapseReady -and $retries -lt $maxRetries) {
    try {
        $check = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/versions" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($check.versions) {
            $synapseReady = $true
            Write-Host "  [SUCCES] Synapse repond sur l'API $baseUrl" -ForegroundColor Green
        }
    } catch {
        $retries++
        Write-Host "  -> En attente de Synapse (tentative $retries/$maxRetries)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
}
if (-not $synapseReady) {
    Write-Host "  [ERREUR] Synapse ne repond pas encore sur $baseUrl. Verifiez avec : docker compose ps" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/5] Enrolement des comptes d'administration et des agents..." -ForegroundColor Yellow

function Register-MatrixUser($user, $pass, $isAdmin) {
    $flag = if ($isAdmin) { "-a" } else { "--no-admin" }
    Write-Host "  -> Creation du compte @${user}:${serverName}..."
    $res = docker compose exec -T synapse register_new_matrix_user -u $user -p $pass $flag -c /data/homeserver.yaml 2>&1
    if ($res -match "already taken|already exists") {
        Write-Host "     [INFO] Le compte '$user' existe deja (idempotent)." -ForegroundColor DarkGray
    } elseif ($res -match "success") {
        Write-Host "     [SUCCES] Compte '$user' cree avec succes !" -ForegroundColor Green
    } else {
        Write-Host "     [INFO] $res" -ForegroundColor DarkGray
    }
}

Register-MatrixUser -user $adminUser -pass $adminPass -isAdmin $true
Register-MatrixUser -user $agent1User -pass $agent1Pass -isAdmin $false
Register-MatrixUser -user $agent2User -pass $agent2Pass -isAdmin $false

Write-Host "`n[3/5] Connexion administrateur pour initialiser le salon chiffre..." -ForegroundColor Yellow
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $adminUser }
    password = $adminPass
} | ConvertTo-Json -Depth 3

try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.access_token
    Write-Host "  [SUCCES] Authentification reussie. Token admin obtenu." -ForegroundColor Green
} catch {
    $detail = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $detail += " : " + $_.ErrorDetails.Message
    }
    Write-Host "  [ERREUR AUTHENTIFICATION] Echec de la connexion pour l'utilisateur '$adminUser' : $detail" -ForegroundColor Red
    Write-Host "  [CAUSE] La base de donnees existante contient deja l'utilisateur avec un autre mot de passe." -ForegroundColor Yellow
    Write-Host "  -> Pour reinitialiser completement la base : docker compose down -v puis docker compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[4/5] Creation du salon avec chiffrement Megolm (m.megolm.v1.aes-sha2)..." -ForegroundColor Yellow
$roomBody = @{
    name = "Cellule Souveraine - Demo Jour 1"
    topic = "Salon chiffre de bout en bout - Administration Publique"
    preset = "private_chat"
    visibility = "private"
    initial_state = @(
        @{
            type = "m.room.encryption"
            state_key = ""
            content = @{ algorithm = "m.megolm.v1.aes-sha2" }
        }
    )
    invite = @("@${agent1User}:${serverName}", "@${agent2User}:${serverName}")
} | ConvertTo-Json -Depth 5

$roomRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/createRoom" -Method Post -Body $roomBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json"
$roomId = $roomRes.room_id
Write-Host "  [SUCCES] Salon cree avec ID : $roomId" -ForegroundColor Green

Write-Host "`n[5/5] Verification formelle du chiffrement de bout en bout..." -ForegroundColor Yellow
$stateRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$roomId/state/m.room.encryption" -Method Get -Headers @{ Authorization = "Bearer $token" }
if ($stateRes.algorithm -eq "m.megolm.v1.aes-sha2") {
    Write-Host "  [SUCCES VALIDE] Chiffrement Megolm (m.megolm.v1.aes-sha2) ACTIF et VERIFIE !" -ForegroundColor Green
}

Write-Host "`n==============================================================================" -ForegroundColor Cyan
Write-Host "               SOCLE OPERATIONNEL AVEC SUCCES" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "1. Accedez a Element Web : $baseUrl (imperativement http://localhost)"
Write-Host "2. Agent 1 : utilisateur '$agent1User' / mot de passe '$agent1Pass'"
Write-Host "3. Agent 2 : utilisateur '$agent2User' / mot de passe '$agent2Pass'"
Write-Host "==============================================================================" -ForegroundColor Cyan
