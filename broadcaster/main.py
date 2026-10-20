"""Запуск: Telegram-бот, MAX-бот и веб-панель в одном процессе."""
import asyncio
import logging

import uvicorn
from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

import config
from channels.max_bot import MaxBot
from channels.telegram_bot import build_dispatcher
from sender import Sender
from storage import Storage
from web import create_app

log = logging.getLogger("main")


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    storage = Storage(config.DB_PATH)
    tg_bot = Bot(config.TG_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML)) if config.TG_TOKEN else None
    max_bot = MaxBot(storage) if MaxBot.enabled() else None
    sender = Sender(storage, tg_bot, max_bot)
    get_sender = lambda: sender

    tasks = []
    if tg_bot:
        if not config.TG_ADMIN_IDS:
            log.warning("TG_ADMIN_IDS не задан — пульт в Telegram недоступен")
        dp = build_dispatcher(storage, get_sender)
        tasks.append(dp.start_polling(tg_bot, handle_signals=False))
    else:
        log.warning("TG_TOKEN не задан — Telegram отключён")
    if max_bot:
        tasks.append(max_bot.poll())
    else:
        log.warning("MAX_TOKEN не задан — MAX отключён")
    if config.WEB_PASSWORD:
        server = uvicorn.Server(uvicorn.Config(create_app(storage, get_sender), host=config.WEB_HOST,
                                               port=config.WEB_PORT, log_level="warning"))
        log.info("Веб-панель: http://%s:%s", config.WEB_HOST, config.WEB_PORT)
        tasks.append(server.serve())
    else:
        log.warning("WEB_PASSWORD не задан — веб-панель отключена")
    if not tasks:
        raise SystemExit("Ничего не настроено: заполните .env (см. .env.example)")
    try:
        await asyncio.gather(*tasks)
    finally:
        if max_bot:
            await max_bot.close()
        if tg_bot:
            await tg_bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
