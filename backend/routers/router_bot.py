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
            
                parcelas = []
                # El código de estado 200 (OK) indica una respuesta exitosa,
                # por lo que deberíamos poder parsear el JSON.
                # Si el estado es 200, pero falla el JSON, hay un problema más profundo
                # en el servidor de la API o en la conexión.
                if resp.status_code == 200:
                    try:
                        respuesta_json = resp.json()
                        if isinstance(respuesta_json, list):
                            parcelas = respuesta_json
                        # Esto es si la API envuelve la lista en un diccionario
                        elif isinstance(respuesta_json, dict) and 'data' in respuesta_json:
                            parcelas = respuesta_json['data']
                    except Exception as e:
                        # Registramos el error de manera más específica
                        logger.error(f"Error al parsear JSON: {e}")
                        respuesta = f"❌ Error: No se pudo procesar la respuesta de la API. Código de estado: {resp.status_code}"
                else:
                    respuesta = f"❌ Error: La API devolvió un código de estado {resp.status_code}"

                if not respuesta: # Si no hubo un error de conexión/parseo
                    if len(parcelas) > 0:
                        listado = "\n".join([
                            f"- {p['plot_name']} ({p.get('variety_name', 'sin variedad')})"
                            for p in parcelas
                        ])
                        respuesta = f"📋 Parcelas registradas:\n{listado}"
                    else:
                        respuesta = "No hay parcelas registradas."

        else:
            respuesta = f"No seas trolo mqn, como me vas a decir: {texto}"

        if respuesta:
            await enviar_mensaje(chat_id, respuesta)

    return {"ok": True}
