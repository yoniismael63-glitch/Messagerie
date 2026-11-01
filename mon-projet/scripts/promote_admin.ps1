param (
    [Parameter(Mandatory=$true)]
    [string]$User,
    [switch]$Demote
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

$targetAdminState = -not $Demote

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   GESTION DES HABILITATIONS : ROLE ADMINISTRATEUR (WINDOWS)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "[CIBLE] Agent : $User" -ForegroundColor Yellow
Write-Host "[ACTION] Definir le statut administrateur a : $targetAdminState" -ForegroundColor Yellow

# 1. Connexion admin
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $adminUser }
    password = $adminPass
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.access_token
    Write-Host "  [SUCCES] Session administrateur etablie." -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Impossible de s'authentifier a $baseUrl" -ForegroundColor Red
    exit 1
}

$encodedUser = [System.Uri]::EscapeDataString($User)

# 2. Envoi de l'ordre PUT
$promoteBody = @{ admin = $targetAdminState } | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v1/users/$encodedUser/admin" -Method Put -Body $promoteBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json"
    Write-Host "`n==============================================================================" -ForegroundColor Cyan
    Write-Host " [OPERATION REUSSIE]" -ForegroundColor Green
    Write-Host " - Agent     : $User"
    Write-Host " - Statut admin : $($res.admin)"
    Write-Host " - Note sécurité : Un administrateur ne peut pas se retrograder lui-meme."
    Write-Host "==============================================================================" -ForegroundColor Cyan
} catch {
    Write-Host "`n==============================================================================" -ForegroundColor Red
    Write-Host " [ERREUR] Echec de la modification du role : $_" -ForegroundColor Red
    Write-Host "==============================================================================" -ForegroundColor Red
    exit 1
}
