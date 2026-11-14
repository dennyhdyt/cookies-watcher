// Menguji aturan penilaian ekstensi lain (periksaEkstensi) tanpa browser.
const fs = require('fs'), vm = require('vm'), path = require('path');
const akar = path.join(__dirname, '..');
const ctx = { chrome: { runtime: { id: 'diri' }, storage: { local: { get: async () => ({}), set() {} }, onChanged: { addListener() {} } } }, navigator: { language: 'id' } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(akar, 'bahasa.js'), 'utf8') + fs.readFileSync(path.join(akar, 'ekstensi.js'), 'utf8') +
  ';this.P = periksaEkstensi; this.B = bisaDiperiksa;', ctx);
let gagal = 0, total = 0;
const cek = (nama, kondisi, d) => { total++; if (!kondisi) { gagal++; console.log('GAGAL ' + nama + ' -> ' + JSON.stringify(d)); } };
const p = (info) => ctx.P(Object.assign({ permissions: [], hostPermissions: [], installType: 'normal' }, info));

cek('biasa tanpa izin: aman', p({}).alasan.length === 0);
cek('cookies + semua situs: tinggi', p({ permissions: ['cookies'], hostPermissions: ['<all_urls>'] }).tinggi === true);
cek('cookies situs tertentu: sedang', (() => { const h = p({ permissions: ['cookies'], hostPermissions: ['https://a.com/*'] }); return h.alasan.length === 1 && !h.tinggi; })());
cek('sideload: tinggi', (() => { const h = p({ installType: 'sideload' }); return h.tinggi && /program lain/.test(h.alasan[0]); })());
cek('admin/kebijakan: tinggi', (() => { const h = p({ installType: 'admin' }); return h.tinggi && /kebijakan/.test(h.alasan[0]); })());
cek('nativeMessaging: sedang', (() => { const h = p({ permissions: ['nativeMessaging'] }); return h.alasan.length === 1 && !h.tinggi && /nativeMessaging/.test(h.alasan[0]); })());
cek('development (unpacked sendiri): tidak ditandai sendirian', p({ installType: 'development' }).alasan.length === 0);
cek('other: tidak ditandai', p({ installType: 'other' }).alasan.length === 0);
cek('gabungan: sideload + native + cookies semua = 3 alasan', (() => { const h = p({ installType: 'sideload', permissions: ['nativeMessaging', 'cookies'], hostPermissions: ['*://*/*'] }); return h.alasan.length === 3 && h.tinggi; })());
cek('ekstensi ini sendiri dan yang nonaktif tidak diperiksa', !ctx.B({ type: 'extension', enabled: true, id: 'diri' }) && !ctx.B({ type: 'extension', enabled: false, id: 'x' }) && ctx.B({ type: 'extension', enabled: true, id: 'x' }));
console.log(gagal === 0 ? 'UJI_EKSTENSI_OK (' + total + ' pemeriksaan)' : 'UJI_EKSTENSI_ADA_MASALAH ' + gagal);
if (gagal) process.exitCode = 1;
