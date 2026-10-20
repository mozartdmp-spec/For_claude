"""Telegram-бот для рассылки по базе клиентов из Excel.

Админ загружает .xlsx с ФИО и телефонами. Клиент нажимает /start и делится
своим номером — бот находит его в базе и подписывает на рассылку.
Админ отправляет рассылку командой /broadcast, текст можно персонализировать
подстановками {name} (полное ФИО) и {first_name} (имя).
"""
import asyncio
import html
import logging
import os

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter, TelegramBadRequest
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)
from dotenv import load_dotenv

from storage import Storage, first_name, normalize_phone, parse_excel

load_dotenv()
BOT_TOKEN = os.environ["BOT_TOKEN"]
ADMIN_IDS = {int(x) for x in os.getenv("ADMIN_IDS", "").replace(" ", "").split(",") if x}
SEND_DELAY = 0.05  # ~20 сообщений в секунду, ниже лимита Telegram (30/с)

storage = Storage(os.getenv("DB_PATH", "bot.db"))
dp = Dispatcher()
is_admin = F.from_user.id.in_(ADMIN_IDS)

# админы, от которых ждём текст рассылки, и их черновики (admin_id -> сообщение)
waiting_for_draft: set[int] = set()
drafts: dict[int, Message] = {}

CONTACT_KB = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="📱 Поделиться номером", request_contact=True)]],
    resize_keyboard=True,
    one_time_keyboard=True,
)

ADMIN_HELP = (
    "<b>Команды администратора</b>\n"
    "📎 Пришлите .xlsx-файл — импорт контактов (колонки «ФИО» и «Телефон»)\n"
    "/broadcast — новая рассылка\n"
    "/stats — статистика базы\n"
    "/unlinked — Excel с клиентами, ещё не подключившими бота\n"
    "/link — ссылка на бота для приглашения клиентов\n"
    "/clear — удалить все контакты\n\n"
    "В тексте рассылки можно использовать {name} — ФИО и {first_name} — имя."
)


def personalize(template: str | None, full_name: str) -> str | None:
    if template is None:
        return None
    return template.replace("{name}", html.escape(full_name)).replace(
        "{first_name}", html.escape(first_name(full_name))
    )


async def send_one(bot: Bot, chat_id: int, draft: Message, full_name: str) -> None:
    if draft.text:
        await bot.send_message(chat_id, personalize(draft.html_text, full_name))
    else:
        caption = personalize(draft.html_text, full_name) if draft.caption else None
        await bot.copy_message(chat_id, draft.chat.id, draft.message_id, caption=caption)


# ---------- клиенты ----------

@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    if message.from_user.id in ADMIN_IDS:
        await message.answer(ADMIN_HELP)
        return
    await message.answer(
        "Здравствуйте! Чтобы получать наши новости и предложения, "
        "нажмите кнопку ниже и поделитесь номером телефона.\n\n"
        "Отписаться можно в любой момент командой /stop.",
        reply_markup=CONTACT_KB,
    )


@dp.message(F.contact)
async def on_contact(message: Message) -> None:
    contact = message.contact
    if contact.user_id != message.from_user.id:
        await message.answer("Пожалуйста, отправьте свой номер кнопкой ниже.", reply_markup=CONTACT_KB)
        return
    phone = normalize_phone(contact.phone_number)
    full_name = storage.link(phone, message.from_user.id) if phone else None
    if full_name:
        await message.answer(
            f"Спасибо, {html.escape(first_name(full_name))}! Вы подписаны на рассылку.",
            reply_markup=ReplyKeyboardRemove(),
        )
    else:
        await message.answer(
            "К сожалению, мы не нашли ваш номер в базе клиентов. "
            "Если вы наш клиент — свяжитесь с менеджером.",
            reply_markup=ReplyKeyboardRemove(),
        )


@dp.message(Command("stop"))
async def cmd_stop(message: Message) -> None:
    storage.set_subscribed(message.from_user.id, False)
    await message.answer("Вы отписаны от рассылки. Подписаться снова — /subscribe.")


@dp.message(Command("subscribe"))
async def cmd_subscribe(message: Message) -> None:
    if storage.set_subscribed(message.from_user.id, True):
        await message.answer("Вы снова подписаны на рассылку.")
    else:
        await message.answer("Поделитесь номером, чтобы подписаться.", reply_markup=CONTACT_KB)


# ---------- администратор ----------

@dp.message(Command("help"), is_admin)
async def cmd_help(message: Message) -> None:
    await message.answer(ADMIN_HELP)


@dp.message(Command("stats"), is_admin)
async def cmd_stats(message: Message) -> None:
    s = storage.stats()
    await message.answer(
        f"Контактов в базе: <b>{s['total']}</b>\n"
        f"Подключили бота: <b>{s['linked']}</b>\n"
        f"Получат рассылку: <b>{s['subscribed']}</b>\n"
        f"Ещё не подключились: <b>{s['total'] - s['linked']}</b>"
    )


@dp.message(Command("link"), is_admin)
async def cmd_link(message: Message, bot: Bot) -> None:
    me = await bot.get_me()
    await message.answer(
        f"Ссылка для клиентов: https://t.me/{me.username}?start=hi\n"
        "Отправьте её клиентам по SMS, WhatsApp или email — после нажатия «Поделиться номером» "
        "они попадут в рассылку."
    )


@dp.message(Command("unlinked"), is_admin)
async def cmd_unlinked(message: Message) -> None:
    await message.answer_document(
        BufferedInputFile(storage.export_unlinked(), filename="not_connected.xlsx")
    )


@dp.message(Command("clear"), is_admin)
async def cmd_clear(message: Message) -> None:
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🗑 Да, удалить всё", callback_data="clear:yes"),
        InlineKeyboardButton(text="Отмена", callback_data="clear:no"),
    ]])
    await message.answer("Удалить все контакты из базы?", reply_markup=kb)


@dp.callback_query(F.data.startswith("clear:"), is_admin)
async def on_clear(call: CallbackQuery) -> None:
    if call.data == "clear:yes":
        storage.clear()
        await call.message.edit_text("База очищена.")
    else:
        await call.message.edit_text("Отменено.")


@dp.message(F.document, is_admin)
async def on_excel(message: Message, bot: Bot) -> None:
    name = (message.document.file_name or "").lower()
    if not name.endswith((".xlsx", ".xlsm")):
        await message.answer("Нужен файл Excel в формате .xlsx (старый .xls пересохраните как .xlsx).")
        return
    file = await bot.download(message.document)
    try:
        contacts, skipped = parse_excel(file.read())
    except Exception as e:
        logging.exception("Excel parse error")
        await message.answer(f"Не удалось прочитать файл: {html.escape(str(e))}")
        return
    result = storage.import_contacts(contacts, skipped)
    text = f"✅ Импорт завершён\nДобавлено: <b>{result.added}</b>\nОбновлено: <b>{result.updated}</b>"
    if skipped:
        shown = "\n".join(html.escape(s) for s in skipped[:20])
        more = f"\n…и ещё {len(skipped) - 20}" if len(skipped) > 20 else ""
        text += f"\nПропущено (нет ФИО или неверный номер): <b>{len(skipped)}</b>\n{shown}{more}"
    await message.answer(text)


@dp.message(Command("broadcast"), is_admin)
async def cmd_broadcast(message: Message) -> None:
    waiting_for_draft.add(message.from_user.id)
    await message.answer(
        "Пришлите сообщение для рассылки: текст, фото, видео или документ с подписью.\n"
        "Подстановки: {name} — ФИО, {first_name} — имя.\n/cancel — отмена."
    )


@dp.message(Command("cancel"), is_admin)
async def cmd_cancel(message: Message) -> None:
    waiting_for_draft.discard(message.from_user.id)
    drafts.pop(message.from_user.id, None)
    await message.answer("Отменено.")


@dp.message(is_admin, F.func(lambda m: m.from_user.id in waiting_for_draft))
async def on_draft(message: Message, bot: Bot) -> None:
    admin_id = message.from_user.id
    waiting_for_draft.discard(admin_id)
    drafts[admin_id] = message
    count = len(storage.recipients())

    await message.answer("Так увидит сообщение клиент «Иванов Иван Иванович»:")
    try:
        await send_one(bot, message.chat.id, message, "Иванов Иван Иванович")
    except TelegramBadRequest as e:
        drafts.pop(admin_id, None)
        await message.answer(f"Сообщение не отправляется: {html.escape(e.message)}")
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=f"🚀 Отправить ({count})", callback_data="bc:send"),
        InlineKeyboardButton(text="Отмена", callback_data="bc:cancel"),
    ]])
    await message.answer(f"Отправить рассылку {count} получателям?", reply_markup=kb)


@dp.callback_query(F.data.startswith("bc:"), is_admin)
async def on_broadcast_confirm(call: CallbackQuery, bot: Bot) -> None:
    draft = drafts.pop(call.from_user.id, None)
    if call.data == "bc:cancel" or draft is None:
        await call.message.edit_text("Рассылка отменена." if draft else "Черновик не найден, начните заново: /broadcast")
        return
    await call.message.edit_text("⏳ Рассылка запущена…")
    asyncio.create_task(run_broadcast(bot, call.message, draft))


async def run_broadcast(bot: Bot, status: Message, draft: Message) -> None:
    recipients = storage.recipients()
    sent = blocked = failed = 0
    for i, r in enumerate(recipients, 1):
        while True:
            try:
                await send_one(bot, r["tg_id"], draft, r["full_name"])
                sent += 1
                break
            except TelegramRetryAfter as e:
                await asyncio.sleep(e.retry_after + 1)
            except TelegramForbiddenError:
                storage.set_subscribed(r["tg_id"], False)
                blocked += 1
                break
            except Exception:
                logging.exception("send failed to %s", r["tg_id"])
                failed += 1
                break
        await asyncio.sleep(SEND_DELAY)
        if i % 50 == 0:
            try:
                await status.edit_text(f"⏳ Отправлено {i} из {len(recipients)}…")
            except TelegramBadRequest:
                pass
    await status.edit_text(
        f"✅ Рассылка завершена\nДоставлено: <b>{sent}</b>\n"
        f"Заблокировали бота (отписаны): <b>{blocked}</b>\nОшибок: <b>{failed}</b>"
    )


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    if not ADMIN_IDS:
        logging.warning("ADMIN_IDS не задан — админ-команды недоступны")
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
