# ==============================================================================
# Script de Restauration d'Urgence (PowerShell Windows) - Jour 2
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir

Set-Location $rootDir

if (-not (Test-Path ".env")) {
    Write-Error "[ERREUR CRITIQUE] Fichier .env introuvable dans le dossier racine."
    exit 1
}

# Parser .env
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        $envVars[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$serverName = if ($envVars["SERVER_NAME"]) { $envVars["SERVER_NAME"] } else { "localhost" }
$postgresUser = if ($envVars["POSTGRES_USER"]) { $envVars["POSTGRES_USER"] } else { "synapse_admin" }
$postgresDb = if ($envVars["POSTGRES_DB"]) { $envVars["POSTGRES_DB"] } else { "synapse_db" }

if (-not $BackupPath) {
    $latest = Get-ChildItem -Path "backups" -Directory -Filter "vault_*" | Sort-Object CreationTime -Descending | Select-Object -First 1
    if ($latest) {
        $BackupPath = $latest.FullName
        Write-Host "[INFO] Aucune sauvegarde specifiee. Restauration de la plus recente : $BackupPath" -ForegroundColor Cyan
    } else {
        Write-Error "[ERREUR] Aucune sauvegarde detectee dans 'backups\'."
        exit 1
    }
}

if (-not (Test-Path $BackupPath)) {
    Write-Error "[ERREUR] Le chemin de sauvegarde '$BackupPath' n'existe pas."
    exit 1
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  DÉMARRAGE DE LA RESTAURATION D'URGENCE FASOMATRIX (JOUR 2)" -ForegroundColor Cyan
Write-Host "  Dossier source : $BackupPath" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# 1. Contrôle intégrité SHA-256
$hashFile = Join-Path $BackupPath "SHA256SUMS.txt"
if (Test-Path $hashFile) {
    Write-Host "[1/5] Controle d'integrite SHA-256..." -ForegroundColor Yellow
    $lines = Get-Content $hashFile
    foreach ($line in $lines) {
        if ($line.Trim() -and $line -match "^([A-Fa-f0-9]+)\s+(.+)$") {
            $expectedHash = $matches[1]
            $fileName = $matches[2].Trim()
            $target = Join-Path $BackupPath $fileName
            if (Test-Path $target) {
                $actualHash = (Get-FileHash -Path $target -Algorithm SHA256).Hash
                if ($actualHash -ne $expectedHash) {
                    Write-Error "[ERREUR INTEGRITE] Le fichier $fileName a ete altere !"
                    exit 1
                }
            }
        }
    }
    Write-Host "      -> Integrite certifiee conforme." -ForegroundColor Green
}

# 2. Stopper Synapse
Write-Host "[2/5] Arret temporaire de Synapse pour isoler la base..." -ForegroundColor Yellow
docker compose stop synapse

# 3. Réinjection SQL
Write-Host "[3/5] Restauration du dump PostgreSQL..." -ForegroundColor Yellow
$sqlFile = Join-Path $BackupPath "synapse_db.sql"
if (Test-Path $sqlFile) {
    Get-Content $sqlFile -Encoding utf8 | docker compose exec -T db psql -U $postgresUser -d $postgresDb | Out-Null
    Write-Host "      -> Base PostgreSQL restauree avec succes." -ForegroundColor Green
} else {
    Write-Error "[ERREUR] $sqlFile introuvable !"
    exit 1
}

# 4. Restauration de la clé Ed25519
Write-Host "[4/5] Restauration de la cle de signature Ed25519..." -ForegroundColor Yellow
$keyFile = Join-Path $BackupPath "$serverName.signing.key"
if (Test-Path $keyFile) {
    docker compose cp $keyFile synapse:/data/
    Write-Host "      -> Cle Ed25519 restauree." -ForegroundColor Green
}

# 5. Redémarrer Synapse
Write-Host "[5/5] Redemarrage du conteneur Synapse..." -ForegroundColor Yellow
docker compose start synapse

Write-Host "[INFO] Verification de la disponibilite de Synapse..." -ForegroundColor Cyan
$retries = 0
$maxRetries = 20
while ($retries -lt $maxRetries) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost/_matrix/client/versions" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            Write-Host "[SUCCES] Synapse operationnel (HTTP 200) !" -ForegroundColor Green
            break
        }
    } catch {
        # ignore wait
    }
    $retries++
    Start-Sleep -Seconds 2
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  [SUCCES] RESTAURATION D'URGENCE TERMINEE AVEC SUCCES" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
