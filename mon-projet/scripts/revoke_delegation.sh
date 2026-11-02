#!/usr/bin/env bash
# ==============================================================================
# Révocation Immédiate d'un Mandat de Suppléance (Jour 3)
# ==============================================================================
# Usage :
#   bash scripts/revoke_delegation.sh <delegation_id_ou_delegataire>
# Exemple :
#   bash scripts/revoke_delegation.sh del_1234567890ab
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage : $0 <delegation_id_ou_delegataire>"
    echo "Exemple : $0 del_a1b2c3d4e5f6"
    exit 1
fi

TARGET="$1"

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
COORDINATION_ID="${COORDINATION_ROOM_ID:-}"

# Si TARGET ressemble à un user (@agent3), chercher son delegation_id actif dans data/delegations.jsonl
DELEG_ID="$TARGET"
if [[ "$TARGET" =~ ^@ ]] || [[ "$TARGET" =~ ^agent ]] && [ -f "${ROOT_DIR}/data/delegations.jsonl" ]; then
    FOUND=$(grep -F "$TARGET" "${ROOT_DIR}/data/delegations.jsonl" | grep '"statut": *"active"' | tail -n 1 | grep -o '"delegation_id": *"[^"]*' | cut -d'"' -f4 || true)
    if [ -n "$FOUND" ]; then
        DELEG_ID="$FOUND"
        echo "[INFO] Mandat actif identifié pour '${TARGET}' : ${DELEG_ID}"
    fi
fi

echo "=============================================================================="
echo "   ORDRE DE RÉVOCATION IMMÉDIATE DU MANDAT DE SUPPLÉANCE (JOUR 3)"
echo "=============================================================================="
echo " - Mandat ciblé : ${DELEG_ID}"

# 1. Connexion admin
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${SYNAPSE_ADMIN_USER:-admin}\"},\"password\":\"${SYNAPSE_ADMIN_PASSWORD:-AdminSecret2026!}\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)
if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Connexion admin échouée."
    exit 1
fi

# 2. Envoi de l'événement com.example.delegation.revoked dans #actes-coordination
REVOKE_PAYLOAD=$(cat <<EOF
{
  "delegation_id": "${DELEG_ID}",
  "revoked": true,
  "revoked_by": "${SYNAPSE_ADMIN_USER:-admin}",
  "ts": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)

TXN_ID="txn_revdel_$(date +%s%N)"
RESP=$(curl -s -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${COORDINATION_ID}/send/com.example.delegation.revoked/${TXN_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$REVOKE_PAYLOAD")

echo "=============================================================================="
echo " [ORDRE DE RÉVOCATION TRANSMIS AU BOT]"
echo " - delegation_id : ${DELEG_ID}"
echo " - Effet immédiat : Le bot expulse le suppléant du sous-salon et clôture le mandat."
echo "=============================================================================="
