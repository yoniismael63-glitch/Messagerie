# ==============================================================================
# Script de Sauvegarde Souveraine à Chaud (PowerShell Windows) - Jour 2
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir

Set-Location $rootDir

if (-not (Test-Path ".env")) {
    Write-Error "[ERREUR CRITIQUE] Fichier .env introuvable dans le dossier racine."
    exit 1
}

# Parser le fichier .env
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

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path "backups" "vault_$timestamp"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  DÉMARRAGE DE LA SAUVEGARDE SOUVERAINE FASOMATRIX (JOUR 2)" -ForegroundColor Cyan
Write-Host "  Répertoire cible : $backupDir" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 1. Vérification conteneur db
Write-Host "[1/4] Export de la base PostgreSQL '$postgresDb'..." -ForegroundColor Yellow
$sqlFile = Join-Path $backupDir "synapse_db.sql"
docker compose exec -T db pg_dump -U $postgresUser -d $postgresDb --clean --if-exists | Out-File -FilePath $sqlFile -Encoding utf8
Write-Host "      -> Base relationnelle exportee avec succes." -ForegroundColor Green

# 2. Clé cryptographique Ed25519
Write-Host "[2/4] Extraction de la cle Ed25519 (/data/$serverName.signing.key)..." -ForegroundColor Yellow
$keyFile = Join-Path $backupDir "$serverName.signing.key"
docker compose exec -T synapse cat "/data/$serverName.signing.key" | Out-File -FilePath $keyFile -Encoding utf8
Write-Host "      -> Cle de signature serveur sauvegardee." -ForegroundColor Green

# 3. Configuration et .env
Write-Host "[3/4] Archivage des fichiers de configuration..." -ForegroundColor Yellow
$hsFile = Join-Path $backupDir "homeserver.yaml"
docker compose exec -T synapse cat "/data/homeserver.yaml" | Out-File -FilePath $hsFile -Encoding utf8
Copy-Item ".env" (Join-Path $backupDir ".env.backup")
Write-Host "      -> homeserver.yaml et .env archives." -ForegroundColor Green

# 4. Scellement d'intégrité SHA-256
Write-Host "[4/4] Scellement cryptographique SHA-256..." -ForegroundColor Yellow
$hashFile = Join-Path $backupDir "SHA256SUMS.txt"
$hashes = Get-ChildItem -Path $backupDir -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" } | ForEach-Object {
    $h = Get-FileHash -Path $_.FullName -Algorithm SHA256
    "$($h.Hash)  $($_.Name)"
}
$hashes | Out-File -FilePath $hashFile -Encoding utf8

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  [SUCCES] SAUVEGARDE TERMINEE AVEC SUCCES" -ForegroundColor Green
Write-Host "  Emplacement : $backupDir" -ForegroundColor White
Write-Host "  Pour restaurer cette sauvegarde :" -ForegroundColor White
Write-Host "    .\scripts\restore.ps1 -BackupPath `"$backupDir`"" -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Cyan
