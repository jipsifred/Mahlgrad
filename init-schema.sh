#!/bin/sh
# Schema-Import Script - läuft nach PocketBase Start

echo "📦 Warte auf PocketBase API..."
sleep 4

# Prüfe ob Collections bereits existieren  
EXISTING=$(curl -s http://127.0.0.1:8090/api/collections/cups/records 2>/dev/null | grep -c "items")

if [ "$EXISTING" = "0" ]; then
    echo "🔧 Erstelle Collection..."
    
    # Hole Admin Token
    AUTH_RESULT=$(curl -s -X POST http://127.0.0.1:8090/api/admins/auth-with-password \
        -H "Content-Type: application/json" \
        -d "{\"identity\":\"${PB_ADMIN_EMAIL:-admin@mahlgrad.local}\",\"password\":\"${PB_ADMIN_PASSWORD:-mahlgrad2026}\"}")
    
    ADMIN_TOKEN=$(echo "$AUTH_RESULT" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$ADMIN_TOKEN" ]; then
        echo "🔑 Admin-Token erhalten"
        
        # Collection erstellen mit korrektem Schema
        RESULT=$(curl -s -X POST http://127.0.0.1:8090/api/collections \
            -H "Authorization: $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "cups",
                "type": "base",
                "schema": [
                    {
                        "name": "set_index",
                        "type": "number",
                        "required": false,
                        "options": {"min": 0, "max": 99, "noDecimal": true}
                    },
                    {
                        "name": "cup_index", 
                        "type": "number",
                        "required": false,
                        "options": {"min": 1, "max": 3, "noDecimal": true}
                    },
                    {
                        "name": "image",
                        "type": "file",
                        "required": false,
                        "options": {"maxSelect": 1, "maxSize": 10485760, "mimeTypes": ["image/jpeg", "image/png", "image/webp", "image/heic"]}
                    },
                    {
                        "name": "grinder_rotation",
                        "type": "number",
                        "required": false,
                        "options": {}
                    },
                    {
                        "name": "taste_rating",
                        "type": "number", 
                        "required": false,
                        "options": {"min": 1, "max": 5}
                    },
                    {
                        "name": "brew_time",
                        "type": "number",
                        "required": false,
                        "options": {"min": 0}
                    }
                ],
                "listRule": "",
                "viewRule": "",
                "createRule": "",
                "updateRule": "",
                "deleteRule": ""
            }')
        
        if echo "$RESULT" | grep -q '"id"'; then
            echo "✅ Collection 'cups' erstellt!"
        else
            echo "⚠️ Fehler beim Erstellen: $RESULT"
        fi
    else
        echo "⚠️ Konnte Admin-Token nicht holen: $AUTH_RESULT"
    fi
else
    echo "✅ Schema bereits vorhanden"
fi
