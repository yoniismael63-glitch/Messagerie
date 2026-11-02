import { useState } from 'react';
import {
  FileText,
  Users,
  ShieldAlert,
  GitBranch,
  Video,
  Copy,
  Check,
  Download,
  ExternalLink,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { PROJECT_FILES } from '../data/projectFiles.ts';

export default function HackathonDossier() {
  const [activePiece, setActivePiece] = useState<number>(2);
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (text: string, pieceNum: number) => {
    navigator.clipboard.writeText(text);
    setCopied(pieceNum);
    setTimeout(() => setCopied(null), 2500);
  };

  const piecesMeta = [
    {
      num: 2,
      title: 'Note de pré-projet',
      file: '02_NOTE_DE_PRE_PROJET.md',
      desc: 'Deux (02) pages max : concept, architecture, chiffrement retenu, open source, licences, innovations régaliennes.',
      icon: FileText,
      badge: 'Max 2 pages',
    },
    {
      num: 3,
      title: 'Note de sécurité',
      file: '03_NOTE_DE_SECURITE.md',
      desc: 'Deux (02) pages max : menaces, protections, métadonnées visibles, limites connues et modèle régalien.',
      icon: ShieldAlert,
      badge: 'Max 2 pages',
    },
    {
      num: 4,
      title: 'Dépôt public',
      file: '04_GUIDE_DEPOT_GIT.md',
      desc: 'Lien vers dépôt Git public (GitHub/GitLab/Codeberg) avec historique de commits progressifs sur 3 jours.',
      icon: GitBranch,
      badge: 'Git Public',
    },
    {
      num: 5,
      title: 'Vidéo de démonstration',
      file: '05_STORYBOARD_VIDEO_3MIN.md',
      desc: 'Trois (03) minutes max : échange chiffré, révocation multi-appareils, acte de service, hash SHA-256 et suppléance.',
      icon: Video,
      badge: 'Max 3 minutes',
    },
  ];

  // Trouver le contenu du fichier dans PROJECT_FILES
  const currentMeta = piecesMeta.find(p => p.num === activePiece) || piecesMeta[0];
  const currentProjectFile = PROJECT_FILES.find(f => f.name === currentMeta.file);
  const fileContent = currentProjectFile ? currentProjectFile.content : 'Fichier non trouvé.';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              DOSSIER TECHNIQUE OFFICIEL
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              4 PIÈCES TECHNIQUES CONFORMES
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Dossier Technique de Soumission — Hackathon 2026-2027</span>
          </h2>
          <p className="text-slate-300 text-sm max-w-3xl mt-1 leading-relaxed">
            L'ensemble des pièces techniques réglementaires requises pour l'évaluation et l'audit officiel de la solution FasoMatrix. Rédigées selon les consignes strictes de format et de sécurité.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/mon-projet.zip"
            download="mon-projet-fasomatrix.zip"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger l'Archive Globale (.zip)</span>
          </a>
        </div>
      </div>

      {/* Navigation entre les 4 pièces */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {piecesMeta.map(p => {
          const Icon = p.icon;
          const isActive = activePiece === p.num;
          return (
            <button
              key={p.num}
              onClick={() => setActivePiece(p.num)}
              className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.num}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 text-amber-300 border border-slate-800">
                  {p.badge}
                </span>
              </div>
              <div className="font-bold text-xs leading-snug">{p.title}</div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">{p.file}</div>
            </button>
          );
        })}
      </div>

      {/* Contenu de la pièce sélectionnée */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              {currentMeta.num}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Pièce {currentMeta.num} : {currentMeta.title}</span>
                <span className="text-xs font-mono font-normal text-slate-400">({currentMeta.file})</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentMeta.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentMeta.file;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
              title="Télécharger cette pièce individuellement"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Télécharger ({currentMeta.file})</span>
            </button>
            <button
              onClick={() => handleCopy(fileContent, currentMeta.num)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
            >
              {copied === currentMeta.num ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied === currentMeta.num ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Visionneuse Markdown textuelle */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
            {fileContent}
          </pre>
        </div>

        {/* Aide au candidat */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Format conforme au tableau officiel d'évaluation du hackathon.</span>
          </div>
          <span className="font-mono text-indigo-300">Emplacement physique : mon-projet/docs/{currentMeta.file}</span>
        </div>
      </div>
    </div>
  );
}
