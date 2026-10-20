"""Бот в мессенджере MAX (platform-api2.max.ru): подписка по номеру телефона и отправка сообщений."""
import asyncio
import html
import logging
import re
import ssl

import aiohttp

import config
from storage import Storage, first_name, normalize_phone

log = logging.getLogger("max")


class MaxError(Exception):
    def __init__(self, status: int, text: str):
        super().__init__(f"MAX API {status}: {text[:300]}")
        self.status = status


class MaxBot:
    def __init__(self, storage: Storage):
        self.storage = storage
        self.session: aiohttp.ClientSession | None = None

    @staticmethod
    def enabled() -> bool:
        return bool(config.MAX_TOKEN)

    async def _session(self) -> aiohttp.ClientSession:
        if self.session is None:
            ctx = ssl.create_default_context(cafile=config.MAX_CA_BUNDLE or None)
            self.session = aiohttp.ClientSession(
                base_url=config.MAX_API_URL,
                headers={"Authorization": config.MAX_TOKEN},
                connector=aiohttp.TCPConnector(ssl=ctx),
                timeout=aiohttp.ClientTimeout(total=120),
            )
        return self.session

    async def call(self, method: str, path: str, params: dict | list | None = None, json: dict | None = None) -> dict:
        session = await self._session()
        async with session.request(method, path, params=params, json=json) as resp:
            if resp.status >= 400:
                raise MaxError(resp.status, await resp.text())
            return await resp.json()

    async def send(self, user_id: int, text_html: str, keyboard: list | None = None) -> None:
        body: dict = {"text": text_html, "format": "html"}
        if keyboard:
            body["attachments"] = [{"type": "inline_keyboard", "payload": {"buttons": keyboard}}]
        await self.call("POST", "/messages", params={"user_id": user_id}, json=body)

    # ---------- подписка клиентов ----------

    async def _ask_contact(self, user_id: int) -> None:
        await self.send(
            user_id,
            "Здравствуйте! Чтобы получать наши инвестиционные идеи и аналитику, "
            "нажмите кнопку ниже и поделитесь номером телефона.\n\nОтписаться можно в любой момент: напишите <b>стоп</b>.",
            keyboard=[[{"type": "request_contact", "text": "📱 Поделиться номером"}]],
        )

    async def _on_message(self, msg: dict) -> None:
        sender = msg.get("sender") or {}
        user_id = sender.get("user_id")
        if not user_id:
            return
        body = msg.get("body") or {}
        for att in body.get("attachments") or []:
            if att.get("type") == "contact":
                await self._on_contact(user_id, att.get("payload") or {})
                return
        text = (body.get("text") or "").strip().lower()
        if text in ("стоп", "/stop", "stop", "отписаться"):
            self.storage.set_messenger_sub("max", user_id, False)
            await self.send(user_id, "Вы отписаны от рассылки. Чтобы подписаться снова, напишите <b>старт</b>.")
        elif text in ("старт", "/start", "start", "подписаться"):
            if self.storage.set_messenger_sub("max", user_id, True):
                await self.send(user_id, "Вы снова подписаны на рассылку.")
            else:
                await self._ask_contact(user_id)
        else:
            await self._ask_contact(user_id)

    async def _on_contact(self, user_id: int, payload: dict) -> None:
        owner = (payload.get("max_info") or {}).get("user_id")
        if owner and owner != user_id:
            await self.send(user_id, "Пожалуйста, поделитесь своим номером кнопкой ниже.")
            return
        match = re.search(r"TEL[^:\n]*:([+\d\s()-]+)", payload.get("vcf_info") or "")
        phone = normalize_phone(match.group(1)) if match else None
        full_name = self.storage.link_messenger("max", phone, user_id) if phone else None
        if full_name:
            await self.send(user_id, f"Спасибо, {html.escape(first_name(full_name))}! Вы подписаны на рассылку.")
        else:
            await self.send(user_id, "К сожалению, мы не нашли ваш номер в базе клиентов. "
                                     "Если вы наш клиент — свяжитесь с вашим менеджером.")

    async def poll(self) -> None:
        marker = None
        while True:
            try:
                params = [("timeout", 30), ("types", "message_created"), ("types", "bot_started")]
                if marker is not None:
                    params.append(("marker", marker))
                data = await self.call("GET", "/updates", params=params)
                marker = data.get("marker", marker)
                for upd in data.get("updates", []):
                    try:
                        if upd.get("update_type") == "bot_started":
                            await self._ask_contact(upd["user"]["user_id"])
                        elif upd.get("update_type") == "message_created":
                            await self._on_message(upd.get("message") or {})
                    except Exception:
                        log.exception("ошибка обработки обновления MAX")
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("ошибка получения обновлений MAX, повтор через 5 с")
                await asyncio.sleep(5)

    async def close(self) -> None:
        if self.session:
            await self.session.close()
