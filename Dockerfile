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

# Railway normalmente usa el puerto 8000
EXPOSE 8000

# Comando para iniciar la aplicación con puerto fijo
CMD cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
