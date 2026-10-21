import { hgetallMany, hcountsMany, hasDb } from '../lib/store.js';
import { today, addDays, rankRows, userKey } from '../lib/util.js';
import { getSettings } from '../lib/settings.js';
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
        const a = agg.get(k) || { name: r.name, dept: r.dept, startedAt: 0, correct: 0, total: 0, duration: 0, days: 0, at: 0, topics: {} };
        a.correct += r.correct; a.total += r.total; a.duration += r.duration; a.days++;
        a.at = Math.max(a.at, r.at); if (r.at >= a.at && r.startedAt) a.startedAt = r.startedAt;
        Object.entries(r.topics || {}).forEach(([tp, [c, n]]) => { a.topics[tp] ||= [0, 0]; a.topics[tp][0] += c; a.topics[tp][1] += n; });
        agg.set(k, a);
      });
      rows = rankRows([...agg.values()].map((a) => ({ ...a, score: Math.round((a.correct / a.total) * 1000) / 10 })));
    }

    const bank = await getBank();

    // Top câu trả lời sai nhiều nhất trong kỳ
    const st = {};
    (await hcountsMany(dates.map((d) => `qs:${d}`))).forEach((h) => Object.entries(h).forEach(([f, v]) => {
      const [id, k] = f.split(':'); (st[id] ||= { n: 0, w: 0, c: {} });
      if (k === 'n') st[id].n += v; else if (k === 'w') st[id].w += v; else st[id].c[k.slice(1)] = (st[id].c[k.slice(1)] || 0) + v;
    }));
    const byId = new Map(bank.map((x) => [x.id, x]));
    const wrong = Object.entries(st).filter(([id, s]) => s.w > 0 && byId.has(id)).map(([id, s]) => {
      const x = byId.get(id);
      const [pk] = Object.entries(s.c).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0] || [];
      return { id, topic: x.topic, ref: x.ref, q: x.q, answer: x.o[0], wrongPick: pk != null ? x.o[Number(pk)] : '', w: s.w, n: s.n, rate: Math.round((s.w / Math.max(s.n, 1)) * 100) };
    }).sort((a, b) => b.w - a.w || b.rate - a.rate).slice(0, 8);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ period, date: base, from, to, today: t, rows, wrong, bankSize: bank.length, ...(await getSettings()), persistent: hasDb });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
