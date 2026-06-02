# ==========================================
# Dockerfile - Angular 19 Dev (Web + Mobile)
# ==========================================

FROM node:22.1.0-alpine

LABEL environment="development"
LABEL stack="angular19-ionic-capacitor-bootstrap"

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
    @angular/cli@19.0.0 \
    @ionic/cli@7.2.0 \
    @capacitor/cli@8.0.0 \
    bootstrap@5.3.3

# =========================
# Puertos de desarrollo
# =========================
EXPOSE 4201 8100

# =========================
# Shell por defecto
# =========================
CMD ["/bin/bash"]
