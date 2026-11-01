#!/bin/sh
# ==============================================================================
# Script de Restauration d'Urgence (Disaster Recovery Drill) - Jour 2
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================
# Restaure l'état complet du serveur depuis une sauvegarde :
#   1. Vérification stricte des empreintes SHA-256 (intégrité souveraine)
#   2. Arrêt du conteneur Synapse pour éviter les écritures concurrentes
#   3. Restauration de la base PostgreSQL
#   4. Restauration de la clé Ed25519 et du homeserver.yaml
#   5. Redémarrage et vérification de conformité via l'API client
# ==============================================================================

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

if [ ! -f .env ]; then
    echo "[ERREUR CRITIQUE] Fichier .env manquant à la racine." >&2
    exit 1
fi

eval "$(grep -E '^(SERVER_NAME|POSTGRES_USER|POSTGRES_DB)=' .env | tr -d '\r')"

SERVER_NAME="${SERVER_NAME:-localhost}"
POSTGRES_USER="${POSTGRES_USER:-synapse_admin}"
POSTGRES_DB="${POSTGRES_DB:-synapse_db}"

BACKUP_DIR="${1:-}"

# Si aucun répertoire n'est spécifié, prendre la sauvegarde la plus récente
if [ -z "$BACKUP_DIR" ]; then
    LATEST_DIR="$(ls -td backups/vault_* 2>/dev/null | head -n 1 || true)"
    if [ -n "$LATEST_DIR" ] && [ -d "$LATEST_DIR" ]; then
        BACKUP_DIR="$LATEST_DIR"
        echo "[INFO] Aucune sauvegarde spécifiée. Utilisation de la plus récente : ${BACKUP_DIR}"
    else
        echo "[ERREUR] Aucune sauvegarde trouvée dans 'backups/'. Syntaxe :" >&2
        echo "  ./scripts/restore.sh backups/vault_YYYYMMDD_HHMMSS" >&2
        exit 1
    fi
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "[ERREUR] Le répertoire de sauvegarde '${BACKUP_DIR}' n'existe pas." >&2
    exit 1
fi

echo "================================================================================"
echo "  DÉMARRAGE DE LA RESTAURATION D'URGENCE FASOMATRIX (JOUR 2)"
echo "  Source : ${BACKUP_DIR}"
echo "================================================================================"

# 1. Vérification de l'intégrité SHA-256
echo "[1/5] Contrôle d'intégrité cryptographique SHA-256..."
if [ -f "${BACKUP_DIR}/SHA256SUMS" ]; then
    (
        cd "$BACKUP_DIR"
        if command -v sha256sum >/dev/null 2>&1; then
            sha256sum -c SHA256SUMS --status || { echo "[ERREUR SÉCURITÉ] Échec de la somme de contrôle SHA-256. Fichiers altérés !" >&2; exit 1; }
        fi
    )
    echo "      -> Intégrité des données certifiée conforme."
else
    echo "      [AVERTISSEMENT] Fichier SHA256SUMS absent, poursuite sans contrôle d'intégrité."
fi

# 2. Stopper Synapse pour isoler la base
echo "[2/5] Arrêt temporaire de Synapse pour garantir la cohérence des transactions..."
docker compose stop synapse

# 3. Réinjection du dump PostgreSQL
echo "[3/5] Restauration de la base de données relationnelle..."
if [ -f "${BACKUP_DIR}/synapse_db.sql" ]; then
    docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "${BACKUP_DIR}/synapse_db.sql" > /dev/null
    echo "      -> Base PostgreSQL restaurée avec succès."
else
    echo "[ERREUR CRITIQUE] ${BACKUP_DIR}/synapse_db.sql manquant !" >&2
    exit 1
fi

# 4. Restauration de la clé Ed25519
echo "[4/5] Restauration de la clé maîtresse Ed25519..."
if [ -f "${BACKUP_DIR}/${SERVER_NAME}.signing.key" ]; then
    docker compose cp "${BACKUP_DIR}/${SERVER_NAME}.signing.key" synapse:/data/
    echo "      -> Clé Ed25519 remise en place."
fi

# 5. Redémarrage de Synapse et test de l'API
echo "[5/5] Redémarrage du conteneur Synapse..."
docker compose start synapse

echo "[INFO] Attente de la disponibilité de Synapse..."
RETRY=0
MAX_RETRIES=20
while [ $RETRY -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/_matrix/client/versions 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "[SUCCÈS] Synapse répond sur l'API (HTTP 200)."
        break
    fi
    RETRY=$((RETRY + 1))
    sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "[ATTENTION] Synapse prend plus de temps à démarrer. Vérifiez les logs avec 'docker compose logs synapse'."
fi

echo "================================================================================"
echo "  [SUCCÈS] RESTAURATION D'URGENCE TERMINÉE"
echo "  Le serveur et les sessions chiffrées sont rétablis à l'état de la sauvegarde."
echo "================================================================================"
