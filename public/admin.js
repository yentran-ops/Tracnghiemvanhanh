(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = (d) => (d ? d.split('-').reverse().join('/') : '');
  let key = '';
  try { key = sessionStorage.getItem('tng_admin') || ''; } catch {}
  let bank = [], users = [];

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
    try { await loadBank(); try { sessionStorage.setItem('tng_admin', key); } catch {} enter(); }
    catch (err) { const m = $('#loginMsg'); m.hidden = false; m.textContent = err.message; }
  });
  function enter() { $('#loginView').hidden = true; $('#helpView').hidden = false; $('#adminNav').hidden = false; $('#backHome').hidden = true; tab('questions'); }
  function logout() { key = ''; try { sessionStorage.removeItem('tng_admin'); } catch {} location.reload(); }
  $('#logout').onclick = logout;
  $('#adminNav').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) tab(b.dataset.tab); });
  function tab(t) {
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    ['questions', 'users', 'results', 'board', 'settings'].forEach((x) => ($(`#tab-${x}`).hidden = t !== x));
    ({ users: loadUsers, results: loadResults, board: loadBoard, settings: loadSettings }[t] || renderBank)();
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
  let sDepts = [];
  async function loadSettings() {
    try {
      const j = await api('settings'); const f = $('#sForm');
      f.quizSize.value = j.quizSize; f.minutes.value = Math.round(j.timeLimit / 60); sDepts = [...j.depts];
      f.quizSize.max = Math.min(j.limits.quizMax, j.bankSize);
      $('#sQHint').textContent = `Ngân hàng hiện có ${j.bankSize} câu đang dùng (tối đa ${Math.min(j.limits.quizMax, j.bankSize)} câu/đề).`;
      $('#sSummary').textContent = `Hiện tại: ${j.quizSize} câu · ${Math.round(j.timeLimit / 60)} phút · ${j.depts.length} phòng ban`;
      $('#sMsg').hidden = true; renderDepts();
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
  $('#sNewDept').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#sAddDept').click(); } });
  $('#sForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    try {
      await api('saveSettings', { quizSize: f.quizSize.value, minutes: f.minutes.value, depts: sDepts });
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
    const s = $('#qSearch').value.trim().toLowerCase(), tp = sel.value, st = $('#qStatus').value;
    const list = bank.filter((q) =>
      (!tp || q.topic === tp) &&
      (!s || (q.q + ' ' + q.ref + ' ' + q.o.join(' ')).toLowerCase().includes(s)) &&
      (!st || (st === 'on' && !q.disabled) || (st === 'off' && q.disabled) || (st === 'edited' && q.edited) || (st === 'custom' && q.source === 'custom')));
    $('#qList').innerHTML = list.length ? list.map((q) => `
      <div class="qi ${q.disabled ? 'off' : ''}">
        <div>
          <span class="chip">${esc(q.topic)}</span>${q.source === 'custom' ? '<span class="badge c">Thêm mới</span>' : ''}${q.edited ? '<span class="badge e">Đã sửa</span>' : ''}${q.disabled ? '<span class="badge x">Đã tắt</span>' : ''}
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
  ['#qSearch', '#qTopic', '#qStatus'].forEach((s) => $(s).addEventListener('input', renderBank));
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
    if (q) { f.topic.value = q.topic; f.ref.value = q.ref || ''; f.q.value = q.q; q.o.forEach((o, i) => (f['o' + i].value = o)); }
    $('#qModal').hidden = false;
  }
  $('#addQ').onclick = () => openForm(null);
  $('#qmCancel').onclick = () => ($('#qModal').hidden = true);
  $('#qForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('saveQuestion', { id: editing?.id, topic: f.topic.value, ref: f.ref.value, q: f.q.value, o: [0, 1, 2, 3].map((i) => f['o' + i].value) });
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

  if (key) loadBank().then(enter).catch(() => {});
})();
