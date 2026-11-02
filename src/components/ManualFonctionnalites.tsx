import { useState } from 'react';
import {
  Printer,
  FileText,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  Server,
  Lock,
  Flame,
  Award,
  Users,
  Terminal,
  Database,
  ArrowRight,
  Clock,
  Key,
  Archive,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Download,
  FileDown
} from 'lucide-react';
import { PROJECT_FILES } from '../data/projectFiles.ts';

export default function ManualFonctionnalites() {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'archi' | 'features' | 'roles' | 'commands'>('all');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const manualFile = PROJECT_FILES.find(f => f.name === 'MANUEL_FONCTIONNEMENT_FONCTIONNALITES.md');
    const content = manualFile ? manualFile.content : '';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MANUEL_FONCTIONNEMENT_FONCTIONNALITES.md';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const handleCopyMarkdown = () => {
    const manualFile = PROJECT_FILES.find(f => f.name === 'MANUEL_FONCTIONNEMENT_FONCTIONNALITES.md');
    const content = manualFile ? manualFile.content : '';
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const features = [
    {
      num: 1,
      badge: "SOCLE MATRIX",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      title: "Messagerie Instantanée Sécurisée & Salons Thématiques",
      role: "Communications opérationnelles quotidiennes",
      desc: "Permet l'échange de messages textuels, pièces jointes, fichiers de mission et canaux de crise. Tout salon créé active obligatoirement le chiffrement de bout en bout (m.megolm.v1.aes-sha2).",
      secret: "Les clés privées ne quittent jamais le terminal de l'agent. Le serveur n'achemine que des paquets chiffrés aveugles.",
      command: "Element Web / Mobile → Créer salon → Chiffrement activé par défaut"
    },
    {
      num: 2,
      badge: "INNOVATION J3",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      title: "L'Acte de Service Régalien Chiffré",
      role: "Transmission d'ordres formels et prioritaires",
      desc: "Transforme un simple message en un ordre de mission officiel doté d'un identifiant opaque (ex: ACTE-20261102-0945-88A1), d'un destinataire unique, d'une deadline d'exécution et d'un corps chiffré de bout en bout dans #actes-service.",
      secret: "Le contenu sensible circule uniquement dans le salon chiffré, tandis qu'un méta-événement minimaliste de synchronisation est transmis dans #actes-coordination.",
      command: ".\\scripts\\send_acte.ps1 -Expediteur agent1 -Destinataire @agent2:localhost -Objet 'Ordre Alpha' -Corps 'Mission secteur Nord' -Deadline '+2m'"
    },
    {
      num: 3,
      badge: "INNOVATION J3",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      title: "Accusé de Réception Probant par Empreinte SHA-256",
      role: "Non-répudiation et preuve d'acquittement",
      desc: "L'agent destinataire acquitte l'ordre en transmettant l'empreinte mathématique SHA-256 (64 caractères hexadécimaux) du bloc de données chiffrées reçu. Le système compare les empreintes et rejette tout hash non concordant.",
      secret: "Prouve que l'agent a réceptionné exactement le paquet cryptographique intact, sans que le bot de contrôle n'ait besoin de lire le clair.",
      command: ".\\scripts\\send_ack.ps1 -ActeId ACTE-... -Agent agent2 -Status lu"
    },
    {
      num: 4,
      badge: "INNOVATION J3",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      title: "Moteur d'Escalade Automatique à 2 Paliers",
      role: "Garantie qu'aucun ordre prioritaire ne reste sans réponse",
      desc: "Surveille en permanence le délai de réponse. Palier 1 : à la deadline, le bot alerte le superviseur dans #actes-coordination. Palier 2 : en cas de silence prolongé, escalade critique vers le commandement supérieur.",
      secret: "Principe du Bot Aveugle (Blind Bot) : le bot n'est jamais invité dans le salon chiffré. Il escalade sans rien déchiffrer.",
      command: "Daemon automatique : python bot/escalation_bot.py"
    },
    {
      num: 5,
      badge: "INNOVATION J3",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      title: "Main Courante Électronique Inaltérable (Audit Trail)",
      role: "Registre d'audit permanent et traçabilité judiciaire",
      desc: "Enregistrement append-only au format JSON Lines (data/main_courante.jsonl) de toutes les transitions : envoye → accuse → escalade_niv1 → expire. Résiste aux pannes et aux redémarrages.",
      secret: "Historique persistant indépendant de la base de données, permettant des audits de conformité instantanés.",
      command: ".\\scripts\\list_actes.ps1 ou cat data/main_courante.jsonl"
    },
    {
      num: 6,
      badge: "INNOVATION J3",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      title: "Suppléance Chiffrée par Sous-Salon Isolé",
      role: "Délégation temporaire de mission (garde, intérim)",
      desc: "Permet d'affecter temporairement un suppléant pour recevoir de NOUVEAUX ordres, sans JAMAIS lui donner accès à l'historique antérieur des conversations.",
      secret: "Le suppléant est invité dans un sous-salon dédié (#actes-delegation-<id>). N'ayant jamais été dans #actes-service, il lui est mathématiquement impossible de déchiffrer les anciens messages.",
      command: ".\\scripts\\delegate_role.ps1 -Admin admin -Suppleant @agent3:localhost -Duree 24h -Scope 'Urgence Secteur Est'"
    },
    {
      num: 7,
      badge: "INNOVATION J3",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      title: "Registre des Mandats & Révocation Immédiate",
      role: "Gouvernance des délégations temporaires",
      desc: "Enregistrement des mandats dans data/delegations.jsonl. Possibilité d'interrompre le mandat en urgence d'un clic ou d'une commande : exclusion immédiate du sous-salon.",
      secret: "Révocation instantanée sans redémarrage du serveur, avec fermeture du canal de dérivation.",
      command: ".\\scripts\\revoke_delegation.ps1 -DelegationId DEL-... -Admin admin"
    },
    {
      num: 8,
      badge: "JOUR 2 VALIDÉ",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      title: "Révocation Atomique Multi-Appareils d'un Agent",
      role: "Neutralisation immédiate d'un terminal compromis ou d'un compte suspendu",
      desc: "Désactivation immédiate via l'API Synapse POST /_synapse/admin/v1/deactivate/{user_id}. En moins de 1000 ms, toutes les sessions sur PC, mobile et tablette sont tuées simultanément.",
      secret: "Destruction des tokens d'accès et purge des clés d'appareils : même avec son mot de passe, l'agent ne peut plus se reconnecter.",
      command: ".\\scripts\\revoke_user.ps1 -TargetUser @agent2:localhost"
    },
    {
      num: 9,
      badge: "JOUR 2 VALIDÉ",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      title: "Sauvegarde à Froid Chiffrée AES-256-GCM",
      role: "Protection régalienne des données de l'État",
      desc: "Archive complète de l'infrastructure (base PostgreSQL, configurations, clés maîtresses de signature et main courante) chiffrée avec OpenSSL AES-256-GCM et dérivation PBKDF2.",
      secret: "L'archive exportée est inviolable sans la passphrase secrète d'administration du Burkina Faso.",
      command: ".\\scripts\\backup.ps1 ou ./scripts/backup.sh"
    },
    {
      num: 10,
      badge: "JOUR 2 VALIDÉ",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      title: "Restauration d'Urgence après Sinistre (Disaster Recovery)",
      role: "Continuité d'activité en cas de crash matériel",
      desc: "Procédure automatisée de déchiffrement, vérification d'intégrité SHA-256, réinjection dans PostgreSQL et relance ordonnée des conteneurs.",
      secret: "Reprise d'activité garantie en moins de 3 minutes sur n'importe quel nouveau serveur.",
      command: ".\\scripts\\restore.ps1 -BackupFile backup_fasomatrix_*.tar.gz.enc"
    },
    {
      num: 11,
      badge: "JOUR 2 VALIDÉ",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      title: "Purge Historique & Rétention Régaliènne Conforme",
      role: "Épuration automatique et conformité légale",
      desc: "Nettoyage sélectif des anciens messages d'un salon au-delà d'une durée de rétention prédéfinie (ex: 30 jours), afin de réduire la surface d'attaque en cas de saisie de matériel.",
      secret: "Appel de l'API Synapse Admin purge_history pour détruire définitivement les événements de la base.",
      command: ".\\scripts\\purge_room.ps1 -RoomId !salon:localhost -KeepDays 30"
    },
    {
      num: 12,
      badge: "DEVOPS SOUVERAIN",
      badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
      title: "Déploiement 'One-Command' & Tunnels d'Expérimentation",
      role: "Mise en service instantanée sur site isolé ou distant",
      desc: "Démarrage complet de l'infrastructure (Synapse, PostgreSQL, Element, Nginx, Bot) via une seule commande Docker Compose. Compatible réseau isolé (air-gapped) ou tunnels HTTPS (Ngrok, Cloudflare).",
      secret: "Isolation stricte des conteneurs sur le sous-réseau interne matrix_internal, aucun port de base de données exposé à l'extérieur.",
      command: "docker compose up -d"
    }
  ];

  const roleMatrix = [
    { feature: "Messagerie chiffrée E2EE (Olm/Megolm)", agent: true, super: true, admin: true },
    { feature: "Émission d'actes de service chiffrés", agent: false, super: true, admin: true },
    { feature: "Émission de l'accusé probant SHA-256", agent: true, super: true, admin: false },
    { feature: "Réception des alertes d'escalade", agent: false, super: "Palier 1", admin: "Palier 2" },
    { feature: "Consultation de la main courante", agent: false, super: true, admin: true },
    { feature: "Octroi / Révocation de suppléance", agent: false, super: true, admin: true },
    { feature: "Révocation atomique d'un compte agent", agent: false, super: false, admin: true },
    { feature: "Sauvegarde & Restauration AES-256", agent: false, super: false, admin: true },
    { feature: "Purge d'historique de rétention", agent: false, super: false, admin: true },
  ];

  return (
    <div className="space-y-8 print:text-black print:bg-white print:p-0">
      {/* ACTION BAR (Hidden in print) */}
      <div className="print:hidden bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border border-emerald-800/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
              DOCUMENT OFFICIEL PRÊT À IMPRIMER / PDF
            </span>
            <span className="text-xs text-slate-400">• Réf: FASOMATRIX-MANUEL-2026</span>
          </div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-emerald-400" />
            <span>Manuel Complet de Fonctionnement & Des Fonctionnalités</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            Ce document est conçu pour que les 3 membres de l'équipe puissent comprendre, expliquer et défendre chaque mécanisme du système FasoMatrix face au jury du Hackathon National.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition"
            title="Télécharger directement ce manuel au format Markdown (.md)"
          >
            {downloaded ? <Check className="w-4 h-4 text-white" /> : <FileDown className="w-4 h-4 text-white" />}
            <span>{downloaded ? 'Téléchargé !' : 'Télécharger (.md)'}</span>
          </button>

          <a
            href="/mon-projet.zip"
            download="mon-projet-fasomatrix.zip"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition"
            title="Télécharger l'archive ZIP complète avec tous les fichiers"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Télécharger tout (.zip)</span>
          </a>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 transition transform hover:scale-[1.02]"
            title="Imprimer ou enregistrer en PDF avec votre navigateur"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimer / PDF</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-700 shadow transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Copié !' : 'Copier texte'}</span>
          </button>
        </div>
      </div>

      {/* FILTER TABS (Hidden in print) */}
      <div className="print:hidden flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            activeSection === 'all'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          Vue Intégrale (12 Fonctionnalités)
        </button>
        <button
          onClick={() => setActiveSection('archi')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            activeSection === 'archi'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          1. Architecture & Fonctionnement
        </button>
        <button
          onClick={() => setActiveSection('features')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            activeSection === 'features'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          2. Fiches Fonctionnalités Détaillées
        </button>
        <button
          onClick={() => setActiveSection('roles')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            activeSection === 'roles'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          3. Matrice des Rôles & Permissions
        </button>
        <button
          onClick={() => setActiveSection('commands')}
          className={`px-3 py-1.5 rounded-lg border font-medium transition ${
            activeSection === 'commands'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          4. Commandes Pratiques (Aide-Mémoire)
        </button>
      </div>

      {/* DOCUMENT ROOT - STYLED FOR SCREEN & PRINT */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
        {/* DOCUMENT HEADER */}
        <div className="border-b border-slate-800 pb-8 mb-8 print:border-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono font-bold text-amber-400 print:text-amber-800 uppercase tracking-widest">
                  RÉPUBLIQUE DU BURKINA FASO
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono print:border-black print:text-black">
                  SOUVERAINETÉ RÉGALIENNE
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white print:text-black tracking-tight">
                FASOMATRIX
              </h1>
              <p className="text-base sm:text-lg text-slate-300 print:text-gray-700 font-medium mt-1">
                Manuel Complet de Fonctionnement & des 12 Fonctionnalités du Système
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-gray-600 font-mono hidden sm:block">
              <div>Version 3.0 • Jour 3 Validé</div>
              <div>Concours Cybersécurité 2026-2027</div>
              <div>Licence AGPL-3.0 Souveraine</div>
            </div>
          </div>
        </div>

        {/* SECTION 1: PRÉSENTATION & MÉCANIQUE INTERNE */}
        {(activeSection === 'all' || activeSection === 'archi') && (
          <section className="space-y-6 mb-12">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                1
              </span>
              <h2 className="text-xl font-bold text-white print:text-black">
                Présentation Générale & Mécanique de Fonctionnement
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl print:bg-gray-50 print:border-gray-300">
                <h3 className="text-sm font-bold text-emerald-400 print:text-emerald-800 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Qu'est-ce que FasoMatrix ?
                </h3>
                <p className="text-xs text-slate-300 print:text-gray-700 leading-relaxed">
                  FasoMatrix est une plateforme souveraine de messagerie instantanée durcie et de traçabilité opérationnelle. Elle élimine toute dépendance vis-à-vis des serveurs cloud étrangers (WhatsApp, Telegram, Teams) et garantit que les communications gouvernementales et militaires du Burkina Faso restent strictement hébergées sur le sol national sous chiffrement de bout en bout inviolable.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl print:bg-gray-50 print:border-gray-300">
                <h3 className="text-sm font-bold text-amber-400 print:text-amber-800 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Le Principe du Zero-Knowledge Server
                </h3>
                <p className="text-xs text-slate-300 print:text-gray-700 leading-relaxed">
                  Le serveur central (Synapse) fonctionne en <strong>serveur aveugle</strong> : il achemine les paquets mais n'a <em>jamais</em> connaissance du texte en clair, ni des clés de chiffrement de session Megolm. Même en cas de saisie physique du serveur ou d'accès root malveillant, un attaquant ne trouve que des blocs chiffrés indéchiffrables.
                </p>
              </div>
            </div>

            {/* CYCLE DE VIE D'UN MESSAGE */}
            <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-xl print:bg-gray-50 print:border-gray-300 space-y-4">
              <h3 className="text-sm font-bold text-white print:text-black uppercase tracking-wider">
                Le Cycle de Vie d'un Ordre Chiffré (Étape par Étape)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg print:bg-white print:border-gray-200">
                  <div className="text-emerald-400 font-bold mb-1">1. Clés Locales</div>
                  <p className="text-slate-400 print:text-gray-600">
                    L'agent génère sa paire de clés Curve25519 sur son terminal. La clé privée ne quitte jamais l'appareil.
                  </p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg print:bg-white print:border-gray-200">
                  <div className="text-emerald-400 font-bold mb-1">2. Chiffrement Local</div>
                  <p className="text-slate-400 print:text-gray-600">
                    Le message est chiffré avant émission avec Megolm. Seuls les membres autorisés du salon ont la clé.
                  </p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg print:bg-white print:border-gray-200">
                  <div className="text-emerald-400 font-bold mb-1">3. Acheminement Aveugle</div>
                  <p className="text-slate-400 print:text-gray-600">
                    Synapse transmet un événement m.room.encrypted opaque. Aucun clair dans les logs ou en base PostgreSQL.
                  </p>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg print:bg-white print:border-gray-200">
                  <div className="text-emerald-400 font-bold mb-1">4. Accusé SHA-256</div>
                  <p className="text-slate-400 print:text-gray-600">
                    Le destinataire valide la réception en envoyant le hash SHA-256 du ciphertext au bot d'audit.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: CATALOGUE DES 12 FONCTIONNALITÉS */}
        {(activeSection === 'all' || activeSection === 'features') && (
          <section className="space-y-6 mb-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  2
                </span>
                <h2 className="text-xl font-bold text-white print:text-black">
                  Catalogue Exhaustif des 12 Fonctionnalités du Système
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono print:text-gray-600">12 / 12 Déployées & Auditées</span>
            </div>

            <div className="space-y-4">
              {features.map((f) => (
                <div
                  key={f.num}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-5 hover:border-slate-700 transition print:bg-white print:border-gray-300 print:break-inside-avoid"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 text-slate-200 font-mono font-bold text-xs flex items-center justify-center print:bg-gray-100 print:text-black">
                        #{f.num}
                      </span>
                      <h3 className="text-base font-bold text-white print:text-black">{f.title}</h3>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${f.badgeColor} print:border-gray-400 print:text-black`}>
                      {f.badge}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-emerald-400 print:text-emerald-800 mb-2">
                    🎯 Rôle opérationnel : {f.role}
                  </p>

                  <p className="text-xs text-slate-300 print:text-gray-700 leading-relaxed mb-3">
                    {f.desc}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-3 border-t border-slate-800/60 print:border-gray-200">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 print:bg-gray-50 print:border-gray-200">
                      <span className="text-amber-400 font-semibold block mb-0.5 print:text-amber-800">
                        🛡️ Garantie de Sécurité Souveraine :
                      </span>
                      <span className="text-slate-400 print:text-gray-600">{f.secret}</span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 font-mono print:bg-gray-50 print:border-gray-200">
                      <span className="text-emerald-400 font-semibold block mb-0.5 print:text-emerald-800">
                        💻 Commande / Déclencheur :
                      </span>
                      <span className="text-slate-300 print:text-gray-700 break-all">{f.command}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: MATRICE DES RÔLES & PERMISSIONS */}
        {(activeSection === 'all' || activeSection === 'roles') && (
          <section className="space-y-6 mb-12 print:break-inside-avoid">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                3
              </span>
              <h2 className="text-xl font-bold text-white print:text-black">
                Matrice des Rôles et des Permissions Opérationnelles
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-800 print:border-gray-300">
                <thead>
                  <tr className="bg-slate-950 text-slate-200 font-semibold print:bg-gray-100 print:text-black">
                    <th className="p-3 border border-slate-800 print:border-gray-300">Fonctionnalité Système</th>
                    <th className="p-3 border border-slate-800 print:border-gray-300 text-center">Agent de Terrain</th>
                    <th className="p-3 border border-slate-800 print:border-gray-300 text-center">Superviseur</th>
                    <th className="p-3 border border-slate-800 print:border-gray-300 text-center">Administrateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {roleMatrix.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-950/40 print:hover:bg-transparent">
                      <td className="p-3 font-medium text-slate-300 print:text-gray-800 border border-slate-800 print:border-gray-300">
                        {r.feature}
                      </td>
                      <td className="p-3 text-center border border-slate-800 print:border-gray-300">
                        {r.agent === true ? (
                          <span className="text-emerald-400 font-bold">✅ Autorisé</span>
                        ) : (
                          <span className="text-slate-500">❌ Non</span>
                        )}
                      </td>
                      <td className="p-3 text-center border border-slate-800 print:border-gray-300">
                        {typeof r.super === 'string' ? (
                          <span className="text-amber-400 font-bold">{r.super}</span>
                        ) : r.super ? (
                          <span className="text-emerald-400 font-bold">✅ Autorisé</span>
                        ) : (
                          <span className="text-slate-500">❌ Non</span>
                        )}
                      </td>
                      <td className="p-3 text-center border border-slate-800 print:border-gray-300">
                        {typeof r.admin === 'string' ? (
                          <span className="text-red-400 font-bold">{r.admin}</span>
                        ) : r.admin ? (
                          <span className="text-emerald-400 font-bold">✅ Autorisé</span>
                        ) : (
                          <span className="text-slate-500">❌ Non</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* SECTION 4: GUIDE OPÉRATIONNEL RAPIDE & SCRIPTS */}
        {(activeSection === 'all' || activeSection === 'commands') && (
          <section className="space-y-6 print:break-inside-avoid">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                4
              </span>
              <h2 className="text-xl font-bold text-white print:text-black">
                Aide-Mémoire des Commandes Administrateur & Démo
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="text-amber-400 font-bold print:text-amber-800">1. Initialisation des Salons Jour 3</div>
                <div className="text-slate-400 print:text-gray-600 text-[11px]">Crée #actes-service, #actes-coordination et enrôle les bots</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200 border border-slate-800 select-all print:bg-white print:text-black">
                  .\scripts\seed_acte_demo.ps1
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="text-amber-400 font-bold print:text-amber-800">2. Émission d'un Acte de Service</div>
                <div className="text-slate-400 print:text-gray-600 text-[11px]">Émet un ordre chiffré avec deadline à 2 minutes</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200 border border-slate-800 select-all print:bg-white print:text-black">
                  .\scripts\send_acte.ps1 -Expediteur agent1 -Destinataire @agent2:localhost -Objet "Ordre Alpha" -Corps "Mission Nord" -Deadline "+2m"
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="text-emerald-400 font-bold print:text-emerald-800">3. Acquittement Probant SHA-256</div>
                <div className="text-slate-400 print:text-gray-600 text-[11px]">Calcule le hash du ciphertext et valide l'accusé</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200 border border-slate-800 select-all print:bg-white print:text-black">
                  .\scripts\send_ack.ps1 -ActeId ACTE-... -Agent agent2 -Status lu
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="text-emerald-400 font-bold print:text-emerald-800">4. Consultation de la Main Courante</div>
                <div className="text-slate-400 print:text-gray-600 text-[11px]">Affiche le statut de tous les actes et expirations</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200 border border-slate-800 select-all print:bg-white print:text-black">
                  .\scripts\list_actes.ps1
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="text-indigo-400 font-bold print:text-indigo-800">5. Délégation Temporaire (Suppléance)</div>
                <div className="text-slate-400 print:text-gray-600 text-[11px]">Crée un sous-salon isolé sans historique</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200 border border-slate-800 select-all print:bg-white print:text-black">
                  .\scripts\delegate_role.ps1 -Admin admin -Suppleant @agent3:localhost -Duree 24h -Scope "Permanence"
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 print:bg-gray-50 print:border-gray-300">
                <div className="text-red-400 font-bold print:text-red-800">6. Révocation Atomique d'un Agent</div>
                <div className="text-slate-400 print:text-gray-600 text-[11px]">Désactive le compte et détruit les sessions en &lt; 1s</div>
                <div className="bg-slate-900 p-2 rounded text-slate-200 border border-slate-800 select-all print:bg-white print:text-black">
                  .\scripts\revoke_user.ps1 -TargetUser @agent2:localhost
                </div>
              </div>
            </div>
          </section>
        )}

        {/* DOCUMENT FOOTER */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 print:text-gray-600 print:border-gray-300">
          <p className="font-semibold text-slate-400 print:text-black">
            FASOMATRIX • SYSTÈME RÉGALIEN DE COMMUNICATIONS SÉCURISÉES • BURKINA FASO
          </p>
          <p className="mt-1">
            Documentation officielle de référence • Équipe Vibe Coders • Concours National de Cybersécurité 2026-2027
          </p>
        </div>
      </div>
    </div>
  );
}
