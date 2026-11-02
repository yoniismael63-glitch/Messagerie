# GUIDE DU DÉPÔT PUBLIC GIT (PIÈCE 4)
## Procédure pour publier le dépôt avec un historique de commits progressifs

---

### Exigence du Concours
Le jury exige :
> *« Lien vers un dépôt Git public (GitHub, GitLab, Codeberg...) avec un historique de commits progressifs couvrant la durée du sprint ».*

Pour obtenir la note maximale, il ne faut **pas** faire un seul gros commit du type *"upload tout"*. Il faut montrer une démarche d'ingénieur rigoureuse avec des commits progressifs et cohérents.

---

### Étape 1 : Créer le dépôt sur GitHub (1 minute)
1. Rendez-vous sur [github.com/new](https://github.com/new).
2. Nom du dépôt : `fasomatrix-souverain` (ou le nom de votre équipe).
3. Visibilité : **Public** (Obligatoire selon le règlement).
4. Ne cochez ni README, ni .gitignore (notre projet les a déjà).
5. Cliquez sur **Create repository**.
6. Notez l'URL de votre dépôt (ex : `https://github.com/votre-nom/fasomatrix-souverain.git`).

---

### Étape 2 : Initialiser Git et créer l'historique progressif

Dans votre terminal (PowerShell sous Windows ou Bash sous Linux), placez-vous dans votre dossier `mon-projet` et exécutez ces commandes dans l'ordre :

```bash
# 1. Initialiser le dépôt local
git init
git branch -M main

# ------------------------------------------------------------------------------
# COMMIT 1 : Socle initial et environnement
# ------------------------------------------------------------------------------
git add .gitignore .env.example docker-compose.yml LICENSE
git commit -m "feat(infra): initialisation du socle conteneurisé Docker Compose et variables d'environnement"

# ------------------------------------------------------------------------------
# COMMIT 2 : Configuration Synapse et Nginx (Jour 1)
# ------------------------------------------------------------------------------
git add synapse/ nginx/ element/
git commit -m "feat(synapse): configuration de l'isolation souveraine (allow_federation: false) et reverse proxy Nginx"

# ------------------------------------------------------------------------------
# COMMIT 3 : Scripts de validation E2EE (Jour 1)
# ------------------------------------------------------------------------------
git add scripts/seed_demo.*
git commit -m "feat(security): script d'enrôlement et création de salon chiffré Megolm m.megolm.v1.aes-sha2"

# ------------------------------------------------------------------------------
# COMMIT 4 : Durcissement des identités & Révocation (Jour 2)
# ------------------------------------------------------------------------------
git add scripts/revoke_user.* scripts/promote_admin.* scripts/create_agents.*
git commit -m "feat(auth): implémentation de la révocation multi-appareils immédiate et gestion des rôles RBAC"

# ------------------------------------------------------------------------------
# COMMIT 5 : Audit de non-fuite en clair et documentation de sécurité (Jour 2)
# ------------------------------------------------------------------------------
git add scripts/verify_no_cleartext.* docs/ README.md
git commit -m "docs(audit): script d'audit anti-clair PostgreSQL et notes techniques régaliennes"
```

---

### Étape 3 : Lier et envoyer vers GitHub

Remplacez l'URL ci-dessous par la vôtre et lancez :

```bash
# Lier votre dépôt distant
git remote add origin https://github.com/votre-nom/fasomatrix-souverain.git

# Envoyer toutes les branches
git push -u origin main
```

---

### Résultat attendu :
Sur votre page GitHub :
1. Vous avez un magnifique historique de **5 commits clairs et professionnels** illustrant l'avancement du sprint (Jour 1 et Jour 2).
2. Aucun fichier sensible `.env` n'a été publié (grâce au `.gitignore`).
3. Le lien à fournir au jury dans votre dossier de candidature est :  
   👉 **`https://github.com/votre-nom/fasomatrix-souverain`**
