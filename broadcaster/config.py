"""Настройки из переменных окружения (.env)."""
import os

from dotenv import load_dotenv

load_dotenv()


def _ids(name: str) -> set[int]:
    return {int(x) for x in os.getenv(name, "").replace(" ", "").split(",") if x}


DB_PATH = os.getenv("DB_PATH", "broadcaster.db")

# Telegram
TG_TOKEN = os.getenv("TG_TOKEN") or os.getenv("BOT_TOKEN", "")
TG_ADMIN_IDS = _ids("TG_ADMIN_IDS") or _ids("ADMIN_IDS")

# MAX
MAX_TOKEN = os.getenv("MAX_TOKEN", "")
MAX_API_URL = os.getenv("MAX_API_URL", "https://platform-api2.max.ru")
MAX_CA_BUNDLE = os.getenv("MAX_CA_BUNDLE", "")  # путь к сертификату Минцифры, если система его не знает
MAX_BOT_LINK = os.getenv("MAX_BOT_LINK", "")  # например https://max.ru/your_bot

# E-mail (рабочий ящик менеджера)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_SECURITY = os.getenv("SMTP_SECURITY", "ssl")  # ssl | starttls | none
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_USER)
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "")
EMAIL_DELAY = float(os.getenv("EMAIL_DELAY", "4"))  # пауза между письмами, сек
EMAIL_DAILY_LIMIT = int(os.getenv("EMAIL_DAILY_LIMIT", "300"))
EMAIL_SIGNATURE = os.getenv("EMAIL_SIGNATURE", "").replace("\\n", "\n")

# Общее
DISCLAIMER = os.getenv(
    "DISCLAIMER",
    "Информация не является индивидуальной инвестиционной рекомендацией.",
)
PUBLIC_URL = os.getenv("PUBLIC_URL", "").rstrip("/")  # адрес веб-панели, нужен для ссылки отписки в письмах
WEB_HOST = os.getenv("WEB_HOST", "127.0.0.1")
WEB_PORT = int(os.getenv("WEB_PORT", "8080"))
WEB_USER = os.getenv("WEB_USER", "admin")
WEB_PASSWORD = os.getenv("WEB_PASSWORD", "")
MESSENGER_DELAY = 0.1  # ~10 сообщений/с — с запасом ниже лимитов Telegram и MAX
