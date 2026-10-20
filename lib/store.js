// Lưu trữ: Upstash Redis (REST) khi có biến môi trường; nếu không, dùng bộ nhớ tạm (chỉ để chạy thử).
// Nhận cả tên biến có tiền tố do Vercel tự thêm (VD: STORAGE_KV_REST_API_URL)
function findEnv(suffixes) {
  for (const s of suffixes) if (process.env[s]) return process.env[s];
  const k = Object.keys(process.env).find((n) => suffixes.some((s) => n.endsWith('_' + s)));
  return k ? process.env[k] : '';
}
const URL_ = findEnv(['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL']);
const TOKEN = findEnv(['KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN']);
export const hasDb = Boolean(URL_ && TOKEN);
// Trên Vercel bắt buộc phải có Redis (mỗi API chạy trên máy chủ riêng, không dùng chung bộ nhớ)
export const dbRequiredButMissing = Boolean(process.env.VERCEL) && !hasDb;

const mem = (globalThis.__tngMem ||= { kv: new Map(), h: new Map(), s: new Map() });
const headers = () => ({ Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' });

async function redis(args) {
  const r = await fetch(URL_, { method: 'POST', headers: headers(), body: JSON.stringify(args) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
async function pipeline(cmds) {
  if (!cmds.length) return [];
  const r = await fetch(`${URL_}/pipeline`, { method: 'POST', headers: headers(), body: JSON.stringify(cmds) });
  const j = await r.json();
  return j.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}
const parseHash = (arr) => {
  const out = [];
  for (let i = 1; i < (arr || []).length; i += 2) out.push(JSON.parse(arr[i]));
  return out;
};
function memGet(key) {
  const e = mem.kv.get(key);
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) { mem.kv.delete(key); return null; }
  return JSON.parse(e.v);
}

export async function getJSON(key) {
  if (hasDb) { const v = await redis(['GET', key]); return v ? JSON.parse(v) : null; }
  return memGet(key);
}
export async function getJSONMany(keys) {
  if (hasDb) return (await pipeline(keys.map((k) => ['GET', k]))).map((v) => (v ? JSON.parse(v) : null));
  return keys.map(memGet);
}
// ttlSec bỏ trống = lưu vĩnh viễn
export async function setJSON(key, value, ttlSec) {
  const s = JSON.stringify(value);
  if (hasDb) return redis(ttlSec ? ['SET', key, s, 'EX', String(ttlSec)] : ['SET', key, s]);
  mem.kv.set(key, { v: s, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 });
}
export async function del(key) {
  if (hasDb) return redis(['DEL', key]);
  mem.kv.delete(key);
}

const LB_TTL = 60 * 60 * 24 * 400; // giữ lịch sử bảng xếp hạng ~13 tháng

export async function hset(key, field, value) {
  const s = JSON.stringify(value);
  if (hasDb) { await pipeline([['HSET', key, field, s], ['EXPIRE', key, String(LB_TTL)]]); return; }
  if (!mem.h.has(key)) mem.h.set(key, new Map());
  mem.h.get(key).set(field, s);
}
export async function hdel(key, field) {
  if (hasDb) return redis(['HDEL', key, field]);
  mem.h.get(key)?.delete(field);
}
export async function hgetall(key) {
  return (await hgetallMany([key]))[0];
}
export async function hgetallMany(keys) {
  if (hasDb) return (await pipeline(keys.map((k) => ['HGETALL', k]))).map(parseHash);
  return keys.map((k) => { const m = mem.h.get(k); return m ? [...m.values()].map((s) => JSON.parse(s)) : []; });
}

export async function sadd(key, member) {
  if (hasDb) return redis(['SADD', key, member]);
  if (!mem.s.has(key)) mem.s.set(key, new Set());
  mem.s.get(key).add(member);
}
export async function smembers(key) {
  if (hasDb) return (await redis(['SMEMBERS', key])) || [];
  return [...(mem.s.get(key) || [])];
}
