// Cài đặt do quản trị viên chỉnh trên trang Quản trị (lưu trong Redis key "settings").
// Chưa chỉnh thì dùng giá trị mặc định / biến môi trường.
import { getJSON, setJSON } from './store.js';
import { DEPTS, QUIZ_SIZE, TIME_LIMIT, clean } from './util.js';

export const LIMITS = { quizMin: 5, quizMax: 100, minMin: 5, minMax: 180 };
// Tỷ lệ câu khó (q.lv === 'kho') trong mỗi đề, phần còn lại là câu dễ
export const DEFAULT_HARD_PCT = 40;

// Bộ câu hỏi có sẵn trong mã nguồn. active: có dùng khi phát đề; count: số câu cố định lấy từ bộ này (0 = trộn ngẫu nhiên)
export const DEFAULT_SETS = [
  { id: 'quytrinh', name: 'Quy trình – Quy định', active: true, count: 0, builtin: true },
  { id: 'luong', name: 'Quy chế lương thưởng', active: true, count: 0, builtin: true },
];

function mergeSets(saved) {
  const list = Array.isArray(saved) ? saved.map((x) => ({ ...x })) : [];
  DEFAULT_SETS.forEach((d) => { if (!list.some((x) => x.id === d.id)) list.push({ ...d }); });
  return list.map((x) => ({ ...x, builtin: DEFAULT_SETS.some((d) => d.id === x.id) }));
}

export async function getSettings() {
  const s = (await getJSON('settings')) || {};
  return {
    quizSize: Number(s.quizSize) || QUIZ_SIZE,
    timeLimit: Number(s.timeLimit) || TIME_LIMIT,
    hardPct: s.hardPct === undefined ? DEFAULT_HARD_PCT : Number(s.hardPct),
    depts: Array.isArray(s.depts) && s.depts.length ? s.depts : DEPTS,
    sets: mergeSets(s.sets),
  };
}

const slug = (s) => clean(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

// Trả về chuỗi lỗi hoặc object cài đặt hợp lệ
export function validSettings(b) {
  const quizSize = Math.round(Number(b.quizSize));
  const minutes = Math.round(Number(b.minutes));
  const depts = [...new Set((b.depts || []).map(clean).filter(Boolean))];
  if (!(quizSize >= LIMITS.quizMin && quizSize <= LIMITS.quizMax)) return `Số câu mỗi đề phải từ ${LIMITS.quizMin} đến ${LIMITS.quizMax}.`;
  if (!(minutes >= LIMITS.minMin && minutes <= LIMITS.minMax)) return `Thời gian làm bài phải từ ${LIMITS.minMin} đến ${LIMITS.minMax} phút.`;
  const hardPct = b.hardPct === undefined || b.hardPct === '' ? DEFAULT_HARD_PCT : Math.round(Number(b.hardPct));
  if (!(hardPct >= 0 && hardPct <= 100)) return 'Tỷ lệ câu khó phải từ 0 đến 100%.';
  if (!depts.length) return 'Cần ít nhất 1 phòng ban.';
  if (depts.some((d) => d.length > 40 || d.includes('|'))) return 'Tên phòng ban tối đa 40 ký tự và không chứa ký tự "|".';
  const sets = [];
  for (const x of b.sets || DEFAULT_SETS) {
    const name = clean(x.name);
    if (!name || name.length > 60) return 'Tên bộ câu hỏi không được trống và tối đa 60 ký tự.';
    let id = String(x.id || '') || slug(name) || 'bo-' + Date.now().toString(36);
    if (!/^[a-z0-9-]{1,40}$/.test(id)) id = slug(name) || 'bo-' + Date.now().toString(36);
    if (sets.some((y) => y.id === id)) id += '-' + Date.now().toString(36).slice(-4);
    const count = Math.max(0, Math.round(Number(x.count) || 0));
    sets.push({ id, name, active: Boolean(x.active), count });
  }
  if (!sets.some((x) => x.active)) return 'Cần bật ít nhất 1 bộ câu hỏi để phát đề.';
  const fixed = sets.filter((x) => x.active).reduce((s, x) => s + x.count, 0);
  if (fixed > quizSize) return `Tổng số câu cố định của các bộ (${fixed}) đang lớn hơn số câu mỗi đề (${quizSize}).`;
  return { quizSize, timeLimit: minutes * 60, hardPct, depts, sets };
}

export const saveSettings = (s) => setJSON('settings', s);

// Chọn câu cho một đề: lấy đủ số câu cố định của từng bộ, phần còn lại trộn ngẫu nhiên từ các bộ đang bật
// Tỷ lệ dễ/khó áp cho cả đề: mỗi bộ cố định lấy theo tỷ lệ, phần trộn ngẫu nhiên bù cho đủ số câu khó còn thiếu.
const isHard = (q) => q.lv === 'kho';
// Lấy n câu, trong đó cố gắng có h câu khó; thiếu loại nào thì bù bằng loại kia
function takeMix(list, n, h, shuffle) {
  const hard = shuffle(list.filter(isHard)), easy = shuffle(list.filter((q) => !isHard(q)));
  let nh = Math.min(hard.length, Math.max(0, h));
  const ne = Math.min(easy.length, n - nh);
  nh = Math.min(hard.length, n - ne);
  return [...hard.slice(0, nh), ...easy.slice(0, ne)];
}

export function pickQuestions(bank, cfg, shuffle) {
  const active = cfg.sets.filter((x) => x.active);
  const ids = new Set(active.map((x) => x.id));
  const pool = bank.filter((q) => ids.has(q.set || 'quytrinh'));
  const pct = cfg.hardPct === undefined ? DEFAULT_HARD_PCT : cfg.hardPct;
  const hardTarget = Math.round(cfg.quizSize * pct / 100);
  const picked = [], used = new Set();
  const add = (q) => { picked.push(q); used.add(q.id); };
  active.filter((x) => x.count > 0).forEach((x) => {
    takeMix(pool.filter((q) => (q.set || 'quytrinh') === x.id), x.count, Math.round(x.count * pct / 100), shuffle).forEach(add);
  });
  const freeSets = new Set(active.filter((x) => !x.count).map((x) => x.id));
  let rest = pool.filter((q) => !used.has(q.id) && freeSets.has(q.set || 'quytrinh'));
  if (!rest.length) rest = pool.filter((q) => !used.has(q.id));
  const need = Math.max(0, cfg.quizSize - picked.length);
  takeMix(rest, need, Math.min(need, hardTarget - picked.filter(isHard).length), shuffle).forEach(add);
  return shuffle(picked);
}
