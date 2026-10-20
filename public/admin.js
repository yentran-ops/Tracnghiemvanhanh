(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = (d) => (d ? d.split('-').reverse().join('/') : '');
  let key = '';
  try { key = sessionStorage.getItem('tng_admin') || ''; } catch {}
  let bank = [], users = [];
  const META = { sets: [], docs: [] };
  const setName = (id) => (META.sets.find((x) => x.id === (id || 'quytrinh')) || { name: id || 'Quy trình – Quy định' }).name;
  async function loadMeta() {
    const [s, idx] = await Promise.all([api('settings'), TNGDocs.loadIndex().catch(() => [])]);
    META.sets = s.sets; META.docs = idx;
    const setOpts = META.sets.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    document.querySelectorAll('.setSel').forEach((el) => (el.innerHTML = setOpts));
    const cur = $('#qSet').value;
    $('#qSet').innerHTML = '<option value="">Tất cả bộ câu hỏi</option>' + setOpts; $('#qSet').value = cur;
    const groups = [...new Set(idx.map((x) => x.group))];
    const docOpts = groups.map((g) => `<optgroup label="${esc(g)}">${idx.filter((x) => x.group === g).map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</optgroup>`).join('');
    document.querySelectorAll('.docSel').forEach((el) => { const first = el.options[0].outerHTML; el.innerHTML = first + docOpts; });
    $('#dGroups').innerHTML = groups.map((g) => `<option value="${esc(g)}">`).join('');
  }
  // Nguồn hiển thị = tên văn bản · điều khoản
  const buildRef = (docId, art) => { const d = META.docs.find((x) => x.id === docId); const a = String(art || '').trim(); return d ? d.title + (a ? ' · ' + a : '') : a; };

  async function api(action, body) {
    const r = await fetch(`/api/admin?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) logout();
    if (!r.ok) throw new Error(j.error || 'Lỗi kết nối');
    return j;
  }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), 2200); }
  function confirmBox(title, text, onYes, yes = 'Đồng ý') {
    $('#mTitle').textContent = title; $('#mText').textContent = text; $('#mYes').textContent = yes; $('#modal').hidden = false;
    $('#mYes').onclick = () => { $('#modal').hidden = true; onYes(); };
    $('#mNo').onclick = () => ($('#modal').hidden = true);
  }

  // ---------- Đăng nhập ----------
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    key = e.target.pw.value;
    try { await loadBank(); try { sessionStorage.setItem('tng_admin', key); } catch {} await loadMeta().catch(() => {}); enter(); }
    catch (err) { const m = $('#loginMsg'); m.hidden = false; m.textContent = err.message; }
  });
  function enter() { $('#loginView').hidden = true; $('#helpView').hidden = false; $('#adminNav').hidden = false; $('#backHome').hidden = true; tab('questions'); }
  function logout() { key = ''; try { sessionStorage.removeItem('tng_admin'); } catch {} location.reload(); }
  $('#logout').onclick = logout;
  $('#adminNav').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) tab(b.dataset.tab); });
  function tab(t) {
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    ['questions', 'users', 'results', 'board', 'docs', 'settings'].forEach((x) => ($(`#tab-${x}`).hidden = t !== x));
    ({ users: loadUsers, results: loadResults, board: loadBoard, docs: loadDocs, settings: loadSettings }[t] || renderBank)();
  }

  // ---------- Xếp hạng ----------
  const ab = { period: 'day', dept: 'all', data: null };
  const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  async function loadBoard() {
    try {
      const qs = new URLSearchParams({ period: ab.period }); if ($('#abDate').value) qs.set('date', $('#abDate').value);
      const r = await fetch('/api/leaderboard?' + qs); const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Lỗi tải bảng xếp hạng');
      ab.data = j; $('#abDate').value = j.date; $('#abDate').max = j.today;
      $('#abLabel').textContent = j.period === 'day' ? `Ngày ${fmtD(j.date)}` : `${j.period === 'week' ? 'Tuần' : 'Tháng'} ${fmtD(j.from)} – ${fmtD(j.to)}`;
      renderAb();
    } catch (err) { toast(err.message); }
  }
  function renderAb() {
    const j = ab.data, all = j.rows, n = all.length;
    const rows = ab.dept === 'all' ? all : all.filter((r) => r.dept === ab.dept);
    const avg = n ? all.reduce((s, r) => s + r.score, 0) / n : 0;
    $('#abStats').innerHTML = [['Người tham gia', n], ['Điểm trung bình', n ? avg.toFixed(1) : '–'], ['Điểm cao nhất', all[0]?.score ?? '–'], ['Số câu / đề', j.quizSize]]
      .map(([k, v]) => `<div class="stat"><div><small>${k}</small><b>${v}</b></div></div>`).join('');
    const depts = [...new Set([...(j.depts || []), ...all.map((r) => r.dept)])];
    $('#abDept').innerHTML = ['all', ...depts].map((d) => `<button data-d="${esc(d)}" class="${ab.dept === d ? 'active' : ''}">${d === 'all' ? 'Tất cả' : esc(d)}</button>`).join('');
    $('#abRows').innerHTML = rows.map((r, i) => `<tr><td>${i + 1}</td><td><b>${esc(r.name)}</b>${r.joinDate ? `<div class="small muted">Vào làm ${fmtD(r.joinDate)}</div>` : ''}</td><td><span class="tag">${esc(r.dept)}</span></td><td class="r">${r.days || 1}</td><td class="r">${r.correct}/${r.total}</td><td class="r"><b>${r.score}</b></td><td class="r">${fmtT(r.duration)}</td></tr>`).join('');
    $('#abEmpty').hidden = rows.length > 0;
    $('#abDeptBars').innerHTML = depts.map((d) => { const rs = all.filter((r) => r.dept === d); const a = rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : 0; return { d, n: rs.length, a }; })
      .sort((x, y) => y.a - x.a).map((x) => `<div><div class="bar-l"><span>${esc(x.d)} <span class="muted">· ${x.n} người</span></span><b>${x.n ? x.a.toFixed(1) : '–'}</b></div><div class="bar"><div style="width:${x.a}%"></div></div></div>`).join('');
    $('#abWrong').innerHTML = (j.wrong || []).length ? j.wrong.map((w) => `<li><b>${esc(w.q)}</b><span class="meta">${w.w} lượt sai · ${w.rate}% · Đáp án: ${esc(w.answer)}</span></li>`).join('') : '<p class="empty">Chưa có dữ liệu.</p>';
  }
  $('#abPeriod').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; ab.period = b.dataset.p; $('#abPeriod').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); loadBoard(); });
  $('#abDept').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { ab.dept = b.dataset.d; renderAb(); } });
  $('#abDate').addEventListener('change', loadBoard);

  // ---------- Cài đặt ----------
  let sDepts = [], sSets = [], setCounts = {};
  async function loadSettings() {
    try {
      const j = await api('settings'); const f = $('#sForm');
      f.quizSize.value = j.quizSize; f.minutes.value = Math.round(j.timeLimit / 60); sDepts = [...j.depts]; sSets = j.sets.map((x) => ({ ...x })); setCounts = j.setCounts || {}; META.sets = j.sets;
      f.quizSize.max = Math.min(j.limits.quizMax, j.bankSize);
      $('#sQHint').textContent = `Ngân hàng hiện có ${j.bankSize} câu đang dùng (tối đa ${Math.min(j.limits.quizMax, j.bankSize)} câu/đề).`;
      $('#sSummary').textContent = `Hiện tại: ${j.quizSize} câu · ${Math.round(j.timeLimit / 60)} phút · ${j.depts.length} phòng ban`;
      $('#sMsg').hidden = true; renderDepts(); renderSets();
    } catch (err) { toast(err.message); }
  }
  function renderDepts() {
    $('#sDepts').innerHTML = sDepts.map((d, i) => `<div class="dp"><span>${esc(d)}</span><button type="button" data-i="${i}">Gỡ</button></div>`).join('');
  }
  $('#sDepts').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const d = sDepts[b.dataset.i];
    if (sDepts.length === 1) return toast('Cần giữ ít nhất 1 phòng ban');
    confirmBox(`Gỡ phòng ban "${d}"?`, 'Phòng ban này sẽ không còn để chọn khi đăng nhập làm bài (sau khi bấm Lưu cài đặt). Kết quả cũ vẫn được giữ.', () => { sDepts.splice(b.dataset.i, 1); renderDepts(); }, 'Gỡ');
  });
  $('#sAddDept').onclick = () => {
    const v = $('#sNewDept').value.replace(/\s+/g, ' ').trim();
    if (!v) return;
    if (sDepts.some((x) => x.toLowerCase() === v.toLowerCase())) return toast('Phòng ban đã có');
    sDepts.push(v); $('#sNewDept').value = ''; renderDepts();
  };
  function renderSets() {
    $('#sSets').innerHTML = sSets.map((x, i) => `<tr>
      <td><input type="checkbox" data-s="active" data-i="${i}" ${x.active ? 'checked' : ''}></td>
      <td><input data-s="name" data-i="${i}" value="${esc(x.name)}" maxlength="60" style="min-width:180px"></td>
      <td class="r">${setCounts[x.id] || 0}</td>
      <td class="r"><input type="number" min="0" max="100" data-s="count" data-i="${i}" value="${x.count || 0}" style="width:80px"></td>
      <td class="r">${x.builtin ? '<span class="muted small">Có sẵn</span>' : `<button type="button" class="btn ghost sm" data-del="${i}">Gỡ</button>`}</td></tr>`).join('');
  }
  $('#sSets').addEventListener('input', (e) => {
    const el = e.target.closest('[data-s]'); if (!el) return;
    const x = sSets[el.dataset.i], k = el.dataset.s;
    x[k] = k === 'active' ? el.checked : k === 'count' ? Math.max(0, Number(el.value) || 0) : el.value;
  });
  $('#sSets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const x = sSets[b.dataset.del];
    if (setCounts[x.id]) return toast(`Bộ "${x.name}" còn ${setCounts[x.id]} câu, hãy chuyển hoặc xóa câu trước`);
    confirmBox(`Gỡ bộ câu hỏi "${x.name}"?`, 'Bộ này sẽ bị gỡ sau khi bấm Lưu cài đặt.', () => { sSets.splice(b.dataset.del, 1); renderSets(); }, 'Gỡ');
  });
  $('#sAddSet').onclick = () => {
    const v = $('#sNewSet').value.replace(/\s+/g, ' ').trim(); if (!v) return;
    if (sSets.some((x) => x.name.toLowerCase() === v.toLowerCase())) return toast('Bộ câu hỏi đã có');
    sSets.push({ id: '', name: v, active: true, count: 0 }); $('#sNewSet').value = ''; renderSets();
    toast('Đã thêm – bấm Lưu cài đặt để tạo bộ');
  };
  $('#sNewDept').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#sAddDept').click(); } });
  $('#sForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    try {
      await api('saveSettings', { quizSize: f.quizSize.value, minutes: f.minutes.value, depts: sDepts, sets: sSets });
      toast('Đã lưu cài đặt'); loadSettings();
    } catch (err) { const m = $('#sMsg'); m.hidden = false; m.textContent = err.message; }
  });

  // ---------- Câu hỏi ----------
  async function loadBank() { const j = await api('bank'); bank = j.questions; if (!j.persistent) toast('⚠ Chưa kết nối Redis – thay đổi sẽ không được lưu lâu dài'); }
  function renderBank() {
    const topics = [...new Set(bank.map((q) => q.topic))];
    const sel = $('#qTopic'), cur = sel.value;
    sel.innerHTML = '<option value="">Tất cả chủ đề</option>' + topics.map((t) => `<option ${t === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
    $('#topicList').innerHTML = topics.map((t) => `<option value="${esc(t)}">`).join('');
    const on = bank.filter((q) => !q.disabled).length;
    $('#qSummary').textContent = `${bank.length} câu · ${on} đang dùng · ${bank.length - on} đã tắt · ${bank.filter((q) => q.source === 'custom').length} câu thêm mới`;
    const s = $('#qSearch').value.trim().toLowerCase(), tp = sel.value, st = $('#qStatus').value, qs = $('#qSet').value;
    const list = bank.filter((q) =>
      (!qs || (q.set || 'quytrinh') === qs) &&
      (!tp || q.topic === tp) &&
      (!s || (q.q + ' ' + q.ref + ' ' + q.o.join(' ')).toLowerCase().includes(s)) &&
      (!st || (st === 'on' && !q.disabled) || (st === 'off' && q.disabled) || (st === 'edited' && q.edited) || (st === 'custom' && q.source === 'custom')));
    $('#qList').innerHTML = list.length ? list.map((q) => `
      <div class="qi ${q.disabled ? 'off' : ''}">
        <div>
          <span class="badge s">${esc(setName(q.set))}</span><span class="chip">${esc(q.topic)}</span>${q.source === 'custom' ? '<span class="badge c">Thêm mới</span>' : ''}${q.edited ? '<span class="badge e">Đã sửa</span>' : ''}${q.disabled ? '<span class="badge x">Đã tắt</span>' : ''}
          <div class="qi-q">${esc(q.q)}</div>
          <div class="qi-o"><b>✓ ${esc(q.o[0])}</b><br>✗ ${q.o.slice(1).map(esc).join('<br>✗ ')}</div>
          <div class="ref" style="margin-top:6px">📖 ${esc(q.ref || '—')} · <span class="muted">${q.id}</span></div>
        </div>
        <div class="qi-act">
          <button class="btn ghost" data-a="edit" data-id="${q.id}">Sửa</button>
          <button class="btn ghost" data-a="toggle" data-id="${q.id}">${q.disabled ? 'Bật lại' : 'Tắt'}</button>
          ${q.edited ? `<button class="btn ghost" data-a="restore" data-id="${q.id}">Khôi phục gốc</button>` : ''}
          ${q.source === 'custom' ? `<button class="btn danger" data-a="delete" data-id="${q.id}">Xóa</button>` : ''}
        </div>
      </div>`).join('') : '<p class="empty">Không có câu hỏi phù hợp.</p>';
  }
  ['#qSearch', '#qTopic', '#qStatus', '#qSet'].forEach((s) => $(s).addEventListener('input', renderBank));
  $('#qList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const q = bank.find((x) => x.id === b.dataset.id);
    if (b.dataset.a === 'edit') openForm(q);
    if (b.dataset.a === 'toggle') act('toggleQuestion', { id: q.id, disabled: !q.disabled }, q.disabled ? 'Đã bật lại câu hỏi' : 'Đã tắt câu hỏi');
    if (b.dataset.a === 'restore') confirmBox('Khôi phục nội dung gốc?', 'Các chỉnh sửa của câu này sẽ bị bỏ.', () => act('restoreQuestion', { id: q.id }, 'Đã khôi phục'));
    if (b.dataset.a === 'delete') confirmBox('Xóa câu hỏi?', 'Câu hỏi thêm mới này sẽ bị xóa vĩnh viễn.', () => act('deleteQuestion', { id: q.id }, 'Đã xóa'), 'Xóa');
  });
  async function act(action, body, msg) {
    try { await api(action, body); await loadBank(); renderBank(); toast(msg); } catch (err) { toast(err.message); }
  }
  let editing = null;
  function openForm(q) {
    editing = q || null;
    const f = $('#qForm'); f.reset(); $('#qmMsg').hidden = true;
    $('#qmTitle').textContent = q ? `Sửa câu hỏi ${q.id}` : 'Thêm câu hỏi';
    f.set.value = q ? q.set || 'quytrinh' : $('#qSet').value || META.sets[0]?.id || 'quytrinh';
    if (q) {
      f.topic.value = q.topic; f.ref.value = q.ref || ''; f.q.value = q.q; q.o.forEach((o, i) => (f['o' + i].value = o));
      const [head, tail = ''] = String(q.ref || '').split('·');
      const dd = META.docs.find((x) => head.includes(x.refKey)); f.doc.value = dd ? dd.id : ''; f.art.value = tail.trim();
    }
    $('#qModal').hidden = false;
  }
  $('#qForm').doc.addEventListener('change', () => { const f = $('#qForm'); f.ref.value = buildRef(f.doc.value, f.art.value); });
  $('#qForm').art.addEventListener('input', () => { const f = $('#qForm'); if (f.doc.value) f.ref.value = buildRef(f.doc.value, f.art.value); });
  $('#addQ').onclick = () => openForm(null);
  $('#qmCancel').onclick = () => ($('#qModal').hidden = true);
  $('#qForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('saveQuestion', { id: editing?.id, set: f.set.value, topic: f.topic.value, ref: f.ref.value, q: f.q.value, o: [0, 1, 2, 3].map((i) => f['o' + i].value) });
      $('#qModal').hidden = true; await loadBank(); renderBank(); toast('Đã lưu câu hỏi');
    } catch (err) { const m = $('#qmMsg'); m.hidden = false; m.textContent = err.message; }
  });

  // ---------- Nhân viên ----------
  async function loadUsers() {
    try { users = (await api('users')).users; renderUsers(); } catch (err) { toast(err.message); }
  }
  function renderUsers() {
    const s = $('#uSearch').value.trim().toLowerCase();
    const list = users.filter((u) => !s || u.name.toLowerCase().includes(s));
    $('#uSummary').textContent = `${users.length} nhân viên · hôm nay đã làm: ${users.filter((u) => u.today === 'done').length}`;
    const stt = { done: ['done', 'Đã làm'], doing: ['doing', 'Đang làm'], none: ['none', 'Chưa làm'] };
    $('#uRows').innerHTML = list.map((u) => `<tr>
      <td><b>${esc(u.name)}</b>${!u.hasPin ? '<div class="small" style="color:#b45309">PIN đã đặt lại – chờ đặt mới</div>' : ''}${u.fails ? `<div class="small" style="color:var(--bad)">Sai PIN ${u.fails} lần hôm nay</div>` : ''}</td>
      <td><span class="tag">${esc(u.dept)}</span></td><td>${fmtD(u.joinDate)}</td>
      <td><span class="st ${stt[u.today][0]}">${stt[u.today][1]}</span></td>
      <td class="r"><button class="btn ghost sm" data-u="pin" data-k="${esc(u.uk)}">Đặt lại PIN</button> <button class="btn ghost sm" data-u="retake" data-k="${esc(u.uk)}" ${u.today === 'none' ? 'disabled' : ''}>Cho làm lại hôm nay</button></td>
    </tr>`).join('');
    $('#uEmpty').hidden = users.length > 0;
  }
  $('#uSearch').addEventListener('input', renderUsers);
  $('#uRows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-u]'); if (!b) return;
    const u = users.find((x) => x.uk === b.dataset.k);
    if (b.dataset.u === 'pin') confirmBox('Đặt lại PIN?', `${u.name} sẽ tự đặt PIN mới ở lần đăng nhập kế tiếp.`, async () => { try { await api('resetPin', { uk: u.uk }); toast('Đã đặt lại PIN'); loadUsers(); } catch (err) { toast(err.message); } });
    if (b.dataset.u === 'retake') confirmBox('Cho làm lại hôm nay?', `Kết quả hôm nay của ${u.name} sẽ bị xóa khỏi bảng xếp hạng (dòng đã ghi vào Google Sheets vẫn giữ nguyên).`, async () => { try { await api('allowRetake', { uk: u.uk }); toast('Đã cho phép làm lại'); loadUsers(); } catch (err) { toast(err.message); } });
  });

  // ---------- Kết quả ----------
  let results = [], rDay = '', rToday = '';
  const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  async function loadResults() {
    try {
      const j = await api('results' + ($('#rDate').value ? `&date=${$('#rDate').value}` : ''));
      results = j.rows; rDay = j.date; rToday = j.today; $('#rDate').value = j.date; renderResults();
    } catch (err) { toast(err.message); }
  }
  function renderResults() {
    $('#rSummary').textContent = `${fmtD(rDay)}${rDay === rToday ? ' (hôm nay)' : ''} · ${results.length} bài nộp`;
    $('#rRows').innerHTML = results.map((r, i) => `<tr>
      <td><input type="checkbox" class="rChk" value="${esc(r.uk)}"></td><td>${i + 1}</td>
      <td><b>${esc(r.name)}</b></td><td><span class="tag">${esc(r.dept)}</span></td>
      <td>${r.correct}/${r.total}</td><td>${r.score}</td><td>${fmtDur(r.duration || 0)}</td>
      <td>${new Date(r.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td></tr>`).join('');
    $('#rEmpty').hidden = results.length > 0; $('#rAll').checked = false; syncDel();
  }
  const picked = () => [...document.querySelectorAll('.rChk:checked')].map((c) => c.value);
  function syncDel() { const n = picked().length; $('#rDel').disabled = !n; $('#rDel').textContent = n ? `Xóa ${n} kết quả đã chọn` : 'Xóa kết quả đã chọn'; }
  $('#rRows').addEventListener('change', syncDel);
  $('#rAll').addEventListener('change', (e) => { document.querySelectorAll('.rChk').forEach((c) => (c.checked = e.target.checked)); syncDel(); });
  $('#rDate').addEventListener('change', loadResults);
  $('#rDel').onclick = () => {
    const uks = picked(); if (!uks.length) return;
    const note = rDay === rToday ? ' Các nhân viên này sẽ được làm lại bài hôm nay.' : '';
    confirmBox(`Xóa ${uks.length} kết quả ngày ${fmtD(rDay)}?`, `Kết quả và bài làm sẽ bị xóa khỏi bảng xếp hạng, không khôi phục được.${note} (Dòng đã ghi vào Google Sheets vẫn giữ nguyên.)`,
      async () => { try { const j = await api('deleteResults', { date: rDay, uks }); toast(`Đã xóa ${j.deleted} kết quả`); loadResults(); } catch (err) { toast(err.message); } }, 'Xóa');
  };

  // ---------- Nhập câu hỏi hàng loạt ----------
  function parseBulk() {
    const f = $('#bForm');
    return f.text.value.split(/\r?\n/).map((line, i) => ({ line, n: i + 1 })).filter((x) => x.line.trim()).map(({ line, n }) => {
      const c = line.split(line.includes('\t') && !line.includes('|') ? '\t' : '|').map((x) => x.trim());
      let ref = c[1] || '';
      // Cột 2 chỉ ghi "Điều 5" → ghép với văn bản nguồn đã chọn; ghi đầy đủ thì giữ nguyên
      if (f.doc.value && !META.docs.some((d) => ref.includes(d.refKey))) ref = buildRef(f.doc.value, ref);
      return { line: n, topic: c[0], ref, q: c[2], o: c.slice(3, 7) };
    });
  }
  function previewBulk() {
    const items = parseBulk();
    const bad = items.filter((x) => !x.topic || !x.q || x.o.length !== 4 || x.o.some((o) => !o)).map((x) => x.line);
    $('#bPreview').innerHTML = items.length ? `Đọc được <b>${items.length}</b> câu${bad.length ? ` · <span style="color:var(--bad,#c0392b)">thiếu cột ở dòng ${bad.slice(0, 10).join(', ')}${bad.length > 10 ? '…' : ''}</span>` : ' · đủ 7 cột ✓'}` : '';
  }
  $('#bulkQ').onclick = () => { const f = $('#bForm'); f.reset(); f.set.value = $('#qSet').value || META.sets[0]?.id; $('#bMsg').hidden = true; $('#bPreview').textContent = ''; $('#bFileName').textContent = ''; $('#bModal').hidden = false; };
  $('#bCancel').onclick = () => ($('#bModal').hidden = true);
  $('#bForm').text.addEventListener('input', previewBulk);
  $('#bForm').doc.addEventListener('change', previewBulk);
  $('#bForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const j = await api('bulkAdd', { set: e.target.set.value, items: parseBulk() });
      $('#bModal').hidden = true; await loadBank(); renderBank(); toast(`Đã nhập ${j.added} câu hỏi`);
    } catch (err) { const m = $('#bMsg'); m.hidden = false; m.textContent = err.message; }
  });

  // ---------- Form mẫu Excel (tải về / nhập lên) ----------
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const HEAD = ['Chủ đề', 'Điều/khoản', 'Câu hỏi', 'Đáp án ĐÚNG (chép nguyên văn)', 'Phương án sai 1', 'Phương án sai 2', 'Phương án sai 3'];
  const fileSlug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  async function downloadTemplate(docId) {
    try {
      await TNGDocBuild.loadScript(XLSX_URL);
      const X = window.XLSX, d = META.docs.find((x) => x.id === docId);
      let heads = [];
      if (d) {
        const doc = await TNGDocs.loadDoc(d.id);
        const seen = new Set();
        heads = doc.blocks.filter((b) => b.art && b.t !== 'p').filter((b) => { const k = (b.ch || '') + b.art; if (seen.has(k)) return false; seen.add(k); return true; })
          .map((b) => [[b.ch, b.art].filter(Boolean).join(', '), b.text.replace(/^(Điều|Mục) \d+\.\s*/, ''), b.page]);
      }
      const ex = heads.find((h) => /Điều|Mục/.test(h[0])) || ['Điều 1', '', 1];
      const wb = X.utils.book_new();
      const s1 = X.utils.aoa_to_sheet([HEAD,
        ['VÍ DỤ – dòng này sẽ bị bỏ qua khi nhập', ex[0], 'Mức lương cố định (N1) của MS là bao nhiêu?', '5.500.000 đồng/tháng', '6.500.000 đồng/tháng', '4.000.000 đồng/tháng', '5.000.000 đồng/tháng']]);
      s1['!cols'] = [22, 22, 50, 40, 30, 30, 30].map((w) => ({ wch: w }));
      X.utils.book_append_sheet(wb, s1, 'Cau hoi');
      const guide = [
        ['HƯỚNG DẪN SOẠN CÂU HỎI – THE NEW GYM QUIZ'], [],
        ['Tài liệu', d ? d.title : '(chưa chọn – chọn văn bản nguồn khi nhập)'],
        ['Mã trích dẫn', d ? d.refKey : ''],
        ['MA_TAI_LIEU', d ? d.id : ''], [],
        ['Cột', 'Cách điền'],
        ['Chủ đề', 'Bắt buộc. Nhóm kiến thức, VD: "Lương thưởng MS". Dùng để thống kê tỷ lệ đúng theo chủ đề.'],
        ['Điều/khoản', 'Nên điền, chép đúng như sheet "Dieu khoan": "Điều 5" hoặc "Chương 2, Điều 5" hoặc "Mục 3". Hệ thống ghép với tên tài liệu để dẫn trích đúng đoạn.'],
        ['Câu hỏi', 'Bắt buộc. Một câu hỏi rõ ràng, có duy nhất 1 đáp án đúng.'],
        ['Đáp án ĐÚNG', 'Bắt buộc, LUÔN ở cột này. Chép NGUYÊN VĂN một cụm trong tài liệu (không thêm bớt sửa từ) để được tô sáng khi xem lại bài.'],
        ['Phương án sai 1–3', 'Bắt buộc đủ 3 phương án, không trùng nhau và không trùng đáp án đúng. Nên cùng dạng với đáp án (cùng là số tiền, số ngày…).'],
        [], ['Lưu ý'],
        ['- Mỗi câu 1 dòng, bắt đầu từ dòng 3 của sheet "Cau hoi". Dòng VÍ DỤ sẽ tự bỏ qua, có thể xóa.'],
        ['- Không cần xáo trộn phương án: hệ thống tự đảo thứ tự khi phát đề.'],
        ['- Không dùng ký tự "|" trong nội dung.'],
        ['- Tối đa 500 câu mỗi lần nhập. Nếu có lỗi, hệ thống báo số dòng và không nhập câu nào cho đến khi sửa xong.'],
      ];
      const s2 = X.utils.aoa_to_sheet(guide); s2['!cols'] = [{ wch: 20 }, { wch: 110 }];
      X.utils.book_append_sheet(wb, s2, 'Huong dan');
      if (heads.length) {
        const s3 = X.utils.aoa_to_sheet([['Điều/khoản (chép vào cột B)', 'Tiêu đề', 'Trang'], ...heads]);
        s3['!cols'] = [{ wch: 26 }, { wch: 80 }, { wch: 8 }];
        X.utils.book_append_sheet(wb, s3, 'Dieu khoan');
      }
      X.writeFile(wb, `Form-cau-hoi_${fileSlug(d ? d.refKey : 'tai-lieu')}.xlsx`);
    } catch (err) { toast(err.message || 'Không tạo được form mẫu'); }
  }
  $('#bTpl').onclick = () => downloadTemplate($('#bForm').doc.value);
  $('#bFile').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      await TNGDocBuild.loadScript(XLSX_URL);
      const X = window.XLSX, wb = X.read(await file.arrayBuffer());
      const sh = wb.Sheets['Cau hoi'] || wb.Sheets[wb.SheetNames[0]];
      const rows = X.utils.sheet_to_json(sh, { header: 1, defval: '', raw: false })
        .map((r) => r.slice(0, 7).map((c) => String(c).replace(/\|/g, '/').replace(/\s+/g, ' ').trim()))
        .filter((r) => r.some(Boolean))
        .filter((r) => !(/chủ đề/i.test(r[0]) && /câu hỏi/i.test(r[2])) && !/^VÍ DỤ/i.test(r[0]));
      const g = wb.Sheets['Huong dan'] ? X.utils.sheet_to_json(wb.Sheets['Huong dan'], { header: 1, defval: '' }) : [];
      const docId = (g.find((r) => r[0] === 'MA_TAI_LIEU') || [])[1];
      const f = $('#bForm');
      if (docId && META.docs.some((x) => x.id === docId)) f.doc.value = docId;
      f.text.value = rows.map((r) => r.join(' | ')).join('\n');
      $('#bFileName').textContent = file.name; previewBulk();
    } catch (err) { const m = $('#bMsg'); m.hidden = false; m.textContent = 'Không đọc được file: ' + (err.message || ''); }
    e.target.value = '';
  });

  // ---------- Tài liệu ----------
  let docBlocks = null;
  async function loadDocs() {
    try {
      TNGDocs.resetIndex();
      await loadMeta();
      const groups = [...new Set(META.docs.map((x) => x.group))];
      $('#dList').innerHTML = groups.map((g) => `<h3 class="d-group">${esc(g)}</h3>` + META.docs.filter((x) => x.group === g).map((x) => `
        <div class="d-item"><div><b>${esc(x.title)}</b><div class="muted small">Mã trích dẫn: <code>${esc(x.refKey)}</code> · ${x.pages || 1} trang${x.custom ? ' · tải lên ' + new Date(x.at).toLocaleDateString('vi-VN') : ''}</div></div>
        <div class="d-act"><a class="btn ghost sm" href="/docs.html?doc=${encodeURIComponent(x.id)}" target="_blank">Xem</a><button class="btn ghost sm" data-tpl="${esc(x.id)}">⬇ Form mẫu</button><button class="btn ghost sm" data-dq="${esc(x.id)}">Nhập câu hỏi</button>${x.custom ? `<button class="btn danger sm" data-dd="${esc(x.id)}">Xóa</button>` : ''}</div></div>`).join('')).join('');
    } catch (err) { toast(err.message); }
  }
  $('#dList').addEventListener('click', (e) => {
    const tp = e.target.closest('[data-tpl]');
    if (tp) { downloadTemplate(tp.dataset.tpl); return; }
    const q = e.target.closest('[data-dq]');
    if (q) { $('#bulkQ').click(); $('#bForm').doc.value = q.dataset.dq; return; }
    const b = e.target.closest('[data-dd]'); if (!b) return;
    const d = META.docs.find((x) => x.id === b.dataset.dd);
    confirmBox(`Xóa tài liệu "${d.title}"?`, 'Tài liệu sẽ bị gỡ khỏi trang Tài liệu. Câu hỏi đã tạo vẫn giữ nguyên nhưng không còn hiện đoạn trích của tài liệu này. Không khôi phục được.', async () => {
      try { await api('deleteDoc', { id: d.id }); toast('Đã xóa tài liệu'); loadDocs(); } catch (err) { toast(err.message); }
    }, 'Xóa');
  });
  $('#dForm').file.addEventListener('change', async (e) => {
    const file = e.target.files[0], f = $('#dForm'); docBlocks = null; $('#dMsg').hidden = true;
    if (!file) return;
    if (!f.title.value) f.title.value = file.name.replace(/\.(pdf|docx|txt)$/i, '');
    if (!f.refKey.value) { const m = file.name.match(/(\d{3})-\d{4}-Q[ĐD]/i); if (m) f.refKey.value = `QĐ ${m[1]}`; }
    $('#dPreview').textContent = 'Đang đọc file…';
    try {
      docBlocks = TNGDocBuild.toBlocks(await TNGDocBuild.readFile(file));
      const arts = new Set(docBlocks.map((x) => x.art).filter(Boolean));
      $('#dPreview').innerHTML = docBlocks.length
        ? `Đọc được <b>${docBlocks.length}</b> đoạn, <b>${arts.size}</b> Điều/Mục, ${Math.max(...docBlocks.map((x) => x.page))} trang. Đoạn đầu: <i>${esc(docBlocks.slice(0, 2).map((x) => x.text).join(' … ').slice(0, 160))}</i>`
        : '<span style="color:var(--bad,#c0392b)">Không đọc được chữ trong file (có thể là ảnh scan).</span>';
    } catch (err) { $('#dPreview').textContent = ''; const m = $('#dMsg'); m.hidden = false; m.textContent = err.message; }
  });
  $('#dForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    if (!docBlocks || !docBlocks.length) { const m = $('#dMsg'); m.hidden = false; m.textContent = 'Chưa đọc được nội dung file. Hãy chọn lại file.'; return; }
    $('#dSave').disabled = true;
    try {
      await api('saveDoc', { title: f.title.value, refKey: f.refKey.value, group: f.group.value, file: f.file.files[0]?.name, blocks: docBlocks });
      f.reset(); docBlocks = null; $('#dPreview').textContent = ''; toast('Đã lưu tài liệu'); loadDocs();
    } catch (err) { const m = $('#dMsg'); m.hidden = false; m.textContent = err.message; }
    $('#dSave').disabled = false;
  });

  if (key) loadBank().then(() => loadMeta().catch(() => {})).then(enter).catch(() => {});
})();
