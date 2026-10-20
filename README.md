# TNG Quiz – Trắc nghiệm Quy trình & Quy định

Ứng dụng web trắc nghiệm hằng ngày cho nhân sự The New Gym.

- **Đăng nhập:** Họ tên, Phòng ban (Vận hành / Kế toán / Membership / Ban phát triển), Ngày vào làm (không bắt buộc)
- **Mỗi người 1 lượt/ngày** (theo Họ tên + Phòng ban). Bảng xếp hạng **làm mới lúc 00:00 (giờ Việt Nam)**
- **Xếp hạng từ cao đến thấp:** số câu đúng, bằng điểm thì ưu tiên thời gian nhanh hơn
- Mỗi lượt **20 câu ngẫu nhiên** (mặc định) từ ngân hàng **499 câu** phủ đủ 13 văn bản (gồm 32 câu đối chiếu giữa các văn bản), đáp án được xáo trộn. Thời gian **40 phút** (mặc định), hết giờ tự nộp bài. Số câu, thời gian và danh sách phòng ban chỉnh được trong trang quản trị.
- Đáp án chỉ nằm ở máy chủ và được chấm ở máy chủ, nên không xem trộm được qua trình duyệt
- Bảng tổng quan gồm: lượt tham gia, điểm TB, top 3, xếp hạng theo phòng ban, tỷ lệ đúng theo chủ đề, xem lại các ngày trước, xuất CSV

## Tính năng bổ sung
- **Mã PIN 4 số:** lần đầu đăng nhập nhân viên tự đặt PIN; các lần sau phải nhập đúng. Sai 5 lần/ngày sẽ bị tạm khóa trong ngày.
- **Trang quản trị** `/admin.html` (mật khẩu = biến `ADMIN_PASSWORD`):
  - Câu hỏi: tìm kiếm, lọc theo chủ đề; thêm mới, sửa, tắt/bật, khôi phục nội dung gốc, xóa câu thêm mới
  - Nhân viên: xem ai đã làm hôm nay, **đặt lại PIN**, **cho làm lại hôm nay**
  - Kết quả: xem và **xóa kết quả** theo ngày (xóa kết quả hôm nay thì nhân viên được làm lại)
  - Xếp hạng: xem bảng xếp hạng Ngày / Tuần / Tháng, theo phòng ban, câu sai nhiều nhất
  - Cài đặt: **số câu mỗi đề** (5–100), **thời gian làm bài** (5–180 phút), **thêm/gỡ phòng ban**. Lưu trong Redis, áp dụng ngay cho lượt làm bài mới.
- **Bảng xếp hạng Ngày / Tuần / Tháng:** tuần tính từ Thứ Hai đến Chủ Nhật. Xếp theo tổng số câu đúng cộng dồn, bằng nhau thì ưu tiên điểm TB cao hơn, rồi đến tổng thời gian ít hơn.

## Bản cập nhật giao diện (logo & tài liệu)
- Giao diện mới theo màu logo The New Gym: xanh #4A9FDC, xám #545356, cam #E8833A.
- **Tài liệu** `/docs.html`: toàn bộ 13 văn bản trong thư mục TNG (QĐ 272, QĐ 260–264, 4 chính sách công khai, SOP-CLB-01, mẫu HĐPT, Phụ lục 1). Có tìm kiếm, mục lục và số trang PDF.
- **Trích dẫn đáp án:** khi xem lại bài, dưới mỗi câu hiện đoạn trích văn bản gốc (tô sáng cụm đáp án, kèm Điều và trang). Bấm vào sẽ mở đúng đoạn đó trong trang Tài liệu.
- **Bài của tôi:** đăng nhập Họ tên + Phòng ban + PIN để xem lại mọi bài đã làm (lưu khoảng 13 tháng).
- **Khóa Tài liệu khi đang làm bài:** trang Tài liệu tự khóa trong lúc làm và mở lại ngay sau khi nộp bài hoặc hết giờ.
- **Nút "Quản trị"** ở góc phải trên. Hướng dẫn đổi mật khẩu chỉ hiện sau khi đăng nhập quản trị.
- Dữ liệu văn bản nằm trong `public/docs/*.json`. Khi văn bản gốc thay đổi, cần tạo lại các file này.

## Cấu trúc
```
public/        giao diện (index.html, styles.css, app.js)
api/           start.js · submit.js · leaderboard.js (Vercel Functions)
lib/           questions.js (ngân hàng câu hỏi) · store.js (Redis) · util.js
```

## Triển khai lên Vercel
1. Tạo repo GitHub mới, upload toàn bộ file trong thư mục này (giữ nguyên cấu trúc).
2. Vào vercel.com → **Add New → Project** → chọn repo → **Deploy** (Framework: Other, không cần build).
3. Trong project: **Storage → Create / Connect → Upstash for Redis** (gói Free) → Connect vào project.
   Vercel tự thêm biến `KV_REST_API_URL` và `KV_REST_API_TOKEN`.
4. **Deployments → Redeploy** để nhận biến môi trường. Xong.

> Nếu chưa kết nối Redis, ứng dụng vẫn chạy nhưng dữ liệu chỉ lưu tạm trong bộ nhớ và có thể mất bất kỳ lúc nào.

## Lưu kết quả vào Google Sheets (tài khoản yen.tran@thenewgym.vn)
1. Đăng nhập **yen.tran@thenewgym.vn**, tạo một Google Sheets mới, đặt tên (VD: *TNG Quiz – Kết quả*).
2. Trong Sheet: **Tiện ích mở rộng → Apps Script**, xóa code mẫu, dán toàn bộ nội dung `google-apps-script/Code.gs`.
3. Đổi dòng `const SECRET = 'DOI-CHUOI-BI-MAT-NAY';` thành một chuỗi bí mật của bạn, rồi bấm **Lưu**.
4. **Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web**
   - Thực thi dưới dạng: **Tôi (yen.tran@thenewgym.vn)**
   - Người có quyền truy cập: **Bất kỳ ai** (*Anyone*)
   - Bấm **Triển khai**, cấp quyền, rồi sao chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
   > Nếu Google Workspace của công ty không cho chọn "Bất kỳ ai", nhờ quản trị viên Workspace cho phép.
5. Trên Vercel → **Settings → Environment Variables**, thêm:
   - `SHEET_WEBHOOK_URL` = URL vừa sao chép
   - `SHEET_SECRET` = chuỗi bí mật ở bước 3
6. **Redeploy**. Mỗi lượt nộp bài sẽ thêm 1 dòng vào tab **Kết quả**.

> Sau này nếu sửa Code.gs, phải vào **Triển khai → Quản lý triển khai → Chỉnh sửa → Phiên bản mới** thì thay đổi mới có hiệu lực (URL giữ nguyên).

### Biến môi trường tùy chọn
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `ADMIN_PASSWORD` | (bắt buộc để dùng trang quản trị) | Mật khẩu vào `/admin.html` |
| `QUIZ_SIZE` | 20 | Số câu mỗi lượt (mặc định, khi chưa chỉnh trong trang quản trị) |
| `TIME_LIMIT_SEC` | 2400 | Thời gian làm bài, giây (mặc định, khi chưa chỉnh trong trang quản trị) |

## Chạy thử tại máy
```
node dev-server.js   →  http://localhost:3000
```

## Thêm / sửa câu hỏi
Mở `lib/questions.js`, thêm dòng theo mẫu:
```js
['Chủ đề', 'Nguồn văn bản · Điều', 'Câu hỏi?', ['ĐÁP ÁN ĐÚNG (luôn đặt đầu tiên)', 'Sai 1', 'Sai 2', 'Sai 3']],
```
Commit lên GitHub thì Vercel sẽ tự triển khai lại.

