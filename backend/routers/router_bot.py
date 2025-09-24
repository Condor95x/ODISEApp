import os
import httpx
import logging
from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_API = f"https://api.telegram.org/bot{TOKEN}"
API_BASE_URL = "https://odiseapp-bf4d8516bab4.herokuapp.com"

router = APIRouter()

async def enviar_mensaje(chat_id: int, texto: str, reply_markup: dict | None = None):
    """
    Envía un mensaje a Telegram con o sin teclado inline.
    """
    payload = {
        "chat_id": chat_id,
        "text": texto,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{TELEGRAM_API}/sendMessage", json=payload)
        logger.info(f"Respuesta de Telegram: {resp.status_code} {resp.text}")

@router.post("/webhook")
async def webhook(request: Request):
    data = await request.json()
    logger.info(f"Webhook recibido: {data}")
    
    if "message" in data:
        chat_id = data["message"]["chat"]["id"]
        texto = data["message"].get("text", "").lower()
        respuesta = None
        
        # 🔹 Lógica para el comando "parcelas"
        if texto == "parcelas":
            async with httpx.AsyncClient() as client:
                url = f"{API_BASE_URL}/plots/?active_only=true"
                resp = await client.get(url)
                
                if resp.status_code == 200:
                    try:
                        parcelas = resp.json()
                        if isinstance(parcelas, list) and len(parcelas) > 0:
                            listado = "\n".join([
                                f"- {p.get('plot_name', 'Sin nombre')} ({p.get('plot_var', 'sin variedad')})"
                                for p in parcelas
                            ])
                            respuesta = f"📋 Parcelas registradas:\n{listado}"
                        else:
                            respuesta = "📋 No hay parcelas registradas."
                    except Exception as e:
                        logger.error(f"Error al procesar parcelas: {e}")
                        respuesta = "❌ Error procesando la respuesta de parcelas."
                else:
                    respuesta = f"❌ API de parcelas devolvió {resp.status_code}."
        
        # 🔹 Lógica para el comando "operaciones"
        elif texto == "operaciones":
            async with httpx.AsyncClient() as client:
                url = f"{API_BASE_URL}/operaciones/vineyard"
                resp = await client.get(url)

                if resp.status_code == 200:
                    try:
                        operaciones = resp.json()
                        if isinstance(operaciones, list) and len(operaciones) > 0:
                            listado = "\n".join([
                                f"- {op.get('parcela_id', 'Sin parcela')} -> {op.get('tipo_operacion', 'Sin tipo')} ({op.get('estado', 'sin estado')})"
                                for op in operaciones
                            ])
                            respuesta = f"⚙️ Operaciones registradas:\n{listado}"
                        else:
                            respuesta = "⚙️ No hay operaciones registradas."
                    except Exception as e:
                        logger.error(f"Error procesando operaciones: {e}")
                        respuesta = "❌ Error procesando la respuesta de operaciones."
                else:
                    respuesta = f"❌ API de operaciones devolvió {resp.status_code}."

        # 🔹 Nuevo comando para abrir WebApp en Telegram
        elif texto == "/crear_operacion":
            keyboard = {
                "inline_keyboard": [[
                    {
                        "text": "➕ Crear Operación",
                        "web_app": {
                            # ⚠️ Cambiá esta URL por la de tu frontend desplegado
                            "url": "https://tu-app.com/form-telegram"
                        }
                    }
                ]]
            }
            await enviar_mensaje(chat_id, "Abrí el formulario para cargar la operación:", keyboard)
        
        else:
            respuesta = f"No entiendo tu mensaje \"{texto}\". Solo reconozco 'parcelas', 'operaciones' o '/crear_operacion'."
            
        if respuesta:
            await enviar_mensaje(chat_id, respuesta)
    
    return {"ok": True}
