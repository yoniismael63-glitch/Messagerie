#!/usr/bin/env bash
# ==============================================================================
# Émission de l'Accusé Probant par Hash SHA-256 du Contenu Chiffré (Jour 3)
# ==============================================================================
# Usage :
#   bash scripts/send_ack.sh <agent> <event_id_chiffre> <room_id> [acte_id]
# Exemple :
#   bash scripts/send_ack.sh agent2 '$abc123event' '!room123' 'uuid-acte'
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 3 ]; then
    echo "Usage : $0 <agent> <event_id_chiffre> <room_id> [acte_id]"
    echo "Exemple : $0 agent2 '\$abc...' '!room...' 'uuid-123'"
    exit 1
fi

AGENT="$1"
EVENT_ID="$2"
ROOM_ID="$3"
ACTE_ID="${4:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "[ERREUR] Le fichier .env est introuvable."
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE_URL="${BASE_URL:-http://localhost}"
SERVER_NAME="${SERVER_NAME:-localhost}"
COORDINATION_ID="${COORDINATION_ROOM_ID:-}"

CLEAN_AGENT=$(echo "$AGENT" | sed 's/^@//' | cut -d':' -f1)

# Mot de passe de l'agent
AGENT_PASS=""
if [ "$CLEAN_AGENT" = "agent1" ]; then AGENT_PASS="${DEMO_AGENT1_PASSWORD:-CHANGEME_AGENT1_PASS_24B}";
elif [ "$CLEAN_AGENT" = "agent2" ]; then AGENT_PASS="${DEMO_AGENT2_PASSWORD:-CHANGEME_AGENT2_PASS_24B}";
elif [ "$CLEAN_AGENT" = "agent3" ]; then AGENT_PASS="Agent3Secret2026!";
elif [ "$CLEAN_AGENT" = "admin" ]; then AGENT_PASS="${SYNAPSE_ADMIN_PASSWORD:-AdminSecret2026!}";
else AGENT_PASS="PassAgent2026!"; fi

echo "=============================================================================="
echo "   ÉMISSION DE L'ACCUSÉ DE RÉCEPTION PROBANT (JOUR 3)"
echo "=============================================================================="
echo " - Agent signataire : @${CLEAN_AGENT}:${SERVER_NAME}"
echo " - Événement ciblé  : ${EVENT_ID}"
echo " - Salon de l'acte  : ${ROOM_ID}"

# 1. Connexion de l'agent
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${CLEAN_AGENT}\"},\"password\":\"${AGENT_PASS}\"}")

AGENT_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)
if [ -z "$AGENT_TOKEN" ]; then
    echo "[ERREUR] Échec de l'authentification de l'agent ${CLEAN_AGENT}."
    exit 1
fi

# 2. Récupération de l'événement chiffré depuis Synapse
echo "[1/3] Récupération de l'événement chiffré dans le salon..."
ENCODED_ROOM=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$ROOM_ID")
ENCODED_EVENT=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$EVENT_ID")

EVENT_DATA=$(curl -s -X GET "${BASE_URL}/_matrix/client/v3/rooms/${ENCODED_ROOM}/event/${ENCODED_EVENT}" \
  -H "Authorization: Bearer ${AGENT_TOKEN}")

# 3. Extraction du champ ciphertext et calcul SHA-256
echo "[2/3] Calcul cryptographique du hash SHA-256 sur le ciphertext Megolm..."
CALC_RES=$(python3 -c "
import json, hashlib, sys

data = json.loads('''${EVENT_DATA}''')
content = data.get('content', {})
ciphertext = content.get('ciphertext')

if not ciphertext:
    print('ERROR: Champ ciphertext introuvable')
    sys.exit(1)

# Calcul du hash sha256 du ciphertext
h = hashlib.sha256(ciphertext.encode('utf-8')).hexdigest()
print(f'sha256:{h}')
")

if [[ "$CALC_RES" =~ ^ERROR ]]; then
    echo "[ERREUR] $CALC_RES"
    echo "Détails réponse événement : $EVENT_DATA"
    exit 1
fi

ACK_HASH="$CALC_RES"
echo "  -> Empreinte calculée : ${ACK_HASH}"

# Si acte_id non spécifié, le rechercher dans main_courante.jsonl via l'event_id_chiffre
if [ -z "$ACTE_ID" ] && [ -f "${ROOT_DIR}/data/main_courante.jsonl" ]; then
    ACTE_ID=$(grep -F "$EVENT_ID" "${ROOT_DIR}/data/main_courante.jsonl" | tail -n 1 | grep -o '"acte_id": *"[^"]*' | cut -d'"' -f4 || true)
fi

if [ -z "$ACTE_ID" ]; then
    echo "[ATTENTION] acte_id non trouvé automatiquement. Définition à 'acte_inconnu'."
    ACTE_ID="acte_inconnu"
fi

# 4. Envoi de l'accusé com.example.acte_service.ack dans #actes-coordination
echo "[3/3] Envoi de l'accusé probant dans #actes-coordination..."
NOW_ISO=$(python3 -c "import datetime; print(datetime.datetime.now(datetime.timezone.utc).isoformat())")
ACK_PAYLOAD=$(cat <<EOF
{
  "acte_id": "${ACTE_ID}",
  "ack_hash": "${ACK_HASH}",
  "ts": "${NOW_ISO}"
}
EOF
)

TXN_ID="txn_ack_$(date +%s%N)"
RESP_ACK=$(curl -s -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${COORDINATION_ID}/send/com.example.acte_service.ack/${TXN_ID}" \
  -H "Authorization: Bearer ${AGENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ACK_PAYLOAD")

echo "=============================================================================="
echo " [ACCUSÉ PROBANT EXPÉDIÉ AVEC SUCCÈS]"
echo " - acte_id  : ${ACTE_ID}"
echo " - ack_hash : ${ACK_HASH}"
echo " - Horodatage certifié : ${NOW_ISO}"
echo " - Limite documentée : Empreinte de non-répudiation sur le contenu chiffré."
echo "=============================================================================="
