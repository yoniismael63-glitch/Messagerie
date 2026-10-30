#!/usr/bin/env bash
# ==============================================================================
# Script de peuplement (Seed) démo souveraine FasoMatrix
# ==============================================================================
# - Crée le compte administrateur de sécurité
# - Crée deux agents habilités (aucun enregistrement public permis)
# - Connecte l'administrateur à l'API Matrix pour récupérer un jeton
# - Crée un salon chiffré de bout en bout (Megolm) et y invite les deux agents
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

# Chargement sécurisé des variables d'environnement
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE_URL="${BASE_URL:-http://localhost}"
SERVER_NAME="${SERVER_NAME:-localhost}"

echo "=============================================================================="
echo "   PEUPLEMENT ET ENRÔLEMENT DES AGENTS SOUVERAINS (BURKINA FASO)"
echo "=============================================================================="

# 1. Vérification que Synapse est démarré et fonctionnel
echo "[1/4] Vérification de la disponibilité du serveur Synapse via NGINX..."
MAX_RETRIES=20
COUNT=0
until curl -s -f "${BASE_URL}/_matrix/client/versions" >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
        echo "[ERREUR] Impossible de joindre Synapse sur ${BASE_URL} après ${MAX_RETRIES} tentatives."
        echo "Vérifiez que les conteneurs tournent avec : docker compose ps"
        exit 1
    fi
    echo "  -> En attente de Synapse (tentative $COUNT/$MAX_RETRIES)..."
    sleep 2
done
echo "[SUCCÈS] Synapse répond correctement."

# 2. Fonction d'enregistrement idempotent via l'outil interne Synapse
register_user_cli() {
    local username="$1"
    local password="$2"
    local is_admin="$3"
    local admin_flag="--no-admin"
    if [ "$is_admin" = "true" ]; then
        admin_flag="-a"
    fi

    echo "  -> Enrôlement de l'agent '@${username}:${SERVER_NAME}'..."
    # Exécution de l'outil Synapse officiel dans le conteneur
    out=$(docker compose exec -T synapse register_new_matrix_user \
        -u "$username" \
        -p "$password" \
        "$admin_flag" \
        -c /data/homeserver.yaml 2>&1 || true)

    if echo "$out" | grep -qi "already taken\|already exists"; then
        echo "     [INFO] L'agent '${username}' est déjà enregistré (idempotence respectée)."
    elif echo "$out" | grep -qi "success"; then
        echo "     [SUCCÈS] Enrôlement réussi."
    else
        echo "     [NOTE] Retour Synapse : ${out}"
    fi
}

echo ""
echo "[2/4] Création des comptes au sein du registre souverain..."
register_user_cli "${SYNAPSE_ADMIN_USER}" "${SYNAPSE_ADMIN_PASSWORD}" "true"
register_user_cli "${DEMO_AGENT1_USER}" "${DEMO_AGENT1_PASSWORD}" "false"
register_user_cli "${DEMO_AGENT2_USER}" "${DEMO_AGENT2_PASSWORD}" "false"

# 3. Authentification de l'administrateur auprès de l'API Matrix
echo ""
echo "[3/4] Authentification de l'administrateur via l'API Client Matrix..."
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

# Extraction robuste du jeton d'accès sans dépendance à jq
ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Échec de récupération du token administrateur. Réponse : $LOGIN_RESP"
    exit 1
fi
echo "[SUCCÈS] Session administrateur établie (Token sécurisé généré)."

# 4. Création d'un salon avec chiffrement de bout en bout (Megolm) et invitation
echo ""
echo "[4/4] Création du salon sécurisé avec chiffrement E2EE m.megolm.v1.aes-sha256..."
ROOM_PAYLOAD=$(cat <<EOF
{
  "name": "Cellule Souveraine - Communication Protégée",
  "topic": "Échanges classifiés - Protocole Matrix E2EE (Megolm)",
  "preset": "private_chat",
  "visibility": "private",
  "initial_state": [
    {
      "type": "m.room.encryption",
      "state_key": "",
      "content": {
        "algorithm": "m.megolm.v1.aes-sha256"
      }
    }
  ],
  "invite": [
    "@${DEMO_AGENT1_USER}:${SERVER_NAME}",
    "@${DEMO_AGENT2_USER}:${SERVER_NAME}"
  ]
}
EOF
)

ROOM_RESP=$(curl -s -X POST "${BASE_URL}/_matrix/client/v3/createRoom" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ROOM_PAYLOAD")

ROOM_ID=$(echo "$ROOM_RESP" | grep -o '"room_id":"[^"]*' | cut -d'"' -f4 || true)

echo "=============================================================================="
echo "                      RÉSUMÉ DU DÉPLOIEMENT SOUVERAIN"
echo "=============================================================================="
echo "Accès Client Web Element : ${BASE_URL}"
echo ""
echo "Comptes disponibles :"
echo "  1. Administrateur de sécurité :"
echo "     - Identifiant : @${SYNAPSE_ADMIN_USER}:${SERVER_NAME}"
echo "     - Mot de passe : ${SYNAPSE_ADMIN_PASSWORD}"
echo ""
echo "  2. Agent Opérationnel 1 :"
echo "     - Identifiant : @${DEMO_AGENT1_USER}:${SERVER_NAME}"
echo "     - Mot de passe : ${DEMO_AGENT1_PASSWORD}"
echo ""
echo "  3. Agent Opérationnel 2 :"
echo "     - Identifiant : @${DEMO_AGENT2_USER}:${SERVER_NAME}"
echo "     - Mot de passe : ${DEMO_AGENT2_PASSWORD}"
echo ""
if [ -n "$ROOM_ID" ]; then
    echo "Salon chiffré de bout en bout créé :"
    echo "  - Nom     : Cellule Souveraine - Communication Protégée"
    echo "  - ID      : ${ROOM_ID}"
    echo "  - Chiffre : Megolm (m.megolm.v1.aes-sha256)"
    echo "  - Membres invités : Agent 1 et Agent 2"
fi
echo "=============================================================================="
echo "Procédure de test :"
echo "1. Connectez Agent 1 dans un onglet (ou navigateur privé)."
echo "2. Connectez Agent 2 dans un second onglet."
echo "3. Ouvrez le salon partagé et échangez des messages chiffrés."
echo "4. Vérifiez les logs avec : docker compose logs synapse | grep -i 'm.room.encrypted'"
echo "=============================================================================="
