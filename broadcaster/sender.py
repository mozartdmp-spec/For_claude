"""Движок рассылки: создаёт кампанию и отправляет её по выбранным каналам.

Каналы работают параллельно, внутри канала — по одному сообщению с паузой.
WhatsApp не отправляется автоматически: доставки остаются в статусе «wa_queue»,
менеджер отправляет их вручную по готовым ссылкам из бота или веб-панели.
"""
import asyncio
import html
import logging
from typing import Awaitable, Callable

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError, TelegramRetryAfter

import config
import formatting as fmt
from channels import email as email_channel
from channels.max_bot import MaxBot, MaxError
from storage import Storage

log = logging.getLogger("sender")
Progress = Callable[[int], Awaitable[None]]

running: dict[int, asyncio.Task] = {}


def unsubscribe_url(token: str) -> str | None:
    return f"{config.PUBLIC_URL}/u/{token}" if config.PUBLIC_URL else None


def available_channels(tg_bot: Bot | None, max_bot: MaxBot | None) -> list[str]:
    out = []
    if tg_bot:
        out.append("telegram")
    if max_bot:
        out.append("max")
    if email_channel.enabled():
        out.append("email")
    out.append("whatsapp")
    return out


class Sender:
    def __init__(self, storage: Storage, tg_bot: Bot | None, max_bot: MaxBot | None):
        self.storage = storage
        self.tg_bot = tg_bot
        self.max_bot = max_bot

    def start(self, campaign_id: int, on_done: Progress | None = None) -> None:
        running[campaign_id] = asyncio.create_task(self._run(campaign_id, on_done))

    async def _run(self, campaign_id: int, on_done: Progress | None) -> None:
        camp = self.storage.campaign(campaign_id)
        channels = camp["channels"].split(",")
        jobs = []
        if "telegram" in channels:
            jobs.append(self._telegram(camp))
        if "max" in channels:
            jobs.append(self._max(camp))
        if "email" in channels:
            jobs.append(self._email(camp))
        if "whatsapp" in channels:
            for d in self.storage.deliveries(campaign_id, "whatsapp", "pending"):
                self.storage.set_delivery(d["id"], "wa_queue")
        try:
            await asyncio.gather(*jobs)
        finally:
            self.storage.set_campaign_status(campaign_id, "done")
            running.pop(campaign_id, None)
        if on_done:
            await on_done(campaign_id)

    def _text(self, camp, full_name: str) -> str:
        return fmt.with_disclaimer(fmt.personalize(camp["text_html"], full_name))

    # ---------- каналы ----------

    async def _telegram(self, camp) -> None:
        for d in self.storage.deliveries(camp["id"], "telegram", "pending"):
            text = fmt.sanitize(self._text(camp, d["full_name"]))
            while True:
                try:
                    if camp["tg_copy_msg"]:
                        await self.tg_bot.copy_message(d["tg_id"], camp["tg_copy_chat"], camp["tg_copy_msg"],
                                                       caption=text if len(text) <= 1024 else None)
                    else:
                        await self.tg_bot.send_message(d["tg_id"], text)
                    self.storage.set_delivery(d["id"], "sent")
                    break
                except TelegramRetryAfter as e:
                    await asyncio.sleep(e.retry_after + 1)
                except TelegramForbiddenError:
                    self.storage.set_unsub(d["contact_id"], "telegram")
                    self.storage.set_delivery(d["id"], "blocked", "клиент заблокировал бота")
                    break
                except TelegramBadRequest as e:
                    self.storage.set_delivery(d["id"], "failed", e.message)
                    break
            await asyncio.sleep(config.MESSENGER_DELAY)

    async def _max(self, camp) -> None:
        for d in self.storage.deliveries(camp["id"], "max", "pending"):
            text = fmt.sanitize(self._text(camp, d["full_name"]))
            for attempt in range(3):
                try:
                    await self.max_bot.send(d["max_id"], text)
                    self.storage.set_delivery(d["id"], "sent")
                    break
                except MaxError as e:
                    if e.status == 429 and attempt < 2:
                        await asyncio.sleep(5)
                        continue
                    if e.status == 403:
                        self.storage.set_unsub(d["contact_id"], "max")
                        self.storage.set_delivery(d["id"], "blocked", "клиент остановил бота")
                    else:
                        self.storage.set_delivery(d["id"], "failed", str(e))
                    break
                except Exception as e:
                    self.storage.set_delivery(d["id"], "failed", str(e))
                    break
            await asyncio.sleep(config.MESSENGER_DELAY)

    async def _email(self, camp) -> None:
        mailer = email_channel.Mailer()
        try:
            for d in self.storage.deliveries(camp["id"], "email", "pending"):
                if self.storage.emails_sent_today() >= config.EMAIL_DAILY_LIMIT:
                    self.storage.set_delivery(d["id"], "failed", "достигнут дневной лимит писем — отправьте остаток завтра")
                    continue
                unsub = unsubscribe_url(d["token"])
                text = self._text(camp, d["full_name"])
                msg = email_channel.build(
                    d["email"], d["full_name"], html.unescape(fmt.personalize(camp["subject"], d["full_name"])),
                    fmt.to_email_html(text, unsub), fmt.to_email_text(text, unsub), unsub,
                )
                try:
                    await mailer.send(msg)
                    self.storage.set_delivery(d["id"], "sent")
                except Exception as e:
                    log.warning("email %s: %s", d["email"], e)
                    self.storage.set_delivery(d["id"], "failed", f"{type(e).__name__}: {e}")
                await asyncio.sleep(config.EMAIL_DELAY)
        finally:
            mailer.close()

    # ---------- WhatsApp (вручную) ----------

    def whatsapp_queue(self, campaign_id: int) -> list[dict]:
        camp = self.storage.campaign(campaign_id)
        out = []
        for d in self.storage.deliveries(campaign_id, "whatsapp"):
            text = fmt.to_whatsapp(self._text(camp, d["full_name"]))
            out.append({"id": d["id"], "name": d["full_name"], "phone": d["phone"], "status": d["status"],
                        "link": fmt.whatsapp_link(d["phone"], text)})
        return out


def retry_failed(storage: Storage, campaign_id: int) -> int:
    """Возвращает неудачные доставки (кроме заблокировавших) в очередь."""
    n = 0
    for d in storage.deliveries(campaign_id, status="failed"):
        storage.set_delivery(d["id"], "pending")
        n += 1
    return n
