#!/bin/sh
# ==============================================================================
# Script de Sauvegarde Souveraine à Chaud (Disaster Recovery Vault) - Jour 2
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================
# Ce script réalise une sauvegarde cohérente à chaud SANS interruption de service :
#   1. Export relationnel PostgreSQL complet (pg_dump)
#   2. Sauvegarde de la clé maîtresse Ed25519 du serveur (${SERVER_NAME}.signing.key)
#   3. Sauvegarde de la configuration active (${CONFIG_FILE}) et des secrets (.env)
#   4. Calcul d'empreintes cryptographiques SHA-256 d'intégrité (anti-altération)
# ==============================================================================

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

if [ ! -f .env ]; then
    echo "[ERREUR CRITIQUE] Le fichier .env est introuvable à la racine de mon-projet." >&2
    exit 1
fi

# Charger les variables du .env en évitant les sauts de ligne Windows
eval "$(grep -E '^(SERVER_NAME|POSTGRES_USER|POSTGRES_DB)=' .env | tr -d '\r')"

SERVER_NAME="${SERVER_NAME:-localhost}"
POSTGRES_USER="${POSTGRES_USER:-synapse_admin}"
POSTGRES_DB="${POSTGRES_DB:-synapse_db}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="backups/vault_${TIMESTAMP}"

echo "================================================================================"
echo "  DÉMARRAGE DE LA SAUVEGARDE SOUVERAINE FASOMATRIX (JOUR 2)"
echo "  Cible : ${BACKUP_DIR}"
echo "================================================================================"

mkdir -p "$BACKUP_DIR"

# 1. Vérifier que Docker et les conteneurs sont actifs
if ! docker compose ps db | grep -q "Up"; then
    echo "[ERREUR CRITIQUE] Le conteneur de base de données 'db' n'est pas actif." >&2
    exit 1
fi

# 2. Sauvegarde PostgreSQL à chaud
echo "[1/4] Export de la base PostgreSQL '${POSTGRES_DB}' via pg_dump..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists > "${BACKUP_DIR}/synapse_db.sql"
SQL_SIZE="$(ls -lh "${BACKUP_DIR}/synapse_db.sql" | awk '{print $5}')"
echo "      -> Base exportée (${SQL_SIZE})"

# 3. Sauvegarde de la clé cryptographique Ed25519 (identifiant serveur régalien)
echo "[2/4] Extraction de la clé Ed25519 (/data/${SERVER_NAME}.signing.key)..."
if docker compose exec -T synapse test -f "/data/${SERVER_NAME}.signing.key"; then
    docker compose exec -T synapse cat "/data/${SERVER_NAME}.signing.key" > "${BACKUP_DIR}/${SERVER_NAME}.signing.key"
    echo "      -> Clé Ed25519 sauvegardée."
else
    echo "      [ATTENTION] La clé /data/${SERVER_NAME}.signing.key n'a pas été trouvée dans le conteneur."
fi

# 4. Sauvegarde de la configuration et des variables d'environnement
echo "[3/4] Archivage des fichiers de configuration..."
if docker compose exec -T synapse test -f "/data/homeserver.yaml"; then
    docker compose exec -T synapse cat "/data/homeserver.yaml" > "${BACKUP_DIR}/homeserver.yaml"
fi
cp .env "${BACKUP_DIR}/.env.backup"

# 5. Calcul des empreintes d'intégrité SHA-256
echo "[4/4] Scellement cryptographique SHA-256 (intégrité souveraine)..."
(
    cd "$BACKUP_DIR"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum * > SHA256SUMS 2>/dev/null || true
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 * > SHA256SUMS 2>/dev/null || true
    fi
)

echo "================================================================================"
echo "  [SUCCÈS] SAUVEGARDE RÉUSSIE DANS : ${BACKUP_DIR}"
echo "================================================================================"
ls -lh "$BACKUP_DIR"
echo ""
echo "Pour restaurer cette sauvegarde en cas de sinistre :"
echo "  ./scripts/restore.sh \"${BACKUP_DIR}\""
echo "================================================================================"
