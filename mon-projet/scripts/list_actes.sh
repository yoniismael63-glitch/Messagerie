#!/usr/bin/env bash
# ==============================================================================
# Consultation de la Main Courante Régaliennes des Actes (Jour 3)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MAIN_COURANTE="${ROOT_DIR}/data/main_courante.jsonl"

if [ ! -f "$MAIN_COURANTE" ]; then
    echo "=============================================================================="
    echo "   MAIN COURANTE DES ACTES DE SERVICE - FASOMATRIX"
    echo "=============================================================================="
    echo "[INFO] Aucun acte consigné dans la main courante (data/main_courante.jsonl)."
    exit 0
fi

python3 -c "
import json, sys

records = []
with open('${MAIN_COURANTE}', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            try: records.append(json.loads(line))
            except: pass

# Dédoublonnage par acte_id pour afficher l'état le plus récent
latest_by_id = {}
for r in records:
    latest_by_id[r['acte_id']] = r

sorted_records = sorted(latest_by_id.values(), key=lambda x: x.get('ts', ''), reverse=True)

print('=' * 115)
print('   MAIN COURANTE DES ACTES DE SERVICE - FASOMATRIX (JOUR 3)')
print('=' * 115)
header = f'| {\"ACTE ID\":<36} | {\"DESTINATAIRE\":<20} | {\"ÉCHÉANCE\":<20} | {\"STATUT\":<16} | {\"HORODATAGE\":<20} |'
print(header)
print('|' + '-' * 38 + '|' + '-' * 22 + '|' + '-' * 22 + '|' + '-' * 18 + '|' + '-' * 22 + '|')

for r in sorted_records:
    aid = r.get('acte_id', '')[:36]
    dest = r.get('destinataire', '')[:20]
    dl = r.get('deadline', '')[:19]
    status = r.get('statut', '')[:16]
    ts = r.get('ts', '')[:19]
    print(f'| {aid:<36} | {dest:<20} | {dl:<20} | {status:<16} | {ts:<20} |')

print('=' * 115)
print(f'Total : {len(sorted_records)} acte(s) répertorié(s).')
"
