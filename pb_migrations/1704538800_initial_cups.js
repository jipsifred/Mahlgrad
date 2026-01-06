// PocketBase Migration - Initial Schema

/**
 * Initial Migration - Cups Collection
 * 
 * Diese Migration erstellt die Haupt-Collection für die Tassen-Daten.
 * Neue Features können in separaten Migrations hinzugefügt werden.
 */
migrate((db) => {
    const collection = new Collection({
        id: "cups_collection",
        name: "cups",
        type: "base",
        system: false,
        schema: [
            {
                name: "set_index",
                type: "number",
                required: true,
                options: {
                    min: 0,
                    max: 99
                }
            },
            {
                name: "cup_index",
                type: "number",
                required: true,
                options: {
                    min: 1,
                    max: 3
                }
            },
            {
                name: "image",
                type: "file",
                required: false,
                options: {
                    maxSelect: 1,
                    maxSize: 10485760, // 10MB
                    mimeTypes: [
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "image/heic"
                    ]
                }
            },
            {
                name: "grinder_rotation",
                type: "number",
                required: false,
                options: {
                    min: null,
                    max: null
                }
            },
            {
                name: "taste_rating",
                type: "number",
                required: false,
                options: {
                    min: 1,
                    max: 5
                }
            },
            {
                name: "brew_time",
                type: "number",
                required: false,
                options: {
                    min: 0,
                    max: 999
                }
            }
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_cup_unique ON cups (set_index, cup_index)"
        ],
        listRule: "",      // Jeder kann lesen
        viewRule: "",      // Jeder kann einzelne sehen
        createRule: "",    // Jeder kann erstellen
        updateRule: "",    // Jeder kann updaten
        deleteRule: ""     // Jeder kann löschen
    });

    return Dao(db).saveCollection(collection);
}, (db) => {
    // Rollback: Collection löschen
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("cups");
    return dao.deleteCollection(collection);
});
