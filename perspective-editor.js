/**
 * PERSPEKTIV-EDITOR für Mahlgrad
 * Ermöglicht das Anpassen der Quad-Formen für 3D-Perspektive auf Tassen
 */

(function () {
    'use strict';

    // ========================================
    // KONFIGURATION - Basierend auf style.css
    // ========================================

    // Tassen-Positionen aus style.css
    const CUP_POSITIONS = [
        { // Cup 1
            left: 20, top: 457, width: 157, height: 129,
            overlay: { left: 57.5, top: 59.5, width: 36, height: 33 }
        },
        { // Cup 2
            left: 197, top: 526, width: 168, height: 125,
            overlay: { left: 64.5, top: 61, width: 37, height: 33 }
        },
        { // Cup 3
            left: 29, top: 645, width: 189, height: 140,
            overlay: { left: 67, top: 66, width: 43, height: 39 }
        }
    ];

    // ========================================
    // STATE
    // ========================================

    let isEditorActive = false;
    let quads = [];
    let dragging = null;

    // ========================================
    // QUAD KLASSE
    // ========================================

    class Quad {
        constructor(cupIndex, cupPos) {
            this.cupIndex = cupIndex;
            this.cupPos = cupPos;

            // Berechne absolute Position des Overlays
            const absX = cupPos.left + cupPos.overlay.left;
            const absY = cupPos.top + cupPos.overlay.top;
            const w = cupPos.overlay.width;
            const h = cupPos.overlay.height;

            // 4 Ecken: TL, TR, BR, BL (absolute Koordinaten)
            this.corners = [
                { x: absX, y: absY },           // Top-Left
                { x: absX + w, y: absY },       // Top-Right
                { x: absX + w, y: absY + h },   // Bottom-Right
                { x: absX, y: absY + h }        // Bottom-Left
            ];

            // 4 Bezier-Kontrollpunkte (einer pro Kante)
            this.controlPoints = this.calculateControlPoints();

            // DOM Elemente
            this.cornerElements = [];
            this.controlElements = [];
            this.pathElement = null;
        }

        calculateControlPoints() {
            const c = this.corners;
            return [
                this.midpoint(c[0], c[1]), // Top edge
                this.midpoint(c[1], c[2]), // Right edge
                this.midpoint(c[2], c[3]), // Bottom edge
                this.midpoint(c[3], c[0])  // Left edge
            ];
        }

        midpoint(p1, p2) {
            return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        }

        createElements(svg, pointsContainer) {
            // SVG Path erstellen
            this.pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.pathElement.setAttribute('fill', 'rgba(0, 0, 0, 0.85)');
            this.pathElement.setAttribute('stroke', '#ff6b6b');
            this.pathElement.setAttribute('stroke-width', '2');
            svg.appendChild(this.pathElement);

            // Eck-Punkte erstellen
            this.corners.forEach((corner, i) => {
                const el = this.createPoint(corner, 'corner', i, pointsContainer);
                this.cornerElements.push(el);
            });

            // Kontroll-Punkte erstellen
            this.controlPoints.forEach((cp, i) => {
                const el = this.createPoint(cp, 'control', i, pointsContainer);
                this.controlElements.push(el);
            });

            this.updatePath();
            this.updateLines(svg);
        }

        createPoint(pos, type, index, container) {
            const el = document.createElement('div');
            el.className = `quad-point ${type}-point`;
            el.dataset.quadIndex = this.cupIndex;
            el.dataset.type = type;
            el.dataset.index = index;

            // Styling
            Object.assign(el.style, {
                position: 'absolute',
                width: type === 'corner' ? '20px' : '14px',
                height: type === 'corner' ? '20px' : '14px',
                borderRadius: '50%',
                background: type === 'corner' ? '#ff6b6b' : '#4ecdc4',
                border: '2px solid #fff',
                cursor: 'grab',
                transform: 'translate(-50%, -50%)',
                zIndex: type === 'corner' ? '20' : '15',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                left: pos.x + 'px',
                top: pos.y + 'px'
            });

            container.appendChild(el);
            return el;
        }

        updatePath() {
            const c = this.corners;
            const cp = this.controlPoints;

            // SVG Path mit quadratischen Bezier-Kurven
            const d = `
                M ${c[0].x} ${c[0].y}
                Q ${cp[0].x} ${cp[0].y} ${c[1].x} ${c[1].y}
                Q ${cp[1].x} ${cp[1].y} ${c[2].x} ${c[2].y}
                Q ${cp[2].x} ${cp[2].y} ${c[3].x} ${c[3].y}
                Q ${cp[3].x} ${cp[3].y} ${c[0].x} ${c[0].y}
                Z
            `;
            this.pathElement.setAttribute('d', d);
        }

        updateLines(svg) {
            // Entferne alte Hilfslinien
            svg.querySelectorAll(`.quad-line-${this.cupIndex}`).forEach(el => el.remove());

            const c = this.corners;
            const cp = this.controlPoints;

            // Zeichne gestrichelte Linien von Ecken zu Kontrollpunkten
            for (let i = 0; i < 4; i++) {
                const nextI = (i + 1) % 4;

                // Linie von Ecke i zum Kontrollpunkt
                this.drawLine(svg, c[i], cp[i]);
                // Linie vom Kontrollpunkt zur nächsten Ecke
                this.drawLine(svg, cp[i], c[nextI]);
            }
        }

        drawLine(svg, p1, p2) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.classList.add(`quad-line-${this.cupIndex}`);
            line.setAttribute('x1', p1.x);
            line.setAttribute('y1', p1.y);
            line.setAttribute('x2', p2.x);
            line.setAttribute('y2', p2.y);
            line.setAttribute('stroke', 'rgba(78, 205, 196, 0.5)');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-dasharray', '4,4');
            svg.insertBefore(line, svg.firstChild);
        }

        updatePointPositions() {
            this.cornerElements.forEach((el, i) => {
                el.style.left = this.corners[i].x + 'px';
                el.style.top = this.corners[i].y + 'px';
            });

            this.controlElements.forEach((el, i) => {
                el.style.left = this.controlPoints[i].x + 'px';
                el.style.top = this.controlPoints[i].y + 'px';
            });
        }

        reset() {
            const absX = this.cupPos.left + this.cupPos.overlay.left;
            const absY = this.cupPos.top + this.cupPos.overlay.top;
            const w = this.cupPos.overlay.width;
            const h = this.cupPos.overlay.height;

            this.corners = [
                { x: absX, y: absY },
                { x: absX + w, y: absY },
                { x: absX + w, y: absY + h },
                { x: absX, y: absY + h }
            ];

            this.controlPoints = this.calculateControlPoints();
        }

        getData() {
            // Zurück in relative Koordinaten (relativ zur Tasse)
            return {
                cupIndex: this.cupIndex + 1,
                corners: this.corners.map(p => ({
                    x: Math.round((p.x - this.cupPos.left) * 10) / 10,
                    y: Math.round((p.y - this.cupPos.top) * 10) / 10
                })),
                controlPoints: this.controlPoints.map(p => ({
                    x: Math.round((p.x - this.cupPos.left) * 10) / 10,
                    y: Math.round((p.y - this.cupPos.top) * 10) / 10
                }))
            };
        }

        removeElements() {
            this.cornerElements.forEach(el => el.remove());
            this.controlElements.forEach(el => el.remove());
            if (this.pathElement) this.pathElement.remove();
        }
    }

    // ========================================
    // EDITOR FUNKTIONEN
    // ========================================

    function initEditor() {
        const svg = document.getElementById('quad-svg');
        const pointsContainer = document.getElementById('quad-points');

        // Lösche alte Elemente
        svg.innerHTML = '';
        pointsContainer.innerHTML = '';
        quads = [];

        // Erstelle Quads für jede Tasse
        CUP_POSITIONS.forEach((cupPos, i) => {
            const quad = new Quad(i, cupPos);
            quad.createElements(svg, pointsContainer);
            quads.push(quad);
        });

        // Event Listeners für Drag
        setupDragListeners();
    }

    function setupDragListeners() {
        const pointsContainer = document.getElementById('quad-points');

        pointsContainer.addEventListener('mousedown', startDrag);
        pointsContainer.addEventListener('touchstart', startDrag, { passive: false });

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });

        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }

    function startDrag(e) {
        const target = e.target;
        if (!target.classList.contains('quad-point')) return;

        e.preventDefault();
        target.style.cursor = 'grabbing';
        target.style.transform = 'translate(-50%, -50%) scale(1.3)';

        dragging = {
            element: target,
            quadIndex: parseInt(target.dataset.quadIndex),
            type: target.dataset.type,
            pointIndex: parseInt(target.dataset.index)
        };
    }

    function onDrag(e) {
        if (!dragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const quad = quads[dragging.quadIndex];

        if (dragging.type === 'corner') {
            quad.corners[dragging.pointIndex] = { x: clientX, y: clientY };
        } else {
            quad.controlPoints[dragging.pointIndex] = { x: clientX, y: clientY };
        }

        quad.updatePointPositions();
        quad.updatePath();
        quad.updateLines(document.getElementById('quad-svg'));
    }

    function endDrag() {
        if (dragging) {
            dragging.element.style.cursor = 'grab';
            dragging.element.style.transform = 'translate(-50%, -50%)';
            dragging = null;
        }
    }

    function showEditor() {
        isEditorActive = true;
        document.getElementById('perspective-editor').classList.remove('hidden');
        document.getElementById('editor-controls').classList.remove('hidden');
        document.getElementById('perspective-toggle').style.display = 'none';

        initEditor();
    }

    function hideEditor() {
        isEditorActive = false;
        document.getElementById('perspective-editor').classList.add('hidden');
        document.getElementById('editor-controls').classList.add('hidden');
        document.getElementById('perspective-toggle').style.display = 'flex';

        // Cleanup
        quads.forEach(q => q.removeElements());
        quads = [];
    }

    function resetQuads() {
        const svg = document.getElementById('quad-svg');
        quads.forEach(q => {
            q.reset();
            q.updatePointPositions();
            q.updatePath();
            q.updateLines(svg);
        });
        showToast('Zurückgesetzt! 🔄');
    }

    function copyCoordinates() {
        const data = quads.map(q => q.getData());
        const json = JSON.stringify(data, null, 2);

        navigator.clipboard.writeText(json).then(() => {
            showToast('Koordinaten kopiert! ✓');
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = json;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Koordinaten kopiert! ✓');
        });

        console.log('Perspektiv-Koordinaten:', data);
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(50px)';
        }, 2000);
    }

    // ========================================
    // EVENT LISTENER SETUP
    // ========================================

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('perspective-toggle').addEventListener('click', showEditor);
        document.getElementById('btn-copy-coords').addEventListener('click', copyCoordinates);
        document.getElementById('btn-reset-quads').addEventListener('click', resetQuads);
        document.getElementById('btn-close-editor').addEventListener('click', hideEditor);
    });

})();
