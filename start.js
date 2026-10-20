import crypto from 'node:crypto';
import { getBank } from '../lib/bank.js';
import { getJSON, setJSON, sadd, dbRequiredButMissing } from '../lib/store.js';
import { DEPTS, QUIZ_SIZE, TIME_LIMIT, MAX_PIN_FAILS, today, clean, userKey, hashPin, shuffle, publicQuestions } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (dbRequiredButMissing) return res.status(503).json({ error: 'Hệ thống chưa kết nối cơ sở dữ liệu (Upstash Redis). Vui lòng báo quản trị viên.' });
  try {
    const b = req.body || {};
    const name = clean(b.name);
    const dept = b.dept;
    const pin = String(b.pin || '');
    const joinDate = /^\d{4}-\d{2}-\d{2}$/.test(b.joinDate || '') ? b.joinDate : '';
    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Vui lòng nhập họ tên hợp lệ.' });
    if (!DEPTS.includes(dept)) return res.status(400).json({ error: 'Vui lòng chọn phòng ban.' });
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'Mã PIN gồm đúng 4 chữ số.' });

    const date = today();
    const uk = userKey(name, dept);
    const now = Date.now();

    // ---- Xác thực PIN ----
    const failKey = `pinfail:${date}:${uk}`;
    const fails = (await getJSON(failKey)) || 0;
    if (fails >= MAX_PIN_FAILS) {
      return res.status(429).json({ error: `Bạn đã nhập sai PIN ${MAX_PIN_FAILS} lần hôm nay. Vui lòng liên hệ quản trị viên để đặt lại PIN.` });
    }
    const userKeyName = `user:${uk}`;
    let user = await getJSON(userKeyName);
    let firstTime = false;
    if (!user || !user.pinHash) {
      const salt = crypto.randomBytes(16).toString('hex');
      user = { ...(user || {}), name, dept, salt, pinHash: hashPin(pin, salt), createdAt: user?.createdAt || now, pinSetAt: now };
      await setJSON(userKeyName, user);
      await sadd('users', uk);
      firstTime = true;
    } else if (hashPin(pin, user.salt) !== user.pinHash) {
      await setJSON(failKey, fails + 1, 60 * 60 * 48);
      const left = MAX_PIN_FAILS - fails - 1;
      return res.status(401).json({ error: left > 0 ? `Mã PIN không đúng. Bạn còn ${left} lần thử.` : `Mã PIN không đúng. Tài khoản đã bị tạm khóa hôm nay, vui lòng liên hệ quản trị viên.` });
    }
    if (joinDate && user.joinDate !== joinDate) { user.joinDate = joinDate; await setJSON(userKeyName, user); }

    // ---- Phiên làm bài ----
    const key = `sess:${date}:${uk}`;
    let s = await getJSON(key);
    if (s?.result) {
      return res.status(409).json({ error: 'Bạn đã hoàn thành bài trắc nghiệm hôm nay. Hẹn gặp lại vào ngày mai!', result: s.result });
    }
    if (s && now - s.startedAt > (TIME_LIMIT + 120) * 1000) {
      return res.status(409).json({ error: 'Lượt làm bài hôm nay của bạn đã hết thời gian. Hẹn gặp lại vào ngày mai!' });
    }
    if (!s) {
      const bank = await getBank();
      if (!bank.length) return res.status(503).json({ error: 'Ngân hàng câu hỏi đang trống.' });
      const picked = shuffle(bank).slice(0, Math.min(QUIZ_SIZE, bank.length));
      const items = picked.map((q) => ({ id: q.id, topic: q.topic, ref: q.ref, q: q.q, o: q.o, perm: shuffle(q.o.map((_, i) => i)) }));
      s = { name: user.name, dept, joinDate: joinDate || user.joinDate || '', date, token: crypto.randomUUID(), startedAt: now, items };
      await setJSON(key, s, 60 * 60 * 48);
    }
    return res.status(200).json({
      token: s.token, date, startedAt: s.startedAt, serverNow: now, timeLimit: TIME_LIMIT, firstTime,
      questions: publicQuestions(s.items),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
