# Politique de Sécurité Régalienne & Modèle de Menace - FasoMatrix
## Infrastructure de Messagerie Instantanée Souveraine - Burkina Faso

---

### 1. Modèle de Confiance et Architecture E2EE

Le système repose sur le protocole standard ouvert Matrix et ses primitives cryptographiques formellement prouvées :
- **Olm** : Dérivé du protocole Double Ratchet de Signal pour les sessions privées poste-à-poste (1-à-1).
- **Megolm** (`m.megolm.v1.aes-sha2`) : Chiffrement de groupe pour les salons multi-utilisateurs.

#### Règle Fondamentale : Zero-Knowledge Server
Le serveur Synapse agit comme un simple relais de messages (*store-and-forward* aveugle). Il ne possède **jamais** les clés privées des utilisateurs ni les clés de session Megolm nécessaires au déchiffrement. Celles-ci sont générées et conservées exclusivement dans la mémoire sécurisée et le stockage chiffré local (IndexedDB) des clients Element des agents.

---

### 2. Identité, Rôles et Révocation Immédiate

#### A. Inscription Totalement Fermée
- La clé `enable_registration: false` bloque tout enregistrement autonome via les clients Element Web ou l'API publique `/_matrix/client/v3/register`.
- `enable_registration_without_verification: false` interdit tout contournement d'habilitation.
- La création de compte relève d'un acte souverain unilatéral de l'autorité habilitée, effectué soit en ligne de commande locale (`register_new_matrix_user`), soit via l'API protégée par le secret de registre (`SYNAPSE_REGISTRATION_SHARED_SECRET`).

#### B. Gestion des Rôles (RBAC)
- Les statuts sont hiérarchisés :
  - **Agent Opérationnel** (`admin: false`) : Capacité exclusive d'échanger dans les salons auxquels il a été explicitement invité. Aucun accès aux API d'administration `/_synapse/admin/*`.
  - **Administrateur Régalien** (`admin: true`) : Capacité de gérer les comptes, créer des salons de crise, promouvoir d'autres administrateurs et révoquer les habilitations compromises.
- **Règle de sécurité de rétrogradation** : Un administrateur ne peut pas se rétrograder lui-même. La rétrogradation requiert l'intervention d'un second administrateur souverain (principe des 4 yeux).

#### C. Mécanisme de Révocation Immédiate (`deactivate`)
La révocation d'un agent compromis ou ayant quitté ses fonctions utilise l'API officielle :
`POST /_synapse/admin/v1/deactivate/{user_id}` avec le paramètre `{"erase": false}`.

**Ce que fait `deactivate` :**
1. **Suppression immédiate de tous les appareils** : Chaque entrée dans la table des terminaux (`devices`) est effacée.
2. **Invalidation immédiate de tous les jetons** : Tous les `access_tokens` actifs sont révoqués. Toute requête ultérieure avec ces jetons est rejetée avec HTTP 401 / `M_UNKNOWN_TOKEN`.
3. **Destruction des clés cryptographiques** : Les clés d'identification d'appareil et les clés à usage unique (*one-time keys*) de l'agent stockées sur Synapse sont supprimées, rendant impossible l'établissement de nouvelles sessions Megolm vers cet agent.
4. **Retrait automatique de tous les salons** : Synapse génère des événements `m.room.member` avec le statut `leave` pour l'ensemble des salons rejoints.
5. **Verrouillage du compte** : Le compte est marqué `deactivated: true`. Toute tentative future d'authentification par mot de passe renvoie immédiatement HTTP 403 / `M_USER_DEACTIVATED`.

**Ce que `deactivate` ne fait pas :**
1. **Conservation de l'historique chiffré existant** : Les messages passés restent archivés sous leur forme chiffrée (*ciphertext*) dans la base de données. Ils restent déchiffrables par les autres agents membres du salon qui détiennent la clé Megolm correspondante.
2. **Conservation des médias existants** : À moins que `erase: true` ne soit spécifié (droit à l'oubli complet), les fichiers multimédias chiffrés passés restent conservés dans le `media_store`.
3. **Protection contre la capture d'écran préalable** : Aucun système informatique ne peut empêcher la capture physique d'un écran ou la photographie d'un terminal avant la révocation.

#### D. Métadonnées Visibles après Révocation
Conformément aux principes de minimisation du RGPD et des standards de sécurité publique :
- **Visibles** : L'identifiant de l'agent (`@agent1:localhost`), la date et heure des envois passés, les identifiants des salons fréquentés et l'événement formel de départ/désactivation.
- **Invisibles** : Le contenu des échanges, les clés de déchiffrement, les mots de passe.

---

### 3. Analyse du 2FA et Feuille de Route d'Intégration

#### A. Décision Technique pour le Hackathon (Jour 2 sur `http://localhost`)
L'intégration du 2FA (TOTP/WebAuthn) via un Identity Provider (IdP) OIDC externe (comme Authelia ou Keycloak) a été **analysée et reportée après le sprint local** pour les raisons techniques suivantes :
1. **Contraintes des navigateurs modernes (SameSite & WebCrypto)** : L'échange de cookies d'authentification inter-domaines (`SameSite=None`) exige impérativement le protocole HTTPS/TLS avec des certificats valides. Sur `http://localhost`, les flux de redirection SSO/OIDC génèrent des instabilités critiques de session et des pertes de cookies.
2. **Incompatibilité Element X avec le SSO Legacy Synapse** : La nouvelle génération de clients Matrix (Element X) utilise le standard OIDC natif via **MAS** (*Matrix Authentication Service*), qui remplace le module SSO historique de Synapse. Mettre en place le SSO legacy de Synapse sur le Jour 2 introduirait une dette technique incompatible avec la feuille de route mobile.

#### B. Mesures de Défense en Profondeur Appliquées au Jour 2
En remplacement au Jour 2, le système applique les mesures équivalentes :
1. **Génération autoritaire de mots de passe à haute entropie** : Les agents reçoivent des identifiants générés cryptographiquement (24+ octets base64).
2. **Révocation immédiate multi-appareils** : Perte instantanée d'accès sur toutes les sessions connectées.
3. **Confinement réseau total** : Base de données isolée dans un sous-réseau Docker privé sans exposition externe.

#### C. Feuille de Route pour le Déploiement en Production
Lors du déploiement en production sous domaine régalien officiel (ex: `messagerie.secu.gov.bf`) :
1. Activation de la terminaison TLS 1.3 sur Nginx avec certificat x509 délivré par la PKI nationale.
2. Déploiement de **Matrix Authentication Service (MAS)** couplé à l'annuaire d'État (Keycloak / OpenLDAP).
3. Activation obligatoire du 2FA par clé matérielle FIDO2 / WebAuthn ou jeton TOTP souverain pour l'ensemble des hauts fonctionnaires et agents accrédités.

---

### 4. Actes de Service, Main Courante et Suppléance (Jour 3)

#### A. Principe du Bot Aveugle (Blind Bot Architecture)
- **Zéro Clé Megolm** : Le bot de supervision (`@bot:localhost`) n'est **jamais** membre du salon chiffré `#actes-service`. Il ne reçoit aucune clé de session Megolm et ne possède aucun algorithme de déchiffrement. Même compromis, le bot ne peut révéler aucun contenu d'instruction ou de note de service.
- **Règle d'auto-exclusion** : Au démarrage et à chaque synchronisation, le bot vérifie la liste de ses salons rejoints. S'il est invité par erreur dans `#actes-service`, il quitte immédiatement le salon (`room_leave`) et émet une alerte de sécurité.

#### B. Métadonnées Visibles par le Serveur & Mesures de Minimisation
Pour assurer le suivi des échéances sans compromettre le secret métier :
- **Métadonnées transmises dans `#actes-coordination`** :
  `acte_id` (UUID opaque), `destinataire` (identifiant Matrix), `deadline` (ISO 8601), `requires_ack` (`true`), `ack_type` (`hash`), `room_id`, `event_id_chiffre`, `escalation_level`.
- **Informations strictement exclues des meta-events** :
  Aucun `objet`, aucun `corps`, aucune `classification` ni texte métier. Le serveur et le bot ignorent totalement l'objet de l'acte.
- **Métadonnées de suppléance** :
  `delegation_id`, `delegant`, `delegataire`, `scope` (`read_new_acts`), `purpose`, `expires_at`.

#### C. Accusé Probant par Hash SHA-256
- L'accusé de réception (`com.example.acte_service.ack`) lie mathématiquement l'accusé à la charge chiffrée reçue :
  $$\text{ack\_hash} = \text{"sha256:"} + \text{SHA256}(\text{ciphertext})$$
- Le bot récupère l'événement chiffré via l'API officielle `GET /_matrix/client/v3/rooms/{roomId}/event/{eventId}`, recalcule l'empreinte et ne valide la transition vers `accuse` que si l'égalité est exacte au caractère près.
- **Limite formelle documentée** : Ce mécanisme apporte une preuve cryptographique de non-répudiation sur la réception du paquet chiffré exact. Il ne constitue pas une signature électronique qualifiée au sens légal eIDAS/RGS (qui exigerait une PKI matérielle de signature individuelle).

#### D. Suppléance Chiffrée et Isolation Antérieure
- **Sous-salon dédié** : Lorsqu'un mandat avec `scope == "read_new_acts"` est établi, le bot crée un sous-salon chiffré neuf (`#actes-delegation-<id>`).
- **Garantie anti-fuite d'historique** : N'ayant jamais été membre du salon `#actes-service` historique, le suppléant (`agent3`) ne reçoit aucune clé Megolm passée. Il lui est cryptographiquement impossible de déchiffrer les actes antérieurs au mandat.
- **Révocation immédiate et expiration persistante** :
  - À l'expiration du délai (`expires_at`), le suppléant est expulsé du sous-salon (`room_kick`).
  - L'administrateur peut révoquer le mandat à tout instant via `revoke_delegation.sh`.
  - L'état est conservé dans `data/delegations.jsonl` et rechargé au démarrage du bot, garantissant le traitement des expirations même après une panne serveur.

#### E. Ce que l'Administrateur peut voir
- L'administrateur a accès à la **main courante complète** (`data/main_courante.jsonl` via `list_actes.sh`) et aux alertes d'escalade dans `#actes-admin`.
- L'administrateur voit le respect ou le dépassement des délais administratifs, mais **ne peut en aucun cas lire le contenu chiffré des actes** échangés entre les agents opérationnels.

