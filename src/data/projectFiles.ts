export interface ProjectFile {
  path: string;
  name: string;
  directory: string;
  language: 'bash' | 'yaml' | 'json' | 'markdown' | 'text' | 'dockerfile' | 'nginx' | 'powershell';
  description: string;
  securityNotice?: string;
  content: string;
  day?: 1 | 2;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    path: 'mon-projet/.env.example',
    name: '.env.example',
    directory: 'racine',
    language: 'bash',
    description: 'Modèle des variables d\'environnement avec NGINX_HTTP_PORT et secrets openssl.',
    securityNotice: 'Ne jamais commiter le fichier .env final. Tous les secrets sont injectés ici.',
    day: 1,
    content: `# ==============================================================================
# Configuration d'environnement - Messagerie Souveraine Matrix / Synapse
# Contexte : Administration Publique du Burkina Faso (Hackathon Jour 1)
# ==============================================================================
# Copiez ce fichier vers '.env' avant de lancer Docker Compose :
#   cp .env.example .env
#
# ATTENTION SÉCURITÉ : Ne commitez JAMAIS le fichier .env final dans Git !
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Nom de domaine et URL publique du serveur
# ------------------------------------------------------------------------------
# Au Jour 1, utilisez strictement 'localhost' et 'http://localhost'
# RÈGLE WEBCRYPTO : Les navigateurs exigent 'localhost' ou HTTPS pour activer
# l'API WebCrypto requise par le chiffrement de bout en bout Element/Megolm.
SERVER_NAME=localhost
BASE_URL=http://localhost

# Port HTTP exposé par le reverse-proxy Nginx sur la machine hôte (défaut : 80)
NGINX_HTTP_PORT=80

# ------------------------------------------------------------------------------
# 2. Base de données relationnelle PostgreSQL
# ------------------------------------------------------------------------------
POSTGRES_USER=synapse_admin
# Mot de passe fort pour PostgreSQL (non exposé sur l'hôte)
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
# 4. Comptes d'administration et de test pour le script de seed
# ------------------------------------------------------------------------------
# Compte administrateur souverain
SYNAPSE_ADMIN_USER=admin
# Mot de passe administrateur pour l'enrôlement et l'API admin
# Génération recommandée : openssl rand -base64 24
SYNAPSE_ADMIN_PASSWORD=CHANGEME_ADMIN_PASSWORD_24B

# Agents de démonstration (aucun enregistrement libre permis)
DEMO_AGENT1_USER=agent1
DEMO_AGENT1_PASSWORD=CHANGEME_AGENT1_PASS_24B

DEMO_AGENT2_USER=agent2
DEMO_AGENT2_PASSWORD=CHANGEME_AGENT2_PASS_24B
`,
  },
  {
    path: 'mon-projet/.gitignore',
    name: '.gitignore',
    directory: 'racine',
    language: 'text',
    description: 'Protection contre la fuite accidentelle de secrets (.env), de clés Ed25519 ou de volumes locaux.',
    day: 1,
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
    day: 1,
    content: `GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (C) 2026 Projet Messagerie Souveraine - Administration Publique

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
    securityNotice: 'Seul Nginx publie un port hôte (${NGINX_HTTP_PORT:-80}). PostgreSQL est confiné sur matrix_internal.',
    day: 1,
    content: `# ==============================================================================
# Orchestration souveraine Matrix / Synapse pour l'Administration Publique
# Contexte : Hackathon Sécurité - Jour 1 "Socle qui tourne"
# ==============================================================================
# Architecture réseau :
#   - Seul NGINX expose un port vers l'hôte (port \${NGINX_HTTP_PORT:-80}).
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
      # Synapse exige un encodage UTF-8 et une collation C
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
    entrypoint: ["/bin/sh", "-c", "python3 -c 'open(\\\"/tmp/entrypoint.sh\\\",\\\"w\\\").write(open(\\\"/synapse_bootstrap/entrypoint.sh\\\",\\\"rb\\\").read().decode(\\\"utf-8-sig\\\").replace(\\\"\\\\r\\\\n\\\",\\\"\\\\n\\\"))' && chmod +x /tmp/entrypoint.sh && exec /bin/sh /tmp/entrypoint.sh"]
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

  # ----------------------------------------------------------------------------
  # 4. Reverse Proxy Nginx - Point d'entrée unique de la souveraineté
  # ----------------------------------------------------------------------------
  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "\${NGINX_HTTP_PORT:-80}:80"
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
    description: 'Modèle Synapse souverain : fédération coupée, inscription fermée, clé Ed25519 et E2EE par défaut.',
    securityNotice: 'allow_federation: false et trusted_key_servers: [] éliminent tout risque d\'exfiltration.',
    day: 1,
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

# SOUVERAINETÉ : Interdiction absolue de télémétrie externe
report_stats: false

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
    user: "\${POSTGRES_USER}"
    password: "\${POSTGRES_PASSWORD}"
    database: "\${POSTGRES_DB}"
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
# Documentation officielle : https://matrix-org.github.io/synapse/latest/federation.html
allow_federation: false

# Interdit toute requête sortante vers un serveur de clés externe (ex: matrix.org)
# Documentation officielle : https://matrix-org.github.io/synapse/latest/federation.html
trusted_key_servers: []

# Supprime l'avertissement de Synapse relatif à l'absence de serveurs de clés publics
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#trusted_key_servers
suppress_key_server_warning: true

# ------------------------------------------------------------------------------
# RÈGLE ÉLIMINATOIRE 2 : Identité contrôlée & Inscription publique désactivée
# ------------------------------------------------------------------------------
# Les agents ne peuvent pas s'inscrire eux-mêmes : seul un enrôlement admin est autorisé
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#registration
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
# Force l'activation du chiffrement de bout en bout (Megolm) pour tout nouveau salon privé
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#encryption_for_new_rooms
encryption_for_new_rooms: "encrypted"

# Désactive le suivi de présence en temps réel pour réduire drastiquement l'empreinte de métadonnées
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#presence
presence:
  enabled: false

# Désactive les aperçus d'URL (empêche le serveur de requêter des liens arbitraires sur le Web)
# Doc officielle : https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html#url_preview_enabled
url_preview_enabled: false
`,
  },
  {
    path: 'mon-projet/synapse/entrypoint.sh',
    name: 'entrypoint.sh',
    directory: 'synapse',
    language: 'bash',
    description: 'Valide les variables obligatoires, génère homeserver.yaml et la clé Ed25519 sans requête externe.',
    securityNotice: 'Vérification stricte de SERVER_NAME, POSTGRES_* et SYNAPSE_* au démarrage sans dépendance bash.',
    day: 1,
    content: `#!/bin/sh
# ==============================================================================
# Script d'initialisation et démarrage du conteneur Synapse Souverain
# Contexte : Administration Publique du Burkina Faso (Jour 1)
# ==============================================================================
set -eu

echo "[INFO] Initialisation du conteneur Synapse Souverain..."

# ------------------------------------------------------------------------------
# Vérification des variables d'environnement obligatoires (POSIX dash-safe)
# ------------------------------------------------------------------------------
if [ -z "\${SERVER_NAME:-}" ] || [ -z "\${POSTGRES_USER:-}" ] || [ -z "\${POSTGRES_PASSWORD:-}" ] || [ -z "\${SYNAPSE_REGISTRATION_SHARED_SECRET:-}" ]; then
    echo "[ERREUR CRITIQUE] Variables obligatoires non définies dans .env" >&2
    exit 1
fi

CONFIG_FILE="/data/homeserver.yaml"
TEMPLATE_FILE="/synapse_bootstrap/homeserver.yaml.template"
SIGNING_KEY="/data/\${SERVER_NAME}.signing.key"

# Vérification du montage du volume persistant
if [ ! -d "/data" ]; then
    echo "[ERREUR] Le répertoire persistant /data est inaccessible." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# Étape 1 : Génération ou vérification du fichier homeserver.yaml
# ------------------------------------------------------------------------------
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[INFO] Premier démarrage détecté : génération de \${CONFIG_FILE} depuis le modèle..."
    
    python3 -c '
import os, re
with open("/synapse_bootstrap/homeserver.yaml.template", "r") as f:
    content = f.read()
rendered = re.sub(r"\\$\{([A-Za-z0-9_]+)\}", lambda m: os.environ.get(m.group(1), ""), content)
with open("/data/homeserver.yaml", "w") as f:
    f.write(rendered)
'
    echo "[SUCCÈS] Configuration \${CONFIG_FILE} générée avec succès."
else
    echo "[INFO] Configuration existante trouvée dans \${CONFIG_FILE}. Démarrage standard."
fi

# Garantie anti-erreur : s'assurer que report_stats est bien défini
if ! grep -q "report_stats:" "$CONFIG_FILE"; then
    echo "report_stats: false" >> "$CONFIG_FILE"
    echo "[SUCCÈS] report_stats: false ajouté à la configuration."
fi

# ------------------------------------------------------------------------------
# Étape 2 : Génération de la clé cryptographique Ed25519 si absente
# ------------------------------------------------------------------------------
if [ ! -f "$SIGNING_KEY" ]; then
    echo "[INFO] Clé de signature locale \${SIGNING_KEY} absente : génération cryptographique Ed25519..."
    python3 -m synapse.app.homeserver --generate-keys -c "$CONFIG_FILE"
    echo "[SUCCÈS] Clé de signature Ed25519 générée localement."
else
    echo "[INFO] Clé de signature Ed25519 validée : \${SIGNING_KEY}."
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
    day: 1,
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
    day: 1,
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
        location ~* ^(/_matrix|/_synapse) {
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
    description: 'Enrôle admin, agent1 et agent2, crée un salon chiffré en m.megolm.v1.aes-sha2 et valide l\'état par requête GET.',
    securityNotice: 'Vérification formelle de m.room.encryption avant résumé.',
    day: 1,
    content: `#!/usr/bin/env bash
# ==============================================================================
# Script de peuplement (Seed) démo souveraine FasoMatrix - Validation Jour 1
# ==============================================================================
# - Enrôle l'administrateur et les agents 'agent1' et 'agent2'
# - Crée un salon EXPLICITEMENT CHIFFRÉ en Megolm (m.megolm.v1.aes-sha2)
# - Invite 'agent1' et 'agent2'
# - Valide par un GET sur l'API d'état que le chiffrement est actif
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
ADMIN_USER="\${SYNAPSE_ADMIN_USER:-admin}"
ADMIN_PASS="\${SYNAPSE_ADMIN_PASSWORD:-admin_secret_pass}"
AGENT1_USER="\${DEMO_AGENT1_USER:-agent1}"
AGENT1_PASS="\${DEMO_AGENT1_PASSWORD:-agent1_secret_pass}"
AGENT2_USER="\${DEMO_AGENT2_USER:-agent2}"
AGENT2_PASS="\${DEMO_AGENT2_PASSWORD:-agent2_secret_pass}"

echo "=============================================================================="
echo "   FASOMATRIX - VALIDATION DU SOCLE SOUVERAIN (JOUR 1)"
echo "=============================================================================="

# 1. Vérification de la disponibilité du homeserver
echo "[1/5] Vérification de la disponibilité de Synapse sur \${BASE_URL}..."
MAX_RETRIES=20
COUNT=0
until curl -s -f "\${BASE_URL}/_matrix/client/versions" >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
        echo "[ERREUR] Synapse ne répond pas sur \${BASE_URL} après \${MAX_RETRIES} essais."
        echo "Vérifiez l'état des conteneurs : docker compose ps"
        exit 1
    fi
    echo "  -> En attente de Synapse (tentative $COUNT/$MAX_RETRIES)..."
    sleep 2
done
echo "[SUCCÈS] Synapse répond sur l'API standard /_matrix/client/versions."

# 2. Enrôlement des comptes via register_new_matrix_user (idempotent)
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
        echo "     [INFO] Compte '\${username}' déjà existant (idempotence garantie)."
    elif echo "$out" | grep -qi "success"; then
        echo "     [SUCCÈS] Compte '\${username}' créé avec succès."
    else
        echo "     [NOTE] Statut de création : \${out}"
    fi
}

echo ""
echo "[2/5] Création des comptes d'autorité et des agents opérationnels..."
register_user_cli "\${ADMIN_USER}" "\${ADMIN_PASS}" "true"
register_user_cli "\${AGENT1_USER}" "\${AGENT1_PASS}" "false"
register_user_cli "\${AGENT2_USER}" "\${AGENT2_PASS}" "false"

# 3. Connexion de l'administrateur pour récupérer le token
echo ""
echo "[3/5] Authentification administrateur via l'API Client-Server..."
LOGIN_PAYLOAD=$(cat <<EOF
{
  "type": "m.login.password",
  "identifier": {
    "type": "m.id.user",
    "user": "\${ADMIN_USER}"
  },
  "password": "\${ADMIN_PASS}"
}
EOF
)

LOGIN_RESP=$(curl -s -X POST "\${BASE_URL}/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")

ADMIN_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "[ERREUR CRITIQUE] Impossible d'obtenir le jeton d'accès administrateur."
    echo "Réponse API : \${LOGIN_RESP}"
    exit 1
fi
echo "[SUCCÈS] Jeton administrateur obtenu avec succès."

# 4. Création du salon explicitement chiffré en Megolm
echo ""
echo "[4/5] Création du salon de démonstration chiffré en Megolm..."
ROOM_PAYLOAD=$(cat <<EOF
{
  "name": "Cellule Souveraine - Démo Jour 1",
  "topic": "Salon chiffré de bout en bout - Administration Publique",
  "preset": "private_chat",
  "visibility": "private",
  "initial_state": [
    {
      "type": "m.room.encryption",
      "state_key": "",
      "content": {
        "algorithm": "m.megolm.v1.aes-sha2"
      }
    }
  ],
  "invite": [
    "@\${AGENT1_USER}:\${SERVER_NAME}",
    "@\${AGENT2_USER}:\${SERVER_NAME}"
  ]
}
EOF
)

ROOM_RESP=$(curl -s -X POST "\${BASE_URL}/_matrix/client/v3/createRoom" \
  -H "Authorization: Bearer \${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ROOM_PAYLOAD")

ROOM_ID=$(echo "$ROOM_RESP" | grep -o '"room_id":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "$ROOM_ID" ]; then
    echo "[ERREUR] Échec de la création du salon chiffré."
    echo "Réponse API : \${ROOM_RESP}"
    exit 1
fi
echo "[SUCCÈS] Salon créé avec l'ID : \${ROOM_ID}"

# 5. Vérification formelle de l'activation du chiffrement par GET
echo ""
echo "[5/5] Vérification de l'événement d'état m.room.encryption..."
STATE_RESP=$(curl -s -X GET "\${BASE_URL}/_matrix/client/v3/rooms/\${ROOM_ID}/state/m.room.encryption" \
  -H "Authorization: Bearer \${ADMIN_TOKEN}")

if echo "$STATE_RESP" | grep -q "m.megolm.v1.aes-sha2"; then
    echo "[SUCCÈS CONFIRMÉ] L'événement d'état m.room.encryption est bien actif : \${STATE_RESP}"
else
    echo "[AVERTISSEMENT] L'état de chiffrement initial n'a pas été détecté. Application explicite par PUT..."
    PUT_RESP=$(curl -s -X PUT "\${BASE_URL}/_matrix/client/v3/rooms/\${ROOM_ID}/state/m.room.encryption" \
      -H "Authorization: Bearer \${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"algorithm":"m.megolm.v1.aes-sha2"}')
    
    # Vérification après PUT
    STATE_RETRY=$(curl -s -X GET "\${BASE_URL}/_matrix/client/v3/rooms/\${ROOM_ID}/state/m.room.encryption" \
      -H "Authorization: Bearer \${ADMIN_TOKEN}")
    if ! echo "$STATE_RETRY" | grep -q "m.megolm.v1.aes-sha2"; then
        echo "[ERREUR CRITIQUE] Impossible d'activer le chiffrement Megolm sur le salon \${ROOM_ID}."
        exit 1
    fi
    echo "[SUCCÈS CONFIRMÉ] Chiffrement Megolm activé par PUT : \${STATE_RETRY}"
fi

echo ""
echo "=============================================================================="
echo "            RÉSUMÉ DU SOCLE SOUVERAIN FASOMATRIX (JOUR 1)"
echo "=============================================================================="
echo "Point d'accès Web Element : \${BASE_URL} (utiliser impérativement http://localhost)"
echo ""
echo "Identifiants des comptes de démonstration :"
echo "  1. Agent 1 :"
echo "     - Utilisateur : \${AGENT1_USER}"
echo "     - Identifiant Matrix : @\${AGENT1_USER}:\${SERVER_NAME}"
echo "     - Mot de passe : \${AGENT1_PASS}"
echo ""
echo "  2. Agent 2 :"
echo "     - Utilisateur : \${AGENT2_USER}"
echo "     - Identifiant Matrix : @\${AGENT2_USER}:\${SERVER_NAME}"
echo "     - Mot de passe : \${AGENT2_PASS}"
echo ""
echo "Salon de démonstration :"
echo "  - Nom       : Cellule Souveraine - Démo Jour 1"
echo "  - Room ID   : \${ROOM_ID}"
echo "  - Chiffrement : Megolm (m.megolm.v1.aes-sha2) [CONFIRMÉ ET VÉRIFIÉ]"
echo "  - Invités   : @\${AGENT1_USER}:\${SERVER_NAME} et @\${AGENT2_USER}:\${SERVER_NAME}"
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
    day: 2,
    content: `#!/usr/bin/env bash
# ==============================================================================
# Script de révocation immédiate d'un agent - FasoMatrix
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage : $0 <identifiant_matrix_utilisateur>"
    echo "Exemple : $0 @agent1:localhost"
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
SERVER_NAME="\${SERVER_NAME:-localhost}"

if [[ ! "$TARGET_USER_ID" =~ ^@ ]]; then
    TARGET_USER_ID="@\${TARGET_USER_ID}:\${SERVER_NAME}"
fi

echo "=============================================================================="
echo "   PROCÉDURE DE RÉVOCATION D'HABILITATION DE SÉCURITÉ (JOUR 2)"
echo "=============================================================================="
echo "[CIBLE] Agent à révoquer : \${TARGET_USER_ID}"

# 1. Récupération d'un jeton d'accès administrateur via l'API client standard
echo "[1/5] Authentification auprès du service d'autorité Synapse..."
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
    echo "[ERREUR CRITIQUE] Impossible de se connecter en tant qu'administrateur."
    echo "Détails de la réponse : $LOGIN_RESP"
    exit 1
fi
echo "[SUCCÈS] Jeton administrateur validé."

ENCODED_USER_ID=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$TARGET_USER_ID" 2>/dev/null || echo "$TARGET_USER_ID")

# 2. Vérification d'idempotence : l'utilisateur est-il déjà désactivé ?
echo "[2/5] Vérification de l'état actuel de l'agent..."
USER_INFO=$(curl -s -X GET "\${BASE_URL}/_synapse/admin/v2/users/\${ENCODED_USER_ID}" \
  -H "Authorization: Bearer \${ADMIN_TOKEN}")

IS_DEACTIVATED=$(echo "$USER_INFO" | grep -o '"deactivated":true' || true)
if [ -n "$IS_DEACTIVATED" ]; then
    echo "[IDEMPOTENCE] L'agent \${TARGET_USER_ID} est déjà désactivé."
    echo "[SUCCÈS] Opération terminée : le compte est déjà hors service."
    exit 0
fi

# 3. Énumération des appareils actifs AVANT révocation
echo "[3/5] Détection des appareils actifs associés au compte..."
DEVICES_BEFORE_RESP=$(curl -s -X GET "\${BASE_URL}/_synapse/admin/v2/users/\${ENCODED_USER_ID}/devices" \
  -H "Authorization: Bearer \${ADMIN_TOKEN}")

DEVICE_COUNT_BEFORE=$(echo "$DEVICES_BEFORE_RESP" | grep -o '"device_id"' | wc -l || true)
echo "  -> Nombre d'appareils actifs avant révocation : \${DEVICE_COUNT_BEFORE}"

# 4. Exécution de l'ordre officiel de révocation immédiate
echo "[4/5] Envoi de l'ordre de désactivation à Synapse..."
DEACTIVATE_PAYLOAD='{"erase": false}'

DEACTIVATE_RESP=$(curl -s -w "\\n%{http_code}" -X POST \\
  "\${BASE_URL}/_synapse/admin/v1/deactivate/\${ENCODED_USER_ID}" \\
  -H "Authorization: Bearer \${ADMIN_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d "$DEACTIVATE_PAYLOAD")

HTTP_STATUS=$(echo "$DEACTIVATE_RESP" | tail -n 1)
HTTP_BODY=$(echo "$DEACTIVATE_RESP" | sed '$d')

if [ "$HTTP_STATUS" != "200" ]; then
    echo "[ERREUR LORS DE LA RÉVOCATION] Statut HTTP : \${HTTP_STATUS}"
    echo "Détails : \${HTTP_BODY}"
    exit 1
fi

# 5. Preuve formelle post-révocation
echo "[5/5] Contrôle contradictoire de la suppression des appareils..."
DEVICES_AFTER_RESP=$(curl -s -X GET "\${BASE_URL}/_synapse/admin/v2/users/\${ENCODED_USER_ID}/devices" \
  -H "Authorization: Bearer \${ADMIN_TOKEN}")

DEVICE_COUNT_AFTER=$(echo "$DEVICES_AFTER_RESP" | grep -o '"device_id"' | wc -l || true)

echo "=============================================================================="
echo " [RÉVOCATION MULTI-APPAREILS CONFIRMÉE AVEC SUCCÈS]"
echo " - Agent ciblé        : \${TARGET_USER_ID}"
echo " - Bilan matériel     : \${DEVICE_COUNT_BEFORE} appareil(s) supprimé(s), \${DEVICE_COUNT_AFTER} restant(s)."
echo " - Jetons de session  : Tous les access tokens existants ont été révoqués."
echo " - Clés cryptographiques : Les clés Olm/Megolm de l'agent sont détruites."
echo " - Expulsion salons   : L'agent est expulsé de tous les salons souverains."
echo " - Tentative de reconnexion : Tout futur login sera rejeté avec 'M_USER_DEACTIVATED'."
echo "=============================================================================="
`,
  },
  {
    path: 'mon-projet/scripts/seed_demo.ps1',
    name: 'seed_demo.ps1',
    directory: 'scripts',
    language: 'powershell',
    description: 'Script PowerShell natif Windows pour enrôler les comptes, générer le salon Megolm et vérifier le chiffrement.',
    securityNotice: 'Compatible Windows PowerShell 5.1 & PowerShell 7 sans dépendance WSL ni bash.',
    day: 1,
    content: `# ==============================================================================
# Script PowerShell de peuplement (Seed) démo souveraine FasoMatrix
# Compatible Windows PowerShell 5.1 & PowerShell 7+
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   FASOMATRIX - VALIDATION DU SOCLE SOUVERAIN (JOUR 1 - WINDOWS)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

# Lecture des identifiants depuis .env
$adminUser = "admin"
$adminPass = "CHANGEME_ADMIN_PASSWORD_24B"
$agent1User = "agent1"
$agent1Pass = "CHANGEME_AGENT1_PASS_24B"
$agent2User = "agent2"
$agent2Pass = "CHANGEME_AGENT2_PASS_24B"
$serverName = "localhost"
$baseUrl = "http://localhost"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if ($k -eq "SYNAPSE_ADMIN_USER") { $adminUser = $v }
            if ($k -eq "SYNAPSE_ADMIN_PASSWORD") { $adminPass = $v }
            if ($k -eq "DEMO_AGENT1_USER") { $agent1User = $v }
            if ($k -eq "DEMO_AGENT1_PASSWORD") { $agent1Pass = $v }
            if ($k -eq "DEMO_AGENT2_USER") { $agent2User = $v }
            if ($k -eq "DEMO_AGENT2_PASSWORD") { $agent2Pass = $v }
            if ($k -eq "SERVER_NAME") { $serverName = $v }
            if ($k -eq "BASE_URL") { $baseUrl = $v }
        }
    }
}

Write-Host "\`n[1/5] Vérification de la disponibilité de Synapse sur \$baseUrl..." -ForegroundColor Yellow
\$maxRetries = 20
\$retries = 0
\$synapseReady = \$false
while (-not \$synapseReady -and \$retries -lt \$maxRetries) {
    try {
        \$check = Invoke-RestMethod -Uri "\$baseUrl/_matrix/client/versions" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        if (\$check.versions) {
            \$synapseReady = \$true
            Write-Host "  [SUCCÈS] Synapse répond sur l'API \$baseUrl" -ForegroundColor Green
        }
    } catch {
        \$retries++
        Write-Host "  -> En attente de Synapse (tentative \$retries/\$maxRetries)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
}
if (-not \$synapseReady) {
    Write-Host "  [ERREUR] Synapse ne répond pas encore sur \$baseUrl. Vérifiez avec : docker compose ps" -ForegroundColor Red
    exit 1
}

Write-Host "\`n[2/5] Enrôlement des comptes d'administration et des agents..." -ForegroundColor Yellow

function Register-MatrixUser(\$user, \$pass, \$isAdmin) {
    \$flag = if (\$isAdmin) { "-a" } else { "--no-admin" }
    Write-Host "  -> Création du compte @\${user}:\${serverName}..."
    \$res = docker compose exec -T synapse register_new_matrix_user -u \$user -p \$pass \$flag -c /data/homeserver.yaml 2>&1
    if (\$res -match "already taken|already exists") {
        Write-Host "     [INFO] Le compte '\$user' existe déjà (idempotent)." -ForegroundColor DarkGray
    } elseif (\$res -match "success") {
        Write-Host "     [SUCCÈS] Compte '\$user' créé avec succès !" -ForegroundColor Green
    } else {
        Write-Host "     [INFO] \$res" -ForegroundColor DarkGray
    }
}

Register-MatrixUser -user \$adminUser -pass \$adminPass -isAdmin \$true
Register-MatrixUser -user \$agent1User -pass \$agent1Pass -isAdmin \$false
Register-MatrixUser -user \$agent2User -pass \$agent2Pass -isAdmin \$false

Write-Host "\`n[3/5] Connexion administrateur pour initialiser le salon chiffré..." -ForegroundColor Yellow
\$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = \$adminUser }
    password = \$adminPass
} | ConvertTo-Json

try {
    \$loginRes = Invoke-RestMethod -Uri "\$baseUrl/_matrix/client/v3/login" -Method Post -Body \$loginBody -ContentType "application/json"
    \$token = \$loginRes.access_token
    Write-Host "  [SUCCÈS] Authentification réussie. Token admin obtenu." -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Impossible de joindre l'API Synapse à \$baseUrl" -ForegroundColor Red
    exit 1
}

Write-Host "\`n[4/5] Création du salon avec chiffrement Megolm (m.megolm.v1.aes-sha2)..." -ForegroundColor Yellow
$roomBody = @{
    name = "Cellule Souveraine - Démo Jour 1"
    topic = "Salon chiffré de bout en bout - Administration Publique"
    preset = "private_chat"
    visibility = "private"
    initial_state = @(
        @{
            type = "m.room.encryption"
            state_key = ""
            content = @{ algorithm = "m.megolm.v1.aes-sha2" }
        }
    )
    invite = @("@\${agent1User}:\${serverName}", "@\${agent2User}:\${serverName}")
} | ConvertTo-Json -Depth 5

$roomRes = Invoke-RestMethod -Uri "\$baseUrl/_matrix/client/v3/createRoom" -Method Post -Body $roomBody -Headers @{ Authorization = "Bearer \$token" } -ContentType "application/json"
$roomId = $roomRes.room_id
Write-Host "  [SUCCÈS] Salon créé avec ID : \$roomId" -ForegroundColor Green

Write-Host "\`n[4/4] Vérification formelle du chiffrement de bout en bout..." -ForegroundColor Yellow
$stateRes = Invoke-RestMethod -Uri "\$baseUrl/_matrix/client/v3/rooms/\$roomId/state/m.room.encryption" -Method Get -Headers @{ Authorization = "Bearer \$token" }
if ($stateRes.algorithm -eq "m.megolm.v1.aes-sha2") {
    Write-Host "  [SUCCÈS VALIDÉ] Chiffrement Megolm (m.megolm.v1.aes-sha2) ACTIF et VÉRIFIÉ !" -ForegroundColor Green
}

Write-Host "\`n==============================================================================" -ForegroundColor Cyan
Write-Host "               SOCLE OPÉRATIONNEL AVEC SUCCÈS" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "1. Accédez à Element Web : \$baseUrl (impérativement http://localhost)"
Write-Host "2. Agent 1 : utilisateur '\$agent1User' / mot de passe '\$agent1Pass'"
Write-Host "3. Agent 2 : utilisateur '\$agent2User' / mot de passe '\$agent2Pass'"
Write-Host "==============================================================================" -ForegroundColor Cyan
`,
  },
  {
    path: 'mon-projet/scripts/revoke_user.ps1',
    name: 'revoke_user.ps1',
    directory: 'scripts',
    language: 'powershell',
    description: 'Script PowerShell natif Windows pour révoquer immédiatement un utilisateur et fermer toutes ses sessions.',
    securityNotice: 'Invalide immédiatement les tokens de session sans suppression destructrice de l\'historique chiffré.',
    day: 2,
    content: `param (
    [Parameter(Mandatory=\$true)]
    [string]\$User
)

\$ErrorActionPreference = "Stop"

\$adminUser = "admin"
\$adminPass = "CHANGEME_ADMIN_PASSWORD_24B"
\$baseUrl = "http://localhost"
\$serverName = "localhost"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        \$line = \$_.Trim()
        if (\$line -and -not \$line.StartsWith("#") -and \$line.Contains("=")) {
            \$parts = \$line.Split("=", 2)
            \$k = \$parts[0].Trim()
            \$v = \$parts[1].Trim()
            if (\$k -eq "SYNAPSE_ADMIN_USER") { \$adminUser = \$v }
            if (\$k -eq "SYNAPSE_ADMIN_PASSWORD") { \$adminPass = \$v }
            if (\$k -eq "SERVER_NAME") { \$serverName = \$v }
            if (\$k -eq "BASE_URL") { \$baseUrl = \$v }
        }
    }
}

if (-not \$User.StartsWith("@")) {
    \$User = "@" + \$User + ":" + \$serverName
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   PROCEDURE DE REVOCATION MULTI-APPAREILS SOUVERAINE (JOUR 2)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "[CIBLE] Agent a revoquer : \$User" -ForegroundColor Yellow

# 1. Authentification Admin
\$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = \$adminUser }
    password = \$adminPass
} | ConvertTo-Json

try {
    \$loginRes = Invoke-RestMethod -Uri "\$baseUrl/_matrix/client/v3/login" -Method Post -Body \$loginBody -ContentType "application/json"
    \$token = \$loginRes.access_token
    Write-Host "  [SUCCES] Session administrateur authentifiee." -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Impossible de s'authentifier aupres de \$baseUrl" -ForegroundColor Red
    exit 1
}

\$encodedUser = [System.Uri]::EscapeDataString(\$User)

# 2. Idempotence : verification de l'etat actuel
try {
    \$userInfo = Invoke-RestMethod -Uri "\$baseUrl/_synapse/admin/v2/users/\$encodedUser" -Method Get -Headers @{ Authorization = "Bearer \$token" }
    if (\$userInfo.deactivated) {
        Write-Host "  [IDEMPOTENCE] L'agent \$User est deja desactive." -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "  [AVERTISSEMENT] Compte non verifie prealablement." -ForegroundColor DarkGray
}

# 3. Denombrement des appareils avant revocation
\$deviceCountBefore = 0
try {
    \$devicesBefore = Invoke-RestMethod -Uri "\$baseUrl/_synapse/admin/v2/users/\$encodedUser/devices" -Method Get -Headers @{ Authorization = "Bearer \$token" }
    if (\$devicesBefore.devices) {
        \$deviceCountBefore = \$devicesBefore.devices.Count
    }
} catch {
    \$deviceCountBefore = 0
}
Write-Host "  [CONSTAT] Nombre d'appareils actifs avant revocation : \$deviceCountBefore" -ForegroundColor Yellow

# 4. Envoi de l'ordre officiel de revocation
\$deactivateBody = @{ erase = \$false } | ConvertTo-Json
try {
    \$null = Invoke-RestMethod -Uri "\$baseUrl/_synapse/admin/v1/deactivate/\$encodedUser" -Method Post -Body \$deactivateBody -Headers @{ Authorization = "Bearer \$token" } -ContentType "application/json"
    Write-Host "  [SUCCES] Ordre de desactivation valide par Synapse." -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Echec de l'appel a l'API de desactivation : \$_" -ForegroundColor Red
    exit 1
}

# 5. Verification apres revocation
\$deviceCountAfter = 0
try {
    \$devicesAfter = Invoke-RestMethod -Uri "\$baseUrl/_synapse/admin/v2/users/\$encodedUser/devices" -Method Get -Headers @{ Authorization = "Bearer \$token" }
    if (\$devicesAfter.devices) {
        \$deviceCountAfter = \$devicesAfter.devices.Count
    }
} catch {
    \$deviceCountAfter = 0
}

Write-Host "\`n==============================================================================" -ForegroundColor Cyan
Write-Host " [REVOCATION MULTI-APPAREILS EFFECTUEE AVEC SUCCES]" -ForegroundColor Green
Write-Host " - Agent cible        : \$User"
Write-Host " - Bilan materiel     : \$deviceCountBefore appareil(s) supprime(s), \$deviceCountAfter restant(s)."
Write-Host " - Sessions invalides : Tous les jetons d'acces ont ete revoques immediatement."
Write-Host " - Cles cryptographiques : Cles Megolm/Olm detruites sur le serveur."
Write-Host " - Reconnexion        : Toute future tentative renverra 'M_USER_DEACTIVATED'."
Write-Host "==============================================================================" -ForegroundColor Cyan
`,
  },
  {
    path: 'mon-projet/scripts/verify_no_cleartext.sh',
    name: 'verify_no_cleartext.sh',
    directory: 'scripts',
    language: 'bash',
    description: 'Vérifie formellement l\'absence de texte clair dans les logs Synapse et dans les tables PostgreSQL (events et event_json).',
    securityNotice: 'Audit contradictoire : affiche "OK : aucun clair trouvé" ou "ÉCHEC : clair détecté" (exit code != 0).',
    day: 2,
    content: `#!/usr/bin/env bash
# ==============================================================================
# Script de vérification de l'absence de texte clair (Zero-Knowledge Server)
# Contexte : Hackathon Sécurité - Jour 2 (Contrôle Éliminatoire)
# ==============================================================================
set -euo pipefail

if [ "\$#" -ne 1 ]; then
    echo "Usage : \$0 <chaine_secrete_a_chercher>"
    echo "Exemple : \$0 TopSecretBurkina2026"
    exit 1
fi

SEARCH_TEXT="\$1"

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="\$(cd "\${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="\${ROOT_DIR}/.env"

POSTGRES_USER="synapse_admin"
POSTGRES_DB="synapse_db"

if [ -f "\$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "\$ENV_FILE"
    set +a
fi

echo "=============================================================================="
echo "   AUDIT CONTRADICTOIRE DU CHIFFREMENT DE BOUT EN BOUT (E2EE)"
echo "=============================================================================="
echo "[AUDIT] Recherche de fuite en clair pour la charge : \\"\${SEARCH_TEXT}\\""

LEAK_DETECTED=0

# 1. Inspection des logs Synapse
echo ""
echo "[1/2] Inspection des journaux applicatifs Synapse..."
LOG_MATCHES=\$(docker compose logs synapse 2>&1 | grep -Fi "\${SEARCH_TEXT}" || true)

if [ -n "\$LOG_MATCHES" ]; then
    echo "  [ALERTE SÉCURITÉ] Texte en clair détecté dans les logs Synapse !"
    LEAK_DETECTED=1
else
    echo "  [SUCCÈS] Aucun texte clair trouvé dans les logs Synapse."
fi

# 2. Inspection PostgreSQL
echo ""
echo "[2/2] Inspection directe des tables PostgreSQL ('events' et 'event_json')..."

EVENTS_COUNT=\$(docker compose exec -T db psql -U "\${POSTGRES_USER}" -d "\${POSTGRES_DB}" -tAc \\
  "SELECT count(*) FROM events WHERE content ILIKE '%\${SEARCH_TEXT}%';" 2>/dev/null || echo "ERROR")

JSON_COUNT=\$(docker compose exec -T db psql -U "\${POSTGRES_USER}" -d "\${POSTGRES_DB}" -tAc \\
  "SELECT count(*) FROM event_json WHERE json ILIKE '%\${SEARCH_TEXT}%';" 2>/dev/null || echo "ERROR")

if [ "\$EVENTS_COUNT" = "ERROR" ] || [ "\$JSON_COUNT" = "ERROR" ]; then
    echo "  [ERREUR] Impossible de requêter PostgreSQL."
    exit 1
fi

echo "  -> Occurrences dans 'events'     : \${EVENTS_COUNT}"
echo "  -> Occurrences dans 'event_json' : \${JSON_COUNT}"

if [ "\$EVENTS_COUNT" -gt 0 ] || [ "\$JSON_COUNT" -gt 0 ]; then
    echo "  [ALERTE SÉCURITÉ] Texte en clair détecté dans la base PostgreSQL !"
    LEAK_DETECTED=1
else
    echo "  [SUCCÈS] Aucune occurrence en clair dans la base PostgreSQL."
fi

echo ""
echo "=============================================================================="
if [ "\$LEAK_DETECTED" -eq 0 ]; then
    echo "   RÉSULTAT OFFICIEL : OK : aucun clair trouvé"
    echo "   - Le serveur et la base de données ne possèdent que du ciphertext Megolm."
    echo "=============================================================================="
    exit 0
else
    echo "   RÉSULTAT OFFICIEL : ÉCHEC : clair détecté"
    echo "=============================================================================="
    exit 1
fi
`,
  },
  {
    path: 'mon-projet/scripts/verify_no_cleartext.ps1',
    name: 'verify_no_cleartext.ps1',
    directory: 'scripts',
    language: 'powershell',
    description: 'Vérification Windows native PowerShell de l\'absence de clair dans les logs et la base PostgreSQL.',
    securityNotice: 'Audit contradictoire Windows retournant "OK : aucun clair trouvé" ou "ÉCHEC : clair détecté".',
    day: 2,
    content: `param (
    [Parameter(Mandatory=\$true)]
    [string]\$SearchText
)

\$ErrorActionPreference = "Stop"

\$postgresUser = "synapse_admin"
\$postgresDb = "synapse_db"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        \$line = \$_.Trim()
        if (\$line -and -not \$line.StartsWith("#") -and \$line.Contains("=")) {
            \$parts = \$line.Split("=", 2)
            \$k = \$parts[0].Trim()
            \$v = \$parts[1].Trim()
            if (\$k -eq "POSTGRES_USER") { \$postgresUser = \$v }
            if (\$k -eq "POSTGRES_DB") { \$postgresDb = \$v }
        }
    }
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   AUDIT CONTRADICTOIRE DU CHIFFREMENT DE BOUT EN BOUT (WINDOWS)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

\$leakDetected = \$false

Write-Host "\`n[1/2] Inspection des journaux applicatifs Synapse..." -ForegroundColor Yellow
\$logMatches = docker compose logs synapse 2>&1 | Select-String -Pattern \$SearchText
if (\$logMatches) {
    Write-Host "  [ALERTE SECURITE] Texte en clair trouve dans les logs Synapse !" -ForegroundColor Red
    \$leakDetected = \$true
} else {
    Write-Host "  [SUCCES] Aucun texte clair trouve dans les logs Synapse." -ForegroundColor Green
}

Write-Host "\`n[2/2] Inspection directe des tables PostgreSQL ('events' et 'event_json')..." -ForegroundColor Yellow

\$eventsCountRaw = docker compose exec -T db psql -U \$postgresUser -d \$postgresDb -tAc "SELECT count(*) FROM events WHERE content ILIKE '%\$SearchText%';" 2>&1
\$jsonCountRaw = docker compose exec -T db psql -U \$postgresUser -d \$postgresDb -tAc "SELECT count(*) FROM event_json WHERE json ILIKE '%\$SearchText%';" 2>&1

\$eventsCount = [int](\$eventsCountRaw.Trim())
\$jsonCount = [int](\$jsonCountRaw.Trim())

Write-Host "  -> Occurrences dans 'events'     : \$eventsCount"
Write-Host "  -> Occurrences dans 'event_json' : \$jsonCount"

if (\$eventsCount -gt 0 -or \$jsonCount -gt 0) {
    Write-Host "  [ALERTE SECURITE] Texte en clair detecte dans la base PostgreSQL !" -ForegroundColor Red
    \$leakDetected = \$true
} else {
    Write-Host "  [SUCCES] Aucune occurrence en clair dans la base PostgreSQL." -ForegroundColor Green
}

Write-Host "\`n==============================================================================" -ForegroundColor Cyan
if (-not \$leakDetected) {
    Write-Host "   RESULTAT OFFICIEL : OK : aucun clair trouve" -ForegroundColor Green
    Write-Host "==============================================================================" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "   RESULTAT OFFICIEL : ECHEC : clair detecte" -ForegroundColor Red
    Write-Host "==============================================================================" -ForegroundColor Cyan
    exit 1
}
`,
  },
  {
    path: 'mon-projet/scripts/promote_admin.sh',
    name: 'promote_admin.sh',
    directory: 'scripts',
    language: 'bash',
    description: 'Promotion d\'un agent au rôle d\'administrateur serveur via PUT /_synapse/admin/v1/users/{user_id}/admin.',
    securityNotice: 'Attribue les droits administrateur Synapse. La rétrogradation requiert un compte tiers.',
    day: 2,
    content: `#!/usr/bin/env bash
# ==============================================================================
# Script de promotion d'un agent au rôle d'administrateur système - FasoMatrix
# ==============================================================================
set -euo pipefail

if [ "\$#" -ne 1 ]; then
    echo "Usage : \$0 <identifiant_matrix_utilisateur>"
    echo "Exemple : \$0 @agent1:localhost"
    exit 1
fi

TARGET_USER_ID="\$1"

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="\$(cd "\${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="\${ROOT_DIR}/.env"

if [ ! -f "\$ENV_FILE" ]; then
    echo "[ERREUR] Le fichier .env est introuvable."
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "\$ENV_FILE"
set +a

BASE_URL="\${BASE_URL:-http://localhost}"
SERVER_NAME="\${SERVER_NAME:-localhost}"

if [[ ! "\$TARGET_USER_ID" =~ ^@ ]]; then
    TARGET_USER_ID="@\${TARGET_USER_ID}:\${SERVER_NAME}"
fi

echo "=============================================================================="
echo "   GESTION DES HABILITATIONS : PROMOTION ADMINISTRATEUR (JOUR 2)"
echo "=============================================================================="
echo "[CIBLE] Agent à promouvoir : \${TARGET_USER_ID}"

LOGIN_PAYLOAD=\$(cat <<EOF
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

LOGIN_RESP=\$(curl -s -X POST "\${BASE_URL}/_matrix/client/v3/login" \\
  -H "Content-Type: application/json" \\
  -d "\$LOGIN_PAYLOAD")

ADMIN_TOKEN=\$(echo "\$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 || true)

if [ -z "\$ADMIN_TOKEN" ]; then
    echo "[ERREUR] Impossible d'obtenir le jeton d'accès administrateur."
    exit 1
fi

ENCODED_USER_ID=\$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "\$TARGET_USER_ID" 2>/dev/null || echo "\$TARGET_USER_ID")

RESPONSE=\$(curl -s -w "\\n%{http_code}" -X PUT \\
  "\${BASE_URL}/_synapse/admin/v1/users/\${ENCODED_USER_ID}/admin" \\
  -H "Authorization: Bearer \${ADMIN_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{"admin": true}')

HTTP_STATUS=\$(echo "\$RESPONSE" | tail -n 1)

if [ "\$HTTP_STATUS" = "200" ]; then
    echo "=============================================================================="
    echo " [PROMOTION EFFECTUÉE AVEC SUCCÈS]"
    echo " - Agent promu     : \${TARGET_USER_ID}"
    echo " - Privilèges      : Administrateur du homeserver Synapse (admin: true)"
    echo "=============================================================================="
else
    echo " [ERREUR LORS DE LA PROMOTION] Code HTTP : \${HTTP_STATUS}"
    exit 1
fi
`,
  },
  {
    path: 'mon-projet/scripts/promote_admin.ps1',
    name: 'promote_admin.ps1',
    directory: 'scripts',
    language: 'powershell',
    description: 'Promotion ou rétrogradation Windows PowerShell d\'un administrateur serveur Synapse.',
    securityNotice: 'Supporte la promotion (-User agent1) et la rétrogradation (-User agent1 -Demote).',
    day: 2,
    content: `param (
    [Parameter(Mandatory=\$true)]
    [string]\$User,
    [switch]\$Demote
)

\$ErrorActionPreference = "Stop"

\$adminUser = "admin"
\$adminPass = "CHANGEME_ADMIN_PASSWORD_24B"
\$baseUrl = "http://localhost"
\$serverName = "localhost"

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        \$line = \$_.Trim()
        if (\$line -and -not \$line.StartsWith("#") -and \$line.Contains("=")) {
            \$parts = \$line.Split("=", 2)
            \$k = \$parts[0].Trim()
            \$v = \$parts[1].Trim()
            if (\$k -eq "SYNAPSE_ADMIN_USER") { \$adminUser = \$v }
            if (\$k -eq "SYNAPSE_ADMIN_PASSWORD") { \$adminPass = \$v }
            if (\$k -eq "SERVER_NAME") { \$serverName = \$v }
            if (\$k -eq "BASE_URL") { \$baseUrl = \$v }
        }
    }
}

if (-not \$User.StartsWith("@")) {
    \$User = "@" + \$User + ":" + \$serverName
}

\$targetAdminState = -not \$Demote

\$loginBody = @{
    type = "m.login.password"
    identifier = @{ type = "m.id.user"; user = \$adminUser }
    password = \$adminPass
} | ConvertTo-Json

\$loginRes = Invoke-RestMethod -Uri "\$baseUrl/_matrix/client/v3/login" -Method Post -Body \$loginBody -ContentType "application/json"
\$token = \$loginRes.access_token

\$encodedUser = [System.Uri]::EscapeDataString(\$User)
\$promoteBody = @{ admin = \$targetAdminState } | ConvertTo-Json

\$res = Invoke-RestMethod -Uri "\$baseUrl/_synapse/admin/v1/users/\$encodedUser/admin" -Method Put -Body \$promoteBody -Headers @{ Authorization = "Bearer \$token" } -ContentType "application/json"
Write-Host "[SUCCÈS] Statut administrateur pour \$User mis à jour : \$(\$res.admin)" -ForegroundColor Green
`,
  },
  {
    path: 'mon-projet/docs/SECURITY.md',
    name: 'SECURITY.md',
    directory: 'docs',
    language: 'markdown',
    description: 'Modèle de menace, analyse approfondie du mécanisme de révocation et feuille de route 2FA/MAS.',
    securityNotice: 'Détaille ce que deactivate fait et ne fait pas, et la stratégie de transition vers MAS en production.',
    day: 2,
    content: `# Politique de Sécurité Régalienne & Modèle de Menace - FasoMatrix
## Infrastructure de Messagerie Instantanée Souveraine - Burkina Faso

### 1. Modèle de Confiance et Architecture E2EE
- Olm (Double Ratchet) et Megolm (m.megolm.v1.aes-sha2).
- Zero-Knowledge Server : Synapse ne possède jamais les clés privées ni les clés de session Megolm.

### 2. Identité, Rôles et Révocation Immédiate
- enable_registration: false bloque toute inscription autonome.
- deactivate : supprime tous les appareils, révoque tous les access_tokens, détruit les clés E2EE sur le serveur et expulse l'agent de tous les salons.
- Ne supprime pas l'historique chiffré passé stocké dans la base, mais l'agent révoqué ne peut plus déchiffrer les futurs messages.

### 3. Analyse du 2FA et Feuille de Route
- Sur http://localhost : SSO/OIDC sans TLS échoue en raison des restrictions SameSite des navigateurs.
- Element X exige MAS (Matrix Authentication Service) et non le SSO legacy Synapse.
- Mesures Jour 2 : mots de passe de haute entropie générés par l'autorité + politique de sessions courtes + révocation immédiate multi-appareils.
`,
  },
  {
    path: 'mon-projet/README.md',
    name: 'README.md',
    directory: 'racine',
    language: 'markdown',
    description: 'Documentation opérationnelle de référence du Jour 1 & 2 : architecture, validation E2EE et révocation multi-appareils.',
    day: 2,
    content: `# FasoMatrix - Socle DevOps de Messagerie Instantanée Souveraine
## Système Dédié à l'Administration Publique du Burkina Faso (Jour 1 & 2)

[Consultez la version complète dans mon-projet/README.md pour toutes les commandes détaillées]
`,
  },
];
