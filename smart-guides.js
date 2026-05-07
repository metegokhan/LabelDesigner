/**
 * LabelDesigner Pro - Smart Guides & Alignment
 * Bu dosya, objelerin birbirlerine ve duvarlara olan hizalanmasını (snapping)
 * ve sürükleme/boyutlandırma sırasında çıkan ölçüm tooltiplerini kontrol eder.
 */

// Fabric objesi eklendiğinde global değişkenleri tanımlayalım (app.js'de tanımlanıyor)
// canvas değişkeni global.

const Snapping = {
    snapThreshold: 10,  // Kaç piksel kala yapışsın
    lines: [],         // Ekranda çizili aktif yeşil/kırmızı line objeleri
    measureTexts: [],  // Ekranda çizili aktif ölçüm metni objeleri
    
    // HTML tabanlı tooltipler için ortak element
    domTooltip: null,

    init() {
        // Tooltip DOM elementini yarat (Performans & textBaseline bug çözümü)
        this.domTooltip = document.createElement('div');
        this.domTooltip.style.position = 'absolute';
        this.domTooltip.style.pointerEvents = 'none';
        this.domTooltip.style.zIndex = '1000';
        this.domTooltip.style.borderRadius = '4px';
        this.domTooltip.style.padding = '4px 8px';
        this.domTooltip.style.fontSize = '12px';
        this.domTooltip.style.color = '#fff';
        this.domTooltip.style.fontWeight = 'bold';
        this.domTooltip.style.display = 'none';
        this.domTooltip.style.whiteSpace = 'nowrap';
        document.body.appendChild(this.domTooltip);

        // Fabric objesi eklendiğinde global değişkenleri tanımlayalım (app.js'de tanımlanıyor)
        // canvas değişkeni global.
        setTimeout(() => {
            if (typeof canvas !== 'undefined') {
                this.bindEvents();
            }
        }, 500);
    },

    bindEvents() {
        canvas.on('object:moving', (e) => {
            this.clearGuides();
            this.handleSnapping(e.target);
            this.drawEdgeDistances(e.target);
        });

        canvas.on('object:scaling', (e) => {
            this.clearGuides();
            this.handleSizeSnapping(e.target);
            this.drawDimensionsTooltip(e.target);
        });

        canvas.on('object:rotating', (e) => {
            this.clearGuides();
            this.handleRotation(e.target);
        });

        canvas.on('mouse:up', () => {
            this.clearGuides();
        });
    },

    clearGuides() {
        this.lines.forEach(l => canvas.remove(l));
        this.measureTexts.forEach(t => canvas.remove(t));
        this.lines = [];
        this.measureTexts = [];
        
        if(this.domTooltip) {
            this.domTooltip.style.display = 'none';
        }

        // Vurgulanan paralel objeleri temize çekme
        canvas.getObjects().forEach(obj => {
            if(obj.isSnappingTarget) {
                obj.set({ opacity: 1 }); // Orjinal opasiteye dön
                obj.isSnappingTarget = false;
            }
        });
    },

    drawLine(x1, y1, x2, y2, color = 'rgba(239, 68, 68, 0.8)') { // Tailwind red-500
        const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: color,
            strokeWidth: 1,
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5]
        });
        canvas.add(line);
        this.lines.push(line);
    },

    drawTextBlob(textStr, left, top, color = '#ef4444') {
        const textToDraw = new fabric.Text(textStr, {
            left: left,
            top: top,
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            fill: '#fff',
            backgroundColor: color,
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
            padding: 4,
            textBaseline: 'top' // Tarayıcı textBaseline enum hatasını atlatmak için
        });
        canvas.add(textToDraw);
        this.measureTexts.push(textToDraw);
    },

    showDomTooltip(text, left, top, color = '#3b82f6') {
        if(!this.domTooltip || !canvas.wrapperEl) return;
        
        const rect = canvas.wrapperEl.getBoundingClientRect();
        this.domTooltip.innerHTML = text;
        this.domTooltip.style.backgroundColor = color;
        this.domTooltip.style.left = (rect.left + left) + 'px';
        this.domTooltip.style.top = (rect.top + top) + 'px';
        this.domTooltip.style.display = 'block';
    },

    highlightObject(obj) {
        if(!obj.isSnappingTarget) {
            obj.set({ opacity: 0.7 });
            obj.isSnappingTarget = true;
        }
    },

    // A) TAŞIMA (MOVING) SNAPPING
    handleSnapping(target) {
        const objRect = target.getBoundingRect();
        const objCenter = target.getCenterPoint();
        
        let snapX = false, snapY = false;

        const objects = canvas.getObjects().filter(o => 
            o !== target && !this.lines.includes(o) && !this.measureTexts.includes(o)
        );

        // Hedef objenin referans noktaları
        const left = target.left;
        const right = target.left + target.getScaledWidth();
        const centerX = target.left + (target.getScaledWidth() / 2);
        
        const top = target.top;
        const bottom = target.top + target.getScaledHeight();
        const centerY = target.top + (target.getScaledHeight() / 2);

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            const b = obj.getBoundingRect();
            const oLeft = obj.left;
            const oRight = obj.left + obj.getScaledWidth();
            const oCenterX = obj.left + (obj.getScaledWidth() / 2);
            
            const oTop = obj.top;
            const oBottom = obj.top + obj.getScaledHeight();
            const oCenterY = obj.top + (obj.getScaledHeight() / 2);

            // X Ekseni (Sol - Merkez - Sağ) hizalamalar
            if (Math.abs(left - oLeft) < this.snapThreshold && !snapX) {
                target.set('left', oLeft);
                this.drawLine(oLeft, 0, oLeft, canvas.height);
                snapX = true;
                this.highlightObject(obj);
            }
            else if (Math.abs(right - oRight) < this.snapThreshold && !snapX) {
                target.set('left', oRight - target.getScaledWidth());
                this.drawLine(oRight, 0, oRight, canvas.height);
                snapX = true;
                this.highlightObject(obj);
            }
            else if (Math.abs(centerX - oCenterX) < this.snapThreshold && !snapX) {
                target.set('left', oCenterX - (target.getScaledWidth() / 2));
                this.drawLine(oCenterX, 0, oCenterX, canvas.height, 'rgba(59, 130, 246, 0.8)'); // mavi-merkez
                snapX = true;
                this.highlightObject(obj);
            }

            // Y Ekseni (Üst - Merkez - Alt) hizalamalar
            if (Math.abs(top - oTop) < this.snapThreshold && !snapY) {
                target.set('top', oTop);
                this.drawLine(0, oTop, canvas.width, oTop);
                snapY = true;
                this.highlightObject(obj);
            }
            else if (Math.abs(bottom - oBottom) < this.snapThreshold && !snapY) {
                target.set('top', oBottom - target.getScaledHeight());
                this.drawLine(0, oBottom, canvas.width, oBottom);
                snapY = true;
                this.highlightObject(obj);
            }
            else if (Math.abs(centerY - oCenterY) < this.snapThreshold && !snapY) {
                target.set('top', oCenterY - (target.getScaledHeight() / 2));
                this.drawLine(0, oCenterY, canvas.width, oCenterY, 'rgba(59, 130, 246, 0.8)'); // mavi-merkez
                snapY = true;
                this.highlightObject(obj);
            }
            
            if (snapX && snapY) break; // İkisi de bulunduysa döngüyü bitir
        }
    },

    // Canvas kenarlarına uzaklıkları gösterir
    drawEdgeDistances(target) {
        const tr = target.getBoundingRect();
        const cw = canvas.width;
        const ch = canvas.height;

        const color = '#10b981'; // Zümrüt Yeşili (Emerald)

        // Üst mesafe (Target'ın üst ortasından canvas üstüne)
        if(tr.top > 0) {
            this.drawLine(tr.left + tr.width/2, 0, tr.left + tr.width/2, tr.top, color); 
            this.drawTextBlob(Math.round(tr.top) + 'px', tr.left + tr.width/2, tr.top / 2, color);
        }

        // Sol mesafe (Target'ın sol ortasından canvas soluna)
        if(tr.left > 0) {
            this.drawLine(0, tr.top + tr.height/2, tr.left, tr.top + tr.height/2, color);
            this.drawTextBlob(Math.round(tr.left) + 'px', tr.left / 2, tr.top + tr.height/2, color);
        }

        // Sağ mesafe (Target'ın sağ ortasından canvas sağına)
        const rightDist = cw - (tr.left + tr.width);
        if(rightDist > 0) {
            this.drawLine(tr.left + tr.width, tr.top + tr.height/2, cw, tr.top + tr.height/2, color);
            this.drawTextBlob(Math.round(rightDist) + 'px', tr.left + tr.width + rightDist/2, tr.top + tr.height/2, color);
        }

        // Alt mesafe (Target'ın alt ortasından canvas altına)
        const bottomDist = ch - (tr.top + tr.height);
        if(bottomDist > 0) {
            this.drawLine(tr.left + tr.width/2, tr.top + tr.height, tr.left + tr.width/2, ch, color); 
            this.drawTextBlob(Math.round(bottomDist) + 'px', tr.left + tr.width/2, tr.top + tr.height + bottomDist/2, color);
        }
    },

    // B) BOYUTLANDIRMA (SCALING) SNAPPING
    handleSizeSnapping(target) {
        let snapW = false, snapH = false;
        
        const w = target.getScaledWidth();
        const h = target.getScaledHeight();

        const objects = canvas.getObjects().filter(o => 
            o !== target && !this.lines.includes(o) && !this.measureTexts.includes(o)
        );

        for (let obj of objects) {
            const ow = obj.getScaledWidth();
            const oh = obj.getScaledHeight();

            // Aynı Genişliğe snap
            if (Math.abs(w - ow) < this.snapThreshold && !snapW) {
                if(target.type === 'textbox') {
                    target.set('width', ow / target.scaleX);
                } else {
                    target.scaleToWidth(ow);
                }
                snapW = true;
                this.highlightObject(obj);
                
                // Genişlik hizalama çizgisi (Objenin altından altlı üstlü çizgi gösterelim, çok karmaşıklaştırmadan)
                this.drawLine(obj.left, obj.top + oh + 10, obj.left + ow, obj.top + oh + 10, '#f59e0b');
            }

            // Aynı Yüksekliğe snap
            if (Math.abs(h - oh) < this.snapThreshold && !snapH) {
                target.scaleToHeight(oh);
                snapH = true;
                this.highlightObject(obj);
            }
            if(snapW && snapH) break;
        }
    },

    drawDimensionsTooltip(target) {
        const w = Math.round(target.getScaledWidth());
        const h = Math.round(target.getScaledHeight());
        const tr = target.getBoundingRect();
        
        // HTML bazlı, canvas'a yük bindirmeyen asistan toolip
        this.showDomTooltip(`${w} x ${h}`, tr.left + tr.width + 10, tr.top + tr.height + 10, '#3b82f6');
    },

    // C) DÖNDÜRME (ROTATION) SNAPPING
    handleRotation(target) {
        let angle = target.angle % 360;
        if (angle < 0) angle += 360;

        // Popüler açılara snap (0, 45, 90, 180, 270)
        const snapAngles = [0, 45, 90, 180, 270, 360];
        let snapped = false;

        for(let sa of snapAngles) {
            if (Math.abs(angle - sa) < 5) {
                target.set('angle', sa === 360 ? 0 : sa);
                snapped = true;
                break;
            }
        }

        const tCenter = target.getCenterPoint();
        this.showDomTooltip(Math.round(target.angle) + '°', tCenter.x + 20, tCenter.y - 40, '#a855f7'); // Mor etiket HTML üzerinden

        // Paralel objeleri bul ve aydınlat
        if(snapped) {
            canvas.getObjects().forEach(obj => {
                if(obj !== target && !this.lines.includes(obj) && !this.measureTexts.includes(obj)) {
                    let oAngle = obj.angle % 360;
                    if(oAngle < 0) oAngle += 360;
                    if(Math.abs(oAngle - target.angle) < 1 || Math.abs(oAngle - (target.angle - 180)) < 1) {
                        this.highlightObject(obj);
                    }
                }
            });
        }
    }
};

Snapping.init();
