#!/bin/sh
# ==============================================================================
# Script de Purge d'Historique de Salon (Data Retention & Droit à l'Oubli) - Jour 2
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================
# Permet à un administrateur d'effacer les anciens messages d'un salon de la base
# PostgreSQL pour respecter la minimisation des données et la confidentialité.
# Usage :
#   ./scripts/purge_room.sh "!salon_id:localhost" [jours_a_conserver]
# Exemple :
#   ./scripts/purge_room.sh "!xAbc123:localhost" 7  (efface tout avant 7 jours)
# ==============================================================================

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

if [ ! -f .env ]; then
    echo "[ERREUR CRITIQUE] Fichier .env manquant à la racine." >&2
    exit 1
fi

eval "$(grep -E '^(BASE_URL|SYNAPSE_ADMIN_USER|SYNAPSE_ADMIN_PASSWORD)=' .env | tr -d '\r')"

BASE_URL="${BASE_URL:-http://localhost}"
ADMIN_USER="${SYNAPSE_ADMIN_USER:-admin_faso}"
ADMIN_PASS="${SYNAPSE_ADMIN_PASSWORD:-AdminFasoSecurise2026!}"

ROOM_ID="${1:-}"
DAYS_TO_KEEP="${2:-0}"

if [ -z "$ROOM_ID" ]; then
    echo "Usage : ./scripts/purge_room.sh <ROOM_ID> [JOURS_A_CONSERVER]" >&2
    echo "Exemple : ./scripts/purge_room.sh '!xyz:localhost' 30" >&2
    exit 1
fi

# 1. Obtenir un token d'administration
echo "[1/3] Authentification administrateur (${ADMIN_USER})..."
LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/login" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"${ADMIN_USER}\"},\"password\":\"${ADMIN_PASS}\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || true)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Impossible de récupérer le token administrateur :" >&2
    echo "$LOGIN_RESP" >&2
    exit 1
fi

# 2. Calcul du timestamp de purge en millisecondes
NOW_MS=$(python3 -c "import time; print(int(time.time() * 1000))")
KEEP_MS=$((DAYS_TO_KEEP * 86400 * 1000))
PURGE_TS=$((NOW_MS - KEEP_MS))

echo "[2/3] Ordre de purge des messages antérieurs à $(python3 -c "import datetime; print(datetime.datetime.fromtimestamp($PURGE_TS/1000).strftime('%Y-%m-%d %H:%M:%S'))")..."

# 3. Appel de l'API Admin de purge
PURGE_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/_synapse/admin/v1/purge_history/${ROOM_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"purge_up_to_ts\": ${PURGE_TS}}")

HTTP_CODE=$(echo "$PURGE_RESP" | tail -n1)
BODY=$(echo "$PURGE_RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "================================================================================"
    echo "  [SUCCÈS] ORDRE DE PURGE EXÉCUTÉ AVEC SUCCÈS (HTTP 200)"
    echo "  Réponse Synapse : ${BODY}"
    echo "  Les événements historiques ont été planifiés pour suppression de la base."
    echo "================================================================================"
else
    echo "[ERREUR] Échec de la purge (Code HTTP ${HTTP_CODE}) : ${BODY}" >&2
    exit 1
fi
