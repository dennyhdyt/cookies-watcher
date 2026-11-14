const fs = require('fs'), vm = require('vm');
const ctx = vm.createContext({ chrome: { storage: { local: { get: async () => ({}), set: async () => {} } } }, console });
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'bahasa.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'umum.js'), 'utf8'), ctx);
const f = n => vm.runInContext(n, ctx);
const periksa = f('periksaDomainMirip'), D = f('SITUS_BAWAAN').concat(['tokopedia.com']);

const harusDitandai = [
  ['faceb00k.com', 'facebook.com'], ['facebok.com', 'facebook.com'], ['faceboook.com', 'facebook.com'],
  ['facebook.com.evil.net', 'facebook.com'], ['www.facebook.com.login-evil.xyz', 'facebook.com'],
  ['facebook-login.com', 'facebook.com'], ['google-verify.net', 'google.com'], ['googel.com', 'google.com'],
  ['g00gle.com', 'google.com'], ['facebook.evil.com', 'facebook.com'], ['gihtub.com', 'github.com'],
  ['tok0pedia.com', 'tokopedia.com'], ['linkedln.com', 'linkedin.com'], ['1nstagram.com', 'instagram.com'],
  ['notfacebook.com', 'facebook.com'],
];
const harusAman = [
  'facebook.com', 'm.facebook.com', 'accounts.google.com', 'google.co.id', 'google.com.sg', 'www.google.co.id',
  'googleapis.com', 'fonts.gstatic.com', 'foo.github.io', 'raw.githubusercontent.com', 'fbcdn.net', 'static.xx.fbcdn.net',
  'doubleclick.net', 'tokopedia.com', 'shopee.co.id', 'bca.co.id', 'detik.com', 'kompas.com', 'gitlab.com',
  'microsoft.com', 'localhost', '127.0.0.1', '192.168.1.5', 'ads.tracker-cdn.net', 'cdn.jsdelivr.net',
  'facebookmail.com', 'youtube-nocookie.com', 'cdninstagram.com', 'x.com', 'twimg.com',
];
let gagal = 0;
for (const [d, ditiru] of harusDitandai) {
  const r = periksa(d, D);
  if (!r || r.ditiru !== ditiru) { gagal++; console.log('TIDAK TERDETEKSI:', d, '->', JSON.stringify(r)); }
}
for (const d of harusAman) {
  const r = periksa(d, D);
  if (r) { gagal++; console.log('SALAH TANDA (false positive):', d, '->', r.alasan); }
}
// celah yang diketahui: nama merek persis di akhiran lain
for (const d of ['google.xyz', 'facebook.top']) console.log('catatan celah:', d, '->', JSON.stringify(periksa(d, D)));

// fungsi waktu & pengelompokan
const sekarang = Date.UTC(2026, 10, 11, 12);
const rel = f('waktuRelatif'), h = 86400000;
const cek = [
  rel(0, sekarang) === 'belum pernah', rel(sekarang - 3600000, sekarang) === 'hari ini',
  rel(sekarang - h, sekarang) === 'kemarin', rel(sekarang - 5 * h, sekarang) === '5 hari lalu',
];
const kel = f('kelompokkanHalaman')(f('HALAMAN_BAWAAN'), f('SITUS_BAWAAN'));
cek.push(kel.size === 6, [...kel.values()].some(x => x.join() === 'google.com,youtube.com'));
const hal = Object.assign({}, f('HALAMAN_BAWAAN'), { 'tokopedia.com': 'https://www.tokopedia.com/akun' });
const kel2 = f('kelompokkanHalaman')(hal, D);
const terl = f('kelompokTerlambat')(kel2, { 'google.com': sekarang - 2 * h, 'github.com': sekarang - 10 * h, 'tokopedia.com': sekarang }, 7, sekarang);
const namaTerl = terl.map(([u, s]) => s.join('/')).sort();
cek.push(!namaTerl.includes('google.com/youtube.com'), namaTerl.includes('github.com'), !namaTerl.includes('tokopedia.com'), namaTerl.includes('facebook.com'));
const ns = f('namaSesiUntuk');
const p = { global: ['gg'], perSitus: { 'tokopedia.com': ['_tkp'] } };
cek.push(ns('tokopedia.com', p).includes('_tkp'), !ns('facebook.com', p).includes('_tkp'), ns('facebook.com', p).includes('gg'), ns(null, p).includes('sessionid'));
if (cek.some(x => !x)) { gagal++; console.log('FUNGSI WAKTU/KELOMPOK GAGAL', JSON.stringify(cek)); }
console.log(gagal === 0 ? 'UJI_MURNI_OK (' + (harusDitandai.length + harusAman.length + cek.length) + ' pemeriksaan)' : 'UJI_MURNI_ADA_MASALAH ' + gagal);
if (gagal !== 0) process.exitCode = 1;
