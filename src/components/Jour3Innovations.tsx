import { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Send,
  Clock,
  Key,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  RotateCcw,
  UserCheck,
  UserX,
  FileText,
  EyeOff,
  Flame,
} from 'lucide-react';
import {
  computeSha256,
  verifyActeAckProof,
  evaluateActeState,
  ActeServiceMetadata,
  DelegationMandat,
} from '../utils/acteServiceLogic.ts';

interface Jour3InnovationsProps {
  osType: 'windows' | 'linux';
}

export default function Jour3Innovations({ osType }: Jour3InnovationsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Innovation 1 - Acte de Service State
  const [expediteur, setExpediteur] = useState('agent1');
  const [destinataire, setDestinataire] = useState('@agent2:localhost');
  const [objet, setObjet] = useState('Ordre d\'intervention Alpha');
  const [corps, setCorps] = useState('Déploiement immédiat de l\'équipe de surveillance sur le secteur Nord.');
  const [deadlineMinutes, setDeadlineMinutes] = useState(2);
  const [actesList, setActesList] = useState<ActeServiceMetadata[]>([
    {
      acte_id: 'ACTE-20261102-0945-88A1',
      destinataire: '@agent2:localhost',
      expediteur: '@agent1:localhost',
      deadline: new Date(Date.now() + 120000).toISOString(),
      requires_ack: true,
      ack_type: 'sha256_ciphertext',
      room_id: '!actes_service_e2ee:localhost',
      event_id_chiffre: '$event_megolm_enc_9a8b7c6d5e4f3a2b1c0d',
      escalation_level: 0,
      statut: 'envoye',
      horodatage: new Date().toISOString(),
      sha256_ciphertext: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    },
  ]);
  const [selectedActeId, setSelectedActeId] = useState<string>('ACTE-20261102-0945-88A1');
  const [ackSimResult, setAckSimResult] = useState<string | null>(null);

  // Innovation 2 - Suppléance / Délégation State
  const [delegantRole, setDelegantRole] = useState('Directeur de la Sécurité Opérationnelle');
  const [delegataireUser, setDelegataireUser] = useState('@mandjide:localhost');
  const [delegationScope, setDelegationScope] = useState('actes_urgents_defense');
  const [delegationPurpose, setDelegationPurpose] = useState('Suppléance intérimaire mission extérieure (48h)');
  const [delegationHours, setDelegationHours] = useState(24);
  const [delegationsList, setDelegationsList] = useState<DelegationMandat[]>([
    {
      delegation_id: 'DEL-20261102-001',
      delegant_id: '@admin:localhost',
      delegant_role: 'Superviseur Général Sécurité',
      delegataire_id: '@landry:localhost',
      scope: 'actes_permanence_week-end',
      purpose: 'Permanence sécurité week-end',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      expires_at: new Date(Date.now() + 82800000).toISOString(),
      status: 'active',
      sub_room_id: '!actes-delegation-del001:localhost',
    },
  ]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Création d'un nouvel acte chiffré
  const handleSendActe = async () => {
    const acteId = `ACTE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const deadlineIso = new Date(Date.now() + deadlineMinutes * 60000).toISOString();
    
    // Simulation chiffrement Megolm : production d'un ciphertext opaque et calcul SHA-256
    const simulatedRawCiphertext = `MEGOLM_V1_CIPHERTEXT_${Math.random().toString(36).substring(2)}${Date.now()}_payload_${btoa(objet + corps)}`;
    const computedHash = await computeSha256(simulatedRawCiphertext);
    const eventIdChiffre = `$enc_evt_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

    const newActe: ActeServiceMetadata = {
      acte_id: acteId,
      destinataire,
      expediteur: `@${expediteur}:localhost`,
      deadline: deadlineIso,
      requires_ack: true,
      ack_type: 'sha256_ciphertext',
      room_id: '!actes_service_e2ee:localhost',
      event_id_chiffre: eventIdChiffre,
      escalation_level: 0,
      statut: 'envoye',
      horodatage: new Date().toISOString(),
      sha256_ciphertext: computedHash,
    };

    setActesList(prev => [newActe, ...prev]);
    setSelectedActeId(acteId);
    setAckSimResult(`[ACTE ENVOYÉ] Acte ${acteId} émis chiffré dans #actes-service.
→ Hash SHA-256 du ciphertext : ${computedHash}
→ Meta-event minimal publié dans #actes-coordination (Bot aveugle notifié sans accès au clair).`);
  };

  // Simulation Accusé Légitime
  const handleSendValidAck = () => {
    const current = actesList.find(a => a.acte_id === selectedActeId);
    if (!current) return;
    if (current.statut === 'accuse') {
      setAckSimResult(`[INFO] L'acte ${selectedActeId} a déjà fait l'objet d'un accusé.`);
      return;
    }

    const verification = verifyActeAckProof(current.sha256_ciphertext || '', current.sha256_ciphertext || '');
    if (verification.valid) {
      setActesList(prev =>
        prev.map(a =>
          a.acte_id === selectedActeId
            ? {
                ...a,
                statut: 'accuse',
                ack_event_id: `$ack_evt_${Math.random().toString(36).substring(2, 10)}`,
                ack_received_at: new Date().toISOString(),
              }
            : a
        )
      );
      setAckSimResult(`[ACCUSÉ VALIDÉ] Hash SHA-256 conforme certifié par le bot.
→ Statut main courante : 'accuse'. L'échéance est clôturée avec succès.`);
    }
  };

  // Simulation Accusé Frelaté / Corrompu
  const handleSendTamperedAck = () => {
    const current = actesList.find(a => a.acte_id === selectedActeId);
    if (!current) return;

    const fakeHash = '000000000000000000000000000000000000000000000000000000000000dead';
    const verification = verifyActeAckProof(current.sha256_ciphertext || '', fakeHash);

    setAckSimResult(`[ALERTE SÉCURITÉ - REJET FORMEL] ${verification.reason}
→ Tentative d'accusé avec un hash corrompu (${fakeHash.substring(0, 16)}...).
→ Le bot maintient l'acte en attente d'escalade. La sécurité régalienne n'est pas compromise.`);
  };

  // Simulation Dépassement d'échéance et Escalade
  const handleSimulateEscalation = () => {
    const current = actesList.find(a => a.acte_id === selectedActeId);
    if (!current) return;
    if (current.statut === 'accuse') {
      setAckSimResult(`[INFO] L'acte ${selectedActeId} est déjà acquitté. Aucune escalade n'est requise.`);
      return;
    }

    // Déplace la deadline dans le passé
    const pastNow = new Date(Date.now() + 180000);
    const simulatedOverdue = evaluateActeState(
      { ...current, deadline: new Date(Date.now() - 120000).toISOString() },
      pastNow,
      60000
    );

    setActesList(prev =>
      prev.map(a =>
        a.acte_id === selectedActeId
          ? {
              ...a,
              statut: simulatedOverdue.newStatut,
              escalation_level: simulatedOverdue.newLevel,
            }
          : a
      )
    );

    setAckSimResult(`[ESCALADE AUTOMATIQUE ENCLENCHÉE]
→ ${simulatedOverdue.actionNeeded}
→ Notification transmise sans déchiffrement : seul l'identifiant ${selectedActeId} et le destinataire ${current.destinataire} sont exposés.`);
  };

  // Innovation 2 - Créer une Délégation
  const handleCreateDelegation = () => {
    const delId = `DEL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const subRoomId = `!actes-delegation-${delId.toLowerCase()}:localhost`;
    const expiresAt = new Date(Date.now() + delegationHours * 3600000).toISOString();

    const newDel: DelegationMandat = {
      delegation_id: delId,
      delegant_id: '@admin:localhost',
      delegant_role: delegantRole,
      delegataire_id: delegataireUser,
      scope: delegationScope,
      purpose: delegationPurpose,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: 'active',
      sub_room_id: subRoomId,
    };

    setDelegationsList(prev => [newDel, ...prev]);
  };

  // Révocation d'une délégation
  const handleRevokeDelegation = (id: string) => {
    setDelegationsList(prev =>
      prev.map(d =>
        d.delegation_id === id
          ? {
              ...d,
              status: 'revoquee',
              revoked_at: new Date().toISOString(),
              revoked_by: '@admin:localhost',
            }
          : d
      )
    );
  };

  const selectedActe = actesList.find(a => a.acte_id === selectedActeId);

  return (
    <div className="space-y-8">
      {/* Top Banner Jour 3 */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-emerald-950/50 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Flame className="w-36 h-36 text-amber-500" />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                JOUR 3 • DEUX INNOVATIONS COMBINÉES
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100% SOUVERAIN & ZERO-KNOWLEDGE
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Acte de Service Chiffré & Suppléance Régaliennes</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-3xl mt-1 leading-relaxed">
              Dispositif complet de traçabilité régalienne : émission d'actes chiffrés Megolm, accusé probant par empreinte SHA-256 du ciphertext, escalade automatique à 2 niveaux par le bot aveugle, et délégation temporaire avec isolation stricte par sous-salon.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleCopy(osType === 'windows' ? '.\\scripts\\seed_acte_demo.ps1' : './scripts/seed_acte_demo.sh', 'seed_cmd')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
            >
              {copiedKey === 'seed_cmd' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>Initialiser Jour 3 ({osType === 'windows' ? 'PS1' : 'Bash'})</span>
            </button>
          </div>
        </div>
      </div>

      {/* MATRIX DE SÉCURITÉ DU BOT AVEUGLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Matrice de Visibilité & Herméticité du Bot Aveugle</h3>
              <p className="text-xs text-slate-400 font-mono">Principe de moindre privilège absolu (Zero-Knowledge)</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
            Bot Exclu de tout Chiffrement
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950/80 rounded-xl border border-rose-900/40 space-y-2">
            <div className="flex items-center justify-between text-rose-400 font-bold">
              <span>#actes-service</span>
              <span className="px-2 py-0.5 rounded bg-rose-950/80 text-[10px] border border-rose-800">INTERDIT AU BOT</span>
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div>• Chiffrement : <span className="text-emerald-400 font-semibold">Megolm v1 (AES-256 + SHA-256)</span></div>
              <div>• Clés de session : <span className="text-rose-400 font-semibold">0 clé remise au bot</span></div>
              <div>• Membres : <span className="text-slate-200">@agent1, @agent2, @admin</span></div>
              <div className="text-rose-300 pt-1 text-[10px]">
                🛡️ Le bot s'auto-expulse immédiatement s'il reçoit une invitation erronée.
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span>#actes-coordination</span>
              <span className="px-2 py-0.5 rounded bg-amber-950/80 text-[10px] border border-amber-800">BOT MEMBRE</span>
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div>• Chiffrement : <span className="text-slate-400">Non chiffré (m.room.message clair)</span></div>
              <div>• Contenu : <span className="text-amber-300 font-semibold">Métadonnées opaques minimales</span></div>
              <div>• Champs visibles : <span className="text-slate-300">acte_id, destinataire, deadline</span></div>
              <div className="text-amber-300 pt-1 text-[10px]">
                ⚠️ Aucun objet, corps ni classification n'y transite jamais.
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-sky-900/40 space-y-2">
            <div className="flex items-center justify-between text-sky-400 font-bold">
              <span>#actes-admin</span>
              <span className="px-2 py-0.5 rounded bg-sky-950/80 text-[10px] border border-sky-800">CANAL D'ESCALADE</span>
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div>• Destinataire : <span className="text-sky-300">Commandement & Superviseur</span></div>
              <div>• Déclencheur : <span className="text-rose-400 font-semibold">Échéance dépassée sans accusé</span></div>
              <div>• Rôle du bot : <span className="text-slate-200">Alerte N2 avec référence d'acte</span></div>
              <div className="text-sky-300 pt-1 text-[10px]">
                📢 L'alerte mentionne l'acte_id sans jamais divulguer le secret.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INNOVATION 1 : L'ACTE DE SERVICE CHIFFRÉ & ACCUSÉ PROBANT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Innovation 1 : L'Acte de Service Chiffré & Accusé Probant (Hash SHA-256)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Liaison cryptographique non répudiable entre le ciphertext Megolm et l'accusé de réception
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-amber-950 text-amber-300 border border-amber-800">
            Escalade Automatique à 2 Niveaux
          </span>
        </div>

        {/* Formulaire d'émission */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Émettre un Acte de Service Sécurisé
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Expéditeur de l'acte</label>
                <select
                  value={expediteur}
                  onChange={e => setExpediteur(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white"
                >
                  <option value="agent1">@agent1:localhost (Commandement)</option>
                  <option value="admin">@admin:localhost (Administrateur)</option>
                  <option value="landry">@landry:localhost (Officier Landry)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Destinataire nominatif</label>
                <input
                  type="text"
                  value={destinataire}
                  onChange={e => setDestinataire(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Objet de l'instruction (Chiffré de bout en bout)</label>
              <input
                type="text"
                value={objet}
                onChange={e => setObjet(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Corps confidentiel (Protégé Megolm)</label>
              <textarea
                value={corps}
                onChange={e => setCorps(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Délai d'échéance (Deadline)</label>
                <select
                  value={deadlineMinutes}
                  onChange={e => setDeadlineMinutes(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-xs text-amber-300"
                >
                  <option value={1}>1 minute (Test rapide)</option>
                  <option value={2}>2 minutes (Recommandé démo)</option>
                  <option value={5}>5 minutes</option>
                  <option value={60}>1 heure (Opérationnel)</option>
                </select>
              </div>

              <button
                onClick={handleSendActe}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Chiffrer & Émettre l'Acte</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span className="text-emerald-400 font-bold">Commande CLI :</span>
              <code className="text-slate-300 truncate">
                {osType === 'windows' ? '.\\scripts\\send_acte.ps1 -Expediteur agent1 -Destinataire @agent2:localhost' : './scripts/send_acte.sh --expediteur agent1 --destinataire @agent2:localhost'}
              </code>
            </div>
          </div>

          {/* Simulateur d'Accusé Probant et Escalade */}
          <div className="lg:col-span-6 space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Vérification de l'Accusé & Épreuve d'Escalade
                </h4>
                {selectedActe && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    selectedActe.statut === 'accuse' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    selectedActe.statut.includes('escalade') ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    Statut : {selectedActe.statut}
                  </span>
                )}
              </div>

              {selectedActe ? (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="text-slate-400">Acte sélectionné : <span className="text-white font-bold">{selectedActe.acte_id}</span></div>
                  <div className="text-slate-400">Destinataire : <span className="text-sky-300">{selectedActe.destinataire}</span></div>
                  <div className="text-slate-400">Deadline : <span className="text-amber-300">{new Date(selectedActe.deadline).toLocaleTimeString()}</span></div>
                  <div className="text-slate-400 truncate">
                    Hash SHA-256 : <span className="text-emerald-400 font-mono">{selectedActe.sha256_ciphertext}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono">Aucun acte sélectionné</div>
              )}

              {/* Actions interactives */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  onClick={handleSendValidAck}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
                  title="Simule l'envoi de l'accusé avec le vrai hash SHA-256 du ciphertext"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accuser (Conforme)</span>
                </button>

                <button
                  onClick={handleSendTamperedAck}
                  className="px-3 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                  title="Simule un accusé altéré avec un faux hash pour vérifier le rejet par le bot"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Test Rejet (Faux Hash)</span>
                </button>

                <button
                  onClick={handleSimulateEscalation}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                  title="Simule l'expiration du temps sans accusé pour déclencher l'escalade N1/N2"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Forcer Escalade</span>
                </button>
              </div>
            </div>

            {/* Terminal log résultat */}
            {ackSimResult && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] whitespace-pre-line text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
                {ackSimResult}
              </div>
            )}
          </div>
        </div>

        {/* Visualiseur Main Courante */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Main Courante Persistante (data/main_courante.jsonl)
            </h4>
            <span className="text-xs text-slate-500 font-mono">{actesList.length} acte(s) répertorié(s)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Acte ID</th>
                  <th className="py-2.5 px-3">Expéditeur</th>
                  <th className="py-2.5 px-3">Destinataire</th>
                  <th className="py-2.5 px-3">Deadline</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Preuve SHA-256</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {actesList.map(a => (
                  <tr
                    key={a.acte_id}
                    onClick={() => setSelectedActeId(a.acte_id)}
                    className={`hover:bg-slate-800/50 cursor-pointer transition ${
                      selectedActeId === a.acte_id ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-amber-300">{a.acte_id}</td>
                    <td className="py-2.5 px-3 text-slate-300">{a.expediteur}</td>
                    <td className="py-2.5 px-3 text-sky-300">{a.destinataire}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(a.deadline).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.statut === 'accuse' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        a.statut.includes('escalade') ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {a.statut}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[120px]" title={a.sha256_ciphertext}>
                      {a.sha256_ciphertext ? `${a.sha256_ciphertext.substring(0, 10)}...` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleCopy(JSON.stringify(a, null, 2), a.acte_id);
                        }}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copier le JSON d'état"
                      >
                        {copiedKey === a.acte_id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* INNOVATION 2 : LA SUPPLÉANCE CHIFFRÉE (DÉLÉGATION) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Innovation 2 : La Suppléance Chiffrée (Délégation Temporelle & Canal Séparé)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Mandat d'intérim étanche : isolation stricte par sous-salon, zéro accès à l'historique antérieur
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
            Révocation Immédiate + Expiration Persistante
          </span>
        </div>

        {/* Formulaire de délégation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Accorder un Mandat de Suppléance
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Rôle régalien délégué</label>
                <input
                  type="text"
                  value={delegantRole}
                  onChange={e => setDelegantRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Agent suppléant (Délégataire)</label>
                <select
                  value={delegataireUser}
                  onChange={e => setDelegataireUser(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white text-xs"
                >
                  <option value="@mandjide:localhost">@mandjide:localhost (Officier Mandjide)</option>
                  <option value="@landry:localhost">@landry:localhost (Officier Landry)</option>
                  <option value="@agent3:localhost">@agent3:localhost (Suppléant Réserve)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Périmètre / Scope</label>
                <input
                  type="text"
                  value={delegationScope}
                  onChange={e => setDelegationScope(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Durée du mandat</label>
                <select
                  value={delegationHours}
                  onChange={e => setDelegationHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-xs text-emerald-300"
                >
                  <option value={1}>1 heure (Test rapide)</option>
                  <option value={12}>12 heures</option>
                  <option value={24}>24 heures</option>
                  <option value={48}>48 heures</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Motif officiel du mandat</label>
              <input
                type="text"
                value={delegationPurpose}
                onChange={e => setDelegationPurpose(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
              />
            </div>

            <button
              onClick={handleCreateDelegation}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Créer le Sous-Salon & Déléguer le Rôle</span>
            </button>
          </div>

          {/* Principes de sécurité suppléance */}
          <div className="lg:col-span-6 space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Garanties Cryptographiques du Sous-Salon Dédié
              </h4>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">Aucun partage de mot de passe ni de clé :</strong> Le suppléant utilise son propre compte Matrix et ses propres clés d'appareil.
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">Herméticité de l'historique antérieur :</strong> Le suppléant n'ayant jamais été invité dans <code className="text-amber-300">#actes-service</code>, le cliquet Megolm interdit formellement de déchiffrer les échanges passés.
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">Révocation immédiate et automatique :</strong> Dès révocation par l'administrateur ou à expiration, le bot expulse le suppléant et clôture la délégation.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span className="text-emerald-400 font-bold">Commande CLI :</span>
              <code className="text-slate-300 truncate">
                {osType === 'windows' ? '.\\scripts\\delegate_role.ps1 -Delegataire @mandjide:localhost -Duration 1h' : './scripts/delegate_role.sh --delegataire @mandjide:localhost --duration 1h'}
              </code>
            </div>
          </div>
        </div>

        {/* Registre des délégations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Registre Persistant des Suppléances (data/delegations.jsonl)
            </h4>
            <span className="text-xs text-slate-500 font-mono">{delegationsList.length} mandat(s)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Mandat ID</th>
                  <th className="py-2.5 px-3">Rôle Délégué</th>
                  <th className="py-2.5 px-3">Suppléant</th>
                  <th className="py-2.5 px-3">Sous-Salon Isolé</th>
                  <th className="py-2.5 px-3">Échéance</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {delegationsList.map(d => (
                  <tr key={d.delegation_id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-bold text-emerald-300">{d.delegation_id}</td>
                    <td className="py-2.5 px-3 text-white">{d.delegant_role}</td>
                    <td className="py-2.5 px-3 text-sky-300 font-bold">{d.delegataire_id}</td>
                    <td className="py-2.5 px-3 text-amber-300 truncate max-w-[140px]">{d.sub_room_id}</td>
                    <td className="py-2.5 px-3 text-slate-400">{new Date(d.expires_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {d.status === 'active' ? (
                        <button
                          onClick={() => handleRevokeDelegation(d.delegation_id)}
                          className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[11px] font-semibold transition"
                          title="Révoquer immédiatement le mandat et expulser du sous-salon"
                        >
                          Révoquer
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Révoqué</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
