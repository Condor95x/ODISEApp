# Usar Python 3.11 como imagen base
FROM python:3.11-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar el archivo de dependencias
COPY requirements.txt .

# Instalar las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código de la aplicación
COPY . .

# Crear un __init__.py en backend si no existe
RUN touch backend/__init__.py

# Cambiar directorio de trabajo a backend
WORKDIR /app/backend

# Crear script de inicio que maneje el puerto
RUN echo '#!/bin/bash\nPORT=${PORT:-8000}\nuvicorn main:app --host 0.0.0.0 --port $PORT' > /app/start.sh && chmod +x /app/start.sh

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar la aplicación
CMD ["/app/start.sh"]
