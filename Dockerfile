# Usar Python 3.9 como imagen base
FROM python:3.9-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar el archivo de dependencias
COPY requirements.txt .

# Instalar las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código de la aplicación
COPY . .

# Exponer el puerto que usará Railway (Railway asigna automáticamente el puerto)
EXPOSE $PORT

# Comando para iniciar la aplicación
CMD cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
