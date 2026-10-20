import { hgetallMany, hasDb } from '../lib/store.js';
import { today, addDays, rankRows, userKey, QUIZ_SIZE } from '../lib/util.js';
import { getBank } from '../lib/bank.js';

// period = day | week (Thứ Hai → Chủ Nhật) | month
export default async function handler(req, res) {
  try {
    const t = today();
    const q = String(req.query?.date || '');
    const base = /^\d{4}-\d{2}-\d{2}$/.test(q) && q <= t ? q : t;
    const period = ['day', 'week', 'month'].includes(req.query?.period) ? req.query.period : 'day';

    let from = base, to = base;
    if (period === 'week') {
      const dow = (new Date(base + 'T00:00:00Z').getUTCDay() + 6) % 7;
      from = addDays(base, -dow); to = addDays(from, 6);
    } else if (period === 'month') {
      from = base.slice(0, 8) + '01';
      to = addDays(addDays(from, 32).slice(0, 8) + '01', -1);
    }
    const dates = [];
    for (let d = from; d <= to && d <= t; d = addDays(d, 1)) dates.push(d);

    const lists = await hgetallMany(dates.map((d) => `lb:${d}`));
    let rows;
    if (period === 'day') {
      rows = rankRows((lists[0] || []).map((r) => ({ ...r, days: 1 })));
    } else {
      const agg = new Map();
      lists.flat().forEach((r) => {
        const k = userKey(r.name, r.dept);
        const a = agg.get(k) || { name: r.name, dept: r.dept, joinDate: '', correct: 0, total: 0, duration: 0, days: 0, at: 0, topics: {} };
        a.correct += r.correct; a.total += r.total; a.duration += r.duration; a.days++;
        a.at = Math.max(a.at, r.at); if (r.joinDate) a.joinDate = r.joinDate;
        Object.entries(r.topics || {}).forEach(([tp, [c, n]]) => { a.topics[tp] ||= [0, 0]; a.topics[tp][0] += c; a.topics[tp][1] += n; });
        agg.set(k, a);
      });
      rows = rankRows([...agg.values()].map((a) => ({ ...a, score: Math.round((a.correct / a.total) * 1000) / 10 })));
    }

    const bank = await getBank();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ period, date: base, from, to, today: t, rows, bankSize: bank.length, quizSize: QUIZ_SIZE, persistent: hasDb });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
