// Ngân hàng câu KHÓ: câu đánh đố, các phương án gần giống nhau (chỉ khác 1 chi tiết) để người làm phải phân vân.
// Cùng định dạng: [chủ đề, nguồn, câu hỏi, [ĐÁP ÁN ĐÚNG, sai 1, sai 2, sai 3]] — đáp án đúng luôn đứng đầu.
// Thêm câu mới vào CUỐI mỗi mảng để id các câu đã có không bị đổi.
import { K272A } from './kho-272a.js';
import { K272B } from './kho-272b.js';
import { K272C } from './kho-272c.js';
import { K260 } from './kho-260.js';
import { K261 } from './kho-261.js';
import { K262 } from './kho-262.js';
import { K263 } from './kho-263.js';
import { K264 } from './kho-264.js';
import { KSOP, KLUONG } from './kho-luong.js';

export const RAW_KHO_QT = [...K272A, ...K272B, ...K272C, ...K260, ...K261, ...K262, ...K263, ...K264, ...KSOP];
export const RAW_KHO_LUONG = [...KLUONG];
