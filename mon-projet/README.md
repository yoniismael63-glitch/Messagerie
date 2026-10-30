# FasoMatrix - Socle DevOps de Messagerie Instantanée Souveraine
## Système Dédié à l'Administration Publique du Burkina Faso

---

### 1. Concept

**FasoMatrix** est une infrastructure de messagerie instantanée régalienne et souveraine, conçue pour éliminer toute dépendance technologique étrangère ou hébergée sur des clouds tiers non maîtrisés.

Les piliers fondamentaux sont :
- **Chiffrement de bout en bout (E2EE) irréversible** : Fondé sur les protocoles cryptographiques formellement audités **Olm** (Double Ratchet) et **Megolm** via le standard ouvert Matrix. Aucune cryptographie maison.
- **Hébergement souverain étanche** : Déploiement automatisé "en une commande" sur n'importe quel serveur physique ou machine virtuelle souveraine hébergée sur le territoire national.
- **Régime d'identité contrôlée** : Inscription publique rigoureusement interdite (`enable_registration: false`). Seuls des fonctionnaires ou agents préalablement enrôlés par l'autorité de sécurité peuvent accéder au réseau.
- **Fédération coupée** : Isolement complet (`allow_federation: false`). Les messages et clés ne franchissent jamais les frontières de l'infrastructure étatique.
- **Révocation instantanée** : Révocation centralisée à effet immédiat invalidant l'intégralité des jetons et appareils connectés d'un agent.

---

### 2. Architecture Technique

```
                       RESEAU EXTERNE / NAVIGATEURS AGENTS
                                       │
                                       │  HTTP :80 (ou HTTPS :443)
                                       ▼
                     ┌───────────────────────────────────┐
                     │          NGINX (1.27)             │
                     │  Reverse Proxy & Terminaison Web  │
                     └─────────────────┬─────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │  Réseau Privé Docker Interne : 'matrix_internal'    │
            ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│     ELEMENT WEB       │                             │    SYNAPSE (1.125)    │
│  (Fichiers Statiques) │                             │   Homeserver Matrix   │
│   Port interne :80    │                             │  Port interne :8008   │
└───────────────────────┘                             └───────────┬───────────┘
                                                                  │
                                                                  │ Port :5432
                                                                  │ (interne)
                                                                  ▼
                                                      ┌───────────────────────┐
                                                      │    POSTGRESQL (16)    │
                                                      │   Base de Données     │
                                                      │  Volume: db_data      │
                                                      └───────────────────────┘
                                                      (AUCUN PORT HÔTE EXPOSÉ)
```

#### Principes d'isolation réseau :
1. **NGINX** est le **seul conteneur** publiant un port sur l'hôte.
2. **PostgreSQL** n'est accessible que depuis le réseau Docker interne `matrix_internal`.
3. **Synapse** traite les requêtes authentifiées sans aucune communication avec l'écosystème global Matrix (fédération désactivée, serveurs de clés tiers vides).

---

### 3. Technologies et Licences

Tous les composants sont 100% open source et vérifiables :

| Composant | Image / Version | Rôle | Licence Open Source |
| :--- | :--- | :--- | :--- |
| **Synapse** | `matrixdotorg/synapse:v1.125.0` | Serveur de messagerie & annuaire | **AGPL-3.0** |
| **Element Web** | `vectorim/element-web:v1.11.94` | Client web sécurisé agents | **Apache-2.0** |
| **PostgreSQL** | `postgres:16-alpine` | Persistance relationnelle robuste | **PostgreSQL License** (type MIT/BSD) |
| **Nginx** | `nginx:1.27-alpine` | Reverse proxy & régulation HTTP | **BSD-2-Clause** |

---

### 4. Niveau d'Engagement Open Source

Ce projet applique la démarche tripartite du logiciel libre pour l'administration :
1. **Contribuer** : Utilisation stricte des images officielles sans fork opaque, respect des RFCs Matrix et reversement des correctifs éventuels en amont (*upstream*).
2. **Étendre et adapter** : Personnalisation souveraine de la charte de l'Administration du Burkina Faso via `element/config.json`, sécurisation des paramètres Synapse et scripts d'enrôlement adaptés aux matricules de la fonction publique.
3. **Créer** : Conception d'un orchestrateur reproductible sous licence **AGPL-3.0**, garantissant l'auditabilité publique et la pérennité sans verrou propriétaire (*vendor lock-in*).

---

### 5. Prérequis

- Système d'exploitation : Linux (Debian 12, Ubuntu 22.04/24.04, AlmaLinux 9, etc.)
- **Docker Engine** (v24.0+) et le plugin **Docker Compose v2** (`docker compose version`)
- Utilitaires standards : `bash`, `curl`, `openssl`

---

### 6. Installation en une commande

```bash
# 1. Dupliquer le modèle de configuration
cp .env.example .env

# 2. Démarrer l'ensemble des services en arrière-plan
docker compose up -d
```

Pour observer l'initialisation automatique (génération de clé Ed25519, configuration de la base PostgreSQL) :
```bash
docker compose logs -f synapse
```

---

### 7. Création des comptes de démonstration

Exécutez le script d'enrôlement sécurisé :
```bash
chmod +x scripts/*.sh
./scripts/seed_demo.sh
```

Ce script effectue automatiquement :
- L'enregistrement de l'administrateur de sécurité (`admin_faso`)
- L'enregistrement des deux agents (`agent_secu_1` et `agent_secu_2`)
- La génération d'un salon confidentiel chiffré (`m.megolm.v1.aes-sha256`)
- L'invitation des agents dans ce salon

Accédez ensuite à l'application web dans votre navigateur sur : **`http://localhost`**

---

### 8. Test de la révocation immédiate

Pour révoquer immédiatement l'accès d'un agent déchu ou compromis :
```bash
./scripts/revoke_user.sh @agent_secu_1:localhost
```

**Effet garanti :**
- L'agent est immédiatement expulsé de sa session Element.
- Tous ses jetons d'accès (access tokens) sont invalidés.
- Toute tentative de reconnexion est bloquée avec le code Matrix `M_USER_DEACTIVATED`.

---

### 9. Ce que le serveur voit et ne voit pas

#### Ce que le serveur Synapse et l'administrateur système VOIENT :
- L'identifiant des comptes (`@agent_secu_1:localhost`).
- L'heure exacte d'émission des événements (horodatage).
- L'identifiant des salons de discussion (`!room_id:localhost`).
- Le statut d'adhésion (*membership*) : invitations, jointures, départs.
- **La charge utile chiffrée** : sous forme de bloc opaque `m.room.encrypted`.

#### Ce que le serveur et la base de données NE PEUVENT JAMAIS VOIR :
- **Le contenu en clair des messages** : le texte brut est chiffré sur le poste de l'émetteur et déchiffré uniquement sur le terminal du destinataire grâce aux clés Megolm.
- **Les clés privées de chiffrement des agents** : celles-ci résident exclusivement dans le stockage sécurisé du client Element Web (IndexDB chiffrée côté client).
- **Le contenu des fichiers transmis** : ils sont chiffrés avec une clé AES symétrique unique avant d'être déposés sur le serveur.

---

### 10. Limites connues et feuille de route

1. **Protocole TLS (HTTPS)** : Désactivé dans ce socle de test local. En production régalienne, la terminaison HTTPS avec un certificat valide est obligatoire pour que le navigateur autorise l'accès complet aux APIs cryptographiques `SubtleCrypto` de WebCrypto.
2. **Double facteur (2FA)** : Non configuré dans cette version initiale conformément aux consignes. L'intégration future s'effectuera via un fournisseur d'identité OIDC souverain (Keycloak) ou TOTP Matrix.
3. **Métadonnées de trafic** : Bien que le contenu textuel soit mathématiquement inaccessible au serveur, l'administration peut voir qui parle avec qui et à quelle fréquence (métadonnées inhérentes à tout protocole de routage réseau).
