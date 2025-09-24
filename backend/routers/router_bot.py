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
        
        # Lógica para el comando "parcelas"
        if texto == "parcelas":
            async with httpx.AsyncClient() as client:
                url = f"{API_BASE_URL}/plots/?active_only=true"
                resp = await client.get(url)
                
                if resp.status_code == 200:
                    try:
                        parcelas = resp.json()
                        if isinstance(parcelas, list) and len(parcelas) > 0:
                            listado = "\n".join([
                                f"- {p.get('plot_name', 'Sin nombre')} ({p.get('variety_name', 'sin variedad')})"
                                for p in parcelas
                            ])
                            respuesta = f"📋 Parcelas registradas:\n{listado}"
                        else:
                            respuesta = "📋 No hay parcelas registradas."
                    except Exception as e:
                        logger.error(f"Error al procesar la respuesta de parcelas: {e}")
                        respuesta = f"❌ Error: Respuesta inesperada de la API de parcelas."
                else:
                    respuesta = f"❌ Error: La API de parcelas devolvió código {resp.status_code}."
        
        # 🔹 Lógica para el nuevo comando "operaciones"
        elif texto == "operaciones":
            async with httpx.AsyncClient() as client:
                url = f"{API_BASE_URL}/"  # Tu endpoint principal
                resp = await client.get(url)

                if resp.status_code == 200:
                    try:
                        operaciones = resp.json()
                        if isinstance(operaciones, list) and len(operaciones) > 0:
                            listado = "\n".join([
                                f"- {op.get('tipo_operacion', 'Sin tipo')} ({op.get('estado', 'sin estado')})"
                                for op in operaciones
                            ])
                            respuesta = f"⚙️ Operaciones registradas:\n{listado}"
                        else:
                            respuesta = "⚙️ No hay operaciones registradas."
                    except Exception as e:
                        logger.error(f"Error al procesar la respuesta de operaciones: {e}")
                        respuesta = f"❌ Error: Respuesta inesperada de la API de operaciones."
                else:
                    respuesta = f"❌ Error: La API de operaciones devolvió código {resp.status_code}."
        
        else:
            respuesta = "Comando no reconocido. Puedes usar 'parcelas' u 'operaciones'."
            
        if respuesta:
            await enviar_mensaje(chat_id, respuesta)
    
    return {"ok": True}
