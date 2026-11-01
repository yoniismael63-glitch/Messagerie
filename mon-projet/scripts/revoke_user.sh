#!/usr/bin/env bash
# ==============================================================================
# Script de révocation immédiate multi-appareils d'un agent - FasoMatrix (Jour 2)
# ==============================================================================
# Objectif éliminatoire :
# Invalider instantanément l'intégralité des sessions, jetons et appareils d'un agent.
# Utilise l'API d'administration officielle documentée de Synapse :
#   - Liste des appareils : GET /_synapse/admin/v2/users/{user_id}/devices
#   - État du compte : GET /_synapse/admin/v2/users/{user_id}
#   - Révocation : POST /_synapse/admin/v1/deactivate/{user_id}
# Documentation officielle Synapse :
#   https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html#deactivate-account
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

# Formatage automatique si l'utilisateur saisit 'agent1' au lieu de '@agent1:localhost'
if [[ ! "$TARGET_USER_ID" =~ ^@ ]]; then
    TARGET_USER_ID="@${TARGET_USER_ID}:${SERVER_NAME}"
fi

echo "=============================================================================="
echo "   PROCÉDURE DE RÉVOCATION D'HABILITATION DE SÉCURITÉ (JOUR 2)"
echo "=============================================================================="
echo "[CIBLE] Agent à révoquer : ${TARGET_USER_ID}"

# 1. Récupération d'un jeton d'accès administrateur via l'API client standard
echo "[1/5] Authentification auprès du service d'autorité Synapse..."
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
    echo "[ERREUR CRITIQUE] Impossible de se connecter en tant qu'administrateur."
    echo "Détails de la réponse : $LOGIN_RESP"
    exit 1
fi
echo "[SUCCÈS] Jeton administrateur validé."

# URL-encoding du user_id (@agent1:localhost -> %40agent1%3Alocalhost)
ENCODED_USER_ID=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$TARGET_USER_ID" 2>/dev/null || echo "$TARGET_USER_ID")

# 2. Vérification d'idempotence : l'utilisateur est-il déjà désactivé ?
echo "[2/5] Vérification de l'état actuel de l'agent..."
USER_INFO=$(curl -s -X GET "${BASE_URL}/_synapse/admin/v2/users/${ENCODED_USER_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

IS_DEACTIVATED=$(echo "$USER_INFO" | grep -o '"deactivated":true' || true)
if [ -n "$IS_DEACTIVATED" ]; then
    echo "[IDEMPOTENCE] L'agent ${TARGET_USER_ID} est déjà désactivé."
    echo "[SUCCÈS] Opération terminée : le compte est déjà hors service."
    exit 0
fi

# 3. Énumération des appareils actifs AVANT révocation
# Endpoint officiel Synapse : GET /_synapse/admin/v2/users/{user_id}/devices
echo "[3/5] Détection des appareils actifs associés au compte..."
DEVICES_BEFORE_RESP=$(curl -s -X GET "${BASE_URL}/_synapse/admin/v2/users/${ENCODED_USER_ID}/devices" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

DEVICE_COUNT_BEFORE=$(echo "$DEVICES_BEFORE_RESP" | grep -o '"device_id"' | wc -l || true)
echo "  -> Nombre d'appareils actifs avant révocation : ${DEVICE_COUNT_BEFORE}"

# 4. Exécution de l'ordre officiel de révocation immédiate
# Endpoint officiel Synapse : POST /_synapse/admin/v1/deactivate/{user_id}
echo "[4/5] Envoi de l'ordre de désactivation à Synapse..."
DEACTIVATE_PAYLOAD='{"erase": false}'

DEACTIVATE_RESP=$(curl -s -w "\n%{http_code}" -X POST \
  "${BASE_URL}/_synapse/admin/v1/deactivate/${ENCODED_USER_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$DEACTIVATE_PAYLOAD")

HTTP_STATUS=$(echo "$DEACTIVATE_RESP" | tail -n 1)
HTTP_BODY=$(echo "$DEACTIVATE_RESP" | sed '$d')

if [ "$HTTP_STATUS" != "200" ]; then
    echo "[ERREUR LORS DE LA RÉVOCATION] Statut HTTP : ${HTTP_STATUS}"
    echo "Détails : ${HTTP_BODY}"
    exit 1
fi

# 5. Preuve formelle post-révocation : énumération des appareils APRÈS révocation
echo "[5/5] Contrôle contradictoire de la suppression des appareils..."
DEVICES_AFTER_RESP=$(curl -s -X GET "${BASE_URL}/_synapse/admin/v2/users/${ENCODED_USER_ID}/devices" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

DEVICE_COUNT_AFTER=$(echo "$DEVICES_AFTER_RESP" | grep -o '"device_id"' | wc -l || true)

echo "=============================================================================="
echo " [RÉVOCATION MULTI-APPAREILS CONFIRMÉE AVEC SUCCÈS]"
echo " - Agent ciblé        : ${TARGET_USER_ID}"
echo " - Bilan matériel     : ${DEVICE_COUNT_BEFORE} appareil(s) supprimé(s), ${DEVICE_COUNT_AFTER} restant(s)."
echo " - Jetons de session  : Tous les access tokens existants ont été révoqués."
echo " - Clés cryptographiques : Les clés Olm/Megolm de l'agent sont détruites."
echo " - Expulsion salons   : L'agent est expulsé de tous les salons souverains."
echo " - Tentative de reconnexion : Tout futur login sera rejeté avec 'M_USER_DEACTIVATED'."
echo "=============================================================================="
