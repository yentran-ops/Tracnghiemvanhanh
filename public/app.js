(() => {
  const DEPTS = ['Vận hành', 'Kế toán', 'Membership', 'Ban phát triển'];
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const fmtD = (d) => d ? d.split('-').reverse().join('/') : '';
  const norm = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const S = { user: store.get('tng_user') || {}, quiz: null, timer: null, board: null, deptFilter: 'all' };

  async function api(path, body) {
    const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    const r = await fetch(path, opt);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Không kết nối được máy chủ.'); e.data = j; throw e; }
    return j;
  }

  function show(v) {
    if (S.quiz && !S.quiz.done && (v === 'login' || v === 'quiz')) return doShow('quiz');
    if (S.quiz && v !== 'quiz' && !S.quiz.done && !$('#view-quiz').hidden) {
      return confirmBox('Đang làm bài', 'Bạn đang trong lượt làm bài. Thời gian vẫn tiếp tục chạy nếu rời trang này.', () => { S.quiz.paused = true; doShow(v); });
    }
    doShow(v);
  }
  function doShow(v) {
    document.querySelectorAll('.view').forEach((e) => (e.hidden = e.id !== 'view-' + v));
    document.querySelectorAll('.nav [data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === v || (v === 'quiz' && b.dataset.nav === 'login') || (v === 'result' && b.dataset.nav === 'login')));
    if (v === 'board') loadBoard($('#bDate').value || undefined);
    if (v === 'login') { if (S.quiz && !S.quiz.done) return doShow('quiz'); loadMini(); }
    window.scrollTo({ top: 0 });
  }
  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-nav]');
    if (n) { e.preventDefault(); show(n.dataset.nav); }
  });

  function confirmBox(title, text, onYes, yesLabel = 'Đồng ý') {
    $('#mTitle').textContent = title; $('#mText').textContent = text; $('#mYes').textContent = yesLabel;
    $('#modal').hidden = false;
    $('#mYes').onclick = () => { $('#modal').hidden = true; onYes(); };
    $('#mNo').onclick = () => { $('#modal').hidden = true; };
  }

  // ---------- Đăng nhập ----------
  const form = $('#loginForm');
  let dept = S.user.dept || '';
  $('#deptSeg').innerHTML = DEPTS.map((d) => `<button type="button" data-d="${esc(d)}" class="${d === dept ? 'on' : ''}">${esc(d)}</button>`).join('');
  $('#deptSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    dept = b.dataset.d;
    $('#deptSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
  form.name.value = S.user.name || '';
  form.joinDate.value = S.user.joinDate || '';

  function msg(text, info) { const m = $('#loginMsg'); m.hidden = !text; m.textContent = text || ''; m.classList.toggle('info', !!info); }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg('');
    const name = form.name.value.replace(/\s+/g, ' ').trim();
    if (name.length < 2) return msg('Vui lòng nhập họ và tên.');
    if (!dept) return msg('Vui lòng chọn phòng ban.');
    const pin = form.pin.value.trim();
    if (!/^\d{4}$/.test(pin)) return msg('Mã PIN gồm đúng 4 chữ số.');
    S.user = { name, dept, joinDate: form.joinDate.value };
    store.set('tng_user', S.user);
    const btn = $('#startBtn'); btn.disabled = true; btn.textContent = 'Đang tải đề…';
    try {
      const j = await api('/api/start', { ...S.user, pin });
      form.pin.value = '';
      const saved = store.get(`tng_ans_${j.token}`);
      S.quiz = { ...j, answers: saved && saved.length === j.questions.length ? saved : Array(j.questions.length).fill(null), cur: 0, offset: j.serverNow - Date.now() };
      startQuiz();
    } catch (err) {
      msg(err.message, !!err.data?.result);
      if (err.data?.result) msg(`${err.message} Kết quả của bạn: ${err.data.result.correct}/${err.data.result.total} câu đúng (${err.data.result.score} điểm).`, true);
    } finally { btn.disabled = false; btn.textContent = 'Bắt đầu làm bài →'; }
  });

  // ---------- Làm bài ----------
  function startQuiz() {
    const q = S.quiz;
    $('#qTotal').textContent = q.questions.length;
    $('#qWho').textContent = `${S.user.name} · ${S.user.dept}`;
    $('#dots').innerHTML = q.questions.map((_, i) => `<button data-i="${i}">${i + 1}</button>`).join('');
    renderQ(); doShow('quiz');
    clearInterval(S.timer); S.timer = setInterval(tick, 500); tick();
  }
  function remaining() { const q = S.quiz; return q.timeLimit - (Date.now() + q.offset - q.startedAt) / 1000; }
  function tick() {
    if (!S.quiz || S.quiz.done) return clearInterval(S.timer);
    const r = Math.max(0, remaining());
    $('#timer').textContent = fmtT(Math.ceil(r));
    $('#timer').classList.toggle('low', r < 60);
    if (r <= 0) { clearInterval(S.timer); submit(true); }
  }
  function renderQ() {
    const q = S.quiz, it = q.questions[q.cur];
    $('#qIdx').textContent = q.cur + 1;
    $('#qTopic').textContent = it.topic;
    $('#qText').textContent = it.q;
    $('#qOpts').innerHTML = it.options.map((o, i) => `<button class="opt-btn ${q.answers[q.cur] === i ? 'sel' : ''}" data-o="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('');
    $('#prevBtn').disabled = q.cur === 0;
    $('#nextBtn').textContent = q.cur === q.questions.length - 1 ? 'Xem lại & nộp' : 'Câu tiếp →';
    const done = q.answers.filter((a) => a !== null).length;
    $('#qBar').style.width = `${(done / q.questions.length) * 100}%`;
    $('#answered').textContent = `Đã trả lời ${done}/${q.questions.length}`;
    $('#dots').querySelectorAll('button').forEach((b, i) => { b.classList.toggle('done', q.answers[i] !== null); b.classList.toggle('cur', i === q.cur); });
  }
  $('#qOpts').addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    const q = S.quiz; q.answers[q.cur] = Number(b.dataset.o);
    store.set(`tng_ans_${q.token}`, q.answers);
    renderQ();
    if (q.cur < q.questions.length - 1) setTimeout(() => { q.cur++; renderQ(); }, 220);
  });
  $('#prevBtn').onclick = () => { if (S.quiz.cur > 0) { S.quiz.cur--; renderQ(); } };
  $('#nextBtn').onclick = () => {
    const q = S.quiz;
    if (q.cur < q.questions.length - 1) { q.cur++; renderQ(); } else $('#submitBtn').scrollIntoView({ behavior: 'smooth' });
  };
  $('#dots').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { S.quiz.cur = +b.dataset.i; renderQ(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  document.addEventListener('keydown', (e) => {
    if ($('#view-quiz').hidden || !$('#modal').hidden) return;
    const k = e.key.toUpperCase();
    if ('ABCD'.includes(k) && k.length === 1) { const b = $(`#qOpts [data-o="${'ABCD'.indexOf(k)}"]`); b && b.click(); }
    if (e.key === 'ArrowRight') $('#nextBtn').click();
    if (e.key === 'ArrowLeft') $('#prevBtn').click();
  });
  $('#submitBtn').onclick = () => {
    const left = S.quiz.answers.filter((a) => a === null).length;
    confirmBox('Nộp bài?', left ? `Bạn còn ${left} câu chưa trả lời. Sau khi nộp sẽ không thể làm lại trong hôm nay.` : 'Sau khi nộp sẽ không thể làm lại trong hôm nay.', () => submit(false), 'Nộp bài');
  };

  async function submit(auto) {
    const q = S.quiz; if (!q || q.submitting) return;
    q.submitting = true; $('#submitBtn').disabled = true; $('#submitBtn').textContent = auto ? 'Hết giờ – đang nộp…' : 'Đang nộp…';
    try {
      const j = await api('/api/submit', { name: S.user.name, dept: S.user.dept, date: q.date, token: q.token, answers: q.answers });
      q.done = true; clearInterval(S.timer); store.del(`tng_ans_${q.token}`);
      renderResult(j);
    } catch (err) {
      if (err.data?.result) { q.done = true; clearInterval(S.timer); renderResult({ result: err.data.result, review: [] }); }
      else confirmBox('Không nộp được bài', err.message + ' Vui lòng kiểm tra mạng và thử lại.', () => submit(auto), 'Thử lại');
    } finally { q.submitting = false; $('#submitBtn').disabled = false; $('#submitBtn').textContent = 'Nộp bài'; }
  }

  // ---------- Kết quả ----------
  function renderResult({ result: r, rank, participants, review }) {
    const pct = r.total ? (r.correct / r.total) * 100 : 0;
    $('#ring').style.setProperty('--p', pct.toFixed(1));
    $('#rScore').textContent = r.score;
    $('#rTitle').textContent = pct >= 90 ? 'Xuất sắc! 🏆' : pct >= 70 ? 'Rất tốt! 💪' : pct >= 50 ? 'Đạt yêu cầu 👍' : 'Cần ôn tập thêm 📚';
    $('#rWho').textContent = `${r.name} · ${r.dept}`;
    $('#rCorrect').textContent = `${r.correct}/${r.total}`;
    $('#rTime').textContent = fmtT(r.duration);
    $('#rRank').textContent = rank ? `${rank}/${participants}` : '–';
    S.review = review || [];
    $('#reviewCard').hidden = !S.review.length;
    renderReview('all');
    doShow('result');
  }
  function renderReview(f) {
    $('#reviewTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.f === f));
    const list = S.review.map((x, i) => ({ ...x, n: i + 1 })).filter((x) => f === 'all' || !x.ok);
    $('#review').innerHTML = list.length ? list.map((x) => `
      <div class="rv ${x.ok ? 'ok' : 'bad'}">
        <div class="rv-h"><span class="rv-n">${x.n}</span><div><span class="chip">${esc(x.topic)}</span><div style="font-weight:600;margin-top:6px">${esc(x.q)}</div></div></div>
        <ul>${x.options.map((o, i) => `<li class="${i === x.right ? 'right' : i === x.chosen ? 'wrong' : ''}">${'ABCD'[i]}. ${esc(o)}${i === x.right ? ' ✓' : ''}</li>`).join('')}</ul>
        ${x.chosen === null ? '<div class="small" style="color:var(--bad)">Chưa trả lời</div>' : ''}
        <div class="ref">📖 ${esc(x.ref)}</div>
      </div>`).join('') : '<p class="empty">Bạn không sai câu nào. Tuyệt vời!</p>';
  }
  $('#reviewTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) renderReview(b.dataset.f); });

  // ---------- Bảng xếp hạng ----------
  function medal(i) { return `<span class="medal ${i < 3 ? 'm' + (i + 1) : ''}">${i + 1}</span>`; }
  function isMe(r) { return S.user.name && norm(r.name) === norm(S.user.name) && r.dept === S.user.dept; }

  async function loadMini() {
    try {
      const j = await api('/api/leaderboard');
      $('#intro').textContent = `Mỗi lượt gồm ${j.quizSize} câu ngẫu nhiên từ ngân hàng ${j.bankSize} câu hỏi trích nguyên văn bộ quy định khối Club và các quy chế sản phẩm. Thời gian 15 phút.`;
      const rows = j.rows;
      const avg = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
      $('#miniStats').innerHTML = `<div><small>Tham gia</small><b>${rows.length}</b></div><div><small>Điểm TB</small><b>${avg.toFixed(1)}</b></div><div><small>Cao nhất</small><b>${rows[0]?.score ?? '–'}</b></div>`;
      $('#miniBoard').innerHTML = rows.length ? rows.slice(0, 6).map((r, i) => `
        <li>${medal(i)}<div class="who"><b>${esc(r.name)}</b><small>${esc(r.dept)}</small></div><div class="sc">${r.correct}/${r.total}<small>${fmtT(r.duration)}</small></div></li>`).join('')
        : '<li class="empty" style="display:block">Chưa có ai làm bài hôm nay.<br>Hãy là người đầu tiên!</li>';
    } catch { $('#miniBoard').innerHTML = '<li class="empty" style="display:block">Không tải được bảng xếp hạng.</li>'; }
  }

  S.period = 'day';
  async function loadBoard(date) {
    try {
      const qs = new URLSearchParams({ period: S.period });
      if (date) qs.set('date', date);
      const j = await api('/api/leaderboard?' + qs);
      S.board = j;
      $('#bDate').value = j.date; $('#bDate').max = j.today;
      const rule = j.period === 'day' ? 'Xếp theo số câu đúng, bằng điểm ưu tiên thời gian nhanh hơn' : 'Cộng dồn số câu đúng của các ngày, bằng điểm ưu tiên điểm TB cao hơn rồi tổng thời gian ít hơn';
      const label = j.period === 'day' ? `${j.date === j.today ? 'Hôm nay' : 'Ngày'} ${fmtD(j.date)}`
        : j.period === 'week' ? `Tuần ${fmtD(j.from).slice(0, 5)} – ${fmtD(j.to)}` : `Tháng ${j.from.slice(5, 7)}/${j.from.slice(0, 4)}`;
      $('#bDateLabel').textContent = `${label} · ${rule}`;
      document.querySelector('.tbl').classList.toggle('hide-days', j.period === 'day');
      $('#thScore').textContent = j.period === 'day' ? 'Điểm' : 'Điểm TB';
      renderBoard();
    } catch (err) { $('#bDateLabel').textContent = err.message; }
  }
  function renderBoard() {
    const all = S.board.rows;
    const rows = S.deptFilter === 'all' ? all : all.filter((r) => r.dept === S.deptFilter);
    const n = all.length, avg = n ? all.reduce((s, r) => s + r.score, 0) / n : 0;
    const avgT = n ? all.reduce((s, r) => s + r.duration, 0) / n : 0;
    $('#bStats').innerHTML = [
      ['Lượt tham gia', n], ['Điểm trung bình', n ? avg.toFixed(1) : '–'],
      ['Điểm cao nhất', all[0]?.score ?? '–'], ['Thời gian TB', n ? fmtT(avgT) : '–'],
    ].map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');

    const top = rows.slice(0, 3);
    const order = [1, 0, 2].filter((i) => top[i]);
    $('#podium').hidden = !top.length;
    $('#podium').innerHTML = order.map((i) => `<div class="pod p${i + 1}">${medal(i)}<b>${esc(top[i].name)}</b><small>${esc(top[i].dept)}</small><div class="s">${top[i].score}</div><small>${top[i].correct}/${top[i].total} câu · ${S.board.period === 'day' ? fmtT(top[i].duration) : `${top[i].days} ngày`}</small></div>`).join('');

    $('#deptTabs').innerHTML = ['all', ...DEPTS].map((d) => `<button data-d="${esc(d)}" class="${S.deptFilter === d ? 'active' : ''}">${d === 'all' ? 'Tất cả' : esc(d)}</button>`).join('');
    $('#bRows').innerHTML = rows.map((r, i) => `<tr class="${isMe(r) ? 'me' : ''}"><td>${medal(i)}</td><td><b>${esc(r.name)}</b>${r.joinDate ? `<div class="small muted">Vào làm ${fmtD(r.joinDate)}</div>` : ''}</td><td><span class="tag">${esc(r.dept)}</span></td><td class="r col-days">${r.days || 1}</td><td class="r">${r.correct}/${r.total}</td><td class="r"><b>${r.score}</b></td><td class="r">${fmtT(r.duration)}</td></tr>`).join('');
    $('#bEmpty').hidden = rows.length > 0;

    const cls = (p) => (p >= 80 ? 'high' : p >= 60 ? 'mid' : 'low');
    const dep = DEPTS.map((d) => { const rs = all.filter((r) => r.dept === d); return { d, n: rs.length, avg: rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : 0 }; }).sort((a, b) => b.avg - a.avg);
    $('#deptBars').innerHTML = dep.map((x) => `<div><div class="bar-l"><span>${esc(x.d)} <span class="muted">· ${x.n} người</span></span><b>${x.n ? x.avg.toFixed(1) : '–'}</b></div><div class="bar ${x.n ? cls(x.avg) : ''}"><div style="width:${x.avg}%"></div></div></div>`).join('');

    const t = {};
    all.forEach((r) => Object.entries(r.topics || {}).forEach(([k, [c, tot]]) => { t[k] ||= [0, 0]; t[k][0] += c; t[k][1] += tot; }));
    const tp = Object.entries(t).map(([k, [c, tot]]) => ({ k, p: (c / tot) * 100, tot })).sort((a, b) => a.p - b.p);
    $('#topicBars').innerHTML = tp.length ? tp.map((x) => `<div><div class="bar-l"><span>${esc(x.k)}</span><b>${x.p.toFixed(0)}%</b></div><div class="bar ${cls(x.p)}"><div style="width:${x.p}%"></div></div></div>`).join('')
      : '<p class="empty">Chưa có dữ liệu.</p>';
  }
  $('#deptTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { S.deptFilter = b.dataset.d; renderBoard(); } });
  $('#bDate').addEventListener('change', (e) => loadBoard(e.target.value));
  $('#bToday').onclick = () => loadBoard();
  $('#periodTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.period = b.dataset.p;
    $('#periodTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    loadBoard($('#bDate').value || undefined);
  });
  $('#bCsv').onclick = () => {
    if (!S.board?.rows.length) return;
    const head = ['Hạng', 'Họ tên', 'Phòng ban', 'Ngày vào làm', 'Số ngày tham gia', 'Số câu đúng', 'Tổng câu', 'Điểm', 'Thời gian (giây)', 'Lần nộp gần nhất'];
    const lines = S.board.rows.map((r, i) => [i + 1, r.name, r.dept, r.joinDate ? fmtD(r.joinDate) : '', r.days || 1, r.correct, r.total, r.score, r.duration, new Date(r.at).toLocaleString('vi-VN')]);
    const csv = '﻿' + [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `TNG-xep-hang-${S.board.period}-${S.board.from}.csv`; a.click();
  };

  doShow('login');
})();
