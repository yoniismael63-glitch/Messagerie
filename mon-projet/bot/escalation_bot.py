#!/usr/bin/env python3
# ==============================================================================
# Bot d'Escalade et de Gestion de Suppléance - FasoMatrix (Jour 3)
# ==============================================================================
# RÈGLES DE SÉCURITÉ ABSOLUES DU HACKATHON :
# 1. Le bot n'est JAMAIS membre du salon chiffré (#actes-service).
# 2. Le bot ne reçoit AUCUNE clé Megolm et ne possède aucun module de déchiffrement.
# 3. Métadonnées minimales : aucun objet, corps ou secret n'est lu ni consigné.
# 4. L'accusé est vérifié formellement par comparaison du hash SHA-256 du ciphertext.
# 5. La main courante et les délégations sont persistantes dans data/ et rechargées au boot.
# ==============================================================================

import asyncio
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

import aiohttp
from dateutil import parser as date_parser

# Configuration du logging structuré en français (sans contenu confidentiel)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [BOT-ESCALADE] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("escalation_bot")

# Variables d'environnement
MATRIX_URL = os.environ.get("MATRIX_URL", "http://synapse:8008").rstrip("/")
BOT_USER = os.environ.get("BOT_USER", "bot")
BOT_PASSWORD = os.environ.get("BOT_PASSWORD", "CHANGEME_BOT_PASSWORD_24B")
SYNAPSE_ADMIN_USER = os.environ.get("SYNAPSE_ADMIN_USER", "admin")
SYNAPSE_ADMIN_PASSWORD = os.environ.get("SYNAPSE_ADMIN_PASSWORD", "AdminSecret2026!")

COORDINATION_ROOM_ID = os.environ.get("COORDINATION_ROOM_ID", "")
ADMIN_ROOM_ID = os.environ.get("ADMIN_ROOM_ID", "")
ACTES_SERVICE_ROOM_ID = os.environ.get("ACTES_SERVICE_ROOM_ID", "")

DATA_DIR = Path(os.environ.get("DATA_DIR", "/app/data" if os.path.exists("/app/data") else "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

MAIN_COURANTE_FILE = DATA_DIR / "main_courante.jsonl"
DELEGATIONS_FILE = DATA_DIR / "delegations.jsonl"


class EscalationBot:
    def __init__(self):
        self.bot_token: Optional[str] = None
        self.admin_token: Optional[str] = None
        self.bot_user_id: Optional[str] = None
        self.coordination_room_id: str = COORDINATION_ROOM_ID
        self.admin_room_id: str = ADMIN_ROOM_ID
        self.actes_service_room_id: str = ACTES_SERVICE_ROOM_ID
        
        # En mémoire pour les timers actifs (rechargés au boot)
        self.actes: Dict[str, Dict[str, Any]] = {}
        self.delegations: Dict[str, Dict[str, Any]] = {}
        self.session: Optional[aiohttp.ClientSession] = None
        self.since_token: Optional[str] = None

    async def initialize(self):
        """Initialise la session HTTP, l'authentification et recharge l'état persistant."""
        self.session = aiohttp.ClientSession()
        logger.info("Connexion du bot au serveur Synapse (%s)...", MATRIX_URL)
        
        # 1. Connexion bot
        await self.login_bot()
        
        # 2. Connexion admin (pour les requêtes de vérification d'état et d'événements)
        await self.login_admin()
        
        # 3. Résolution des salons si non fournis
        await self.resolve_rooms()
        
        # 4. RÈGLE CRITIQUE SÉCURITÉ : Vérifier l'exclusion stricte de #actes-service
        await self.enforce_service_room_exclusion()
        
        # 5. Rechargement des fichiers persistants
        self.load_main_courante()
        self.load_delegations()
        
        logger.info("Bot initialisé avec succès. Main courante : %d actes. Délégations : %d.",
                    len(self.actes), len(self.delegations))

    async def login_bot(self):
        payload = {
            "type": "m.login.password",
            "identifier": {"type": "m.id.user", "user": BOT_USER},
            "password": BOT_PASSWORD
        }
        retries = 15
        for attempt in range(1, retries + 1):
            try:
                async with self.session.post(f"{MATRIX_URL}/_matrix/client/v3/login", json=payload) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.bot_token = data.get("access_token")
                        self.bot_user_id = data.get("user_id")
                        logger.info("Authentification du bot réussie : %s", self.bot_user_id)
                        return
                    else:
                        text = await resp.text()
                        logger.warning("Échec login bot (tentative %d/%d) HTTP %d: %s", attempt, retries, resp.status, text)
            except Exception as e:
                logger.warning("Attente disponibilité Synapse pour le bot (tentative %d/%d): %s", attempt, retries, e)
            await asyncio.sleep(3)
        raise RuntimeError("Impossible de connecter le compte bot après plusieurs tentatives.")

    async def login_admin(self):
        payload = {
            "type": "m.login.password",
            "identifier": {"type": "m.id.user", "user": SYNAPSE_ADMIN_USER},
            "password": SYNAPSE_ADMIN_PASSWORD
        }
        try:
            async with self.session.post(f"{MATRIX_URL}/_matrix/client/v3/login", json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.admin_token = data.get("access_token")
                    logger.info("Jeton administrateur de contrôle acquis avec succès.")
                else:
                    logger.warning("Avertissement : échec acquisition jeton admin HTTP %d", resp.status)
        except Exception as e:
            logger.warning("Avertissement : connexion admin non disponible : %s", e)

    async def resolve_rooms(self):
        """Recherche ou crée les salons nécessaires pour la coordination et l'escalade."""
        headers = {"Authorization": f"Bearer {self.bot_token}"}
        
        # Résolution de coordination_room_id
        if not self.coordination_room_id:
            # Recherche par alias #actes-coordination:localhost
            server_name = self.bot_user_id.split(":")[-1] if self.bot_user_id else "localhost"
            alias = f"%23actes-coordination%3A{server_name}"
            async with self.session.get(f"{MATRIX_URL}/_matrix/client/v3/directory/room/{alias}", headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.coordination_room_id = data.get("room_id", "")
                    logger.info("Salon #actes-coordination résolu : %s", self.coordination_room_id)
        
        # Résolution de admin_room_id
        if not self.admin_room_id:
            server_name = self.bot_user_id.split(":")[-1] if self.bot_user_id else "localhost"
            alias = f"%23actes-admin%3A{server_name}"
            async with self.session.get(f"{MATRIX_URL}/_matrix/client/v3/directory/room/{alias}", headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.admin_room_id = data.get("room_id", "")
                    logger.info("Salon #actes-admin résolu : %s", self.admin_room_id)

        # Rejoindre les salons de coordination et admin s'ils existent
        for r_id in [self.coordination_room_id, self.admin_room_id]:
            if r_id:
                await self.join_room_if_needed(r_id)

    async def join_room_if_needed(self, room_id: str):
        headers = {"Authorization": f"Bearer {self.bot_token}"}
        async with self.session.post(f"{MATRIX_URL}/_matrix/client/v3/rooms/{room_id}/join", headers=headers) as resp:
            if resp.status == 200:
                logger.info("Bot a rejoint le salon de coordination %s", room_id)

    async def enforce_service_room_exclusion(self):
        """
        RÈGLE ÉLIMINATOIRE : Le bot ne doit JAMAIS être membre du salon chiffré (#actes-service).
        S'il est présent, il quitte immédiatement et consigne une alerte de sécurité.
        """
        headers = {"Authorization": f"Bearer {self.bot_token}"}
        async with self.session.get(f"{MATRIX_URL}/_matrix/client/v3/joined_rooms", headers=headers) as resp:
            if resp.status == 200:
                data = await resp.json()
                joined = data.get("joined_rooms", [])
                for room_id in joined:
                    # Vérifier l'alias ou l'identifiant du salon chiffré
                    is_service_room = False
                    if self.actes_service_room_id and room_id == self.actes_service_room_id:
                        is_service_room = True
                    else:
                        # Vérifier le nom ou l'alias
                        async with self.session.get(f"{MATRIX_URL}/_matrix/client/v3/rooms/{room_id}/state/m.room.name", headers=headers) as n_resp:
                            if n_resp.status == 200:
                                name_data = await n_resp.json()
                                if "actes-service" in name_data.get("name", "").lower():
                                    is_service_room = True
                    
                    if is_service_room:
                        logger.error("[ALERTE CRITIQUE DE SÉCURITÉ] Le bot a été détecté membre du salon chiffré %s ! Expulsion immédiate en cours...", room_id)
                        async with self.session.post(f"{MATRIX_URL}/_matrix/client/v3/rooms/{room_id}/leave", headers=headers) as leave_resp:
                            if leave_resp.status == 200:
                                logger.info("[SUCCÈS RÉGALIEN] Le bot a quitté le salon chiffré %s. Zéro clé Megolm acquise.", room_id)

    # --------------------------------------------------------------------------
    # Gestion de la Persistance : Main Courante & Délégations
    # --------------------------------------------------------------------------
    def load_main_courante(self):
        if not MAIN_COURANTE_FILE.exists():
            return
        with open(MAIN_COURANTE_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        record = json.loads(line)
                        acte_id = record.get("acte_id")
                        if acte_id:
                            self.actes[acte_id] = record
                    except json.JSONDecodeError:
                        continue

    def save_main_courante_entry(self, entry: Dict[str, Any]):
        acte_id = entry.get("acte_id")
        if not acte_id:
            return
        self.actes[acte_id] = entry
        # Écriture atomique avec historique complet
        with open(MAIN_COURANTE_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def load_delegations(self):
        if not DELEGATIONS_FILE.exists():
            return
        with open(DELEGATIONS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        record = json.loads(line)
                        d_id = record.get("delegation_id")
                        if d_id:
                            self.delegations[d_id] = record
                    except json.JSONDecodeError:
                        continue

    def save_delegation_entry(self, entry: Dict[str, Any]):
        d_id = entry.get("delegation_id")
        if not d_id:
            return
        self.delegations[d_id] = entry
        with open(DELEGATIONS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    # --------------------------------------------------------------------------
    # Vérification des Utilisateurs via l'API Admin de Synapse
    # --------------------------------------------------------------------------
    async def is_user_deactivated(self, user_id: str) -> bool:
        """Contrôle d'intégrité : vérifie si un agent a été révoqué administrativement."""
        if not self.admin_token:
            return False
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        encoded_user = aiohttp.helpers.quote(user_id, safe="")
        url = f"{MATRIX_URL}/_synapse/admin/v2/users/{encoded_user}"
        try:
            async with self.session.get(url, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("deactivated", False) is True
                elif resp.status == 404:
                    return True
        except Exception as e:
            logger.warning("Erreur vérification statut admin pour %s: %s", user_id, e)
        return False

    # --------------------------------------------------------------------------
    # Traitement des événements Métadonnées d'Actes de Service
    # --------------------------------------------------------------------------
    async def handle_acte_meta_event(self, content: Dict[str, Any], sender: str):
        acte_id = content.get("acte_id")
        destinataire = content.get("destinataire")
        deadline_str = content.get("deadline")
        room_id = content.get("room_id")
        event_id_chiffre = content.get("event_id_chiffre")
        requires_ack = content.get("requires_ack", True)
        ack_type = content.get("ack_type", "hash")

        if not acte_id or not destinataire or not deadline_str:
            logger.warning("Meta-événement acte invalide reçu : champs obligatoires manquants.")
            return

        # SÉCURITÉ : Vérifier qu'aucun texte en clair (objet, corps) n'est présent
        if "objet" in content or "corps" in content:
            logger.error("[VIOLATION SÉCURITÉ] Le meta-événement contient du texte en clair ('objet'/'corps') ! Rejet.")
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        logger.info("Réception acte de service metadata [acte_id: %s] destinataire: %s deadline: %s",
                    acte_id, destinataire, deadline_str)

        # Cas limite 1 : L'expéditeur a-t-il été révoqué avant l'échéance ?
        if await self.is_user_deactivated(sender):
            logger.warning("L'expéditeur %s est révoqué. Acte annulé d'office.", sender)
            entry = {
                "acte_id": acte_id,
                "expediteur": sender,
                "destinataire": destinataire,
                "deadline": deadline_str,
                "requires_ack": requires_ack,
                "ack_type": ack_type,
                "room_id": room_id,
                "event_id_chiffre": event_id_chiffre,
                "statut": "annule",
                "escalation_level": 0,
                "ts": now_iso,
                "motif": "Expéditeur révoqué"
            }
            self.save_main_courante_entry(entry)
            return

        # Cas limite 2 : Le destinataire est-il révoqué ?
        if await self.is_user_deactivated(destinataire):
            logger.warning("Le destinataire %s est révoqué ! Escalade immédiate requise.", destinataire)
            entry = {
                "acte_id": acte_id,
                "expediteur": sender,
                "destinataire": destinataire,
                "deadline": deadline_str,
                "requires_ack": requires_ack,
                "ack_type": ack_type,
                "room_id": room_id,
                "event_id_chiffre": event_id_chiffre,
                "statut": "escalade",
                "escalation_level": 1,
                "ts": now_iso,
                "motif": "Destinataire révoqué"
            }
            self.save_main_courante_entry(entry)
            await self.send_escalation_alert(entry, level=1, reason="Destinataire désactivé/révoqué")
            return

        # Enregistrement standard dans la main courante
        entry = {
            "acte_id": acte_id,
            "expediteur": sender,
            "destinataire": destinataire,
            "deadline": deadline_str,
            "requires_ack": requires_ack,
            "ack_type": ack_type,
            "room_id": room_id,
            "event_id_chiffre": event_id_chiffre,
            "statut": "envoye",
            "escalation_level": 1,
            "ts": now_iso
        }
        self.save_main_courante_entry(entry)

        # Routage des nouveaux actes pendant une délégation active
        await self.route_meta_to_active_delegation(entry)

    async def route_meta_to_active_delegation(self, entry: Dict[str, Any]):
        """Si le destinataire est sous suppléance active, transmet le meta-événement dans le sous-salon."""
        destinataire = entry["destinataire"]
        now = datetime.now(timezone.utc)
        
        for d_id, deleg in list(self.delegations.items()):
            if deleg.get("statut") == "active" and deleg.get("delegant") == destinataire:
                exp = date_parser.parse(deleg.get("expires_at"))
                if now < exp:
                    sub_room_id = deleg.get("sub_room_id")
                    if sub_room_id:
                        logger.info("[ROUTAGE SUPPLÉANCE] Transfert du meta-event acte_id=%s vers le sous-salon %s",
                                    entry["acte_id"], sub_room_id)
                        msg = {
                            "msgtype": "m.notice",
                            "body": f"[MANDAT SUPPLÉANCE ACTIF] Nouvel acte émis pour {destinataire}. Acte ID: {entry['acte_id']} | Échéance: {entry['deadline']}."
                        }
                        await self.send_room_message(sub_room_id, msg)

    # --------------------------------------------------------------------------
    # Traitement des Accusés Probants par Hash SHA-256
    # --------------------------------------------------------------------------
    async def handle_ack_event(self, content: Dict[str, Any], sender: str):
        acte_id = content.get("acte_id")
        ack_hash = content.get("ack_hash")
        ack_ts = content.get("ts", datetime.now(timezone.utc).isoformat())

        if not acte_id or not ack_hash:
            logger.warning("Accusé incomplet reçu : acte_id ou ack_hash manquant.")
            return

        entry = self.actes.get(acte_id)
        if not entry:
            logger.warning("Accusé reçu pour un acte inconnu : %s", acte_id)
            return

        room_id = entry.get("room_id")
        event_id = entry.get("event_id_chiffre")
        if not room_id or not event_id:
            logger.warning("Métadonnées d'événement chiffré absentes pour l'acte %s", acte_id)
            return

        # Récupération de l'événement chiffré depuis Synapse via token admin
        headers = {"Authorization": f"Bearer {self.admin_token or self.bot_token}"}
        url = f"{MATRIX_URL}/_matrix/client/v3/rooms/{room_id}/event/{event_id}"
        
        ciphertext = None
        async with self.session.get(url, headers=headers) as resp:
            if resp.status == 200:
                ev_data = await resp.json()
                ev_content = ev_data.get("content", {})
                ciphertext = ev_content.get("ciphertext")
            else:
                logger.error("Impossible de récupérer l'événement chiffré %s HTTP %d", event_id, resp.status)

        if not ciphertext:
            logger.error("Champ 'ciphertext' introuvable dans l'événement chiffré %s", event_id)
            return

        # Calcul contradictoire du hash SHA-256 du ciphertext Megolm
        computed_hash = "sha256:" + hashlib.sha256(ciphertext.encode("utf-8")).hexdigest()

        if ack_hash == computed_hash:
            prev_status = entry.get("statut", "envoye")
            new_status = "accuse_apres_escalade" if prev_status == "escalade" else "accuse"
            entry["statut"] = new_status
            entry["ack_ts"] = ack_ts
            entry["ack_sender"] = sender
            entry["ts"] = datetime.now(timezone.utc).isoformat()
            self.save_main_courante_entry(entry)
            
            logger.info("[SUCCÈS RÉGALIEN] Accusé probant VALIDÉ par hash pour l'acte %s (Statut: %s)", acte_id, new_status)
            
            # Notification dans le salon d'administration
            if self.admin_room_id:
                msg = {
                    "msgtype": "m.notice",
                    "body": f"[ACCUSÉ PROBANT VALIDÉ] L'acte {acte_id} a été accusé par {sender} (Statut : {new_status}). Hash vérifié."
                }
                await self.send_room_message(self.admin_room_id, msg)
        else:
            logger.warning("[REJET SÉCURITÉ] Hash d'accusé non conforme pour l'acte %s ! Reçu: %s... Attendu: %s...",
                           acte_id, ack_hash[:16], computed_hash[:16])

    # --------------------------------------------------------------------------
    # Gestion des Délégations & Création de Sous-Salons Isolés
    # --------------------------------------------------------------------------
    async def handle_delegation_event(self, content: Dict[str, Any], sender: str):
        delegation_id = content.get("delegation_id")
        delegant = content.get("delegant")
        delegataire = content.get("delegataire")
        scope = content.get("scope", "read_new_acts")
        purpose = content.get("purpose", "Suppléance de service")
        expires_at_str = content.get("expires_at")

        if not delegation_id or not delegant or not delegataire or not expires_at_str:
            logger.warning("Événement de délégation incomplet reçu.")
            return

        # Vérification d'habilitation : l'un des deux agents est-il révoqué ?
        if await self.is_user_deactivated(delegant) or await self.is_user_deactivated(delegataire):
            logger.error("[REJET DÉLÉGATION] Le délégant ou le délégataire est révoqué. Délégation interdite.")
            return

        sub_room_id = None
        if scope == "read_new_acts":
            # Création du sous-salon chiffré dédié (aucun historique passé)
            sub_room_id = await self.create_delegation_subroom(delegation_id, delegant, delegataire)

        now_iso = datetime.now(timezone.utc).isoformat()
        entry = {
            "delegation_id": delegation_id,
            "delegant": delegant,
            "delegataire": delegataire,
            "scope": scope,
            "purpose": purpose,
            "expires_at": expires_at_str,
            "sub_room_id": sub_room_id,
            "statut": "active",
            "revoked": False,
            "ts": now_iso
        }
        self.save_delegation_entry(entry)
        logger.info("[MANDAT DE SUPPLÉANCE ACTIF] ID: %s | Délégant: %s -> Délégataire: %s | Expire: %s",
                    delegation_id, delegant, delegataire, expires_at_str)

        # Notification explicite du délégataire (message direct ou salon)
        if sub_room_id:
            notice = {
                "msgtype": "m.text",
                "body": f"Notification officielle : Mandat de suppléance actif jusqu'au {expires_at_str} pour le périmètre [{scope}]. Objet : {purpose}. Ce sous-salon recevra les nouveaux actes."
            }
            await self.send_room_message(sub_room_id, notice)

    async def handle_delegation_revoked_event(self, content: Dict[str, Any], sender: str):
        delegation_id = content.get("delegation_id")
        if not delegation_id:
            return
        deleg = self.delegations.get(delegation_id)
        if not deleg or deleg.get("statut") != "active":
            return

        sub_room_id = deleg.get("sub_room_id")
        delegataire = deleg.get("delegataire")
        
        # Retrait immédiat du délégataire du sous-salon
        if sub_room_id and delegataire:
            await self.kick_user_from_room(sub_room_id, delegataire, "Révocation administrative immédiate du mandat de suppléance")

        deleg["statut"] = "revoquee"
        deleg["revoked"] = True
        deleg["ts"] = datetime.now(timezone.utc).isoformat()
        self.save_delegation_entry(deleg)
        
        logger.info("[RÉVOCATION IMMÉDIATE] Délégation %s révoquée. Agent %s expulsé du sous-salon.",
                    delegation_id, delegataire)

        if self.admin_room_id:
            await self.send_room_message(self.admin_room_id, {
                "msgtype": "m.notice",
                "body": f"[RÉVOCATION SUPPLÉANCE] Mandat {delegation_id} révoqué avec succès. L'accès du suppléant est coupé."
            })

    async def create_delegation_subroom(self, delegation_id: str, delegant: str, delegataire: str) -> Optional[str]:
        """Crée un sous-salon chiffré spécifique pour la suppléance temporelle."""
        headers = {"Authorization": f"Bearer {self.bot_token}"}
        payload = {
            "name": f"Suppleance-{delegation_id[:8]}",
            "preset": "private_chat",
            "visibility": "private",
            "initial_state": [
                {
                    "type": "m.room.encryption",
                    "state_key": "",
                    "content": {"algorithm": "m.megolm.v1.aes-sha2"}
                }
            ],
            "invite": [delegataire, delegant]
        }
        async with self.session.post(f"{MATRIX_URL}/_matrix/client/v3/createRoom", headers=headers, json=payload) as resp:
            if resp.status == 200:
                data = await resp.json()
                room_id = data.get("room_id")
                logger.info("Sous-salon de suppléance chiffré créé avec succès : %s", room_id)
                return room_id
            else:
                logger.error("Échec création sous-salon de suppléance HTTP %d: %s", resp.status, await resp.text())
                return None

    async def kick_user_from_room(self, room_id: str, user_id: str, reason: str):
        headers = {"Authorization": f"Bearer {self.bot_token}"}
        payload = {"user_id": user_id, "reason": reason}
        async with self.session.post(f"{MATRIX_URL}/_matrix/client/v3/rooms/{room_id}/kick", headers=headers, json=payload) as resp:
            if resp.status == 200:
                logger.info("Expulsion validée pour %s du salon %s", user_id, room_id)
            else:
                logger.warning("Échec expulsion %s du salon %s HTTP %d", user_id, room_id, resp.status)

    async def send_room_message(self, room_id: str, content: Dict[str, Any]):
        headers = {"Authorization": f"Bearer {self.bot_token}"}
        txn_id = f"m_{int(time.time() * 1000)}"
        async with self.session.put(f"{MATRIX_URL}/_matrix/client/v3/rooms/{room_id}/send/m.room.message/{txn_id}", headers=headers, json=content) as resp:
            return resp.status == 200

    async def send_escalation_alert(self, entry: Dict[str, Any], level: int = 1, reason: str = "Échéance dépassée"):
        if not self.admin_room_id:
            logger.warning("Impossible d'envoyer l'escalade : salon admin non configuré.")
            return
        
        # SÉCURITÉ RÉGALIENNE : Zéro contenu confidentiel dans l'escalade
        body = (
            f"🚨 [ALERTE D'ESCALADE - NIVEAU {level}] 🚨\n"
            f"- Acte de service ID : {entry['acte_id']}\n"
            f"- Destinataire nominatif : {entry['destinataire']}\n"
            f"- Échéance prescrite : {entry['deadline']}\n"
            f"- Niveau d'escalade : {level}\n"
            f"- Motif du déclenchement : {reason}\n"
            f"- Notice de sécurité : Le contenu de l'acte demeure chiffré de bout en bout et inaccessible au superviseur."
        )
        await self.send_room_message(self.admin_room_id, {"msgtype": "m.text", "body": body})
        logger.info("[ESCALADE NIVEAU %d TRANSMIS] Acte ID %s vers le salon de supervision.", level, entry["acte_id"])

    # --------------------------------------------------------------------------
    # Boucle de Surveillance des Deadlines et des Expirations
    # --------------------------------------------------------------------------
    async def scheduler_loop(self):
        """Surveille les échéances des actes et les expirations des mandats de suppléance."""
        while True:
            try:
                now = datetime.now(timezone.utc)
                now_iso = now.isoformat()

                # 1. Vérification des échéances d'actes (Escalade)
                for acte_id, entry in list(self.actes.items()):
                    if entry.get("statut") == "envoye":
                        deadline_str = entry.get("deadline")
                        if not deadline_str:
                            continue
                        try:
                            deadline = date_parser.parse(deadline_str)
                            if now >= deadline:
                                # Escalade niveau 1
                                entry["statut"] = "escalade"
                                entry["escalation_level"] = 1
                                entry["ts"] = now_iso
                                self.save_main_courante_entry(entry)
                                await self.send_escalation_alert(entry, level=1)
                        except Exception as e:
                            logger.error("Erreur parsing deadline pour acte %s: %s", acte_id, e)
                    
                    elif entry.get("statut") == "escalade" and entry.get("escalation_level") == 1:
                        # Escalade niveau 2 (après délai supplémentaire, ex: +1 minute après niveau 1)
                        escalade_ts = date_parser.parse(entry.get("ts", now_iso))
                        if (now - escalade_ts).total_seconds() >= 60:
                            entry["escalation_level"] = 2
                            entry["ts"] = now_iso
                            self.save_main_courante_entry(entry)
                            await self.send_escalation_alert(entry, level=2, reason="Relance superviseur niveau 2 (absence persistante d'accusé)")

                # 2. Vérification des expirations de délégations
                for d_id, deleg in list(self.delegations.items()):
                    if deleg.get("statut") == "active":
                        exp_str = deleg.get("expires_at")
                        if not exp_str:
                            continue
                        try:
                            exp = date_parser.parse(exp_str)
                            if now >= exp:
                                # Mandat expiré
                                deleg["statut"] = "expiree"
                                deleg["ts"] = now_iso
                                sub_room_id = deleg.get("sub_room_id")
                                delegataire = deleg.get("delegataire")
                                if sub_room_id and delegataire:
                                    await self.kick_user_from_room(sub_room_id, delegataire, "Fin de mandat de suppléance (échéance atteinte)")
                                
                                self.save_delegation_entry(deleg)
                                logger.info("[EXPIRATION MANDAT] La délégation %s a expiré. Agent %s retiré du sous-salon.", d_id, delegataire)
                                
                                if self.admin_room_id:
                                    await self.send_room_message(self.admin_room_id, {
                                        "msgtype": "m.notice",
                                        "body": f"[MANDAT EXPIRÉ] La suppléance de {delegataire} pour {deleg.get('delegant')} a pris fin."
                                    })
                        except Exception as e:
                            logger.error("Erreur parsing expiration délégation %s: %s", d_id, e)

            except Exception as e:
                logger.error("Erreur dans le cycle du scheduler : %s", e)

            await asyncio.sleep(5)

    # --------------------------------------------------------------------------
    # Boucle de Synchronisation Matrix Client-Server
    # --------------------------------------------------------------------------
    async def sync_loop(self):
        """Écoute les événements entrants dans #actes-coordination via /sync."""
        headers = {"Authorization": f"Bearer {self.bot_token}"}
        logger.info("Démarrage de l'écoute active Matrix /sync...")
        
        while True:
            url = f"{MATRIX_URL}/_matrix/client/v3/sync?timeout=10000"
            if self.since_token:
                url += f"&since={self.since_token}"
            
            try:
                async with self.session.get(url, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.since_token = data.get("next_batch")
                        
                        rooms = data.get("rooms", {}).get("join", {})
                        for room_id, r_data in rooms.items():
                            timeline_events = r_data.get("timeline", {}).get("events", [])
                            for ev in timeline_events:
                                ev_type = ev.get("type")
                                sender = ev.get("sender")
                                content = ev.get("content", {})
                                
                                # Ignorer les événements générés par le bot lui-même
                                if sender == self.bot_user_id:
                                    continue

                                if ev_type == "com.example.acte_service.meta":
                                    await self.handle_acte_meta_event(content, sender)
                                elif ev_type == "com.example.acte_service.ack":
                                    await self.handle_ack_event(content, sender)
                                elif ev_type == "com.example.delegation":
                                    await self.handle_delegation_event(content, sender)
                                elif ev_type == "com.example.delegation.revoked":
                                    await self.handle_delegation_revoked_event(content, sender)

                    else:
                        logger.warning("Réponse /sync anormale HTTP %d", resp.status)
                        await asyncio.sleep(3)
            except Exception as e:
                logger.error("Exception lors de la boucle /sync : %s", e)
                await asyncio.sleep(3)

    async def run(self):
        await self.initialize()
        await asyncio.gather(
            self.sync_loop(),
            self.scheduler_loop()
        )


if __name__ == "__main__":
    bot = EscalationBot()
    try:
        asyncio.run(bot.run())
    except KeyboardInterrupt:
        logger.info("Arrêt contrôlé du bot d'escalade.")
        sys.exit(0)
