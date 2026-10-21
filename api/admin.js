import crypto from 'node:crypto';
import { QUESTIONS } from '../lib/questions.js';
import { getBank, loadEdits, saveEdits } from '../lib/bank.js';
import { getSettings, validSettings, saveSettings, LIMITS } from '../lib/settings.js';
import { getJSON, getJSONMany, setJSON, del, hdel, hset, hgetall, hincrMany, smembers, hasDb } from '../lib/store.js';
import { today, clean, rankRows, userKey, qStatIncr } from '../lib/util.js';
import { listCustomDocs, saveCustomDoc, deleteCustomDoc } from '../lib/docs-store.js';
import { listAssign, saveAssign, setAssignActive, deleteAssign } from '../lib/assign.js';

const BASE_IDS = new Set(QUESTIONS.map((q) => q.id));

function authorized(req) {
  const pass = process.env.ADMIN_PASSWORD || '';
  const given = String(req.headers['x-admin-key'] || '');
  if (!pass || !given) return false;
  const a = crypto.createHash('sha256').update(pass).digest();
  const b = crypto.createHash('sha256').update(given).digest();
  return crypto.timingSafeEqual(a, b);
}

function validQuestion(b) {
  const q = { topic: clean(b.topic), ref: clean(b.ref), q: clean(b.q), o: (b.o || []).map(clean), lv: b.lv === 'kho' ? 'kho' : 'de' };
  if (!q.topic || !q.q) return 'Vui lòng nhập chủ đề và nội dung câu hỏi.';
  if (q.o.length !== 4 || q.o.some((x) => !x)) return 'Cần đủ 4 phương án (1 đúng, 3 sai).';
  if (new Set(q.o.map((x) => x.toLowerCase())).size !== 4) return 'Các phương án không được trùng nhau.';
  return q;
}

export default async function handler(req, res) {
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'Chưa cấu hình biến môi trường ADMIN_PASSWORD trên Vercel.' });
  if (!authorized(req)) return res.status(401).json({ error: 'Sai mật khẩu quản trị.' });
  const action = req.query?.action;
  const b = req.body || {};
  try {
    if (req.method === 'GET' && action === 'bank') {
      return res.json({ questions: await getBank({ includeDisabled: true }), persistent: hasDb });
    }
    if (req.method === 'GET' && action === 'users') {
      const uks = await smembers('users');
      const d = today();
      const users = await getJSONMany(uks.map((k) => `user:${k}`));
      const sess = await getJSONMany(uks.map((k) => `sess:${d}:${k}`));
      const fails = await getJSONMany(uks.map((k) => `pinfail:${d}:${k}`));
      return res.json({
        users: uks.map((uk, i) => users[i] && ({
          uk, name: users[i].name, dept: users[i].dept, joinDate: users[i].joinDate || '', createdAt: users[i].createdAt,
          hasPin: Boolean(users[i].pinHash), today: sess[i] ? (sess[i].result ? 'done' : 'doing') : 'none', fails: fails[i] || 0,
        })).filter(Boolean).sort((x, y) => x.dept.localeCompare(y.dept) || x.name.localeCompare(y.name)),
      });
    }
    if (req.method === 'GET' && action === 'settings') {
      const [s, bank] = await Promise.all([getSettings(), getBank()]);
      const setCounts = {}, hardCounts = {};
      bank.forEach((q) => { const k = q.set || 'quytrinh'; setCounts[k] = (setCounts[k] || 0) + 1; if (q.lv === 'kho') hardCounts[k] = (hardCounts[k] || 0) + 1; });
      return res.json({ ...s, limits: LIMITS, bankSize: bank.length, setCounts, hardCounts });
    }
    if (req.method === 'GET' && action === 'assign') {
      return res.json({ list: await listAssign(), today: today() });
    }
    if (req.method === 'POST' && action === 'saveAssign') {
      const ids = new Set((await getBank()).map((q) => q.id));
      const r = await saveAssign(b, ids);
      if (typeof r === 'string') return res.status(400).json({ error: r });
      return res.json({ ok: true, list: r });
    }
    if (req.method === 'POST' && action === 'toggleAssign') {
      if (!(await setAssignActive(String(b.id || ''), b.active))) return res.status(404).json({ error: 'Không tìm thấy đề.' });
      return res.json({ ok: true });
    }
    if (req.method === 'POST' && action === 'deleteAssign') {
      if (!(await deleteAssign(String(b.id || '')))) return res.status(404).json({ error: 'Không tìm thấy đề.' });
      return res.json({ ok: true });
    }
    if (req.method === 'GET' && action === 'docs') {
      return res.json({ docs: await listCustomDocs() });
    }
    if (req.method === 'POST' && action === 'saveDoc') {
      const r = await saveCustomDoc(b);
      if (typeof r === 'string') return res.status(400).json({ error: r });
      return res.json({ ok: true, doc: r });
    }
    if (req.method === 'POST' && action === 'deleteDoc') {
      if (!(await deleteCustomDoc(String(b.id || '')))) return res.status(404).json({ error: 'Không tìm thấy tài liệu.' });
      return res.json({ ok: true });
    }
    if (req.method === 'POST' && action === 'saveSettings') {
      const s = validSettings(b);
      if (typeof s === 'string') return res.status(400).json({ error: s });
      // Không cho gỡ bộ câu hỏi còn câu hỏi
      const keep = new Set(s.sets.map((x) => x.id));
      const orphan = (await getBank({ includeDisabled: true })).filter((q) => !keep.has(q.set || 'quytrinh'));
      if (orphan.length) return res.status(400).json({ error: `Không thể gỡ bộ câu hỏi đang còn ${orphan.length} câu. Hãy chuyển các câu sang bộ khác hoặc xóa trước.` });
      await saveSettings(s);
      return res.json({ ok: true, ...s });
    }
    if (req.method === 'GET' && action === 'results') {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : today();
      const rows = rankRows(await hgetall(`lb:${d}`)).map((r) => ({ ...r, topics: undefined, uk: userKey(r.name, r.dept) }));
      return res.json({ date: d, today: today(), rows });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const e = await loadEdits();
    const setIds = new Set((await getSettings()).sets.map((x) => x.id));
    const pickSet = (v) => (setIds.has(v) ? v : null);
    switch (action) {
      case 'bulkAdd': {
        const set = pickSet(b.set);
        if (!set) return res.status(400).json({ error: 'Vui lòng chọn bộ câu hỏi.' });
        const items = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
        if (!items.length) return res.status(400).json({ error: 'Chưa có câu hỏi nào để nhập.' });
        const errs = [], ok = [];
        items.forEach((it, i) => { const q = validQuestion(it); if (typeof q === 'string') errs.push(`Dòng ${it.line || i + 1}: ${q}`); else ok.push(q); });
        if (errs.length) return res.status(400).json({ error: errs.slice(0, 8).join('\n') + (errs.length > 8 ? `\n… và ${errs.length - 8} lỗi khác` : '') });
        const t = Date.now();
        ok.forEach((q, i) => e.added.push({ id: 'c' + (t + i).toString(36), ...q, set, createdAt: t }));
        await saveEdits(e);
        return res.json({ ok: true, added: ok.length });
      }
      case 'saveQuestion': {
        const q = validQuestion(b);
        if (typeof q === 'string') return res.status(400).json({ error: q });
        const set = pickSet(b.set);
        if (b.set !== undefined && !set) return res.status(400).json({ error: 'Bộ câu hỏi không hợp lệ.' });
        if (set) q.set = set;
        if (b.id && BASE_IDS.has(b.id)) {
          e.overrides[b.id] = { ...(e.overrides[b.id] || {}), ...q };
        } else if (b.id) {
          const i = e.added.findIndex((x) => x.id === b.id);
          if (i < 0) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
          e.added[i] = { ...e.added[i], ...q };
        } else {
          e.added.push({ id: 'c' + Date.now().toString(36), set: 'quytrinh', ...q, createdAt: Date.now() });
        }
        break;
      }
      case 'toggleQuestion': {
        if (BASE_IDS.has(b.id)) e.overrides[b.id] = { ...(e.overrides[b.id] || {}), disabled: Boolean(b.disabled) };
        else { const x = e.added.find((y) => y.id === b.id); if (!x) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' }); x.disabled = Boolean(b.disabled); }
        break;
      }
      case 'restoreQuestion': {
        if (!BASE_IDS.has(b.id)) return res.status(400).json({ error: 'Chỉ khôi phục được câu hỏi gốc.' });
        delete e.overrides[b.id];
        break;
      }
      case 'deleteQuestion': {
        if (BASE_IDS.has(b.id)) return res.status(400).json({ error: 'Câu hỏi gốc không xóa được, chỉ có thể tắt.' });
        e.added = e.added.filter((x) => x.id !== b.id);
        break;
      }
      case 'resetPin': {
        const u = await getJSON(`user:${b.uk}`);
        if (!u) return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
        u.pinHash = null; u.salt = null;
        await setJSON(`user:${b.uk}`, u);
        await del(`pinfail:${today()}:${b.uk}`);
        return res.json({ ok: true });
      }
      case 'allowRetake': {
        const d = today();
        const rev = await getJSON(`rev:${d}:${b.uk}`);
        if (rev) await hincrMany(`qs:${d}`, qStatIncr(rev.review, -1));
        await del(`sess:${d}:${b.uk}`);
        await hdel(`lb:${d}`, b.uk);
        await del(`rev:${d}:${b.uk}`);
        return res.json({ ok: true });
      }
      // Xóa kết quả (1 hoặc nhiều người) của 1 ngày. Nếu là hôm nay, nhân viên được làm lại bài.
      case 'deleteResults': {
        const d = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : today();
        const uks = Array.isArray(b.uks) ? b.uks.map(String).slice(0, 500) : [];
        if (!uks.length) return res.status(400).json({ error: 'Chưa chọn kết quả cần xóa.' });
        for (const uk of uks) {
          const rev = await getJSON(`rev:${d}:${uk}`);
          if (rev) await hincrMany(`qs:${d}`, qStatIncr(rev.review, -1));
          await del(`sess:${d}:${uk}`);
          await hdel(`lb:${d}`, uk);
          await del(`rev:${d}:${uk}`);
        }
        return res.json({ ok: true, deleted: uks.length });
      }
      // Chỉnh điểm 1 kết quả: nhập lại số câu đúng, điểm tự tính lại; lưu vết điểm gốc và lý do.
      case 'editScore': {
        const d = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : today();
        const uk = String(b.uk || '');
        const r = (await hgetall(`lb:${d}`)).find((x) => userKey(x.name, x.dept) === uk);
        if (!r) return res.status(404).json({ error: 'Không tìm thấy kết quả cần chỉnh.' });
        const correct = Number(b.correct);
        if (!Number.isInteger(correct) || correct < 0 || correct > r.total) return res.status(400).json({ error: `Số câu đúng phải là số nguyên từ 0 đến ${r.total}.` });
        const next = { ...r, correct, score: Math.round((correct / r.total) * 1000) / 10 };
        delete next.edited;
        await hset(`lb:${d}`, uk, next);
        return res.json({ ok: true, result: next });
      }
      // Thêm điểm cho nhân viên chưa làm bài trong ngày (không có bài làm chi tiết, không ghi Google Sheet).
      case 'addScore': {
        const d = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : today();
        if (d > today()) return res.status(400).json({ error: 'Không thể thêm điểm cho ngày trong tương lai.' });
        const uk = String(b.uk || '');
        const u = await getJSON(`user:${uk}`);
        if (!u) return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
        if ((await hgetall(`lb:${d}`)).some((x) => userKey(x.name, x.dept) === uk)) return res.status(409).json({ error: 'Nhân viên này đã có kết quả trong ngày – hãy sửa điểm ở danh sách bên dưới.' });
        const total = Number(b.total), correct = Number(b.correct), duration = Number(b.duration);
        if (!Number.isInteger(total) || total < 1 || total > 200) return res.status(400).json({ error: 'Tổng số câu phải từ 1 đến 200.' });
        if (!Number.isInteger(correct) || correct < 0 || correct > total) return res.status(400).json({ error: `Số câu đúng phải từ 0 đến ${total}.` });
        if (!Number.isInteger(duration) || duration < 0 || duration > 180 * 60) return res.status(400).json({ error: 'Thời gian làm bài phải từ 0 đến 180 phút.' });
        const at = d === today() ? Date.now() : new Date(d + 'T05:00:00Z').getTime();
        const result = { name: u.name, dept: u.dept, joinDate: u.joinDate || '', correct, total, score: Math.round((correct / total) * 1000) / 10, duration, at, topics: {} };
        await hset(`lb:${d}`, uk, result);
        if (d === today()) await setJSON(`sess:${d}:${uk}`, { name: u.name, dept: u.dept, startedAt: at, items: [], result }, 60 * 60 * 48);
        return res.json({ ok: true, result });
      }
      default:
        return res.status(400).json({ error: 'Thao tác không hợp lệ.' });
    }
    await saveEdits(e);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
