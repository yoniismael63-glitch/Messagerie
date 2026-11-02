import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyActeAckProof,
  evaluateActeState,
  evaluateDelegationState,
  auditBlindBotIsolation,
  ActeServiceMetadata,
  DelegationMandat,
} from './acteServiceLogic.ts';

test('verifyActeAckProof valide un hash SHA-256 rigoureusement identique', () => {
  const hash = 'a69f73cca23a9ac5c8b567dc185a756e97a9fb34a8ce3be94d15c5dd10443a57';
  const res = verifyActeAckProof(hash, hash);
  assert.equal(res.valid, true);
});

test('verifyActeAckProof rejette tout hash divergent ou falsifié', () => {
  const hash1 = 'a69f73cca23a9ac5c8b567dc185a756e97a9fb34a8ce3be94d15c5dd10443a57';
  const hash2 = 'ffff73cca23a9ac5c8b567dc185a756e97a9fb34a8ce3be94d15c5dd10443a57';
  const res = verifyActeAckProof(hash1, hash2);
  assert.equal(res.valid, false);
  assert.match(res.reason ?? '', /REJET_SECURITE/);
});

test('verifyActeAckProof rejette les formats invalides', () => {
  const res = verifyActeAckProof('abc', 'abc');
  assert.equal(res.valid, false);
});

test('evaluateActeState maintient envoye avant la deadline', () => {
  const baseActe: ActeServiceMetadata = {
    acte_id: 'ACTE-TEST-001',
    destinataire: '@agent2:localhost',
    expediteur: '@agent1:localhost',
    deadline: new Date(Date.now() + 600000).toISOString(),
    requires_ack: true,
    ack_type: 'sha256_ciphertext',
    room_id: '!room_encrypted:localhost',
    event_id_chiffre: '$event123',
    escalation_level: 0,
    statut: 'envoye',
    horodatage: new Date().toISOString(),
  };

  const evalRes = evaluateActeState(baseActe, new Date());
  assert.equal(evalRes.newStatut, 'envoye');
  assert.equal(evalRes.newLevel, 0);
});

test('evaluateActeState déclenche escalade_niv1 dès dépassement', () => {
  const pastDeadline = new Date(Date.now() - 30000).toISOString();
  const baseActe: ActeServiceMetadata = {
    acte_id: 'ACTE-TEST-002',
    destinataire: '@agent2:localhost',
    expediteur: '@agent1:localhost',
    deadline: pastDeadline,
    requires_ack: true,
    ack_type: 'sha256_ciphertext',
    room_id: '!room_encrypted:localhost',
    event_id_chiffre: '$event456',
    escalation_level: 0,
    statut: 'envoye',
    horodatage: new Date().toISOString(),
  };

  const evalRes = evaluateActeState(baseActe, new Date(), 60000);
  assert.equal(evalRes.newStatut, 'escalade_niv1');
  assert.equal(evalRes.newLevel, 1);
});

test('evaluateActeState déclenche escalade_niv2 après gracePeriod', () => {
  const pastDeadline = new Date(Date.now() - 90000).toISOString();
  const baseActe: ActeServiceMetadata = {
    acte_id: 'ACTE-TEST-003',
    destinataire: '@agent2:localhost',
    expediteur: '@agent1:localhost',
    deadline: pastDeadline,
    requires_ack: true,
    ack_type: 'sha256_ciphertext',
    room_id: '!room_encrypted:localhost',
    event_id_chiffre: '$event789',
    escalation_level: 1,
    statut: 'escalade_niv1',
    horodatage: new Date().toISOString(),
  };

  const evalRes = evaluateActeState(baseActe, new Date(), 60000);
  assert.equal(evalRes.newStatut, 'escalade_niv2');
  assert.equal(evalRes.newLevel, 2);
});

test('evaluateDelegationState gère l expiration temporelle', () => {
  const mandat: DelegationMandat = {
    delegation_id: 'DEL-2026-01',
    delegant_id: '@agent1:localhost',
    delegant_role: 'Directeur Sécurité',
    delegataire_id: '@mandjide:localhost',
    scope: 'actes_confidentiels',
    purpose: 'Mission extérieure',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    expires_at: new Date(Date.now() - 3600000).toISOString(),
    status: 'active',
    sub_room_id: '!sub_del_01:localhost',
  };

  const res = evaluateDelegationState(mandat, new Date());
  assert.equal(res.status, 'expiree');
  assert.equal(res.isExpired, true);
});

test('auditBlindBotIsolation certifie le Zero-Knowledge du bot', () => {
  const safeRooms = ['!coordination:localhost', '!admin:localhost'];
  const resSafe = auditBlindBotIsolation(safeRooms, '!actes_service_encrypted:localhost', '!coordination:localhost');
  assert.equal(resSafe.compliant, true);

  const compromisedRooms = ['!actes_service_encrypted:localhost', '!coordination:localhost'];
  const resBad = auditBlindBotIsolation(compromisedRooms, '!actes_service_encrypted:localhost', '!coordination:localhost');
  assert.equal(resBad.compliant, false);
  assert.match(resBad.errors[0], /NON-CONFORME/);
});
