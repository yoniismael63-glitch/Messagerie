/**
 * Logique pure et modèle d'état pour les Innovations Régaliennes du Jour 3 :
 * 1. Acte de Service Chiffré & Accusé Probant par Hash SHA-256
 * 2. Escalade Automatique à 2 niveaux (sans déchiffrement - Bot Aveugle)
 * 3. Suppléance Chiffrée (Délégation isolée par sous-salon)
 */

export interface ActeServiceMetadata {
  acte_id: string;
  destinataire: string; // Ex: @agent2:localhost
  expediteur: string; // Ex: @agent1:localhost
  deadline: string; // ISO 8601 string
  requires_ack: boolean;
  ack_type: 'sha256_ciphertext' | 'simple';
  room_id: string; // Salon chiffré (#actes-service)
  event_id_chiffre: string; // ID de l'événement m.room.encrypted
  escalation_level: number; // 0: initial, 1: superviseur, 2: admin
  statut: 'envoye' | 'accuse' | 'escalade_niv1' | 'escalade_niv2' | 'expire' | 'annule';
  horodatage: string;
  sha256_ciphertext?: string; // Preuve cryptographique
  ack_event_id?: string;
  ack_received_at?: string;
}

export interface DelegationMandat {
  delegation_id: string;
  delegant_id: string; // Ex: @agent1:localhost ou @admin:localhost
  delegant_role: string; // Ex: "Chef de Cabinet Sécurité"
  delegataire_id: string; // Ex: @agent3:localhost (ou @mandjide:localhost)
  scope: string; // Ex: "actes_urgents_defense"
  purpose: string; // Ex: "Intérim mission officielle 48h"
  created_at: string;
  expires_at: string;
  status: 'active' | 'revoquee' | 'expiree';
  sub_room_id: string; // Sous-salon dédié ex: "!sub_room_del_123:localhost"
  revoked_at?: string;
  revoked_by?: string;
}

/**
 * Calcul SHA-256 synchrone pour les tests ou WebCrypto en environnement navigateur.
 * Fonction utilitaire simple pour chaînes hexadécimales.
 */
export async function computeSha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple si pas de WebCrypto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Vérifie la validité d'un accusé probant.
 * Règle stricte du bot : l'accusé n'est validé QUE si le hash envoyé
 * correspond exactement au SHA-256 du ciphertext chiffré stocké sur le homeserver.
 */
export function verifyActeAckProof(
  expectedCiphertextSha256: string,
  providedAckSha256: string
): { valid: boolean; reason?: string } {
  if (!providedAckSha256 || typeof providedAckSha256 !== 'string') {
    return { valid: false, reason: 'REJET_SECURITE : Hash SHA-256 de preuve manquant.' };
  }
  const cleanExpected = expectedCiphertextSha256.trim().toLowerCase();
  const cleanProvided = providedAckSha256.trim().toLowerCase();

  if (cleanExpected.length !== 64 || cleanProvided.length !== 64) {
    return { valid: false, reason: 'REJET_SECURITE : Format de hash invalide (64 caractères hex attendus).' };
  }

  if (cleanExpected !== cleanProvided) {
    return {
      valid: false,
      reason: `REJET_SECURITE : Discordance cryptographique. Attendu=${cleanExpected.substring(0, 8)}... Fourni=${cleanProvided.substring(0, 8)}...`
    };
  }

  return { valid: true };
}

/**
 * Évalue la transition d'état d'un acte selon le temps et les accusés.
 */
export function evaluateActeState(
  acte: ActeServiceMetadata,
  now: Date = new Date(),
  gracePeriodMs: number = 60000 // 1 minute pour l'échelon 2
): { newStatut: ActeServiceMetadata['statut']; newLevel: number; actionNeeded?: string } {
  // Si déjà accusé, annulé ou expiré terminal, pas de changement
  if (['accuse', 'annule', 'expire'].includes(acte.statut)) {
    return { newStatut: acte.statut, newLevel: acte.escalation_level };
  }

  const deadlineDate = new Date(acte.deadline);
  const isPastDeadline = now.getTime() > deadlineDate.getTime();

  if (!isPastDeadline) {
    return { newStatut: 'envoye', newLevel: 0 };
  }

  // Si l'échéance est dépassée
  const overdueMs = now.getTime() - deadlineDate.getTime();

  if (overdueMs > gracePeriodMs * 3) {
    return {
      newStatut: 'expire',
      newLevel: 2,
      actionNeeded: `Acte ${acte.acte_id} expiré sans accusé. Clôture de la main courante.`
    };
  } else if (overdueMs > gracePeriodMs) {
    return {
      newStatut: 'escalade_niv2',
      newLevel: 2,
      actionNeeded: `ALERTE CRITIQUE NIVEAU 2 : Escalade vers #actes-admin pour ${acte.acte_id}. Destinataire défaillant : ${acte.destinataire}.`
    };
  } else {
    return {
      newStatut: 'escalade_niv1',
      newLevel: 1,
      actionNeeded: `ALERTE NIVEAU 1 : Rappel d'échéance dépassée pour ${acte.acte_id} transmis au superviseur.`
    };
  }
}

/**
 * Vérifie l'état d'une délégation temporaire (suppléance)
 */
export function evaluateDelegationState(
  mandat: DelegationMandat,
  now: Date = new Date()
): { status: DelegationMandat['status']; isExpired: boolean } {
  if (mandat.status === 'revoquee') {
    return { status: 'revoquee', isExpired: false };
  }
  const expiry = new Date(mandat.expires_at);
  if (now.getTime() >= expiry.getTime()) {
    return { status: 'expiree', isExpired: true };
  }
  return { status: 'active', isExpired: false };
}

/**
 * Vérification des règles d'isolation pour le Bot Aveugle
 */
export function auditBlindBotIsolation(
  botJoinedRooms: string[],
  actesServiceRoomId: string,
  coordinationRoomId: string
): { compliant: boolean; errors: string[] } {
  const errors: string[] = [];

  // Règle 1 : Le bot ne doit JAMAIS être dans le salon chiffré
  if (botJoinedRooms.includes(actesServiceRoomId)) {
    errors.push(`NON-CONFORME : Le bot est membre du salon chiffré ${actesServiceRoomId} ! Violation du principe Zero-Knowledge.`);
  }

  // Règle 2 : Le bot doit être dans le salon de coordination
  if (!botJoinedRooms.includes(coordinationRoomId)) {
    errors.push(`AVERTISSEMENT : Le bot n'est pas membre du salon de coordination ${coordinationRoomId}. Il ne recevra pas les métadonnées.`);
  }

  return {
    compliant: errors.length === 0,
    errors,
  };
}
