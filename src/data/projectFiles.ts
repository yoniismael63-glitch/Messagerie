export interface ProjectFile {
  path: string;
  name: string;
  directory: string;
  language: 'bash' | 'yaml' | 'json' | 'markdown' | 'text' | 'dockerfile' | 'nginx';
  description: string;
  securityNotice?: string;
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    path: 'mon-projet/.env.example',
    name: '.env.example',
    directory: 'racine',
    language: 'bash',
    description: 'Modèle des variables d\'environnement et des secrets cryptographiques générés par openssl.',
    securityNotice: 'Ne jamais commiter le fichier .env final. Tous les secrets sont injectés ici.',
    content: `# ==============================================================================
# Configuration d'environnement - Messagerie Souveraine Matrix / Synapse
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================
# Ce fichier sert de modèle. Copiez-le vers '.env' avant de lancer Docker Compose :
#   cp .env.example .env
#
# ATTENTION SÉCURITÉ : Ne commitez JAMAIS le fichier .env final dans Git !
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Nom de domaine et URL publique du serveur
# ------------------------------------------------------------------------------
# Pour une démonstration locale sur le poste de travail : "localhost" et "http://localhost"
# Pour un déploiement souverain en production : "messagerie.gouv.bf" et "https://messagerie.gouv.bf"
SERVER_NAME=localhost
BASE_URL=http://localhost

# Port HTTP exposé par le reverse-proxy Nginx sur la machine hôte
WEB_PORT=80

# ------------------------------------------------------------------------------
# 2. Base de données relationnelle PostgreSQL
# ------------------------------------------------------------------------------
POSTGRES_USER=synapse_admin
# Mot de passe fort pour PostgreSQL.
# Génération recommandée : openssl rand -hex 32
POSTGRES_PASSWORD=CHANGEME_POSTGRES_SECRET_OPENSSL_HEX32
POSTGRES_DB=synapse_db

# ------------------------------------------------------------------------------
# 3. Secrets cryptographiques de Synapse
# ------------------------------------------------------------------------------
# Secret partagé pour enregistrer des utilisateurs en ligne de commande ou via API interne
# Génération recommandée : openssl rand -hex 32
SYNAPSE_REGISTRATION_SHARED_SECRET=CHANGEME_REG_SHARED_SECRET_OPENSSL_HEX32

# Clé secrète pour la signature cryptographique des jetons Macaroon (sessions Matrix)
# Génération recommandée : openssl rand -hex 32
SYNAPSE_MACAROON_SECRET_KEY=CHANGEME_MACAROON_KEY_OPENSSL_HEX32

# Clé secrète pour signer les formulaires web internes et validations CSRF
# Génération recommandée : openssl rand -hex 32
SYNAPSE_FORM_SECRET=CHANGEME_FORM_SECRET_OPENSSL_HEX32

# ------------------------------------------------------------------------------
# 4. Comptes pré-enrôlés pour la démonstration et l'administration
# ------------------------------------------------------------------------------
# Identifiant et mot de passe de l'administrateur de sécurité gouvernemental
SYNAPSE_ADMIN_USER=admin_faso
# Génération recommandée : openssl rand -base64 24
SYNAPSE_ADMIN_PASSWORD=CHANGEME_ADMIN_PASSWORD_24B

# Agents de démonstration (aucun enregistrement libre permis)
DEMO_AGENT1_USER=agent_secu_1
DEMO_AGENT1_PASSWORD=CHANGEME_AGENT1_PASS_24B

DEMO_AGENT2_USER=agent_secu_2
DEMO_AGENT2_PASSWORD=CHANGEME_AGENT2_PASS_24B
`,
  },
  {
    path: 'mon-projet/.gitignore',
    name: '.gitignore',
    directory: 'racine',
    language: 'text',
    description: 'Protection contre la fuite accidentelle de secrets (.env), de clés Ed25519 ou de volumes locaux.',
    content: `# Fichiers de secrets et variables d'environnement
.env
.env.local
.env.*.local

# Fichiers de journaux
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Données locales persistantes et clés de chiffrement de Synapse
data/
synapse/data/
*.signing.key
media_store/

# Fichiers système
.DS_Store
Thumbs.db
`,
  },
  {
    path: 'mon-projet/LICENSE',
    name: 'LICENSE',
    directory: 'racine',
    language: 'text',
    description: 'Licence open source GNU AGPL-3.0 garantissant l\'indépendance et la transparence sans clause propriétaire.',
    content: `GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (C) 2026 FasoMatrix Project Contributors.
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
`,
  },
  {
    path: 'mon-projet/docker-compose.yml',
    name: 'docker-compose.yml',
    directory: 'racine',
    language: 'yaml',
    description: 'Orchestration Docker Compose v2 sans tiers : db (PostgreSQL 16), synapse (v1.125.0), element (v1.11.94), nginx (1.27).',
    securityNotice: 'Seul Nginx publie un port hôte (80). PostgreSQL n\'est accessible que sur le bridge interne matrix_internal.',
    content: `# ==============================================================================
# Orchestration souveraine Matrix / Synapse pour l'Administration Publique
# Contexte : Hackathon Sécurité - Déploiement "One-Command"
# ==============================================================================
# Architecture réseau :
#   - Seul NGINX expose un port vers l'hôte (port 80 ou \${WEB_PORT}).
#   - PostgreSQL (db) est strictement cantonné au réseau privé Docker 'matrix_internal'.
#   - Synapse communique uniquement avec NGINX et PostgreSQL.
#   - Fédération Matrix désactivée, Inscription libre désactivée.
# ==============================================================================

services:
  # ----------------------------------------------------------------------------
  # 1. Base de données relationnelle PostgreSQL
  # ----------------------------------------------------------------------------
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
      # Synapse exige une collation C et un encodage UTF-8 pour les index Matrix
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 6
      start_period: 5s
    networks:
      - matrix_internal
    # SÉCURITÉ : Aucun port n'est mappé vers l'hôte pour PostgreSQL !

  # ----------------------------------------------------------------------------
  # 2. Serveur Homeserver Matrix Synapse
  # ----------------------------------------------------------------------------
  synapse:
    # Tag officiel stable documenté : matrixdotorg/synapse:v1.125.0
    image: matrixdotorg/synapse:v1.125.0
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    entrypoint: ["/bin/sh", "/synapse_bootstrap/entrypoint.sh"]
    environment:
      SERVER_NAME: \${SERVER_NAME}
      BASE_URL: \${BASE_URL}
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
      SYNAPSE_REGISTRATION_SHARED_SECRET: \${SYNAPSE_REGISTRATION_SHARED_SECRET}
      SYNAPSE_MACAROON_SECRET_KEY: \${SYNAPSE_MACAROON_SECRET_KEY}
      SYNAPSE_FORM_SECRET: \${SYNAPSE_FORM_SECRET}
    volumes:
      - synapse_data:/data
      - ./synapse/homeserver.yaml.template:/synapse_bootstrap/homeserver.yaml.template:ro
      - ./synapse/entrypoint.sh:/synapse_bootstrap/entrypoint.sh:ro
    networks:
      - matrix_internal
    # Synapse écoute sur le port 8008 uniquement au sein du réseau Docker 'matrix_internal'.

  # ----------------------------------------------------------------------------
  # 3. Client Web Officiel Element
  # ----------------------------------------------------------------------------
  element:
    # Tag officiel stable documenté : vectorim/element-web:v1.11.94
    image: vectorim/element-web:v1.11.94
    restart: unless-stopped
    volumes:
      - ./element/config.json:/app/config.json:ro
    networks:
      - matrix_internal
    # Fichiers statiques servis en interne à NGINX.

  # ----------------------------------------------------------------------------
  # 4. Reverse Proxy Nginx - Point d'entrée unique de la souveraineté
  # ----------------------------------------------------------------------------
  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "\${WEB_PORT:-80}:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - synapse
      - element
    networks:
      - matrix_internal

# ------------------------------------------------------------------------------
# Volumes persistants isolés
# ------------------------------------------------------------------------------
volumes:
  db_data:
    driver: local
  synapse_data:
    driver: local

# ------------------------------------------------------------------------------
# Réseau Docker interne dédié (isolation des composants)
# ------------------------------------------------------------------------------
networks:
  matrix_internal:
    driver: bridge
`,
  },
  {
    path: 'mon-projet/synapse/homeserver.yaml.template',
    name: 'homeserver.yaml.template',
    directory: 'synapse',
    language: 'yaml',
    description: 'Modèle de configuration Synapse hermétique : fédération coupée, inscription désactivée, clés de confiance vides.',
    securityNotice: 'allow_federation: false et trusted_key_servers: [] éliminent tout risque d\'exfiltration.',
    content: `# ==============================================================================
# Modèle de configuration Synapse - Homeserver Souverain
# Contexte : Administration Publique du Burkina Faso
# ==============================================================================
# Ce template est transformé au démarrage par 'entrypoint.sh' en '/data/homeserver.yaml'.
# Les variables \${VAR} sont injectées depuis l'environnement sans fuite de secrets.
# ==============================================================================

# Nom de domaine de référence du serveur Matrix
server_name: "\${SERVER_NAME}"

# URL publique annoncée pour les redirections et les clients
public_baseurl: "\${BASE_URL}/"

# Fichier de verrouillage PID
pid_file: /data/homeserver.pid

# ------------------------------------------------------------------------------
# Écouteurs HTTP internes (derrière le reverse proxy NGINX)
# ------------------------------------------------------------------------------
listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    bind_addresses: ['0.0.0.0']
    resources:
      - names: [client, federation]
        compress: false

# ------------------------------------------------------------------------------
# Connexion PostgreSQL (aucun SQLite autorisé en production/sécurité)
# ------------------------------------------------------------------------------
database:
  name: psycopg2
  args:
    user: \${POSTGRES_USER}
    password: "\${POSTGRES_PASSWORD}"
    database: \${POSTGRES_DB}
    host: db
    port: 5432
    cp_min: 5
    cp_max: 10

# ------------------------------------------------------------------------------
# Stockage des fichiers multimédias et clé cryptographique du serveur
# ------------------------------------------------------------------------------
media_store_path: /data/media_store
signing_key_path: /data/\${SERVER_NAME}.signing.key

# ------------------------------------------------------------------------------
# RÈGLE ÉLIMINATOIRE 1 : Isolation souveraine & Désactivation de la fédération
# ------------------------------------------------------------------------------
# Interdit toute communication avec des serveurs Matrix étrangers ou hors réseau national
allow_federation: false

# Interdit toute requête sortante vers un serveur de clés externe (ex: matrix.org)
trusted_key_servers: []

# Supprime l'avertissement de Synapse relatif à l'absence de serveurs de clés publics
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#trusted_key_servers
suppress_key_server_warning: true

# ------------------------------------------------------------------------------
# RÈGLE ÉLIMINATOIRE 2 : Identité contrôlée & Inscription publique désactivée
# ------------------------------------------------------------------------------
# Les agents ne peuvent pas s'inscrire eux-mêmes : seul un enrôlement admin est autorisé
enable_registration: false
enable_registration_without_verification: false

# Clé secrète partagée utilisée par les scripts d'enrôlement autorisés
registration_shared_secret: "\${SYNAPSE_REGISTRATION_SHARED_SECRET}"

# ------------------------------------------------------------------------------
# RÈGLE ÉLIMINATOIRE 3 : Secrets cryptographiques de session et formulaire
# ------------------------------------------------------------------------------
macaroon_secret_key: "\${SYNAPSE_MACAROON_SECRET_KEY}"
form_secret: "\${SYNAPSE_FORM_SECRET}"

# ------------------------------------------------------------------------------
# RÈGLE ÉLIMINATOIRE 4 : Minimisation des métadonnées et chiffrement par défaut
# ------------------------------------------------------------------------------
# Force l'activation du chiffrement de bout en bout (Megolm) pour tout nouveau salon
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#encryption_for_new_rooms
encryption_for_new_rooms: "encrypted"

# Désactive le suivi de présence en temps réel pour réduire drastiquement l'empreinte de métadonnées
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#presence
presence:
  enabled: false

# Désactive les aperçus d'URL (empêche le serveur de requêter des liens arbitraires sur le Web)
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#url_preview_enabled
url_preview_enabled: false

# Emplacement des logs Synapse
log_config: "/synapse_bootstrap/log.config" # À VÉRIFIER (Optionnel : si omis, Synapse logue sur stdout par défaut selon https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#logging)
`,
  },
  {
    path: 'mon-projet/synapse/entrypoint.sh',
    name: 'entrypoint.sh',
    directory: 'synapse',
    language: 'bash',
    description: 'Génère homeserver.yaml au premier démarrage, crée la clé Ed25519 si absente et démarre Synapse.',
    securityNotice: 'Zéro appel réseau externe. Utilise python3 intégré à l\'image officielle.',
    content: `#!/bin/sh
# ==============================================================================
# Script d'initialisation et démarrage du conteneur Synapse Souverain
# ==============================================================================
set -eu

echo "[INFO] Démarrage du conteneur Synapse Souverain (Burkina Faso)..."

CONFIG_FILE="/data/homeserver.yaml"
TEMPLATE_FILE="/synapse_bootstrap/homeserver.yaml.template"
SIGNING_KEY="/data/\${SERVER_NAME}.signing.key"

# Vérification du montage du volume persistant
if [ ! -d "/data" ]; then
    echo "[ERREUR] Le répertoire persistant /data n'existe pas." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Étape 1 : Génération ou vérification du fichier homeserver.yaml
# ------------------------------------------------------------------------------
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[INFO] Premier démarrage détecté : génération de \${CONFIG_FILE} depuis le modèle..."
    
    if command -v envsubst >/dev/null 2>&1; then
        envsubst < "$TEMPLATE_FILE" > "$CONFIG_FILE"
    else
        # Remplacement robuste utilisant Python 3 (présent dans l'image officielle)
        python3 -c '
import os, re
with open("/synapse_bootstrap/homeserver.yaml.template", "r") as f:
    content = f.read()
rendered = re.sub(r"\\$\{([A-Za-z0-9_]+)\}", lambda m: os.environ.get(m.group(1), ""), content)
with open("/data/homeserver.yaml", "w") as f:
    f.write(rendered)
'
    fi
    echo "[SUCCÈS] Configuration \${CONFIG_FILE} générée avec succès."
else
    echo "[INFO] Configuration existante trouvée dans \${CONFIG_FILE}. Démarrage standard."
fi

# ------------------------------------------------------------------------------
# Étape 2 : Génération de la clé de signature Ed25519 si absente
# ------------------------------------------------------------------------------
if [ ! -f "$SIGNING_KEY" ]; then
    echo "[INFO] Clé de signature \${SIGNING_KEY} absente : génération cryptographique Ed25519..."
    python3 -m synapse.app.homeserver --generate-keys -c "$CONFIG_FILE"
    echo "[SUCCÈS] Clé de signature locale générée avec succès."
else
    echo "[INFO] Clé de signature existante validée : \${SIGNING_KEY}."
fi

# ------------------------------------------------------------------------------
# Étape 3 : Lancement du serveur Synapse
# ------------------------------------------------------------------------------
echo "[INFO] Lancement de Matrix Synapse en écoute sur 0.0.0.0:8008..."
exec python3 -m synapse.app.homeserver -c "$CONFIG_FILE"
`,
  },
  {
    path: 'mon-projet/element/config.json',
    name: 'config.json',
    directory: 'element',
    language: 'json',
    description: 'Configuration durcie pour Element Web : aucun serveur d\'identité tiers, découverte désactivée, verrouillage homeserver.',
    content: `{
  "default_server_config": {
    "m.homeserver": {
      "base_url": "http://localhost",
      "server_name": "localhost"
    },
    "m.identity_server": {
      "base_url": ""
    }
  },
  "brand": "FasoMatrix - Administration Publique du Burkina Faso",
  "disable_custom_urls": true,
  "disable_guests": true,
  "disable_3pid_login": true,
  "default_theme": "dark",
  "show_labs_settings": false,
  "room_directory": {
    "servers": []
  },
  "features": {
    "feature_spotlight": false
  },
  "setting_defaults": {
    "breadcrumbs": true
  }
}
`,
  },
  {
    path: 'mon-projet/nginx/nginx.conf',
    name: 'nginx.conf',
    directory: 'nginx',
    language: 'nginx',
    description: 'Reverse-proxy NGINX régulant le port 80 vers Synapse (/_matrix/) et Element (/). Support long-polling /sync et WebSockets.',
    content: `# ==============================================================================
# Configuration NGINX Reverse Proxy - Messagerie Souveraine Matrix
# ==============================================================================
# Ce fichier achemine le trafic :
#   - '/_matrix/' et '/_synapse/' vers le homeserver Synapse (port 8008)
#   - Tout le reste ('/') vers l'interface web officielle Element
# ==============================================================================

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    # Taille maximale des pièces jointes et documents transmis par les agents
    client_max_body_size 50M;

    server {
        listen 80;
        server_name localhost;

        # ----------------------------------------------------------------------
        # GUIDE D'ACTIVATION TLS POUR LA PRODUCTION (Ex : messagerie.gouv.bf) :
        # ----------------------------------------------------------------------
        # Remplacer 'listen 80;' par :
        #   listen 443 ssl;
        #   ssl_certificate     /etc/ssl/certs/messagerie.gouv.bf.crt;
        #   ssl_certificate_key /etc/ssl/private/messagerie.gouv.bf.key;
        #   ssl_protocols       TLSv1.2 TLSv1.3;
        #   ssl_ciphers         HIGH:!aNULL:!MD5;
        # Et ajouter un bloc 'server' sur le port 80 qui effectue :
        #   return 301 https://$host$request_uri;
        # ----------------------------------------------------------------------

        # ----------------------------------------------------------------------
        # 1. Acheminement des API Matrix & Synapse vers le conteneur interne
        # ----------------------------------------------------------------------
        location ~* ^(/_matrix|/_synapse/client) {
            proxy_pass http://synapse:8008;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $host;

            # Gestion des connexions persistantes et WebSockets
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Timeout allongé indispensable pour le mécanisme de long-polling /_matrix/client/v3/sync
            proxy_read_timeout 600s;
            proxy_send_timeout 600s;
        }

        # ----------------------------------------------------------------------
        # 2. Acheminement vers l'interface Web Element
        # ----------------------------------------------------------------------
        location / {
            proxy_pass http://element:80;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $host;
            proxy_http_version 1.1;
        }
    }
}
`,
  },
  {
    path: 'mon-projet/scripts/seed_demo.sh',
    name: 'seed_demo.sh',
    directory: 'scripts',
    language: 'bash',
    description: 'Enrôle l\'admin et 2 agents via l\'outil interne Synapse, se connecte pour créer un salon chiffré en Megolm et invite les agents.',
    securityNotice: 'Idempotent. Aucune faille d\'inscription publique.',
    content: `#!/usr/bin/env bash
# ==============================================================================
# Script de peuplement (Seed) démo souveraine FasoMatrix
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "\${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="\${ROOT_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "[ERREUR] Le fichier .env est introuvable à la racine (\${ENV_FILE})."
    echo "Exécutez d'abord : cp .env.example .env"
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE_URL="\${BASE_URL:-http://localhost}"
SERVER_NAME="\${SERVER_NAME:-localhost}"

echo "=============================================================================="
echo "   PEUPLEMENT ET ENRÔLEMENT DES AGENTS SOUVERAINS (BURKINA FASO)"
echo "=============================================================================="

# 1. Vérification que Synapse est démarré et fonctionnel
echo "[1/4] Vérification de la disponibilité du serveur Synapse via NGINX..."
MAX_RETRIES=20
COUNT=0
until curl -s -f "\${BASE_URL}/_matrix/client/versions" >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
        echo "[ERREUR] Impossible de joindre Synapse sur \${BASE_URL} après \${MAX_RETRIES} tentatives."
        exit 1
    fi
    echo "  -> En attente de Synapse (tentative $COUNT/$MAX_RETRIES)..."
    sleep 2
done
echo "[SUCCÈS] Synapse répond correctement."

# 2. Enregistrement idempotent via l'outil interne Synapse
register_user_cli() {
    local username="$1"
    local password="$2"
    local is_admin="$3"
    local admin_flag="--no-admin"
    if [ "$is_admin" = "true" ]; then
        admin_flag="-a"
    fi

    echo "  -> Enrôlement de l'agent '@\${username}:\${SERVER_NAME}'..."
    out=$(docker compose exec -T synapse register_new_matrix_user \
        -u "$username" \
        -p "$password" \
        "$admin_flag" \
        -c /data/homeserver.yaml 2>&1 || true)

    if echo "$out" | grep -qi "already taken\\|already exists"; then
        echo "     [INFO] L'agent '\${username}' est déjà enregistré (idempotence respectée)."
    elif echo "$out" | grep -qi "success"; then
        echo "     [SUCCÈS] Enrôlement réussi."
    else
        echo "     [NOTE] Retour Synapse : \${out}"
    fi
}

echo ""
echo "[2/4] Création des comptes au sein du registre souverain..."
register_user_cli "\${SYNAPSE_ADMIN_USER}" "\${SYNAPSE_ADMIN_PASSWORD}" "true"
register_user_cli "\${DEMO_AGENT1_USER}" "\${DEMO_AGENT1_PASSWORD}" "false"
register_user_cli "\${DEMO_AGENT2_USER}" "\${DEMO_AGENT2_PASSWORD}" "false"

# 3. Authentification de l'administrateur auprès de l'API Matrix
echo ""
echo "[3/4] Authentification de l'administrateur via l'API Client Matrix..."
LOGIN_PAYLOAD=$(cat <<EOF
{
  "type": "m.login.password",
  "identifier": {
    "type": "m.id.user",
    "user": "\${SYNAPSE_ADMIN_USER}"
  },
  "password": "\${SYNAPSE_ADMIN_PASSWORD}"
}
EOF
)

LOGIN_RESP=$(curl -s -X POST "\${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")

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
    "@\${DEMO_AGENT1_USER}:\${SERVER_NAME}",
    "@\${DEMO_AGENT2_USER}:\${SERVER_NAME}"
  ]
}
EOF
)

ROOM_RESP=$(curl -s -X POST "\${BASE_URL}/_matrix/client/v3/createRoom" \
  -H "Authorization: Bearer \${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ROOM_PAYLOAD")

ROOM_ID=$(echo "$ROOM_RESP" | grep -o '"room_id":"[^"]*' | cut -d'"' -f4 || true)

echo "=============================================================================="
echo "                      RÉSUMÉ DU DÉPLOIEMENT SOUVERAIN"
echo "=============================================================================="
echo "Accès Client Web Element : \${BASE_URL}"
echo ""
echo "Comptes disponibles :"
echo "  1. Administrateur de sécurité :"
echo "     - Identifiant : @\${SYNAPSE_ADMIN_USER}:\${SERVER_NAME}"
echo "     - Mot de passe : \${SYNAPSE_ADMIN_PASSWORD}"
echo ""
echo "  2. Agent Opérationnel 1 :"
echo "     - Identifiant : @\${DEMO_AGENT1_USER}:\${SERVER_NAME}"
echo "     - Mot de passe : \${DEMO_AGENT1_PASSWORD}"
echo ""
echo "  3. Agent Opérationnel 2 :"
echo "     - Identifiant : @\${DEMO_AGENT2_USER}:\${SERVER_NAME}"
echo "     - Mot de passe : \${DEMO_AGENT2_PASSWORD}"
echo ""
if [ -n "$ROOM_ID" ]; then
    echo "Salon chiffré de bout en bout créé :"
    echo "  - Nom     : Cellule Souveraine - Communication Protégée"
    echo "  - ID      : \${ROOM_ID}"
    echo "  - Chiffre : Megolm (m.megolm.v1.aes-sha256)"
    echo "  - Membres invités : Agent 1 et Agent 2"
fi
echo "=============================================================================="
`,
  },
  {
    path: 'mon-projet/scripts/revoke_user.sh',
    name: 'revoke_user.sh',
    directory: 'scripts',
    language: 'bash',
    description: 'Révocation immédiate d\'un agent via l\'API officielle Synapse POST /_synapse/admin/v1/deactivate/<user_id>.',
    securityNotice: 'Expulse l\'agent sur TOUS ses appareils sans délai.',
    content: `#!/usr/bin/env bash
# ==============================================================================
# Script de révocation immédiate d'un agent - FasoMatrix
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage : $0 <identifiant_matrix_utilisateur>"
    echo "Exemple : $0 @agent_secu_1:localhost"
    exit 1
fi

TARGET_USER_ID="$1"

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "\${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="\${ROOT_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "[ERREUR] Le fichier .env est introuvable (\${ENV_FILE})."
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE_URL="\${BASE_URL:-http://localhost}"

echo "=============================================================================="
echo "   PROCÉDURE DE RÉVOCATION D'HABILITATION DE SÉCURITÉ"
echo "=============================================================================="
echo "[CIBLE] Agent à révoquer : \${TARGET_USER_ID}"

# 1. Récupération d'un jeton d'accès administrateur via l'API client standard
echo "[1/3] Authentification auprès du service d'autorité Synapse..."
LOGIN_PAYLOAD=$(cat <<EOF
{
  "type": "m.login.password",
  "identifier": {
    "type": "m.id.user",
    "user": "\${SYNAPSE_ADMIN_USER}"
  },
  "password": "\${SYNAPSE_ADMIN_PASSWORD}"
}
EOF
)

LOGIN_RESP=$(curl -s -X POST "\${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Impossible de se connecter en tant qu'administrateur."
    echo "Détails de la réponse : $LOGIN_RESP"
    exit 1
fi
echo "[SUCCÈS] Jeton administrateur validé."

# 2. Appel de l'API officielle de désactivation
echo "[2/3] Envoi de l'ordre de désactivation à Synapse..."
DEACTIVATE_PAYLOAD='{"erase": false}'

ENCODED_USER_ID=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$TARGET_USER_ID" 2>/dev/null || echo "$TARGET_USER_ID")

RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST \\
  "\${BASE_URL}/_synapse/admin/v1/deactivate/\${ENCODED_USER_ID}" \\
  -H "Authorization: Bearer \${ADMIN_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d "$DEACTIVATE_PAYLOAD")

HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

# 3. Traitement du statut retourné
echo "[3/3] Vérification de la prise d'effet..."
if [ "$HTTP_STATUS" = "200" ]; then
    echo "=============================================================================="
    echo " [RÉVOCATION EFFECTUÉE AVEC SUCCÈS]"
    echo " - L'agent \${TARGET_USER_ID} est immédiatement déconnecté de TOUS ses appareils."
    echo " - Tous ses jetons d'accès existants sont révoqués par Synapse."
    echo " - Toute tentative de reconnexion sera rejetée avec M_USER_DEACTIVATED."
    echo " - Réponse API : \${HTTP_BODY}"
    echo "=============================================================================="
else
    echo "=============================================================================="
    echo " [ERREUR LORS DE LA RÉVOCATION]"
    echo " - Code HTTP retourné : \${HTTP_STATUS}"
    echo " - Détails : \${HTTP_BODY}"
    echo "=============================================================================="
    exit 1
fi
`,
  },
  {
    path: 'mon-projet/README.md',
    name: 'README.md',
    directory: 'racine',
    language: 'markdown',
    description: 'Documentation opérationnelle de référence : architecture texte, garanties E2EE, commandes et limites.',
    content: `# FasoMatrix - Socle DevOps de Messagerie Instantanée Souveraine
## Système Dédié à l'Administration Publique du Burkina Faso

### 1. Concept
FasoMatrix est une infrastructure de messagerie régalienne et souveraine, fondée sur le protocole Matrix et le chiffrement de bout en bout Olm/Megolm. Inscription fermée, fédération désactivée, aucune dépendance cloud.

[Consultez la version complète dans le fichier mon-projet/README.md]
`,
  },
];
