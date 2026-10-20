import crypto from 'node:crypto';
import { getJSON, setJSON, sadd } from './store.js';
import { getSettings } from './settings.js';
import { MAX_PIN_FAILS, today, clean, userKey, hashPin } from './util.js';

// Xác thực Họ tên + Phòng ban + PIN. create=true: lần đầu sẽ tạo tài khoản với PIN vừa nhập.
export async function verifyUser(body, { create = false } = {}) {
  const name = clean(body.name);
  const dept = body.dept;
  const pin = String(body.pin || '');
  if (name.length < 2 || name.length > 60) return { status: 400, error: 'Vui lòng nhập họ tên hợp lệ.' };
  if (!dept || typeof dept !== 'string' || (create && !(await getSettings()).depts.includes(dept))) return { status: 400, error: 'Vui lòng chọn phòng ban.' };
  if (!/^\d{4}$/.test(pin)) return { status: 400, error: 'Mã PIN gồm đúng 4 chữ số.' };

  const uk = userKey(name, dept);
  const failKey = `pinfail:${today()}:${uk}`;
  const fails = (await getJSON(failKey)) || 0;
  if (fails >= MAX_PIN_FAILS) {
    return { status: 429, error: `Bạn đã nhập sai PIN ${MAX_PIN_FAILS} lần hôm nay. Vui lòng liên hệ quản trị viên để đặt lại PIN.` };
  }
  const key = `user:${uk}`;
  let user = await getJSON(key);
  if (!user || !user.pinHash) {
    if (!create) return { status: 404, error: 'Chưa có tài khoản hoặc PIN vừa được đặt lại. Hãy vào "Làm bài" để đặt PIN.' };
    const salt = crypto.randomBytes(16).toString('hex');
    user = { ...(user || {}), name, dept, salt, pinHash: hashPin(pin, salt), createdAt: user?.createdAt || Date.now(), pinSetAt: Date.now() };
    await setJSON(key, user);
    await sadd('users', uk);
    return { ok: true, uk, user, firstTime: true };
  }
  if (hashPin(pin, user.salt) !== user.pinHash) {
    await setJSON(failKey, fails + 1, 60 * 60 * 48);
    const left = MAX_PIN_FAILS - fails - 1;
    return { status: 401, error: left > 0 ? `Mã PIN không đúng. Bạn còn ${left} lần thử.` : 'Mã PIN không đúng. Tài khoản đã bị tạm khóa hôm nay, vui lòng liên hệ quản trị viên.' };
  }
  return { ok: true, uk, user, firstTime: false };
}
