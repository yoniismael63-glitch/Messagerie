#!/usr/bin/env bash
# ==============================================================================
# Script de peuplement (Seed) démo souveraine FasoMatrix - Validation Jour 1
# ==============================================================================
# - Enrôle l'administrateur et les agents 'agent1' et 'agent2'
# - Crée un salon EXPLICITEMENT CHIFFRÉ en Megolm (m.megolm.v1.aes-sha2)
# - Invite 'agent1' et 'agent2'
# - Valide par un GET sur l'API d'état que le chiffrement est actif
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "[ERREUR] Le fichier .env est introuvable à la racine (${ENV_FILE})."
    echo "Exécutez d'abord : cp .env.example .env"
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE_URL="${BASE_URL:-http://localhost}"
SERVER_NAME="${SERVER_NAME:-localhost}"
ADMIN_USER="${SYNAPSE_ADMIN_USER:-admin}"
ADMIN_PASS="${SYNAPSE_ADMIN_PASSWORD:-admin_secret_pass}"
AGENT1_USER="${DEMO_AGENT1_USER:-agent1}"
AGENT1_PASS="${DEMO_AGENT1_PASSWORD:-agent1_secret_pass}"
AGENT2_USER="${DEMO_AGENT2_USER:-agent2}"
AGENT2_PASS="${DEMO_AGENT2_PASSWORD:-agent2_secret_pass}"

echo "=============================================================================="
echo "   FASOMATRIX - VALIDATION DU SOCLE SOUVERAIN (JOUR 1)"
echo "=============================================================================="

# 1. Vérification de la disponibilité du homeserver
echo "[1/5] Vérification de la disponibilité de Synapse sur ${BASE_URL}..."
MAX_RETRIES=20
COUNT=0
until curl -s -f "${BASE_URL}/_matrix/client/versions" >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
        echo "[ERREUR] Synapse ne répond pas sur ${BASE_URL} après ${MAX_RETRIES} essais."
        echo "Vérifiez l'état des conteneurs : docker compose ps"
        exit 1
    fi
    echo "  -> En attente de Synapse (tentative $COUNT/$MAX_RETRIES)..."
    sleep 2
done
echo "[SUCCÈS] Synapse répond sur l'API standard /_matrix/client/versions."

# 2. Enrôlement des comptes via register_new_matrix_user (idempotent)
register_user_cli() {
    local username="$1"
    local password="$2"
    local is_admin="$3"
    local admin_flag="--no-admin"
    if [ "$is_admin" = "true" ]; then
        admin_flag="-a"
    fi

    echo "  -> Enrôlement de l'agent '@${username}:${SERVER_NAME}'..."
    out=$(docker compose exec -T synapse register_new_matrix_user \
        -u "$username" \
        -p "$password" \
        "$admin_flag" \
        -c /data/homeserver.yaml 2>&1 || true)

    if echo "$out" | grep -qi "already taken\|already exists"; then
        echo "     [INFO] Compte '${username}' déjà existant (idempotence garantie)."
    elif echo "$out" | grep -qi "success"; then
        echo "     [SUCCÈS] Compte '${username}' créé avec succès."
    else
        echo "     [NOTE] Statut de création : ${out}"
    fi
}

echo ""
echo "[2/5] Création des comptes d'autorité et des agents opérationnels..."
register_user_cli "${ADMIN_USER}" "${ADMIN_PASS}" "true"
register_user_cli "${AGENT1_USER}" "${AGENT1_PASS}" "false"
register_user_cli "${AGENT2_USER}" "${AGENT2_PASS}" "false"

# 3. Connexion de l'administrateur pour récupérer le token
echo ""
echo "[3/5] Authentification administrateur via l'API Client-Server..."
LOGIN_PAYLOAD=$(cat <<EOF
{
  "type": "m.login.password",
  "identifier": {
    "type": "m.id.user",
    "user": "${ADMIN_USER}"
  },
  "password": "${ADMIN_PASS}"
}
EOF
)

LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR CRITIQUE] Impossible d'obtenir le jeton d'accès administrateur."
    echo "Réponse API : ${LOGIN_RESP}"
    exit 1
fi
echo "[SUCCÈS] Jeton administrateur obtenu avec succès."

# 4. Création du salon explicitement chiffré en Megolm
echo ""
echo "[4/5] Création du salon de démonstration chiffré en Megolm..."
ROOM_PAYLOAD=$(cat <<EOF
{
  "name": "Cellule Souveraine - Démo Jour 1",
  "topic": "Salon chiffré de bout en bout - Administration Publique",
  "preset": "private_chat",
  "visibility": "private",
  "initial_state": [
    {
      "type": "m.room.encryption",
      "state_key": "",
      "content": {
        "algorithm": "m.megolm.v1.aes-sha2"
      }
    }
  ],
  "invite": [
    "@${AGENT1_USER}:${SERVER_NAME}",
    "@${AGENT2_USER}:${SERVER_NAME}"
  ]
}
EOF
)

ROOM_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/createRoom" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ROOM_PAYLOAD")

ROOM_ID=$(echo "$ROOM_RESP" | grep -o '"room_id":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$ROOM_ID" ]; then
    echo "[ERREUR] Échec de la création du salon chiffré."
    echo "Réponse API : ${ROOM_RESP}"
    exit 1
fi
echo "[SUCCÈS] Salon créé avec l'ID : ${ROOM_ID}"

# 5. Vérification formelle de l'activation du chiffrement par GET
echo ""
echo "[5/5] Vérification de l'événement d'état m.room.encryption..."
STATE_RESP=$(curl -s -X GET "${BASE_URL}/_matrix/client/v3/rooms/${ROOM_ID}/state/m.room.encryption" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

if echo "$STATE_RESP" | grep -q "m.megolm.v1.aes-sha2"; then
    echo "[SUCCÈS CONFIRMÉ] L'événement d'état m.room.encryption est bien actif : ${STATE_RESP}"
else
    echo "[AVERTISSEMENT] L'état de chiffrement initial n'a pas été détecté. Application explicite par PUT..."
    PUT_RESP=$(curl -s -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${ROOM_ID}/state/m.room.encryption" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"algorithm":"m.megolm.v1.aes-sha2"}')
    
    # Vérification après PUT
    STATE_RETRY=$(curl -s -X GET "${BASE_URL}/_matrix/client/v3/rooms/${ROOM_ID}/state/m.room.encryption" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}")
    if ! echo "$STATE_RETRY" | grep -q "m.megolm.v1.aes-sha2"; then
        echo "[ERREUR CRITIQUE] Impossible d'activer le chiffrement Megolm sur le salon ${ROOM_ID}."
        exit 1
    fi
    echo "[SUCCÈS CONFIRMÉ] Chiffrement Megolm activé par PUT : ${STATE_RETRY}"
fi

echo ""
echo "=============================================================================="
echo "            RÉSUMÉ DU SOCLE SOUVERAIN FASOMATRIX (JOUR 1)"
echo "=============================================================================="
echo "Point d'accès Web Element : ${BASE_URL} (utiliser impérativement http://localhost)"
echo ""
echo "Identifiants des comptes de démonstration :"
echo "  1. Agent 1 :"
echo "     - Utilisateur : ${AGENT1_USER}"
echo "     - Identifiant Matrix : @${AGENT1_USER}:${SERVER_NAME}"
echo "     - Mot de passe : ${AGENT1_PASS}"
echo ""
echo "  2. Agent 2 :"
echo "     - Utilisateur : ${AGENT2_USER}"
echo "     - Identifiant Matrix : @${AGENT2_USER}:${SERVER_NAME}"
echo "     - Mot de passe : ${AGENT2_PASS}"
echo ""
echo "Salon de démonstration :"
echo "  - Nom       : Cellule Souveraine - Démo Jour 1"
echo "  - Room ID   : ${ROOM_ID}"
echo "  - Chiffrement : Megolm (m.megolm.v1.aes-sha2) [CONFIRMÉ ET VÉRIFIÉ]"
echo "  - Invités   : @${AGENT1_USER}:${SERVER_NAME} et @${AGENT2_USER}:${SERVER_NAME}"
echo "=============================================================================="
