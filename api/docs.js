// Tài liệu tải lên từ trang quản trị: GET /api/docs → danh sách; GET /api/docs?id=... → nội dung.
import { listCustomDocs, getCustomDoc } from '../lib/docs-store.js';

export default async function handler(req, res) {
  try {
    const id = req.query?.id;
    if (id) {
      const doc = await getCustomDoc(id);
      if (!doc) return res.status(404).json({ error: 'Không tìm thấy tài liệu.' });
      return res.json(doc);
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json(await listCustomDocs());
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
}
