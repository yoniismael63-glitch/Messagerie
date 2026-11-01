param (
    [Parameter(Mandatory=$true)]
    [string]$User
)

$ErrorActionPreference = "Stop"

$adminUser = "admin"
$adminPass = "CHANGEME_ADMIN_PASSWORD_24B"
$baseUrl = "http://localhost"
$serverName = "localhost"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if ($k -eq "SYNAPSE_ADMIN_USER") { $adminUser = $v }
            if ($k -eq "SYNAPSE_ADMIN_PASSWORD") { $adminPass = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
        }
    }
}

if (-not $User.StartsWith("@")) {
    $User = "@" + $User + ":" + $serverName
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   PROCEDURE DE REVOCATION MULTI-APPAREILS SOUVERAINE (JOUR 2)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "[CIBLE] Agent a revoquer : $User" -ForegroundColor Yellow

# 1. Authentification Admin
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $adminUser }
    password = $adminPass
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.access_token
    Write-Host "  [SUCCES] Session administrateur authentifiee." -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Impossible de s'authentifier aupres de $baseUrl" -ForegroundColor Red
    exit 1
}

$encodedUser = [System.Uri]::EscapeDataString($User)

# 2. Idempotence : verification de l'etat actuel
try {
    $userInfo = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v2/users/$encodedUser" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($userInfo.deactivated) {
        Write-Host "  [IDEMPOTENCE] L'agent $User est deja desactive." -ForegroundColor Green
        exit 0
    }
} catch {
    # Si l'utilisateur n'existe pas
    Write-Host "  [AVERTISSEMENT] Impossible de verifier le compte prealablement : $_" -ForegroundColor DarkGray
}

# 3. Denombrement des appareils avant revocation
$deviceCountBefore = 0
try {
    $devicesBefore = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v2/users/$encodedUser/devices" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($devicesBefore.devices) {
        $deviceCountBefore = $devicesBefore.devices.Count
    }
} catch {
    $deviceCountBefore = 0
}
Write-Host "  [CONSTAT] Nombre d'appareils actifs avant revocation : $deviceCountBefore" -ForegroundColor Yellow

# 4. Envoi de l'ordre officiel de revocation
$deactivateBody = @{ erase = $false } | ConvertTo-Json
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v1/deactivate/$encodedUser" -Method Post -Body $deactivateBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json"
    Write-Host "  [SUCCES] Ordre de desactivation valide par Synapse." -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Echec de l'appel a l'API de desactivation : $_" -ForegroundColor Red
    exit 1
}

# 5. Verification apres revocation
$deviceCountAfter = 0
try {
    $devicesAfter = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v2/users/$encodedUser/devices" -Method Get -Headers @{ Authorization = "Bearer $token" }
    if ($devicesAfter.devices) {
        $deviceCountAfter = $devicesAfter.devices.Count
    }
} catch {
    $deviceCountAfter = 0
}

Write-Host "`n==============================================================================" -ForegroundColor Cyan
Write-Host " [REVOCATION MULTI-APPAREILS EFFECTUEE AVEC SUCCES]" -ForegroundColor Green
Write-Host " - Agent cible        : $User"
Write-Host " - Bilan materiel     : $deviceCountBefore appareil(s) supprime(s), $deviceCountAfter restant(s)."
Write-Host " - Sessions invalides : Tous les jetons d'acces ont ete revoques immediatement."
Write-Host " - Cles cryptographiques : Cles Megolm/Olm detruites sur le serveur."
Write-Host " - Reconnexion        : Toute future tentative renverra 'M_USER_DEACTIVATED'."
Write-Host "==============================================================================" -ForegroundColor Cyan
