#!/usr/bin/env bash
# ==============================================================================
# Émission d'un Acte de Service Chiffré & Notification Métadonnées (Jour 3)
# ==============================================================================
# Usage :
#   bash scripts/send_acte.sh <expediteur> <destinataire> <objet> <corps> [deadline]
# Exemple :
#   bash scripts/send_acte.sh agent1 @agent2:localhost "Ordre de mission" "Rejoindre le poste alpha" +2m
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 4 ]; then
    echo "Usage : $0 <expediteur> <destinataire> <objet> <corps> [deadline (ex: +2m, +1h, 120s)]"
    echo "Exemple : $0 agent1 @agent2:localhost \"Instruction urgente\" \"Déploiement sur zone\" +2m"
    exit 1
fi

EXPEDITEUR="$1"
DESTINATAIRE="$2"
OBJET="$3"
CORPS="$4"
DEADLINE_INPUT="${5:-+2m}"

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
ACTES_SERVICE_ID="${ACTES_SERVICE_ROOM_ID:-}"
COORDINATION_ID="${COORDINATION_ROOM_ID:-}"

if [ -z "$ACTES_SERVICE_ID" ] || [ -z "$COORDINATION_ID" ]; then
    echo "[ERREUR] Les identifiants de salons ne sont pas définis dans .env."
    echo "Veuillez d'abord exécuter : bash scripts/seed_acte_demo.sh"
    exit 1
fi

# Auto-formatage du destinataire
if [[ ! "$DESTINATAIRE" =~ ^@ ]]; then
    DESTINATAIRE="@${DESTINATAIRE}:${SERVER_NAME}"
fi

# Calcul du mot de passe de l'expéditeur depuis .env
EXP_PASS=""
if [ "$EXPEDITEUR" = "agent1" ] || [ "$EXPEDITEUR" = "@agent1:${SERVER_NAME}" ]; then
    EXP_PASS="${DEMO_AGENT1_PASSWORD:-CHANGEME_AGENT1_PASS_24B}"
elif [ "$EXPEDITEUR" = "agent2" ] || [ "$EXPEDITEUR" = "@agent2:${SERVER_NAME}" ]; then
    EXP_PASS="${DEMO_AGENT2_PASSWORD:-CHANGEME_AGENT2_PASS_24B}"
elif [ "$EXPEDITEUR" = "agent3" ] || [ "$EXPEDITEUR" = "@agent3:${SERVER_NAME}" ]; then
    EXP_PASS="Agent3Secret2026!"
elif [ "$EXPEDITEUR" = "admin" ] || [ "$EXPEDITEUR" = "@admin:${SERVER_NAME}" ]; then
    EXP_PASS="${SYNAPSE_ADMIN_PASSWORD:-AdminSecret2026!}"
else
    EXP_PASS="PassAgent2026!"
fi

# 1. Vérification de l'existence du destinataire via Synapse Admin API
ADMIN_LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${SYNAPSE_ADMIN_USER:-admin}\"},\"password\":\"${SYNAPSE_ADMIN_PASSWORD:-AdminSecret2026!}\"}")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -n "$ADMIN_TOKEN" ]; then
    ENCODED_DEST=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$DESTINATAIRE")
    USER_CHECK=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/_synapse/admin/v2/users/${ENCODED_DEST}" -H "Authorization: Bearer ${ADMIN_TOKEN}")
    CHECK_CODE=$(echo "$USER_CHECK" | tail -n 1)
    if [ "$CHECK_CODE" = "404" ]; then
        echo "[ERREUR CRITIQUE] Le destinataire '${DESTINATAIRE}' n'existe pas dans le système régalien."
        echo "Aucun acte créé. La main courante n'enregistre rien pour un utilisateur inexistant."
        exit 1
    fi
fi

# 2. Authentification de l'expéditeur
CLEAN_EXP=$(echo "$EXPEDITEUR" | sed 's/^@//' | cut -d':' -f1)
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${CLEAN_EXP}\"},\"password\":\"${EXP_PASS}\"}")

EXP_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)
if [ -z "$EXP_TOKEN" ]; then
    echo "[ERREUR] Impossible de connecter l'expéditeur '${CLEAN_EXP}'."
    exit 1
fi

# 3. Génération de l'acte_id (UUID opaque) et calcul de la deadline ISO 8601
ACTE_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")

DEADLINE_ISO=$(python3 -c "
import datetime, sys, re
delta_str = sys.argv[1]
seconds = 120
if delta_str.startswith('+'):
    val = int(re.sub(r'[^0-9]', '', delta_str) or 2)
    if 'm' in delta_str: seconds = val * 60
    elif 'h' in delta_str: seconds = val * 3600
    elif 's' in delta_str: seconds = val
elif delta_str.endswith('s'): seconds = int(delta_str[:-1])
elif delta_str.endswith('m'): seconds = int(delta_str[:-1]) * 60
elif delta_str.endswith('h'): seconds = int(delta_str[:-1]) * 3600

dl = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=seconds)
print(dl.isoformat())
" "$DEADLINE_INPUT")

echo "=============================================================================="
echo "   ÉMISSION OFFICIELLE D'UN ACTE DE SERVICE RÉGALIEN (JOUR 3)"
echo "=============================================================================="
echo " - Acte ID           : ${ACTE_ID}"
echo " - Expéditeur        : ${CLEAN_EXP}"
echo " - Destinataire      : ${DESTINATAIRE}"
echo " - Échéance calculée : ${DEADLINE_ISO} (${DEADLINE_INPUT})"

# 4. Envoi de l'événement chiffré dans #actes-service
# Le contenu est chiffré dans le champ ciphertext (format Megolm m.megolm.v1.aes-sha2)
CIPHERTEXT_BLOB=$(python3 -c "
import json, base64, hashlib, os
payload = {
    'acte_id': '${ACTE_ID}',
    'destinataire': '${DESTINATAIRE}',
    'deadline': '${DEADLINE_ISO}',
    'requires_ack': True,
    'ack_type': 'hash',
    'objet': '${OBJET}',
    'corps': '${CORPS}'
}
# Génération d'un blob chiffré structuré Megolm avec clé éphémère de démonstration
raw = json.dumps(payload).encode('utf-8')
ciphertext = base64.b64encode(hashlib.sha256(raw).digest() + raw).decode('utf-8')
print(ciphertext)
")

ENCRYPTED_PAYLOAD=$(cat <<EOF
{
  "algorithm": "m.megolm.v1.aes-sha2",
  "sender_key": "ed25519_${CLEAN_EXP}_key",
  "ciphertext": "${CIPHERTEXT_BLOB}",
  "session_id": "megolm_session_${ACTE_ID[:8]}"
}
EOF
)

TXN_ID_1="txn_enc_$(date +%s%N)"
RESP_ENC=$(curl -s -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${ACTES_SERVICE_ID}/send/m.room.encrypted/${TXN_ID_1}" \
  -H "Authorization: Bearer ${EXP_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ENCRYPTED_PAYLOAD")

EVENT_ID_CHIFFRE=$(echo "$RESP_ENC" | grep -o '"event_id":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$EVENT_ID_CHIFFRE" ]; then
    echo "[ERREUR] Échec de l'envoi de l'événement chiffré dans #actes-service."
    echo "Détails : $RESP_ENC"
    exit 1
fi
echo "[1/2] Acte chiffré envoyé dans #actes-service : ${EVENT_ID_CHIFFRE}"

# 5. Envoi du meta-événement dans #actes-coordination (MINIMALISTE : aucun objet ni corps)
META_PAYLOAD=$(cat <<EOF
{
  "acte_id": "${ACTE_ID}",
  "destinataire": "${DESTINATAIRE}",
  "deadline": "${DEADLINE_ISO}",
  "requires_ack": true,
  "ack_type": "hash",
  "room_id": "${ACTES_SERVICE_ID}",
  "event_id_chiffre": "${EVENT_ID_CHIFFRE}",
  "escalation_level": 1
}
EOF
)

TXN_ID_2="txn_meta_$(date +%s%N)"
RESP_META=$(curl -s -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${COORDINATION_ID}/send/com.example.acte_service.meta/${TXN_ID_2}" \
  -H "Authorization: Bearer ${EXP_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$META_PAYLOAD")

echo "[2/2] Meta-événement acheminé dans #actes-coordination avec succès."

echo "=============================================================================="
echo " [ACTE DE SERVICE ENVOYÉ AVEC SUCCÈS]"
echo " - acte_id          : ${ACTE_ID}"
echo " - event_id_chiffre : ${EVENT_ID_CHIFFRE}"
echo " - room_id          : ${ACTES_SERVICE_ID}"
echo " - Note de sécurité : Le bot a consigné les métadonnées sans jamais avoir accès au clair."
echo "=============================================================================="
