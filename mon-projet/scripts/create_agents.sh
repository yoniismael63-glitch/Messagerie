#!/usr/bin/env bash
# ==============================================================================
# Script d'enrôlement d'agents opérationnels : landry et mandjide (Linux/macOS)
# Contexte : Administration Publique du Burkina Faso - FasoMatrix
# ==============================================================================
set -euo pipefail

SERVER_NAME="${SERVER_NAME:-localhost}"

LANDRY_USER="landry"
LANDRY_PASS="LandrySecret2026!"

MANDJIDE_USER="mandjide"
MANDJIDE_PASS="MandjideSecret2026!"

echo "=============================================================================="
echo "   ENRÔLEMENT OFFICIEL DE NOUVEAUX AGENTS D'ÉTAT (FASOMATRIX)"
echo "=============================================================================="

create_agent() {
    local username="$1"
    local password="$2"
    echo ""
    echo "[*] Création de l'agent '@${username}:${SERVER_NAME}'..."
    out=$(docker compose exec -T synapse register_new_matrix_user \
        -u "$username" \
        -p "$password" \
        --no-admin \
        -c /data/homeserver.yaml 2>&1 || true)

    if echo "$out" | grep -qi "already exists\|already taken"; then
        echo "    [INFO] Le compte '${username}' existe déjà dans la base."
    elif echo "$out" | grep -qi "success"; then
        echo "    [SUCCÈS] Agent '@${username}:${SERVER_NAME}' créé avec succès !"
    else
        echo "    [RÉSULTAT] ${out}"
    fi
}

create_agent "$LANDRY_USER" "$LANDRY_PASS"
create_agent "$MANDJIDE_USER" "$MANDJIDE_PASS"

echo ""
echo "=============================================================================="
echo "   RÉCAPITULATIF DES ACCÈS AGENTS"
echo "=============================================================================="
echo "Agent 1 : identifiant '${LANDRY_USER}'   / mot de passe '${LANDRY_PASS}'"
echo "Agent 2 : identifiant '${MANDJIDE_USER}' / mot de passe '${MANDJIDE_PASS}'"
echo "=============================================================================="
