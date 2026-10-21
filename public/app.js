(() => {
  let DEPTS = ['Vận hành', 'Kế toán', 'Membership', 'Ban phát triển'];
  const $ = (s) => document.querySelector(s);
  const D = window.TNGDocs;
  const esc = D.escH;
  const ic = (n, c = '') => `<svg class="i ${c}"><use href="/icons.svg#${n}"/></svg>`;
  const fmtT = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const fmtD = (d) => (d ? d.split('-').reverse().join('/') : '');
  const fmtHM = (t) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const fmtDay = (d) => `${WD[new Date(d + 'T00:00:00').getDay()]}, ${fmtD(d)}`;
  const norm = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  const lvl = (p) => (p >= 80 ? 'high' : p >= 60 ? 'mid' : 'low');
  const COLORS = ['#4a9fdc', '#e8833a', '#545356', '#15a34a', '#7c5cd6', '#d6458b', '#0f9fb0'];
  function avatar(name) {
    const parts = String(name || '?').trim().split(' ');
    const ini = (parts.length > 1 ? parts[parts.length - 2][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
    let h = 0; for (const c of norm(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `<span class="avatar" style="background:${COLORS[h % COLORS.length]}">${esc(ini)}</span>`;
  }
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const S = { user: store.get('tng_user') || {}, quiz: null, timer: null, board: null, deptFilter: 'all', period: 'day', me: null, review: [] };

  async function api(path, body) {
    const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    let r;
    try { r = await fetch(path, opt); } catch { throw new Error('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Có lỗi xảy ra, vui lòng thử lại.'); e.data = j; e.status = r.status; throw e; }
    return j;
  }

  // ---------- Điều hướng ----------
  const quizActive = () => S.quiz && !S.quiz.done;
  function show(v) {
    if (quizActive() && (v === 'home' || v === 'quiz')) return doShow('quiz');
    if (quizActive() && v !== 'quiz' && !$('#view-quiz').hidden) {
      return confirmBox('Đang làm bài', 'Đồng hồ vẫn tiếp tục chạy khi bạn rời màn hình làm bài. Bấm "Làm bài" để quay lại.', () => doShow(v), 'Vẫn chuyển');
    }
    doShow(v);
  }
  function doShow(v) {
    document.querySelectorAll('.view').forEach((e) => (e.hidden = e.id !== 'view-' + v));
    const navKey = v === 'quiz' || v === 'result' ? (S.resultFromMine && v === 'result' ? 'mine' : 'home') : v;
    document.querySelectorAll('.nav [data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === navKey));
    if (v === 'board') loadBoard($('#bDate').value || undefined);
    if (v === 'home') loadMini();
    if (v === 'mine') renderMineShell();
    window.scrollTo({ top: 0 });
  }
  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-nav]');
    if (n) { e.preventDefault(); if (n.dataset.nav !== 'result') S.resultFromMine = false; show(n.dataset.nav); }
  });
  function confirmBox(title, text, onYes, yesLabel = 'Đồng ý') {
    $('#mTitle').textContent = title; $('#mText').textContent = text; $('#mYes').textContent = yesLabel;
    $('#modal').hidden = false;
    $('#mYes').onclick = () => { $('#modal').hidden = true; onYes(); };
    $('#mNo').onclick = () => { $('#modal').hidden = true; };
  }

  // ---------- Chọn phòng ban ----------
  function deptSeg(el, value, onPick) {
    el.innerHTML = DEPTS.map((d) => `<button type="button" data-d="${esc(d)}" class="${d === value ? 'on' : ''}">${esc(d)}</button>`).join('');
    el.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      onPick(b.dataset.d);
    };
  }

  // ---------- Đăng nhập & bắt đầu ----------
  const form = $('#loginForm');
  let dept = S.user.dept || '';
  deptSeg($('#deptSeg'), dept, (d) => (dept = d));
  form.name.value = S.user.name || '';
  function msg(el, text, info) { el.hidden = !text; el.innerHTML = text || ''; el.classList.toggle('info', !!info); }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg($('#loginMsg'), '');
    const name = form.name.value.replace(/\s+/g, ' ').trim();
    const pin = form.pin.value.trim();
    if (name.length < 2) return msg($('#loginMsg'), 'Vui lòng nhập họ và tên.');
    if (!dept) return msg($('#loginMsg'), 'Vui lòng chọn phòng ban.');
    if (!/^\d{4}$/.test(pin)) return msg($('#loginMsg'), 'Mã PIN gồm đúng 4 chữ số.');
    S.user = { name, dept };
    store.set('tng_user', S.user);
    const btn = $('#startBtn'); btn.disabled = true; btn.innerHTML = 'Đang tải đề…';
    try {
      const j = await api('/api/start', { ...S.user, pin });
      S.me = { name, dept, pin };
      form.pin.value = '';
      const saved = store.get(`tng_ans_${j.token}`);
      S.quiz = { ...j, answers: saved && saved.length === j.questions.length ? saved : Array(j.questions.length).fill(null), cur: 0, offset: j.serverNow - Date.now() };
      startQuiz();
    } catch (err) {
      if (err.data?.done) {
        S.me = { name, dept, pin }; form.pin.value = ''; clearLock();
        const r = err.data.result;
        msg($('#loginMsg'), `Bạn đã hoàn thành bài hôm nay: <b>${r.correct}/${r.total}</b> câu đúng (${r.score} điểm). <button type="button" class="link" id="seeToday">Xem lại bài làm ${ic('right', 'sm')}</button>`, true);
        $('#seeToday').onclick = () => openMineDetail(err.data.date);
      } else msg($('#loginMsg'), esc(err.message));
    } finally { btn.disabled = false; btn.innerHTML = `Bắt đầu làm bài${ic('right')}`; }
  });

  // ---------- Khóa Tài liệu trong lúc làm bài ----------
  const LOCK = 'tng_docs_lock';
  function setLock() {
    const q = S.quiz;
    store.set(LOCK, { token: q.token, until: q.startedAt - q.offset + (q.timeLimit + 120) * 1000 });
  }
  const clearLock = () => store.del(LOCK);
  function docsLocked() { const l = store.get(LOCK); return Boolean(l && l.until > Date.now()); }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="/docs.html"]');
    if (a && (quizActive() || docsLocked())) {
      e.preventDefault();
      confirmBox('Tài liệu đang khóa', 'Trang Tài liệu tạm khóa trong lúc bạn làm bài và sẽ mở lại ngay sau khi nộp bài.', () => quizActive() && doShow('quiz'), 'Quay lại làm bài');
    }
  }, true);

  // ---------- Làm bài ----------
  function startQuiz() {
    const q = S.quiz;
    setLock();
    $('#qTotal').textContent = q.questions.length;
    $('#qWho').innerHTML = `${esc(q.user?.name || S.user.name)}<small>${esc(q.user?.dept || S.user.dept)}${q.firstTime ? ' · PIN đã được lưu' : ''}</small>`;
    $('#dots').innerHTML = q.questions.map((_, i) => `<button data-i="${i}" aria-label="Câu ${i + 1}">${i + 1}</button>`).join('');
    renderQ(); doShow('quiz');
    clearInterval(S.timer); S.timer = setInterval(tick, 500); tick();
  }
  const remaining = () => S.quiz.timeLimit - (Date.now() + S.quiz.offset - S.quiz.startedAt) / 1000;
  function tick() {
    if (!quizActive()) return clearInterval(S.timer);
    const r = Math.max(0, remaining());
    const t = fmtT(Math.ceil(r)), low = r < 60;
    $('#timer').textContent = t;
    $('#tring').style.setProperty('--p', ((r / S.quiz.timeLimit) * 100).toFixed(2));
    $('#tring').classList.toggle('low', low);
    $('#mbTimer span').textContent = t; $('#mbTimer').classList.toggle('low', low);
    if (r <= 0) { clearInterval(S.timer); submit(true); }
  }
  function renderQ() {
    const q = S.quiz, it = q.questions[q.cur], n = q.questions.length;
    $('#qIdx').textContent = q.cur + 1;
    $('#qTopic').textContent = it.topic;
    $('#qText').textContent = it.q;
    $('#qOpts').innerHTML = it.options.map((o, i) => `<button class="opt-btn ${q.answers[q.cur] === i ? 'sel' : ''}" data-o="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('');
    $('#prevBtn').disabled = q.cur === 0;
    $('#nextBtn').innerHTML = q.cur === n - 1 ? `Nộp bài${ic('flag')}` : `Câu tiếp${ic('right')}`;
    const done = q.answers.filter((a) => a !== null).length;
    $('#qBar').style.width = `${(done / n) * 100}%`;
    $('#answered').textContent = `${done}/${n}`;
    $('#mbIdx').textContent = `Câu ${q.cur + 1}/${n}`; $('#mbDone').textContent = done;
    $('#dots').querySelectorAll('button').forEach((b, i) => { b.classList.toggle('done', q.answers[i] !== null); b.classList.toggle('cur', i === q.cur); });
    const c = $('#qcard'); c.classList.remove('fade'); void c.offsetWidth; c.classList.add('fade');
  }
  $('#qOpts').addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    const q = S.quiz; q.answers[q.cur] = Number(b.dataset.o);
    store.set(`tng_ans_${q.token}`, q.answers);
    renderQ();
    if (q.cur < q.questions.length - 1) setTimeout(() => { q.cur++; renderQ(); }, 260);
  });
  $('#prevBtn').onclick = () => { if (S.quiz.cur > 0) { S.quiz.cur--; renderQ(); } };
  $('#nextBtn').onclick = () => { const q = S.quiz; if (q.cur < q.questions.length - 1) { q.cur++; renderQ(); } else askSubmit(); };
  $('#dots').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { S.quiz.cur = +b.dataset.i; renderQ(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  document.addEventListener('keydown', (e) => {
    if ($('#view-quiz').hidden || !$('#modal').hidden || e.target.matches('input,textarea')) return;
    const k = e.key.toUpperCase();
    if (k.length === 1 && 'ABCD'.includes(k)) { const b = $(`#qOpts [data-o="${'ABCD'.indexOf(k)}"]`); b && b.click(); }
    if (e.key === 'ArrowRight') $('#nextBtn').click();
    if (e.key === 'ArrowLeft') $('#prevBtn').click();
  });
  function askSubmit() {
    const left = S.quiz.answers.filter((a) => a === null).length;
    confirmBox('Nộp bài?', left ? `Bạn còn ${left} câu chưa trả lời. Sau khi nộp sẽ không thể làm lại trong hôm nay.` : 'Bạn đã trả lời tất cả các câu. Sau khi nộp sẽ không thể làm lại trong hôm nay.', () => submit(false), 'Nộp bài');
  }
  $('#submitBtn').onclick = askSubmit;

  async function submit(auto) {
    const q = S.quiz; if (!q || q.submitting) return;
    q.submitting = true; const sb = $('#submitBtn'); sb.disabled = true; sb.textContent = auto ? 'Hết giờ – đang nộp…' : 'Đang nộp…';
    try {
      const j = await api('/api/submit', { name: S.user.name, dept: S.user.dept, date: q.date, token: q.token, answers: q.answers });
      q.done = true; clearInterval(S.timer); store.del(`tng_ans_${q.token}`); clearLock();
      S.resultFromMine = false;
      renderResult({ ...j, date: q.date });
    } catch (err) {
      if (err.data?.result) { q.done = true; clearInterval(S.timer); clearLock(); renderResult({ result: err.data.result, review: [], date: q.date }); }
      else confirmBox('Không nộp được bài', err.message, () => submit(auto), 'Thử lại');
    } finally { q.submitting = false; sb.disabled = false; sb.innerHTML = `${ic('flag')}Nộp bài`; }
  }

  // ---------- Kết quả & xem lại ----------
  function renderResult({ result: r, rank, participants, review, date }) {
    const pct = r.total ? (r.correct / r.total) * 100 : 0;
    const ring = $('#ring');
    ring.className = 'ring ' + (pct >= 80 ? 'good' : pct < 50 ? 'bad' : '');
    ring.style.setProperty('--p', 0);
    requestAnimationFrame(() => setTimeout(() => ring.style.setProperty('--p', pct.toFixed(1)), 50));
    $('#rScore').textContent = r.score;
    $('#rDate').textContent = date ? fmtDay(date) : '';
    $('#rTitle').textContent = pct >= 90 ? 'Xuất sắc! 🏆' : pct >= 70 ? 'Rất tốt! 💪' : pct >= 50 ? 'Đạt yêu cầu 👍' : 'Cần ôn tập thêm 📚';
    $('#rWho').textContent = `${r.name} · ${r.dept}`;
    $('#rCorrect').textContent = `${r.correct}/${r.total}`;
    $('#rTime').textContent = fmtT(r.duration);
    $('#rRank').textContent = rank ? `${rank}/${participants}` : '–';
    $('#rBack').hidden = !S.resultFromMine;
    S.review = review || [];
    $('#reviewCard').hidden = !S.review.length;
    renderReview('all');
    doShow('result');
  }
  $('#rBack').onclick = () => doShow('mine');

  function renderReview(f) {
    $('#reviewTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.f === f));
    const list = S.review.map((x, i) => ({ ...x, n: i + 1, idx: i })).filter((x) => f === 'all' || (f === 'wrong' ? !x.ok : x.ok));
    $('#review').innerHTML = list.length ? list.map((x) => `
      <div class="rv ${x.ok ? 'ok' : 'bad'}">
        <div class="rv-h"><span class="rv-n">${x.n}</span><div><span class="chip">${esc(x.topic)}</span><div class="rv-q">${esc(x.q)}</div></div></div>
        <ul>${x.options.map((o, i) => `<li class="${i === x.right ? 'right' : i === x.chosen ? 'wrong' : ''}"><span class="k">${'ABCD'[i]}.</span><span>${esc(o)}</span>${i === x.right ? ic('check', 'sm') : i === x.chosen ? ic('x', 'sm') : ''}</li>`).join('')}</ul>
        ${x.chosen === null ? `<div class="tagline" style="color:var(--bad)">Chưa trả lời</div>` : ''}
        <div class="cite" data-cite="${x.idx}"><div class="cite-h"><span>${ic('quote', 'sm')}Đang tìm đoạn trích…</span></div></div>
      </div>`).join('') : `<p class="empty">${f === 'wrong' ? 'Bạn không sai câu nào. Tuyệt vời! 🎉' : 'Không có câu nào.'}</p>`;
    list.forEach((x) => fillCite(x));
  }
  $('#reviewTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) renderReview(b.dataset.f); });

  async function fillCite(x) {
    const el = document.querySelector(`[data-cite="${x.idx}"]`); if (!el) return;
    const answer = x.options[x.right];
    const url = D.docUrl(x.ref, answer, x.q);
    try {
      const m = await D.locate(x.ref, answer, x.q);
      if (!m) throw 0;
      el.innerHTML = `
        <div class="cite-h"><span>${ic('quote', 'sm')}Trích dẫn · ${esc(m.doc.title)}</span><span class="page">${m.block.art ? esc(m.block.art) + ' · ' : ''}${m.block.page ? 'Trang ' + m.block.page : ''}</span></div>
        <div class="cite-t">${D.highlight(m.block.text, m.marks)}</div>
        <div style="margin-top:10px"><a class="link" href="${url}" target="_blank" rel="noopener">Mở văn bản gốc tại đúng đoạn này ${ic('external', 'sm')}</a></div>`;
    } catch {
      el.innerHTML = `<div class="cite-h"><span>${ic('book', 'sm')}${esc(x.ref || 'Không rõ nguồn')}</span></div><div style="margin-top:8px"><a class="link" href="${url}" target="_blank" rel="noopener">Tra cứu văn bản ${ic('external', 'sm')}</a></div>`;
    }
  }

  // ---------- Bảng xếp hạng ----------
  const medal = (i) => `<span class="medal ${i < 3 ? 'm' + (i + 1) : ''}">${i + 1}</span>`;
  const isMe = (r) => S.user.name && norm(r.name) === norm(S.user.name) && r.dept === S.user.dept;

  async function loadMini() {
    try {
      const j = await api('/api/leaderboard');
      $('#fQ').textContent = `${j.quizSize} câu`;
      $('#fT').textContent = `${Math.round(j.timeLimit / 60)} phút`;
      if (j.depts && j.depts.join('|') !== DEPTS.join('|')) {
        DEPTS = j.depts;
        deptSeg($('#deptSeg'), dept, (d) => (dept = d));
        deptSeg($('#mineDept'), mineDept, (d) => (mineDept = d));
      }
      $('#intro').textContent = `Mỗi lượt ${j.quizSize} câu ngẫu nhiên từ ngân hàng ${j.bankSize} câu, trích nguyên văn các quy trình, quy định và quy chế của The New Gym. Sau khi nộp, mỗi đáp án đều kèm đoạn trích văn bản gốc để bạn đối chiếu.`;
      const rows = j.rows, avg = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
      $('#miniStats').innerHTML = `<div><small>Tham gia</small><b>${rows.length}</b></div><div><small>Điểm TB</small><b>${rows.length ? avg.toFixed(1) : '–'}</b></div><div><small>Cao nhất</small><b>${rows[0]?.score ?? '–'}</b></div>`;
      $('#miniBoard').innerHTML = rows.length ? rows.slice(0, 5).map((r, i) => `
        <li>${medal(i)}${avatar(r.name)}<div class="who"><b>${esc(r.name)}</b><small>${esc(r.dept)}</small></div><div class="sc">${r.correct}/${r.total}<small>${fmtT(r.duration)}</small></div></li>`).join('')
        : `<li class="empty" style="display:block;border:0">Chưa có ai làm bài hôm nay.<br>Hãy là người đầu tiên! 🚀</li>`;
    } catch { $('#miniBoard').innerHTML = '<li class="empty" style="display:block;border:0">Không tải được bảng xếp hạng.</li>'; }
  }

  async function loadBoard(date) {
    try {
      const qs = new URLSearchParams({ period: S.period }); if (date) qs.set('date', date);
      const j = await api('/api/leaderboard?' + qs);
      S.board = j;
      $('#bDate').value = j.date; $('#bDate').max = j.today;
      const label = j.period === 'day' ? (j.date === j.today ? `Hôm nay, ${fmtD(j.date)}` : fmtDay(j.date))
        : j.period === 'week' ? `Tuần ${fmtD(j.from).slice(0, 5)} – ${fmtD(j.to)}` : `Tháng ${j.from.slice(5, 7)}/${j.from.slice(0, 4)}`;
      const rule = j.period === 'day' ? 'xếp theo số câu đúng, bằng điểm ưu tiên làm nhanh hơn' : 'cộng dồn số câu đúng các ngày, bằng điểm ưu tiên điểm TB cao hơn';
      $('#bDateLabel').textContent = `${label} · ${rule}`;
      document.querySelector('.tbl').classList.toggle('hide-days', j.period === 'day');
      $('#thScore').textContent = j.period === 'day' ? 'Điểm' : 'Điểm TB';
      renderBoard();
    } catch (err) { $('#bDateLabel').textContent = err.message; }
  }
  function renderBoard() {
    const all = S.board.rows, day = S.board.period === 'day';
    const rows = S.deptFilter === 'all' ? all : all.filter((r) => r.dept === S.deptFilter);
    const n = all.length, avg = n ? all.reduce((s, r) => s + r.score, 0) / n : 0;
    const avgT = n ? all.reduce((s, r) => s + r.duration / (r.days || 1), 0) / n : 0;
    $('#bStats').innerHTML = [
      ['users', '', 'Người tham gia', n], ['target', 'g', 'Điểm trung bình', n ? avg.toFixed(1) : '–'],
      ['award', 'o', 'Điểm cao nhất', all[0]?.score ?? '–'], ['clock', 'y', 'Thời gian TB/lượt', n ? fmtT(avgT) : '–'],
    ].map(([i, c, k, v]) => `<div class="stat"><span class="ico ${c}">${ic(i)}</span><div><small>${k}</small><b>${v}</b></div></div>`).join('');

    const top = rows.slice(0, 3), order = [1, 0, 2].filter((i) => top[i]);
    $('#podium').hidden = !top.length;
    $('#podium').innerHTML = order.map((i) => `<div class="pod p${i + 1}"><div style="position:relative;width:max-content;margin:0 auto">${avatar(top[i].name)}${medal(i)}</div><b>${esc(top[i].name)}</b><small>${esc(top[i].dept)}</small><div class="s">${top[i].score}</div><small>${top[i].correct}/${top[i].total} câu · ${day ? fmtT(top[i].duration) : `${top[i].days} ngày`}</small></div>`).join('');

    $('#deptTabs').innerHTML = ['all', ...DEPTS].map((d) => `<button data-d="${esc(d)}" class="${S.deptFilter === d ? 'active' : ''}">${d === 'all' ? 'Tất cả' : esc(d)}</button>`).join('');
    $('#bRows').innerHTML = rows.map((r, i) => `<tr class="${isMe(r) ? 'me' : ''}"><td>${medal(i)}</td><td><div class="namecell">${avatar(r.name)}<div><b>${esc(r.name)}</b>${r.startedAt && (r.days || 1) === 1 ? `<div class="small muted">Bắt đầu ${fmtHM(r.startedAt)}</div>` : ''}</div></div></td><td><span class="tag">${esc(r.dept)}</span></td><td class="r col-days">${r.days || 1}</td><td class="r">${r.correct}/${r.total}</td><td class="r"><b>${r.score}</b></td><td class="r">${fmtT(r.duration)}</td></tr>`).join('');
    $('#bEmpty').hidden = rows.length > 0;

    const dep = DEPTS.map((d) => { const rs = all.filter((r) => r.dept === d); return { d, n: rs.length, avg: rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : 0 }; }).sort((a, b) => b.avg - a.avg);
    $('#deptBars').innerHTML = dep.map((x) => `<div><div class="bar-l"><span>${esc(x.d)} <span class="muted">· ${x.n} người</span></span><b>${x.n ? x.avg.toFixed(1) : '–'}</b></div><div class="bar ${x.n ? lvl(x.avg) : ''}"><div style="width:${x.avg}%"></div></div></div>`).join('');
    const t = {};
    all.forEach((r) => Object.entries(r.topics || {}).forEach(([k, [c, tot]]) => { t[k] ||= [0, 0]; t[k][0] += c; t[k][1] += tot; }));
    const tp = Object.entries(t).map(([k, [c, tot]]) => ({ k, p: (c / tot) * 100 })).sort((a, b) => a.p - b.p);
    $('#topicBars').innerHTML = tp.length ? tp.map((x) => `<div><div class="bar-l"><span>${esc(x.k)}</span><b>${x.p.toFixed(0)}%</b></div><div class="bar ${lvl(x.p)}"><div style="width:${x.p}%"></div></div></div>`).join('') : '<p class="empty">Chưa có dữ liệu.</p>';

    const wr = S.board.wrong || [];
    $('#wrongList').innerHTML = wr.length ? wr.map((x, i) => `<li>
      <span class="wr-n">${i + 1}</span>
      <div class="wr-b">
        <div class="wr-top"><span class="chip">${esc(x.topic)}</span><span class="wr-s"><b>${x.w}</b> lượt sai · ${x.rate}%</span></div>
        <div class="wr-q">${esc(x.q)}</div>
        ${x.wrongPick ? `<div class="wr-a bad">✗ Hay chọn nhầm: ${esc(x.wrongPick)}</div>` : ''}
        <div class="wr-a ok">✓ Đáp án đúng: ${esc(x.answer)}</div>
        ${x.ref ? `<a class="wr-ref" href="/docs.html?ref=${encodeURIComponent(x.ref)}&a=${encodeURIComponent(x.answer)}&q=${encodeURIComponent(x.q)}">📖 ${esc(x.ref)}</a>` : ''}
        <div class="bar ${lvl(100 - x.rate)}"><div style="width:${x.rate}%"></div></div>
      </div></li>`).join('') : '<p class="empty">Chưa có dữ liệu câu sai trong khoảng thời gian này.</p>';
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
    const head = ['Hạng', 'Họ tên', 'Phòng ban', 'Giờ bắt đầu', 'Số ngày tham gia', 'Số câu đúng', 'Tổng câu', 'Điểm', 'Thời gian (giây)', 'Lần nộp gần nhất'];
    const lines = S.board.rows.map((r, i) => [i + 1, r.name, r.dept, r.startedAt ? new Date(r.startedAt).toLocaleString('vi-VN') : '', r.days || 1, r.correct, r.total, r.score, r.duration, new Date(r.at).toLocaleString('vi-VN')]);
    const csv = '﻿' + [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `TNG-xep-hang-${S.board.period}-${S.board.from}.csv`; a.click();
  };

  // ---------- Bài của tôi ----------
  let mineDept = S.user.dept || '';
  deptSeg($('#mineDept'), mineDept, (d) => (mineDept = d));
  function renderMineShell() {
    const f = $('#mineForm');
    if (!f.name.value) f.name.value = S.user.name || '';
    if (S.me) { loadMine(); return; }
    $('#mineLogin').hidden = false; $('#mineList').hidden = true;
  }
  $('#mineForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, name = f.name.value.replace(/\s+/g, ' ').trim(), pin = f.pin.value.trim();
    if (!mineDept) return msg($('#mineMsg'), 'Vui lòng chọn phòng ban.');
    S.me = { name, dept: mineDept, pin };
    const ok = await loadMine();
    if (ok) f.pin.value = '';
  });
  async function loadMine() {
    msg($('#mineMsg'), '');
    try {
      const j = await api('/api/me', S.me);
      $('#mineLogin').hidden = true; $('#mineList').hidden = false;
      $('#meAvatar').outerHTML = avatar(j.user.name).replace('class="avatar"', 'class="avatar" id="meAvatar"');
      $('#meName').textContent = j.user.name;
      $('#meDept').textContent = j.user.dept;
      const h = j.history, n = h.length;
      const avg = n ? h.reduce((s, r) => s + r.score, 0) / n : 0;
      $('#meStats').innerHTML = [
        ['calendar', '', 'Số lần làm bài', n], ['target', 'g', 'Điểm trung bình', n ? avg.toFixed(1) : '–'],
        ['award', 'o', 'Điểm cao nhất', n ? Math.max(...h.map((r) => r.score)) : '–'], ['check', 'y', 'Tổng câu đúng', h.reduce((s, r) => s + r.correct, 0)],
      ].map(([i, c, k, v]) => `<div class="stat"><span class="ico ${c}">${ic(i)}</span><div><small>${k}</small><b>${v}</b></div></div>`).join('');
      $('#meHist').innerHTML = h.map((r) => `<button class="hcard" data-date="${r.date}"><div class="top"><b>${fmtDay(r.date)}</b><span class="score-badge ${lvl(r.score)}">${r.score} điểm</span></div><div class="muted small">${ic('check', 'sm')} ${r.correct}/${r.total} câu đúng · ${ic('clock', 'sm')} ${fmtT(r.duration)}</div><span class="link">Xem lại đáp án ${ic('right', 'sm')}</span></button>`).join('');
      $('#meEmpty').hidden = n > 0;
      return true;
    } catch (err) {
      S.me = null; $('#mineLogin').hidden = false; $('#mineList').hidden = true;
      msg($('#mineMsg'), esc(err.message));
      return false;
    }
  }
  $('#meHist').addEventListener('click', (e) => { const b = e.target.closest('[data-date]'); if (b) openMineDetail(b.dataset.date); });
  $('#meLogout').onclick = () => { S.me = null; renderMineShell(); };
  async function openMineDetail(date) {
    try {
      const j = await api('/api/me', { ...S.me, date });
      S.resultFromMine = true;
      renderResult(j);
    } catch (err) { confirmBox('Không mở được bài làm', err.message, () => {}, 'Đóng'); }
  }

  doShow({ '#board': 'board', '#mine': 'mine' }[location.hash] || 'home');
  if (location.hash) history.replaceState(null, '', '/');
})();
