/**
 * MAHLGRAD API Layer
 * 
 * Zentraler API-Client für PocketBase Backend.
 * Einfach erweiterbar für neue Features.
 */

const MahlgradAPI = {
    baseUrl: '/api',

    // ========================================
    // CUPS CRUD
    // ========================================

    /**
     * Holt alle Cups oder filtert nach Set
     */
    async getCups(setIndex = null) {
        let url = `${this.baseUrl}/collections/cups/records?sort=set_index,cup_index`;

        if (setIndex !== null) {
            url += `&filter=(set_index=${setIndex})`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('API getCups error:', error);
            return [];
        }
    },

    /**
     * Holt einen spezifischen Cup
     */
    async getCup(setIndex, cupIndex) {
        const url = `${this.baseUrl}/collections/cups/records?filter=(set_index=${setIndex}%26%26cup_index=${cupIndex})`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.items?.[0] || null;
        } catch (error) {
            console.error('API getCup error:', error);
            return null;
        }
    },

    /**
     * Erstellt oder aktualisiert einen Cup
     * Verwendet FormData für Bild-Upload
     */
    async saveCup(cupData) {
        const { setIndex, cupIndex, image, grinderRotation, tasteRating, brewTime } = cupData;

        // Prüfe ob Cup bereits existiert
        const existing = await this.getCup(setIndex, cupIndex);

        const formData = new FormData();
        formData.append('set_index', setIndex);
        formData.append('cup_index', cupIndex);

        if (grinderRotation !== undefined) {
            formData.append('grinder_rotation', grinderRotation);
        }
        if (tasteRating !== undefined) {
            formData.append('taste_rating', tasteRating);
        }
        if (brewTime !== undefined) {
            formData.append('brew_time', brewTime);
        }
        if (image) {
            // Image kann ein Blob, File oder base64-String sein
            if (typeof image === 'string' && image.startsWith('data:')) {
                // Base64 zu Blob konvertieren
                const blob = await this._base64ToBlob(image);
                formData.append('image', blob, `cup_${setIndex}_${cupIndex}.jpg`);
            } else if (image instanceof Blob || image instanceof File) {
                formData.append('image', image);
            }
        }

        try {
            let response;
            if (existing) {
                // Update
                response = await fetch(
                    `${this.baseUrl}/collections/cups/records/${existing.id}`,
                    { method: 'PATCH', body: formData }
                );
            } else {
                // Create
                response = await fetch(
                    `${this.baseUrl}/collections/cups/records`,
                    { method: 'POST', body: formData }
                );
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API saveCup error:', error);
            throw error;
        }
    },

    /**
     * Löscht einen Cup
     */
    async deleteCup(setIndex, cupIndex) {
        const existing = await this.getCup(setIndex, cupIndex);
        if (!existing) return true;

        try {
            const response = await fetch(
                `${this.baseUrl}/collections/cups/records/${existing.id}`,
                { method: 'DELETE' }
            );
            return response.ok;
        } catch (error) {
            console.error('API deleteCup error:', error);
            return false;
        }
    },

    // ========================================
    // BILD-HANDLING
    // ========================================

    /**
     * Generiert die URL für ein Cup-Bild
     */
    getImageUrl(cup) {
        if (!cup || !cup.image) return null;
        // PocketBase Datei-URL Format: /api/files/{collectionId}/{recordId}/{filename}
        const collectionId = cup.collectionId || 'cups';
        return `${this.baseUrl}/files/${collectionId}/${cup.id}/${cup.image}`;
    },

    /**
     * Konvertiert Base64 zu Blob
     */
    async _base64ToBlob(base64) {
        const response = await fetch(base64);
        return response.blob();
    },

    // ========================================
    // QUICK UPDATES (für einzelne Felder)
    // ========================================

    /**
     * Aktualisiert nur die Grinder-Rotation
     */
    async updateGrinderRotation(setIndex, cupIndex, rotation) {
        return this.saveCup({
            setIndex,
            cupIndex,
            grinderRotation: rotation
        });
    },

    /**
     * Aktualisiert nur das Taste-Rating
     */
    async updateTasteRating(setIndex, cupIndex, rating) {
        return this.saveCup({
            setIndex,
            cupIndex,
            tasteRating: rating
        });
    },

    /**
     * Aktualisiert nur die Brew-Time
     */
    async updateBrewTime(setIndex, cupIndex, time) {
        return this.saveCup({
            setIndex,
            cupIndex,
            brewTime: time
        });
    },

    // ========================================
    // HEALTH CHECK
    // ========================================

    /**
     * Prüft ob das Backend erreichbar ist
     */
    async isOnline() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                cache: 'no-cache'
            });
            return response.ok;
        } catch {
            return false;
        }
    }
};

// Export für Module oder globale Nutzung
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MahlgradAPI;
} else {
    window.MahlgradAPI = MahlgradAPI;
}
