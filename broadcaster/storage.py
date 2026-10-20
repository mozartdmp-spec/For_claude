"""SQLite-хранилище: клиенты, рассылки, доставки. Импорт/экспорт Excel и CSV."""
import csv
import io
import re
import secrets
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime

from openpyxl import Workbook, load_workbook

NAME_HEADERS = ("фио", "имя", "клиент", "name", "full name", "fio")
PHONE_HEADERS = ("телефон", "тел", "номер тел", "phone", "mobile", "моб", "whatsapp")
EMAIL_HEADERS = ("email", "e-mail", "почта", "эл. почта", "электронная почта", "mail")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

CHANNELS = ("telegram", "max", "email", "whatsapp")
CHANNEL_TITLES = {"telegram": "Telegram", "max": "MAX", "email": "E-mail", "whatsapp": "WhatsApp"}


def normalize_phone(raw) -> str | None:
    """Приводит номер к виду 79991234567. Возвращает None, если номер не похож на телефон."""
    if raw is None:
        return None
    if isinstance(raw, float):
        raw = int(raw)
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) == 11 and digits[0] == "8":
        digits = "7" + digits[1:]
    elif len(digits) == 10 and digits[0] == "9":
        digits = "7" + digits
    if not 10 <= len(digits) <= 15:
        return None
    return digits


def normalize_email(raw) -> str | None:
    if raw is None:
        return None
    email = str(raw).strip().lower()
    return email if EMAIL_RE.match(email) else None


def first_name(full_name: str) -> str:
    """Из «Иванов Иван Иванович» берёт «Иван»; из одного слова — само слово."""
    parts = full_name.split()
    if len(parts) >= 2:
        return parts[1]
    return parts[0] if parts else ""


@dataclass
class ImportResult:
    added: int = 0
    updated: int = 0
    skipped: list[str] = field(default_factory=list)


@dataclass
class ParsedContact:
    full_name: str
    phone: str | None
    email: str | None


def _find_columns(header: list) -> dict[str, int]:
    cols: dict[str, int] = {}
    for i, cell in enumerate(header):
        text = str(cell or "").strip().lower()
        if not text:
            continue
        if "name" not in cols and any(text.startswith(h) for h in NAME_HEADERS):
            cols["name"] = i
        elif "email" not in cols and any(text.startswith(h) for h in EMAIL_HEADERS):
            cols["email"] = i
        elif "phone" not in cols and any(text.startswith(h) for h in PHONE_HEADERS):
            cols["phone"] = i
    return cols


def _read_rows(data: bytes, filename: str) -> list[list]:
    if filename.lower().endswith(".csv"):
        text = data.decode("utf-8-sig", errors="replace")
        if text.count(";") > text.count(","):
            delimiter = ";"
        else:
            delimiter = ","
        return [row for row in csv.reader(io.StringIO(text), delimiter=delimiter)]
    ws = load_workbook(io.BytesIO(data), read_only=True, data_only=True).active
    return [list(r) for r in ws.iter_rows(values_only=True)]


def parse_contacts(data: bytes, filename: str) -> tuple[list[ParsedContact], list[str]]:
    """Читает первый лист Excel или CSV. Колонки ищутся по заголовкам
    (ФИО, Телефон, Email); если заголовков нет — ФИО, телефон, email по порядку."""
    rows = _read_rows(data, filename)
    if not rows:
        return [], []

    cols = _find_columns(rows[0])
    first_row = 1
    if "name" in cols and ("phone" in cols or "email" in cols):
        rows = rows[1:]
        first_row = 2
    else:
        cols = {"name": 0, "phone": 1, "email": 2}

    contacts, skipped = [], []
    for n, row in enumerate(rows, start=first_row):
        get = lambda key: row[cols[key]] if key in cols and cols[key] < len(row) else None
        name = str(get("name") or "").strip()
        raw_phone, raw_email = get("phone"), get("email")
        if not name and not raw_phone and not raw_email:
            continue
        phone, email = normalize_phone(raw_phone), normalize_email(raw_email)
        if not name or not (phone or email):
            skipped.append(f"строка {n}: {name or '—'} / {raw_phone or '—'} / {raw_email or '—'}")
            continue
        contacts.append(ParsedContact(name, phone, email))
    return contacts, skipped


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


class Storage:
    def __init__(self, path: str):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(
            """
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY,
                full_name TEXT NOT NULL,
                phone TEXT UNIQUE,
                email TEXT,
                tg_id INTEGER,
                max_id INTEGER,
                tg_sub INTEGER NOT NULL DEFAULT 0,
                max_sub INTEGER NOT NULL DEFAULT 0,
                email_unsub INTEGER NOT NULL DEFAULT 0,
                wa_unsub INTEGER NOT NULL DEFAULT 0,
                token TEXT NOT NULL UNIQUE
            );
            CREATE INDEX IF NOT EXISTS contacts_email ON contacts(email);
            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY,
                created_at TEXT NOT NULL,
                subject TEXT NOT NULL,
                text_html TEXT NOT NULL,
                channels TEXT NOT NULL,
                tg_copy_chat INTEGER,
                tg_copy_msg INTEGER,
                status TEXT NOT NULL DEFAULT 'running'
            );
            CREATE TABLE IF NOT EXISTS deliveries (
                id INTEGER PRIMARY KEY,
                campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
                contact_id INTEGER NOT NULL REFERENCES contacts(id),
                channel TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT,
                updated_at TEXT,
                UNIQUE (campaign_id, contact_id, channel)
            );
            """
        )
        self.db.commit()

    # ---------- клиенты ----------

    def _find(self, phone: str | None, email: str | None) -> sqlite3.Row | None:
        if phone:
            row = self.db.execute("SELECT * FROM contacts WHERE phone = ?", (phone,)).fetchone()
            if row:
                return row
        if email:
            return self.db.execute(
                "SELECT * FROM contacts WHERE email = ? AND (phone IS NULL OR ? IS NULL)", (email, phone)
            ).fetchone()
        return None

    def import_contacts(self, contacts: list[ParsedContact], skipped: list[str]) -> ImportResult:
        result = ImportResult(skipped=skipped)
        for c in contacts:
            row = self._find(c.phone, c.email)
            if row:
                self.db.execute(
                    "UPDATE contacts SET full_name = ?, phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE id = ?",
                    (c.full_name, c.phone, c.email, row["id"]),
                )
                result.updated += 1
            else:
                self.db.execute(
                    "INSERT INTO contacts (full_name, phone, email, token) VALUES (?, ?, ?, ?)",
                    (c.full_name, c.phone, c.email, secrets.token_urlsafe(16)),
                )
                result.added += 1
        self.db.commit()
        return result

    def contacts(self) -> list[sqlite3.Row]:
        return self.db.execute("SELECT * FROM contacts ORDER BY full_name").fetchall()

    def contact(self, contact_id: int) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,)).fetchone()

    def link_messenger(self, channel: str, phone: str, user_id: int) -> str | None:
        """Привязывает аккаунт Telegram/MAX к клиенту по телефону. Возвращает ФИО или None."""
        id_col, sub_col = ("tg_id", "tg_sub") if channel == "telegram" else ("max_id", "max_sub")
        row = self.db.execute("SELECT id, full_name FROM contacts WHERE phone = ?", (phone,)).fetchone()
        if not row:
            return None
        self.db.execute(f"UPDATE contacts SET {id_col} = NULL WHERE {id_col} = ?", (user_id,))
        self.db.execute(f"UPDATE contacts SET {id_col} = ?, {sub_col} = 1 WHERE id = ?", (user_id, row["id"]))
        self.db.commit()
        return row["full_name"]

    def set_messenger_sub(self, channel: str, user_id: int, value: bool) -> bool:
        id_col, sub_col = ("tg_id", "tg_sub") if channel == "telegram" else ("max_id", "max_sub")
        cur = self.db.execute(f"UPDATE contacts SET {sub_col} = ? WHERE {id_col} = ?", (int(value), user_id))
        self.db.commit()
        return cur.rowcount > 0

    def set_unsub(self, contact_id: int, channel: str, value: bool = True) -> None:
        col = {"telegram": "tg_sub", "max": "max_sub", "email": "email_unsub", "whatsapp": "wa_unsub"}[channel]
        # у мессенджеров флаг «подписан», у email/WhatsApp — «отписан»
        stored = int(not value) if channel in ("telegram", "max") else int(value)
        self.db.execute(f"UPDATE contacts SET {col} = ? WHERE id = ?", (stored, contact_id))
        self.db.commit()

    def unsubscribe_by_token(self, token: str) -> str | None:
        row = self.db.execute("SELECT id, full_name FROM contacts WHERE token = ?", (token,)).fetchone()
        if not row:
            return None
        self.db.execute("UPDATE contacts SET email_unsub = 1 WHERE id = ?", (row["id"],))
        self.db.commit()
        return row["full_name"]

    def reachable(self, channel: str) -> list[sqlite3.Row]:
        where = {
            "telegram": "tg_id IS NOT NULL AND tg_sub = 1",
            "max": "max_id IS NOT NULL AND max_sub = 1",
            "email": "email IS NOT NULL AND email_unsub = 0",
            "whatsapp": "phone IS NOT NULL AND wa_unsub = 0",
        }[channel]
        return self.db.execute(f"SELECT * FROM contacts WHERE {where} ORDER BY full_name").fetchall()

    def stats(self) -> dict:
        q = lambda sql: self.db.execute(sql).fetchone()[0]
        s = {"total": q("SELECT COUNT(*) FROM contacts")}
        for ch in CHANNELS:
            s[ch] = len(self.reachable(ch))
        s["tg_pending"] = q("SELECT COUNT(*) FROM contacts WHERE phone IS NOT NULL AND tg_id IS NULL")
        s["max_pending"] = q("SELECT COUNT(*) FROM contacts WHERE phone IS NOT NULL AND max_id IS NULL")
        return s

    def export_unlinked(self) -> bytes:
        wb = Workbook()
        ws = wb.active
        ws.title = "Не подключены"
        ws.append(["ФИО", "Телефон", "Email", "Telegram", "MAX"])
        for r in self.db.execute(
            "SELECT * FROM contacts WHERE tg_id IS NULL OR max_id IS NULL ORDER BY full_name"
        ):
            ws.append([r["full_name"], "+" + r["phone"] if r["phone"] else "", r["email"] or "",
                       "да" if r["tg_id"] else "нет", "да" if r["max_id"] else "нет"])
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    def clear(self) -> None:
        self.db.executescript("DELETE FROM deliveries; DELETE FROM campaigns; DELETE FROM contacts;")
        self.db.commit()

    # ---------- рассылки ----------

    def create_campaign(self, subject: str, text_html: str, channels: list[str],
                        tg_copy: tuple[int, int] | None = None) -> int:
        cur = self.db.execute(
            "INSERT INTO campaigns (created_at, subject, text_html, channels, tg_copy_chat, tg_copy_msg) VALUES (?, ?, ?, ?, ?, ?)",
            (now(), subject, text_html, ",".join(channels), *(tg_copy or (None, None))),
        )
        campaign_id = cur.lastrowid
        for ch in channels:
            for c in self.reachable(ch):
                self.db.execute(
                    "INSERT OR IGNORE INTO deliveries (campaign_id, contact_id, channel) VALUES (?, ?, ?)",
                    (campaign_id, c["id"], ch),
                )
        self.db.commit()
        return campaign_id

    def campaign(self, campaign_id: int) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,)).fetchone()

    def campaigns(self, limit: int = 50) -> list[sqlite3.Row]:
        return self.db.execute("SELECT * FROM campaigns ORDER BY id DESC LIMIT ?", (limit,)).fetchall()

    def set_campaign_status(self, campaign_id: int, status: str) -> None:
        self.db.execute("UPDATE campaigns SET status = ? WHERE id = ?", (status, campaign_id))
        self.db.commit()

    def deliveries(self, campaign_id: int, channel: str | None = None, status: str | None = None) -> list[sqlite3.Row]:
        sql = """SELECT d.*, c.full_name, c.phone, c.email, c.tg_id, c.max_id, c.token
                 FROM deliveries d JOIN contacts c ON c.id = d.contact_id
                 WHERE d.campaign_id = ?"""
        args: list = [campaign_id]
        if channel:
            sql += " AND d.channel = ?"
            args.append(channel)
        if status:
            sql += " AND d.status = ?"
            args.append(status)
        return self.db.execute(sql + " ORDER BY c.full_name", args).fetchall()

    def set_delivery(self, delivery_id: int, status: str, error: str | None = None) -> None:
        self.db.execute(
            "UPDATE deliveries SET status = ?, error = ?, updated_at = ? WHERE id = ?",
            (status, error, now(), delivery_id),
        )
        self.db.commit()

    def campaign_stats(self, campaign_id: int) -> dict[str, dict[str, int]]:
        out: dict[str, dict[str, int]] = {}
        for r in self.db.execute(
            "SELECT channel, status, COUNT(*) n FROM deliveries WHERE campaign_id = ? GROUP BY channel, status",
            (campaign_id,),
        ):
            out.setdefault(r["channel"], {})[r["status"]] = r["n"]
        return out

    def emails_sent_today(self) -> int:
        return self.db.execute(
            "SELECT COUNT(*) FROM deliveries WHERE channel = 'email' AND status = 'sent' AND updated_at >= ?",
            (datetime.now().strftime("%Y-%m-%dT00:00:00"),),
        ).fetchone()[0]
