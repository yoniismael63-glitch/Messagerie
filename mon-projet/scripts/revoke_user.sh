#!/usr/bin/env bash
# ==============================================================================
# Script de révocation immédiate d'un agent - FasoMatrix
# ==============================================================================
# Invalide instantanément toutes les sessions et tous les appareils d'un agent.
# Utilise l'API d'administration officielle documentée de Synapse :
# POST /_synapse/admin/v1/deactivate/<user_id>
# Documentation : https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html#deactivate-account
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage : $0 <identifiant_matrix_utilisateur>"
    echo "Exemple : $0 @agent_secu_1:localhost"
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

echo "=============================================================================="
echo "   PROCÉDURE DE RÉVOCATION D'HABILITATION DE SÉCURITÉ"
echo "=============================================================================="
echo "[CIBLE] Agent à révoquer : ${TARGET_USER_ID}"

# 1. Récupération d'un jeton d'accès administrateur via l'API client standard
echo "[1/3] Authentification auprès du service d'autorité Synapse..."
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
    echo "[ERREUR] Impossible de se connecter en tant qu'administrateur."
    echo "Détails de la réponse : $LOGIN_RESP"
    exit 1
fi
echo "[SUCCÈS] Jeton administrateur validé."

# 2. Appel de l'API officielle de désactivation
echo "[2/3] Envoi de l'ordre de désactivation à Synapse..."
DEACTIVATE_PAYLOAD='{"erase": false}'

# URL-encoding du user_id (ex: @agent:localhost -> %40agent%3Alocalhost si nécessaire)
ENCODED_USER_ID=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$TARGET_USER_ID" 2>/dev/null || echo "$TARGET_USER_ID")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/_synapse/admin/v1/deactivate/${ENCODED_USER_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$DEACTIVATE_PAYLOAD")

HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

# 3. Traitement du statut retourné
echo "[3/3] Vérification de la prise d'effet..."
if [ "$HTTP_STATUS" = "200" ]; then
    echo "=============================================================================="
    echo " [RÉVOCATION EFFECTUÉE AVEC SUCCÈS]"
    echo " - L'agent ${TARGET_USER_ID} est immédiatement déconnecté de TOUS ses appareils."
    echo " - Tous ses jetons d'accès existants sont révoqués par Synapse."
    echo " - Toute tentative de reconnexion sera rejetée avec M_USER_DEACTIVATED."
    echo " - Réponse API : ${HTTP_BODY}"
    echo "=============================================================================="
else
    echo "=============================================================================="
    echo " [ERREUR LORS DE LA RÉVOCATION]"
    echo " - Code HTTP retourné : ${HTTP_STATUS}"
    echo " - Détails : ${HTTP_BODY}"
    echo "=============================================================================="
    exit 1
fi
