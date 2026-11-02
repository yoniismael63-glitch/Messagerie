# NOTE DE PRÉ-PROJET (PIÈCE 2)
## Projet : FASOMATRIX — Socle Régalien de Messagerie Instantanée Sécurisée
### Format strict : 2 pages maximum | Concours Sécurité & Souveraineté 2026-2027

---

### 1. Concept & Contexte Stratégique
Les administrations publiques et forces de sécurité du Burkina Faso font face à un défi critique d'indépendance numérique : l'usage massif d'applications grand public étrangères (WhatsApp, Telegram) expose les communications d'État à l'espionnage extraterritorial, aux interceptions sur métadonnées et aux coupures de service unilatérales.

**FasoMatrix** est une infrastructure nationale souveraine de messagerie instantanée durcie, déployable sur des serveurs hébergés au Burkina Faso. Le système garantit l'étanchéité absolue des échanges stratégiques entre agents de l'État grâce au principe de **Zero-Knowledge Server** : le serveur relaie les messages chiffrés sans jamais détenir les clés cryptographiques de déchiffrement.

---

### 2. Architecture Technique
L'architecture est entièrement conteneurisée via **Docker Compose** et isolée au sein d'un réseau interne non routé vers l'extérieur :

```
[ Terminaux Agents : PC / Mobile ]
               │  (HTTPS / TLS 1.3 - Port 80/443)
               ▼
┌────────────────────────────────────────────────────────┐
│ NGINX (Reverse Proxy & Rate-Limiting Anti-Bruteforce)  │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
 (/_matrix, /_synapse)                    │ (/)
               ▼                          ▼
┌──────────────────────────────┐   ┌─────────────────────┐
│  Matrix Synapse (v1.125.0)   │   │ Element Web Official│
│   (Moteur d'orchestration)   │   │  (Interface durcie) │
└──────────────┬───────────────┘   └─────────────────────┘
               │
               ▼ (Port 5432 interne - aucun port hôte exposé)
┌──────────────────────────────┐
│ PostgreSQL 16 (Base relation)│
└──────────────────────────────┘
```

- **Reverse Proxy NGINX** : Point d'entrée unique. Applique les en-têtes stricts de sécurité (`HSTS`, `nosniff`, `SAMEORIGIN`), bloque les attaques DoS et impose un rate-limiting sévère sur `/_matrix/client/*/login` (5 req/min).
- **Homeserver Synapse** : Configuré en isolation totale (`allow_federation: false`, `trusted_key_servers: []`, `report_stats: false`). Aucune télémétrie sortante.
- **Base PostgreSQL** : Confinée dans le sous-réseau Docker `matrix_internal`, inaccessible depuis l'extérieur de la machine hôte.

---

### 3. Protocole de Chiffrement Retenu
Le système utilise les primitives cryptographiques formellement prouvées du standard ouvert **Matrix / Olm** :
1. **Olm (Sessions 1-à-1)** : Implémentation du protocole **Double Ratchet** (similaire à Signal), combinant l'échange de clés Diffie-Hellman sur courbe elliptique Curve25519 et une dérivation continue par hachage SHA-256 avec clé AES-256. Il assure la confidentialité persistante (*Forward Secrecy*) et la rupture de compromission future (*Break-in Resistance*).
2. **Megolm (`m.megolm.v1.aes-sha2`) (Salons de groupe)** : Protocole optimisé de chiffrement de groupe à cliquets cryptographiques. Chaque message émis est chiffré avec **AES-256-CBC** et authentifié par **HMAC-SHA-256**. Les clés de déchiffrement sont distribuées de terminal à terminal via des canaux Olm chiffrés.
3. **Obligation de chiffrement** : Le paramètre `encryption_for_new_rooms: "encrypted"` impose Megolm à tout nouveau salon dès sa création.

---

### 4. Composants Open Source & Licences

| Composant | Rôle opérationnel | Version | Licence Open Source |
| :--- | :--- | :--- | :--- |
| **Matrix Synapse** | Homeserver / Moteur souverain | `v1.125.0` | **AGPL-3.0** (Matrix.org Foundation) |
| **Element Web** | Client web officiel des agents | `v1.11.94` | **Apache-2.0** |
| **PostgreSQL** | Moteur de base de données relationnelle | `16-alpine` | **PostgreSQL License** (type BSD/MIT) |
| **NGINX** | Reverse proxy, TLS, filtrage DoS | `1.27-alpine`| **2-clause BSD-like License** |
| **Vodozemac / Olm** | Bibliothèque cryptographique certifiée | C / Rust native | **Apache-2.0** |

*Conformité juridique :* Aucune brique logicielle n'utilise de dépendance propriétaire. Toutes les licences autorisent l'auto-hébergement souverain sans redevance.

---

### 5. Fonctionnalités Innovantes & Valeur Ajoutée Régalienne
1. **Verrouillage Hermétique des Inscriptions** : Inscription publique désactivée (`enable_registration: false`). Enrôlement administratif unilatéral scripté par matricule d'État.
2. **Révocation Immédiate Multi-Appareils (Zero-Trust)** : Script d'autorité `revoke_user.sh` / `.ps1` qui purge en un appel API tous les terminaux actifs, invalide les jetons et détruit les clés cryptographiques de session de l'agent.
3. **Audit Contradictoire Anti-Fuite (Zero-Knowledge Verified)** : Outil automatisé `verify_no_cleartext.sh` / `.ps1` prouvant par requête SQL directe dans PostgreSQL et analyse des journaux que le serveur ne stocke que du ciphertext illisible (`OK : aucun clair trouvé`).
4. **Portabilité Complète Multi-Plateforme** : Déploiement natif doublé sous Linux/macOS (Bash POSIX) et Windows (PowerShell natif).

---

