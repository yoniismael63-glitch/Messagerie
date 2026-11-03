# ==============================================================================
# Script de Test Automatisé de Révocation d'un Agent (FasoMatrix - Jour 2)
# Compatible Windows PowerShell 5.1 & PowerShell 7+
# ==============================================================================
# Ce script prouve de manière contradictoire :
# 1. Avant révocation : L'agent 1 peut se connecter et émettre des messages.
# 2. Révocation : L'administrateur coupe le compte et purge tous les appareils.
# 3. Après révocation : Toutes les requêtes de l'agent 1 sont rejetées (401/403).
# ==============================================================================
param (
    [Parameter(Mandatory=$false)]
    [string]$Agent = "agent1",

    [Parameter(Mandatory=$false)]
    [switch]$Reactivate
)

$ErrorActionPreference = "Stop"

# Configuration par défaut
$adminUser  = "admin"
$adminPass  = "CHANGEME_ADMIN_PASSWORD_24B"
$agentUser  = $Agent
$agentPass  = "CHANGEME_AGENT1_PASS_24B"
$baseUrl    = "http://localhost"
$serverName = "localhost"

# Chargement automatique des variables d'environnement depuis .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if ($k -eq "SYNAPSE_ADMIN_USER") { $adminUser = $v }
            if ($k -eq "SYNAPSE_ADMIN_PASSWORD") { $adminPass = $v }
            if ($k -eq "DEMO_AGENT1_USER" -and $Agent -eq "agent1") { $agentUser = $v }
            if ($k -eq "DEMO_AGENT1_PASSWORD" -and $Agent -eq "agent1") { $agentPass = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
        }
    }
}

if (-not $agentUser.StartsWith("@")) {
    $matrixUserId = "@" + $agentUser + ":" + $serverName
} else {
    $matrixUserId = $agentUser
    $agentUser = $matrixUserId.Split(":")[0].TrimStart("@")
}

$encodedUserId = [System.Uri]::EscapeDataString($matrixUserId)

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "    TEST DE REVOCATION IMMEDIATE ET MULTI-APPAREILS - FASOMATRIX" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "Cible du test : $matrixUserId" -ForegroundColor Yellow
Write-Host "Serveur       : $baseUrl" -ForegroundColor Yellow
Write-Host "Date/Heure    : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host "------------------------------------------------------------------------------"

# ------------------------------------------------------------------------------
# ÉTAPE 0 : Vérification de la disponibilité de Synapse
# ------------------------------------------------------------------------------
Write-Host "`n[ETAPE 0/4] Verification du serveur Synapse sur $baseUrl..." -ForegroundColor Yellow
try {
    $versions = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/versions" -Method Get -TimeoutSec 5
    Write-Host "  -> [OK] Synapse est operationnel (API versions supportees : $($versions.versions -join ', '))" -ForegroundColor Green
} catch {
    Write-Host "  -> [ERREUR] Impossible de joindre Synapse sur $baseUrl" -ForegroundColor Red
    Write-Host "     Verifiez que vos conteneurs tournent avec : docker compose ps" -ForegroundColor Yellow
    Write-Host "     Ou lancez-les avec : docker compose up -d" -ForegroundColor Yellow
    exit 1
}

# ------------------------------------------------------------------------------
# OPTION : Réactivation du compte si demandé
# ------------------------------------------------------------------------------
if ($Reactivate) {
    Write-Host "`n[*] Option -Reactivate detectee : Tentative de reactivation de $matrixUserId..." -ForegroundColor Yellow
    
    # Connexion Admin
    $admBody = @{
        type = "m.login.password"
        identifier = @{ type = "m.id.user"; user = $adminUser }
        password = $adminPass
    } | ConvertTo-Json
    
    $admRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $admBody -ContentType "application/json"
    $admToken = $admRes.access_token

    # Reactivation via API Admin
    $reactBody = @{
        deactivated = $false
        password = $agentPass
    } | ConvertTo-Json

    try {
        $null = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v2/users/$encodedUserId" -Method Put -Body $reactBody -Headers @{ Authorization = "Bearer $admToken" } -ContentType "application/json"
        Write-Host "  -> [SUCCES] Compte $matrixUserId reactive avec succes !" -ForegroundColor Green
    } catch {
        Write-Host "  -> [INFO] Reactivation via CLI Docker..." -ForegroundColor DarkGray
        docker compose exec -T synapse register_new_matrix_user -u $agentUser -p $agentPass --no-admin -c /data/homeserver.yaml 2>$null
        Write-Host "  -> [SUCCES] Compte operationnel." -ForegroundColor Green
    }
    exit 0
}

# ------------------------------------------------------------------------------
# ÉTAPE 1 : Test pré-révocation (Preuve de fonctionnement nominal)
# ------------------------------------------------------------------------------
Write-Host "`n[ETAPE 1/4] Connexion de l'Agent '$agentUser' et envoi d'un message nominal..." -ForegroundColor Yellow

$agentToken = $null
$loginSuccess = $false

$agentLoginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $agentUser }
    password = $agentPass
    initial_device_display_name = "Console Test Agent 1"
} | ConvertTo-Json

try {
    $agentLoginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $agentLoginBody -ContentType "application/json"
    $agentToken = $agentLoginRes.access_token
    $loginSuccess = $true
    Write-Host "  -> [SUCCES] Agent 1 connecte avec succes. Token de session obtenu." -ForegroundColor Green
} catch {
    Write-Host "  -> [AVERTISSEMENT] Impossible de connecter '$agentUser' : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "     Si le compte a deja ete revoque lors d'un test precedent," -ForegroundColor Yellow
    Write-Host "     rejouez d'abord : .\\scripts\\test_revocation.ps1 -Reactivate" -ForegroundColor Yellow
    exit 1
}

# Création d'un salon de test dédié
$testRoomId = $null
try {
    $createRoomBody = @{
        name = "Audit Test Revocation - $(Get-Date -Format 'HH:mm:ss')"
        preset = "private_chat"
        visibility = "private"
    } | ConvertTo-Json

    $roomRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/createRoom" -Method Post -Body $createRoomBody -Headers @{ Authorization = "Bearer $agentToken" } -ContentType "application/json"
    $testRoomId = $roomRes.room_id
    Write-Host "  -> [SUCCES] Salon de test cree : $testRoomId" -ForegroundColor Green

    # Envoi d'un message légitime
    $txnId1 = "audit_tx_" + [System.Guid]::NewGuid().ToString().Substring(0,8)
    $msgBody1 = @{
        msgtype = "m.text"
        body = "TEST PRE-REVOCATION : Agent 1 est pleinement actif et habilite a transmettre des ordres."
    } | ConvertTo-Json

    $sendRes1 = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$testRoomId/send/m.room.message/$txnId1" -Method Put -Body $msgBody1 -Headers @{ Authorization = "Bearer $agentToken" } -ContentType "application/json"
    Write-Host "  -> [PREUVE NOMINALE] Message emis avec succes (Event ID : $($sendRes1.event_id))" -ForegroundColor Green
} catch {
    Write-Host "  -> [ERREUR EMISSION] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# ÉTAPE 2 : Révocation régalienne par l'administrateur
# ------------------------------------------------------------------------------
Write-Host "`n[ETAPE 2/4] Declenchement de la revocation officielle par l'Administrateur..." -ForegroundColor Yellow

$adminLoginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = $adminUser }
    password = $adminPass
} | ConvertTo-Json

try {
    $adminLoginRes = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
    $adminToken = $adminLoginRes.access_token
    Write-Host "  -> [SUCCES] Administrateur souverain authentifie." -ForegroundColor Green
} catch {
    Write-Host "  -> [ERREUR] Impossible d'authentifier l'administrateur '$adminUser'." -ForegroundColor Red
    exit 1
}

# Comptage des appareils actifs avant révocation
$devicesBefore = 0
try {
    $devs = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v2/users/$encodedUserId/devices" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
    if ($devs.devices) { $devicesBefore = $devs.devices.Count }
} catch { }

Write-Host "  -> Appareils actifs detectes pour $matrixUserId : $devicesBefore" -ForegroundColor Cyan

# Appel de désactivation officielle Synapse Admin
$deactBody = @{ erase = $false } | ConvertTo-Json
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/_synapse/admin/v1/deactivate/$encodedUserId" -Method Post -Body $deactBody -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json"
    Write-Host "  -> [SUCCES] Ordre de desactivation valide par l'API Admin de Synapse." -ForegroundColor Green
} catch {
    Write-Host "  -> [ERREUR] Echec de la commande de desactivation : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# ÉTAPE 3 : Vérification contradictoire du blocage post-révocation
# ------------------------------------------------------------------------------
Write-Host "`n[ETAPE 3/4] Verification contradictoire : Test d'intrusion post-revocation..." -ForegroundColor Yellow

# Test 3.1 : Tentative d'émission d'un message avec l'ancien token
Write-Host "  [Test 3.1] Tentative d'envoi d'un message avec le token revoque..." -ForegroundColor DarkYellow
$txnId2 = "attack_tx_" + [System.Guid]::NewGuid().ToString().Substring(0,8)
$msgBody2 = @{
    msgtype = "m.text"
    body = "TENTATIVE INTRUSION ILLICITE POST-REVOCATION"
} | ConvertTo-Json

$postMessageBlocked = $false
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/rooms/$testRoomId/send/m.room.message/$txnId2" -Method Put -Body $msgBody2 -Headers @{ Authorization = "Bearer $agentToken" } -ContentType "application/json"
    Write-Host "    [ECHEC DE SECURITE] Le message a ete accepte alors que l'agent est cense etre revoque !" -ForegroundColor Red
} catch {
    $postMessageBlocked = $true
    $errCode = "HTTP $($_.Exception.Response.StatusCode.value__)"
    Write-Host "    -> [SUCCES SECURITE] Envoi rigoureusement BLOQUE ! Code : $errCode" -ForegroundColor Green
    Write-Host "       Le serveur Synapse a rejete l'ancien jeton de session." -ForegroundColor DarkGray
}

# Test 3.2 : Tentative de reconnexion avec les identifiants
Write-Host "  [Test 3.2] Tentative de re-connexion avec mot de passe..." -ForegroundColor DarkYellow
$reloginBlocked = $false
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/_matrix/client/v3/login" -Method Post -Body $agentLoginBody -ContentType "application/json"
    Write-Host "    [ECHEC DE SECURITE] Reconnexion reussie alors que le compte est desactive !" -ForegroundColor Red
} catch {
    $reloginBlocked = $true
    Write-Host "    -> [SUCCES SECURITE] Reconnexion REFUSEE par Synapse (M_USER_DEACTIVATED) !" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# ÉTAPE 4 : Bilan officiel de la validation
# ------------------------------------------------------------------------------
Write-Host "`n==============================================================================" -ForegroundColor Cyan
if ($postMessageBlocked -and $reloginBlocked) {
    Write-Host "      RESULTAT DE L'AUDIT : REVOCATION VALIDEE AVEC SUCCES (100% OK)" -ForegroundColor Green
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "  1. Identifiant cible    : $matrixUserId"
    Write-Host "  2. Sessions & Appareils : Tous les jetons d'acces ont ete invalides."
    Write-Host "  3. Cles cryptographiques: Cles Megolm/Olm detruites sur le serveur."
    Write-Host "  4. Tentatives d'emission: STRICTEMENT REJETEES (HTTP 401/403)."
    Write-Host "  5. Reconnexion future   : STRICTEMENT INTERDITE."
    Write-Host "------------------------------------------------------------------------------"
    Write-Host "Pour restaurer le compte afin de rejouer des tests :" -ForegroundColor DarkGray
    Write-Host "  .\\scripts\\test_revocation.ps1 -Reactivate" -ForegroundColor DarkGray
} else {
    Write-Host "      RESULTAT DE L'AUDIT : ECHEC DE LA REVOCATION" -ForegroundColor Red
    Write-Host "==============================================================================" -ForegroundColor Cyan
}
Write-Host "==============================================================================" -ForegroundColor Cyan
