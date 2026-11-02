import { useState } from 'react';
import {
  BookOpen,
  Printer,
  Copy,
  Check,
  Download,
  Shield,
  Layers,
  Network,
  Lock,
  Calendar,
  EyeOff,
  HelpCircle,
  Bookmark,
  Sparkles,
  ChevronRight,
  Server,
  Database,
  Terminal,
  CheckCircle2,
  FileText,
  FileDown,
} from 'lucide-react';
import { PROJECT_FILES } from '../data/projectFiles.ts';

export default function PedagogicalGuide() {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('intro');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const guideFile = PROJECT_FILES.find(f => f.name === 'GUIDE_PEDAGOGIQUE_APPRENTISSAGE.md');
    const content = guideFile ? guideFile.content : (document.getElementById('pedagogical-content')?.innerText || '');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GUIDE_PEDAGOGIQUE_APPRENTISSAGE.md';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const handleCopyMarkdown = () => {
    const guideFile = PROJECT_FILES.find(f => f.name === 'GUIDE_PEDAGOGIQUE_APPRENTISSAGE.md');
    const content = guideFile ? guideFile.content : (document.getElementById('pedagogical-content')?.innerText || '');
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8 print:m-0 print:p-0">
      {/* Top Header & Export Banner (Masqué à l'impression) */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/30 rounded-2xl p-6 shadow-xl print:hidden flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              GUIDE D'APPRENTISSAGE & DE SOUTENACE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              DE "VIBE CODER" À EXPERT CONFIANT
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Le Grand Guide Pédagogique du Système FasoMatrix</span>
          </h2>
          <p className="text-slate-300 text-sm max-w-3xl mt-1 leading-relaxed">
            Tout ce qu'il faut savoir, comprendre et expliquer simplement à un jury ou à un professeur. Des analogies de la vie réelle, zéro jargon incompréhensible, et les réponses parfaites aux questions pièges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            title="Télécharger directement ce guide au format Markdown (.md)"
          >
            {downloaded ? <Check className="w-4 h-4 text-white" /> : <FileDown className="w-4 h-4 text-white" />}
            <span>{downloaded ? 'Téléchargé !' : 'Télécharger (.md)'}</span>
          </button>

          <a
            href="/mon-projet.zip"
            download="mon-projet-fasomatrix.zip"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            title="Télécharger l'archive ZIP complète avec tous les fichiers"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Télécharger tout (.zip)</span>
          </a>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition"
            title="Générer un PDF propre via la boîte d'impression du navigateur"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / PDF</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Copié !' : 'Copier texte'}</span>
          </button>
        </div>
      </div>

      {/* Sommaire Rapide (Masqué à l'impression) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 print:hidden">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          <span>Accès Rapide aux 8 Chapitres</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <a href="#ch1" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-emerald-400">Ch. 1</span>
            <span className="truncate">La Poste Secrète</span>
          </a>
          <a href="#ch2" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-emerald-400">Ch. 2</span>
            <span className="truncate">Les 5 Conteneurs</span>
          </a>
          <a href="#ch3" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-emerald-400">Ch. 3</span>
            <span className="truncate">Réseau & Tunnels</span>
          </a>
          <a href="#ch4" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-emerald-400">Ch. 4</span>
            <span className="truncate">Crypto & Hash SHA-256</span>
          </a>
          <a href="#ch5" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-amber-400">Ch. 5</span>
            <span className="truncate">Parcours des 3 Jours</span>
          </a>
          <a href="#ch6" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-amber-400">Ch. 6</span>
            <span className="truncate">Le Bot Aveugle</span>
          </a>
          <a href="#ch7" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-indigo-400">Ch. 7</span>
            <span className="truncate">Cheat Sheet Oral (Jury)</span>
          </a>
          <a href="#ch8" className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800/80 text-slate-300 hover:text-white transition flex items-center gap-2">
            <span className="font-bold text-indigo-400">Ch. 8</span>
            <span className="truncate">Lexique Facile</span>
          </a>
        </div>
      </div>

      {/* DOCUMENT PRINCIPAL (Stylé pour écran sombre ET impression papier blanc) */}
      <div
        id="pedagogical-content"
        className="bg-slate-900 print:bg-white border border-slate-800 print:border-none rounded-2xl p-6 sm:p-10 shadow-xl space-y-12 text-slate-200 print:text-black leading-relaxed font-sans"
      >
        {/* En-tête officiel imprimable */}
        <div className="border-b-2 border-slate-800 print:border-black pb-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 print:text-gray-600 uppercase tracking-widest">
            <span>RÉPUBLIQUE DU BURKINA FASO</span>
            <span>HACKATHON CYBERSÉCURITÉ 2026-2027</span>
          </div>
          <h1 className="text-3xl font-black text-white print:text-black tracking-tight">
            FasoMatrix : Manuel de Référence Pédagogique & Technique
          </h1>
          <p className="text-sm text-slate-300 print:text-gray-700 italic">
            Comprendre l'architecture, la cryptographie E2EE, la conteneurisation et savoir expliquer le projet avec clarté et assurance.
          </p>
        </div>

        {/* MOT D'ENCOURAGEMENT AUX VIBE CODERS */}
        <div className="p-5 bg-indigo-950/40 print:bg-gray-100 rounded-xl border border-indigo-800/40 print:border-gray-300 space-y-2">
          <h3 className="font-bold text-indigo-300 print:text-indigo-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Message pour l'Équipe : Vous êtes de véritables bâtisseurs !
          </h3>
          <p className="text-xs text-slate-300 print:text-gray-800 leading-relaxed">
            Ce n'est pas parce que vous vous considérez comme des « vibe coders » que vous n'avez pas accompli quelque chose d'impressionnant. Ce système déploie des standards de pointe utilisés par des gouvernements européens (Tchap en France, Bundeswehr en Allemagne). Ce guide est là pour vous donner le vocabulaire des pros afin que votre soutenance brille devant les jurés les plus exigeants.
          </p>
        </div>

        {/* CHAPITRE 1 : ANALOGIE DE LA POSTE SECRÈTE */}
        <section id="ch1" className="space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400 print:text-emerald-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <Shield className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 1 : L'analogie de la Poste Secrète (Comprendre en 2 min)
            </h2>
          </div>

          <p className="text-sm">
            Imaginez que le Ministère de la Défense burkinabè veuille envoyer un ordre confidentiel à une garnison située à Bobo-Dioulasso.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border border-rose-900/40 print:border-red-300 space-y-2">
              <div className="font-bold text-rose-400 print:text-red-700 text-sm">
                ❌ Dans le monde ordinaire (WhatsApp / Telegram / Email)
              </div>
              <p className="text-slate-300 print:text-gray-700">
                Vous donnez votre lettre ouverte à un facteur étranger (les serveurs de Meta ou Google). Le facteur regarde à l'intérieur, indexe les mots-clés, et s'il décide de fermer le service ou s'il se fait pirater, vos secrets d'État sont exposés ou perdus.
              </p>
            </div>

            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border border-emerald-900/40 print:border-emerald-300 space-y-2">
              <div className="font-bold text-emerald-400 print:text-emerald-700 text-sm">
                ✅ Dans FasoMatrix (Zero-Knowledge & Megolm)
              </div>
              <p className="text-slate-300 print:text-gray-700">
                L'officier enferme son ordre dans une <strong>boîte blindée scellée avec un cadenas spécial</strong> sur son propre téléphone avant même de l'envoyer. Le serveur Synapse est un <strong>facteur aveugle</strong> : il transporte la boîte en regardant juste l'étiquette extérieure. Seul le destinataire détient la clé mathématique. Même le créateur du serveur ne peut pas lire le message !
              </p>
            </div>
          </div>
        </section>

        {/* CHAPITRE 2 : LES 5 BRIQUES DOCKER */}
        <section id="ch2" className="space-y-4">
          <div className="flex items-center gap-2.5 text-sky-400 print:text-sky-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <Layers className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 2 : Les 5 Briques du Système (Qui fait quoi ?)
            </h2>
          </div>

          <p className="text-sm">
            Votre projet utilise <strong>Docker Compose</strong>. Considérez Docker comme un porte-conteneurs : chaque programme vit dans sa boîte hermétique sans déranger les autres.
          </p>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-950 print:bg-sky-100 text-sky-400 print:text-sky-800 flex items-center justify-center shrink-0 font-bold">1</div>
              <div>
                <h4 className="font-bold text-white print:text-black text-sm">NGINX (Le Portier & Vigile)</h4>
                <p className="text-slate-300 print:text-gray-700 mt-1">
                  C'est la porte d'entrée unique de la forteresse. Il accueille les connexions sur le port 80, applique les en-têtes de sécurité stricts (anti-clicjacking), et bloque les attaques bruteforce (5 tentatives max par minute sur le login).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-950 print:bg-amber-100 text-amber-400 print:text-amber-800 flex items-center justify-center shrink-0 font-bold">2</div>
              <div>
                <h4 className="font-bold text-white print:text-black text-sm">Matrix Synapse (Le Cerveau & Routeur)</h4>
                <p className="text-slate-300 print:text-gray-700 mt-1">
                  C'est le serveur Matrix souverain. Il gère l'annuaire des officiers, orchestre les salons et relaie les événements. La fédération est coupée (<code className="text-amber-400">allow_federation: false</code>) : aucun octet ne s'échappe vers l'extérieur.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 print:bg-emerald-100 text-emerald-400 print:text-emerald-800 flex items-center justify-center shrink-0 font-bold">3</div>
              <div>
                <h4 className="font-bold text-white print:text-black text-sm">PostgreSQL (Le Coffre de Mémoire)</h4>
                <p className="text-slate-300 print:text-gray-700 mt-1">
                  Base de données relationnelle sécurisée. Elle stocke les messages sous leur forme chiffrée. Elle est isolée dans un réseau interne Docker (<code className="text-emerald-400">matrix_internal</code>) : personne sur Internet ne peut l'attaquer directement.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 print:bg-indigo-100 text-indigo-400 print:text-indigo-800 flex items-center justify-center shrink-0 font-bold">4</div>
              <div>
                <h4 className="font-bold text-white print:text-black text-sm">Element Web (Le Terminal de l'Agent)</h4>
                <p className="text-slate-300 print:text-gray-700 mt-1">
                  L'application officielle pour ordinateur et navigateur qui permet aux agents d'échanger, d'activer leur trousseau de clés de sécurité et de dialoguer.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-950 print:bg-rose-100 text-rose-400 print:text-rose-800 flex items-center justify-center shrink-0 font-bold">5</div>
              <div>
                <h4 className="font-bold text-white print:text-black text-sm">Le Bot d'Escalade (Le Chronomètre Régalien - Jour 3)</h4>
                <p className="text-slate-300 print:text-gray-700 mt-1">
                  Un programme Python autonome qui surveille les délais des ordres de mission. Si l'accusé de réception n'arrive pas à temps, il déclenche l'escalade vers le commandement sans jamais avoir pu lire le contenu de l'ordre.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CHAPITRE 3 : RÉSEAU, LOCALHOST ET TUNNELS */}
        <section id="ch3" className="space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 print:text-amber-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <Network className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 3 : Réseau, Ports & Tunnels (Cloudflare / Ngrok)
            </h2>
          </div>

          <div className="space-y-2 text-sm text-slate-300 print:text-gray-700">
            <p>
              <strong>Pourquoi mon téléphone ne peut pas taper "localhost" ?</strong><br />
              <code className="text-amber-400">localhost</code> signifie « moi-même ». Sur votre PC, cela vise le PC. Mais si vous tapez cela sur votre téléphone, votre téléphone cherche le serveur sur lui-même et échoue.
            </p>
            <p>
              <strong>Le rôle magique du Tunnel :</strong><br />
              Votre box ou connexion 4G à Ouagadougou ne possède pas d'adresse IP publique fixe. Le tunnel (<code className="text-emerald-400">ngrok</code> ou <code className="text-emerald-400">cloudflared</code>) crée un pont chiffré sortant depuis votre PC vers le monde entier.
            </p>
            <div className="p-3 bg-slate-950 print:bg-gray-100 rounded-lg font-mono text-xs text-emerald-300 print:text-emerald-800">
              Smartphone (Application Element) ──[HTTPS]──&gt; ngrok-free.dev ──[Tunnel Sécurisé]──&gt; Votre PC (Port 80 Nginx)
            </div>
          </div>
        </section>

        {/* CHAPITRE 4 : LA CRYPTOGRAPHIE EXPLIQUÉE */}
        <section id="ch4" className="space-y-4">
          <div className="flex items-center gap-2.5 text-purple-400 print:text-purple-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 4 : La Magie de la Cryptographie (Olm, Megolm & SHA-256)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-2">
              <h4 className="font-bold text-purple-400 print:text-purple-900 text-sm">1. Olm (Double Ratchet)</h4>
              <p className="text-slate-300 print:text-gray-700">
                Utilisé pour les conversations directes 1-à-1. À chaque message échangé, les clés changent comme les crans d'une roue dentée. Si un espion trouve la clé d'un message, elle ne lui sert à rien pour lire le message suivant.
              </p>
            </div>

            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-2">
              <h4 className="font-bold text-purple-400 print:text-purple-900 text-sm">2. Megolm (Chiffrement de Salon)</h4>
              <p className="text-slate-300 print:text-gray-700">
                Protocole de groupe haute performance. L'émetteur avance sa clé à chaque ordre. Un nouvel arrivant ne peut voir que les nouveaux messages : <strong>l'historique passé reste indéchiffrable</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-2">
              <h4 className="font-bold text-purple-400 print:text-purple-900 text-sm">3. L'empreinte SHA-256</h4>
              <p className="text-slate-300 print:text-gray-700">
                Une empreinte digitale mathématique unique de 64 caractères. Si vous changez ne serait-ce qu'une lettre dans l'ordre de mission, toute l'empreinte change. C'est elle qui valide l'accusé de réception.
              </p>
            </div>
          </div>
        </section>

        {/* CHAPITRE 5 : LES 3 JOURS DU HACKATHON */}
        <section id="ch5" className="space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 print:text-amber-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 5 : Le Récit des 3 Jours du Hackathon
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border-l-4 border-emerald-500 space-y-1.5">
              <div className="font-bold text-emerald-400 print:text-emerald-800 text-sm">Jour 1 : La Forteresse Locale & Zéro Inscription Libre</div>
              <p className="text-slate-300 print:text-gray-700">
                Déploiement complet en conteneurs. Inscription publique coupée (<code className="text-emerald-400">enable_registration: false</code>). Audit avec <code className="text-emerald-400">verify_no_cleartext.sh</code> certifiant qu'aucun secret n'apparaît en clair dans les bases SQL.
              </p>
            </div>

            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border-l-4 border-indigo-500 space-y-1.5">
              <div className="font-bold text-indigo-400 print:text-indigo-800 text-sm">Jour 2 : Révocation Foudroyante & Résilience</div>
              <p className="text-slate-300 print:text-gray-700">
                Si un agent perd son téléphone, la commande de révocation atomique (<code className="text-indigo-400">deactivate</code>) coupe instantanément tous ses appareils, révoque ses jetons d'accès et l'expulse de tous les salons. Sauvegarde chiffrée AES-256 et purge historique RGPD.
              </p>
            </div>

            <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border-l-4 border-amber-500 space-y-1.5">
              <div className="font-bold text-amber-400 print:text-amber-800 text-sm">Jour 3 : Les Deux Grandes Innovations Régaliennes</div>
              <p className="text-slate-300 print:text-gray-700">
                <strong>1. Acte de Service :</strong> Ordre émis avec deadline, accusé certifié par SHA-256 et escalade automatique vers le superviseur si le destinataire ne répond pas.<br />
                <strong>2. Suppléance Chiffrée :</strong> Délégation temporaire avec création automatique d'un sous-salon isolé garantissant que le suppléant n'a aucun accès aux anciens messages secrets.
              </p>
            </div>
          </div>
        </section>

        {/* CHAPITRE 6 : LE SECRET DU BOT AVEUGLE */}
        <section id="ch6" className="space-y-4">
          <div className="flex items-center gap-2.5 text-rose-400 print:text-rose-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <EyeOff className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 6 : Le Secret du "Bot Aveugle" (Blind Bot)
            </h2>
          </div>

          <div className="p-4 bg-slate-950 print:bg-gray-50 rounded-xl border border-rose-900/40 print:border-rose-300 text-xs space-y-2">
            <h4 className="font-bold text-rose-400 print:text-rose-800 text-sm">
              Pourquoi le jury va adorer votre architecture ?
            </h4>
            <p className="text-slate-300 print:text-gray-700 leading-relaxed">
              Dans la plupart des projets concurrents, les développeurs invitent leur bot dans le salon secret pour qu'il lise les messages. <strong>C'est une faille critique de sécurité</strong> car si le bot est piraté, les secrets d'État sont volés !
            </p>
            <p className="text-slate-300 print:text-gray-700 leading-relaxed">
              Dans FasoMatrix, <strong>le bot est AVEUGLE</strong> :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 print:text-gray-700">
              <li>Le bot n'a <strong>jamais le droit</strong> de rejoindre le salon chiffré <code className="text-amber-400">#actes-service</code>.</li>
              <li>Il ne possède aucune clé Megolm.</li>
              <li>Il n'écoute que le salon technique <code className="text-amber-400">#actes-coordination</code> où ne circulent que 3 informations anonymes : l'ID de l'acte, la date limite et le destinataire.</li>
              <li>Il surveille le temps sans jamais savoir ce qui est écrit dans l'ordre !</li>
            </ul>
          </div>
        </section>

        {/* CHAPITRE 7 : CHEAT SHEET POUR L'ORAL */}
        <section id="ch7" className="space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-400 print:text-indigo-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <HelpCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 7 : "Cheat Sheet" pour l'Oral (6 Questions du Jury)
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-1">
              <div className="font-bold text-amber-300 print:text-amber-900">
                Q1 : « Pourquoi avoir utilisé Matrix et pas développé votre propre messagerie en Python/Node ? »
              </div>
              <div className="text-slate-300 print:text-gray-800 italic">
                👉 Réponse : « En cybersécurité, on n'invente jamais sa propre cryptographie. Matrix est un standard ouvert souverain internationalement audité, utilisé par la France et l'Allemagne. Nous avons capitalisé sur des primitives solides pour nous concentrer sur la conformité régalienne. »
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-1">
              <div className="font-bold text-amber-300 print:text-amber-900">
                Q2 : « Si quelqu'un vole le mot de passe d'un agent révoqué, peut-il lire les anciens messages ? »
              </div>
              <div className="text-slate-300 print:text-gray-800 italic">
                👉 Réponse : « Non, car notre procédure de désactivation détruit immédiatement toutes les sessions actives et les clés cryptographiques de ses appareils sur le serveur. Il est expulsé de tous les salons. »
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-1">
              <div className="font-bold text-amber-300 print:text-amber-900">
                Q3 : « Pourquoi vérifier le hash SHA-256 dans l'accusé de réception ? »
              </div>
              <div className="text-slate-300 print:text-gray-800 italic">
                👉 Réponse : « Un accusé ordinaire ne prouve rien. L'empreinte SHA-256 est calculée sur le ciphertext chiffré reçu : elle prouve mathématiquement et de manière non répudiable que l'agent a reçu les octets exacts de l'ordre sans aucune altération en transit. »
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-1">
              <div className="font-bold text-amber-300 print:text-amber-900">
                Q4 : « Comment garantissez-vous que le suppléant ne voit pas l'historique d'avant sa mission ? »
              </div>
              <div className="text-slate-300 print:text-gray-800 italic">
                👉 Réponse : « Par deux verrous : d'une part l'isolation dans un sous-salon dédié (#actes-delegation), et d'autre part le cliquet cryptographique Megolm qui n'envoie les clés de déchiffrement qu'à partir de l'adhésion de l'agent. »
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-1">
              <div className="font-bold text-amber-300 print:text-amber-900">
                Q5 : « Si le serveur tombe en panne de courant, que deviennent les délais ? »
              </div>
              <div className="text-slate-300 print:text-gray-800 italic">
                👉 Réponse : « Notre main courante et nos registres de délégation sont persistés sur disque au format JSONL. Au redémarrage, le bot recharge tout en mémoire de façon idempotente et traite immédiatement les actes expirés pendant la coupure. »
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 print:bg-gray-50 rounded-xl border border-slate-800 print:border-gray-300 space-y-1">
              <div className="font-bold text-amber-300 print:text-amber-900">
                Q6 : « Le système est-il dépendant de Cloudflare ou Ngrok en production ? »
              </div>
              <div className="text-slate-300 print:text-gray-800 italic">
                👉 Réponse : « Absolument pas. Les tunnels ont été employés uniquement pour faciliter les tests mobiles lors du hackathon. En production régalienne, la pile tourne en local sur le réseau ministériel ou le datacenter national (RESINA) sans aucun tiers. »
              </div>
            </div>
          </div>
        </section>

        {/* CHAPITRE 8 : LEXIQUE DES TERMES */}
        <section id="ch8" className="space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400 print:text-emerald-800 border-b border-slate-800 print:border-gray-300 pb-2">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white print:text-black">
              Chapitre 8 : Lexique des Termes Essentiels
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-gray-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black uppercase text-[10px] border-b border-slate-800 print:border-gray-300">
                <tr>
                  <th className="py-2.5 px-3">Terme Technique</th>
                  <th className="py-2.5 px-3">Explication Simple pour l'Oral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400 print:text-emerald-900">E2EE</td>
                  <td className="py-2.5 px-3 text-slate-300 print:text-gray-800">Chiffrement de bout en bout : seuls les deux téléphones qui discutent peuvent lire. Le serveur est aveugle.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400 print:text-emerald-900">Zero-Knowledge</td>
                  <td className="py-2.5 px-3 text-slate-300 print:text-gray-800">Le serveur transporte la boîte sans rien savoir de ce qu'il y a à l'intérieur.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400 print:text-emerald-900">Reverse Proxy</td>
                  <td className="py-2.5 px-3 text-slate-300 print:text-gray-800">Le garde du corps (NGINX) qui filtre les attaques avant de laisser passer les requêtes vers l'application.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400 print:text-emerald-900">Hash SHA-256</td>
                  <td className="py-2.5 px-3 text-slate-300 print:text-gray-800">Une empreinte digitale informatique infalsifiable et irréversible de 64 caractères.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400 print:text-emerald-900">Idempotence</td>
                  <td className="py-2.5 px-3 text-slate-300 print:text-gray-800">Un programme qu'on peut exécuter 10 fois sans que cela ne plante ni ne crée de doublons.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400 print:text-emerald-900">JSONL</td>
                  <td className="py-2.5 px-3 text-slate-300 print:text-gray-800">Un fichier texte où chaque ligne est un événement complet. Idéal pour une main courante inaltérable.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer officiel imprimable */}
        <div className="pt-8 border-t border-slate-800 print:border-gray-400 text-center text-xs text-slate-500 print:text-gray-600 space-y-1">
          <div>Projet FasoMatrix • Messagerie Souveraine Régaliènne du Burkina Faso</div>
          <div>Conçu pour l'apprentissage, la soutenance orale et l'autonomie technologique • Licence AGPL-3.0</div>
        </div>
      </div>
    </div>
  );
}
