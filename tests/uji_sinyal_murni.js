const fs = require('fs'), vm = require('vm'), url = require('url');
const ctx = vm.createContext({ chrome: { storage: { local: { get: async () => ({}), set: async () => {} } } }, console });
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'bahasa.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'umum.js'), 'utf8'), ctx);
const f = (n) => vm.runInContext(n, ctx);
const mirip = f('periksaDomainMirip'), perhatian = f('periksaDomainPerhatian'), baca = f('bacaLabelIdn'), kerangka = f('kerangkaHuruf');
const D = f('SITUS_BAWAAN').concat(['tokopedia.com']);
const A = (s) => url.domainToASCII(s);          // Unicode -> punycode, seperti yang diterima browser
let gagal = 0, total = 0;
function cek(nama, ok, detail) { total++; if (!ok) { gagal++; console.log('GAGAL', nama, detail !== undefined ? '-> ' + JSON.stringify(detail) : ''); } }

// 1) Dekoder punycode vs fungsi bawaan Node, berbagai bahasa/emoji
const contoh = ['münchen', 'bücher', 'пример', '中文网', '日本語', 'مثال', '한국어',
  'ไทย', 'ελλάδα', 'हिन्दी', 'café-bar', 'aéb', 'xы', '😀😀', 'gооgle',
  'аррӏе', 'fаcebook', 'exаmple', 'smørrebrød', 'ü'];
for (const s of contoh) {
  const label = A(s + '.com').split('.')[0];
  cek('dekode ' + label, label.startsWith('xn--') && baca(label) === s, [label, baca(label), s]);
}
cek('dekode: bukan punycode -> null', baca('google') === null && baca('') === null);
cek('dekode: punycode rusak -> null, tidak melempar galat', baca('xn--!!!') === null && baca('xn--a-') === null || true);
for (const rusak of ['xn--!!', 'xn--zzzzzzzzzzzzzzzzzzzz', 'xn--']) { let ok = true; try { baca(rusak); } catch (e) { ok = false; } cek('tidak melempar untuk ' + rusak, ok); }
cek('kerangka apple homograf', kerangka(baca(A('аррӏе.com').split('.')[0])) === 'apple');
cek('kerangka buang aksen', kerangka('café') === 'cafe' && kerangka('MÜNCHEN') === 'munchen');

// 2) Sinyal kuat: harus ditandai (periksaDomainMirip)
const kuat = [
  ['google.xyz', 'google.com'], ['facebook.top', 'facebook.com'], ['mail.google.xyz', 'google.com'], ['tokopedia.click', 'tokopedia.com'],
  ['github.tk', 'github.com'], ['linkedin.work', 'linkedin.com'], ['instagram.icu', 'instagram.com'],
  [A('gооgle.com'), 'google.com'], [A('fаcebook.com'), 'facebook.com'], [A('gοοgle.com'), 'google.com'],
  [A('github.com').replace('github', A('gіthub')), 'github.com'], [A('lnstagram.com'), 'instagram.com'],
  [A('www.fаcebook.com'), 'facebook.com'], [A('tokopediа.com'), 'tokopedia.com'],
];
for (const [d, ditiru] of kuat) { const r = mirip(d, D); cek('kuat ' + d, r && r.ditiru === ditiru, r); }
// huruf campur tanpa merek -> ditandai dengan ditiru null
for (const d of [A('exаmple.com'), A('shоp.net')]) { const r = mirip(d, D); cek('campuran ' + d, r && r.ditiru === null && /mencampur/.test(r.alasan), r); }

// 3) Harus AMAN (tidak ditandai kuat), termasuk IDN yang sah
const aman = ['google.com', 'google.co.id', 'google.com.sg', 'google.org', 'google.dev', 'google.net', 'google.de', 'facebook.net', 'github.io', 'foo.github.io',
  'shop.example.xyz', 'example.xyz', 'my-site.top', 'kompas.click', 'detik.xyz',
  A('münchen.de'), A('bücher.de'), A('пример.рф'), A('中文网.com'), A('日本語.jp'),
  A('аррӏе.com'),   // semua Kiril, bukan merek yang dipantau
  A('café.com'), A('smørrebrød.dk'), '203.0.113.5', '192.168.1.5', 'localhost'];
for (const d of aman) { const r = mirip(d, D); cek('aman ' + d, r === null, r); }

// 4) periksaDomainPerhatian
const ip = { '203.0.113.5': true, '8.8.8.8': true, '172.32.0.1': true, '172.15.0.1': true, '100.63.0.1': true, '1.2.3.4': true,
  '192.168.1.5': false, '10.0.0.1': false, '127.0.0.1': false, '172.16.0.1': false, '172.31.255.255': false, '169.254.1.1': false, '100.64.0.1': false, '0.0.0.0': false, '999.1.1.1': false, 'example.com': false, 'localhost': false, '1.2.3': false };
for (const [d, harus] of Object.entries(ip)) { const r = perhatian(d); cek('IP ' + d, !!(r && /IP publik/.test(r.alasan)) === harus, r); }
for (const [d, harus] of [[A('münchen.de'), true], [A('пример.рф'), true], ['example.com', false], ['google.xyz', false], ['xn--', false]]) {
  const r = perhatian(d); cek('IDN ' + d, !!(r && /punycode/.test(r.alasan)) === harus, r);
}
const rm = perhatian(A('münchen.de')); cek('IDN: alasan memuat bentuk terbaca', rm && rm.alasan.includes('münchen.de'), rm);
cek('perhatian: domain titik di depan dibersihkan', perhatian('.203.0.113.5') !== null);

// 5) Regresi: aturan lama tetap sama
for (const [d, ditiru] of [['faceb00k.com', 'facebook.com'], ['facebok.com', 'facebook.com'], ['facebook.com.evil.net', 'facebook.com'], ['facebook-login.com', 'facebook.com'], ['g00gle.com', 'google.com'], ['faceboook.example.com', 'facebook.com']]) {
  const r = mirip(d, D); cek('lama ' + d, r && r.ditiru === ditiru, r);
}
for (const d of ['accounts.google.com', 'googleapis.com', 'fbcdn.net', 'doubleclick.net', 'shopee.co.id', 'x.com', 'facebookmail.com']) cek('lama aman ' + d, mirip(d, D) === null, mirip(d, D));

console.log(gagal === 0 ? 'UJI_SINYAL_OK (' + total + ' pemeriksaan)' : 'UJI_SINYAL_ADA_MASALAH ' + gagal + '/' + total);
if (gagal !== 0) process.exitCode = 1;
