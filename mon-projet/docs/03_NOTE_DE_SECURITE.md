# NOTE DE SÉCURITÉ (PIÈCE 3)
## Projet : FASOMATRIX — Analyse des Menaces, Protections et Limites
### Format strict : 2 pages maximum | Concours Sécurité & Souveraineté 2026-2027

---

### 1. Modèle de Menace Pris en Compte (Threat Model)

Dans le cadre d'un déploiement étatique et régalien au Burkina Faso, le système répond aux cinq vecteurs d'attaque prioritaires :

| Menace | Scénario d'attaque | Niveau d'impact |
| :--- | :--- | :---: |
| **T1. Interception de flux (Man-in-the-Middle)** | Espionnage ou écoute clandestine sur les liaisons télécoms ou réseaux Wi-Fi non maîtrisés. | **Critique** |
| **T2. Compromission physique d'un terminal** | Vol ou saisie du smartphone / PC d'un agent de sécurité en mission. | **Élevé** |
| **T3. Trahison ou départ d'un agent habilité** | Un ancien collaborateur tente d'accéder aux communications après la fin de ses fonctions. | **Critique** |
| **T4. Compromission de l'hébergeur / serveur** | Prise de contrôle illégitime de la machine hébergeant Synapse ou de la base PostgreSQL. | **Critique** |
| **T5. Attaques par force brute et saturation** | Tentative de deviner les mots de passe des comptes administratifs ou d'inonder le service (DoS). | **Moyen** |

---

### 2. Mesures de Protection Implémentées

#### A. Étanchéité Cryptographique de Bout en Bout (E2EE)
- **Zero-Knowledge Server** : Les clés privées sont générées sur le terminal de l'agent via l'API WebCrypto du navigateur et ne quittent jamais le client. Même avec un accès `root` complet sur le serveur hôte, le contenu des messages (`body`) est indéchiffrable.
- **Preuve Formelle par Requête SQL** : La vérification automatisée (`verify_no_cleartext.sh / .ps1`) certifie que la table PostgreSQL `events` ne stocke que du ciphertext chiffré par Megolm sous le format `m.room.encrypted`.

#### B. Isolation Réseau et Souveraineté Régalienne
- **Coupure Totale de la Fédération** : `allow_federation: false` interdit tout échange de paquets avec des homeservers étrangers.
- **Refus des Tiers de Confiance Externes** : `trusted_key_servers: []` interdit formellement à Synapse de contacter les serveurs de clés publics de `matrix.org`.
- **Télémétrie Interdite** : `report_stats: false` bloque toute transmission de statistiques ou métadonnées vers l'extérieur du pays.
- **Confinement Base de Données** : PostgreSQL écoute uniquement sur le port interne 5432 du réseau Docker privé `matrix_internal`. Aucun port de base de données n'est publié sur l'hôte.

#### C. Contrôle d'Accès Stricte et Révocation Atomique
- **Inscription Fermée** : `enable_registration: false` et `enable_registration_without_verification: false` bloquent toute auto-inscription. Seul un administrateur peut enrôler un agent.
- **Révocation Multi-Appareils Instantanée** : L'appel officiel `POST /_synapse/admin/v1/deactivate/{user_id}` (`{"erase": false}`) déclenche :
  1. L'invalidation et l'effacement immédiat de tous les `access_tokens` de session.
  2. La suppression de tous les appareils enregistrés (`device_id`).
  3. La destruction des clés cryptographiques Olm de l'agent sur le serveur, empêchant tout déchiffrement ultérieur.
  4. L'expulsion automatique de l'agent de l'ensemble des salons chiffrés.
- **Protection Anti-Bruteforce** : Module Nginx `limit_req_zone` limitant les tentatives de connexion sur `/login` à 5 requêtes par minute par IP avec statut HTTP 429.

---

### 3. Métadonnées Visibles par le Serveur

Bien que le contenu textuel, les pièces jointes et les médias soient protégés par Megolm, le serveur d'orchestration Synapse doit router les messages. À ce titre, certaines métadonnées demeurent techniquement visibles au niveau système :

```
VISIBLE SUR LE SERVEUR                     TOTALEMENT INVISIBLE (CHIFFRÉ)
├── Identifiant expéditeur (@agent1)        ├── Texte du message ("TopSecret")
├── Identifiant salon (!abc123:localhost)   ├── Images / Documents partagés
├── Horodatage de l'événement (Timestamp)   ├── Clés de déchiffrement Megolm
├── Type d'événement (m.room.encrypted)     ├── Mots de passe des agents (hashés)
└── Taille du paquet chiffré                └── Clés privées d'identité
```

#### Mesures d'Atténuation des Métadonnées :
- **Désactivation de la Présence** : `presence: enabled: false` masque le statut « en ligne / hors ligne » des agents.
- **Désactivation des Aperçus d'URL** : `url_preview_enabled: false` empêche le serveur de requêter des liens Web et de trahir les centres d'intérêt des utilisateurs.
- **Politique de Rétention** : Capacité de purge programmée des historiques anciens via l'API Admin de Synapse.

---

### 4. Limites Connues & Risques Résiduels

En toute rigueur scientifique et technique, le système présente les limites inhérentes à la sécurité informatique :

1. **Compromission du Point de Terminaison (Endpoint Security)** :
   Le chiffrement de bout en bout protège les données en transit et sur le serveur, mais ne protège pas contre un terminal physiquement compromis par un logiciel espion (*keylogger*, cheval de Troie) ou une capture d'écran physique effectuée avant la révocation.
2. **Contrainte 2FA / SSO sur Environnement de Test HTTP** :
   L'authentification multi-facteurs OIDC (via Authelia/Keycloak) requiert des cookies de session `SameSite=None` conditionnés impérativement par une terminaison TLS (`HTTPS`). En test local sur `http://localhost`, la politique des navigateurs bloque ces redirections. En production, le 2FA sera intégré nativement via le nouveau composant standard **MAS** (*Matrix Authentication Service*).
3. **Analyse de Trafic Temporelle (Traffic Analysis)** :
   Un adversaire disposant d'un accès au niveau des opérateurs de télécommunications peut corréler le volume et la temporalité des paquets réseau entre deux adresses IP pour déduire qu'une communication a lieu, sans pour autant pouvoir en percer le contenu.
