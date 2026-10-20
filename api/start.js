import crypto from 'node:crypto';
import { getBank } from '../lib/bank.js';
import { getJSON, setJSON, dbRequiredButMissing } from '../lib/store.js';
import { verifyUser } from '../lib/auth.js';
import { today, shuffle, publicQuestions } from '../lib/util.js';
import { getSettings } from '../lib/settings.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (dbRequiredButMissing) return res.status(503).json({ error: 'Hệ thống chưa kết nối cơ sở dữ liệu (Upstash Redis). Vui lòng báo quản trị viên.' });
  try {
    const b = req.body || {};
    const auth = await verifyUser(b, { create: true });
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const { uk, user, firstTime } = auth;
    const joinDate = /^\d{4}-\d{2}-\d{2}$/.test(b.joinDate || '') ? b.joinDate : '';
    if (joinDate && user.joinDate !== joinDate) { user.joinDate = joinDate; await setJSON(`user:${uk}`, user); }

    const cfg = await getSettings();
    const date = today();
    const now = Date.now();
    const key = `sess:${date}:${uk}`;
    let s = await getJSON(key);
    if (s?.result) {
      return res.status(409).json({ error: 'Bạn đã hoàn thành bài trắc nghiệm hôm nay. Hẹn gặp lại vào ngày mai!', result: s.result, done: true, date });
    }
    if (s && now - s.startedAt > ((s.timeLimit || cfg.timeLimit) + 120) * 1000) {
      return res.status(409).json({ error: 'Lượt làm bài hôm nay của bạn đã hết thời gian. Hẹn gặp lại vào ngày mai!' });
    }
    if (!s) {
      const bank = await getBank();
      if (!bank.length) return res.status(503).json({ error: 'Ngân hàng câu hỏi đang trống.' });
      const picked = shuffle(bank).slice(0, Math.min(cfg.quizSize, bank.length));
      const items = picked.map((q) => ({ id: q.id, topic: q.topic, ref: q.ref, q: q.q, o: q.o, perm: shuffle(q.o.map((_, i) => i)) }));
      s = { name: user.name, dept: user.dept, joinDate: joinDate || user.joinDate || '', date, token: crypto.randomUUID(), startedAt: now, timeLimit: cfg.timeLimit, items };
      await setJSON(key, s, 60 * 60 * 48);
    }
    return res.status(200).json({
      token: s.token, date, startedAt: s.startedAt, serverNow: now, timeLimit: s.timeLimit || cfg.timeLimit, firstTime,
      user: { name: user.name, dept: user.dept },
      questions: publicQuestions(s.items),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
