import os
import httpx
import logging
from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TOKEN}"
API_BASE_URL = "https://odiseapp-bf4d8516bab4.herokuapp.com"

router = APIRouter()

async def enviar_mensaje(chat_id: int, texto: str):
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{TELEGRAM_API}/sendMessage", json={
            "chat_id": chat_id,
            "text": texto
        })
        logger.info(f"Respuesta de Telegram: {resp.status_code} {resp.text}")

@router.post("/webhook")
async def webhook(request: Request):
    data = await request.json()
    logger.info(f"Webhook recibido: {data}")

    if "message" in data:
        chat_id = data["message"]["chat"]["id"]
        texto = data["message"].get("text", "").lower()
        respuesta = None

        if texto == "parcelas":
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{API_BASE_URL}/plots")
                logger.info(f"Respuesta /plots: {resp.status_code} {resp.text}")
        
                try:
                    parcelas = resp.json()
                except Exception:
                    logger.error("No se pudo parsear JSON de /plots")
                    parcelas = []
        
                # 🔹 Aquí quitamos el bloque de "if isinstance(parcelas, dict) and 'data' in parcelas"
                if isinstance(parcelas, list) and len(parcelas) > 0:
                    listado = "\n".join([
                        f"- {p['plot_name']} ({p.get('variety_name', 'sin variedad')})"
                        for p in parcelas
                    ])
                    respuesta = f"📋 Parcelas registradas:\n{listado}"
                else:
                    respuesta = "No hay parcelas registradas."
        else:
            respuesta = f"Recibí tu mensaje: {texto}"

        if respuesta:
            await enviar_mensaje(chat_id, respuesta)

    return {"ok": True}
