# FasoMatrix - Socle DevOps de Messagerie Instantanée Souveraine
## Système Dédié à l'Administration Publique du Burkina Faso (Jour 1)

---

### 1. Concept

**FasoMatrix** est une infrastructure de messagerie instantanée régalienne et souveraine, conçue pour éliminer toute dépendance technologique étrangère ou hébergée sur des clouds tiers non maîtrisés.

Les piliers fondamentaux sont :
- **Chiffrement de bout en bout (E2EE) irréversible** : Fondé sur les protocoles cryptographiques formellement audités **Olm** (Double Ratchet) et **Megolm** (`m.megolm.v1.aes-sha2`) via le standard ouvert Matrix. Aucune cryptographie maison.
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

Exécutez le script d'enrôlement sécurisé adapté à votre système :

**Sur Linux / macOS (Bash) :**
```bash
chmod +x scripts/*.sh
./scripts/seed_demo.sh
```

**Sur Windows (PowerShell) :**
```powershell
.\scripts\seed_demo.ps1
```
*(Si une politique d'exécution bloque le script : `powershell -ExecutionPolicy Bypass -File .\scripts\seed_demo.ps1`)*

Ce script effectue automatiquement :
- L'attente de disponibilité complète de Synapse
- L'enregistrement de l'administrateur (`admin`)
- L'enregistrement des deux agents (`agent1` et `agent2`)
- La création d'un salon explicitement chiffré (`m.megolm.v1.aes-sha2`)
- La validation formelle par requête GET que l'état de chiffrement est actif
- L'invitation des agents dans ce salon

---

### 8. Procédure de test manuel E2EE (Validation Jour 1)

Suivez exactement les étapes ci-dessous pour valider l'étanchéité du chiffrement devant le jury :

1. S'assurer que `docker compose up -d` est lancé et que `http://localhost` répond.
2. Ouvrir `http://localhost` dans une fenêtre de navigation normale.
3. Se connecter avec `agent1` (identifiant `agent1`, mot de passe défini dans `.env`).
4. Ouvrir `http://localhost` dans une fenêtre de navigation privée.
5. Se connecter avec `agent2`.
6. Dans les deux fenêtres, accepter l'invitation au salon de démonstration « Cellule Souveraine - Démo Jour 1 ».
7. Vérifier que le salon affiche un cadenas vert ou une mention « chiffré ».
8. Envoyer un message depuis `agent1` (par exemple : `TopSecretBurkina2026`), et vérifier sa réception en clair côté `agent2`.
9. **Preuve 1 : Vérifier l'absence de texte clair dans les logs Synapse :**
   - **Linux / macOS :**
     ```bash
     docker compose logs synapse | grep -i "TopSecretBurkina2026"
     ```
   - **Windows PowerShell :**
     ```powershell
     docker compose logs synapse | Select-String "TopSecretBurkina2026"
     ```
   *Résultat attendu : AUCUN résultat (la commande ne retourne rien).*

10. **Preuve 2 : Vérifier l'absence de texte clair dans la base PostgreSQL :**
    ```bash
    docker compose exec db psql -U synapse_admin -d synapse_db -c "SELECT json FROM event_json WHERE json LIKE '%TopSecretBurkina2026%';"
    ```
    *Résultat attendu : `(0 rows)` — preuve mathématique que la base de données ne contient que le ciphertext chiffré en Megolm.*

11. **Avertissement de sécurité fondamental :**
    L'URL doit impérativement être `http://localhost` et non `http://<IP>` pour que l'API de cryptographie du navigateur (WebCrypto) fonctionne et que le chiffrement Element soit actif en l'absence de certificat TLS.

---

### 9. Gestion des Identités et des Rôles (Jour 2)

#### A. Création d'un agent
L'inscription autonome étant fermée (`enable_registration: false`), un agent est enrôlé unilatéralement par l'autorité :
- **En ligne de commande interne :**
  ```bash
  docker compose exec -T synapse register_new_matrix_user -u agent3 -p "MotDePasseFort_24B" --no-admin -c /data/homeserver.yaml
  ```
- **Ou via le script de seed :** `./scripts/seed_demo.sh` ou `.\scripts\seed_demo.ps1`.

#### B. Promotion d'un agent au rôle d'administrateur
Pour promouvoir un agent opérationnel au rang d'administrateur serveur (`admin: true`) :
- **Sur Linux / macOS :**
  ```bash
  ./scripts/promote_admin.sh @agent1:localhost
  ```
- **Sur Windows (PowerShell) :**
  ```powershell
  .\scripts\promote_admin.ps1 -User "@agent1:localhost"
  ```

#### C. Rétrogradation d'un administrateur
Pour retirer les privilèges d'administration (`admin: false`) :
- **Sur Windows (PowerShell) :**
  ```powershell
  .\scripts\promote_admin.ps1 -User "@agent1:localhost" -Demote
  ```
*Règle de sécurité stricte :* Un administrateur ne peut pas se rétrograder lui-même. La commande doit être exécutée avec le jeton d'un autre compte administrateur.

---

### 10. Procédure de Test de Révocation Multi-Appareils (Validation Jour 2)

Cette épreuve éliminatoire prouve que la révocation coupe **tous les terminaux connectés simultanément** d'un agent :

1. **Établir deux sessions simultanées pour `agent1` :**
   - Ouvrir `http://localhost` dans un navigateur normal (Session 1 de `agent1`).
   - Ouvrir `http://localhost` dans une fenêtre de navigation privée (Session 2 de `agent1`).
   - Se connecter avec les identifiants de `agent1` dans les deux fenêtres.
2. **Confirmer la réception multi-appareils :**
   - Depuis un autre navigateur connecté avec `agent2`, envoyer un message dans le salon chiffré.
   - Constater que les deux fenêtres de `agent1` reçoivent bien le message.
3. **Exécuter la révocation immédiate :**
   - **Sur Linux / macOS :**
     ```bash
     ./scripts/revoke_user.sh @agent1:localhost
     ```
   - **Sur Windows (PowerShell) :**
     ```powershell
     .\scripts\revoke_user.ps1 -User "@agent1:localhost"
     ```
   Le script affiche le nombre exact d'appareils supprimés (ex : *2 appareils supprimés, 0 restant*).
4. **Constat contradictoire en direct :**
   - Les **DEUX fenêtres** de `agent1` sont instantanément verrouillées et déconnectées.
   - Toute tentative de reconnexion avec le mot de passe de `agent1` renvoie l'erreur `M_USER_DEACTIVATED`.

---

### 11. Vérification Contradictoire de l'Absence de Texte Clair (Jour 2)

Exécutez le script d'audit contradictoire pour prouver au jury qu'aucun message n'est lisible sur l'infrastructure :

**Sur Linux / macOS :**
```bash
./scripts/verify_no_cleartext.sh "TopSecretBurkina2026"
```

**Sur Windows (PowerShell) :**
```powershell
.\scripts\verify_no_cleartext.ps1 -SearchText "TopSecretBurkina2026"
```

*Comportement garanti :*
- Le script inspecte tous les logs Synapse via `docker compose logs synapse`.
- Le script interroge directement les tables `events` et `event_json` dans PostgreSQL via `docker compose exec db psql`.
- Affiche **« OK : aucun clair trouvé »** (code de sortie 0) ou **« ÉCHEC : clair détecté »** (code 1).

---

### 12. Ce que le serveur voit et ne voit pas

#### Ce que le serveur Synapse et la base PostgreSQL VOIENT :
- L'identifiant des comptes (`@agent1:localhost`).
- L'horodatage exact des événements.
- L'identifiant des salons de discussion (`!room_id:localhost`).
- Le statut d'adhésion (*membership*) : invitations, jointures, départs.
- **La charge utile chiffrée** : sous forme de bloc opaque `m.room.encrypted`.

#### Ce que le serveur et la base de données NE PEUVENT JAMAIS VOIR :
- **Le contenu en clair des messages** : chiffré sur le terminal émetteur avec Megolm.
- **Les clés privées de déchiffrement** : stockées exclusivement dans l'IndexedDB locale du navigateur.
- **Les messages futurs après révocation** : l'agent révoqué perd ses appareils et ses clés de session, le rendant mathématiquement incapable de déchiffrer les futurs échanges.

---

### 13. Décision Stratégique sur le 2FA

Pour la démonstration locale sur `http://localhost`, l'intégration d'un SSO/OIDC externe (type Authelia ou Keycloak) a été **volontairement reportée à la phase de production TLS** :
1. **Contraintes de sécurité des navigateurs (SameSite / WebCrypto)** : Les flux de redirection SSO/OIDC sans HTTPS échouent fréquemment en local sur les navigateurs stricts (cookies de session tiers rejetés).
2. **Évolution vers Element X et MAS** : Element X exige le nouveau **Matrix Authentication Service (MAS)** et ne supporte pas le module SSO legacy de Synapse.
3. **Mesures compensatoires Jour 2** : Mots de passe à haute entropie (générés par l'autorité) + révocation immédiate multi-appareils + isolation réseau totale de la base.
Consultez `docs/SECURITY.md` pour le plan détaillé de déploiement MAS / FIDO2 en production.

