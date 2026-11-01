#!/bin/sh
set -eu

echo "[INFO] Initialisation du conteneur Synapse Souverain (Jour 1 & Jour 2)..."

# Verification stricte des variables obligatoires
test -n "${SERVER_NAME:-}" || { echo "[ERREUR CRITIQUE] SERVER_NAME manquant dans .env" >&2; exit 1; }
test -n "${POSTGRES_USER:-}" || { echo "[ERREUR CRITIQUE] POSTGRES_USER manquant dans .env" >&2; exit 1; }
test -n "${POSTGRES_PASSWORD:-}" || { echo "[ERREUR CRITIQUE] POSTGRES_PASSWORD manquant dans .env" >&2; exit 1; }
test -n "${SYNAPSE_REGISTRATION_SHARED_SECRET:-}" || { echo "[ERREUR CRITIQUE] SYNAPSE_REGISTRATION_SHARED_SECRET manquant dans .env" >&2; exit 1; }

# Valeurs par defaut securisees pour les variables optionnelles du Jour 2
export SYNAPSE_ALLOW_FEDERATION="${SYNAPSE_ALLOW_FEDERATION:-false}"
export SYNAPSE_RETENTION_ENABLED="${SYNAPSE_RETENTION_ENABLED:-false}"
export SYNAPSE_RETENTION_MIN_LIFETIME="${SYNAPSE_RETENTION_MIN_LIFETIME:-1d}"
export SYNAPSE_RETENTION_MAX_LIFETIME="${SYNAPSE_RETENTION_MAX_LIFETIME:-90d}"
export SYNAPSE_ENABLE_METRICS="${SYNAPSE_ENABLE_METRICS:-false}"

CONFIG_FILE="/data/homeserver.yaml"
TEMPLATE_FILE="/synapse_bootstrap/homeserver.yaml.template"
SIGNING_KEY="/data/${SERVER_NAME}.signing.key"

if [ ! -d "/data" ]; then
    echo "[ERREUR] Le repertoire persistant /data est inaccessible." >&2
    exit 1
fi

# Etape 1 : Generation du fichier homeserver.yaml si absent
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[INFO] Premier demarrage detecte : generation de ${CONFIG_FILE} depuis le modele..."
    python3 -c '
import os, re
with open("/synapse_bootstrap/homeserver.yaml.template", "r") as f:
    tpl = f.read()
rendered = re.sub(r"\$\{([A-Za-z0-9_]+)\}", lambda m: os.environ.get(m.group(1), ""), tpl)
with open("/data/homeserver.yaml", "w") as f:
    f.write(rendered)
'
    echo "[SUCCES] Configuration ${CONFIG_FILE} generee avec succes."
else
    echo "[INFO] Configuration existante trouvee dans ${CONFIG_FILE}. Demarrage standard."
fi

# Garantie anti-erreur : s'assurer que report_stats est bien defini sur false
if ! grep -q "report_stats:" "$CONFIG_FILE"; then
    echo "report_stats: false" >> "$CONFIG_FILE"
    echo "[SUCCES] report_stats: false ajoute a la configuration."
fi

# Etape 2 : Generation de la cle Ed25519 si absente
if [ ! -f "$SIGNING_KEY" ]; then
    echo "[INFO] Cle de signature locale ${SIGNING_KEY} absente : generation Ed25519..."
    python3 -m synapse.app.homeserver --generate-keys -c "$CONFIG_FILE"
    echo "[SUCCES] Cle Ed25519 generee localement."
else
    echo "[INFO] Cle Ed25519 validee : ${SIGNING_KEY}."
fi

# Etape 3 : Lancement du serveur Synapse
echo "[INFO] Lancement de Matrix Synapse en ecoute sur 0.0.0.0:8008..."
exec python3 -m synapse.app.homeserver -c "$CONFIG_FILE"
