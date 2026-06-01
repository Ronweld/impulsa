# ==========================================
# Dockerfile - Angular 19 Dev 
# ==========================================

FROM node:22.1.0-alpine

LABEL environment="development"
LABEL stack="angular19-bootstrap"

# =========================
# Variables de entorno
# =========================
ENV NODE_ENV=development
ENV NG_CLI_ANALYTICS=false
ENV IONIC_TELEMETRY=false

# =========================
# Dependencias del sistema
# =========================
RUN apk add --no-cache \
    bash \
    git \
    python3 \
    make \
    g++ \
    openjdk17 \
    libc6-compat

# =========================
# Directorio de trabajo
# =========================
WORKDIR /usr/src/app

# =========================
# Herramientas globales (versionadas)
# =========================
RUN npm install -g \
    @angular/cli@19.0.0 

# =========================
# Puertos de desarrollo
# =========================
EXPOSE 4200 8100

# =========================
# Shell por defecto
# =========================
CMD ["/bin/bash"]
