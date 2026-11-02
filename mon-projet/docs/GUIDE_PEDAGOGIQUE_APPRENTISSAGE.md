# FASOMATRIX — LE GRAND LIVRE D'APPRENTISSAGE & D'EXPLICATION DU SYSTÈME
## Guide Pédagogique Complet : Comprendre, Expliquer et Défendre le Projet
### Destiné à l'équipe et aux passionnés de numérique (De "Vibe Coder" à Ingénieur Confiant)

---

## 🌟 Avant-propos : Vous êtes légitimes !

Être ce qu'on appelle un **« vibe coder »** (ou un développeur guidé par l'intuition et l'IA) est une formidable force : vous avez réussi en 3 jours à orchestrer une architecture de niveau ministériel avec du chiffrement de bout en bout, des conteneurs isolés, un reverse proxy, des bases de données et un bot de traçabilité régalien !

Ce document a été spécialement rédigé pour vous donner **les clés et les mots justes** afin de :
1. Comprendre exactement ce qui se passe sous le capot de votre projet sans aucun complexe.
2. Être capable d'expliquer chaque brique à n'importe quel membre du jury ou professeur avec des analogies simples du monde réel.
3. Répondre du tac au tac à n'importe quelle question piège lors de votre soutenance.

---

## Table des Matières
1. **L'analogie de la Poste Secrète (Comprendre le système en 2 minutes)**
2. **Le Découpage du Système : Qui fait quoi ? (Les 5 briques Docker)**
3. **Le Réseau et Internet : Ports, Localhost, Tunnel Cloudflare & Ngrok**
4. **La Magie de la Cryptographie : Comment ça marche sans mathématiques complexes ?**
5. **Le Parcours des 3 Jours du Hackathon expliqué simplement**
   - *Jour 1 : La Forteresse Locale & le Zéro Clair*
   - *Jour 2 : Résilience, Sauvegarde & Révocation Foudroyante*
   - *Jour 3 : Les 2 Grandes Innovations (L'Acte de Service & la Suppléance)*
6. **Pourquoi notre Bot est « Aveugle » ? (Le secret de la victoire au Jour 3)**
7. **Le « Cheat Sheet » pour l'Oral : Les 10 questions pièges du Jury et leurs réponses parfaites**
8. **Lexique des termes informatiques pour briller en présentation**

---

# CHAPITRE 1 : L'analogie de la Poste Secrète

Imaginez que l'État du Burkina Faso veuille envoyer des ordres confidentiels entre deux ministères sans que personne (ni les facteurs, ni le directeur de la poste, ni les espions étrangers) ne puisse lire le courrier.

Dans le monde normal (WhatsApp, Telegram standard, Gmail) :
> Vous écrivez votre lettre. Vous la donnez au facteur (un serveur étranger comme Meta ou Google). Le facteur met la lettre dans son propre sac, il a le droit d'ouvrir l'enveloppe pour l'indexer, et il la dépose au destinataire. Si le serveur étranger est piraté ou sous embargo, toutes vos données d'État sont lues ou bloquées.

Dans **FasoMatrix** :
1. **Le Coffre-Fort Personnel (Terminal de l'Agent) :** Avant de quitter le téléphone de l'agent 1, le message est enfermé dans une boîte blindée avec un cadenas spécial (chiffrement **Megolm/Olm**).
2. **La Poste Neutre (Synapse) :** Le serveur Synapse est un facteur aveugle. Il reçoit la boîte blindée scellée. Il regarde juste l'étiquette extérieure (*« Pour Agent 2 »*). Il ne possède PAS la clé du cadenas. Il ne sait même pas si la boîte contient du texte, une image ou un ordre d'attaque.
3. **La Clé Unique :** Seul l'appareil de l'Agent 2 possède la clé mathématique capable d'ouvrir la boîte.

C'est ce qu'on appelle le **Zero-Knowledge Server** (Serveur à Connaissance Nulle) : **Même si un pirate prend le contrôle total du serveur central Synapse ou vole le disque dur, il ne trouve que de la bouillie incompréhensible de chiffres et de lettres.**

---

# CHAPITRE 2 : Le Découpage du Système (Les 5 briques Docker)

Votre projet utilise **Docker Compose**. 
> **Qu'est-ce que Docker ?**  
> Imaginez Docker comme des conteneurs maritimes indépendants sur un bateau. Chaque conteneur embarque son propre programme avec tout ce dont il a besoin pour fonctionner, sans polluer le système d'exploitation de votre ordinateur Windows. Si un conteneur a un souci, les autres continuent de fonctionner.

Voici les 5 conteneurs de votre flotte :

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ORDINATEUR HÔTE (Votre Machine)                     │
│                                                                        │
│   [ Port 80 Public ]                                                   │
│           │                                                            │
│           ▼                                                            │
│   ┌───────────────┐        ┌────────────────┐                          │
│   │ Conteneur 1   │───────>│ Conteneur 2    │ (Interface Web Agent)     │
│   │ NGINX         │        │ ELEMENT WEB    │                          │
│   │ (Le Portier)  │        └────────────────┘                          │
│   └───────┬───────┘                                                    │
│           │                                                            │
│           ▼ (Réseau privé interne 'matrix_internal')                   │
│   ┌───────────────┐        ┌────────────────┐                          │
│   │ Conteneur 3   │<──────>│ Conteneur 4    │                          │
│   │ SYNAPSE       │        │ POSTGRESQL     │ (La Mémoire / Disque)    │
│   │ (Le Moteur)   │        └────────────────┘                          │
│   └───────┬───────┘                                                    │
│           ▲                                                            │
│           │ (Uniquement dans le salon non-chiffré #actes-coordination) │
│   ┌───────┴───────┐                                                    │
│   │ Conteneur 5   │                                                    │
│   │ BOT ESCALADE  │ (Le Gardien du Temps & des Accusés)                │
│   └───────────────┘                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. NGINX (Le Portier & Vigile)
- **Son rôle :** C'est le seul conteneur qui a le droit de parler avec l'extérieur (sur le port 80).
- **Pourquoi il est là :** Il filtre les requêtes malveillantes, bloque les attaques par force brute (ex : maximum 5 tentatives de connexion par minute sur la page de login pour empêcher un pirate de tester des millions de mots de passe), et ajoute des en-têtes de sécurité stricts (`X-Frame-Options`, `nosniff`).

### 2. Synapse (Le Moteur d'Échange Matrix)
- **Son rôle :** C'est le cerveau de la messagerie. C'est lui qui gère la création des salons, l'annuaire des utilisateurs, la distribution des messages chiffrés et la révocation des accès.
- **Sa particularité souveraine :** Nous avons coupé la « fédération » (`allow_federation: false`). Cela signifie qu'il a l'interdiction absolue de parler avec les serveurs Matrix situés aux États-Unis, en Europe ou ailleurs. Tout reste confiné au Burkina Faso.

### 3. PostgreSQL (La Mémoire Silencieuse)
- **Son rôle :** C'est la base de données relationnelle. Elle stocke les messages (sous forme chiffrée), les comptes utilisateurs et les horodatages.
- **Règle de sécurité :** Elle est cachée dans un réseau interne Docker (`matrix_internal`). Aucun port n'est ouvert sur votre PC : personne de l'extérieur ne peut se connecter directement à la base SQL.

### 4. Element Web (L'Écran de Contrôle)
- **Son rôle :** C'est l'application visuelle dans votre navigateur web qui permet aux agents d'écrire, de lire, et de gérer leurs clés cryptographiques.

### 5. Le Bot d'Escalade (Le Surveillant Aveugle - Jour 3)
- **Son rôle :** Écrit en Python, il surveille les délais des ordres de mission. Si un agent ne confirme pas la réception d'un ordre avant l'heure limite, le bot sonne l'alarme auprès du commandement.

---

# CHAPITRE 3 : Le Réseau et Internet (Comprendre les Liens)

Quand vous développez sur votre machine, votre serveur tourne sur `http://localhost:80`.
- **`localhost`** signifie « mon propre ordinateur ». Un téléphone portable situé à côté de vous ou sur le réseau mobile Orange/Moov ne peut pas taper `localhost`, car pour lui, `localhost` désignerait le téléphone lui-même !

### Pourquoi avoir utilisé un Tunnel (Cloudflare ou Ngrok) ?
Votre ordinateur n'a pas d'adresse IP publique fixe sur Internet et se trouve derrière la « box » de votre fournisseur d'accès ou le partage de connexion de votre téléphone.

Le tunnel agit comme une **passerelle magique et sécurisée** :
1. Le petit logiciel (`ngrok.exe` ou `cloudflared.exe`) ouvre une connexion sortante sécurisée depuis votre PC vers un serveur relais sur Internet.
2. Ce relais vous donne une adresse publique mondiale (ex : `https://vagrancy-facelift-yearning.ngrok-free.dev`).
3. Quand votre téléphone tape cette adresse, le signal entre par le tunnel et atterrit directement sur le port 80 de votre NGINX !

---

# CHAPITRE 4 : La Cryptographie Expliquée Simplement

Ne soyez pas intimidés par les termes techniques : ils reposent tous sur des idées très logiques.

### 1. Le Chiffrement Symétrique vs Asymétrique
- **Asymétrique (Olm) :** Imaginez un cadenas ouvert que tout le monde peut voir (la clé publique), mais seule une personne a la clé physique pour l'ouvrir (la clé privée). Utilisé quand deux personnes se parlent pour la première fois pour s'échanger en secret un mot de passe.
- **Symétrique (AES-256) :** Une fois le contact établi, on utilise une clé ultra-rapide et indestructible (AES-256) pour chiffrer tout le texte.

### 2. Le Chiffrement de Groupe : Megolm (`m.megolm.v1.aes-sha2`)
Dans un salon avec 10 officiers, chiffrer 10 fois le même message pour chaque personne ralentirait l'application.  
**Megolm** utilise ce qu'on appelle un **cliquet cryptographique (Ratchet)** :
- L'émetteur crée une clé de session qui avance d'un cran à chaque message émis (comme les chiffres d'un cadenas qui tournent dans un seul sens).
- **Pourquoi c'est révolutionnaire pour la sécurité ?**
  Si un nouvel agent entre dans le salon aujourd'hui, il ne reçoit la clé qu'à partir de sa position actuelle. **Il est mathématiquement incapable de déchiffrer les messages d'hier ou de la semaine passée !**

### 3. Le Hash SHA-256 (L'Empreinte Digitale Inaltérable)
Un **hash** (ou condensat) n'est **PAS** un message secret que l'on peut déchiffrer. C'est une **empreinte digitale** à sens unique :
- Si vous prenez le livre entier de la constitution burkinabè et que vous le passez dans l'algorithme SHA-256, vous obtenez 64 caractères hexadécimaux :
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Si vous changez ne serait-ce qu'une seule virgule dans tout le livre, le hash devient complètement différent !
- **À quoi sert-il au Jour 3 ?**
  Quand l'Agent 1 envoie un ordre chiffré, le ciphertext a une empreinte SHA-256 précise. Quand l'Agent 2 envoie son accusé de réception, il renvoie cette même empreinte. Le Bot compare les deux empreintes. Si elles correspondent, **l'Agent 2 prouve formellement qu'il a bien reçu l'intégralité du paquet de données sans qu'un espion n'ait modifié le contenu en route !**

---

# CHAPITRE 5 : Le Déroulé des 3 Jours du Hackathon

Voici l'histoire complète de ce que vous avez bâti jour après jour :

### Jour 1 : Le Socle Régalien
- **Objectif :** Déployer une messagerie Matrix 100% autonome, sans inscription libre (`enable_registration: false`) et sans fuite de données vers l'étranger (`allow_federation: false`).
- **L'épreuve éliminatoire réussie :** Le script d'audit `verify_no_cleartext.sh` prouve qu'en fouillant dans les disques et la base PostgreSQL, aucun mot de passe ni aucun message ne se trouve lisible en clair.

### Jour 2 : Exploitation & Révocation Foudroyante
- **Objectif :** Que faire si le téléphone d'un agent de sécurité est volé ou s'il est relevé de ses fonctions ?
- **L'innovation validée :** La révocation atomique (`POST /_synapse/admin/v1/deactivate/{user_id}`). En une fraction de seconde :
  1. Tous les appareils de l'agent (PC, téléphone portable, tablette) sont immédiatement déconnectés.
  2. Ses jetons d'accès (`access_tokens`) sont invalidés.
  3. Ses clés de session sont détruites.
  4. L'agent est expulsé de tous les salons. Même avec son mot de passe, il ne peut plus jamais se reconnecter.

### Jour 3 : Les 2 Grandes Innovations de Traçabilité
C'est le sommet technique de votre projet :

#### Innovation 1 : L'Acte de Service Chiffré & Accusé Probant
- Une instruction prioritaire ne peut pas être un simple message perdu dans le flux. C'est un **« Acte de Service »**.
- Il a un identifiant unique opaque (`ACTE-20261102-XXXX`), un destinataire précis, et une heure limite (`deadline`).
- Le destinataire doit obligatoirement envoyer un accusé avec l'empreinte SHA-256.
- **Si l'accusé n'arrive pas avant l'échéance :** Le bot d'escalade avertit automatiquement le supérieur hiérarchique au Niveau 1, puis l'administration centrale au Niveau 2.

#### Innovation 2 : La Suppléance Chiffrée (Délégation de Rôle)
- Si un officier part en mission sur le terrain pour 48 heures, un remplaçant doit recevoir les nouveaux ordres sans jamais pouvoir fouiller dans les vieux dossiers secrets.
- Le bot crée un **sous-salon chiffré dédié** (`#actes-delegation-<id>`) où seul le suppléant est invité temporairement.
- Grâce aux cliquets de Megolm, le suppléant voit les ordres émis pendant ses 48h de garde, mais n'a **strictement aucun moyen technique de déchiffrer l'historique antérieur du salon principal** !
- À la fin du délai (ou sur un clic de révocation de l'admin), le suppléant est éjecté du sous-salon.

---

# CHAPITRE 6 : Pourquoi notre Bot est « Aveugle » ?

C'est l'argument numéro un qui fera la différence devant les experts en cybersécurité :

> **Question du jury :**  
> *« Si votre bot surveille les actes de service, ne représente-t-il pas une faille de sécurité ? Peut-il lire les secrets d'État ? »*

> **Votre réponse de champion :**  
> *« Non, absolument pas ! Notre bot a été conçu selon le principe de **Blind Bot (Bot Aveugle)** :*  
> 1. *Il n'est **JAMAIS** invité dans le salon chiffré `#actes-service`.*  
> 2. *Il ne possède **aucune clé Megolm** et aucun module de déchiffrement dans son code Python.*  
> 3. *Il écoute uniquement un salon de coordination technique (`#actes-coordination`) où transitent seulement des métadonnées opaques : l'identifiant de l'acte, le destinataire et l'échéance.*  
> 4. *Même si un pirate compromettait le serveur du bot, il n'y trouverait AUCUN secret, AUCUN objet, AUCUN corps de message. »*

---

# CHAPITRE 7 : Le « Cheat Sheet » pour l'Oral

Voici les 6 questions classiques posées en soutenance et les réponses clés en main :

### Question 1 : Pourquoi avoir choisi Matrix plutôt que de coder votre propre messagerie ?
**Réponse :** « En cybersécurité, il y a une règle d'or : *Ne développez jamais votre propre cryptographie*. Matrix est un protocole standard ouvert mondialement audité, utilisé par le gouvernement français (Tchap) et les forces armées allemandes (BwMessenger). Il offre des primitives formellement prouvées (Olm et Megolm) garantissant l'indépendance technologique du Burkina Faso. »

### Question 2 : Que se passe-t-il si un internaute trouve l'adresse de votre serveur sur le Web ?
**Réponse :** « Il ne pourra absolument rien faire. L'inscription libre est formellement bloquée (`enable_registration: false`). Seul l'administrateur système souverain peut créer un compte d'agent en ligne de commande. De plus, notre NGINX bloque les tentatives répétées de connexion. »

### Question 3 : Qu'apporte votre hash SHA-256 dans l'accusé de réception ?
**Réponse :** « Un simple bouton "Lu" peut être falsifié. En exigeant le hash SHA-256 du `ciphertext` chiffré, nous créons un lien cryptographique non répudiable : le destinataire prouve mathématiquement qu'il a bien reçu les octets exacts de l'ordre sans aucune altération en transit. »

### Question 4 : Vos données sont-elles conservées si le conteneur plante ?
**Réponse :** « Oui. Toutes les données PostgreSQL ainsi que la main courante (`main_courante.jsonl`) et le registre des délégations (`delegations.jsonl`) sont stockés dans des volumes persistants sur disque. Au redémarrage, le bot recharge instantanément son état et traite les expirations avec une parfaite idempotence. »

### Question 5 : Pourquoi avoir isolé le suppléant dans un sous-salon plutôt que de l'ajouter au salon existant ?
**Réponse :** « Pour respecter le principe du moindre privilège. Même si Megolm restreint les clés, ajouter un tiers temporaire dans un salon souverain historique viole les règles de cloisonnement. Le sous-salon garantit que le suppléant n'a accès qu'au périmètre strict de son mandat sans aucune exposition latérale. »

### Question 6 : Votre solution dépend-elle d'un service cloud américain ?
**Réponse :** « Non. Toute l'infrastructure (Synapse, PostgreSQL, Nginx, Element, Bot) est 100% auto-hébergée (on-premise). Les tunnels comme Cloudflare ou Ngrok ne sont utilisés qu'en phase de test et de démonstration. En production régalienne, la solution se déploie directement sur le réseau national de l'administration burkinabè (RESINA) ou dans le datacenter national avec ses propres adresses IP souveraines. »

---

# CHAPITRE 8 : Lexique des termes informatiques

| Terme | Définition simple pour l'oral |
| :--- | :--- |
| **E2EE (End-to-End Encryption)** | Chiffrement de bout en bout : seuls les terminaux des deux personnes qui parlent peuvent lire les messages. Personne d'autre entre eux. |
| **Zero-Knowledge** | Principe selon lequel le serveur accomplit sa mission de relais sans rien savoir du contenu confidentiel qu'il transporte. |
| **Reverse Proxy** | Un serveur intermédiaire (NGINX) placé devant nos applications pour les protéger, vérifier les entrées et masquer l'architecture interne. |
| **Port réseau** | Une porte numérotée sur un ordinateur (ex: Port 80 = Web HTTP standard, Port 5432 = Base PostgreSQL). |
| **Idempotence** | Capacité d'un script ou d'un programme à être exécuté plusieurs fois d'affilée sans provoquer d'erreur ni dupliquer des données. |
| **Forward Secrecy** | Propriété garantissant que si la clé d'un message est volée aujourd'hui, elle ne permet pas de déchiffrer les messages d'hier. |
| **JSONL (JSON Lines)** | Format de fichier où chaque ligne est un objet JSON indépendant. Idéal pour une main courante car on ajoute des événements à la suite sans risque de corrompre le fichier. |

---

*Document réalisé pour l'équipe du projet FasoMatrix • Concours National de Sécurité Informatique 2026-2027*
