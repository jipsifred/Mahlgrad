# Multi-stage build für minimale Image-Größe
FROM alpine:3.19 AS pocketbase

# PocketBase Version - einfach hier updaten für neue Versionen
ARG PB_VERSION=0.22.4

# PocketBase herunterladen
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Finale Stage
FROM nginx:alpine

# Benötigte Tools installieren
RUN apk add --no-cache supervisor wget curl

# PocketBase kopieren
COPY --from=pocketbase /pb/pocketbase /usr/local/bin/pocketbase
RUN chmod +x /usr/local/bin/pocketbase

# Arbeitsverzeichnis
WORKDIR /app

# Frontend-Dateien kopieren
COPY index.html style.css app.js api.js sw.js manifest.json perspective-editor.js ./
COPY *.png ./
COPY apple-touch-icon* ./
COPY Mahlgrad_recources/ ./Mahlgrad_recources/

# PocketBase Schema kopieren
COPY pb_schema.json ./pb_schema.json

# Nginx Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Supervisor Konfiguration (startet Nginx + PocketBase)
COPY supervisord.conf /etc/supervisord.conf

# Datenverzeichnis für PocketBase
RUN mkdir -p /app/pb_data

# Startup-Script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Init-Script für Schema-Import
COPY init-schema.sh /init-schema.sh
RUN chmod +x /init-schema.sh

EXPOSE 80 8090

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
