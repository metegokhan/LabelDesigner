// --- FABRIC.JS İLK KURULUM ---
const canvasElement = document.getElementById('c');
const canvas = new fabric.Canvas('c', {
  backgroundColor: '#ffffff',
  preserveObjectStacking: true
});

// JSON'a dahil edilecek özel değişkenler (Custom Properties)
const CUSTOM_PROPS = ['designerType', 'variable', 'barcodeType', 'barcodeData', 'textBehavior', 'includeText'];

let currentCanvasWidth = 400;
let currentCanvasHeight = 250;

function resizeCanvas(w, h) {
  currentCanvasWidth = parseInt(w);
  currentCanvasHeight = parseInt(h);
  canvas.setWidth(currentCanvasWidth);
  canvas.setHeight(currentCanvasHeight);
  canvas.renderAll();
}

resizeCanvas(currentCanvasWidth, currentCanvasHeight);

document.getElementById('btnResizeCanvas').addEventListener('click', () => {
  resizeCanvas(document.getElementById('canvasW').value, document.getElementById('canvasH').value);
});


// --- OBJELER ---

// 1. Metin Ekle
document.getElementById('addText').addEventListener('click', () => {
  const text = new fabric.Textbox('Örnek Metin', {
    left: 50,
    top: 50,
    width: 150,
    fontSize: 20,
    fontFamily: 'Arial',
    fill: '#000000',
    designerType: 'text',
    variable: '',
    textBehavior: 'none' // none, wrap, shrink, clip
  });
  canvas.add(text);
  canvas.setActiveObject(text);
});

// 2. Barkod (BWIP-js ile çizip Fabric Image olarak ekleme)
function createBarcodeImage(type, textInfo, includeText, callback) {
  const hiddenCanvas = document.getElementById('hiddenBarcodeCanvas');
  try {
    bwipjs.toCanvas(hiddenCanvas, {
      bcid: type,       // Barcode tip (code128, datamatrix, qrcode)
      text: textInfo,
      scale: 3,         // Yüksek çözünürlük için
      height: 10,       // dikey incelik
      includetext: includeText,
      textxalign: 'center',
    });
    const dataUrl = hiddenCanvas.toDataURL('image/png');
    fabric.Image.fromURL(dataUrl, (img) => {
      callback(img);
    });
  } catch (e) {
    console.error('Barcode render error:', e);
    alert('Barkod oluşturulamadı: ' + e);
  }
}

function addBarcode(bcType) {
  const data = (bcType === 'code128') ? '123456789' : 'https://example.com';
  const incText = (bcType === 'code128'); // Varsayılan olarak code128'de metin açık
  createBarcodeImage(bcType, data, incText, (img) => {
    img.set({
      left: 50, top: 50,
      designerType: 'barcode',
      barcodeType: bcType,
      barcodeData: data,
      includeText: incText,
      variable: '',
      lockUniScaling: false // Kenarlardan serbest boyutlandırmaya izin verir (kilitlenmeyi önler)
    });
    img.scaleToWidth(150);
    canvas.add(img);
    canvas.setActiveObject(img);
  });
}

document.getElementById('addCode128').addEventListener('click', () => addBarcode('code128'));
document.getElementById('addDatamatrix').addEventListener('click', () => addBarcode('datamatrix'));
document.getElementById('addQrCode').addEventListener('click', () => addBarcode('qrcode'));


// 3. Resim Ekle (Yerel Dosyadan)
document.getElementById('imageUpload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (f) {
    const data = f.target.result;
    fabric.Image.fromURL(data, (img) => {
      img.set({
        left: 0, top: 0,
        designerType: 'image',
        variable: ''
      });
      if (img.width > currentCanvasWidth) {
        img.scaleToWidth(currentCanvasWidth);
      }
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
});

// 4. Özel Font Yükleme (TTF/OTF)
document.getElementById('fontUpload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // Font ismini sor, çünkü JSON dosyasında yazıcının (Python'un) tanıyacağı gerçek adıyla saklanmalı
  const userFontName = prompt("Windows/Yazıcı bu fontu hangi isimle tanıyor? (Lütfen tam adını yazın, örn: Bebas Neue)\nBu alan yazıcının etiketi doğru basması için kritik!", file.name.split('.')[0]);

  if (!userFontName) return; // İptal edildi

  const reader = new FileReader();
  reader.onload = function (f) {
    const buffer = f.target.result;
    const font = new FontFace(userFontName, buffer);

    font.load().then(function (loadedFace) {
      document.fonts.add(loadedFace);

      // Datalist'e seçeneği ekle
      const option = document.createElement('option');
      option.value = userFontName;
      document.getElementById('fontList').appendChild(option);

      // Eğer ekranda seçili bir metin varsa hemen uygula
      const obj = canvas.getActiveObject();
      if (obj && obj.designerType === 'text') {
        elFontFamily.value = userFontName;
        obj.set('fontFamily', userFontName);
        canvas.renderAll();
      } else {
        alert("Font başarıyla yüklendi: " + userFontName + "\n\nMenüden (Font Ailesi) veya objeyi seçerek kullanabilirsiniz.");
      }
    }).catch(function (error) {
      alert("Font Yükleme Hatası: " + error);
    });
  };
  reader.readAsArrayBuffer(file);
});


// --- SAĞ PANEL (INSPECTOR) YÖNETİMİ ---

const noSelectionMsg = document.getElementById('noSelectionMsg');
const inspector = document.getElementById('inspector');

// DOM Elemanları
const elX = document.getElementById('propX');
const elY = document.getElementById('propY');
const elW = document.getElementById('propW');
const elH = document.getElementById('propH');
const elAngle = document.getElementById('propAngle');

const elVar = document.getElementById('propVariable');
const textProps = document.getElementById('textProps');
const elText = document.getElementById('propText');
const elFontSize = document.getElementById('propFontSize');
const elFontFamily = document.getElementById('propFontFamily');
const elOverflow = document.getElementById('propOverflow');

const btnTextBold = document.getElementById('btnTextBold');
const btnTextItalic = document.getElementById('btnTextItalic');
const btnTextUnderline = document.getElementById('btnTextUnderline');

const barcodeProps = document.getElementById('barcodeProps');
const elBarcodeVal = document.getElementById('propBarcodeVal');
const elBarcodeText = document.getElementById('propBarcodeText');

canvas.on('selection:created', updateInspector);
canvas.on('selection:updated', updateInspector);
canvas.on('selection:cleared', clearInspector);

function clearInspector() {
  noSelectionMsg.style.display = 'flex';
  inspector.style.display = 'none';
}

function updateInspector() {
  const obj = canvas.getActiveObject();
  if (!obj) return clearInspector();

  noSelectionMsg.style.display = 'none';
  inspector.style.display = 'block';

  // Transform Değerleri
  updateTransformInputs(obj);

  // Genel Değişken (Variable)
  elVar.value = obj.variable || '';

  // Bölümleri gizle
  textProps.style.display = 'none';
  barcodeProps.style.display = 'none';
  document.getElementById('imageProps').style.display = 'none';

  if (obj.designerType === 'text') {
    textProps.style.display = 'block';
    elText.value = obj.text;
    elFontSize.value = obj.fontSize;
    elFontFamily.value = obj.fontFamily;
    elOverflow.value = obj.textBehavior || 'none';

    // Stil butonları arka plan rengini duruma göre ayarla
    btnTextBold.style.backgroundColor = obj.fontWeight === 'bold' ? 'var(--primary)' : 'transparent';
    btnTextItalic.style.backgroundColor = obj.fontStyle === 'italic' ? 'var(--primary)' : 'transparent';
    btnTextUnderline.style.backgroundColor = obj.underline ? 'var(--primary)' : 'transparent';
  }
  else if (obj.designerType === 'barcode') {
    barcodeProps.style.display = 'block';
    elBarcodeVal.value = obj.barcodeData || '';
    elBarcodeText.checked = obj.includeText !== false;
  }
}

// Transform Input Senkronizasyon (Canvas -> UI)
function updateTransformInputs(obj) {
  if (!obj) return;
  elX.value = Math.round(obj.left);
  elY.value = Math.round(obj.top);
  elW.value = Math.round(obj.getScaledWidth());
  elH.value = Math.round(obj.getScaledHeight());
  elAngle.value = Math.round(obj.angle % 360);
}

// Transform eventlerini dinle (Canvas üzerinde hareket/boyut/açı)
canvas.on('object:moving', (e) => { if (e.target === canvas.getActiveObject()) updateTransformInputs(e.target); });
canvas.on('object:scaling', (e) => { 
  const obj = e.target;
  if (obj && obj.designerType === 'text') {
    // Çapraz veya alttan çekmelerde Y büyümesini font büyüklüğüne, X büyümesini kutu genişliğine çevir
    let newFontSize = obj.fontSize * obj.scaleY;
    let newWidth = obj.width * obj.scaleX;
    
    obj.set({
      fontSize: newFontSize,
      width: newWidth,
      scaleX: 1,
      scaleY: 1
    });

    // Sürükleme sırasında sağ paneldeki inputu da anlık güncelle
    if (obj === canvas.getActiveObject()) {
        const fsInput = document.getElementById('propFontSize');
        if(fsInput) fsInput.value = Math.round(newFontSize);
    }
  }
  if (obj === canvas.getActiveObject()) updateTransformInputs(obj); 
});
canvas.on('object:rotating', (e) => { if (e.target === canvas.getActiveObject()) updateTransformInputs(e.target); });

// UI -> Canvas Senkronizasyon (Manuel değer girişi)
function applyTransform() {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  obj.set({
    left: parseFloat(elX.value) || 0,
    top: parseFloat(elY.value) || 0,
    angle: parseFloat(elAngle.value) || 0
  });

  const newW = parseFloat(elW.value);
  const newH = parseFloat(elH.value);

  if (!isNaN(newW) && !isNaN(newH) && newW > 0 && newH > 0) {
    if (obj.type === 'textbox') {
      // ── YENİ: genişlik oranı kadar fontSize'ı ölçekle ──
      const oldW = obj.width || 1;
      if (Math.abs(newW - oldW) > 0.5) {          // gereksiz döngüyü önle
        const ratio = newW / oldW;
        const newFs = Math.max(6, Math.round((obj.fontSize || 20) * ratio));
        obj.set('fontSize', newFs);
        // Inspector'ı da güncelle
        elFontSize.value = newFs;
      }
      obj.set('width', newW);
    } else {
      obj.set({
        scaleX: newW / (obj.width || 1),
        scaleY: newH / (obj.height || 1)
      });
    }
  }

  canvas.renderAll();
}

['input', 'change'].forEach(evt => {
  elX.addEventListener(evt, applyTransform);
  elY.addEventListener(evt, applyTransform);
  elW.addEventListener(evt, applyTransform);
  elH.addEventListener(evt, applyTransform);
  elAngle.addEventListener(evt, applyTransform);
});


// Sağ Panel Değişikliklerini Objelere Uygulama
elVar.addEventListener('input', () => {
  const obj = canvas.getActiveObject();
  if (obj) { obj.set('variable', elVar.value); }
});

elText.addEventListener('input', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj.designerType === 'text') {
    obj.set('text', elText.value);
    canvas.renderAll();
  }
});
elFontSize.addEventListener('input', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj.designerType === 'text') {
    obj.set('fontSize', parseInt(elFontSize.value) || 20);
    canvas.renderAll();
  }
});
['input', 'change'].forEach(evt => {
  elFontFamily.addEventListener(evt, () => {
    const obj = canvas.getActiveObject();
    if (obj && obj.designerType === 'text') {
      obj.set('fontFamily', elFontFamily.value);
      canvas.renderAll();
    }
  });
});
elOverflow.addEventListener('change', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj.designerType === 'text') {
    obj.set('textBehavior', elOverflow.value);

    // Uygulama motoru (python tarafı) bunu yorumlar, biz editörde wrap destekliyorsak fabric'in wrap özelliğini açarız
    if (elOverflow.value === 'wrap') {
      // splitByGrapheme textbox'ı wrap yapmaya zorlar
      obj.set('splitByGrapheme', true);
    } else {
      obj.set('splitByGrapheme', false);
    }
    canvas.renderAll();
  }
});

// Metin Stili Butonları Fonksiyonları
btnTextBold.addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj.designerType === 'text') {
    const isBold = obj.fontWeight === 'bold';
    obj.set('fontWeight', isBold ? 'normal' : 'bold');
    btnTextBold.style.backgroundColor = !isBold ? 'var(--primary)' : 'transparent';
    canvas.renderAll();
  }
});

btnTextItalic.addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj.designerType === 'text') {
    const isItalic = obj.fontStyle === 'italic';
    obj.set('fontStyle', isItalic ? 'normal' : 'italic');
    btnTextItalic.style.backgroundColor = !isItalic ? 'var(--primary)' : 'transparent';
    canvas.renderAll();
  }
});

btnTextUnderline.addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj.designerType === 'text') {
    const isUnderline = obj.underline;
    obj.set('underline', !isUnderline);
    btnTextUnderline.style.backgroundColor = !isUnderline ? 'var(--primary)' : 'transparent';
    canvas.renderAll();
  }
});

// Barkod güncelleme butonu
document.getElementById('btnUpdateBarcode').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj && obj.designerType === 'barcode') {
    const val = elBarcodeVal.value || '1234';
    const incText = elBarcodeText.checked;
    createBarcodeImage(obj.barcodeType, val, incText, (newImg) => {
      // Eski özelliklerin kopyalanması
      const left = obj.left;
      const top = obj.top;
      const scaleX = obj.scaleX;
      const scaleY = obj.scaleY;
      const variable = obj.variable;

      canvas.remove(obj);
      newImg.set({
        left: left, top: top,
        scaleX: scaleX, scaleY: scaleY,
        designerType: 'barcode',
        barcodeType: obj.barcodeType,
        barcodeData: val,
        includeText: incText,
        variable: variable,
        lockUniScaling: false
      });
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
    });
  }
});

// Klavyeden Delete Kısayolu ile Silme
window.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Eğer o an yandaki bir inputa veri giriliyorsa objeyi silme
    const activeEl = document.activeElement;
    const isInputActive = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT';

    if (!isInputActive) {
      const obj = canvas.getActiveObject();
      if (obj) {
        // Geri gitmeyi önle (Backspace için)
        e.preventDefault();
        canvas.remove(obj);
        clearInspector();
      }
    }
  }
});

// Obje Silme (Butonla)
document.getElementById('btnDelete').addEventListener('click', () => {
  const obj = canvas.getActiveObject();
  if (obj) {
    canvas.remove(obj);
    clearInspector();
  }
});

// Yazı değiştikçe paneli de güncelle
canvas.on('text:changed', function (opt) {
  if (opt.target === canvas.getActiveObject()) {
    elText.value = opt.target.text;
  }
});


// --- EXPORT & IMPORT (Çıktı Alma Menüleri) ---

// 1. JSON Export
document.getElementById('btnExportJson').addEventListener('click', () => {
  const jsonStr = JSON.stringify(canvas.toJSON(CUSTOM_PROPS));
  const exportData = {
    canvasWidth: currentCanvasWidth,
    canvasHeight: currentCanvasHeight,
    design: JSON.parse(jsonStr)
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'etiket_sablonu.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// 2. PNG Yüksek Çözünürlüklü Resim
document.getElementById('btnExportPng').addEventListener('click', () => {
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 }); // x2 daha net
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = 'etiket_goruntusu.png';
  a.click();
});

// 3. PDF Belgesi (jsPDF ile)
document.getElementById('btnExportPdf').addEventListener('click', () => {
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
  const orientation = currentCanvasWidth > currentCanvasHeight ? 'l' : 'p';
  // Piksel olarak canvas ebatlarında özel PDF sayfası
  const pdf = new window.jspdf.jsPDF({
    orientation: orientation,
    unit: 'px',
    format: [currentCanvasWidth, currentCanvasHeight]
  });

  pdf.addImage(dataURL, 'PNG', 0, 0, currentCanvasWidth, currentCanvasHeight);
  pdf.save('etiket_belgesi.pdf');
});

// 4. HTML Çıktısı
document.getElementById('btnExportHtml').addEventListener('click', () => {
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 1 });
  const htmlDoc = `<!DOCTYPE html><html><head><title>Etiket Çıktısı</title></head>
  <body style="margin:0; background:#e2e8f0; display:flex; justify-content:center; align-items:center; height:100vh;">
      <img src="${dataURL}" style="box-shadow:0 10px 15px -3px rgba(0,0,0,0.3); border:1px solid #cbd5e1; background:#fff;">
  </body></html>`;
  const blob = new Blob([htmlDoc], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'etiket_sayfaci.html';
  a.click();
});

// 5. Test Yazdırması (CTRL+P Browser Print)
document.getElementById('btnPrintBrowser').addEventListener('click', () => {
  const dataURL = canvas.toDataURL({ format: 'png', multiplier: 1 });
  const win = window.open('');
  win.document.write(`<html><head><title>Yazdır</title>
      <style>
          @page { size: ${currentCanvasWidth}px ${currentCanvasHeight}px; margin: 0; }
          body { margin: 0; display: flex; justify-content: center; align-items: center; }
          img { width: ${currentCanvasWidth}px; height: ${currentCanvasHeight}px; }
      </style>
      </head><body><img src="${dataURL}" onload="window.print();window.close();"></body></html>`);
  win.document.close();
});

// 6. Python GDI Kod Üretici (Generator)
document.getElementById('btnGeneratePython').addEventListener('click', () => {
  const objects = canvas.getObjects();
  let code = `# ===================================================================\n`;
  code += `# LabelDesigner Pro - Otomatik Python win32ui Yazdırma Kodu\n`;
  code += `# ===================================================================\n`;
  code += `import win32ui\nimport win32con\nimport io\nimport barcode\n`;
  code += `from barcode.writer import ImageWriter\nfrom PIL import Image, ImageWin\n\n`;

  code += `def gdi_yazdir_custom(data_dict, printer_name):\n`;
  code += `    try:\n`;
  code += `        hdc = win32ui.CreateDC()\n`;
  code += `        hdc.CreatePrinterDC(printer_name)\n\n`;
  code += `        dpi_y = hdc.GetDeviceCaps(win32con.LOGPIXELSY)\n`;
  code += `        dpi_x = hdc.GetDeviceCaps(win32con.LOGPIXELSX)\n`;
  code += `        printable_width = hdc.GetDeviceCaps(win32con.HORZRES)\n`;
  code += `        printable_height = hdc.GetDeviceCaps(win32con.VERTRES)\n`;
  code += `        canvas_w = ${currentCanvasWidth}.0\n`;
  code += `        canvas_h = ${currentCanvasHeight}.0\n`;
  code += `        scale = min(printable_width / canvas_w, printable_height / canvas_h)\n`;
  code += `        scale_x = scale\n`;
  code += `        scale_y = scale\n\n`;

  code += `        # Font Yaratma Fonksiyonu\n`;
  code += `        def create_font(name, pt, weight=win32con.FW_NORMAL, italic=0, underline=0):\n`;
  code += `            return win32ui.CreateFont({\n`;
  code += `                "name": name, "height": int(-1 * (pt * scale_y)),\n`;
  code += `                "weight": weight, "italic": italic, "underline": underline\n`;
  code += `            })\n\n`;

  code += `        hdc.StartDoc("Etiket Tasarimi")\n`;
  code += `        hdc.StartPage()\n\n`;

  let fontCounter = 1;
  objects.forEach((obj) => {
    let textVar = obj.variable ? `str(data_dict.get("${obj.variable}", ""))` : null;

    if (obj.designerType === 'text') {
      const weight = obj.fontWeight === 'bold' ? 'win32con.FW_HEAVY' : 'win32con.FW_NORMAL';
      const italic = obj.fontStyle === 'italic' ? '1' : '0';
      const underline = obj.underline ? '1' : '0';
      
      const effHeight = Math.round(obj.fontSize * (obj.scaleY || 1));
      
      code += `        # --- Metin objesi ---\n`;
      code += `        fnt_${fontCounter} = create_font("${obj.fontFamily}", ${effHeight}, ${weight}, ${italic}, ${underline})\n`;
      code += `        hdc.SelectObject(fnt_${fontCounter})\n`;
      
      if (textVar) {
        code += `        # Degisken metni ekrani asarsa veya satir icerirse diye (basit textout)\n`;
        code += `        hdc.TextOut(int(${Math.round(obj.left)} * scale_x), int(${Math.round(obj.top)} * scale_y), ${textVar})\n\n`;
      } else {
        const lines = (obj.text || '').split('\n');
        let y = Math.round(obj.top);
        const lineHeightStr = obj.lineHeight || 1.16;
        const stepY = Math.round(obj.fontSize * lineHeightStr * (obj.scaleY || 1));
        
        lines.forEach(line => {
          const cleanLine = line.replace(/"/g, '\\"');
          code += `        hdc.TextOut(int(${Math.round(obj.left)} * scale_x), int(${y} * scale_y), "${cleanLine}")\n`;
          y += stepY;
        });
        code += `\n`;
      }
      fontCounter++;
    }
    else if (obj.designerType === 'barcode') {
      code += `        # --- Barkod/QR objesi ---\n`;
      let bcVarStr = obj.variable ? `str(data_dict.get("${obj.variable}", ""))` : `"${obj.barcodeData || ''}"`;
      if (obj.barcodeType === 'code128') {
        code += `        bc_val = ${bcVarStr}\n`;
        code += `        if bc_val:\n`;
        code += `            Code128 = barcode.get_barcode_class("code128")\n`;
        code += `            fp = io.BytesIO()\n`;
        code += `            Code128(bc_val, writer=ImageWriter()).write(fp, options={"write_text": ${obj.includeText ? 'True' : 'False'}, "dpi": dpi_x})\n`;
        code += `            fp.seek(0)\n`;
        code += `            img = Image.open(fp).convert("RGB")\n`;
        code += `            dib = ImageWin.Dib(img)\n`;
        code += `            bx, by = int(${Math.round(obj.left)} * scale_x), int(${Math.round(obj.top)} * scale_y)\n`;
        code += `            bw, bh = int(${Math.round(obj.getScaledWidth())} * scale_x), int(${Math.round(obj.getScaledHeight())} * scale_y)\n`;
        code += `            dib.draw(hdc.GetHandleOutput(), (bx, by, bx + bw, by + bh))\n\n`;
      } else {
        code += `        # NOT: ${obj.barcodeType} için Python tarafında uyumlu görsel üretip aynı koordinatla (X=int(${Math.round(obj.left)} * scale_x), Y=int(${Math.round(obj.top)} * scale_y)) hdc'ye basmalısınız.\n\n`;
      }
    }
  });

  code += `        hdc.EndPage()\n`;
  code += `        hdc.EndDoc()\n`;
  code += `        hdc.DeleteDC()\n`;
  code += `        return True\n\n`;
  code += `    except Exception as e:\n`;
  code += `        print("[GDI] Dosyaya basılamadı:", e)\n`;
  code += `        return False\n\n`;

  code += `# --- OTOMATİK ÇALIŞTIRMA (Test Amaçlı) ---\n`;
  code += `if __name__ == "__main__":\n`;
  code += `    import win32print\n`;
  code += `    import datetime\n`;
  code += `    try:\n`;
  code += `        default_printer = win32print.GetDefaultPrinter()\n`;
  code += `        print(f"Varsayılan yazıcıya gönderiliyor: {default_printer}")\n\n`;
  code += `        dummy_data = {\n`;
  code += `            "recete_kodu": "A1B2C3D4E5",\n`;
  code += `            "ad_soyad": "Örnek Hasta",\n`;
  code += `            "doktor": "Dr. Örnek Hekim",\n`;
  code += `            "asm": "Örnek ASM Merkezi",\n`;
  code += `            "tarih": datetime.datetime.now().strftime('%d.%m.%Y'),\n`;
  code += `            "tc": "11111111111"\n`;
  code += `        }\n`;
  code += `        \n`;
  code += `        basarili = gdi_yazdir_custom(dummy_data, default_printer)\n`;
  code += `        if basarili:\n`;
  code += `            print("Yazdırma işlemi başarıyla tamamlandı.")\n`;
  code += `    except Exception as ex:\n`;
  code += `        print("Varsayılan yazıcı bulunamadı veya yazdırma hatası:", ex)\n`;

  document.getElementById('pythonCodeArea').value = code;
  document.getElementById('pythonModal').style.display = "block";
});

// Modal İşlemleri
document.getElementById('closePythonModal').addEventListener('click', () => {
  document.getElementById('pythonModal').style.display = "none";
});
document.getElementById('btnCopyPython').addEventListener('click', () => {
  const ta = document.getElementById('pythonCodeArea');
  ta.select();
  document.execCommand('copy');
  alert("Python win32ui kod bloğu başarıyla kopyalandı!");
});
window.addEventListener('click', (event) => {
  const modal = document.getElementById('pythonModal');
  if (event.target == modal) {
    modal.style.display = "none";
  }
});

document.getElementById('btnImport').addEventListener('click', () => {
  document.getElementById('fileImport').click();
});

document.getElementById('fileImport').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (f) {
    try {
      const data = JSON.parse(f.target.result);
      if (data.canvasWidth && data.canvasHeight) {
        document.getElementById('canvasW').value = data.canvasWidth;
        document.getElementById('canvasH').value = data.canvasHeight;
        resizeCanvas(data.canvasWidth, data.canvasHeight);
      }

      const designJson = data.design || data; // geriye dönük destek

      canvas.loadFromJSON(designJson, canvas.renderAll.bind(canvas), function (o, object) {
        // Obje eklendiğinde callback
      });
    } catch (err) {
      alert("Hatalı JSON dosyası!");
    }
  };
  reader.readAsText(file);
});
