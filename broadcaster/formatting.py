"""Один текст рассылки — разные форматы для каналов.

Исходный формат — HTML в духе Telegram: <b>, <i>, <u>, <s>, <a href>, <code>, переносы строк.
Подстановки: {name} — ФИО, {first_name} — имя.
"""
import html
import re
from urllib.parse import quote

from config import DISCLAIMER, EMAIL_SIGNATURE
from storage import first_name

ALLOWED_TAGS = ("b", "strong", "i", "em", "u", "s", "a", "code", "pre")


def personalize(template: str, full_name: str) -> str:
    return template.replace("{name}", html.escape(full_name)).replace(
        "{first_name}", html.escape(first_name(full_name))
    )


def with_disclaimer(text_html: str) -> str:
    return f"{text_html}\n\n<i>{html.escape(DISCLAIMER)}</i>" if DISCLAIMER else text_html


def sanitize(text_html: str) -> str:
    """Оставляет только теги, которые понимают Telegram и MAX."""
    def keep(m: re.Match) -> str:
        tag = m.group(2).lower()
        return m.group(0) if tag in ALLOWED_TAGS else ""
    return re.sub(r"<(/?)(\w+)[^>]*>", keep, text_html)


def to_plain(text_html: str) -> str:
    text = re.sub(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>',
                  lambda m: m.group(2) if m.group(2) == m.group(1) else f"{m.group(2)} ({m.group(1)})",
                  text_html, flags=re.S)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text)


def to_whatsapp(text_html: str) -> str:
    """WhatsApp-разметка: *жирный*, _курсив_, ~зачёркнутый~."""
    text = re.sub(r"</?(b|strong)>", "*", text_html)
    text = re.sub(r"</?(i|em)>", "_", text)
    text = re.sub(r"</?s>", "~", text)
    return to_plain(text)


def whatsapp_link(phone: str, text: str) -> str:
    return f"https://wa.me/{phone}?text={quote(text)}"


def to_email_html(text_html: str, unsubscribe_url: str | None) -> str:
    body = sanitize(text_html).replace("\n", "<br>\n")
    signature = html.escape(EMAIL_SIGNATURE).replace("\n", "<br>") if EMAIL_SIGNATURE else ""
    footer = ""
    if unsubscribe_url:
        footer = (f'<p style="color:#888;font-size:12px;margin-top:24px">'
                  f'Не хотите получать такие письма? <a href="{unsubscribe_url}" style="color:#888">Отписаться</a></p>')
    return (
        '<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">'
        f"<div>{body}</div>"
        + (f'<p style="margin-top:20px">{signature}</p>' if signature else "")
        + footer + "</body></html>"
    )


def to_email_text(text_html: str, unsubscribe_url: str | None) -> str:
    text = to_plain(text_html)
    if EMAIL_SIGNATURE:
        text += "\n\n" + EMAIL_SIGNATURE
    if unsubscribe_url:
        text += f"\n\nОтписаться от рассылки: {unsubscribe_url}"
    return text


def default_subject(text_html: str) -> str:
    """Первая содержательная строка текста — без приветствия вроде «{first_name}, добрый день!»."""
    for line in to_plain(text_html).split("\n"):
        line = re.sub(r"\{(first_)?name\}", "", line).strip(" ,!.")
        if not line or re.match(r"(добр\w*|здравств\w*|привет\w*|уважаем\w*)", line, re.I) and len(line) < 40:
            continue
        return (line[:77] + "…") if len(line) > 78 else line
    return "Новая инвестиционная идея"
