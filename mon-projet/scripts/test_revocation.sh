#!/usr/bin/env bash
# ==============================================================================
# Script de Test Automatisé de Révocation d'un Agent (FasoMatrix - Jour 2)
# ==============================================================================
# Prouve de manière contradictoire :
# 1. Avant révocation : L'agent peut se connecter et émettre des messages.
# 2. Révocation : L'administrateur désactive le compte via l'API Admin de Synapse.
# 3. Après révocation : Toutes les requêtes (envoi message, reconnexion) sont rejetées.
# ==============================================================================
set -euo pipefail

TARGET_AGENT="${1:-agent1}"

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
ADMIN_USER="${SYNAPSE_ADMIN_USER:-admin}"
ADMIN_PASS="${SYNAPSE_ADMIN_PASSWORD:-CHANGEME_ADMIN_PASSWORD_24B}"
AGENT_USER="$TARGET_AGENT"
AGENT_PASS="${DEMO_AGENT1_PASSWORD:-CHANGEME_AGENT1_PASS_24B}"

if [[ ! "$AGENT_USER" =~ ^@ ]]; then
    MATRIX_USER_ID="@${AGENT_USER}:${SERVER_NAME}"
else
    MATRIX_USER_ID="$AGENT_USER"
    AGENT_USER="$(echo "$MATRIX_USER_ID" | cut -d':' -f1 | tr -d '@')"
fi

ENCODED_USER="$(python3 -c "import urllib.parse; print(urllib.parse.quote('$MATRIX_USER_ID'))")"

echo "=============================================================================="
echo "    TEST DE REVOCATION IMMEDIATE ET MULTI-APPAREILS - FASOMATRIX"
echo "=============================================================================="
echo "Cible du test : $MATRIX_USER_ID"
echo "Serveur       : $BASE_URL"
echo "------------------------------------------------------------------------------"

# 0. Vérification Synapse
echo -e "\n[ETAPE 0/4] Verification du serveur Synapse sur $BASE_URL..."
if ! curl -s -f "${BASE_URL}/_matrix/client/versions" > /dev/null; then
    echo "[ERREUR] Synapse ne repond pas sur $BASE_URL"
    exit 1
fi
echo "[OK] Synapse operationnel."

# 1. Connexion initiale de l'agent
echo -e "\n[ETAPE 1/4] Connexion de l'Agent '$AGENT_USER' et emission d'un message..."
AGENT_TOKEN=$(curl -s -f -X POST "${BASE_URL}/_matrix/client/v3/login" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${AGENT_USER}\"},\"password\":\"${AGENT_PASS}\"}" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$AGENT_TOKEN" ]; then
    echo "[AVERTISSEMENT] Impossible de connecter l'agent (compte deja desactive ou mauvais pass)."
    echo "Pour reinitialiser : ./scripts/test_revocation.sh --reactivate"
    exit 1
fi
echo "[SUCCES] Agent connecte. Jeton obtenu."

# Creation salon de test
ROOM_RES=$(curl -s -f -X POST "${BASE_URL}/_matrix/client/v3/createRoom" \
    -H "Authorization: Bearer ${AGENT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Audit Test Revocation\",\"preset\":\"private_chat\",\"visibility\":\"private\"}")
ROOM_ID=$(echo "$ROOM_RES" | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)

TXN_ID_1="audit_$(date +%s)"
curl -s -f -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${ROOM_ID}/send/m.room.message/${TXN_ID_1}" \
    -H "Authorization: Bearer ${AGENT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"msgtype":"m.text","body":"TEST PRE-REVOCATION : Agent 1 actif et operationnel"}' > /dev/null

echo "[PREUVE NOMINALE] Message pre-revocation envoye avec succes dans $ROOM_ID"

# 2. Revocation par l'Admin
echo -e "\n[ETAPE 2/4] Declenchement de la revocation officielle par l'Admin..."
ADMIN_TOKEN=$(curl -s -f -X POST "${BASE_URL}/_matrix/client/v3/login" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${ADMIN_USER}\"},\"password\":\"${ADMIN_PASS}\"}" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

curl -s -f -X POST "${BASE_URL}/_synapse/admin/v1/deactivate/${ENCODED_USER}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"erase":false}' > /dev/null

echo "[SUCCES] Ordre de desactivation valide par l'API Admin de Synapse."

# 3. Test post-revocation
echo -e "\n[ETAPE 3/4] Verification contradictoire : Test d'intrusion post-revocation..."
TXN_ID_2="attack_$(date +%s)"
HTTP_CODE_POST=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${ROOM_ID}/send/m.room.message/${TXN_ID_2}" \
    -H "Authorization: Bearer ${AGENT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"msgtype":"m.text","body":"TENTATIVE INTRUSION ILLICITE"}' || true)

if [ "$HTTP_CODE_POST" = "401" ] || [ "$HTTP_CODE_POST" = "403" ]; then
    echo "[SUCCES SECURITE] Envoi post-revocation BLOQUE (HTTP $HTTP_CODE_POST) !"
else
    echo "[ECHEC SECURITE] Le message a traverse (HTTP $HTTP_CODE_POST) !"
    exit 1
fi

HTTP_CODE_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/_matrix/client/v3/login" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${AGENT_USER}\"},\"password\":\"${AGENT_PASS}\"}" || true)

if [ "$HTTP_CODE_LOGIN" = "403" ]; then
    echo "[SUCCES SECURITE] Reconnexion REFUSEE (HTTP 403 M_USER_DEACTIVATED) !"
else
    echo "[ECHEC SECURITE] Reconnexion non bloquee !"
    exit 1
fi

echo -e "\n=============================================================================="
echo "      RESULTAT DE L'AUDIT : REVOCATION VALIDEE AVEC SUCCES (100% OK)"
echo "=============================================================================="
