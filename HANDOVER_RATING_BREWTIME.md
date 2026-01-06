# 🎯 ÜBERGABE: UI für Sterne-Rating & Durchlaufzeit

## Aufgabe
Implementiere in der **Detail-Ansicht** (wenn man auf eine Tasse tippt):
1. **5-Sterne-Rating** (taste_rating: 1-5)
2. **Durchlaufzeit in Sekunden** (brew_time: Integer)

Beide Werte müssen ans Backend gespeichert werden.

---

## 📁 Relevante Dateien

| Datei | Zweck |
|-------|-------|
| `app.js` | Haupt-Logik, Detail-View, State-Management |
| `api.js` | Backend-API Layer (bereits fertig!) |
| `index.html` | HTML-Struktur für Detail-View |
| `style.css` | Styling |

---

## 🗄️ Backend-Schema (bereits existiert!)

Die Felder sind bereits in PocketBase angelegt:

```javascript
// In der cups Collection:
{
  taste_rating: number,   // 1-5, optional
  brew_time: number,      // Sekunden, optional
  // ... andere Felder
}
```

---

## 🔌 API-Funktionen (BEREITS FERTIG!)

In `api.js` gibt es bereits diese Funktionen:

```javascript
// Taste-Rating updaten
await MahlgradAPI.updateTasteRating(setIndex, cupIndex, rating);
// Beispiel: await MahlgradAPI.updateTasteRating(0, 1, 4); // Cup 0-1, 4 Sterne

// Brew-Time updaten
await MahlgradAPI.updateBrewTime(setIndex, cupIndex, timeInSeconds);
// Beispiel: await MahlgradAPI.updateBrewTime(0, 1, 26); // Cup 0-1, 26 Sekunden

// Oder beides zusammen:
await MahlgradAPI.saveCup({
  setIndex: 0,
  cupIndex: 1,
  tasteRating: 4,
  brewTime: 26
});
```

---

## 📍 Wo die UI hinkommt

In `index.html` gibt es bereits die Detail-View Struktur:

```html
<div id="detail-view" class="hidden">
    <div id="grinder-view">
        <!-- Grinder Scheibe - OBEN -->
    </div>
    
    <div id="detail-content">
        <!-- HIER KOMMT DIE NEUE UI HIN! -->
        <!-- Unterhalb der Grinder-Scheibe -->
    </div>
</div>
```

---

## 🎨 Design-Vorschlag

```
┌─────────────────────────────────────┐
│         [Grinder Scheibe]           │  <- Bereits implementiert
│                                     │
├─────────────────────────────────────┤
│                                     │
│    Geschmack                        │
│    ★ ★ ★ ★ ☆                       │  <- 5 tappbare Sterne
│                                     │
│    Durchlaufzeit                    │
│    ┌─────────────────────┐          │
│    │   26 Sekunden   [-][+]│        │  <- Oder Slider/Input
│    └─────────────────────┘          │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Implementierungs-Schritte

### 1. State erweitern (bereits teilweise da!)

In `app.js` wird beim Laden bereits `state.cupData[cupId]` befüllt:

```javascript
state.cupData[cupId] = {
    id: cup.id,
    grinderRotation: cup.grinder_rotation || 0,
    tasteRating: cup.taste_rating || 0,      // <- Bereits da!
    brewTime: cup.brew_time || 0,             // <- Bereits da!
};
```

### 2. Detail-View öffnen: Werte laden

In `openDetailView(cupId)` werden die Werte bereits geladen:

```javascript
function openDetailView(cupId) {
    state.isDetailViewOpen = true;
    state.detailViewCupId = cupId;
    
    const cupData = state.cupData[cupId];
    if (cupData) {
        state.grinderRotation = cupData.grinderRotation;
        // HINZUFÜGEN:
        // state.currentTasteRating = cupData.tasteRating || 0;
        // state.currentBrewTime = cupData.brewTime || 0;
        // updateRatingUI(state.currentTasteRating);
        // updateBrewTimeUI(state.currentBrewTime);
    }
    // ...
}
```

### 3. Sterne-UI erstellen

```javascript
function createRatingUI() {
    const container = document.getElementById('detail-content');
    
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'rating-container';
    ratingDiv.innerHTML = `
        <label>Geschmack</label>
        <div class="stars">
            ${[1,2,3,4,5].map(i => `
                <span class="star" data-rating="${i}">★</span>
            `).join('')}
        </div>
    `;
    
    container.appendChild(ratingDiv);
    
    // Click-Handler
    ratingDiv.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            setRating(rating);
        });
    });
}

function setRating(rating) {
    state.currentTasteRating = rating;
    updateRatingUI(rating);
    saveRatingToBackend(rating);
}

function updateRatingUI(rating) {
    document.querySelectorAll('.star').forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

async function saveRatingToBackend(rating) {
    const cupId = state.detailViewCupId;
    if (!cupId || !state.isOnline) return;
    
    const [setIndex, cupIndex] = cupId.split('-').map(Number);
    
    try {
        await MahlgradAPI.updateTasteRating(setIndex, cupIndex, rating);
        console.log(`⭐ Rating für ${cupId} gespeichert: ${rating}`);
        
        // Lokalen State auch updaten
        if (!state.cupData[cupId]) state.cupData[cupId] = {};
        state.cupData[cupId].tasteRating = rating;
    } catch (error) {
        console.error('Rating speichern fehlgeschlagen:', error);
    }
}
```

### 4. Brew-Time UI erstellen

```javascript
function createBrewTimeUI() {
    const container = document.getElementById('detail-content');
    
    const brewDiv = document.createElement('div');
    brewDiv.className = 'brew-time-container';
    brewDiv.innerHTML = `
        <label>Durchlaufzeit</label>
        <div class="brew-time-input">
            <button class="brew-btn minus">−</button>
            <span class="brew-value">0</span>
            <span class="brew-unit">Sek.</span>
            <button class="brew-btn plus">+</button>
        </div>
    `;
    
    container.appendChild(brewDiv);
    
    // Plus/Minus Handler
    brewDiv.querySelector('.minus').addEventListener('click', () => adjustBrewTime(-1));
    brewDiv.querySelector('.plus').addEventListener('click', () => adjustBrewTime(+1));
    
    // Long-Press für schnelles Ändern
    let pressTimer;
    brewDiv.querySelectorAll('.brew-btn').forEach(btn => {
        const delta = btn.classList.contains('plus') ? 1 : -1;
        
        btn.addEventListener('touchstart', () => {
            pressTimer = setInterval(() => adjustBrewTime(delta), 100);
        });
        btn.addEventListener('touchend', () => clearInterval(pressTimer));
        btn.addEventListener('touchcancel', () => clearInterval(pressTimer));
    });
}

function adjustBrewTime(delta) {
    state.currentBrewTime = Math.max(0, (state.currentBrewTime || 0) + delta);
    updateBrewTimeUI(state.currentBrewTime);
    
    // Debounced speichern
    saveBrewTimeDebounced(state.currentBrewTime);
}

function updateBrewTimeUI(seconds) {
    const valueEl = document.querySelector('.brew-value');
    if (valueEl) valueEl.textContent = seconds;
}

// Debounce um nicht bei jedem +/- zu speichern
let brewTimeSaveTimeout;
function saveBrewTimeDebounced(seconds) {
    clearTimeout(brewTimeSaveTimeout);
    brewTimeSaveTimeout = setTimeout(() => saveBrewTimeToBackend(seconds), 500);
}

async function saveBrewTimeToBackend(seconds) {
    const cupId = state.detailViewCupId;
    if (!cupId || !state.isOnline) return;
    
    const [setIndex, cupIndex] = cupId.split('-').map(Number);
    
    try {
        await MahlgradAPI.updateBrewTime(setIndex, cupIndex, seconds);
        console.log(`⏱️ Brew-Time für ${cupId} gespeichert: ${seconds}s`);
        
        if (!state.cupData[cupId]) state.cupData[cupId] = {};
        state.cupData[cupId].brewTime = seconds;
    } catch (error) {
        console.error('Brew-Time speichern fehlgeschlagen:', error);
    }
}
```

### 5. CSS Styling

```css
/* In style.css hinzufügen */

#detail-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px;
    padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
}

.rating-container,
.brew-time-container {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
}

.rating-container label,
.brew-time-container label {
    display: block;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.stars {
    display: flex;
    gap: 8px;
}

.star {
    font-size: 32px;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: color 0.2s, transform 0.1s;
}

.star.active {
    color: #FFD700;
}

.star:active {
    transform: scale(1.2);
}

.brew-time-input {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brew-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 24px;
    cursor: pointer;
}

.brew-btn:active {
    background: rgba(255, 255, 255, 0.4);
}

.brew-value {
    font-size: 32px;
    font-weight: bold;
    color: white;
    min-width: 60px;
    text-align: center;
}

.brew-unit {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
}
```

---

## ⚠️ WICHTIGE HINWEISE

### 1. State-Synchronisation
Die Werte werden in `state.cupData[cupId]` gespeichert. Beim Öffnen der Detail-View MÜSSEN die Werte von dort geladen werden:

```javascript
const cupData = state.cupData[cupId];
state.currentTasteRating = cupData?.tasteRating || 0;
state.currentBrewTime = cupData?.brewTime || 0;
```

### 2. Debouncing
Für Brew-Time unbedingt Debouncing verwenden! Sonst wird bei jedem +/- ein API-Call gemacht. 500ms Delay ist gut.

### 3. Offline-Handling
Prüfe `state.isOnline` vor API-Calls. Wenn offline, speichere trotzdem lokal - aber zeige vielleicht einen Hinweis.

### 4. Docker Rebuild
Nach jeder Änderung an JS/CSS:
```bash
docker compose up -d --build
```

### 5. Cache-Busting
Erhöhe die Version in `index.html` wenn du Änderungen machst:
```html
<script src="app.js?v=fresh12"></script>
```

---

## 🧪 Testen

1. Lade die App auf dem iPhone
2. Tippe auf eine Tasse (Detail-View öffnen)
3. Setze Sterne und Brew-Time
4. Schließe Detail-View
5. Öffne sie wieder → Werte sollten noch da sein
6. Lade die App komplett neu → Werte sollten vom Backend geladen werden

Prüfe auch die API:
```bash
curl http://localhost:8080/api/collections/cups/records | python3 -m json.tool
```

---

## 📊 Aktuelle Datenbank-Struktur

```
cups Collection:
├── id (auto)
├── set_index (0-99)
├── cup_index (1-3)
├── image (file)
├── grinder_rotation (number) ← FUNKTIONIERT
├── taste_rating (number 1-5) ← MUSS UI BEKOMMEN
├── brew_time (number seconds) ← MUSS UI BEKOMMEN
├── created (auto)
└── updated (auto)
```

Viel Erfolg! 🚀
