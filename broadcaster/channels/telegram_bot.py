"""Telegram-бот: подписка клиентов по номеру телефона и пульт администратора."""
import html
import logging
from dataclasses import dataclass, field

from aiogram import Bot, Dispatcher, F
from aiogram.exceptions import TelegramBadRequest
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

import config
import formatting as fmt
import sender as sender_mod
from channels import email as email_channel
from storage import CHANNEL_TITLES, Storage, first_name, normalize_phone, parse_contacts

log = logging.getLogger("telegram")

CONTACT_KB = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="📱 Поделиться номером", request_contact=True)]],
    resize_keyboard=True,
    one_time_keyboard=True,
)

ADMIN_HELP = (
    "<b>Пульт рассылки</b>\n"
    "📎 Пришлите .xlsx или .csv — импорт клиентов (колонки ФИО, Телефон, Email)\n"
    "/broadcast — новая рассылка\n"
    "/stats — база и каналы\n"
    "/campaigns — последние рассылки\n"
    "/links — ссылки на ботов для приглашения клиентов\n"
    "/unlinked — Excel с клиентами, не подключившими мессенджеры\n"
    "/emailtest — проверить подключение к почте\n"
    "/clear — удалить всю базу\n\n"
    "В тексте: {name} — ФИО, {first_name} — имя."
)


@dataclass
class Draft:
    text_html: str
    tg_copy: tuple[int, int] | None
    channels: set[str] = field(default_factory=set)
    subject: str | None = None
    waiting_subject: bool = False


def build_dispatcher(storage: Storage, get_sender) -> Dispatcher:
    dp = Dispatcher()
    is_admin = F.from_user.id.in_(config.TG_ADMIN_IDS)
    waiting_draft: set[int] = set()
    drafts: dict[int, Draft] = {}

    # ---------- клиенты ----------

    @dp.message(CommandStart(), ~is_admin)
    async def client_start(message: Message) -> None:
        await message.answer(
            "Здравствуйте! Чтобы получать наши инвестиционные идеи и аналитику, "
            "нажмите кнопку ниже и поделитесь номером телефона.\n\n"
            "Отписаться можно в любой момент командой /stop.",
            reply_markup=CONTACT_KB,
        )

    @dp.message(F.contact, ~is_admin)
    async def on_contact(message: Message) -> None:
        contact = message.contact
        if contact.user_id != message.from_user.id:
            await message.answer("Пожалуйста, отправьте свой номер кнопкой ниже.", reply_markup=CONTACT_KB)
            return
        phone = normalize_phone(contact.phone_number)
        full_name = storage.link_messenger("telegram", phone, message.from_user.id) if phone else None
        if full_name:
            await message.answer(f"Спасибо, {html.escape(first_name(full_name))}! Вы подписаны на рассылку.",
                                 reply_markup=ReplyKeyboardRemove())
        else:
            await message.answer("К сожалению, мы не нашли ваш номер в базе клиентов. "
                                 "Если вы наш клиент — свяжитесь с вашим менеджером.",
                                 reply_markup=ReplyKeyboardRemove())

    @dp.message(Command("stop"), ~is_admin)
    async def client_stop(message: Message) -> None:
        storage.set_messenger_sub("telegram", message.from_user.id, False)
        await message.answer("Вы отписаны от рассылки. Подписаться снова — /subscribe.")

    @dp.message(Command("subscribe"), ~is_admin)
    async def client_subscribe(message: Message) -> None:
        if storage.set_messenger_sub("telegram", message.from_user.id, True):
            await message.answer("Вы снова подписаны на рассылку.")
        else:
            await message.answer("Поделитесь номером, чтобы подписаться.", reply_markup=CONTACT_KB)

    # ---------- администратор: база ----------

    @dp.message(CommandStart(), is_admin)
    @dp.message(Command("help"), is_admin)
    async def admin_help(message: Message) -> None:
        await message.answer(ADMIN_HELP)

    @dp.message(Command("stats"), is_admin)
    async def cmd_stats(message: Message) -> None:
        s = storage.stats()
        await message.answer(
            f"Клиентов в базе: <b>{s['total']}</b>\n\n"
            f"Доступны по каналам:\n"
            f"• Telegram: <b>{s['telegram']}</b> (не подключились: {s['tg_pending']})\n"
            f"• MAX: <b>{s['max']}</b> (не подключились: {s['max_pending']})\n"
            f"• E-mail: <b>{s['email']}</b>\n"
            f"• WhatsApp (вручную): <b>{s['whatsapp']}</b>"
        )

    @dp.message(Command("links"), is_admin)
    async def cmd_links(message: Message, bot: Bot) -> None:
        me = await bot.get_me()
        text = f"Telegram: https://t.me/{me.username}?start=hi\n"
        text += f"MAX: {config.MAX_BOT_LINK}\n" if config.MAX_BOT_LINK else "MAX: укажите MAX_BOT_LINK в .env\n"
        text += ("\nОтправьте ссылки клиентам по почте или в WhatsApp: после нажатия «Поделиться номером» "
                 "клиент автоматически попадёт в рассылку этого мессенджера.")
        await message.answer(text, disable_web_page_preview=True)

    @dp.message(Command("unlinked"), is_admin)
    async def cmd_unlinked(message: Message) -> None:
        await message.answer_document(BufferedInputFile(storage.export_unlinked(), filename="not_connected.xlsx"))

    @dp.message(Command("emailtest"), is_admin)
    async def cmd_emailtest(message: Message) -> None:
        if not email_channel.enabled():
            await message.answer("Почта не настроена: заполните SMTP_HOST, SMTP_USER, SMTP_PASSWORD в .env")
            return
        res = email_channel.check_connection()
        await message.answer("✅ Подключение к почте работает" if res == "ok" else f"❌ {html.escape(res)}")

    @dp.message(Command("clear"), is_admin)
    async def cmd_clear(message: Message) -> None:
        await message.answer("Удалить всех клиентов и историю рассылок?", reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="🗑 Да, удалить всё", callback_data="clear:yes"),
            InlineKeyboardButton(text="Отмена", callback_data="clear:no"),
        ]]))

    @dp.callback_query(F.data.startswith("clear:"), is_admin)
    async def on_clear(call: CallbackQuery) -> None:
        if call.data == "clear:yes":
            storage.clear()
        await call.message.edit_text("База очищена." if call.data == "clear:yes" else "Отменено.")

    @dp.message(F.document, is_admin, F.func(lambda m: m.from_user.id not in waiting_draft))
    async def on_file(message: Message, bot: Bot) -> None:
        name = message.document.file_name or ""
        if not name.lower().endswith((".xlsx", ".xlsm", ".csv")):
            await message.answer("Нужен файл .xlsx или .csv (старый .xls пересохраните как .xlsx).")
            return
        file = await bot.download(message.document)
        try:
            contacts, skipped = parse_contacts(file.read(), name)
        except Exception as e:
            log.exception("ошибка чтения файла")
            await message.answer(f"Не удалось прочитать файл: {html.escape(str(e))}")
            return
        r = storage.import_contacts(contacts, skipped)
        text = f"✅ Импорт завершён\nДобавлено: <b>{r.added}</b>\nОбновлено: <b>{r.updated}</b>"
        if skipped:
            shown = "\n".join(html.escape(s) for s in skipped[:20])
            more = f"\n…и ещё {len(skipped) - 20}" if len(skipped) > 20 else ""
            text += f"\nПропущено (нет ФИО или контактов): <b>{len(skipped)}</b>\n{shown}{more}"
        await message.answer(text)

    # ---------- администратор: рассылка ----------

    def channels_kb(draft: Draft) -> InlineKeyboardMarkup:
        rows = []
        for ch in sender_mod.available_channels(get_sender().tg_bot, get_sender().max_bot):
            mark = "✅" if ch in draft.channels else "⬜️"
            note = " (вручную)" if ch == "whatsapp" else ""
            rows.append([InlineKeyboardButton(
                text=f"{mark} {CHANNEL_TITLES[ch]}{note} — {len(storage.reachable(ch))}",
                callback_data=f"ch:{ch}")])
        rows.append([InlineKeyboardButton(text="Далее ➡️", callback_data="ch:next"),
                     InlineKeyboardButton(text="Отмена", callback_data="bc:cancel")])
        return InlineKeyboardMarkup(inline_keyboard=rows)

    @dp.message(Command("broadcast"), is_admin)
    async def cmd_broadcast(message: Message) -> None:
        waiting_draft.add(message.from_user.id)
        await message.answer(
            "Пришлите текст рассылки (можно с фото, видео или документом — медиа уйдёт только в Telegram).\n"
            "Подстановки: {name} — ФИО, {first_name} — имя. Дисклеймер добавится автоматически.\n/cancel — отмена."
        )

    @dp.message(Command("cancel"), is_admin)
    async def cmd_cancel(message: Message) -> None:
        waiting_draft.discard(message.from_user.id)
        drafts.pop(message.from_user.id, None)
        await message.answer("Отменено.")

    @dp.message(is_admin, F.func(lambda m: m.from_user.id in waiting_draft))
    async def on_draft(message: Message, bot: Bot) -> None:
        waiting_draft.discard(message.from_user.id)
        text_html = message.html_text if (message.text or message.caption) else ""
        if not text_html:
            await message.answer("Нужен текст или подпись к медиа. Начните заново: /broadcast")
            return
        is_media = message.text is None
        draft = Draft(text_html, (message.chat.id, message.message_id) if is_media else None)
        draft.channels = set(sender_mod.available_channels(get_sender().tg_bot, get_sender().max_bot)) - {"whatsapp"}
        drafts[message.from_user.id] = draft

        sample = fmt.sanitize(fmt.with_disclaimer(fmt.personalize(text_html, "Иванов Иван Иванович")))
        await message.answer("Так увидит сообщение клиент «Иванов Иван Иванович»:")
        try:
            if is_media:
                await bot.copy_message(message.chat.id, message.chat.id, message.message_id, caption=sample)
            else:
                await message.answer(sample)
        except TelegramBadRequest as e:
            drafts.pop(message.from_user.id, None)
            await message.answer(f"Сообщение не отправляется: {html.escape(e.message)}")
            return
        await message.answer("Выберите каналы:", reply_markup=channels_kb(draft))

    @dp.callback_query(F.data.startswith("ch:"), is_admin)
    async def on_channel(call: CallbackQuery) -> None:
        draft = drafts.get(call.from_user.id)
        if not draft:
            await call.answer("Черновик не найден, начните заново: /broadcast", show_alert=True)
            return
        ch = call.data[3:]
        if ch != "next":
            draft.channels ^= {ch}
            await call.message.edit_reply_markup(reply_markup=channels_kb(draft))
            return
        if not draft.channels:
            await call.answer("Выберите хотя бы один канал", show_alert=True)
            return
        if "email" in draft.channels:
            draft.waiting_subject = True
            suggestion = fmt.default_subject(draft.text_html)
            await call.message.edit_text(
                f"Напишите тему письма или нажмите кнопку, чтобы взять:\n<i>{html.escape(suggestion)}</i>",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="Взять эту тему", callback_data="subj:auto")]]))
            return
        await show_confirm(call.message, draft, edit=True)

    @dp.callback_query(F.data == "subj:auto", is_admin)
    async def on_subject_auto(call: CallbackQuery) -> None:
        draft = drafts.get(call.from_user.id)
        if draft:
            draft.subject = fmt.default_subject(draft.text_html)
            draft.waiting_subject = False
            await show_confirm(call.message, draft, edit=True)

    @dp.message(is_admin, F.text, F.func(lambda m: (d := drafts.get(m.from_user.id)) is not None and d.waiting_subject))
    async def on_subject(message: Message) -> None:
        draft = drafts[message.from_user.id]
        draft.subject = message.text.strip()[:150]
        draft.waiting_subject = False
        await show_confirm(message, draft, edit=False)

    async def show_confirm(target: Message, draft: Draft, edit: bool) -> None:
        lines = [f"• {CHANNEL_TITLES[ch]}: {len(storage.reachable(ch))}" + (" (вручную по ссылкам)" if ch == "whatsapp" else "")
                 for ch in sorted(draft.channels)]
        text = "Проверьте рассылку:\n" + "\n".join(lines)
        if draft.subject:
            text += f"\n\nТема письма: <i>{html.escape(draft.subject)}</i>"
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="🚀 Отправить", callback_data="bc:send"),
            InlineKeyboardButton(text="Отмена", callback_data="bc:cancel")]])
        if edit:
            await target.edit_text(text, reply_markup=kb)
        else:
            await target.answer(text, reply_markup=kb)

    @dp.callback_query(F.data.startswith("bc:"), is_admin)
    async def on_send(call: CallbackQuery, bot: Bot) -> None:
        draft = drafts.pop(call.from_user.id, None)
        if call.data == "bc:cancel" or draft is None:
            await call.message.edit_text("Рассылка отменена." if draft else "Черновик не найден: /broadcast")
            return
        subject = draft.subject or fmt.default_subject(draft.text_html)
        campaign_id = storage.create_campaign(subject, draft.text_html, sorted(draft.channels), draft.tg_copy)
        await call.message.edit_text(f"⏳ Рассылка №{campaign_id} запущена. Письма уходят с паузой "
                                     f"{config.EMAIL_DELAY:g} с, это нормально. Пришлю отчёт.")
        chat_id = call.message.chat.id

        async def on_done(cid: int) -> None:
            await bot.send_message(chat_id, report(cid), reply_markup=report_kb(cid))

        get_sender().start(campaign_id, on_done)

    def report(cid: int) -> str:
        names = {"sent": "доставлено", "failed": "ошибки", "blocked": "отписались", "pending": "в очереди",
                 "wa_queue": "ждут отправки", "wa_done": "отправлено вручную", "wa_skip": "пропущено"}
        lines = [f"<b>Рассылка №{cid}</b>"]
        for ch, st in storage.campaign_stats(cid).items():
            lines.append(f"{CHANNEL_TITLES[ch]}: " + ", ".join(f"{names.get(k, k)} {v}" for k, v in st.items()))
        return "\n".join(lines)

    def report_kb(cid: int) -> InlineKeyboardMarkup | None:
        rows = []
        if storage.deliveries(cid, "whatsapp", "wa_queue"):
            rows.append([InlineKeyboardButton(text="💬 Отправить в WhatsApp", callback_data=f"wa:{cid}:0")])
        if storage.deliveries(cid, status="failed"):
            rows.append([InlineKeyboardButton(text="🔁 Повторить неудачные", callback_data=f"retry:{cid}")])
        return InlineKeyboardMarkup(inline_keyboard=rows) if rows else None

    @dp.message(Command("campaigns"), is_admin)
    async def cmd_campaigns(message: Message) -> None:
        camps = storage.campaigns(5)
        if not camps:
            await message.answer("Рассылок пока не было.")
        for c in camps:
            await message.answer(f"{report(c['id'])}\n<i>{c['created_at'][:16].replace('T', ' ')} · "
                                 f"{html.escape(fmt.to_plain(c['text_html'])[:80])}…</i>", reply_markup=report_kb(c["id"]))

    @dp.callback_query(F.data.startswith("retry:"), is_admin)
    async def on_retry(call: CallbackQuery, bot: Bot) -> None:
        cid = int(call.data.split(":")[1])
        if cid in sender_mod.running:
            await call.answer("Рассылка ещё идёт", show_alert=True)
            return
        n = sender_mod.retry_failed(storage, cid)
        chat_id = call.message.chat.id

        async def on_done(c: int) -> None:
            await bot.send_message(chat_id, report(c), reply_markup=report_kb(c))

        get_sender().start(cid, on_done)
        await call.answer(f"Повторяю {n} сообщений")

    # ---------- WhatsApp: карточки по одному клиенту ----------

    @dp.callback_query(F.data.startswith("wa"), is_admin)
    async def on_wa(call: CallbackQuery) -> None:
        parts = call.data.split(":")
        action, cid = parts[0], int(parts[1])
        if action in ("wadone", "waskip"):
            storage.set_delivery(int(parts[2]), "wa_done" if action == "wadone" else "wa_skip")
        queue = [q for q in get_sender().whatsapp_queue(cid) if q["status"] == "wa_queue"]
        if not queue:
            await call.message.edit_text(f"✅ Очередь WhatsApp по рассылке №{cid} пуста.\n\n{report(cid)}")
            return
        q = queue[0]
        text = (f"💬 WhatsApp · осталось <b>{len(queue)}</b>\n\n<b>{html.escape(q['name'])}</b>\n+{q['phone']}\n\n"
                "Нажмите «Открыть WhatsApp», отправьте сообщение и вернитесь сюда.")
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="Открыть WhatsApp", url=q["link"])],
            [InlineKeyboardButton(text="✅ Отправлено", callback_data=f"wadone:{cid}:{q['id']}"),
             InlineKeyboardButton(text="Пропустить", callback_data=f"waskip:{cid}:{q['id']}")],
        ])
        try:
            await call.message.edit_text(text, reply_markup=kb, disable_web_page_preview=True)
        except TelegramBadRequest as e:
            if "not modified" in e.message:
                return
            # слишком длинная ссылка для кнопки — даём текст для копирования
            kb.inline_keyboard[0] = [InlineKeyboardButton(text="Открыть чат", url=f"https://wa.me/{q['phone']}")]
            plain = fmt.to_whatsapp(fmt.with_disclaimer(fmt.personalize(storage.campaign(cid)["text_html"], q["name"])))
            await call.message.edit_text(text + f"\n\nТекст (нажмите, чтобы скопировать):\n<code>{html.escape(plain[:3000])}</code>",
                                         reply_markup=kb)

    return dp
