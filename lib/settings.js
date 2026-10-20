// Cài đặt do quản trị viên chỉnh trên trang Quản trị (lưu trong Redis key "settings").
// Chưa chỉnh thì dùng giá trị mặc định / biến môi trường.
import { getJSON, setJSON } from './store.js';
import { DEPTS, QUIZ_SIZE, TIME_LIMIT, clean } from './util.js';

export const LIMITS = { quizMin: 5, quizMax: 100, minMin: 5, minMax: 180 };

export async function getSettings() {
  const s = (await getJSON('settings')) || {};
  return {
    quizSize: Number(s.quizSize) || QUIZ_SIZE,
    timeLimit: Number(s.timeLimit) || TIME_LIMIT,
    depts: Array.isArray(s.depts) && s.depts.length ? s.depts : DEPTS,
  };
}

// Trả về chuỗi lỗi hoặc object cài đặt hợp lệ
export function validSettings(b) {
  const quizSize = Math.round(Number(b.quizSize));
  const minutes = Math.round(Number(b.minutes));
  const depts = [...new Set((b.depts || []).map(clean).filter(Boolean))];
  if (!(quizSize >= LIMITS.quizMin && quizSize <= LIMITS.quizMax)) return `Số câu mỗi đề phải từ ${LIMITS.quizMin} đến ${LIMITS.quizMax}.`;
  if (!(minutes >= LIMITS.minMin && minutes <= LIMITS.minMax)) return `Thời gian làm bài phải từ ${LIMITS.minMin} đến ${LIMITS.minMax} phút.`;
  if (!depts.length) return 'Cần ít nhất 1 phòng ban.';
  if (depts.some((d) => d.length > 40 || d.includes('|'))) return 'Tên phòng ban tối đa 40 ký tự và không chứa ký tự "|".';
  return { quizSize, timeLimit: minutes * 60, depts };
}

export const saveSettings = (s) => setJSON('settings', s);
