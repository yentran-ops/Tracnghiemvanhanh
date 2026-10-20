// Tài liệu do quản trị viên tải lên (lưu trong Redis). Tài liệu gốc nằm sẵn trong public/docs/*.json.
import { getJSON, setJSON, del } from './store.js';
import { clean } from './util.js';

const IDX = 'docs:custom';
export const MAX_DOC_BYTES = 900 * 1024;

export async function listCustomDocs() {
  return (await getJSON(IDX)) || [];
}
export async function getCustomDoc(id) {
  if (!/^[a-z0-9-]{1,40}$/.test(String(id))) return null;
  return getJSON(`doc:${id}`);
}

// b = { id?, title, refKey, group, file, blocks:[{t,text,page,ch,art}] }
export async function saveCustomDoc(b) {
  const title = clean(b.title), refKey = clean(b.refKey), group = clean(b.group) || 'Tài liệu bổ sung';
  if (!title || title.length > 160) return 'Tên tài liệu không được trống và tối đa 160 ký tự.';
  if (!refKey || refKey.length > 60) return 'Mã trích dẫn không được trống và tối đa 60 ký tự (VD: QĐ 270).';
  const blocks = (Array.isArray(b.blocks) ? b.blocks : []).slice(0, 5000).map((x, i) => ({
    t: ['h2', 'h3', 'p'].includes(x.t) ? x.t : 'p', text: String(x.text || '').slice(0, 5000),
    page: Number(x.page) || 0, ch: clean(x.ch).slice(0, 30), art: clean(x.art).slice(0, 30), id: 'b' + i,
  })).filter((x) => x.text.trim());
  if (!blocks.length) return 'Không đọc được nội dung tài liệu (file trống hoặc là ảnh scan).';
  const list = await listCustomDocs();
  const id = b.id && list.some((d) => d.id === b.id) ? b.id : 'u' + Date.now().toString(36);
  if (list.some((d) => d.id !== id && d.refKey.toLowerCase() === refKey.toLowerCase())) return `Mã trích dẫn "${refKey}" đã được dùng cho tài liệu khác.`;
  const pages = Math.max(0, ...blocks.map((x) => x.page));
  const meta = { id, title, refKey, group, source: 'Tải lên từ trang quản trị', file: clean(b.file).slice(0, 160), pages, custom: true, blocks: blocks.length, at: Date.now() };
  const doc = { ...meta, blocks };
  if (Buffer.byteLength(JSON.stringify(doc)) > MAX_DOC_BYTES) return 'Tài liệu quá lớn (tối đa khoảng 900 KB chữ). Hãy tách thành nhiều file.';
  await setJSON(`doc:${id}`, doc);
  await setJSON(IDX, [...list.filter((d) => d.id !== id), meta]);
  return meta;
}

export async function deleteCustomDoc(id) {
  const list = await listCustomDocs();
  if (!list.some((d) => d.id === id)) return false;
  await del(`doc:${id}`);
  await setJSON(IDX, list.filter((d) => d.id !== id));
  return true;
}
