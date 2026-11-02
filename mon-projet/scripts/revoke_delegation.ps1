# ==============================================================================
# Révocation Immédiate de Mandat de Suppléance (PowerShell - Jour 3)
# ==============================================================================
param(
    [Parameter(Mandatory=$true)][string]$DelegationId
)

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost"
$coordinationId = ""
$adminUser = "admin"
$adminPass = "AdminSecret2026!"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if ($k -eq "COORDINATION_ROOM_ID") { $coordinationId = $v }
            if ($k -eq "SYNAPSE_ADMIN_USER") { $adminUser = $v }
            if ($k -eq "SYNAPSE_ADMIN_PASSWORD") { $adminPass = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
        }
    }
}

# 1. Login admin
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $adminUser }
    password = $adminPass
} | ConvertTo-Json -Depth 3

$loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.access_token

# 2. Envoi de com.example.delegation.revoked dans #actes-coordination
$revBody = @{
    delegation_id = $DelegationId
    revoked = $true
    revoked_by = $adminUser
    ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

$txn = "txn_rev_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$coordinationId/send/com.example.delegation.revoked/$txn" -Method Put -Body $revBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" | Out-Null

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host " [RÉVOCATION TRANSMIS AU BOT]" -ForegroundColor Green
Write-Host " - delegation_id : $DelegationId"
Write-Host " - Effet immédiat : L'agent suppléant est expulsé du sous-salon."
Write-Host "==============================================================================" -ForegroundColor Green
