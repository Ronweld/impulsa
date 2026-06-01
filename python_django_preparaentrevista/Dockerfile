# Usa una imagen oficial de Python 3.11 (o 3.10+) en Debian
FROM python:3.11-slim

# Establecer la variable de entorno para evitar que Python escriba archivos .pyc en el disco
ENV PYTHONDONTWRITEBYTECODE=1
# Establecer la variable de entorno para que el output no se almacene en buffer
ENV PYTHONUNBUFFERED=1

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Instalar dependencias del sistema necesarias para psycopg2-binary
# Las dependencias de ML/DS como numpy y pandas ya suelen estar bien manejadas por pip
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    fonts-dejavu-core \
    # Limpieza para reducir el tamaño de la imagen
    && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requisitos y los instala
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copiar el código de la aplicación (se montará con docker-compose, pero se deja para builds standalone)
COPY . .

# Comando de inicio por defecto (puede ser sobrescrito por docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
