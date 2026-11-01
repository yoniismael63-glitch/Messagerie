import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMatrixUserId,
  auditHomeserverConfig,
  auditDockerCompose,
} from './matrixValidator.ts';

test('validateMatrixUserId valide les identifiants conformes au standard Matrix', () => {
  assert.equal(validateMatrixUserId('@agent_secu_1:localhost'), true);
  assert.equal(validateMatrixUserId('@admin_faso:secu.gouv.bf'), true);
  assert.equal(validateMatrixUserId('@agent.nom-compose:burkina.bf'), true);
});

test('validateMatrixUserId rejette les identifiants invalides ou malformés', () => {
  assert.equal(validateMatrixUserId('agent_sans_arobase:localhost'), false);
  assert.equal(validateMatrixUserId('@agent_sans_serveur'), false);
  assert.equal(validateMatrixUserId(''), false);
  assert.equal(validateMatrixUserId('@agent:autre_serveur', 'localhost'), false);
  assert.equal(validateMatrixUserId('@agent:localhost', 'localhost'), true);
});

test('auditHomeserverConfig valide allow_federation: false et trusted_key_servers: []', () => {
  const secureYaml = `
server_name: "localhost"
allow_federation: false
trusted_key_servers: []
enable_registration: false
encryption_for_new_rooms: "encrypted"
`;
  const results = auditHomeserverConfig(secureYaml);
  const fedAudit = results.find(r => r.id === 'sec-fed-01');
  const regAudit = results.find(r => r.id === 'sec-reg-01');
  const cryptoAudit = results.find(r => r.id === 'sec-crypto-01');

  assert.equal(fedAudit?.status, 'passed');
  assert.equal(regAudit?.status, 'passed');
  assert.equal(cryptoAudit?.status, 'passed');
});

test('auditHomeserverConfig détecte les vulnérabilités de fédération et d\'enregistrement ouvert', () => {
  const insecureYaml = `
server_name: "localhost"
allow_federation: true
enable_registration: true
`;
  const results = auditHomeserverConfig(insecureYaml);
  const fedAudit = results.find(r => r.id === 'sec-fed-01');
  const regAudit = results.find(r => r.id === 'sec-reg-01');

  assert.equal(fedAudit?.status, 'failed');
  assert.equal(regAudit?.status, 'failed');
});

test('auditDockerCompose détecte si PostgreSQL est confiné sans port exposé', () => {
  const safeCompose = `
services:
  db:
    image: postgres:16-alpine
    volumes:
      - db_data:/var/lib/postgresql/data
  synapse:
    image: matrixdotorg/synapse:v1.125.0
`;
  const results = auditDockerCompose(safeCompose);
  assert.equal(results[0]?.status, 'passed');

  const unsafeCompose = `
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
  synapse:
    image: matrixdotorg/synapse:v1.125.0
`;
  const unsafeResults = auditDockerCompose(unsafeCompose);
  assert.equal(unsafeResults[0]?.status, 'failed');
});
