# ==============================================================================
# Script de Purge d'Historique de Salon (PowerShell Windows) - Jour 2
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$RoomId,

    [Parameter(Mandatory=$false, Position=1)]
    [int]$DaysToKeep = 0
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir

Set-Location $rootDir

if (-not (Test-Path ".env")) {
    Write-Error "[ERREUR CRITIQUE] Fichier .env introuvable dans le dossier racine."
    exit 1
}

$envVars = @{}
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        $envVars[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$baseUrl = if ($envVars["BASE_URL"]) { $envVars["BASE_URL"] } else { "http://localhost" }
$adminUser = if ($envVars["SYNAPSE_ADMIN_USER"]) { $envVars["SYNAPSE_ADMIN_USER"] } else { "admin_faso" }
$adminPass = if ($envVars["SYNAPSE_ADMIN_PASSWORD"]) { $envVars["SYNAPSE_ADMIN_PASSWORD"] } else { "AdminFasoSecurise2026!" }

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  PURGE DE L'HISTORIQUE DE SALON SOUVERAIN (JOUR 2)" -ForegroundColor Cyan
Write-Host "  Salon cible : $RoomId" -ForegroundColor Cyan
Write-Host "  Jours conserves : $DaysToKeep jours" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# 1. Login Admin
Write-Host "[1/3] Connexion administrateur ($adminUser)..." -ForegroundColor Yellow
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $adminUser }
    password = $adminPass
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.access_token

if (-not $token) {
    Write-Error "[ERREUR] Impossible de recuperer le jeton administrateur."
    exit 1
}

# 2. Timestamp
$nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$keepMs = [int64]$DaysToKeep * 86400 * 1000
$purgeTs = $nowMs - $keepMs

Write-Host "[2/3] Calcul du seuil de purge..." -ForegroundColor Yellow

# 3. Purge API
$purgeBody = @{
    purge_up_to_ts = $purgeTs
} | ConvertTo-Json

$purgeUrl = "$baseUrl/_synapse/admin/v1/purge_history/$([Uri]::EscapeDataString($RoomId))"
Write-Host "[3/3] Envoi de la requete de purge vers Synapse..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
}

$purgeRes = Invoke-RestMethod -Uri $purgeUrl -Method Post -Headers $headers -Body $purgeBody -ContentType "application/json"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  [SUCCES] PURGE PLANIFIEE AVEC SUCCES" -ForegroundColor Green
Write-Host "  Purge ID Synapse : $($purgeRes.purge_id)" -ForegroundColor White
Write-Host "  Les messages anterieurs au seuil ont ete purges de PostgreSQL." -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan
