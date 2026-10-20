"""Веб-панель: клиенты, новая рассылка, отчёты и очередь WhatsApp."""
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.templating import Jinja2Templates

import config
import formatting as fmt
import sender as sender_mod
from channels import email as email_channel
from storage import CHANNEL_TITLES, CHANNELS, Storage, parse_contacts

STATUS_TITLES = {"pending": "в очереди", "sent": "доставлено", "failed": "ошибка", "blocked": "отписался",
                 "wa_queue": "ждёт отправки", "wa_done": "отправлено", "wa_skip": "пропущено"}

security = HTTPBasic()


def auth(credentials: HTTPBasicCredentials = Depends(security)) -> None:
    ok = secrets.compare_digest(credentials.username.encode(), config.WEB_USER.encode()) and \
        secrets.compare_digest(credentials.password.encode(), config.WEB_PASSWORD.encode())
    if not (config.WEB_PASSWORD and ok):
        raise HTTPException(401, "Неверный логин или пароль", headers={"WWW-Authenticate": "Basic"})


def create_app(storage: Storage, get_sender) -> FastAPI:
    app = FastAPI(title="Рассылка", docs_url=None, redoc_url=None, openapi_url=None)
    templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
    templates.env.globals.update(CHANNEL_TITLES=CHANNEL_TITLES, STATUS_TITLES=STATUS_TITLES)
    page = lambda request, template, **ctx: templates.TemplateResponse(request, template, ctx)

    def channels_info() -> list[dict]:
        s = get_sender()
        avail = sender_mod.available_channels(s.tg_bot, s.max_bot)
        return [{"key": ch, "title": CHANNEL_TITLES[ch], "count": len(storage.reachable(ch)), "enabled": ch in avail}
                for ch in CHANNELS]

    # ---------- клиенты ----------

    @app.get("/", response_class=HTMLResponse, dependencies=[Depends(auth)])
    async def index(request: Request, imported: str = ""):
        tg_link = None
        if get_sender().tg_bot:
            me = await get_sender().tg_bot.get_me()
            tg_link = f"https://t.me/{me.username}?start=hi"
        return page(request, "index.html", stats=storage.stats(), contacts=storage.contacts(),
                    tg_link=tg_link, max_link=config.MAX_BOT_LINK, imported=imported)

    @app.post("/import", dependencies=[Depends(auth)])
    async def import_file(file: UploadFile = File(...)):
        data = await file.read()
        try:
            contacts, skipped = parse_contacts(data, file.filename or "file.xlsx")
        except Exception as e:
            raise HTTPException(400, f"Не удалось прочитать файл: {e}")
        r = storage.import_contacts(contacts, skipped)
        msg = f"Добавлено {r.added}, обновлено {r.updated}, пропущено {len(r.skipped)}"
        return RedirectResponse(f"/?imported={msg}", status_code=303)

    @app.get("/unlinked.xlsx", dependencies=[Depends(auth)])
    async def unlinked():
        return Response(storage.export_unlinked(),
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": "attachment; filename=not_connected.xlsx"})

    @app.post("/contacts/{contact_id}/unsub", dependencies=[Depends(auth)])
    async def contact_unsub(contact_id: int, channel: str = Form(...), value: int = Form(...)):
        storage.set_unsub(contact_id, channel, bool(value))
        return RedirectResponse("/#c" + str(contact_id), status_code=303)

    # ---------- рассылки ----------

    @app.get("/new", response_class=HTMLResponse, dependencies=[Depends(auth)])
    async def new(request: Request):
        return page(request, "new.html", channels=channels_info(), disclaimer=config.DISCLAIMER,
                    email_check=email_channel.enabled())

    @app.post("/new", dependencies=[Depends(auth)])
    async def create(text: str = Form(...), subject: str = Form(""), channels: list[str] = Form([])):
        text = text.replace("\r\n", "\n").strip()
        if not text or not channels:
            raise HTTPException(400, "Нужен текст и хотя бы один канал")
        s = get_sender()
        channels = [c for c in channels if c in sender_mod.available_channels(s.tg_bot, s.max_bot)]
        cid = storage.create_campaign(subject.strip() or fmt.default_subject(text), text, channels)
        s.start(cid)
        return RedirectResponse(f"/campaigns/{cid}", status_code=303)

    @app.get("/campaigns", response_class=HTMLResponse, dependencies=[Depends(auth)])
    async def campaigns(request: Request):
        rows = [{"c": c, "stats": storage.campaign_stats(c["id"]), "preview": fmt.to_plain(c["text_html"])[:120]}
                for c in storage.campaigns()]
        return page(request, "campaigns.html", rows=rows)

    @app.get("/campaigns/{cid}", response_class=HTMLResponse, dependencies=[Depends(auth)])
    async def campaign(request: Request, cid: int):
        camp = storage.campaign(cid)
        if not camp:
            raise HTTPException(404)
        return page(request, "campaign.html", camp=camp, stats=storage.campaign_stats(cid),
                    wa=get_sender().whatsapp_queue(cid), failed=storage.deliveries(cid, status="failed"),
                    preview=fmt.sanitize(fmt.with_disclaimer(fmt.personalize(camp["text_html"], "Иванов Иван Иванович"))),
                    running=cid in sender_mod.running)

    @app.get("/campaigns/{cid}/stats", dependencies=[Depends(auth)])
    async def campaign_stats(cid: int):
        return {"stats": storage.campaign_stats(cid), "running": cid in sender_mod.running}

    @app.post("/campaigns/{cid}/retry", dependencies=[Depends(auth)])
    async def retry(cid: int):
        if cid not in sender_mod.running and sender_mod.retry_failed(storage, cid):
            get_sender().start(cid)
        return RedirectResponse(f"/campaigns/{cid}", status_code=303)

    @app.post("/deliveries/{did}/wa", dependencies=[Depends(auth)])
    async def wa_mark(did: int, status: str = Form(...)):
        if status not in ("wa_done", "wa_skip", "wa_queue"):
            raise HTTPException(400)
        storage.set_delivery(did, status)
        return {"ok": True}

    # ---------- отписка из письма (без авторизации) ----------

    @app.get("/u/{token}", response_class=HTMLResponse)
    async def unsub_page(request: Request, token: str):
        return page(request, "unsub.html", token=token, done=False, name=None)

    @app.post("/u/{token}", response_class=HTMLResponse)
    async def unsub(request: Request, token: str):
        name = storage.unsubscribe_by_token(token)
        return page(request, "unsub.html", token=token, done=True, name=name)

    return app
