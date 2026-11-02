# FASOMATRIX — MANUEL COMPLET DE FONCTIONNEMENT ET DES FONCTIONNALITÉS DU SYSTÈME
## Document Officiel de Référence Technique et Opérationnelle
### Plateforme Souveraine de Messagerie Instantanée et de Traçabilité Régaliènne • Burkina Faso

---

## 1. Présentation Générale de FasoMatrix

**FasoMatrix** est une infrastructure logicielle régalienne de communications sécurisées et de traçabilité opérationnelle, conçue pour répondre aux impératifs d'indépendance numérique et de souveraineté des administrations publiques, des corps diplomatiques et des forces de sécurité du Burkina Faso.

Construit sur les protocoles ouverts et éprouvés **Matrix / Olm / Megolm**, FasoMatrix élimine toute dépendance envers des serveurs ou services cloud étrangers (WhatsApp, Telegram, Signal, Teams). Il garantit le respect absolu du principe de **Zero-Knowledge Server** : le serveur central hébergé sur le territoire national assure l'acheminement des flux sans jamais pouvoir accéder au contenu en clair des échanges.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VISION ARCHITECTURALE FASOMATRIX                     │
│                                                                        │
│   [ Terminaux Agents : PC / Mobiles ]                                  │
│             │                                                          │
│             ▼  Chiffrement E2EE de bout en bout (Olm / Megolm)         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ REVERSE PROXY NGINX (Filtrage DoS, Rate-Limiting, TLS 1.3)   │     │
│   └───────────────┬──────────────────────────────┬───────────────┘     │
│                   │                              │                     │
│                   ▼                              ▼                     │
│   ┌───────────────────────────────┐ ┌──────────────────────────────┐   │
│   │ MATRIX SYNAPSE (Homeserver)   │ │ ELEMENT WEB (Client officiel)│   │
│   │ Isolation totale & 0 fuite    │ │ Interface durcie agents      │   │
│   └───────────────┬───────────────┘ └──────────────────────────────┘   │
│                   │                                                    │
│                   ▼ (Réseau privé interne 'matrix_internal')           │
│   ┌───────────────────────────────┐ ┌──────────────────────────────┐   │
│   │ POSTGRESQL 16                 │ │ BOT AVEUGLE D'ESCALADE       │   │
│   │ Stockage chiffré hermétique   │ │ Traçabilité & Zero-Knowledge │   │
│   └───────────────────────────────┘ └──────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comment Fonctionne FasoMatrix ? (Mécanique Interne)

### 2.1. Le Cycle de Vie d'une Communication Chiffrée
1. **Génération locale des clés de chiffrement :**  
   Lorsqu'un agent se connecte pour la première fois sur son terminal (Element Web ou Element Mobile), sa machine génère un couple de clés asymétriques (clé publique et clé privée) avec le protocole **Olm** et l'algorithme sur courbe elliptique **Curve25519**. La clé privée ne quitte jamais l'appareil de l'agent.
2. **Chiffrement préalable sur le terminal :**  
   Tout message, fichier ou ordre régalien est chiffré localement avant son envoi sur le réseau.
3. **Transport aveugle :**  
   Le serveur Nginx et le moteur Synapse ne reçoivent qu'un événement Matrix de type `m.room.encrypted`. Ce paquet contient un bloc d'octets opaque (`ciphertext`) indéchiffrable pour toute entité ne possédant pas la clé de session.
4. **Déchiffrement sur l'appareil destinataire :**  
   Seuls les terminaux autorisés membres du salon possèdent la clé Megolm partagée permettant de déverrouiller le message.

### 2.2. L'Enrôlement Souverain des Utilisateurs
Dans une messagerie régalienne, **l'inscription libre est formellement interdite** :
- Le paramètre de configuration Synapse `enable_registration: false` bloque toute tentative de création de compte non autorisée depuis l'extérieur.
- Tout compte d'agent est provisionné nominativement par l'administrateur système via des scripts sécurisés (`create_agents.sh` ou `create_agents.ps1`), associant un identifiant de domaine national (ex : `@agent1:localhost` ou `@nom:defense.gov.bf`).

### 2.3. L'Herméticité Réseau et la Fédération Maîtrisée
- **Fédération fermée par défaut :** Le serveur ne se connecte à aucun serveur Matrix mondial (`allow_federation: false`).
- **Option Cercle de Confiance :** Si plusieurs ministères burkinabè souhaitent communiquer entre eux, une liste blanche stricte (`federation_domain_whitelist`) permet d'autoriser exclusivement les domaines gouvernementaux homologués (`defense.gov.bf`, `presidence.gov.bf`, `finances.gov.bf`) tout en maintenant le blocage total des serveurs étrangers.

---

## 3. Catalogue Détaillé de TOUTES les Fonctionnalités du Système

FasoMatrix regroupe **12 grandes fonctionnalités opérationnelles** réparties entre le socle de messagerie, la sécurité régalienne et l'administration :

---

### FONCTIONNALITÉ 1 : Messagerie Instantanée Sécurisée & Salons Thématiques
- **Description :** Communications textuelles, partage de documents et canaux de crise en temps réel.
- **Sécurité :** Chiffrement de bout en bout activé obligatoirement dès la création de chaque salon (`encryption_for_new_rooms: "encrypted"`).
- **Multi-terminaux :** Synchronisation sécurisée entre ordinateur de bureau et smartphone sans compromission de clés.

---

### FONCTIONNALITÉ 2 : L'Acte de Service Régalien (Innovation Jour 3)
- **Description :** Dispositif permettant à une autorité hiérarchique d'émettre un ordre formel prioritaire doté d'une valeur juridique et opérationnelle.
- **Caractéristiques techniques :**
  - Identifiant unique indélébile (ex : `ACTE-20261102-0945-88A1`).
  - Destinataire nominatif unique.
  - Objet et corps de l'instruction 100% chiffrés de bout en bout sous Megolm dans le salon `#actes-service`.
  - Date et heure d'échéance d'exécution (`deadline` ISO 8601).
  - Émission simultanée d'un méta-événement de suivi dans le salon `#actes-coordination`.

---

### FONCTIONNALITÉ 3 : Accusé de Réception Probant par Empreinte SHA-256 (Innovation Jour 3)
- **Description :** Mécanisme d'acquittement obligatoire certifiant la prise de connaissance de l'ordre sans possibilité de répudiation.
- **Principe cryptographique :**
  - Le destinataire calcule l'empreinte de hachage **SHA-256 (64 caractères hexadécimaux)** du bloc chiffré (`ciphertext`) de l'événement reçu.
  - L'accusé renvoie ce hash au système.
  - Le bot de contrôle compare mathématiquement l'empreinte fournie avec celle du ciphertext d'origine.
  - **Protection anti-falsification :** Si un attaquant ou un agent fournit un hash altéré, le système génère immédiatement un `[REJET_SECURITE]` et maintient l'acte sous surveillance d'escalade.

---

### FONCTIONNALITÉ 4 : Moteur d'Escalade Automatique à 2 Paliers (Innovation Jour 3)
- **Description :** Système de surveillance automatisé garantissant qu'aucun ordre prioritaire ne reste sans réponse.
- **Fonctionnement :**
  - **Palier 1 (Échéance dépassée) :** Le bot émet une alerte prioritaire dans `#actes-coordination` mentionnant l'identifiant de l'acte et notifiant le superviseur hiérarchique.
  - **Palier 2 (Délai critique franchi) :** Le bot déclenche une escalade d'urgence vers le salon de commandement supérieur `#actes-admin`.
- **Principe du Bot Aveugle (Blind Bot) :** L'escalade s'exécute **sans jamais déchiffrer l'ordre**. Le bot ne connaît que l'identifiant, la deadline et l'identifiant de l'agent défaillant.

---

### FONCTIONNALITÉ 5 : Main Courante Électronique Inaltérable (Innovation Jour 3)
- **Description :** Registre chronologique d'audit horodaté consignant tous les actes de service émis, leurs accusés, leurs empreintes SHA-256 et leurs états d'escalade.
- **Format technique :** Fichier persistant `data/main_courante.jsonl` (format JSON Lines append-only).
- **Résilience :** Même en cas de coupure de courant ou de redémarrage complet de la machine, le registre est relu au démarrage et conserve l'historique complet.
- **Consultation :** Outil en ligne de commande dédié (`list_actes.sh` / `list_actes.ps1`) et interface graphique avec filtres par statut (`envoye`, `accuse`, `escalade_niv1`, `escalade_niv2`, `expire`).

---

### FONCTIONNALITÉ 6 : Suppléance Chiffrée par Sous-Salon Isolé (Innovation Jour 3)
- **Description :** Mécanisme de délégation temporaire de rôle (intérim, mission extérieure, permanence de garde).
- **Architecture de cloisonnement :**
  - L'autorité mandate un agent suppléant pour une durée définie (ex : 24h ou 48h).
  - Le système crée automatiquement un **sous-salon chiffré dédié** (`#actes-delegation-<id>`) où seul le suppléant est convié.
- **Garantie Cryptographique Zero-Knowledge :**
  - Le suppléant n'a **JAMAIS** été membre du salon historique principal `#actes-service`.
  - En vertu des cliquets unidirectionnels du protocole Megolm, il lui est **mathématiquement impossible** de déchiffrer les ordres et messages antérieurs à sa prise de fonction.

---

### FONCTIONNALITÉ 7 : Registre des Mandats & Révocation de Suppléance
- **Description :** Traçabilité administrative de toutes les délégations octroyées.
- **Stockage :** Fichier `data/delegations.jsonl`.
- **Révocation d'urgence :** D'un simple clic ou par script (`revoke_delegation.ps1`), l'administrateur peut interrompre un mandat avant son terme : le suppléant est immédiatement expulsé du sous-salon et ses privilèges sont révoqués.

---

### FONCTIONNALITÉ 8 : Révocation Atomique Multi-Appareils d'un Agent (Jour 2)
- **Description :** Procédure d'urgence en cas de vol de terminal, de capture ou de suspension disciplinaire d'un agent.
- **Action de sécurité :** Exécution de l'API d'administration Synapse (`POST /_synapse/admin/v1/deactivate/{user_id}`).
- **Effets immédiats et simultanés (en moins d'une seconde) :**
  1. Clôture forcée de toutes les sessions actives sur tous les appareils de l'agent (ordinateur portable, smartphone, tablette).
  2. Révocation irréversible de ses jetons d'authentification (`access_tokens`).
  3. Purge des clés cryptographiques associées sur le serveur.
  4. Expulsion automatique de l'ensemble des salons de discussion. Même en possession de son mot de passe, l'agent ne peut plus se reconnecter.

---

### FONCTIONNALITÉ 9 : Sauvegarde à Froid Chiffrée AES-256-GCM (Jour 2)
- **Description :** Sauvegarde complète et étanche de l'état du système (base de données PostgreSQL, configurations Synapse, clés privées du serveur, main courante).
- **Protection cryptographique :** L'archive d'exportation est chiffrée avec **OpenSSL en mode AES-256-GCM** avec dérivation PBKDF2.
- **Script automatisé :** `scripts/backup.sh` (Linux) et `scripts/backup.ps1` (Windows).

---

### FONCTIONNALITÉ 10 : Restauration d'Urgence après Sinistre (Jour 2)
- **Description :** Procédure de reprise après sinistre (Disaster Recovery).
- **Processus :** Déchiffrement de l'archive de sauvegarde avec la clé secrète d'administration, vérification de l'empreinte d'intégrité, réinjection dans PostgreSQL et redémarrage propre des conteneurs.
- **Script automatisé :** `scripts/restore.sh` / `scripts/restore.ps1`.

---

### FONCTIONNALITÉ 11 : Purge Historique & Rétention Régaliènne Conforme (Jour 2)
- **Description :** Nettoyage automatique des anciens messages et métadonnées d'un salon au-delà d'une durée de rétention choisie (ex : 30 jours ou 90 jours).
- **Conformité :** Respect des directives de protection des données et réduction de la surface d'attaque en cas d'analyse légale d'un disque dur saisi.
- **Script dédié :** `scripts/purge_room.sh` / `scripts/purge_room.ps1`.

---

### FONCTIONNALITÉ 12 : Déploiement Souverain "One-Command" & Tunnels d'Accès
- **Description :** Capacité de déployer l'intégralité de l'infrastructure en une seule commande grâce à Docker Compose :
  ```bash
  docker compose up -d
  ```
- **Prêt pour le terrain :** Fonctionne aussi bien en réseau local fermé déconnecté d'Internet (intranet gouvernemental, réseau militaire filaire ou radio) qu'avec des tunnels sécurisés HTTPS (Ngrok / Cloudflare) pour des expérimentations à distance avec l'application mobile.

---

## 4. Tableau Synthétique des Fonctionnalités par Profil d'Utilisateur

| Fonctionnalité | Agent Opérationnel | Superviseur / Commandement | Administrateur Système |
| :--- | :---: | :---: | :---: |
| Messagerie chiffrée E2EE (Olm/Megolm) | ✅ | ✅ | ✅ |
| Émission d'actes de service chiffrés | ❌ | ✅ | ✅ |
| Émission de l'accusé probant SHA-256 | ✅ | ✅ | ❌ |
| Réception des alertes d'escalade | ❌ | ✅ (Niv. 1) | ✅ (Niv. 2) |
| Consultation de la main courante | ❌ | ✅ | ✅ |
| Octroi / Révocation de suppléance | ❌ | ✅ | ✅ |
| Révocation atomique d'un compte agent | ❌ | ❌ | ✅ |
| Sauvegarde / Restauration AES-256 | ❌ | ❌ | ✅ |
| Purge historique de rétention | ❌ | ❌ | ✅ |

---

## 5. Guide Opérationnel Rapide (Comment l'utiliser ?)

### Pour un Agent sur l'Application Mobile Element :
1. Télécharger l'application **Element** sur Google Play Store ou Apple App Store.
2. Cliquer sur **Se connecter** $\rightarrow$ **Changer de serveur** $\rightarrow$ Entrer l'adresse du serveur (ex : votre lien ngrok ou votre IP locale).
3. Entrer son identifiant (`@agent1:localhost`) et son mot de passe.
4. Accepter la vérification croisée des clés pour certifier son appareil.

### Pour l'Administrateur en Ligne de Commande (PowerShell) :
- Initialiser l'ensemble des salons du Jour 3 :
  ```powershell
  .\scripts\seed_acte_demo.ps1
  ```
- Émettre un ordre de mission prioritaire :
  ```powershell
  .\scripts\send_acte.ps1 -Expediteur agent1 -Destinataire @agent2:localhost -Objet "Ordre Alpha" -Corps "Mission secteur Nord" -Deadline "+2m"
  ```
- Vérifier la main courante :
  ```powershell
  .\scripts\list_actes.ps1
  ```
- Révoquer un agent en urgence :
  ```powershell
  .\scripts\revoke_user.ps1 -TargetUser @agent2:localhost
  ```

---

*FasoMatrix • Conçu et développé pour la Souveraineté Numérique du Burkina Faso • Licence AGPL-3.0*
