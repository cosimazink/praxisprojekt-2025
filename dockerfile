# Basis-Image mit Node
FROM node:20-bookworm-slim

# FFmpeg installieren
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Arbeitsverzeichnis
WORKDIR /app

# Package-Dateien zuerst (Cache nutzen)
COPY package*.json ./

# Abhängigkeiten installieren
RUN npm ci --omit=dev

# Restliches Projekt kopieren
COPY . .

# Umgebungsvariablen
ENV NODE_ENV=production
EXPOSE 3000

# Startbefehl
CMD ["node","server.js"]
