# Mahlgrad - Deployment Guide

## Schnellstart (Lokal mit Docker)

```bash
# Starten
docker compose up -d --build

# Logs anschauen
docker compose logs -f

# Stoppen
docker compose down
```

Die App ist dann erreichbar unter:
- **Frontend**: http://localhost:8080
- **PocketBase Admin**: http://localhost:8080/_/
- **API**: http://localhost:8080/api/

---

## Deployment auf Server (z.B. Coolify, Hetzner, fly.io)

### Option A: Mit Coolify (empfohlen)

1. Repository mit Coolify verbinden
2. Build-Typ: **Dockerfile**
3. Ports: `8080` und `8090` exposen
4. Environment Variables setzen:
   ```
   PB_ADMIN_EMAIL=deine@email.de
   PB_ADMIN_PASSWORD=sicheresPasswort123
   ```
5. Volume anlegen für `/app/pb_data`

### Option B: Manuell mit Docker Compose

```bash
# Auf dem Server
git clone <repo-url>
cd mahlgrad

# Optional: .env Datei erstellen
echo "PB_ADMIN_EMAIL=admin@example.com" > .env
echo "PB_ADMIN_PASSWORD=supersecret" >> .env

# Starten
docker compose up -d
```

---

## Datenbank erweitern (neue Features)

### Neues Feld hinzufügen

1. Erstelle neue Migration in `pb_migrations/`:

```javascript
// pb_migrations/1704600000_add_notes.js
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("cups");
    
    collection.schema.addField({
        name: "notes",
        type: "text",
        required: false,
        options: {
            maxSize: 1000
        }
    });
    
    return dao.saveCollection(collection);
}, (db) => {
    // Rollback
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("cups");
    collection.schema.removeField("notes");
    return dao.saveCollection(collection);
});
```

2. Rebuild und Restart:
```bash
docker compose up -d --build
```

Die Migration wird automatisch angewendet - bestehende Daten bleiben erhalten!

### Neue Collection hinzufügen

```javascript
// pb_migrations/1704700000_add_brew_history.js
migrate((db) => {
    const collection = new Collection({
        name: "brew_history",
        type: "base",
        schema: [
            { name: "cup_id", type: "relation", options: { collectionId: "cups_collection" } },
            { name: "brew_time", type: "number" },
            { name: "taste_rating", type: "number" },
            { name: "timestamp", type: "date" }
        ]
    });
    return Dao(db).saveCollection(collection);
});
```

---

## Backup & Restore

### Backup erstellen
```bash
docker compose exec mahlgrad cp -r /app/pb_data /app/backup_$(date +%Y%m%d)
docker compose cp mahlgrad:/app/backup_$(date +%Y%m%d) ./backups/
```

### Backup wiederherstellen
```bash
docker compose cp ./backups/backup_20260106 mahlgrad:/app/pb_data
docker compose restart
```

---

## Architektur

```
┌─────────────────────────────────────────┐
│              Docker Container            │
│  ┌─────────┐         ┌───────────────┐  │
│  │  Nginx  │ ──/api──▶│  PocketBase  │  │
│  │  :80    │         │    :8090      │  │
│  └────┬────┘         └───────┬───────┘  │
│       │                      │          │
│       ▼                      ▼          │
│  /app/*.html,js,css    /app/pb_data/    │
│  (Static Files)        (SQLite + Files) │
└─────────────────────────────────────────┘
```

---

## Troubleshooting

### Backend nicht erreichbar
```bash
# Container-Status prüfen
docker compose ps

# Logs anschauen
docker compose logs mahlgrad

# Neustart
docker compose restart
```

### Daten zurücksetzen (Vorsicht!)
```bash
docker compose down -v  # Löscht alle Volumes!
docker compose up -d --build
```
