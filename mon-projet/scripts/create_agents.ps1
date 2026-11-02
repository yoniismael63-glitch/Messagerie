# ==============================================================================
# Script d'enrôlement d'agents opérationnels : landry et mandjide (Windows)
# Contexte : Administration Publique du Burkina Faso - FasoMatrix
# ==============================================================================
# Crée les comptes directement via la commande officielle Synapse CLI
# sans ouvrir les inscriptions publiques (souveraineté préservée).
# ==============================================================================

$serverName = "localhost"

# Mots de passe par défaut pour les deux agents (modifiables par l'utilisateur)
$landryUser = "landry"
$landryPass = "LandrySecret2026!"

$mandjideUser = "mandjide"
$mandjidePass = "MandjideSecret2026!"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   ENRÔLEMENT OFFICIEL DE NOUVEAUX AGENTS D'ÉTAT (FASOMATRIX)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

function Create-Agent {
    param(
        [string]$Username,
        [string]$Password
    )

    Write-Host "`n[*] Création de l'agent '@${Username}:${serverName}'..." -ForegroundColor Yellow
    
    # Commande officielle Synapse sans élévation admin
    $cmd = "docker compose exec -T synapse register_new_matrix_user -u $Username -p $Password --no-admin -c /data/homeserver.yaml"
    $res = Invoke-Expression $cmd 2>&1 | Out-String

    if ($res -match "already exists|already taken") {
        Write-Host "    [INFO] Le compte '$Username' existe déjà dans la base." -ForegroundColor DarkGray
    } elseif ($res -match "success") {
        Write-Host "    [SUCCÈS] Agent '@${Username}:${serverName}' créé avec succès !" -ForegroundColor Green
    } else {
        Write-Host "    [RÉSULTAT] $res" -ForegroundColor Gray
    }
}

# 1. Création de Landry
Create-Agent -Username $landryUser -Password $landryPass

# 2. Création de Mandjide
Create-Agent -Username $mandjideUser -Password $mandjidePass

Write-Host "`n==============================================================================" -ForegroundColor Cyan
Write-Host "   RÉCAPITULATIF DES ACCÈS AGENTS" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "Agent 1 : identifiant '$landryUser'   / mot de passe '$landryPass'"
Write-Host "Agent 2 : identifiant '$mandjideUser' / mot de passe '$mandjidePass'"
Write-Host "Serveur : http://localhost (ou votre lien https://...trycloudflare.com)"
Write-Host "==============================================================================" -ForegroundColor Cyan
