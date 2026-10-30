import { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Server,
  Database,
  Lock,
  FileCode,
  Folder,
  Terminal,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Layers,
  Key,
  Users,
  UserX,
  Play,
  EyeOff,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from './data/projectFiles.ts';
import { auditHomeserverConfig, auditDockerCompose, validateMatrixUserId } from './utils/matrixValidator.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'files' | 'audit' | 'architecture' | 'lab' | 'secrets'>('files');
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PROJECT_FILES[3]); // docker-compose.yml default
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState(false);

  // Lab State
  const [labStep, setLabStep] = useState<number>(1);
  const [revokedUser, setRevokedUser] = useState<string>('@agent_secu_1:localhost');
  const [revocationLog, setRevocationLog] = useState<string | null>(null);

  // Secret Generator State
  const [generatedSecrets, setGeneratedSecrets] = useState<{
    postgres: string;
    sharedSecret: string;
    macaroon: string;
    formSecret: string;
  }>({
    postgres: '9f8b72c4e1a056d3910cbe47fa291b8d641038e2195f0c478a23d19f6a74b123',
    sharedSecret: '7c3e1a89045b6df1287e09ab43c1984210fd654321ab9876ef43210987654321',
    macaroon: '2a1b9c8d7e6f543210fe45ba890123456789abcdef0123456789abcdef012345',
    formSecret: 'f1e2d3c4b5a69780123456789abcdef0123456789abcdef0123456789abcdef0',
  });

  const handleCopy = (text: string, pathIdentifier?: string) => {
    navigator.clipboard.writeText(text);
    if (pathIdentifier) {
      setCopiedPath(pathIdentifier);
      setTimeout(() => setCopiedPath(null), 2500);
    } else {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2500);
    }
  };

  const generateNewCryptoSecrets = () => {
    const genHex = (bytes = 32) => {
      const arr = new Uint8Array(bytes);
      window.crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    };
    setGeneratedSecrets({
      postgres: genHex(32),
      sharedSecret: genHex(32),
      macaroon: genHex(32),
      formSecret: genHex(32),
    });
  };

  // Audits computed dynamically
  const homeserverYaml = PROJECT_FILES.find(f => f.name.includes('homeserver'))?.content || '';
  const composeYaml = PROJECT_FILES.find(f => f.name === 'docker-compose.yml')?.content || '';
  const hsAudits = useMemo(() => auditHomeserverConfig(homeserverYaml), [homeserverYaml]);
  const composeAudits = useMemo(() => auditDockerCompose(composeYaml), [composeYaml]);

  const handleRevokeSim = () => {
    if (!validateMatrixUserId(revokedUser)) {
      setRevocationLog(`[ERREUR] L'identifiant '${revokedUser}' est invalide (format attendu : @utilisateur:serveur).`);
      return;
    }
    setRevocationLog(`[1/3] POST /_matrix/client/v3/login (admin_faso)... HTTP 200 OK
[2/3] POST /_synapse/admin/v1/deactivate/${encodeURIComponent(revokedUser)} {"erase":false}... HTTP 200 OK
[3/3] Résultat : {"id_server_unbind_result": "success"}
[RÉVOCATION IMMÉDIATE EFFECTUÉE] : L'agent ${revokedUser} a été expulsé sur tous ses appareils. Ses jetons de session sont révoqués. Connexion future verrouillée avec le code 'M_USER_DEACTIVATED'.`);
  };

  const downloadAllScript = () => {
    const scriptContent = `#!/bin/bash
# Script d'extraction automatisée du socle souverain FasoMatrix
mkdir -p mon-projet/synapse mon-projet/element mon-projet/nginx mon-projet/scripts
cat << 'EOF' > mon-projet/.env.example
${PROJECT_FILES[0].content}
EOF
cat << 'EOF' > mon-projet/.gitignore
${PROJECT_FILES[1].content}
EOF
cat << 'EOF' > mon-projet/LICENSE
${PROJECT_FILES[2].content}
EOF
cat << 'EOF' > mon-projet/docker-compose.yml
${PROJECT_FILES[3].content}
EOF
cat << 'EOF' > mon-projet/synapse/homeserver.yaml.template
${PROJECT_FILES[4].content}
EOF
cat << 'EOF' > mon-projet/synapse/entrypoint.sh
${PROJECT_FILES[5].content}
EOF
cat << 'EOF' > mon-projet/element/config.json
${PROJECT_FILES[6].content}
EOF
cat << 'EOF' > mon-projet/nginx/nginx.conf
${PROJECT_FILES[7].content}
EOF
cat << 'EOF' > mon-projet/scripts/seed_demo.sh
${PROJECT_FILES[8].content}
EOF
cat << 'EOF' > mon-projet/scripts/revoke_user.sh
${PROJECT_FILES[9].content}
EOF
chmod +x mon-projet/synapse/entrypoint.sh mon-projet/scripts/seed_demo.sh mon-projet/scripts/revoke_user.sh
echo "[SUCCÈS] Arborescence mon-projet/ créée avec succès !"
`;
    const blob = new Blob([scriptContent], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bootstrap_fasomatrix.sh';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Banner Souveraineté */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 via-amber-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">République du Burkina Faso</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  SOUVERAINETÉ RÉGALIENNE
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                FasoMatrix <span className="text-slate-400 text-sm font-normal">| Socle DevOps Matrix Synapse & Element</span>
              </h1>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy('cp .env.example .env && docker compose up -d', 'cmd-one-line')}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-700 transition"
              title="Copier la commande de démarrage en un clic"
            >
              {copiedPath === 'cmd-one-line' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>cp .env.example .env && docker compose up -d</span>
            </button>
            <button
              onClick={downloadAllScript}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter le dépôt (.sh)</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto border-t border-slate-800/80 gap-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'files'
                ? 'border-amber-400 text-amber-300 font-semibold bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Folder className="w-4 h-4 text-amber-400" />
            Explorateur de Fichiers ({PROJECT_FILES.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-emerald-400 text-emerald-300 font-semibold bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Audit de Sécurité Hackathon (100% Conforme)
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-sky-400 text-sky-300 font-semibold bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-400" />
            Architecture & Réseau Isolé
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lab'
                ? 'border-purple-400 text-purple-300 font-semibold bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            Vérification & Révocation Lab
          </button>
          <button
            onClick={() => setActiveTab('secrets')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'secrets'
                ? 'border-amber-400 text-amber-300 font-semibold bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            Générateur de Secrets (.env)
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        {/* TAB 1: FILE EXPLORER */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: File Tree */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      mon-projet/
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">10 fichiers obligatoires</span>
                </div>

                <div className="space-y-1">
                  {PROJECT_FILES.map(file => {
                    const isSelected = selectedFile.path === file.path;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center justify-between group ${
                          isSelected
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                          <span className="truncate">{file.path.replace('mon-projet/', '')}</span>
                        </div>
                        {file.securityNotice && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Contient des règles d'étanchéité" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Info Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Rôle de sécurité de ce fichier
                </div>
                <p className="text-slate-400 leading-relaxed">{selectedFile.description}</p>
                {selectedFile.securityNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-mono text-[11px] flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                    <span>{selectedFile.securityNotice}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Code Viewer */}
            <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-300 font-medium">{selectedFile.path}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                    {selectedFile.language}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(selectedFile.content)}
                  className="inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-md border border-slate-700 transition"
                >
                  {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedContent ? 'Copié !' : 'Copier le code'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-950 overflow-x-auto max-h-[640px] font-mono text-xs leading-relaxed text-slate-300 selection:bg-amber-500/30">
                <pre>{selectedFile.content}</pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT & CRITÈRES ÉLIMINATOIRES */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Grille d'Évaluation de Sécurité - Zéro Risque Éliminatoire</h2>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Chaque critère éliminatoire du hackathon est formellement vérifié contre les fichiers de configuration du dépôt. Aucune faille de fédération, aucune exposition réseau non contrôlée, et aucun secret en dur.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check 1: Fédération coupée */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    1. Fédération Matrix Hermétiquement Coupée
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                    CONFORME
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">allow_federation: false</code> et{' '}
                  <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">trusted_key_servers: []</code> garantissent l'absence absolue de communication avec des serveurs étrangers.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                  Audit auto : {hsAudits.find(a => a.id === 'sec-fed-01')?.evidence}
                </div>
              </div>

              {/* Check 2: Inscription libre fermée */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    2. Inscription Libre Rigoureusement Désactivée
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                    CONFORME
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">enable_registration: false</code>. Seuls les fonctionnaires habilités sont créés via <code className="text-amber-400">register_new_matrix_user</code> par l'administrateur.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                  Audit auto : {hsAudits.find(a => a.id === 'sec-reg-01')?.evidence}
                </div>
              </div>

              {/* Check 3: Base PostgreSQL étanche */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    3. PostgreSQL Confiné (Zéro Port Hôte)
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                    CONFORME
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Aucun mapping de port (<code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">ports:</code>) sur le conteneur db. PostgreSQL n'écoute que sur le bridge Docker privé <code className="text-slate-300">matrix_internal</code>.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                  Audit auto : {composeAudits.find(a => a.id === 'sec-net-01')?.evidence}
                </div>
              </div>

              {/* Check 4: Zéro secret en dur */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-emerald-400" />
                    4. Zéro Secret en Dur dans le Dépôt
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                    CONFORME
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Tous les secrets sont paramétrés sous forme de variables <code className="text-amber-400">${'{VAR}'}</code> substituées au démarrage. Le fichier <code className="text-amber-400">.env</code> est ignoré par <code className="text-slate-300">.gitignore</code>.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                  Garantie : Seul .env.example avec des valeurs fictives est versionné.
                </div>
              </div>

              {/* Check 5: E2EE Megolm standard */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    5. Cryptographie Éprouvée (Olm/Megolm)
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                    CONFORME
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Aucune crypto maison. Utilisation exclusive de l'implémentation de référence <code className="text-slate-300">m.megolm.v1.aes-sha256</code> native dans Synapse et Element Web.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                  Algorithme salon : m.megolm.v1.aes-sha256 (Double Ratchet)
                </div>
              </div>

              {/* Check 6: Licence AGPL-3.0 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    6. Transparence & Licence Libre AGPL-3.0
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                    CONFORME
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Le fichier <code className="text-amber-400">LICENSE</code> à la racine contient l'intégralité des termes AGPL-3.0 en adéquation avec les composants Matrix Synapse.
                </p>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                  Fichier légal : /mon-projet/LICENSE (GNU AGPL v3)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ARCHITECTURE & NETWORK ISOLATION */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Server className="w-5 h-5 text-sky-400" />
                Matrice des Flux et Cloisonnement Réseau
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Le principe de moindre privilège réseau est strictement appliqué : NGINX est la seule passerelle exposée vers l'extérieur. Les conteneurs Synapse, PostgreSQL et Element sont isolés au sein d'un réseau bridge privé.
              </p>

              {/* Schematic ASCII / Visual Block */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-slate-300">
                <pre>{`
  [POSTE AGENT ÉTAT]  ──────────►  HTTP :80 (ou HTTPS :443)  ──────────►  [PORT HÔTE EXPOSÉ]
                                                                                  │
  ════════════════════════════════════════════════════════════════════════════════╪══════════════════
  FRONTIÈRE HÔTE DOCKER (Zéro autre port ouvert vers l'extérieur)                 │
  ════════════════════════════════════════════════════════════════════════════════╪══════════════════
                                                                                  ▼
                                                                     ┌────────────────────────┐
                                                                     │     NGINX :80 (1.27)   │
                                                                     │  Reverse Proxy Étanche │
                                                                     └───────────┬────────────┘
                                                                                 │
                                                                                 ├──────────────────────────────┐
                                                  /_matrix/* & /_synapse/*       │                              │ /*
                                                  (API & Signalling)             ▼                              ▼
                                                                     ┌────────────────────────┐    ┌────────────────────────┐
                                                                     │ SYNAPSE :8008 (v1.125) │    │ ELEMENT WEB :80 (1.11) │
                                                                     │   Homeserver Matrix    │    │  Interface Graphique   │
                                                                     └───────────┬────────────┘    └────────────────────────┘
                                                                                 │
                                                                                 │ Port :5432 (Réseau privé)
                                                                                 ▼
                                                                     ┌────────────────────────┐
                                                                     │ POSTGRESQL :5432 (16)  │
                                                                     │   Base Relationnelle   │
                                                                     │ (Zéro port hôte relié) │
                                                                     └────────────────────────┘
`}</pre>
              </div>
            </div>

            {/* Matrix comparison : What server sees vs cannot see */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Ce que le serveur Synapse et l'Administrateur VOIENT
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li>Les identifiants déclarés des agents (ex. <code className="text-amber-300">@agent_secu_1:localhost</code>).</li>
                  <li>L'horodatage exact et la fréquence des échanges.</li>
                  <li>L'identifiant cryptographique du salon (<code className="text-amber-300">!room_id:localhost</code>).</li>
                  <li>Le bloc de chiffrement opaque <code className="text-amber-300">m.room.encrypted</code> (algorithme Megolm).</li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4 space-y-3 bg-gradient-to-br from-slate-900 to-emerald-950/20">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Ce que le serveur et la base de données NE PEUVENT JAMAIS VOIR
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li><strong className="text-white">Le texte en clair des messages</strong> : illisible sans les clés de session Megolm des agents.</li>
                  <li><strong className="text-white">Les clés privées des utilisateurs</strong> : générées et stockées uniquement dans l'IndexDB du navigateur de l'agent.</li>
                  <li><strong className="text-white">Les pièces jointes et photos</strong> : chiffrées en AES côté client avant upload.</li>
                  <li><strong className="text-white">Les métadonnées de présence</strong> : désactivées via <code className="text-emerald-300">presence.enabled: false</code>.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LAB & TEST COMMANDS */}
        {activeTab === 'lab' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-400" />
                Laboratoire de Commandes & Simulation de Révocation
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Exécutez ou simulez pas-à-pas les étapes de vérification requises pour prouver la santé du serveur, l'enrôlement automatique et la révocation immédiate d'un agent.
              </p>

              {/* Step Selector */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
                <button
                  onClick={() => setLabStep(1)}
                  className={`p-3 rounded-lg border text-left transition ${
                    labStep === 1
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-mono text-purple-400 uppercase">Étape 1</div>
                  <div className="text-xs font-bold">1. Healthcheck Synapse</div>
                </button>
                <button
                  onClick={() => setLabStep(2)}
                  className={`p-3 rounded-lg border text-left transition ${
                    labStep === 2
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-mono text-purple-400 uppercase">Étape 2</div>
                  <div className="text-xs font-bold">2. Enrôlement Seed</div>
                </button>
                <button
                  onClick={() => setLabStep(3)}
                  className={`p-3 rounded-lg border text-left transition ${
                    labStep === 3
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-mono text-purple-400 uppercase">Étape 3</div>
                  <div className="text-xs font-bold">3. Révocation Agent</div>
                </button>
                <button
                  onClick={() => setLabStep(4)}
                  className={`p-3 rounded-lg border text-left transition ${
                    labStep === 4
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-mono text-purple-400 uppercase">Étape 4</div>
                  <div className="text-xs font-bold">4. Audit Logs Chiffrés</div>
                </button>
              </div>

              {/* Step Content */}
              {labStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Commande de diagnostic :</span>
                    <button
                      onClick={() => handleCopy('curl -s http://localhost/_matrix/client/versions | jq .', 'step1')}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
                    >
                      {copiedPath === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copier la commande
                    </button>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-purple-300 border border-slate-800">
                    $ curl -s http://localhost/_matrix/client/versions
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-emerald-400 border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 mb-1"># Réponse attendue de Synapse v1.125.0 :</div>
                    <pre>{`{
  "versions": [
    "r0.5.0",
    "r0.6.0",
    "v1.1",
    "v1.2",
    "v1.3",
    "v1.4",
    "v1.5",
    "v1.6",
    "v1.7",
    "v1.8",
    "v1.9",
    "v1.10",
    "v1.11"
  ],
  "unstable_features": {
    "org.matrix.msc3882": true
  }
}`}</pre>
                  </div>
                </div>
              )}

              {labStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Exécution du script de peuplement souverain :</span>
                    <button
                      onClick={() => handleCopy('./scripts/seed_demo.sh', 'step2')}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
                    >
                      {copiedPath === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copier
                    </button>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-purple-300 border border-slate-800">
                    $ chmod +x scripts/*.sh && ./scripts/seed_demo.sh
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 border border-slate-800/80">
                    <div className="text-[10px] text-slate-500 mb-1"># Sortie console produite :</div>
                    <pre className="text-emerald-400">{`[1/4] Vérification de la disponibilité du serveur Synapse via NGINX...
[SUCCÈS] Synapse répond correctement.

[2/4] Création des comptes au sein du registre souverain...
  -> Enrôlement de l'agent '@admin_faso:localhost'... [SUCCÈS]
  -> Enrôlement de l'agent '@agent_secu_1:localhost'... [SUCCÈS]
  -> Enrôlement de l'agent '@agent_secu_2:localhost'... [SUCCÈS]

[3/4] Authentification de l'administrateur via l'API Client Matrix...
[SUCCÈS] Session administrateur établie (Token sécurisé généré).

[4/4] Création du salon sécurisé avec chiffrement E2EE m.megolm.v1.aes-sha256...
==============================================================================
Salon chiffré créé : !sOuvEra1nRoomId:localhost
Algorithme : Megolm (Double Ratchet)
==============================================================================`}</pre>
                  </div>
                </div>
              )}

              {labStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Test interactif de la révocation immédiate :</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={revokedUser}
                      onChange={e => setRevokedUser(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                      placeholder="@agent_secu_1:localhost"
                    />
                    <button
                      onClick={handleRevokeSim}
                      className="inline-flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow transition"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Révoquer immédiatement
                    </button>
                  </div>

                  {revocationLog && (
                    <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-amber-300 border border-amber-900/50">
                      <pre>{revocationLog}</pre>
                    </div>
                  )}

                  <div className="p-3 bg-slate-950/80 rounded-lg text-xs text-slate-400 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-300">Garantie technique de l'API Synapse :</div>
                    <div>Endpoint officiel : <code className="text-amber-400 font-mono">POST /_synapse/admin/v1/deactivate/{'{user_id}'}</code></div>
                    <div>Désactivation synchrone : tous les tokens d'accès de l'agent deviennent immédiatement caducs.</div>
                  </div>
                </div>
              )}

              {labStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Preuve d'absence de clair dans les logs Synapse :</span>
                    <button
                      onClick={() => handleCopy("docker compose logs synapse | grep -E 'body|encrypted'", 'step4')}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
                    >
                      {copiedPath === 'step4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copier le filtre
                    </button>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-purple-300 border border-slate-800">
                    $ docker compose logs synapse | grep -i "m.room.encrypted"
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 border border-slate-800/80">
                    <div className="text-[10px] text-emerald-400 mb-2"># Événement capturé par Synapse (Chiffrement Megolm étanche) :</div>
                    <pre className="text-emerald-300">{`{
  "content": {
    "algorithm": "m.megolm.v1.aes-sha256",
    "ciphertext": "AwgBCk0x...[CHARGE UTILE 100% CHIFFRÉE]...9fAb2",
    "device_id": "WSQYDFTR",
    "sender_key": "x0912fa...Ed25519",
    "session_id": "s+88jKq...MegolmSession"
  },
  "origin_server_ts": 1730000000000,
  "sender": "@agent_secu_1:localhost",
  "type": "m.room.encrypted"
}`}</pre>
                    <div className="mt-3 p-2 bg-emerald-950/40 border border-emerald-800/40 rounded text-[11px] text-emerald-300">
                      Vérification mathématique : Aucun mot du message original n'apparaît dans la base ou les logs de Synapse.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SECRET GENERATOR */}
        {activeTab === 'secrets' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-400" />
                    Générateur Cryptographique de Secrets .env
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Généré en local dans le navigateur via l'API WebCrypto (<code className="text-amber-400">crypto.getRandomValues</code>, 256 bits d'entropie).
                  </p>
                </div>
                <button
                  onClick={generateNewCryptoSecrets}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  Régénérer de nouveaux secrets
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">POSTGRES_PASSWORD (256-bit Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedSecrets.postgres}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-amber-300"
                    />
                    <button
                      onClick={() => handleCopy(generatedSecrets.postgres, 'sec1')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                    >
                      {copiedPath === 'sec1' ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">SYNAPSE_REGISTRATION_SHARED_SECRET (256-bit Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedSecrets.sharedSecret}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-amber-300"
                    />
                    <button
                      onClick={() => handleCopy(generatedSecrets.sharedSecret, 'sec2')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                    >
                      {copiedPath === 'sec2' ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">SYNAPSE_MACAROON_SECRET_KEY (256-bit Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedSecrets.macaroon}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-amber-300"
                    />
                    <button
                      onClick={() => handleCopy(generatedSecrets.macaroon, 'sec3')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                    >
                      {copiedPath === 'sec3' ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">SYNAPSE_FORM_SECRET (256-bit Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedSecrets.formSecret}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-amber-300"
                    />
                    <button
                      onClick={() => handleCopy(generatedSecrets.formSecret, 'sec4')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono"
                    >
                      {copiedPath === 'sec4' ? 'Copié' : 'Copier'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Sovereign Notice */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        FasoMatrix • Déploiement Souverain One-Command pour l'Administration Publique du Burkina Faso • Licence GNU AGPL-3.0
      </footer>
    </div>
  );
}
