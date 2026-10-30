#!/bin/sh
# ==============================================================================
# Script d'initialisation et démarrage du conteneur Synapse Souverain
# ==============================================================================
set -eu

echo "[INFO] Démarrage du conteneur Synapse Souverain (Burkina Faso)..."

CONFIG_FILE="/data/homeserver.yaml"
TEMPLATE_FILE="/synapse_bootstrap/homeserver.yaml.template"
SIGNING_KEY="/data/${SERVER_NAME}.signing.key"

# Vérification du montage du volume persistant
if [ ! -d "/data" ]; then
    echo "[ERREUR] Le répertoire persistant /data n'existe pas." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Étape 1 : Génération ou vérification du fichier homeserver.yaml
# ------------------------------------------------------------------------------
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[INFO] Premier démarrage détecté : génération de ${CONFIG_FILE} depuis le modèle..."
    
    if command -v envsubst >/dev/null 2>&1; then
        envsubst < "$TEMPLATE_FILE" > "$CONFIG_FILE"
    else
        # Remplacement robuste utilisant Python 3 (présent dans l'image officielle)
        python3 -c '
import os, re
with open("/synapse_bootstrap/homeserver.yaml.template", "r") as f:
    content = f.read()
rendered = re.sub(r"\$\{([A-Za-z0-9_]+)\}", lambda m: os.environ.get(m.group(1), ""), content)
with open("/data/homeserver.yaml", "w") as f:
    f.write(rendered)
'
    fi
    echo "[SUCCÈS] Configuration ${CONFIG_FILE} générée avec succès."
else
    echo "[INFO] Configuration existante trouvée dans ${CONFIG_FILE}. Démarrage standard."
fi

# ------------------------------------------------------------------------------
# Étape 2 : Génération de la clé de signature Ed25519 si absente
# ------------------------------------------------------------------------------
if [ ! -f "$SIGNING_KEY" ]; then
    echo "[INFO] Clé de signature ${SIGNING_KEY} absente : génération cryptographique Ed25519..."
    python3 -m synapse.app.homeserver --generate-keys -c "$CONFIG_FILE"
    echo "[SUCCÈS] Clé de signature locale générée avec succès."
else
    echo "[INFO] Clé de signature existante validée : ${SIGNING_KEY}."
fi

# ------------------------------------------------------------------------------
# Étape 3 : Lancement du serveur Synapse
# ------------------------------------------------------------------------------
echo "[INFO] Lancement de Matrix Synapse en écoute sur 0.0.0.0:8008..."
exec python3 -m synapse.app.homeserver -c "$CONFIG_FILE"
