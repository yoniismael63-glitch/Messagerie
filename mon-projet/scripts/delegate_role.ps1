# ==============================================================================
# Octroi de Mandat de Suppléance Chiffrée (PowerShell - Jour 3)
# ==============================================================================
param(
    [Parameter(Mandatory=$true)][string]$Admin,
    [Parameter(Mandatory=$true)][string]$Delegant,
    [Parameter(Mandatory=$true)][string]$Delegataire,
    [string]$Scope = "read_new_acts",
    [string]$Purpose = "Suppléance de service",
    [string]$Duree = "10m"
)

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost"
$serverName = "localhost"
$coordinationId = ""
$adminPass = "AdminSecret2026!"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if ($k -eq "COORDINATION_ROOM_ID") { $coordinationId = $v }
            if ($k -eq "SYNAPSE_ADMIN_PASSWORD") { $adminPass = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
        }
    }
}

if (-not $Delegant.StartsWith("@")) { $Delegant = "@" + $Delegant + ":" + $serverName }
if (-not $Delegataire.StartsWith("@")) { $Delegataire = "@" + $Delegataire + ":" + $serverName }

# 1. Login admin
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $Admin }
    password = $adminPass
} | ConvertTo-Json -Depth 3

$loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.access_token

# 2. Calcul expiration
$seconds = 600
if ($Duree -match "\d+") {
    $num = [int]$matches[0]
    if ($Duree -match "m") { $seconds = $num * 60 }
    elseif ($Duree -match "h") { $seconds = $num * 3600 }
    elseif ($Duree -match "s") { $seconds = $num }
}
$exp = (Get-Date).ToUniversalTime().AddSeconds($seconds).ToString("yyyy-MM-ddTHH:mm:ssZ")
$delegId = "del_" + [guid]::NewGuid().ToString().Substring(0, 8)

# 3. Envoi de com.example.delegation dans #actes-coordination
$delegBody = @{
    delegation_id = $delegId
    delegant = $Delegant
    delegataire = $Delegataire
    scope = $Scope
    purpose = $Purpose
    delegant_role = "Agent Titulaire"
    expires_at = $exp
    sub_room_id = $null
    revoked = $false
} | ConvertTo-Json

$txn = "txn_del_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$coordinationId/send/com.example.delegation/$txn" -Method Put -Body $delegBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" | Out-Null

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host " [MANDAT DE SUPPLÉANCE ENVOYÉ AU BOT]" -ForegroundColor Green
Write-Host " - delegation_id : $delegId"
Write-Host " - Délégant      : $Delegant"
Write-Host " - Suppléant     : $Delegataire"
Write-Host " - Expiration    : $exp"
Write-Host "==============================================================================" -ForegroundColor Green
