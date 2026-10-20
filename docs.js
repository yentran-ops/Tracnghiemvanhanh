(() => {
  const D = window.TNGDocs;
  const $ = (s) => document.querySelector(s);
  const esc = D.escH;
  const ic = (n, c = '') => `<svg class="i ${c}"><use href="/icons.svg#${n}"/></svg>`;
  const params = new URLSearchParams(location.search);
  let index = [], cur = null, hits = [], hitI = -1;

  // Liên kết sang trang chính (Xếp hạng / Bài của tôi)
  document.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', () => { try { sessionStorage.setItem('tng_go', a.dataset.go); } catch {} }));

  function renderList(filter = '') {
    const f = D.norm(filter);
    const groups = {};
    index.filter((d) => !f || D.norm(d.title + ' ' + d.file).includes(f)).forEach((d) => (groups[d.group] ||= []).push(d));
    $('#docList').innerHTML = Object.entries(groups).map(([g, list]) => `<div class="grp">${esc(g)}</div>` +
      list.map((d) => `<button class="doc-item ${cur && cur.id === d.id ? 'active' : ''}" data-id="${d.id}">${ic('file', 'sm')}<span>${esc(d.title)}</span></button>`).join('')).join('') || '<p class="empty">Không tìm thấy văn bản.</p>';
  }
  $('#docFilter').addEventListener('input', (e) => renderList(e.target.value));
  $('#docList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    $('#focusBanner').hidden = true;
    history.replaceState(null, '', `/docs.html?doc=${b.dataset.id}`);
    openDoc(b.dataset.id).then(() => window.scrollTo({ top: 0 }));
  });

  async function openDoc(id) {
    cur = await D.loadDoc(id);
    renderList($('#docFilter').value);
    $('#docGroup').textContent = cur.group;
    $('#docTitle').textContent = cur.title;
    $('#docSrc').innerHTML = `${ic('file', 'sm')} ${esc(cur.file)}<br>Nguồn: ${esc(cur.source)}${cur.pages ? ` · ${cur.pages} trang` : ''}`;
    document.title = `${cur.title} – Tài liệu`;
    let html = '', lastPage = 0;
    cur.blocks.forEach((b) => {
      if (b.page && b.page !== lastPage) { html += `<div class="pg">Trang ${b.page}</div>`; lastPage = b.page; }
      const tag = b.t === 'h2' ? 'h2' : b.t === 'h3' ? 'h3' : 'p';
      html += `<${tag} id="${b.id}" data-txt>${esc(b.text)}</${tag}>`;
    });
    $('#docBody').innerHTML = html;
    $('#toc').innerHTML = cur.blocks.filter((b) => b.t !== 'p').map((b) => `<a href="#${b.id}" class="${b.t}">${esc(b.text.length > 90 ? b.text.slice(0, 90) + '…' : b.text)}</a>`).join('') || '<p class="muted small">Văn bản không có mục lục.</p>';
    $('#docSearch').value = ''; clearHits();
  }

  // ---------- Tìm trong văn bản ----------
  function clearHits() { hits = []; hitI = -1; $('#hitCount').textContent = ''; }
  function search(q) {
    document.querySelectorAll('#docBody [data-txt]').forEach((el) => {
      const b = cur.blocks.find((x) => x.id === el.id);
      if (!el.classList.contains('focus')) el.innerHTML = esc(b.text);
    });
    clearHits();
    if (q.trim().length < 2) return;
    const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'gi');
    document.querySelectorAll('#docBody [data-txt]').forEach((el) => {
      if (el.classList.contains('focus')) return;
      const b = cur.blocks.find((x) => x.id === el.id);
      if (re.test(b.text)) { re.lastIndex = 0; el.innerHTML = esc(b.text).replace(re, (m) => `<mark class="hit">${m}</mark>`); }
      re.lastIndex = 0;
    });
    hits = [...document.querySelectorAll('#docBody mark.hit')];
    $('#hitCount').textContent = hits.length ? `${hits.length} kết quả` : 'Không có kết quả';
    if (hits.length) go(0);
  }
  function go(i) {
    if (!hits.length) return;
    hits[hitI]?.classList.remove('cur');
    hitI = (i + hits.length) % hits.length;
    hits[hitI].classList.add('cur');
    hits[hitI].scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#hitCount').textContent = `${hitI + 1}/${hits.length} kết quả`;
  }
  let t; $('#docSearch').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => search(e.target.value), 250); });
  $('#docSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(hitI + (e.shiftKey ? -1 : 1)); } });
  $('#hitNext').onclick = () => go(hitI + 1);
  $('#hitPrev').onclick = () => go(hitI - 1);
  $('#tocBtn').onclick = () => ($('#toc').hidden = !$('#toc').hidden);
  $('#toc').addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) { e.preventDefault(); document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  window.addEventListener('scroll', () => ($('#toTop').hidden = window.scrollY < 600));
  $('#toTop').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ---------- Mở đúng đoạn trích theo câu hỏi ----------
  async function focusRef(ref, a, q) {
    const m = await D.locate(ref, a, q);
    if (!m) return openDoc(index[0].id);
    await openDoc(m.doc.id);
    history.replaceState(null, '', location.href);
    const el = document.getElementById(m.block.id);
    el.classList.add('focus');
    el.innerHTML = D.highlight(m.block.text, m.marks);
    $('#focusBanner').hidden = false;
    $('#focusBanner').innerHTML = `<span class="ico">${ic('quote')}</span><div><b>${esc(q || 'Đoạn trích của đáp án')}</b><span class="small">Đáp án đúng: <span class="a">${esc(a)}</span></span><div class="small muted" style="margin-top:4px">${esc(ref)}${m.block.page ? ` · Trang ${m.block.page} trong file PDF` : ''}</div></div>`;
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  }

  // ---------- Khóa trong lúc làm bài ----------
  function getLock() { try { const l = JSON.parse(localStorage.getItem('tng_docs_lock')); return l && l.until > Date.now() ? l : null; } catch { return null; } }
  const lock = getLock();
  if (lock) {
    $('main').innerHTML = `
      <div class="card lock-card">
        <span class="ico o lock-ico">${ic('lock', 'lg')}</span>
        <h1>Tài liệu đang tạm khóa</h1>
        <p class="muted">Bạn đang trong lượt làm bài. Trang Tài liệu sẽ tự mở lại ngay sau khi bạn <b>nộp bài</b> hoặc khi hết giờ làm bài.</p>
        <div class="lock-timer">${ic('clock')} Tự mở khóa sau <b id="lockLeft"></b></div>
        <a class="btn orange big" href="/">${ic('left')}Quay lại làm bài</a>
      </div>`;
    const tick = () => {
      const l = getLock();
      if (!l) return location.reload();
      const s = Math.ceil((l.until - Date.now()) / 1000);
      $('#lockLeft').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };
    tick(); setInterval(tick, 1000);
    window.addEventListener('storage', (e) => { if (e.key === 'tng_docs_lock') tick(); });
    return;
  }

  (async () => {
    index = await D.loadIndex();
    renderList();
    if (params.get('ref')) await focusRef(params.get('ref'), params.get('a') || '', params.get('q') || '');
    else await openDoc(params.get('doc') && index.some((d) => d.id === params.get('doc')) ? params.get('doc') : index[0].id);
  })().catch((e) => { $('#docTitle').textContent = 'Không tải được tài liệu'; console.error(e); });
})();
