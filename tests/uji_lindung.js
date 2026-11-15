// Menguji pilihan per situs (rapikanPengaturanSitus) dan penilaian nama cookie (jenisNamaCookie), tanpa browser.
const fs = require('fs'), vm = require('vm'), path = require('path');
const akar = path.join(__dirname, '..');
const ctx = { chrome: { storage: { local: { get: async () => ({}), set() {} }, onChanged: { addListener() {} } } }, navigator: { language: 'id' }, URL };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(akar, 'bahasa.js'), 'utf8') + fs.readFileSync(path.join(akar, 'umum.js'), 'utf8') +
  ';this.R = rapikanPengaturanSitus; this.J = jenisNamaCookie; this.N = namaLoginUntuk; this.JK = jenisNamaKunci;', ctx);
let gagal = 0, total = 0;
const cek = (n, k, d) => { total++; if (!k) { gagal++; console.log('GAGAL ' + n + ' -> ' + JSON.stringify(d)); } };
const R = (x) => JSON.parse(JSON.stringify(ctx.R(x)));

cek('data kosong/rusak -> kosong', JSON.stringify(R(null)) === '{}' && JSON.stringify(R('x')) === '{}' && JSON.stringify(R([1])) === '{}' && JSON.stringify(R(5)) === '{}');
const baik = R({ 'Discord.com': { nama: ['Token', 'token', 'sid_1'], semua: true, origins: ['https://discord.com', 'https://app.discord.com/x'] } });
cek('nama dikecilkan, duplikat dibuang, kunci dikecilkan', JSON.stringify(baik['discord.com'].nama) === '["token","sid_1"]', baik);
cek('origin dirapikan (tanpa path), subdomain situs sendiri diterima', JSON.stringify(baik['discord.com'].origins) === '["https://discord.com","https://app.discord.com"]', baik);
cek('semua true dibaca', baik['discord.com'].semua === true);
const jahat = R({ 'discord.com': { nama: [], semua: false, origins: ['https://evil.com', 'javascript:alert(1)', 'https://discord.com.evil.com', 'file:///etc', 'bukan-url'] } });
cek('origin situs lain / skema berbahaya / mirip tapi beda domain ditolak, entri kosong dibuang', JSON.stringify(jahat) === '{}', jahat);
cek('situs terlalu umum ditolak', JSON.stringify(R({ 'co.id': { nama: ['a'] }, 'com': { semua: true } })) === '{}');
cek('nama cookie aneh ditolak', JSON.stringify(R({ 'a.com': { nama: ['ok_1', 'a b', '<script>', 'x;y', ''] } })['a.com'].nama) === '["ok_1"]');
cek('semua bukan boolean true diabaikan', R({ 'a.com': { nama: ['x'], semua: 'ya' } })['a.com'].semua === false);
cek('batas 10 origin', R({ 'a.com': { origins: Array.from({ length: 30 }, (_, i) => 'https://s' + i + '.a.com') } })['a.com'].origins.length === 10);
cek('batas 30 nama', R({ 'a.com': { nama: Array.from({ length: 60 }, (_, i) => 'n' + i) } })['a.com'].nama.length === 30);

const K = R({ 'a.com': { kunci: ['token', 'Token', 'token', '', 5, null, 'x'.repeat(201), 'ok key'] } });
cek('kunci localStorage: peka huruf besar, duplikat/kosong/bukan-teks/terlalu panjang dibuang', JSON.stringify(K['a.com'].kunci) === '["token","Token","ok key"]', K);
cek('batas 30 kunci', R({ 'a.com': { kunci: Array.from({ length: 60 }, (_, i) => 'k' + i) } })['a.com'].kunci.length === 30);
cek('entri hanya berisi kunci dipertahankan', JSON.stringify(R({ 'a.com': { kunci: ['t'] } })) === '{"a.com":{"nama":[],"semua":false,"origins":[],"kunci":["t"]}}');
cek('kunci bukan array diabaikan', JSON.stringify(R({ 'a.com': { kunci: 'token' } })) === '{}');

const P = { global: [], perSitus: {} };
const J = (n) => ctx.J(n, 'contoh.com', P);
cek('sessionid = dikenal', J('sessionid') === 'dikenal' && J('SID') === 'dikenal');
cek('auth_token = dikenal', J('auth_token') === 'dikenal');
cek('_ga, _gid, _fbp, __cf_bm = pelacak', ['_ga', '_gid', '_fbp', '__cf_bm', '__dcfduid', '__sdcfduid', '__cfruid', '_gcl_au'].every((n) => J(n) === 'pelacak'), ['_ga', '__dcfduid'].map(J));
cek('next-auth.session-token, sb-x-auth-token, jwt = mirip', ['next-auth.session-token', '__Secure-next-auth.session-token', 'sb-abc-auth-token', 'jwt_user'].every((n) => J(n) === 'mirip'), ['next-auth.session-token', 'sb-abc-auth-token'].map(J));
cek('theme, locale, lang = lain', ['theme', 'locale', 'lang'].every((n) => J(n) === 'lain'));
cek('nama pilihan pengguna menjadi dikenal untuk situs itu saja', ctx.J('rahasia_toko', 'contoh.com', { global: [], perSitus: { 'contoh.com': ['rahasia_toko'] } }) === 'dikenal' && ctx.J('rahasia_toko', 'lain.com', { global: [], perSitus: { 'contoh.com': ['rahasia_toko'] } }) === 'lain');
cek('jenisNamaKunci: token/sesi = mirip, _ga = pelacak, theme = lain', ctx.JK('token') === 'mirip' && ctx.JK('user_id_cache') === 'mirip' && ctx.JK('_ga_x') === 'pelacak' && ctx.JK('theme') === 'lain' && ctx.JK('Zebra') === 'lain');

console.log(gagal === 0 ? 'UJI_LINDUNG_OK (' + total + ' pemeriksaan)' : 'UJI_LINDUNG_ADA_MASALAH ' + gagal);
if (gagal) process.exitCode = 1;
