#!/bin/sh

# Warte kurz um sicherzustellen dass alles bereit ist
sleep 1

# Erstelle Admin-Account und Schema beim ersten Start
if [ ! -f /app/pb_data/data.db ]; then
    # Prüfe ob Seed-Daten vorhanden sind (vom Build)
    if [ -f "/app/pb_data_seed/data.db" ]; then
        echo "📦 Initialisiere mit Seed-Datenbank..."
        cp -r /app/pb_data_seed/* /app/pb_data/
        # Permissions sicherstellen
        chmod -R 755 /app/pb_data
        echo "✅ Import erfolgreich!"
    else
        echo "🚀 Erster Start - Initialisiere PocketBase..."
        
        # Starte PocketBase kurz im Hintergrund um DB zu erstellen
        /usr/local/bin/pocketbase serve --http=0.0.0.0:8090 --dir=/app/pb_data &
        PB_PID=$!
        
        # Warte bis PocketBase bereit ist
        echo "⏳ Warte auf PocketBase..."
        sleep 5
        
        # Erstelle Admin-Account
        if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
            echo "👤 Erstelle Admin-Account: $PB_ADMIN_EMAIL"
            
            # Admin erstellen via CLI (zuverlässiger als API)
            /usr/local/bin/pocketbase admin create "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir=/app/pb_data 2>/dev/null || true
        fi
        
        # Stoppe den temporären PocketBase Prozess
        kill $PB_PID 2>/dev/null || true
        sleep 2
        
        echo "✅ Initialisierung abgeschlossen!"
    fi
fi

echo "🎯 Starte Mahlgrad App..."

# Starte den Haupt-Prozess (Supervisor)
exec "$@"
