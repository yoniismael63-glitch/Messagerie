/**
 * Logique pure d'audit et de validation des règles de sécurité souveraine Matrix
 */

export interface SecurityAuditResult {
  id: string;
  title: string;
  category: 'federation' | 'registration' | 'network' | 'crypto' | 'license';
  status: 'passed' | 'warning' | 'failed';
  description: string;
  evidence: string;
}

export function validateMatrixUserId(userId: string, expectedServer?: string): boolean {
  if (!userId || typeof userId !== 'string') return false;
  const regex = /^@([a-z0-9_.-]+):([a-z0-9_.-]+)$/i;
  const match = userId.match(regex);
  if (!match) return false;
  if (expectedServer && match[2] !== expectedServer) {
    return false;
  }
  return true;
}

export function auditHomeserverConfig(yamlContent: string): SecurityAuditResult[] {
  const results: SecurityAuditResult[] = [];

  // 1. Audit Fédération
  const hasAllowFederationFalse = /allow_federation:\s*false/i.test(yamlContent);
  const hasEmptyKeyServers = /trusted_key_servers:\s*\[\s*\]/i.test(yamlContent);

  if (hasAllowFederationFalse && hasEmptyKeyServers) {
    results.push({
      id: 'sec-fed-01',
      title: 'Fédération Matrix hermétiquement désactivée',
      category: 'federation',
      status: 'passed',
      description: 'Aucune fuite vers des homeservers ou serveurs de clés étrangers.',
      evidence: 'allow_federation: false && trusted_key_servers: []',
    });
  } else {
    results.push({
      id: 'sec-fed-01',
      title: 'Fédération Matrix non hermétique',
      category: 'federation',
      status: 'failed',
      description: 'Le serveur risque de contacter des relais externes non souverains.',
      evidence: 'Configuration de fédération incomplète ou manquante.',
    });
  }

  // 2. Audit Inscription Libre
  const hasRegistrationDisabled = /enable_registration:\s*false/i.test(yamlContent);
  if (hasRegistrationDisabled) {
    results.push({
      id: 'sec-reg-01',
      title: 'Inscription publique désactivée',
      category: 'registration',
      status: 'passed',
      description: 'Seuls les agents préalablement enrôlés par la sécurité peuvent rejoindre.',
      evidence: 'enable_registration: false',
    });
  } else {
    results.push({
      id: 'sec-reg-01',
      title: 'Inscription publique vulnérable',
      category: 'registration',
      status: 'failed',
      description: 'N\'importe quel internaute pourrait créer un compte non autorisé.',
      evidence: 'enable_registration est absent ou à true.',
    });
  }

  // 3. Audit Chiffrement E2EE
  const hasEncryptedDefault = /encryption_for_new_rooms:\s*"?encrypted"?/i.test(yamlContent);
  if (hasEncryptedDefault) {
    results.push({
      id: 'sec-crypto-01',
      title: 'Chiffrement par défaut des nouveaux salons',
      category: 'crypto',
      status: 'passed',
      description: 'Les salons créés sont automatiquement configurés en Megolm chiffré.',
      evidence: 'encryption_for_new_rooms: "encrypted"',
    });
  } else {
    results.push({
      id: 'sec-crypto-01',
      title: 'Chiffrement par défaut absent',
      category: 'crypto',
      status: 'warning',
      description: 'Le chiffrement doit être forcé par l\'API ou les clients.',
      evidence: 'encryption_for_new_rooms non spécifié.',
    });
  }

  return results;
}

export function auditDockerCompose(composeContent: string): SecurityAuditResult[] {
  const results: SecurityAuditResult[] = [];

  // Vérifier qu'aucun port n'est exposé pour le service db
  // Un service db avec "ports:" signale une exposition dangereuse
  const dbSection = composeContent.split('synapse:')[0] || '';
  const hasExposedDbPorts = /ports:\s*\n\s*-\s*["']?\d+:\d+/i.test(dbSection);

  if (!hasExposedDbPorts) {
    results.push({
      id: 'sec-net-01',
      title: 'Base PostgreSQL isolée (zéro port hôte)',
      category: 'network',
      status: 'passed',
      description: 'PostgreSQL n\'écoute que sur le réseau Docker interne réservé.',
      evidence: 'Aucune directive ports: sur le conteneur db.',
    });
  } else {
    results.push({
      id: 'sec-net-01',
      title: 'Exposition réseau critique de PostgreSQL',
      category: 'network',
      status: 'failed',
      description: 'La base de données est accessible directement depuis l\'extérieur de Docker.',
      evidence: 'Directive ports détectée sur le service db.',
    });
  }

  return results;
}
