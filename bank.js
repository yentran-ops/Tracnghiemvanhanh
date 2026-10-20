// Ngân hàng câu hỏi = câu gốc (lib/questions.js) + chỉnh sửa/bổ sung từ trang quản trị (lưu trong Redis).
import { QUESTIONS } from './questions.js';
import { getJSON, setJSON } from './store.js';

const KEY = 'qbank:edits';

export async function loadEdits() {
  const e = (await getJSON(KEY)) || {};
  return { overrides: e.overrides || {}, added: e.added || [] };
}
export async function saveEdits(e) {
  await setJSON(KEY, e);
}

export async function getBank({ includeDisabled = false } = {}) {
  const e = await loadEdits();
  const list = [
    ...QUESTIONS.map((q) => ({ ...q, ...(e.overrides[q.id] || {}), source: 'base', edited: Boolean(e.overrides[q.id] && (e.overrides[q.id].q || e.overrides[q.id].o)) })),
    ...e.added.map((q) => ({ ...q, source: 'custom' })),
  ];
  return includeDisabled ? list : list.filter((q) => !q.disabled);
}
