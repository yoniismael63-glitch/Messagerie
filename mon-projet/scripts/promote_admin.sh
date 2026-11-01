#!/usr/bin/env bash
# ==============================================================================
# Script de promotion d'un agent au rôle d'administrateur système - FasoMatrix
# Contexte : Hackathon Sécurité - Jour 2 (Contrôle d'Accès & RBAC)
# ==============================================================================
# Utilise l'API d'administration officielle documentée de Synapse :
# PUT /_synapse/admin/v1/users/{user_id}/admin
# Documentation officielle :
# https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html#change-whether-a-user-is-a-server-administrator
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage : $0 <identifiant_matrix_utilisateur>"
    echo "Exemple : $0 @agent1:localhost"
    exit 1
fi

TARGET_USER_ID="$1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "[ERREUR] Le fichier .env est introuvable (${ENV_FILE})."
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE_URL="${BASE_URL:-http://localhost}"
SERVER_NAME="${SERVER_NAME:-localhost}"

# Auto-formatage si l'utilisateur saisit un nom simple
if [[ ! "$TARGET_USER_ID" =~ ^@ ]]; then
    TARGET_USER_ID="@${TARGET_USER_ID}:${SERVER_NAME}"
fi

echo "=============================================================================="
echo "   GESTION DES HABILITATIONS : PROMOTION ADMINISTRATEUR (JOUR 2)"
echo "=============================================================================="
echo "[CIBLE] Agent à promouvoir : ${TARGET_USER_ID}"

# 1. Authentification auprès de Synapse
echo "[1/3] Authentification administrateur..."
LOGIN_PAYLOAD=$(cat <<EOF
{
  "type": "m.login.password",
  "identifier": {
    "type": "m.id.user",
    "user": "${SYNAPSE_ADMIN_USER}"
  },
  "password": "${SYNAPSE_ADMIN_PASSWORD}"
}
EOF
)

LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Impossible d'obtenir le jeton d'accès administrateur."
    exit 1
fi
echo "[SUCCÈS] Session administrateur établie."

# 2. URL-encoding de l'identifiant
ENCODED_USER_ID=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$TARGET_USER_ID" 2>/dev/null || echo "$TARGET_USER_ID")

# 3. Envoi de l'ordre de promotion via l'API officielle
echo "[2/3] Attribution des privilèges administrateur serveur..."
PROMOTE_PAYLOAD='{"admin": true}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  "${BASE_URL}/_synapse/admin/v1/users/${ENCODED_USER_ID}/admin" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PROMOTE_PAYLOAD")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')

echo "[3/3] Contrôle du statut de retour..."
if [ "$HTTP_STATUS" = "200" ]; then
    echo "=============================================================================="
    echo " [PROMOTION EFFECTUÉE AVEC SUCCÈS]"
    echo " - Agent promu     : ${TARGET_USER_ID}"
    echo " - Privilèges      : Administrateur du homeserver Synapse (admin: true)"
    echo " - Pouvoirs acquis : Accès aux API de gestion des utilisateurs, salons et clés"
    echo " - Rétrogradation  : Exécuter avec {\"admin\": false} via un autre administrateur"
    echo "   (Rappel sécurité : un administrateur ne peut pas se rétrograder lui-même)"
    echo "=============================================================================="
else
    echo "=============================================================================="
    echo " [ERREUR LORS DE LA PROMOTION]"
    echo " - Code HTTP retourné : ${HTTP_STATUS}"
    echo " - Détails : ${HTTP_BODY}"
    echo "=============================================================================="
    exit 1
fi
