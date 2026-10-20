// Tra cứu văn bản: tìm đúng đoạn trích chứa đáp án. Dùng chung cho trang làm bài và trang Tài liệu.
(function (root) {
  const cache = {};
  let indexP = null;

  const norm = (s) => String(s || '').normalize('NFC').toLowerCase()
    .replace(/[“”"'‘’«»()\[\]{}…]/g, ' ').replace(/[–—]/g, '-').replace(/[.,;:!?]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set('và của các cho với là được không có trong theo khi này đó một những thì đã sẽ bị tại từ đến hoặc nào gì bao nhiêu như thế ai đâu sau trước về lại cũng phải nhân viên hội công ty'.split(' '));
  const tokens = (s) => norm(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w));

  function loadIndex() {
    if (!indexP) indexP = fetch('/docs/index.json').then((r) => r.json());
    return indexP;
  }
  function loadDoc(id) {
    if (!cache[id]) cache[id] = fetch(`/docs/${id}.json`).then((r) => { if (!r.ok) throw new Error('Không tải được văn bản'); return r.json(); });
    return cache[id];
  }

  // "QĐ 272/2026/QĐ-TND – ... · Chương 4, Điều 10" → { docId, ch, art }
  async function parseRef(ref) {
    const idx = await loadIndex();
    const [head, tail = ''] = String(ref || '').split('·');
    const doc = idx.find((d) => head.includes(d.refKey)) || idx.find((d) => String(ref).includes(d.refKey));
    const ch = (tail.match(/Chương\s+(\d+)/) || [])[1];
    const art = tail.match(/(Điều|Mục)\s+([0-9A-Z]+)/);
    const pl = tail.match(/Phụ lục\s+(\d+)/);
    return { docId: doc && doc.id, doc, ch: ch ? `Chương ${ch}` : '', art: pl ? `Phụ lục ${pl[1]}` : art ? `${art[1]} ${art[2]}` : '' };
  }

  function score(block, ansN, ansT, qT) {
    const t = norm(block.text);
    let s = 0;
    if (ansN && t.includes(ansN)) s += 100 + Math.min(ansN.length, 60);
    const words = new Set(t.split(' '));
    ansT.forEach((w) => { if (words.has(w)) s += /\d/.test(w) ? 6 : 3; });
    qT.forEach((w) => { if (words.has(w)) s += 1; });
    // cụm 2 từ liên tiếp của đáp án
    for (let i = 0; i < ansT.length - 1; i++) if (t.includes(ansT[i] + ' ' + ansT[i + 1])) s += 4;
    if (block.t !== 'p') s *= 0.5;
    return s;
  }

  // Trả về { doc, block, blocks(đoạn lân cận), marks } hoặc null
  async function locate(ref, answer, question) {
    const r = await parseRef(ref);
    if (!r.docId) return null;
    const doc = await loadDoc(r.docId);
    let cand = doc.blocks.filter((b) => (!r.ch || b.ch === r.ch) && (!r.art || b.art === r.art));
    if (!cand.length && r.art) cand = doc.blocks.filter((b) => b.art === r.art);
    if (!cand.length) cand = doc.blocks;
    const ansN = norm(answer), ansT = tokens(answer), qT = tokens(question);
    let best = null, bs = -1;
    cand.forEach((b) => { const s = score(b, ansN, ansT, qT); if (s > bs) { bs = s; best = b; } });
    if (!best) return null;
    return { doc, block: best, section: cand, marks: markTerms(answer) };
  }

  // Các cụm cần tô sáng: nguyên văn đáp án + các con số/mốc thời gian trong đáp án
  function markTerms(answer) {
    const a = String(answer || '').trim();
    const terms = [a];
    (a.match(/\d[\d.,:/]*\s*(?:%|giờ|phút|ngày làm việc|ngày|tháng|năm|lần|điểm|đồng|buổi|m|lượt|người)?/g) || []).forEach((x) => { terms.push(x.trim()); const n = x.match(/^\d[\d.,:/]*\d|^\d/); if (n && n[0].length > 1) terms.push(n[0]); });
    a.split(/[;,()]| và | hoặc /).map((x) => x.trim()).filter((x) => x.length > 12).forEach((x) => terms.push(x));
    return [...new Set(terms)].filter((x) => x.length >= 2).sort((x, y) => y.length - x.length);
  }

  const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escR = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

  // Tô sáng (không phân biệt hoa thường), ưu tiên cụm dài nhất; chỉ tô cụm số khi không thấy nguyên văn
  function highlight(text, marks) {
    let html = escH(text);
    if (!marks || !marks.length) return html;
    const full = marks[0];
    const re0 = new RegExp(escR(escH(full)), 'i');
    if (full.length > 3 && re0.test(html)) return html.replace(re0, (m) => `<mark>${m}</mark>`);
    const rest = marks.slice(1).map((m) => escR(escH(m)));
    if (!rest.length) return html;
    const re = new RegExp(`(${rest.join('|')})`, 'gi');
    return html.split(/(<[^>]+>)/).map((part) => (part.startsWith('<') ? part : part.replace(re, '<mark>$1</mark>'))).join('');
  }

  function docUrl(ref, answer, question) {
    const p = new URLSearchParams({ ref: ref || '', a: answer || '', q: question || '' });
    return `/docs.html?${p}`;
  }

  root.TNGDocs = { loadIndex, loadDoc, parseRef, locate, highlight, markTerms, docUrl, norm, escH };
  if (typeof module !== 'undefined') module.exports = root.TNGDocs;
})(typeof window !== 'undefined' ? window : globalThis);

