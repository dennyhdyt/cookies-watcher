// Menguji masukan jahat/aneh yang bisa dikendalikan situs web (nama cookie, domain, nama kunci)
// atau data penyimpanan yang rusak: tidak boleh melempar galat, macet, atau mencemari objek.
const fs = require('fs'), vm = require('vm'), path = require('path');
const akar = path.join(__dirname, '..');
const ctx = { chrome: { storage: { local: { get: async () => ({}), set() {} }, onChanged: { addListener() {} } } }, navigator: { language: 'id' }, URL };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(akar, 'bahasa.js'), 'utf8') + fs.readFileSync(path.join(akar, 'umum.js'), 'utf8') +
  ';this.R = rapikanPengaturanSitus; this.JC = jenisNamaCookie; this.JK = jenisNamaKunci; this.M = periksaDomainMirip; this.CD = cocokDomain; this.BD = bersihkanDomain; this.DU = domainUtama; this.SA = situsDariAlamat; this.TU = terlaluUmum; this.NL = namaLoginUntuk; this.TR = tr; this.PL = pangkasTeks;', ctx);
let gagal = 0;
const cek = (n, k, d) => { if (!k) { gagal++; console.log('GAGAL ' + n + ' -> ' + JSON.stringify(d)); } };
// Menjalankan fungsi dan memastikan tidak melempar galat dan selesai cepat (anti macet / ReDoS).
const aman = (nama, f, batasMs = 300) => {
  const t = Date.now();
  try { f(); } catch (e) { cek(nama + ' tidak melempar galat', false, String(e)); return; }
  const d = Date.now() - t;
  cek(nama + ' selesai cepat (' + d + ' ms)', d <= batasMs, d);
};

const panjang = 'a'.repeat(100000), tanda = 'a-'.repeat(50000) + 'a';
const aneh = ['', ' ', '\0', '‮.com', 'xn--', 'a..b', '.'.repeat(5000), 'é'.repeat(300) + '.com', '<img src=x onerror=alert(1)>.com',
  'faceb00k.com', 'FACEBOOK.COM.', 'gооgle.com', '😀.com', '[::1]', '1.2.3.4', panjang, tanda + '.com', 'a.'.repeat(3000) + 'com'];
const situsPantau = ['facebook.com', 'google.com', 'github.com'];
for (const d of aneh) {
  const ket = JSON.stringify(d.slice(0, 20)) + '(' + d.length + ')';
  aman('periksaDomainMirip ' + ket, () => ctx.M(d, situsPantau));
  aman('cocokDomain ' + ket, () => ctx.CD(d, 'facebook.com'));
  aman('bersihkanDomain ' + ket, () => ctx.BD(d));
  aman('domainUtama ' + ket, () => ctx.DU(d));
  aman('jenisNamaCookie ' + ket, () => ctx.JC(d, 'a.com', { global: [], perSitus: {} }));
  aman('jenisNamaKunci ' + ket, () => ctx.JK(d));
  aman('situsDariAlamat ' + ket, () => ctx.SA('https://' + d + '/x'));
}
for (const a of [null, undefined, 5, {}, [], 'tidak-url', 'javascript:alert(1)', 'chrome://settings', 'data:text/html,x', 'https://' + panjang]) {
  aman('situsDariAlamat ' + JSON.stringify(String(a).slice(0, 25)), () => ctx.SA(a));
}

// Pencemaran prototipe lewat kunci berbahaya di data tersimpan.
const kotor = JSON.parse('{"__proto__":{"nama":["x"],"semua":true},"constructor":{"nama":["x"]},"prototype":{"semua":true},"a.com":{"nama":["ok1"],"__proto__":{"semua":true}}}');
let hasil;
aman('rapikanPengaturanSitus kunci __proto__/constructor', () => { hasil = ctx.R(kotor); });
cek('objek dasar tidak tercemar', ({}).semua === undefined && ({}).nama === undefined && Object.prototype.semua === undefined);
cek('kunci berbahaya tidak lolos sebagai situs', hasil && !Object.prototype.hasOwnProperty.call(hasil, '__proto__') && !Object.prototype.hasOwnProperty.call(hasil, 'constructor') && !Object.prototype.hasOwnProperty.call(hasil, 'prototype'), hasil && Object.keys(hasil));
cek('entri a.com tidak ikut kebagian semua=true dari __proto__', hasil && hasil['a.com'] && hasil['a.com'].semua === false, hasil && hasil['a.com']);

// Data penyimpanan rusak / sangat besar.
const besar = {};
for (let i = 0; i < 5000; i++) besar['s' + i + '.com'] = { nama: Array.from({ length: 100 }, (_, j) => 'n' + j), origins: ['https://s' + i + '.com'], kunci: Array.from({ length: 100 }, (_, j) => 'k' + j) };
aman('rapikanPengaturanSitus 5000 situs', () => { ctx.R(besar); }, 1500);
cek('batasan 30 nama / 30 kunci tetap berlaku pada data besar', (() => { const r = ctx.R(besar); const k = Object.keys(r); return k.length > 0 && k.every((s) => r[s].nama.length <= 30 && r[s].kunci.length <= 30 && r[s].origins.length <= 10); })());
for (const x of [undefined, null, 0, 1, true, 'x', [], [[]], { a: 1 }, { 'a.com': null }, { 'a.com': 'x' }, { 'a.com': { nama: 'x', origins: 5, kunci: { a: 1 } } }, { 'a.com': { nama: [null, 1, {}], origins: [null, 1, {}], kunci: [null, 1, {}] } }]) {
  aman('rapikanPengaturanSitus ' + JSON.stringify(x), () => ctx.R(x));
}

// Pemangkasan teks yang berasal dari situs (nama cookie, domain) sebelum disimpan sebagai peringatan.
cek('pangkasTeks memotong teks sangat panjang', ctx.PL && ctx.PL(panjang, 200).length <= 200, ctx.PL && ctx.PL(panjang, 200).length);
cek('pangkasTeks aman untuk bukan-teks', ctx.PL && ctx.PL(null, 10) === '' && ctx.PL(undefined, 10) === '' && ctx.PL(123, 10) === '123');
cek('pangkasTeks membuang karakter kontrol', ctx.PL && ctx.PL('a\u0000b\u0007c\nd', 50) === 'abcd', ctx.PL && ctx.PL('a\u0000b\u0007c\nd', 50));

// Penerjemahan dengan parameter berbahaya tidak menyisipkan HTML atau melempar galat.
aman('tr dengan parameter jahat', () => { ctx.TR('b.sesi.alasan', { s: '<img src=x onerror=alert(1)>' }); });
aman('tr dengan kunci tidak ada', () => { ctx.TR('kunci.tidak.ada', { a: 1 }); });

console.log(gagal === 0 ? 'UJI_INPUT_JAHAT_OK' : 'ADA ' + gagal + ' GAGAL');
process.exit(gagal ? 1 : 0);
