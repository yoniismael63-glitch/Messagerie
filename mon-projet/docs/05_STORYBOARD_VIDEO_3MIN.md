# SCÉNARIO & STORYBOARD DE LA VIDÉO DE DÉMONSTRATION (PIÈCE 5)
## Durée maximale : 3 minutes (03:00) | Chronométrage seconde par seconde

---

### Exigences du Jury :
1. Échange chiffré de bout en bout entre deux agents.
2. Révocation immédiate d'un agent.
3. Fonctionnalité innovante principale (Audit de non-fuite en clair dans la base de données).

---

### Découpage Minuté (00:00 - 03:00)

```
00:00 ─── Intro & Architecture (30s)
00:30 ─── Échange chiffré entre deux agents (50s)
01:20 ─── Démonstration de la Révocation Multi-Appareils (50s)
02:10 ─── Preuve Zero-Knowledge : Audit en base SQL (40s)
02:50 ─── Conclusion & Souveraineté (10s)
```

---

#### Séquence 1 : Introduction & Présentation du Socle (00:00 - 00:30)
- **Visuel à l'écran :** Terminal montrant `docker compose ps` avec les 4 conteneurs actifs (Synapse, PostgreSQL, Nginx, Element) puis l'interface d'accueil Element Web.
- **Voix off (à dire) :**  
  *« Bonjour aux membres du jury. Voici FASOMATRIX, notre socle souverain de messagerie instantanée sécurisée pour l'Administration Publique du Burkina Faso. Le système est totalement isolé : la fédération avec des serveurs étrangers est désactivée, les inscriptions libres sont verrouillées, et le serveur fonctionne selon le principe du Zero-Knowledge. »*

---

#### Séquence 2 : Échange Chiffré de Bout en Bout E2EE (00:30 - 01:20)
- **Visuel à l'écran :** Écran partagé en deux fenêtres :
  - À gauche : Fenêtre d'ordinateur connectée en tant qu'`agent1` (Landry).
  - À droite : Fenêtre de navigation privée (ou écran de smartphone) connectée en tant qu'`agent2` (Mandjide).
- **Action en direct :**
  1. `agent1` envoie dans le salon chiffré : *« Rapport d'opération alpha : coordonnées transmises avec succès. »*
  2. `agent2` reçoit le message instantanément et répond : *« Bien reçu, confirmation du chiffrement Megolm. »*
  3. Montrer le petit cadenas vert ou le bouclier de chiffrement dans les paramètres du salon pour prouver l'algorithme `m.megolm.v1.aes-sha2`.
- **Voix off (à dire) :**  
  *« Nous démontrons ici un échange confidentiel en direct entre deux agents. Le chiffrement Megolm est imposé automatiquement. Chaque message est chiffré de terminal à terminal avec AES-256 et HMAC-SHA-256. »*

---

#### Séquence 3 : Révocation Immédiate Multi-Appareils (01:20 - 02:10)
- **Visuel à l'écran :** 
  - La session d'`agent1` est ouverte à l'écran.
  - À côté, une fenêtre PowerShell de l'administrateur lance le script :
    `bash scripts/revoke_user.sh @agent1:localhost`  
    *(ou `powershell -ExecutionPolicy Bypass -File scripts\revoke_user.ps1 @agent1:localhost`)*
- **Action en direct :**
  1. Le script s'exécute, énumère les appareils actifs et confirme : `[RÉVOCATION MULTI-APPAREILS CONFIRMÉE AVEC SUCCÈS]`.
  2. Immédiatement, à l'écran, la session d'`agent1` saute et affiche l'écran de déconnexion : session invalidée !
  3. L'administrateur tente de reconnecter `agent1` : Synapse rejette la connexion avec le code d'erreur officiel `M_USER_DEACTIVATED`.
- **Voix off (à dire) :**  
  *« En cas de compromission d'un agent, l'administrateur exécute l'ordre de révocation atomique. En une fraction de seconde, tous les appareils de l'agent sont détruits, ses jetons de session sont révoqués et ses clés cryptographiques sont effacées. L'agent perd immédiatement l'accès à tous les salons. »*

---

#### Séquence 4 : Fonctionnalité Innovante — Audit Zéro-Clair en Base de Données (02:10 - 02:50)
- **Visuel à l'écran :** Dans le terminal, exécution du script de contrôle contradictoire :
  `bash scripts/verify_no_cleartext.sh "Rapport d'opération alpha"`
- **Action en direct :**
  1. Le script cherche la phrase secrète dans les logs Synapse : `0 occurrence`.
  2. Le script se connecte directement à la base relationnelle PostgreSQL et requête les tables `events` et `event_json`.
  3. Le résultat s'affiche en vert :  
     `RÉSULTAT OFFICIEL : OK : aucun clair trouvé`  
     `Code de retour : 0`
- **Voix off (à dire) :**  
  *« Voici notre innovation de contrôle régalien : un script d'audit qui inspecte contradictoirement les logs Synapse et les tables brutes de la base de données PostgreSQL. La preuve formelle est établie : la base ne contient aucun texte en clair, seulement du ciphertext Megolm. Même l'administrateur de la base ne peut rien espionner. »*

---

#### Séquence 5 : Conclusion (02:50 - 03:00)
- **Visuel à l'écran :** Affichage du dépôt GitHub du projet et du récapitulatif des 5 pièces jointes.
- **Voix off (à dire) :**  
  *« FasoMatrix offre ainsi à notre pays un socle autonome, souverain et cryptographiquement impénétrable. Merci pour votre attention. »*
