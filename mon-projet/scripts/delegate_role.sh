#!/usr/bin/env bash
# ==============================================================================
# Octroi d'un Mandat de Suppléance Chiffrée Temporaire (Jour 3)
# ==============================================================================
# Usage :
#   bash scripts/delegate_role.sh <admin> <delegant> <delegataire> <scope> <purpose> <duree>
# Exemple :
#   bash scripts/delegate_role.sh admin agent1 agent3 read_new_acts "Continuité opérationnelle" 10m
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 6 ]; then
    echo "Usage : $0 <admin> <delegant> <delegataire> <scope (read_new_acts|approve_acts)> <purpose> <duree (ex: 10m, 1h, 30s)>"
    echo "Exemple : $0 admin agent1 agent3 read_new_acts \"Continuité de service\" 10m"
    exit 1
fi

ADMIN_USER="$1"
DELEGANT="$2"
DELEGATAIRE="$3"
SCOPE="$4"
PURPOSE="$5"
DUREE="$6"

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

# Formatage des identifiants Matrix
if [[ ! "$DELEGANT" =~ ^@ ]]; then DELEGANT="@${DELEGANT}:${SERVER_NAME}"; fi
if [[ ! "$DELEGATAIRE" =~ ^@ ]]; then DELEGATAIRE="@${DELEGATAIRE}:${SERVER_NAME}"; fi

echo "=============================================================================="
echo "   ÉTABLISSEMENT D'UN MANDAT DE SUPPLÉANCE TEMPOREL (JOUR 3)"
echo "=============================================================================="
echo " - Délégant (Titulaire) : ${DELEGANT}"
echo " - Délégataire (Suppléant): ${DELEGATAIRE}"
echo " - Périmètre (Scope)    : ${SCOPE}"
echo " - Objet de la mission  : ${PURPOSE}"
echo " - Durée prescrite      : ${DUREE}"

# 1. Connexion admin
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${ADMIN_USER}\"},\"password\":\"${SYNAPSE_ADMIN_PASSWORD:-AdminSecret2026!}\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)
if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Authentification administrateur échouée."
    exit 1
fi

# 2. Vérification que le délégataire est bien enrôlé dans l'annuaire souverain
ENCODED_DELEGATAIRE=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$DELEGATAIRE")
CHECK_RESP=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/_synapse/admin/v2/users/${ENCODED_DELEGATAIRE}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")
HTTP_STATUS=$(echo "$CHECK_RESP" | tail -n 1)

if [ "$HTTP_STATUS" = "404" ]; then
    echo "[ERREUR CRITIQUE] Le suppléant '${DELEGATAIRE}' n'est pas un agent enrôlé dans Synapse."
    echo "Refus de mandat : un mandat de suppléance ne peut être accordé qu'à un agent existant."
    exit 1
fi

# 3. Calcul de la date d'expiration ISO 8601 et génération de l'ID
DELEGATION_ID=$(python3 -c "import uuid; print('del_' + str(uuid.uuid4())[:12])")

EXPIRES_AT=$(python3 -c "
import datetime, sys, re
d_str = sys.argv[1]
seconds = 600
val = int(re.sub(r'[^0-9]', '', d_str) or 10)
if 'm' in d_str: seconds = val * 60
elif 'h' in d_str: seconds = val * 3600
elif 's' in d_str: seconds = val
exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=seconds)
print(exp.isoformat())
" "$DUREE")

echo ""
echo "[*] Génération de l'ordre de mandat..."
echo "  -> Identifiant : ${DELEGATION_ID}"
echo "  -> Échéance    : ${EXPIRES_AT}"

# 4. Envoi de l'événement com.example.delegation dans #actes-coordination
DELEG_PAYLOAD=$(cat <<EOF
{
  "delegation_id": "${DELEGATION_ID}",
  "delegant": "${DELEGANT}",
  "delegataire": "${DELEGATAIRE}",
  "scope": "${SCOPE}",
  "purpose": "${PURPOSE}",
  "delegant_role": "Agent Titulaire",
  "expires_at": "${EXPIRES_AT}",
  "sub_room_id": null,
  "revoked": false
}
EOF
)

TXN_ID="txn_del_$(date +%s%N)"
RESP=$(curl -s -X PUT "${BASE_URL}/_matrix/client/v3/rooms/${COORDINATION_ID}/send/com.example.delegation/${TXN_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$DELEG_PAYLOAD")

echo "=============================================================================="
echo " [MANDAT DE SUPPLÉANCE TRANSMIS AU BOT]"
echo " - delegation_id  : ${DELEGATION_ID}"
echo " - expires_at     : ${EXPIRES_AT}"
echo " - Le bot va créer le sous-salon chiffré et notifier ${DELEGATAIRE}."
echo " - Garantie E2EE  : Aucun acte passé n'est accessible au suppléant."
echo "=============================================================================="
