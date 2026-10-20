import { getJSON, setJSON, hset, hgetall, sadd } from '../lib/store.js';
import { appendToSheet } from '../lib/sheet.js';
import { TIME_LIMIT, clean, userKey, rankRows, publicQuestions } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = req.body || {};
    const uk = userKey(clean(b.name), b.dept);
    const date = String(b.date || '');
    const key = `sess:${date}:${uk}`;
    const s = await getJSON(key);
    if (!s || s.token !== b.token) return res.status(400).json({ error: 'Không tìm thấy phiên làm bài (có thể đã quá hạn hoặc đã được quản trị viên đặt lại). Vui lòng tải lại trang và đăng nhập lại.' });
    if (s.result) return res.status(409).json({ error: 'Bài đã được nộp trước đó.', result: s.result });

    const answers = Array.isArray(b.answers) ? b.answers : [];
    const topics = {};
    const pub = publicQuestions(s.items);
    let correct = 0;
    const review = s.items.map((it, i) => {
      const chosen = Number.isInteger(answers[i]) && answers[i] >= 0 && answers[i] < it.perm.length ? answers[i] : null;
      const right = it.perm.indexOf(0);
      const ok = chosen === right;
      if (ok) correct++;
      topics[it.topic] ||= [0, 0];
      topics[it.topic][1]++;
      if (ok) topics[it.topic][0]++;
      return { ...pub[i], ref: it.ref, chosen, right, ok };
    });

    const now = Date.now();
    const duration = Math.min(Math.round((now - s.startedAt) / 1000), TIME_LIMIT);
    const total = s.items.length;
    const result = {
      name: s.name, dept: s.dept, joinDate: s.joinDate, correct, total,
      score: Math.round((correct / total) * 1000) / 10, duration, at: now, topics,
    };
    s.result = result;
    await setJSON(key, s, 60 * 60 * 48);
    await hset(`lb:${date}`, uk, result);
    // Lưu bài làm để nhân viên xem lại sau (giữ ~13 tháng)
    await setJSON(`rev:${date}:${uk}`, { result, review }, 60 * 60 * 24 * 400);
    await sadd(`hist:${uk}`, date);
    await appendToSheet(result, date);

    const rows = rankRows(await hgetall(`lb:${date}`));
    const rank = rows.findIndex((r) => userKey(r.name, r.dept) === uk) + 1;
    return res.status(200).json({ result, rank, participants: rows.length, review });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
