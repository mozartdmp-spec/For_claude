"""Отправка писем с рабочего ящика по SMTP — по одному письму на клиента."""
import asyncio
import smtplib
import ssl
from email.headerregistry import Address
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

import config


def enabled() -> bool:
    return bool(config.SMTP_HOST and config.SMTP_USER and config.SMTP_PASSWORD)


def _connect() -> smtplib.SMTP:
    if config.SMTP_SECURITY == "ssl":
        smtp = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, context=ssl.create_default_context(), timeout=30)
    else:
        smtp = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=30)
        if config.SMTP_SECURITY == "starttls":
            smtp.starttls(context=ssl.create_default_context())
    smtp.login(config.SMTP_USER, config.SMTP_PASSWORD)
    return smtp


def build(to_email: str, to_name: str, subject: str, html_body: str, text_body: str,
          unsubscribe_url: str | None) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((config.EMAIL_FROM_NAME, config.EMAIL_FROM)) if config.EMAIL_FROM_NAME else config.EMAIL_FROM
    msg["To"] = str(Address(display_name=to_name, addr_spec=to_email))
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=config.EMAIL_FROM.split("@")[-1])
    if unsubscribe_url:
        msg["List-Unsubscribe"] = f"<{unsubscribe_url}>"
        msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    return msg


class Mailer:
    """Держит одно SMTP-соединение на всю рассылку и переподключается при обрыве."""

    def __init__(self):
        self.smtp: smtplib.SMTP | None = None

    def _send_sync(self, msg: EmailMessage) -> None:
        for attempt in range(2):
            try:
                if self.smtp is None:
                    self.smtp = _connect()
                self.smtp.send_message(msg)
                return
            except (smtplib.SMTPServerDisconnected, ConnectionError):
                self.smtp = None
                if attempt:
                    raise

    async def send(self, msg: EmailMessage) -> None:
        await asyncio.to_thread(self._send_sync, msg)

    def close(self) -> None:
        if self.smtp:
            try:
                self.smtp.quit()
            except smtplib.SMTPException:
                pass
            self.smtp = None


def check_connection() -> str:
    """Проверка настроек: возвращает «ok» или текст ошибки."""
    try:
        _connect().quit()
        return "ok"
    except Exception as e:  # показываем пользователю любую причину
        return f"{type(e).__name__}: {e}"
