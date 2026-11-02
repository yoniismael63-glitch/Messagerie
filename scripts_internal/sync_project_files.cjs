const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function getLanguage(filePath) {
  if (filePath.endsWith('.sh')) return 'bash';
  if (filePath.endsWith('.ps1')) return 'powershell';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml') || filePath.endsWith('.template')) return 'yaml';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('Dockerfile')) return 'dockerfile';
  if (filePath.endsWith('.conf')) return 'nginx';
  return 'text';
}

function getDay(filePath) {
  if (filePath.includes('bot') || filePath.includes('acte') || filePath.includes('delegat') || filePath.includes('docs/0') || filePath.includes('create_agents')) {
    return 3;
  }
  if (filePath.includes('backup') || filePath.includes('restore') || filePath.includes('purge') || filePath.includes('promote') || filePath.includes('SECURITY')) {
    return 2;
  }
  return 1;
}

function getDescription(filePath) {
  const base = path.basename(filePath);
  const descriptions = {
    'escalation_bot.py': 'Démon asynchrone du Bot d\'escalade et de suppléance chiffrée (Zero-Knowledge, blind bot).',
    'Dockerfile': 'Image Docker légère python:3.12-slim pour l\'exécution sécurisée du bot d\'escalade.',
    'requirements.txt': 'Dépendances Python du bot (matrix-nio, python-dateutil, aiohttp).',
    'seed_acte_demo.sh': 'Script Bash d\'initialisation du Jour 3 : salons #actes-service, #actes-coordination, #actes-admin.',
    'seed_acte_demo.ps1': 'Script PowerShell d\'initialisation du Jour 3 : salons #actes-service, #actes-coordination, #actes-admin.',
    'send_acte.sh': 'Script Bash d\'envoi d\'un acte de service chiffré dans #actes-service + meta-event dans #actes-coordination.',
    'send_acte.ps1': 'Script PowerShell d\'envoi d\'un acte de service chiffré dans #actes-service + meta-event dans #actes-coordination.',
    'send_ack.sh': 'Script Bash d\'accusé de réception probant avec calcul du hash SHA-256 du ciphertext.',
    'send_ack.ps1': 'Script PowerShell d\'accusé de réception probant avec calcul du hash SHA-256 du ciphertext.',
    'delegate_role.sh': 'Script Bash d\'octroi de suppléance temporaire avec création de sous-salon isolé.',
    'delegate_role.ps1': 'Script PowerShell d\'octroi de suppléance temporaire avec création de sous-salon isolé.',
    'revoke_delegation.sh': 'Script Bash de révocation immédiate d\'une suppléance et expulsion du sous-salon.',
    'revoke_delegation.ps1': 'Script PowerShell de révocation immédiate d\'une suppléance et expulsion du sous-salon.',
    'list_actes.sh': 'Script Bash d\'affichage tabulaire de la main courante persistante (data/main_courante.jsonl).',
    'list_actes.ps1': 'Script PowerShell d\'affichage tabulaire de la main courante persistante (data/main_courante.jsonl).',
    'list_delegations.sh': 'Script Bash d\'affichage tabulaire du registre des suppléances (data/delegations.jsonl).',
    'list_delegations.ps1': 'Script PowerShell d\'affichage tabulaire du registre des suppléances (data/delegations.jsonl).',
    'create_agents.sh': 'Script Bash de création sécurisée des comptes landry et mandjide pour l\'administration.',
    'create_agents.ps1': 'Script PowerShell de création sécurisée des comptes landry et mandjide pour l\'administration.',
    '01_FICHE_EQUIPE.md': 'Pièce 1 officielle du concours : Fiche d\'identification complète de l\'équipe et des membres.',
    '02_NOTE_DE_PRE_PROJET.md': 'Pièce 2 officielle (max 2 pages) : Note de pré-projet, architecture, souveraineté et licences.',
    '03_NOTE_DE_SECURITE.md': 'Pièce 3 officielle (max 2 pages) : Note de sécurité, modèle de menace, E2EE et limites connues.',
    '04_GUIDE_DEPOT_GIT.md': 'Pièce 4 officielle : Guide et protocole pour le dépôt Git public et historique de commits.',
    '05_STORYBOARD_VIDEO_3MIN.md': 'Pièce 5 officielle : Storyboard chronométré pour la vidéo de démonstration de 3 minutes.',
    'SECURITY.md': 'Politique de sécurité globale, modèle de confiance E2EE et analyse de révocation Synapse.',
    'docker-compose.yml': 'Orchestration Docker Compose des 5 services : Synapse, PostgreSQL, Nginx, Element Web et Bot.',
    'homeserver.yaml.template': 'Modèle de configuration durcie Synapse avec fédération bloquée et inscription désactivée.',
    'entrypoint.sh': 'Script de démarrage du conteneur Synapse avec génération des clés et injection de config.',
    'config.json': 'Configuration d\'Element Web configuré pour pointer sur le domaine et autoriser la personnalisation.',
    'nginx.conf': 'Configuration Nginx reverse proxy avec en-têtes de sécurité renforcés et routage interne.',
    '.env.example': 'Modèle de variables d\'environnement contenant tous les secrets et identifiants du projet.',
    '.gitignore': 'Règles Git interdisant strictement le commit de fichiers d\'environnement ou de clés privées.',
    'LICENSE': 'Licence libre et ouverte Apache 2.0 garantissant la souveraineté régalienne.',
    'README.md': 'Documentation complète du projet avec guides de déploiement Jour 1, 2 et 3.',
    'seed_demo.sh': 'Script Bash d\'initialisation Jour 1 (création admin, agent1, agent2 et salon Megolm).',
    'seed_demo.ps1': 'Script PowerShell d\'initialisation Jour 1 (création admin, agent1, agent2 et salon Megolm).',
    'revoke_user.sh': 'Script Bash de révocation immédiate d\'un agent (deactivate Synapse et purge des clés).',
    'revoke_user.ps1': 'Script PowerShell de révocation immédiate d\'un agent (deactivate Synapse et purge des clés).',
    'verify_no_cleartext.sh': 'Script Bash d\'audit certifiant l\'absence absolue de clair dans les logs et la base PostgreSQL.',
    'verify_no_cleartext.ps1': 'Script PowerShell d\'audit certifiant l\'absence absolue de clair dans les logs et la base PostgreSQL.',
    'backup.sh': 'Script Bash de sauvegarde à froid chiffrée avec openssl AES-256-GCM.',
    'backup.ps1': 'Script PowerShell de sauvegarde à froid chiffrée avec openssl AES-256-GCM.',
    'restore.sh': 'Script Bash de restauration d\'urgence après incident avec vérification d\'intégrité.',
    'restore.ps1': 'Script PowerShell de restauration d\'urgence après incident avec vérification d\'intégrité.',
    'purge_room.sh': 'Script Bash de purge historique conforme RGPD et rétention régalienne.',
    'purge_room.ps1': 'Script PowerShell de purge historique conforme RGPD et rétention régalienne.',
    'promote_admin.sh': 'Script Bash de promotion ou rétrogradation d\'un agent au rang d\'administrateur Synapse.',
    'promote_admin.ps1': 'Script PowerShell de promotion ou rétrogradation d\'un agent au rang d\'administrateur Synapse.'
  };

  return descriptions[base] || `Fichier source du socle FasoMatrix : ${base}`;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === '__pycache__' || file.endsWith('.pyc')) return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const rootDir = path.resolve(__dirname, '..');
const monProjetDir = path.join(rootDir, 'mon-projet');
const files = walk(monProjetDir);

const zip = new JSZip();
const zipFolder = zip.folder('mon-projet');

const projectFilesArray = [];

files.forEach(fullPath => {
  const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
  const relInProject = path.relative(monProjetDir, fullPath).replace(/\\/g, '/');
  const content = fs.readFileSync(fullPath, 'utf8');
  const base = path.basename(fullPath);
  const dir = path.dirname(relInProject) === '.' ? 'racine' : path.dirname(relInProject);
  const lang = getLanguage(fullPath);
  const day = getDay(relPath);
  const desc = getDescription(fullPath);

  zipFolder.file(relInProject, content);

  projectFilesArray.push({
    path: relPath,
    name: base,
    directory: dir,
    language: lang,
    description: desc,
    day: day,
    content: content
  });
});

// Tri pour avoir un ordre lisible
projectFilesArray.sort((a, b) => {
  if (a.day !== b.day) return a.day - b.day;
  return a.path.localeCompare(b.path);
});

// Écriture de src/data/projectFiles.ts
const tsContent = `export interface ProjectFile {
  path: string;
  name: string;
  directory: string;
  language: 'bash' | 'yaml' | 'json' | 'markdown' | 'text' | 'dockerfile' | 'nginx' | 'powershell' | 'python';
  description: string;
  securityNotice?: string;
  content: string;
  day?: 1 | 2 | 3;
}

export const PROJECT_FILES: ProjectFile[] = ${JSON.stringify(projectFilesArray, null, 2)};
`;

fs.writeFileSync(path.join(rootDir, 'src', 'data', 'projectFiles.ts'), tsContent, 'utf8');
console.log('src/data/projectFiles.ts synchronisé avec succès :', projectFilesArray.length, 'fichiers.');

// Génération du ZIP
zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then(buf => {
  fs.writeFileSync(path.join(rootDir, 'public', 'mon-projet.zip'), buf);
  console.log('public/mon-projet.zip mis à jour avec succès :', buf.length, 'octets.');
});
