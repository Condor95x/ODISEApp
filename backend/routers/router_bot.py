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
                url = f"{API_BASE_URL}/plots?active_only=true"
                resp = await client.get(url)
                
                # 🔍 Debug mejorado
                logger.info(f"Status Code: {resp.status_code}")
                logger.info(f"Headers: {resp.headers}")
                logger.info(f"Content Length: {len(resp.content)}")
                logger.info(f"Raw Content: {resp.content}")
                logger.info(f"Text Content: '{resp.text}'")
                
                if resp.status_code == 200:
                    # Verificar si el contenido está vacío
                    if not resp.text.strip():
                        logger.error("La respuesta de la API está vacía")
                        respuesta = "❌ Error: La API devolvió una respuesta vacía"
                    else:
                        try:
                            respuesta_json = resp.json()
                            logger.info(f"JSON parseado exitosamente: {respuesta_json}")
                            
                            parcelas = []
                            if isinstance(respuesta_json, list):
                                parcelas = respuesta_json
                            elif isinstance(respuesta_json, dict):
                                if 'data' in respuesta_json:
                                    parcelas = respuesta_json['data']
                                elif 'results' in respuesta_json:
                                    parcelas = respuesta_json['results']
                                else:
                                    # Si es un dict pero no tiene 'data', loguear las claves
                                    logger.info(f"Claves disponibles en la respuesta: {list(respuesta_json.keys())}")
                                    respuesta = f"❌ Error: Estructura de respuesta inesperada. Claves: {list(respuesta_json.keys())}"
                            
                            if not respuesta and parcelas is not None:
                                if len(parcelas) > 0:
                                    listado = "\n".join([
                                        f"- {p.get('plot_name', 'Sin nombre')} ({p.get('variety_name', 'sin variedad')})"
                                        for p in parcelas
                                    ])
                                    respuesta = f"📋 Parcelas registradas:\n{listado}"
                                else:
                                    respuesta = "📋 No hay parcelas registradas."
                                    
                        except ValueError as e:
                            logger.error(f"Error al parsear JSON: {e}")
                            logger.error(f"Contenido que causó el error: '{resp.text[:500]}...'")
                            respuesta = f"❌ Error: Respuesta no es JSON válido. Contenido: {resp.text[:100]}..."
                        except Exception as e:
                            logger.error(f"Error inesperado al procesar la respuesta: {e}")
                            respuesta = f"❌ Error inesperado: {str(e)}"
                else:
                    respuesta = f"❌ Error: La API devolvió código {resp.status_code}. Mensaje: {resp.text}"
        else:
            respuesta = f"No seas trolo man, como me vas a decir: {texto}"
        
        if respuesta:
            await enviar_mensaje(chat_id, respuesta)
    
    return {"ok": True}
