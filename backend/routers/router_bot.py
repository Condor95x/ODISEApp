import os
import httpx
from fastapi import APIRouter, Request

TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TOKEN}"
API_BASE_URL = "https://odiseapp-bf4d8516bab4.herokuapp.com"

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
        texto = data["message"].get("text", "").lower()

        if texto == "parcelas":
            # Llamar a tu API para obtener parcelas
            async with httpx.AsyncClient() as client:
                try:
                    resp = await client.get(f"{API_BASE_URL}/plots")
                    parcelas = resp.json()
                    
                    if parcelas:
                        # Armar lista nombre + variedad
                        listado = "\n".join([
                            f"- {p['plot_name']} ({p.get('variety_name', 'sin variedad')})"
                            for p in parcelas
                        ])
                        respuesta = f"📋 Parcelas registradas:\n{listado}"
                    else:
                        respuesta = "No hay parcelas registradas."
                except Exception as e:
                    respuesta = f"⚠️ Error al consultar parcelas: {e}"
        else:
            respuesta = f"comeme los huevos que me vas a decir: {texto}"
            await enviar_mensaje(chat_id, respuesta)

    return {"ok": True}
