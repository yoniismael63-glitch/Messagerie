#!/usr/bin/env bash
# ==============================================================================
# Consultation du Registre des Mandats de Suppléance (Jour 3)
# ==============================================================================
# Usage :
#   bash scripts/list_delegations.sh [--all]
# ==============================================================================
set -euo pipefail

SHOW_ALL="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DELEGATIONS_FILE="${ROOT_DIR}/data/delegations.jsonl"

if [ ! -f "$DELEGATIONS_FILE" ]; then
    echo "=============================================================================="
    echo "   REGISTRE DES MANDATS DE SUPPLÉANCE - FASOMATRIX"
    echo "=============================================================================="
    echo "[INFO] Aucune délégation enregistrée (data/delegations.jsonl)."
    exit 0
fi

python3 -c "
import json, sys

records = []
with open('${DELEGATIONS_FILE}', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            try: records.append(json.loads(line))
            except: pass

latest_by_id = {}
for r in records:
    latest_by_id[r['delegation_id']] = r

show_all = ('${SHOW_ALL}' == '--all')

if not show_all:
    filtered = [r for r in latest_by_id.values() if r.get('statut') == 'active']
else:
    filtered = list(latest_by_id.values())

sorted_records = sorted(filtered, key=lambda x: x.get('ts', ''), reverse=True)

print('=' * 125)
print('   REGISTRE DES MANDATS DE SUPPLÉANCE - FASOMATRIX (JOUR 3)')
print('=' * 125)
header = f'| {\"DÉLÉGATION ID\":<16} | {\"DÉLÉGANT\":<18} | {\"DÉLÉGATAIRE\":<18} | {\"SCOPE\":<14} | {\"EXPIRATION\":<19} | {\"STATUT\":<10} | {\"SOUS-SALON\":<20} |'
print(header)
print('|' + '-' * 18 + '|' + '-' * 20 + '|' + '-' * 20 + '|' + '-' * 16 + '|' + '-' * 21 + '|' + '-' * 12 + '|' + '-' * 22 + '|')

for r in sorted_records:
    did = r.get('delegation_id', '')[:16]
    delg = r.get('delegant', '')[:18]
    dela = r.get('delegataire', '')[:18]
    sc = r.get('scope', '')[:14]
    exp = r.get('expires_at', '')[:19]
    st = r.get('statut', '')[:10]
    sub = (r.get('sub_room_id') or 'N/A')[:20]
    print(f'| {did:<16} | {delg:<18} | {dela:<18} | {sc:<14} | {exp:<19} | {st:<10} | {sub:<20} |')

print('=' * 125)
filter_msg = 'Délégations actives (utilisez --all pour voir l\'historique révoqué/expiré)' if not show_all else 'Historique complet'
print(f'Filtre : {filter_msg} | Total : {len(sorted_records)}')
"
