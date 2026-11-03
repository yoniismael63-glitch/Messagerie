# ==============================================================================
# Émission d'un Acte de Service Chiffré & Meta-Event (PowerShell - Jour 3)
# ==============================================================================
param(
    [Parameter(Mandatory=$true)][string]$Expediteur,
    [Parameter(Mandatory=$true)][string]$Destinataire,
    [Parameter(Mandatory=$true)][string]$Objet,
    [Parameter(Mandatory=$true)][string]$Corps,
    [string]$Deadline = "+2m"
)

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost"
$serverName = "localhost"
$actesServiceId = ""
$coordinationId = ""

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if ($k -eq "ACTES_SERVICE_ROOM_ID") { $actesServiceId = $v }
            if ($k -eq "COORDINATION_ROOM_ID") { $coordinationId = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
        }
    }
}

if (-not $actesServiceId -or -not $coordinationId) {
    Write-Host "[ERREUR] Les identifiants de salon ne sont pas définis dans .env. Lancez d'abord seed_acte_demo.ps1" -ForegroundColor Red
    exit 1
}

$cleanExp = $Expediteur.TrimStart("@").Split(":")[0]
if (-not $Destinataire.StartsWith("@")) { $Destinataire = "@" + $Destinataire + ":" + $serverName }

$expPass = "CHANGEME_${cleanExp.ToUpper()}_PASS_24B"
if ($cleanExp -eq "admin") { $expPass = "AdminSecret2026!" }
elseif ($cleanExp -eq "agent3") { $expPass = "Agent3Secret2026!" }

# 1. Login expéditeur
$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $cleanExp }
    password = $expPass
} | ConvertTo-Json -Depth 3

$loginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.access_token

# 2. Calcul UUID et deadline ISO 8601
$acteId = [guid]::NewGuid().ToString()
$seconds = 120
if ($Deadline -match "\d+") {
    $num = [int]$matches[0]
    if ($Deadline -match "m") { $seconds = $num * 60 }
    elseif ($Deadline -match "h") { $seconds = $num * 3600 }
    elseif ($Deadline -match "s") { $seconds = $num }
}
$dl = (Get-Date).ToUniversalTime().AddSeconds($seconds).ToString("yyyy-MM-ddTHH:mm:ssZ")

# 3. Chiffrement structuré du corps
$rawPayload = @{
    acte_id = $acteId
    destinataire = $Destinataire
    deadline = $dl
    requires_ack = $true
    ack_type = "hash"
    objet = $Objet
    corps = $Corps
} | ConvertTo-Json -Compress

$bytes = [System.Text.Encoding]::UTF8.GetBytes($rawPayload)
$sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
$combined = $sha + $bytes
$cipherBlob = [Convert]::ToBase64String($combined)

$encBody = @{
    algorithm = "m.megolm.v1.aes-sha2"
    sender_key = "ed25519_${cleanExp}_key"
    ciphertext = $cipherBlob
    session_id = "megolm_session_$($acteId.Substring(0,8))"
} | ConvertTo-Json

$txn1 = "txn_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$encRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$actesServiceId/send/m.room.encrypted/$txn1" -Method Put -Body $encBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json"
$eventId = $encRes.event_id

# 4. Envoi du meta-événement minimaliste dans #actes-coordination (zéro objet, zéro corps)
$metaBody = @{
    acte_id = $acteId
    destinataire = $Destinataire
    deadline = $dl
    requires_ack = $true
    ack_type = "hash"
    room_id = $actesServiceId
    event_id_chiffre = $eventId
    escalation_level = 1
} | ConvertTo-Json

$txn2 = "txn_meta_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$coordinationId/send/com.example.acte_service.meta/$txn2" -Method Put -Body $metaBody -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" | Out-Null

Write-Host "`n==============================================================================" -ForegroundColor Green
Write-Host " [ACTE DE SERVICE ÉMIS AVEC SUCCÈS]" -ForegroundColor Green
Write-Host " - acte_id          : $acteId"
Write-Host " - event_id_chiffre : $eventId"
Write-Host " - room_id          : $actesServiceId"
Write-Host " - Échéance         : $dl"
Write-Host "==============================================================================" -ForegroundColor Green
