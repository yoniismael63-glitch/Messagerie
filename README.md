# FasoMatrix - Infrastructure de Messagerie Instantanée Souveraine
> **Projet Réalisé dans le Cadre du Hackathon National - Administration Publique du Burkina Faso**  
> *Socle Souverain, Chiffrement de Bout en Bout (E2EE Megolm), Zero-Knowledge Escalation Bot & Suppléance Chiffrée*

[![Licence](https://img.shields.io/badge/Licence-AGPL--3.0%20%2F%20Apache--2.0-blue.svg)](mon-projet/LICENSE)
[![Protocole](https://img.shields.io/badge/Protocole-Matrix%20Synapse%201.125-00b894.svg)](https://matrix.org)
[![Chiffrement](https://img.shields.io/badge/Chiffrement-E2EE%20Megolm%20v1%20AES--SHA2-brightgreen.svg)](#)
[![Sécurité](https://img.shields.io/badge/Souverainet%C3%A9-Z%C3%A9ro%20F%C3%A9d%C3%A9ration-critical.svg)](#)
[![Docker](https://img.shields.io/badge/D%C3%A9ploiement-Docker%20Compose-2496ED.svg)](mon-projet/docker-compose.yml)
[![Tests](https://img.shields.io/badge/Audit-Z%C3%A9ro%20Clair%20Prouv%C3%A9-success.svg)](#)

---

## 🏛️ 1. Présentation du Projet

**FasoMatrix** est une infrastructure complète, étanche et souveraine de messagerie instantanée collaborative et d'actes de service, spécialement architecturée pour les institutions et agents de la fonction publique du **Burkina Faso**.

Elle résout le défi fondamental de la communication étatique : **comment garantir l'intégrité probante, le secret d'État et la traçabilité des ordres administratifs sans dépendre d'acteurs de messagerie grand public ou de clouds étrangers non souverains.**

### Piliers Fondamentaux :
1. **Chiffrement de Bout en Bout Mathématique (E2EE)** : Utilisation des standards ouverts **Olm** (Double Ratchet) et **Megolm** (`m.megolm.v1.aes-sha2`). Aucun algorithme maison ; conformité aux meilleures pratiques cryptographiques mondiales.
2. **Souveraineté et Étanchéité Réseau** : Hébergement 100% autonome sur machines étatiques. La fédération avec l'extérieur est rigoureusement bloquée (`allow_federation: false`).
3. **Actes de Service Probants (Jour 3)** : Envoi d'ordres administratifs chiffrés avec accusé de réception probant par **empreinte SHA-256 du ciphertext** et enregistrement sur main courante immuable.
4. **Bot d'Escalade et de Suppléance "Aveugle" (Zero-Knowledge)** : Démon asynchrone surveillant les délais d'accusé et gérant les mandats de suppléance sans **jamais** posséder de clé de déchiffrement ni lire le moindre message.
5. **Révocation Instantanée Multi-Appareils** : Invalidation en temps réel de tous les jetons, sessions et clés d'un compte suspect en une commande unilatérale.

---

## 📂 2. Dossier Officiel du Concours & Documentation

L'ensemble des notes techniques d'évaluation et de sécurité exigées par les examinateurs est classé dans le dossier [`mon-projet/docs/`](mon-projet/docs/) :

| Document | Objet & Contenu | Lien Direct |
| :--- | :--- | :---: |
| **Pièce 2 : Note de Pré-Projet** | Synthèse exécutive (2 pages) : vision, architecture technique, souveraineté et licences open source. | [📄 02_NOTE_DE_PRE_PROJET.md](mon-projet/docs/02_NOTE_DE_PRE_PROJET.md) |
| **Pièce 3 : Note de Sécurité** | Modèle de menace STRIDE, analyse cryptographique E2EE, isolation réseau et limites documentées. | [📄 03_NOTE_DE_SECURITE.md](mon-projet/docs/03_NOTE_DE_SECURITE.md) |
| **Pièce 4 : Guide Dépôt Git** | Protocole d'audit du dépôt Git, traçabilité des commits et intégrité de l'historique. | [📄 04_GUIDE_DEPOT_GIT.md](mon-projet/docs/04_GUIDE_DEPOT_GIT.md) |
| **Politique de Sécurité (SECURITY)** | Règles de divulgation, analyse de révocation Synapse et matrice des privilèges. | [🛡️ SECURITY.md](mon-projet/docs/SECURITY.md) |

---

## 🏗️ 3. Structure et Organisation du Répertoire

Le projet est rigoureusement compartimenté pour séparer l'infrastructure de production, les scripts d'exploitation et la console web d'audit :

```
fasomatrix/
├── mon-projet/                   # SOCLE TECHNIQUE DE DÉPLOIEMENT RÉGALIEN
│   ├── bot/                      # Démon d'Escalade et de Suppléance Chiffrée (Jour 3)
│   │   ├── Dockerfile            # Image Python 3.12-slim isolée
│   │   ├── escalation_bot.py     # Démon async zero-knowledge (matrix-nio)
│   │   └── requirements.txt      # Dépendances Python auditées
│   ├── docs/                     # DOSSIER TECHNIQUE DU CONCOURS
│   │   ├── 02_NOTE_DE_PRE_PROJET.md
│   │   ├── 03_NOTE_DE_SECURITE.md
│   │   ├── 04_GUIDE_DEPOT_GIT.md
│   │   └── SECURITY.md
│   ├── element/                  # Client Web Sécurisé Element
│   │   └── config.json           # Configuration personnalisée FasoMatrix
│   ├── nginx/                    # Reverse Proxy & Régulation HTTP
│   │   └── nginx.conf            # En-têtes HSTS, CSP et étanchéité des ports
│   ├── scripts/                  # SCRIPTS D'EXPLOITATION (Linux Bash & Windows PowerShell)
│   │   ├── backup.sh / .ps1               # Sauvegarde à froid chiffrée AES-256
│   │   ├── restore.sh / .ps1              # Restauration après sinistre
│   │   ├── create_agents.sh / .ps1        # Enrôlement unilatéral des agents
│   │   ├── promote_admin.sh / .ps1        # Promotion / Rétrogradation administrateur
│   │   ├── revoke_user.sh / .ps1          # Révocation immédiate multi-appareils
│   │   ├── purge_room.sh / .ps1           # Purge d'historique de salon
│   │   ├── seed_demo.sh / .ps1            # Initialisation automatisée (Jour 1 & 2)
│   │   ├── seed_acte_demo.sh / .ps1       # Salons et bot d'actes (Jour 3)
│   │   ├── send_acte.sh / .ps1            # Émission d'acte de service chiffré
│   │   ├── send_ack.sh / .ps1             # Accusé probant par empreinte SHA-256
│   │   ├── delegate_role.sh / .ps1        # Octroi de suppléance temporaire
│   │   ├── revoke_delegation.sh / .ps1    # Révocation immédiate de suppléance
│   │   ├── list_actes.sh / .ps1           # Inspection de la main courante
│   │   ├── list_delegations.sh / .ps1     # Inspection du registre des suppléances
│   │   └── verify_no_cleartext.sh / .ps1  # Audit contradictoire d'absence de clair
│   ├── synapse/                  # Serveur de Messagerie Synapse
│   │   ├── homeserver.yaml.template       # Configuration durcie sans fédération
│   │   └── entrypoint.sh         # Script d'amorçage et injection de secrets
│   ├── docker-compose.yml        # Orchestration multi-conteneurs des 5 services
│   ├── .env.example              # Gabarit des variables d'environnement
│   ├── .gitignore                # Protection stricte contre le commit de secrets
│   ├── LICENSE                   # Licence ouverte AGPL-3.0 / Apache-2.0
│   └── README.md                 # Manuel technique complet du socle
│
├── src/                          # CONSOLE WEB D'AUDIT ET DE DÉMONSTRATION INTERACTIVE
│   ├── components/               # Composants React (Dossier, Innovations J3, Guides)
│   ├── utils/                    # Fonctions de validation cryptographique et tests
│   └── App.tsx                   # Tableau de bord principal interactif
│
├── public/                       # ARTEFACTS TÉLÉCHARGEABLES
│   └── mon-projet.zip            # Archive complète zip prête au déploiement hors-ligne
│
├── .gitignore                    # Exclusion globale de node_modules, dist et clés
├── package.json                  # Dépendances Node.js / Vite du démonstrateur
└── README.md                     # Ce fichier portail pour les examinateurs
```

---

## 🚀 4. Démarrage Rapide en 2 Commandes

Le socle FasoMatrix est conçu pour être déployé en quelques secondes sur n'importe quelle machine (Linux, macOS ou Windows avec Docker Desktop) :

### Étape 1 : Initialisation de l'environnement
```bash
cd mon-projet
cp .env.example .env
docker compose up -d
```

### Étape 2 : Initialisation automatisée des comptes et salons
- **Sur Linux / macOS :**
  ```bash
  chmod +x scripts/*.sh
  ./scripts/seed_demo.sh
  ./scripts/seed_acte_demo.sh
  ```
- **Sur Windows (PowerShell) :**
  ```powershell
  .\scripts\seed_demo.ps1
  .\scripts\seed_acte_demo.ps1
  ```

L'application Element Web personnalisée est immédiatement accessible sur `http://localhost`.

---

## 🔍 5. Preuves Contradictoires pour les Examinateurs

Les scripts suivants permettent aux examinateurs de vérifier formellement en temps réel les exigences techniques :

### A. Preuve de Chiffrement Absolu (Zero-Cleartext)
```bash
# Vérifie que le terme "SecretDefenseBF2026" n'existe ni dans les logs ni dans PostgreSQL
./scripts/verify_no_cleartext.sh "SecretDefenseBF2026"
```
*Résultat garanti : Code retour 0, confirmation que seuls les ciphertexts `m.room.encrypted` sont stockés.*

### B. Preuve de Révocation Multi-Appareils Immédiate
```bash
# Coupe instantanément toutes les sessions et téléphones de l'agent
./scripts/revoke_user.sh @agent1:localhost
```
*Résultat garanti : Déconnexion atomique de toutes les sessions actives ; erreur `M_USER_DEACTIVATED` à toute reconnexion.*

### C. Preuve de Non-Répudiation de l'Accusé (Hash SHA-256)
```bash
# Émission d'un acte de service
./scripts/send_acte.sh agent1 @agent2:localhost "Ordre de mission" "Déploiement confidentiel" +5m

# Accusé de réception avec vérification du hash SHA-256 du ciphertext
./scripts/send_ack.sh agent2 <event_id> <room_id> <acte_id>
```
*Résultat garanti : L'accusé est vérifié mathématiquement par rapport au paquet chiffré stocké sur le serveur.*

---

## ⚖️ 6. Conformité Légale et Licences

- **Synapse Matrix Homeserver** : AGPL-3.0
- **Element Web Client** : Apache-2.0
- **Nginx Reverse Proxy** : BSD-2-Clause
- **PostgreSQL Database** : Licence PostgreSQL (type MIT/BSD)
- **FasoMatrix Bot & Scripts** : Logiciel libre sous licence Apache-2.0

Le système garantit l'absence totale de verrou propriétaire (*vendor lock-in*) et assure à l'État du Burkina Faso la souveraineté intellectuelle et technique intégrale sur son outil de communication de crise et d'administration.

---

## 👥 7. Équipe FasoMatrix
- **Projet** : FasoMatrix (Messagerie Souveraine & Actes de Service)
- **Note Technique** : [Consulter la Note de Pré-Projet (Pièce 2)](mon-projet/docs/02_NOTE_DE_PRE_PROJET.md)
- **Guide Dépôt & Audit** : [Consulter le Guide Dépôt Git (Pièce 4)](mon-projet/docs/04_GUIDE_DEPOT_GIT.md)
