// Câu KHÓ – SOP điền HĐPT (bộ Quy trình) và Quy chế lương thưởng QĐ 265–268 (bộ Lương thưởng).
const SOP = 'SOP-CLB-01 – Quy chuẩn điền HĐPT';
const T_SOP = 'Quy chuẩn điền HĐPT';

export const KSOP = [
  [T_SOP, `${SOP} · Mục A`, 'Khách hàng mua 02 gói PT và vay qua Fundiin. Hồ sơ được lập thế nào?',
    ['01 hợp đồng gồm cả 02 gói, kèm 01 phụ lục trả góp', '02 hợp đồng, mỗi hợp đồng kèm 01 phụ lục trả góp', '02 hợp đồng, kèm chung 01 phụ lục trả góp', '01 hợp đồng gồm cả 02 gói, kèm 02 phụ lục trả góp']],
  [T_SOP, `${SOP} · Mục A`, 'Phụ lục 1 – Xác nhận thanh toán trả góp được điền thế nào?',
    ['Điền bằng chữ viết tay, in và ký xác nhận trên cả 02 bản', 'Điền trực tiếp trên file html rồi in 02 bản', 'Điền bằng chữ viết tay, ký xác nhận trên 01 bản lưu tại Club', 'Điền trên CRM, in 01 bản giao khách']],
  [T_SOP, `${SOP} · Mục A`, 'Về hiệu lực của Hợp đồng PT, phát biểu nào ĐÚNG?',
    ['Có hiệu lực khi hai Bên hoàn tất ký kết trên cả 02 bản, không bắt buộc có con dấu của Bên A',
     'Chỉ có hiệu lực khi có con dấu của Bên A',
     'Có hiệu lực khi khách hàng ký, chữ ký Bên A có thể bổ sung sau',
     'Có hiệu lực khi hợp đồng được gửi về Central']],
  [T_SOP, `${SOP} · Mục A`, 'Club phải scan toàn bộ HĐPT phát sinh trong ngày và gửi kèm Báo cáo bán hàng khi nào, CC cho ai?',
    ['Trước 22h00 mỗi ngày, CC operation@thenewgym.vn', 'Trước 22h00 mỗi ngày, CC cskh@thenewgym.vn', 'Trước 21h45 mỗi ngày, CC operation@thenewgym.vn', 'Trước 12h00 ngày hôm sau, CC operation@thenewgym.vn']],
  [T_SOP, `${SOP} · Mục A`, 'Club cần in dự phòng bao nhiêu hợp đồng bản cứng để phòng sự cố điện/internet/thiết bị?',
    ['5–10 hợp đồng', '2–3 hợp đồng', '10–15 hợp đồng', '20 hợp đồng']],
  [T_SOP, `${SOP} · Mục B`, 'Ngày kích hoạt trên hợp đồng là 22/08/2026, gói 3 tháng. Ngày kết thúc ghi trên giấy là ngày nào?',
    ['21/11/2026', '22/11/2026', '20/11/2026', '30/11/2026']],
  [T_SOP, `${SOP} · Mục B`, 'Ô "Số buổi PT tối đa" trên hợp đồng ghi thế nào?',
    ['Tổng số buổi tối đa (cộng các gói nếu có); chỉ ghi số buổi, không ghi tên gói', 'Ghi tên gói và số buổi của từng gói', 'Ghi số buổi có tính phí cộng buổi tặng kèm', 'Ghi tên gói, số buổi tự hệ thống điền']],
  [T_SOP, `${SOP} · Mục D`, 'Hợp đồng vi phạm quy chuẩn điền bị xử lý thế nào?',
    ['Tính là không hợp lệ; nhân sự vi phạm bị khấu trừ 5–10 điểm tuân thủ vận hành trong tháng',
     'Tính là không hợp lệ; nhân sự vi phạm bị khấu trừ 10–20 điểm tuân thủ vận hành',
     'Vẫn hợp lệ nếu khách đã ký; nhân sự bị nhắc nhở',
     'Tính là không hợp lệ; nhân sự bị trừ 5% hoa hồng tháng']],
  [T_SOP, `${SOP} · Mục D`, 'Giao dịch trả góp khi khách không được tư vấn và ký kèm Phụ lục 01 thì ai chịu trách nhiệm trực tiếp mọi tranh chấp?',
    ['Quản lý Chi nhánh', 'Nhân viên tư vấn trực tiếp', 'Bộ phận Kế toán', 'Đối tác tài chính']],
];

const GM = 'QĐ 265/2026/QĐ-TND – Quy chế lương thưởng GM';
const MS = 'QĐ 266/2026/QĐ-TND – Quy chế lương thưởng MS';
const LD = 'QĐ 267/2026/QĐ-TND – Quy chế lương thưởng Team Leader PT';
const PT = 'QĐ 268/2026/QĐ-TND – Quy chế thu nhập Personal Trainer';
const TT = 'Tóm tắt cách tính thu nhập bốn vị trí';
const T_GM = 'Lương thưởng GM', T_MS = 'Lương thưởng MS', T_LD = 'Lương thưởng Leader PT', T_PT = 'Thu nhập PT', T_CH = 'Lương thưởng – nguyên tắc chung';

export const KLUONG = [
  // ===== Nguyên tắc chung =====
  [T_CH, `${TT} · Mục 2`, 'Công thức thu nhập nào sau đây ghép ĐÚNG với vị trí?',
    ['GM và MS: N1 + (N2 + N3) × Hệ số; Leader: N1 + N2 + N3 × Hệ số', 'GM và Leader: N1 + (N2 + N3) × Hệ số; MS: N1 + N2 + N3 × Hệ số', 'MS và Leader: N1 + (N2 + N3) × Hệ số; GM: N1 + N2 + N3 × Hệ số', 'GM, MS và Leader đều là N1 + (N2 + N3) × Hệ số']],
  [T_CH, `${TT} · Mục 2`, 'Mức N1 của bốn vị trí là bao nhiêu?',
    ['GM 6.500.000 đồng; MS, Leader và PT 5.500.000 đồng', 'GM 6.500.000 đồng; MS 5.500.000 đồng; Leader và PT 6.000.000 đồng', 'GM và Leader 6.500.000 đồng; MS và PT 5.500.000 đồng', 'Cả bốn vị trí đều 5.500.000 đồng']],
  [T_CH, `${TT} · Mục 8`, 'Vị trí nào có phần thu nhập chịu hệ số thưởng là N2 và N3?',
    ['GM và MS', 'Leader và PT', 'GM và Leader', 'MS và PT']],
  [T_CH, `${GM} · Điều 7`, 'Ngày 15 của tháng kế tiếp trùng ngày nghỉ hằng tuần thì thu nhập được chi trả khi nào?',
    ['Vào ngày làm việc liền trước', 'Vào ngày làm việc liền sau', 'Vào ngày 20 của tháng đó', 'Vào ngày 10 của tháng đó']],
  [T_CH, `${GM} · Điều 6`, 'Thời hạn công bố Phụ lục Điều kiện thưởng trước ngày có hiệu lực là bao lâu?',
    ['30 ngày', '15 ngày', '07 ngày làm việc', '45 ngày']],
  [T_CH, `${GM} · Điều 6`, 'Khi có dấu hiệu vi phạm khiến hệ số thưởng có thể bằng 0%, Ban Kiểm soát phải kết luận trong bao lâu?',
    ['Trong thời hạn 10 ngày làm việc', 'Trong thời hạn 05 ngày làm việc', 'Trong thời hạn 15 ngày làm việc', 'Trong thời hạn 30 ngày']],
  [T_CH, `${GM} · Điều 3`, 'Tiền lương làm căn cứ đóng bảo hiểm xã hội bắt buộc của GM là gì?',
    ['N1', 'N1 + N2', 'N1 + N2 + N3', 'N1 + N2 × Hệ số thưởng']],

  // ===== GM =====
  [T_GM, `${GM} · Điều 5`, 'Doanh số PT của chi nhánh trong 03 tháng liền kề là 3,2 tỷ đồng. Tỷ lệ thưởng N3 của GM là bao nhiêu?',
    ['NEW 4,0%; RENEW 6,0%', 'NEW 3,5%; RENEW 5,5%', 'NEW 4,5%; RENEW 6,5%', 'NEW 6,0%; RENEW 4,0%']],
  [T_GM, `${GM} · Điều 5`, 'Doanh số PT của chi nhánh trong 03 tháng liền kề đúng 1.500.000.000 đồng. GM được xếp bậc mấy?',
    ['Bậc 2 (NEW 3,5%; RENEW 5,5%)', 'Bậc 1 (NEW 3,0%; RENEW 5,0%)', 'Bậc 3 (NEW 4,0%; RENEW 6,0%)', 'Bậc 2 (NEW 5,5%; RENEW 3,5%)']],
  [T_GM, `${GM} · Điều 5`, 'GM mới được bổ nhiệm áp dụng bậc tỷ lệ N3 thế nào?',
    ['Áp dụng bậc 1 trong 03 tháng đầu kể từ ngày bổ nhiệm', 'Áp dụng bậc của chi nhánh theo 03 tháng liền kề', 'Áp dụng bậc 2 trong 03 tháng đầu', 'Áp dụng bậc 1 trong 06 tháng đầu']],
  [T_GM, `${GM} · Điều 5`, 'GM tiếp nhận chi nhánh giữa tháng thì N2 và N3 được xác định thế nào?',
    ['N3 theo hợp đồng thanh toán đủ trong thời gian phụ trách; N2 chia theo tỷ lệ số ngày thực tế phụ trách',
     'N2 và N3 đều chia theo tỷ lệ số ngày thực tế phụ trách',
     'N3 theo hợp đồng thanh toán đủ trong thời gian phụ trách; N2 được hưởng đủ',
     'GM mới không có N2, N3 trong tháng tiếp nhận']],
  [T_GM, `${GM} · Điều 7`, 'Hợp đồng PT được hoàn phí, phần N3 của GM bị truy thu theo nguyên tắc nào?',
    ['Số tiền hoàn × Tỷ lệ thưởng đã áp dụng; mỗi kỳ không quá 30% khoản thưởng, tối đa 06 kỳ, không khấu trừ N1',
     'Số tiền hoàn × Tỷ lệ thưởng hiện tại; mỗi kỳ không quá 50% khoản thưởng, tối đa 06 kỳ',
     'Số tiền hoàn × Tỷ lệ thưởng đã áp dụng; trừ một lần vào N1 tháng kế tiếp',
     'Giá trị hợp đồng × Tỷ lệ thưởng đã áp dụng; mỗi kỳ không quá 30%, tối đa 03 kỳ']],
  [T_GM, `${GM} · Điều 7`, 'GM có quyền giải trình số liệu doanh số, hệ số thưởng trong bao lâu kể từ ngày công bố?',
    ['05 ngày làm việc', '03 ngày làm việc', '10 ngày làm việc', '07 ngày']],
  [T_GM, `${GM} · Điều 6`, 'Hành vi nào khiến hệ số thưởng của GM bằng 0% trong tháng?',
    ['Gộp, tách nhóm PT nhằm thay đổi bậc tỷ lệ hoặc doanh số xét thưởng', 'Chi nhánh không đạt doanh số tháng', 'Nộp báo cáo bán hàng chậm 01 ngày', 'Có 01 nhân viên đi trễ trong tháng']],

  // ===== MS =====
  [T_MS, `${MS} · Phụ lục, Mục 1`, 'Mức thưởng bán gói Membership (N3) của MS là bao nhiêu?',
    ['Gói 06 tháng Toàn hệ thống 50.000 đồng/gói; gói 06 tháng 01 chi nhánh 25.000 đồng/gói', 'Gói 06 tháng Toàn hệ thống 25.000 đồng/gói; gói 06 tháng 01 chi nhánh 50.000 đồng/gói', 'Gói 06 tháng Toàn hệ thống 50.000 đồng/gói; gói 1 tháng 25.000 đồng/gói', 'Mọi gói Membership 50.000 đồng/gói']],
  [T_MS, `${MS} · Phụ lục, Mục 2`, 'Điều kiện ghi nhận thưởng bán gói cho MS nào là ĐÚNG?',
    ['Hợp đồng do chính MS tạo trên CRM, trong khung 06h00–22h00 và trong ca trực của MS đó', 'Hợp đồng do MS hoặc PT tạo trên CRM, trong khung 06h00–22h00', 'Hợp đồng do chính MS tạo trên CRM, bất kỳ thời điểm nào trong ngày', 'Hợp đồng do chính MS tạo trên CRM trong 48 giờ kể từ giao dịch']],
  [T_MS, `${MS} · Phụ lục, Mục 3`, 'Trường hợp nào VẪN phát sinh thưởng bán gói cho MS?',
    ['Gói 06 tháng 01 chi nhánh do MS tạo trong ca trực, hội viên đã thanh toán đủ', 'Gói Membership tặng kèm hợp đồng PT', 'Gói phát sinh từ việc gia hạn tự động', 'Gói do hội viên tự đăng ký trực tuyến']],
  [T_MS, `${MS} · Phụ lục, Mục 4`, 'Chi nhánh gửi báo cáo bán gói 06 tháng chậm, nhưng gói có đủ trên CRM. MS có mất thưởng không?',
    ['Không; MS không mất quyền hưởng thưởng vì chi nhánh báo cáo thiếu hoặc chậm', 'Có; gói không có trong báo cáo đúng hạn thì không được ghi nhận', 'Mất 50% thưởng của gói đó', 'Chỉ được ghi nhận vào tháng kế tiếp']],
  [T_MS, `${MS} · Điều 7`, 'Gói Membership hoàn phí, số tiền truy thu N3 của MS được tính thế nào?',
    ['Mức thưởng đã chi cho gói × (Số tiền hoàn ÷ Tổng phí gói)', 'Số tiền hoàn × Tỷ lệ thưởng đã áp dụng', 'Toàn bộ mức thưởng đã chi cho gói', 'Mức thưởng đã chi cho gói × 50%']],

  // ===== Leader =====
  [T_LD, `${LD} · Điều 4`, 'Lương buổi dạy trực tiếp (N2) của Leader được tính thế nào?',
    ['Đơn giá một buổi × 20%, áp dụng mọi buổi, không phân biệt NEW hay RENEW, không nhân hệ số', 'Đơn giá một buổi × 20% với NEW, × 30% với RENEW', 'Đơn giá một buổi × 25%, nhân hệ số thưởng', 'Đơn giá một buổi × 20%, nhân hệ số thưởng']],
  [T_LD, `${LD} · Điều 4`, 'Leader dạy trực tiếp khi CHƯA có phê duyệt của Ban Vận hành thì lương buổi dạy thế nào?',
    ['Vẫn được trả lương buổi dạy; trách nhiệm xử lý theo Phụ lục Điều kiện thưởng và pháp luật lao động', 'Không được trả lương buổi dạy', 'Được trả 50% lương buổi dạy', 'Được trả nhưng tính vào N3 và nhân hệ số']],
  [T_LD, `${LD} · Điều 4`, 'Buổi trải nghiệm do Leader dạy có phát sinh lương buổi dạy không?',
    ['Không; thuộc phạm vi công việc đã được trả bằng lương cố định', 'Có, tính theo đơn giá buổi lẻ × 20%', 'Có, nếu khách mua gói sau buổi trải nghiệm', 'Có, tính 50% đơn giá']],
  [T_LD, `${LD} · Điều 5`, 'Doanh số nhóm trong 03 tháng liền kề là 2 tỷ đồng. Tỷ lệ N3 của Leader là bao nhiêu?',
    ['NEW 4,0%; RENEW 6,0%', 'NEW 3,5%; RENEW 5,5%', 'NEW 4,5%; RENEW 6,5%', 'NEW 3,0%; RENEW 5,0%']],
  [T_LD, `${LD} · Điều 5`, 'Chi nhánh chỉ có 01 nhóm PT thì N3 của Leader được xử lý thế nào?',
    ['N3 được nhân hệ số 75%', 'N3 được nhân hệ số 50%', 'N3 được hưởng đủ 100%', 'Leader không có N3']],
  [T_LD, `${LD} · Điều 7`, 'Leader có quyền giải trình số liệu trong bao lâu kể từ ngày công bố?',
    ['03 ngày làm việc', '05 ngày làm việc', '07 ngày làm việc', '10 ngày làm việc']],

  // ===== PT =====
  [T_PT, `${PT} · Điều 2`, 'Tháng này hoa hồng buổi dạy (N2) của PT là 4.000.000 đồng, N1 là 5.500.000 đồng. PT được hưởng phần lương nào?',
    ['Đủ N1 5.500.000 đồng; phần chênh lệch không bị thu hồi', '4.000.000 đồng theo hoa hồng thực tế', 'Đủ N1 nhưng phần chênh 1.500.000 đồng trừ vào tháng sau', '4.000.000 đồng + 50% phần chênh lệch']],
  [T_PT, `${PT} · Điều 4`, 'Đơn giá một buổi để tính hoa hồng PT được xác định thế nào?',
    ['Giá trị hợp đồng ÷ tổng số buổi của hợp đồng, gồm cả buổi tặng', 'Giá trị hợp đồng ÷ số buổi có tính phí, không gồm buổi tặng', 'Đơn giá buổi lẻ niêm yết 1.500.000 đồng', 'Giá niêm yết của gói ÷ số buổi có tính phí']],
  [T_PT, `${PT} · Điều 4`, 'Doanh số tháng của PT đạt 150 triệu đồng, hệ số thưởng tháng trước 65%. PT được xếp bậc nào?',
    ['Bậc 1 (NEW 20%; RENEW 30%)', 'Bậc 2 (NEW 25%; RENEW 35%)', 'Bậc 3 (NEW 30%; RENEW 40%)', 'Bậc 2 nhưng giảm 5% tỷ lệ']],
  [T_PT, `${PT} · Điều 4`, 'Doanh số tháng của PT đạt 220 triệu đồng, hệ số thưởng tháng trước 80%. Tỷ lệ hoa hồng là bao nhiêu?',
    ['NEW 30%; RENEW 40%', 'NEW 25%; RENEW 35%', 'NEW 40%; RENEW 30%', 'NEW 30%; RENEW 35%']],
  [T_PT, `${PT} · Điều 4`, 'Bậc tỷ lệ hoa hồng tháng 12 của PT được xác định căn cứ vào đâu?',
    ['Doanh số tháng 12 và hệ số thưởng tháng 11', 'Doanh số tháng 11 và hệ số thưởng tháng 11', 'Doanh số tháng 12 và hệ số thưởng tháng 12', 'Doanh số quý IV và hệ số thưởng tháng 11']],
  [T_PT, `${PT} · Điều 4`, 'PT nhận bàn giao hợp đồng từ PT khác thì hoa hồng và doanh số thế nào?',
    ['Hưởng tỷ lệ 20% cho toàn bộ số buổi còn lại; hợp đồng không tính vào doanh số của PT tiếp nhận', 'Hưởng tỷ lệ theo bậc của mình; hợp đồng tính vào doanh số của PT tiếp nhận', 'Hưởng tỷ lệ 20%; hợp đồng tính 50% vào doanh số của PT tiếp nhận', 'Hưởng tỷ lệ 30%; hợp đồng không tính vào doanh số']],
  [T_PT, `${PT} · Điều 4`, 'Hội viên chấm dứt hợp đồng và được hoàn phí. Hoa hồng các buổi PT đã dạy thế nào?',
    ['Không bị thu hồi', 'Bị thu hồi theo tỷ lệ số tiền hoàn', 'Bị thu hồi 30% mỗi kỳ, tối đa 06 kỳ', 'Bị thu hồi toàn bộ nếu hoàn phí do lỗi PT']],
  [T_PT, `${PT} · Điều 5`, 'Doanh số PT của quý liền kề trước là 280 triệu đồng. Danh hiệu và tỷ lệ thưởng N3 là gì?',
    ['Gold – 2,5%', 'Platinum – 5%', 'Chưa đạt – 0%', 'Gold – 5%']],
  [T_PT, `${PT} · Điều 5`, 'Danh hiệu PT được công bố khi nào?',
    ['Chậm nhất ngày 20 của tháng cuối quý liền kề trước', 'Chậm nhất ngày 05 của tháng đầu quý', 'Chậm nhất ngày 15 của tháng cuối quý', 'Ngày cuối cùng của quý liền kề trước']],
  [T_PT, `${PT} · Điều 4`, 'PT nghỉ thai sản quay lại làm việc thì bậc tỷ lệ và danh hiệu thế nào?',
    ['Trong 03 tháng đầu giữ nguyên bậc tỷ lệ và danh hiệu của kỳ liền kề trước khi nghỉ', 'Được xếp lại từ bậc 1 và chưa đạt danh hiệu', 'Trong 06 tháng đầu giữ nguyên bậc và danh hiệu', 'Giữ nguyên danh hiệu nhưng xếp bậc 1']],
  [T_PT, `${PT} · Điều 3`, 'Tiền lương giờ làm căn cứ tính làm thêm giờ của PT được xác định thế nào?',
    ['Tổng N1 và N2 bình quân 06 tháng liền kề trước, chia cho số giờ làm việc bình thường trong tháng', 'N1 chia cho số giờ làm việc bình thường trong tháng', 'Tổng N1, N2, N3 bình quân 03 tháng, chia cho số giờ làm việc', 'N1 và N2 của chính tháng đó, chia cho số giờ làm việc']],
];
