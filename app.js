/**
 * MAHLGRAD - iPhone 16 PWA
 * Natürliches Touch-Tracking für Schallplatten-Karussell
 */

// ========================================
// KONFIGURATION
// ========================================

const CONFIG = {
    totalSets: 10,
    cupsPerSet: 3,
    longPressDelay: 500,
    rotationPerPixel: 0.15,
    snapThreshold: 12,
    maxRotation: 40,
    // Fixer Offset für die Quad-Position
    PERMANENT_OFFSET_Y: 0,
};

const CUP_CONFIGS = [
    {
        "name": "Tasse 1",
        "cupSize": { "w": 157, "h": 129 },
        "corners": [{ "x": 55.6, "y": 51.1 }, { "x": 97.6, "y": 51.2 }, { "x": 92.6, "y": 81.4 }, { "x": 61.9, "y": 81.7 }],
        "controlPoints": [{ "x": 75.5, "y": 59.5 }, { "x": 96.7, "y": 67 }, { "x": 75.9, "y": 86.4 }, { "x": 58.4, "y": 69.1 }]
    },
    {
        "name": "Tasse 2",
        "cupSize": { "w": 168, "h": 125 },
        "corners": [{ "x": 63.5, "y": 54.2 }, { "x": 107.7, "y": 52.6 }, { "x": 103.2, "y": 83 }, { "x": 69.8, "y": 84.3 }],
        "controlPoints": [{ "x": 84.5, "y": 60.9 }, { "x": 106.7, "y": 68.4 }, { "x": 86.5, "y": 86.6 }, { "x": 66.3, "y": 69.5 }]
    },
    {
        "name": "Tasse 3",
        "cupSize": { "w": 189, "h": 140 },
        "corners": [{ "x": 68, "y": 59.5 }, { "x": 113, "y": 58.2 }, { "x": 108.1, "y": 90.8 }, { "x": 71.3, "y": 89.8 }],
        "controlPoints": [{ "x": 90.7, "y": 65.7 }, { "x": 110.6, "y": 76 }, { "x": 89.7, "y": 97 }, { "x": 68.5, "y": 74 }]
    }
];

// ========================================
// STATE
// ========================================

const state = {
    currentSetIndex: 0,
    isEditMode: false,
    selectedCup: null,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
    longPressTimer: null,
    isDetailViewOpen: false,
    detailViewCupId: null,
    currentRotation: 0,
    isDragging: false,
    isDragging: false,
    currentTasteRating: 0,
    currentBrewTime: 0,
    cupImages: {},          // Lokale Bilder (base64/blob URLs)
    cupData: {},            // Backend-Daten pro Cup { "setIndex-cupIndex": {...} }
    currentTasteRating: 0,
    currentBrewTime: 0,
    grinderRotation: 0,
    isOnline: false,        // Backend erreichbar?
};

// ========================================
// DOM ELEMENTE
// ========================================

let elements = {};

// ========================================
// INITIALISIERUNG
// ========================================

async function init() {
    elements = {
        cupsContainer: document.getElementById('cups-container'),
        editIndicator: document.getElementById('edit-indicator'),
        detailView: document.getElementById('detail-view'),
        detailContent: document.getElementById('detail-content'),
        grinderDisc: document.getElementById('grinder-disc'),
        imageMenu: document.getElementById('image-menu'),
        imageMenuBackdrop: document.getElementById('image-menu-backdrop'),
        btnCamera: document.getElementById('btn-camera'),
        btnGallery: document.getElementById('btn-gallery'),
        btnCancel: document.getElementById('btn-cancel'),
        fileInput: document.getElementById('file-input'),
        cameraInput: document.getElementById('camera-input'),
    };

    // Backend-Daten laden falls verfügbar
    await loadFromBackend();

    createCupSet(0);
    setupEventListeners();
}

/**
 * Lädt alle Cup-Daten vom Backend
 */
async function loadFromBackend() {
    if (typeof MahlgradAPI === 'undefined') {
        console.log('API nicht verfügbar, nutze lokalen Modus');
        return;
    }

    try {
        state.isOnline = await MahlgradAPI.isOnline();

        if (!state.isOnline) {
            console.log('Backend offline, nutze lokalen Modus');
            return;
        }

        console.log('✅ Backend verbunden');

        // Alle Cups laden
        const cups = await MahlgradAPI.getCups();
        console.log('🔍 Geladene Cups:', cups);

        for (const cup of cups) {
            const cupId = `${cup.set_index}-${cup.cup_index}`;

            // Speichere Cup-Daten
            state.cupData[cupId] = {
                id: cup.id,
                grinderRotation: cup.grinder_rotation || 0,
                tasteRating: cup.taste_rating || 0,
                brewTime: cup.brew_time || 0,
            };

            // Lade Bild falls vorhanden
            if (cup.image) {
                const imageUrl = MahlgradAPI.getImageUrl(cup);
                console.log(`🖼️ Cup ${cupId} Bild-URL:`, imageUrl);
                state.cupImages[cupId] = imageUrl;
            }
        }

        console.log('📦 cupImages State:', state.cupImages);
    } catch (error) {
        console.error('Backend-Fehler:', error);
        state.isOnline = false;
    }
}

function createCupSet(setIndex) {
    elements.cupsContainer.innerHTML = '';

    for (let cupIndex = 1; cupIndex <= CONFIG.cupsPerSet; cupIndex++) {
        const cup = createCup(setIndex, cupIndex);
        elements.cupsContainer.appendChild(cup);

        // Bild anwenden NACHDEM das Element im DOM ist
        const cupId = `${setIndex}-${cupIndex}`;
        if (state.cupImages[cupId]) {
            console.log(`🎨 Wende Bild an für ${cupId}:`, state.cupImages[cupId]);
            applyImageToCup(cupId, state.cupImages[cupId]);
        }
    }
}

function createCup(setIndex, cupIndex) {
    const cup = document.createElement('div');
    const cupId = `${setIndex}-${cupIndex}`;

    cup.className = `cup cup-${cupIndex}`;
    cup.dataset.setIndex = setIndex;
    cup.dataset.cupIndex = cupIndex;
    cup.dataset.cupId = cupId;

    const img = document.createElement('img');
    img.src = `image ${cupIndex}.png`;
    img.alt = `Tasse ${cupIndex}`;
    img.draggable = false;
    cup.appendChild(img);

    // Canvas Overlay
    // WICHTIG: Um negative Offsets (nach oben) und Überlappungen zu erlauben,
    // machen wir den Canvas viel größer als die Tasse (300%) und zentrieren ihn.
    const canvas = document.createElement('canvas');
    canvas.className = 'cup-overlay';
    canvas.dataset.cupId = cupId;

    // Set styles for massive overflow
    canvas.style.width = '300%';
    canvas.style.height = '300%';
    canvas.style.left = '-100%';
    canvas.style.top = '-100%';
    canvas.style.position = 'absolute'; // Ensure it's absolute within cup

    // Internal Resolution: 2x for Retina * 3x for Size = 6x base
    const config = CUP_CONFIGS[cupIndex - 1];
    if (config) {
        canvas.width = config.cupSize.w * 6;
        canvas.height = config.cupSize.h * 6;
    } else {
        canvas.width = 900;
        canvas.height = 900;
    }

    cup.appendChild(canvas);

    return cup;
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    const container = elements.cupsContainer;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    elements.imageMenuBackdrop.addEventListener('click', closeImageMenu);
    elements.btnCamera.addEventListener('click', openCamera);
    elements.btnGallery.addEventListener('click', openGallery);
    elements.btnCancel.addEventListener('click', closeImageMenu);

    elements.fileInput.addEventListener('change', handleImageSelected);
    elements.cameraInput.addEventListener('change', handleImageSelected);

    elements.detailView.addEventListener('touchstart', handleDetailTouchStart, { passive: false });
    elements.detailView.addEventListener('touchmove', handleDetailTouchMove, { passive: false });
    elements.detailView.addEventListener('touchend', handleDetailTouchEnd);

    document.addEventListener('touchend', (e) => {
        if (state.isEditMode && !e.target.closest('.cup') && !e.target.closest('#image-menu')) {
            exitEditMode();
        }
    });
}

// ========================================
// TOUCH HANDLING
// ========================================

function handleTouchStart(e) {
    const touch = e.touches[0];
    state.touchStartX = touch.clientX;
    state.touchStartY = touch.clientY;
    state.touchStartTime = Date.now();
    state.isDragging = false;
    state.currentRotation = 0;

    const cup = e.target.closest('.cup');
    if (cup) {
        state.longPressTimer = setTimeout(() => {
            if (!state.isDragging) {
                enterEditMode();
                vibrate();
            }
        }, CONFIG.longPressDelay);
    }
}

function handleTouchMove(e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - state.touchStartX;
    const deltaY = touch.clientY - state.touchStartY;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (state.longPressTimer) {
            clearTimeout(state.longPressTimer);
            state.longPressTimer = null;
        }
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
        e.preventDefault();
        state.isDragging = true;

        let rotation = deltaX * CONFIG.rotationPerPixel;

        if (state.currentSetIndex === 0 && rotation > 0) rotation *= 0.2;
        if (state.currentSetIndex >= CONFIG.totalSets - 1 && rotation < 0) rotation *= 0.2;

        rotation = Math.max(-CONFIG.maxRotation, Math.min(CONFIG.maxRotation, rotation));
        state.currentRotation = rotation;

        const cups = document.querySelectorAll('.cup');
        cups.forEach(cup => {
            cup.style.transform = `rotate(${rotation}deg)`;
        });
    }
}

function handleTouchEnd(e) {
    if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - state.touchStartX;
    const deltaY = touch.clientY - state.touchStartY;
    const deltaTime = Date.now() - state.touchStartTime;

    if (state.isDragging) {
        if (Math.abs(state.currentRotation) > CONFIG.snapThreshold) {
            if (state.currentRotation < 0 && state.currentSetIndex < CONFIG.totalSets - 1) {
                animateToNextSet();
            } else if (state.currentRotation > 0 && state.currentSetIndex > 0) {
                animateToPreviousSet();
            } else {
                snapBack();
            }
        } else {
            snapBack();
        }

        state.isDragging = false;
        state.currentRotation = 0;
        return;
    }

    const cup = e.target.closest('.cup');
    if (cup && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
        handleCupTap(cup);
    }
}

// ========================================
// ANIMATIONEN
// ========================================

function snapBack() {
    const cups = document.querySelectorAll('.cup');
    cups.forEach(cup => {
        cup.classList.add('animate-in');
        cup.style.transform = 'rotate(0deg)';
    });

    setTimeout(() => {
        cups.forEach(cup => cup.classList.remove('animate-in'));
    }, 350);
}

function animateToNextSet() {
    const cups = document.querySelectorAll('.cup');
    cups.forEach(cup => {
        cup.classList.add('animate-in');
        cup.style.transform = `rotate(-${CONFIG.maxRotation}deg)`;
        cup.style.opacity = '0';
    });

    setTimeout(() => {
        state.currentSetIndex++;
        createCupSet(state.currentSetIndex);
        const newCups = document.querySelectorAll('.cup');
        newCups.forEach(cup => {
            cup.style.transform = `rotate(${CONFIG.maxRotation}deg)`;
            cup.style.opacity = '0';
            requestAnimationFrame(() => {
                cup.classList.add('animate-in');
                cup.style.transform = 'rotate(0deg)';
                cup.style.opacity = '1';
                setTimeout(() => cup.classList.remove('animate-in'), 350);
            });
        });
        vibrate(10);
    }, 200);
}

function animateToPreviousSet() {
    const cups = document.querySelectorAll('.cup');
    cups.forEach(cup => {
        cup.classList.add('animate-in');
        cup.style.transform = `rotate(${CONFIG.maxRotation}deg)`;
        cup.style.opacity = '0';
    });

    setTimeout(() => {
        state.currentSetIndex--;
        createCupSet(state.currentSetIndex);
        const newCups = document.querySelectorAll('.cup');
        newCups.forEach(cup => {
            cup.style.transform = `rotate(-${CONFIG.maxRotation}deg)`;
            cup.style.opacity = '0';
            requestAnimationFrame(() => {
                cup.classList.add('animate-in');
                cup.style.transform = 'rotate(0deg)';
                cup.style.opacity = '1';
                setTimeout(() => cup.classList.remove('animate-in'), 350);
            });
        });
        vibrate(10);
    }, 200);
}

// ========================================
// TASSEN INTERAKTION
// ========================================

function handleCupTap(cup) {
    const cupId = cup.dataset.cupId;

    if (state.isEditMode) {
        state.selectedCup = cupId;
        openImageMenu();
    } else {
        openDetailView(cupId);
    }
}

// ========================================
// EDIT MODE
// ========================================

function enterEditMode() {
    state.isEditMode = true;
    elements.editIndicator.classList.remove('hidden');
    document.querySelectorAll('.cup').forEach(cup => cup.classList.add('edit-mode'));
}

function exitEditMode() {
    state.isEditMode = false;
    state.selectedCup = null;
    elements.editIndicator.classList.add('hidden');
    document.querySelectorAll('.cup').forEach(cup => cup.classList.remove('edit-mode'));
}

// ========================================
// BILD-MENÜ & CANVAS
// ========================================

function openImageMenu() {
    elements.imageMenu.classList.remove('hidden');
}

function closeImageMenu() {
    elements.imageMenu.classList.add('hidden');
}

function openCamera() {
    elements.cameraInput.click();
    closeImageMenu();
}

function openGallery() {
    elements.fileInput.click();
    closeImageMenu();
}

function handleImageSelected(e) {
    const file = e.target.files[0];
    if (!file || !state.selectedCup) return;

    // Speichere File-Referenz für Backend-Upload
    const cupId = state.selectedCup;
    const [setIndex, cupIndex] = cupId.split('-').map(Number);

    const reader = new FileReader();
    reader.onload = async (event) => {
        const imageData = event.target.result;
        applyImageToCup(cupId, imageData);

        // Im Hintergrund ans Backend senden
        if (state.isOnline && typeof MahlgradAPI !== 'undefined') {
            try {
                await MahlgradAPI.saveCup({
                    setIndex,
                    cupIndex,
                    image: imageData
                });
                console.log(`📸 Bild für Cup ${cupId} gespeichert`);
            } catch (error) {
                console.error('Fehler beim Speichern:', error);
            }
        }

        exitEditMode();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function applyImageToCup(cupId, imageData) {
    state.cupImages[cupId] = imageData;
    const canvas = document.querySelector(`.cup-overlay[data-cup-id="${cupId}"]`);
    if (!canvas) return;
    const cupIndexStr = canvas.parentElement.dataset.cupIndex;
    const cupIndex = parseInt(cupIndexStr, 10);
    const config = CUP_CONFIGS[cupIndex - 1];
    if (!config) return;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Für Backend-URLs
    img.onload = () => drawOnCanvas(canvas, img, config);
    img.src = imageData;
}

function drawOnCanvas(canvas, img, config) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Canvas is 6x the base resolution (3x size * 2x retina)
    const canvasScale = (w / 3.0) / config.cupSize.w;

    // Origin shift for the 300% canvas
    const originX = w / 3.0;
    const originY = h / 3.0;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(originX, originY);

    // Transform config coords to canvas coords
    const t = (p) => ({
        x: p.x * canvasScale,
        y: (p.y + CONFIG.PERMANENT_OFFSET_Y) * canvasScale
    });

    // Get the 4 corners transformed to canvas coordinates
    const corners = config.corners.map(p => t(p));

    // Draw the image with perspective warp using mesh subdivision
    drawPerspectiveImage(ctx, img, corners, config.controlPoints.map(p => t(p)));

    ctx.restore();
}

/**
 * Zeichnet ein Bild perspektivisch verzerrt in ein Quadrilateral
 * Das Bild wird in ein Mesh unterteilt und jedes Dreieck einzeln transformiert
 */
function drawPerspectiveImage(ctx, img, corners, controlPoints) {
    // corners: [topLeft, topRight, bottomRight, bottomLeft]
    // Wir müssen die Ecken richtig zuordnen:
    // corners[0] = oben-links, corners[1] = oben-rechts
    // corners[2] = unten-rechts, corners[3] = unten-links

    const subdivisions = 12; // Mehr = glattere Verformung

    // Für jede Zelle im Mesh
    for (let row = 0; row < subdivisions; row++) {
        for (let col = 0; col < subdivisions; col++) {
            // Normalisierte Koordinaten (0-1) für die 4 Ecken dieser Zelle
            const u0 = col / subdivisions;
            const v0 = row / subdivisions;
            const u1 = (col + 1) / subdivisions;
            const v1 = (row + 1) / subdivisions;

            // Quellrechteck im Bild (Pixel)
            const srcX0 = u0 * img.width;
            const srcY0 = v0 * img.height;
            const srcX1 = u1 * img.width;
            const srcY1 = v1 * img.height;

            // Zielkoordinaten - bilinear interpoliert auf dem Quad
            // Mit Bézier-Kurven für die gekrümmten Kanten
            const dst00 = interpolateQuadWithCurves(u0, v0, corners, controlPoints);
            const dst10 = interpolateQuadWithCurves(u1, v0, corners, controlPoints);
            const dst01 = interpolateQuadWithCurves(u0, v1, corners, controlPoints);
            const dst11 = interpolateQuadWithCurves(u1, v1, corners, controlPoints);

            // Zeichne zwei Dreiecke für diese Zelle
            drawTexturedTriangle(ctx, img,
                srcX0, srcY0, srcX1, srcY0, srcX0, srcY1,
                dst00.x, dst00.y, dst10.x, dst10.y, dst01.x, dst01.y
            );
            drawTexturedTriangle(ctx, img,
                srcX1, srcY0, srcX1, srcY1, srcX0, srcY1,
                dst10.x, dst10.y, dst11.x, dst11.y, dst01.x, dst01.y
            );
        }
    }
}

/**
 * Interpoliert eine Position auf dem Quad mit Bézier-Kurven für gekrümmte Kanten
 * u, v sind normalisierte Koordinaten (0-1)
 */
function interpolateQuadWithCurves(u, v, corners, controlPoints) {
    // corners: [TL, TR, BR, BL]
    // controlPoints: [top, right, bottom, left]

    // Obere Kante: TL -> TR mit control point top
    const topPoint = quadraticBezier(corners[0], controlPoints[0], corners[1], u);

    // Untere Kante: BL -> BR mit control point bottom
    const bottomPoint = quadraticBezier(corners[3], controlPoints[2], corners[2], u);

    // Linke Kante: TL -> BL mit control point left
    const leftPoint = quadraticBezier(corners[0], controlPoints[3], corners[3], v);

    // Rechte Kante: TR -> BR mit control point right
    const rightPoint = quadraticBezier(corners[1], controlPoints[1], corners[2], v);

    // Bilineare Interpolation zwischen den Kantenpunkten
    // Kombiniere horizontale und vertikale Interpolation
    const horizontal = {
        x: topPoint.x * (1 - v) + bottomPoint.x * v,
        y: topPoint.y * (1 - v) + bottomPoint.y * v
    };

    const vertical = {
        x: leftPoint.x * (1 - u) + rightPoint.x * u,
        y: leftPoint.y * (1 - u) + rightPoint.y * u
    };

    // Ecken für Korrektur
    const bilinearCorners = {
        x: corners[0].x * (1 - u) * (1 - v) +
            corners[1].x * u * (1 - v) +
            corners[3].x * (1 - u) * v +
            corners[2].x * u * v,
        y: corners[0].y * (1 - u) * (1 - v) +
            corners[1].y * u * (1 - v) +
            corners[3].y * (1 - u) * v +
            corners[2].y * u * v
    };

    // Coons Patch: kombiniere Kanten und subtrahiere Corners
    return {
        x: horizontal.x + vertical.x - bilinearCorners.x,
        y: horizontal.y + vertical.y - bilinearCorners.y
    };
}

/**
 * Quadratische Bézier-Kurve
 */
function quadraticBezier(p0, p1, p2, t) {
    const mt = 1 - t;
    return {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
    };
}

/**
 * Zeichnet ein texturiertes Dreieck mit affiner Transformation
 */
function drawTexturedTriangle(ctx, img,
    sx0, sy0, sx1, sy1, sx2, sy2,  // Source triangle (image coords)
    dx0, dy0, dx1, dy1, dx2, dy2   // Destination triangle (canvas coords)
) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dx0, dy0);
    ctx.lineTo(dx1, dy1);
    ctx.lineTo(dx2, dy2);
    ctx.closePath();
    ctx.clip();

    // Berechne die affine Transformation
    // Source -> Destination Mapping
    const denom = (sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1));

    if (Math.abs(denom) < 0.0001) {
        ctx.restore();
        return;
    }

    const m11 = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom;
    const m12 = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom;
    const m21 = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom;
    const m22 = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom;
    const m13 = (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / denom;
    const m23 = (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / denom;

    ctx.transform(m11, m21, m12, m22, m13, m23);

    // Zeichne das Bild mit etwas Überlappung um Lücken zu vermeiden
    ctx.drawImage(img, 0, 0);

    ctx.restore();
}

// ========================================
// RESTRUCTURED DETAIL UI
// ========================================

function buildDetailLayout() {
    const container = document.getElementById('detail-content');
    if (!container) return;

    container.innerHTML = ''; // Clean start

    // 1. Image Container
    const imgContainer = document.createElement('div');
    imgContainer.className = 'detail-image-container';
    imgContainer.innerHTML = `<img id="detail-cup-image" src="" alt="Cup Detail" draggable="false">`;
    container.appendChild(imgContainer);

    // 2. Controls Row
    const controlsRow = document.createElement('div');
    controlsRow.className = 'controls-row';
    container.appendChild(controlsRow);

    // 3. Rating Box
    const ratingBox = document.createElement('div');
    ratingBox.className = 'control-box rating-box';
    ratingBox.innerHTML = `
        <div class="stars">
            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-rating="${i}">★</span>`).join('')}
        </div>
    `;
    controlsRow.appendChild(ratingBox);

    // Attach Rating Listeners
    ratingBox.querySelectorAll('.star').forEach(star => {
        const handleStar = (e) => {
            e.preventDefault(); // Stop EVERYTHING else
            e.stopPropagation();
            const rating = parseInt(star.dataset.rating);
            setRating(rating);
            vibrate(10);
        };

        star.addEventListener('touchstart', handleStar, { passive: false });
        star.addEventListener('mousedown', handleStar); // For desktop testing
    });

    // 4. Brew Time Box (Scrubber)
    const flowBox = document.createElement('div');
    flowBox.className = 'control-box flow-box';
    flowBox.innerHTML = `
        <div class="brew-time-scrubber">
            <span class="brew-value">0</span><span class="brew-unit">s</span>
        </div>
    `;
    controlsRow.appendChild(flowBox);

    // Attach Touch Scrubber Logic
    let startY = 0;
    let startValue = 0;

    flowBox.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent scroll
        flowBox.classList.add('scrubbing');
        startY = e.touches[0].clientY;
        startValue = state.currentBrewTime || 0;
        vibrate(5);
    }, { passive: false });

    flowBox.addEventListener('touchmove', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const currentY = e.touches[0].clientY;
        const deltaY = startY - currentY; // Up is positive delta

        // Sensitivity: 15px per second?
        // "unterschiedlich fein": Maybe speed based?
        // Simple implementation first: 10px = 1s
        const valueDelta = Math.round(deltaY / 10);

        let newValue = Math.max(0, startValue + valueDelta);
        if (newValue !== state.currentBrewTime) {
            // Only update if changed
            state.currentBrewTime = newValue;
            updateBrewTimeUI(newValue);
            if (newValue % 5 === 0) vibrate(5); // Haptic feedback on steps
        }
    }, { passive: false });

    flowBox.addEventListener('touchend', (e) => {
        flowBox.classList.remove('scrubbing');
        saveBrewTimeDebounced(state.currentBrewTime);
        vibrate(10);
    });

    flowBox.addEventListener('touchcancel', () => {
        flowBox.classList.remove('scrubbing');
    });
}

function updateDetailImage(cupId) {
    const imgEl = document.getElementById('detail-cup-image');
    if (!imgEl) return;

    // Default to the cup icon if no photo
    let src = `image ${cupId.split('-')[1]}.png`; // Fallback to asset

    if (state.cupImages[cupId]) {
        src = state.cupImages[cupId];
    } else {
        // Checking config for default asset based on index
        const index = parseInt(cupId.split('-')[1]);
        if (index) src = `image ${index}.png`;
    }
    imgEl.src = src;
}

// Logic functions remain...
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
    if (!cupId) return;
    if (!state.cupData[cupId]) state.cupData[cupId] = {};
    state.cupData[cupId].tasteRating = rating;
    if (!state.isOnline) return;
    const [setIndex, cupIndex] = cupId.split('-').map(Number);
    try {
        await MahlgradAPI.updateTasteRating(setIndex, cupIndex, rating);
        console.log(`⭐ Rating für ${cupId} gespeichert: ${rating}`);
    } catch (error) {
        console.error('Rating speichern fehlgeschlagen:', error);
    }
}

function adjustBrewTime(delta) {
    state.currentBrewTime = Math.max(0, (state.currentBrewTime || 0) + delta);
    updateBrewTimeUI(state.currentBrewTime);
    saveBrewTimeDebounced(state.currentBrewTime);
}

function updateBrewTimeUI(seconds) {
    const valueEl = document.querySelector('.brew-value');
    if (valueEl) valueEl.textContent = seconds;
}

let brewTimeSaveTimeout;
function saveBrewTimeDebounced(seconds) {
    clearTimeout(brewTimeSaveTimeout);
    brewTimeSaveTimeout = setTimeout(() => saveBrewTimeToBackend(seconds), 500);
}

async function saveBrewTimeToBackend(seconds) {
    const cupId = state.detailViewCupId;
    if (!cupId) return;
    if (!state.cupData[cupId]) state.cupData[cupId] = {};
    state.cupData[cupId].brewTime = seconds;
    if (!state.isOnline) return;
    const [setIndex, cupIndex] = cupId.split('-').map(Number);
    try {
        await MahlgradAPI.updateBrewTime(setIndex, cupIndex, seconds);
        console.log(`⏱️ Brew-Time für ${cupId} gespeichert: ${seconds}s`);
    } catch (error) {
        console.error('Brew-Time speichern fehlgeschlagen:', error);
    }
}

// ========================================
// DETAIL-ANSICHT & GRINDER LOGIK
// ========================================

let detailTouchStartX = 0;
let detailTouchCurrentX = 0;
let detailInteractionType = null;
let grinderStartAngle = 0;

function openDetailView(cupId) {
    state.isDetailViewOpen = true;
    state.detailViewCupId = cupId;

    // Create Layout FRESH every time to ensure cleanliness
    buildDetailLayout();

    // Update Image
    updateDetailImage(cupId);

    // Lade Daten
    const cupData = state.cupData[cupId];
    if (cupData) {
        state.grinderRotation = cupData.grinderRotation || 0;
        state.currentTasteRating = cupData.tasteRating || 0;
        state.currentBrewTime = cupData.brewTime || 0;
    } else {
        state.grinderRotation = 0;
        state.currentTasteRating = 0;
        state.currentBrewTime = 0;
    }

    // Update UI Elements
    updateRatingUI(state.currentTasteRating);
    updateBrewTimeUI(state.currentBrewTime);

    if (elements.grinderDisc) {
        elements.grinderDisc.style.transform = `rotate(${state.grinderRotation}deg)`;
    }

    elements.detailView.classList.remove('hidden');
    requestAnimationFrame(() => elements.detailView.classList.add('visible'));
}

function closeDetailView() {
    elements.detailView.classList.remove('dragging');
    elements.detailView.style.transform = 'translateX(100%)';
    setTimeout(() => {
        elements.detailView.classList.add('hidden');
        elements.detailView.classList.remove('visible');
        elements.detailView.style.transform = '';
        state.isDetailViewOpen = false;
        state.detailViewCupId = null;
    }, 350);
}

function handleDetailTouchStart(e) {
    const touch = e.touches[0];
    const clientY = touch.clientY;
    if (clientY < 420) {
        detailInteractionType = 'rotate-grinder';
        initGrinderRotation(touch);
    } else {
        // Prevent swipe-close if touching controls
        if (e.target.closest('.control-box') || e.target.closest('.star')) {
            detailInteractionType = null;
            return;
        }
        detailInteractionType = 'swipe-close';
        detailTouchStartX = touch.clientX;
        detailTouchCurrentX = detailTouchStartX;
    }
}

function handleDetailTouchMove(e) {
    const touch = e.touches[0];
    if (detailInteractionType === 'rotate-grinder') {
        e.preventDefault();
        updateGrinderRotation(touch);
    } else if (detailInteractionType === 'swipe-close') {
        detailTouchCurrentX = touch.clientX;
        const deltaX = detailTouchCurrentX - detailTouchStartX;
        if (deltaX > 0) {
            elements.detailView.classList.add('dragging');
            elements.detailView.style.transform = `translateX(${deltaX}px)`;
        }
    }
}

function handleDetailTouchEnd(e) {
    if (detailInteractionType === 'swipe-close') {
        const deltaX = detailTouchCurrentX - detailTouchStartX;
        elements.detailView.classList.remove('dragging');
        if (deltaX > 100) {
            // Speichere Rotation bevor wir schließen
            saveGrinderRotation();
            closeDetailView();
        } else {
            elements.detailView.classList.add('visible');
            elements.detailView.style.transform = '';
        }
    } else if (detailInteractionType === 'rotate-grinder') {
        // Speichere nach jeder Rotation (debounced im Backend)
        saveGrinderRotation();
    }
    detailInteractionType = null;
}

// Debounce Timer für Speichern
let saveRotationTimeout = null;

function saveGrinderRotation() {
    const cupId = state.detailViewCupId;
    if (!cupId) return;

    // Update lokalen State
    if (!state.cupData[cupId]) {
        state.cupData[cupId] = {};
    }
    state.cupData[cupId].grinderRotation = state.grinderRotation;

    // Debounced Backend-Speicherung
    if (saveRotationTimeout) {
        clearTimeout(saveRotationTimeout);
    }

    saveRotationTimeout = setTimeout(async () => {
        if (!state.isOnline || typeof MahlgradAPI === 'undefined') return;

        const [setIndex, cupIndex] = cupId.split('-').map(Number);
        try {
            await MahlgradAPI.updateGrinderRotation(setIndex, cupIndex, state.grinderRotation);
            console.log(`⚙️ Rotation für ${cupId} gespeichert: ${state.grinderRotation.toFixed(1)}°`);
        } catch (error) {
            console.error('Fehler beim Speichern der Rotation:', error);
        }
    }, 500); // 500ms debounce
}

function initGrinderRotation(touch) {
    const centerX = window.innerWidth / 2;
    const centerY = 53.5;
    const x = touch.clientX - centerX;
    const y = touch.clientY - centerY;
    grinderStartAngle = Math.atan2(y, x);
    if (typeof state.grinderRotation === 'undefined') state.grinderRotation = 0;
}

function updateGrinderRotation(touch) {
    const centerX = window.innerWidth / 2;
    const centerY = 53.5;
    const x = touch.clientX - centerX;
    const y = touch.clientY - centerY;
    const currentAngle = Math.atan2(y, x);
    let angleDelta = currentAngle - grinderStartAngle;
    while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
    while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
    let rotationDeltaDeg = angleDelta * (180 / Math.PI);
    state.grinderRotation += rotationDeltaDeg;
    grinderStartAngle = currentAngle;
    if (elements.grinderDisc) {
        elements.grinderDisc.style.transform = `rotate(${state.grinderRotation}deg)`;
    }
}

function vibrate(duration = 20) {
    if ('vibrate' in navigator) navigator.vibrate(duration);
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registriert'))
            .catch(err => console.log('SW Fehler:', err));
    });
}

document.addEventListener('DOMContentLoaded', init);
