import os
import httpx
from fastapi import APIRouter, Request

TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TOKEN}"

router = APIRouter()

# Función para enviar mensajes
async def enviar_mensaje(chat_id: int, texto: str):
    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/sendMessage", json={
            "chat_id": chat_id,
            "text": texto
        })

# Endpoint webhook de Telegram
@router.post("/webhook")
async def webhook(request: Request):
    data = await request.json()
    if "message" in data:
        chat_id = data["message"]["chat"]["id"]
        texto = data["message"]["text"]

        # Aquí conectas tu lógica real (DB, API interna, etc.)
        respuesta = f"Recibí tu mensaje: {texto}"
        await enviar_mensaje(chat_id, respuesta)

    return {"ok": True}
