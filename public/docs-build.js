// Đọc file tài liệu (PDF / Word .docx / .txt) ngay trên trình duyệt và tách thành các đoạn có Chương / Điều / Mục.
// Cùng cách tách với dữ liệu văn bản gốc (public/docs/*.json).
(function (root) {
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
  const loaded = {};
  const loadScript = (src) => (loaded[src] ||= new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Không tải được thư viện đọc file. Kiểm tra mạng và thử lại.'));
    document.head.appendChild(s);
  }));

  // → [{ page, lines: [...] }]
  async function readPdf(file) {
    await loadScript(PDFJS + 'pdf.min.js');
    const lib = root.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const tc = await (await pdf.getPage(p)).getTextContent();
      const lines = []; let cur = '', lastY = null;
      tc.items.forEach((it) => {
        const y = Math.round(it.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 2 && cur.trim()) { lines.push(cur); cur = ''; }
        cur += it.str; if (it.hasEOL) { lines.push(cur); cur = ''; }
        lastY = y;
      });
      if (cur.trim()) lines.push(cur);
      pages.push({ page: p, lines });
    }
    return pages;
  }
  async function readDocx(file) {
    await loadScript(MAMMOTH);
    const r = await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return [{ page: 1, lines: r.value.split(/\n+/) }];
  }
  async function readTxt(file) {
    return [{ page: 1, lines: (await file.text()).split(/\r?\n/) }];
  }
  async function readFile(file) {
    const n = file.name.toLowerCase();
    if (n.endsWith('.pdf')) return readPdf(file);
    if (n.endsWith('.docx')) return readDocx(file);
    if (n.endsWith('.txt')) return readTxt(file);
    throw new Error('Chỉ hỗ trợ file .pdf, .docx hoặc .txt');
  }

  const NOISE = /^(Trang \d+ \/ \d+|\d{1,2}|CÔNG TY CỔ PHẦN( THE NEW DISTRICT)?|THE NEW DISTRICT|─+|CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM|Độc lập - Tự do - Hạnh phúc)$/;
  const START = /^(Điều \d+\.|CHƯƠNG \d+|Chương [IVXLC\d]+$|Mục \d+\.|PHỤ LỤC|Phần |[A-D]\. [A-ZĐÂÊÔƠƯ]|\d+(\.\d+)*\.\s|[a-zđ]\)\s|\(\d+\)|[•●]|- |– |STT |TT |Ví dụ|Trong đó|Ghi chú|Nơi nhận|QUYẾT ĐỊNH|QUY CHẾ|QUY ĐỊNH|ĐIỀU KHOẢN|CHÍNH SÁCH|Căn cứ|Số: )/;
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

  function toBlocks(pages) {
    const lines = [];
    pages.forEach(({ page, lines: ls }) => ls.forEach((raw) => {
      const s = String(raw).normalize('NFC').replace(/ /g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (s && !NOISE.test(s)) lines.push([s, page]);
    }));
    const paras = [];
    lines.forEach(([s, p]) => {
      const prev = paras[paras.length - 1];
      const isNew = !prev || START.test(s) || /[:;]$/.test(prev.text) || (prev.text.endsWith('.') && /^[A-ZĐÀ-Ỹ]/.test(s) && prev.text.length > 60) || prev.kind === 'head';
      if (isNew) paras.push({ text: s, page: p, kind: 'p' });
      else prev.text = (prev.text + (prev.text.endsWith('-') && !prev.text.endsWith(' -') ? '' : ' ') + s).replace(/ {2}/g, ' ');
      const cur = paras[paras.length - 1];
      if (/^(CHƯƠNG \d+|Chương [IVXLC\d]+|PHỤ LỤC \d+|Phần mở đầu)$/.test(cur.text) || (/^(Mục \d+\.|Điều \d+\.)\s/.test(cur.text) && cur.text.length < 90)) cur.kind = 'head';
    });
    const out = []; let ch = '', art = '';
    for (let i = 0; i < paras.length; i++) {
      const b = paras[i], t = b.text;
      let m = t.match(/^(CHƯƠNG (\d+)|Chương ([IVXLC\d]+))$/);
      if (m) {
        const num = m[2] || ROMAN[m[3]] || m[3]; ch = `Chương ${num}`; art = '';
        let title = paras[i + 1] ? paras[i + 1].text : '';
        if (title && (title === title.toUpperCase() || title.length < 120) && !/^Điều/.test(title)) i++; else title = '';
        out.push({ t: 'h2', text: t + (title ? ` – ${title}` : ''), page: b.page, ch, art: '' });
        continue;
      }
      m = t.match(/^PHỤ LỤC (\d+)/);
      if (m) { ch = ''; art = `Phụ lục ${m[1]}`; out.push({ t: 'h2', text: t, page: b.page, ch, art }); continue; }
      m = t.match(/^(Điều|Mục) (\d+)\./);
      if (m) {
        art = `${m[1]} ${m[2]}`;
        if (b.kind === 'head' || t.length < 90) { out.push({ t: 'h3', text: t, page: b.page, ch, art }); continue; }
      }
      out.push({ t: 'p', text: t, page: b.page, ch, art });
    }
    return out.map((x, k) => ({ ...x, id: 'b' + k }));
  }

  root.TNGDocBuild = { readFile, toBlocks };
})(window);
