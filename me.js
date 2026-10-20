// Bài làm của tôi: xác thực PIN → danh sách các ngày đã làm, hoặc chi tiết 1 ngày (kèm đáp án).
import { getJSON, getJSONMany, smembers, hgetall } from '../lib/store.js';
import { verifyUser } from '../lib/auth.js';
import { rankRows, userKey } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = req.body || {};
    const auth = await verifyUser(b, { create: false });
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const { uk, user } = auth;

    if (b.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return res.status(400).json({ error: 'Ngày không hợp lệ.' });
      const rev = await getJSON(`rev:${b.date}:${uk}`);
      if (!rev) return res.status(404).json({ error: 'Không tìm thấy bài làm của ngày này.' });
      const rows = rankRows(await hgetall(`lb:${b.date}`));
      const rank = rows.findIndex((r) => userKey(r.name, r.dept) === uk) + 1;
      return res.json({ date: b.date, ...rev, rank, participants: rows.length });
    }
    const dates = (await smembers(`hist:${uk}`)).sort().reverse();
    const revs = await getJSONMany(dates.map((d) => `rev:${d}:${uk}`));
    const history = dates.map((d, i) => revs[i] && { date: d, ...revs[i].result, topics: undefined }).filter(Boolean);
    return res.json({ user: { name: user.name, dept: user.dept, joinDate: user.joinDate || '' }, history });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
