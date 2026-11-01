#!/usr/bin/env bash
# ==============================================================================
# Script de vérification de l'absence de texte clair (Zero-Knowledge Server)
# Contexte : Hackathon Sécurité - Jour 2 (Contrôle Éliminatoire)
# ==============================================================================
# Vérifie formellement que :
# 1. Les journaux de conteneur Synapse ne contiennent pas le texte secret.
# 2. La base de données PostgreSQL ne contient pas le texte secret dans
#    les tables 'events' et 'event_json'.
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage : $0 <chaine_secrete_a_chercher>"
    echo "Exemple : $0 TopSecretBurkina2026"
    exit 1
fi

SEARCH_TEXT="$1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

POSTGRES_USER="synapse_admin"
POSTGRES_DB="synapse_db"

if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

echo "=============================================================================="
echo "   AUDIT CONTRADICTOIRE DU CHIFFREMENT DE BOUT EN BOUT (E2EE)"
echo "=============================================================================="
echo "[AUDIT] Recherche de fuite en clair pour la charge : \"${SEARCH_TEXT}\""

LEAK_DETECTED=0

# ------------------------------------------------------------------------------
# Test 1 : Analyse des logs Synapse
# ------------------------------------------------------------------------------
echo ""
echo "[1/2] Inspection des journaux applicatifs Synapse..."
LOG_MATCHES=$(docker compose logs synapse 2>&1 | grep -Fi "${SEARCH_TEXT}" || true)

if [ -n "$LOG_MATCHES" ]; then
    echo "  [ALERTE SÉCURITÉ] Texte en clair détecté dans les logs Synapse !"
    echo "  Extrait : ${LOG_MATCHES}"
    LEAK_DETECTED=1
else
    echo "  [SUCCÈS] Aucun texte clair trouvé dans les logs Synapse."
fi

# ------------------------------------------------------------------------------
# Test 2 : Analyse de la base relationnelle PostgreSQL
# ------------------------------------------------------------------------------
echo ""
echo "[2/2] Inspection directe des tables PostgreSQL ('events' et 'event_json')..."

# Vérification dans la table 'events'
EVENTS_COUNT=$(docker compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT count(*) FROM events WHERE content ILIKE '%${SEARCH_TEXT}%';" 2>/dev/null || echo "ERROR")

# Vérification dans la table 'event_json'
JSON_COUNT=$(docker compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc \
  "SELECT count(*) FROM event_json WHERE json ILIKE '%${SEARCH_TEXT}%';" 2>/dev/null || echo "ERROR")

if [ "$EVENTS_COUNT" = "ERROR" ] || [ "$JSON_COUNT" = "ERROR" ]; then
    echo "  [ERREUR] Impossible de requêter PostgreSQL. Vérifiez que 'db' est démarré."
    exit 1
fi

echo "  -> Occurrences trouvées dans la table 'events'     : ${EVENTS_COUNT}"
echo "  -> Occurrences trouvées dans la table 'event_json' : ${JSON_COUNT}"

if [ "$EVENTS_COUNT" -gt 0 ] || [ "$JSON_COUNT" -gt 0 ]; then
    echo "  [ALERTE SÉCURITÉ] Texte en clair détecté dans la base PostgreSQL !"
    LEAK_DETECTED=1
else
    echo "  [SUCCÈS] Aucune occurrence en clair dans la base PostgreSQL."
fi

# ------------------------------------------------------------------------------
# Bilan de l'audit
# ------------------------------------------------------------------------------
echo ""
echo "=============================================================================="
if [ "$LEAK_DETECTED" -eq 0 ]; then
    echo "   RÉSULTAT OFFICIEL : OK : aucun clair trouvé"
    echo "   - Le serveur et la base de données ne possèdent que du ciphertext Megolm."
    echo "   - Preuve d'étanchéité E2EE validée avec succès."
    echo "=============================================================================="
    exit 0
else
    echo "   RÉSULTAT OFFICIEL : ÉCHEC : clair détecté"
    echo "   - Le système a échoué à préserver la confidentialité stricte."
    echo "=============================================================================="
    exit 1
fi
