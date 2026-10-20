import crypto from 'node:crypto';
import { QUESTIONS } from '../lib/questions.js';
import { getBank, loadEdits, saveEdits } from '../lib/bank.js';
import { getJSON, getJSONMany, setJSON, del, hdel, smembers, hasDb } from '../lib/store.js';
import { today, clean } from '../lib/util.js';

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
  const q = { topic: clean(b.topic), ref: clean(b.ref), q: clean(b.q), o: (b.o || []).map(clean) };
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
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const e = await loadEdits();
    switch (action) {
      case 'saveQuestion': {
        const q = validQuestion(b);
        if (typeof q === 'string') return res.status(400).json({ error: q });
        if (b.id && BASE_IDS.has(b.id)) {
          e.overrides[b.id] = { ...(e.overrides[b.id] || {}), ...q };
        } else if (b.id) {
          const i = e.added.findIndex((x) => x.id === b.id);
          if (i < 0) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
          e.added[i] = { ...e.added[i], ...q };
        } else {
          e.added.push({ id: 'c' + Date.now().toString(36), ...q, createdAt: Date.now() });
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
        await del(`sess:${d}:${b.uk}`);
        await hdel(`lb:${d}`, b.uk);
        await del(`rev:${d}:${b.uk}`);
        return res.json({ ok: true });
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
