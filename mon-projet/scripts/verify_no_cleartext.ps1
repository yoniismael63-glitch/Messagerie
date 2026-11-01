param (
    [Parameter(Mandatory=$true)]
    [string]$SearchText
)

$ErrorActionPreference = "Stop"

$postgresUser = "synapse_admin"
$postgresDb = "synapse_db"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if ($k -eq "POSTGRES_USER") { $postgresUser = $v }
            if ($k -eq "POSTGRES_DB") { $postgresDb = $v }
        }
    }
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   AUDIT CONTRADICTOIRE DU CHIFFREMENT DE BOUT EN BOUT (WINDOWS)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "[AUDIT] Recherche de fuite en clair pour : '$SearchText'" -ForegroundColor Yellow

$leakDetected = $false

# 1. Vérification dans les logs
Write-Host "`n[1/2] Inspection des journaux applicatifs Synapse..." -ForegroundColor Yellow
$logMatches = docker compose logs synapse 2>&1 | Select-String -Pattern $SearchText
if ($logMatches) {
    Write-Host "  [ALERTE SECURITE] Texte en clair trouve dans les logs Synapse !" -ForegroundColor Red
    $leakDetected = $true
} else {
    Write-Host "  [SUCCES] Aucun texte clair trouve dans les logs Synapse." -ForegroundColor Green
}

# 2. Vérification dans PostgreSQL
Write-Host "`n[2/2] Inspection directe des tables PostgreSQL ('events' et 'event_json')..." -ForegroundColor Yellow

$eventsCountRaw = docker compose exec -T db psql -U $postgresUser -d $postgresDb -tAc "SELECT count(*) FROM events WHERE content ILIKE '%$SearchText%';" 2>&1
$jsonCountRaw = docker compose exec -T db psql -U $postgresUser -d $postgresDb -tAc "SELECT count(*) FROM event_json WHERE json ILIKE '%$SearchText%';" 2>&1

$eventsCount = [int]($eventsCountRaw.Trim())
$jsonCount = [int]($jsonCountRaw.Trim())

Write-Host "  -> Occurrences dans 'events'     : $eventsCount"
Write-Host "  -> Occurrences dans 'event_json' : $jsonCount"

if ($eventsCount -gt 0 -or $jsonCount -gt 0) {
    Write-Host "  [ALERTE SECURITE] Texte en clair detecte dans la base PostgreSQL !" -ForegroundColor Red
    $leakDetected = $true
} else {
    Write-Host "  [SUCCES] Aucune occurrence en clair dans la base PostgreSQL." -ForegroundColor Green
}

Write-Host "`n==============================================================================" -ForegroundColor Cyan
if (-not $leakDetected) {
    Write-Host "   RESULTAT OFFICIEL : OK : aucun clair trouve" -ForegroundColor Green
    Write-Host "   - Le serveur et la base de donnees ne possedent que du ciphertext Megolm."
    Write-Host "==============================================================================" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "   RESULTAT OFFICIEL : ECHEC : clair detecte" -ForegroundColor Red
    Write-Host "==============================================================================" -ForegroundColor Cyan
    exit 1
}
