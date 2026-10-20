// Cài đặt do quản trị viên chỉnh trên trang Quản trị (lưu trong Redis key "settings").
// Chưa chỉnh thì dùng giá trị mặc định / biến môi trường.
import { getJSON, setJSON } from './store.js';
import { DEPTS, QUIZ_SIZE, TIME_LIMIT, clean } from './util.js';

export const LIMITS = { quizMin: 5, quizMax: 100, minMin: 5, minMax: 180 };

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
  return { quizSize, timeLimit: minutes * 60, depts, sets };
}

export const saveSettings = (s) => setJSON('settings', s);

// Chọn câu cho một đề: lấy đủ số câu cố định của từng bộ, phần còn lại trộn ngẫu nhiên từ các bộ đang bật
export function pickQuestions(bank, cfg, shuffle) {
  const active = cfg.sets.filter((x) => x.active);
  const ids = new Set(active.map((x) => x.id));
  const pool = bank.filter((q) => ids.has(q.set || 'quytrinh'));
  const picked = [], used = new Set();
  active.filter((x) => x.count > 0).forEach((x) => {
    shuffle(pool.filter((q) => (q.set || 'quytrinh') === x.id)).slice(0, x.count).forEach((q) => { picked.push(q); used.add(q.id); });
  });
  const freeSets = new Set(active.filter((x) => !x.count).map((x) => x.id));
  let rest = pool.filter((q) => !used.has(q.id) && freeSets.has(q.set || 'quytrinh'));
  if (!rest.length) rest = pool.filter((q) => !used.has(q.id));
  shuffle(rest).slice(0, Math.max(0, cfg.quizSize - picked.length)).forEach((q) => picked.push(q));
  return shuffle(picked);
}
