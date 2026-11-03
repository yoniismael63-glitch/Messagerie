#!/usr/bin/env bash
# ==============================================================================
# Initialisation de la démonstration Acte de Service & Suppléance (Jour 3)
# ==============================================================================
# - Crée l'agent3 et le compte @bot:localhost
# - Crée le salon chiffré #actes-service (Megolm, membres: agent1, agent2, admin)
# - Crée le salon non chiffré #actes-coordination (membres: bot, admin, agent1, agent2)
# - Crée le salon non chiffré #actes-admin (membres: bot, admin)
# - Met à jour .env avec les room_id
# ==============================================================================
set -euo pipefail

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
ADMIN_PASS="${SYNAPSE_ADMIN_PASSWORD:-AdminSecret2026!}"
BOT_USER="${BOT_USER:-bot}"
BOT_PASS="${BOT_PASSWORD:-CHANGEME_BOT_PASSWORD_24B}"
AGENT1_USER="${DEMO_AGENT1_USER:-agent1}"
AGENT1_PASS="${DEMO_AGENT1_PASSWORD:-CHANGEME_AGENT1_PASS_24B}"
AGENT2_USER="${DEMO_AGENT2_USER:-agent2}"
AGENT2_PASS="${DEMO_AGENT2_PASSWORD:-CHANGEME_AGENT2_PASS_24B}"
AGENT3_USER="agent3"
AGENT3_PASS="Agent3Secret2026!"

echo "=============================================================================="
echo "   INITIALISATION DU SOCLE ACTES DE SERVICE & SUPPLÉANCE (JOUR 3)"
echo "=============================================================================="

# 1. Création des comptes agent3 et bot
register_user() {
    local u="$1"
    local p="$2"
    local is_adm="$3"
    local adm_flag="--no-admin"
    if [ "$is_adm" = "true" ]; then adm_flag="-a"; fi
    echo "[*] Création du compte @${u}:${SERVER_NAME}..."
    docker compose exec -T synapse register_new_matrix_user \
        -u "$u" -p "$p" $adm_flag -c /data/homeserver.yaml 2>&1 || true
}

register_user "$AGENT3_USER" "$AGENT3_PASS" "false"
register_user "$BOT_USER" "$BOT_PASS" "false"

# 2. Authentification Admin pour créer les salons
echo ""
echo "[1/4] Authentification administrateur..."
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${ADMIN_USER}\"},\"password\":\"${ADMIN_PASS}\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)
if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Impossible de se connecter en admin."
    exit 1
fi

# Authentification Bot pour obtenir son user_id complet
BOT_LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${BOT_USER}\"},\"password\":\"${BOT_PASS}\"}")
BOT_TOKEN=$(echo "$BOT_LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

# Fonction pour créer un salon
create_room() {
    local name="$1"
    local encrypted="$2"
    local invites="$3" # json array
    local initial_state='[]'
    if [ "$encrypted" = "true" ]; then
        initial_state='[{"type":"m.room.encryption","state_key":"","content":{"algorithm":"m.megolm.v1.aes-sha2"}}]'
    fi

    local payload
    payload=$(cat <<EOF
{
  "name": "${name}",
  "preset": "private_chat",
  "visibility": "private",
  "initial_state": ${initial_state},
  "invite": ${invites}
}
EOF
)
    local resp
    resp=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/createRoom" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$payload")
    echo "$resp" | grep -o '"room_id":"[^"]*' | cut -d'"' -f4 || true
}

# 3. Création des 3 salons
echo "[2/4] Création du salon chiffré #actes-service..."
# Membres : admin, agent1, agent2 (Le bot est STRICTEMENT EXCLU)
ACTES_SERVICE_ID=$(create_room "Actes de Service Confidentiels" "true" "[\"@${AGENT1_USER}:${SERVER_NAME}\", \"@${AGENT2_USER}:${SERVER_NAME}\"]")
echo "  -> #actes-service ID : ${ACTES_SERVICE_ID}"

echo "[3/4] Création du salon non chiffré #actes-coordination..."
# Membres : bot, admin, agent1, agent2, agent3
ACTES_COORD_ID=$(create_room "Actes Coordination" "false" "[\"@${BOT_USER}:${SERVER_NAME}\", \"@${AGENT1_USER}:${SERVER_NAME}\", \"@${AGENT2_USER}:${SERVER_NAME}\", \"@${AGENT3_USER}:${SERVER_NAME}\"]")
echo "  -> #actes-coordination ID : ${ACTES_COORD_ID}"

echo "[4/4] Création du salon non chiffré #actes-admin (Supervision)..."
# Membres : bot, admin
ACTES_ADMIN_ID=$(create_room "Actes Admin Supervision" "false" "[\"@${BOT_USER}:${SERVER_NAME}\"]")
echo "  -> #actes-admin ID : ${ACTES_ADMIN_ID}"

# Faire rejoindre le bot aux salons de coordination et admin
if [ -n "$BOT_TOKEN" ]; then
    curl -s -X POST "${BASE_URL}/_matrix/client/v3/rooms/${ACTES_COORD_ID}/join" -H "Authorization: Bearer ${BOT_TOKEN}" >/dev/null || true
    curl -s -X POST "${BASE_URL}/_matrix/client/v3/rooms/${ACTES_ADMIN_ID}/join" -H "Authorization: Bearer ${BOT_TOKEN}" >/dev/null || true
fi

# 4. Mise à jour automatique de .env
echo ""
echo "[*] Mise à jour des identifiants de salons dans .env..."
sed -i "s|^COORDINATION_ROOM_ID=.*|COORDINATION_ROOM_ID=${ACTES_COORD_ID}|" "$ENV_FILE"
sed -i "s|^ADMIN_ROOM_ID=.*|ADMIN_ROOM_ID=${ACTES_ADMIN_ID}|" "$ENV_FILE"
sed -i "s|^ACTES_SERVICE_ROOM_ID=.*|ACTES_SERVICE_ROOM_ID=${ACTES_SERVICE_ID}|" "$ENV_FILE"

echo "=============================================================================="
echo " [SUCCÈS] Salons configurés et enregistrés dans .env"
echo " - Salon chiffré #actes-service    : ${ACTES_SERVICE_ID} (Bot exclu : OUI)"
echo " - Salon coordination              : ${ACTES_COORD_ID}"
echo " - Salon supervision admin         : ${ACTES_ADMIN_ID}"
echo "=============================================================================="
