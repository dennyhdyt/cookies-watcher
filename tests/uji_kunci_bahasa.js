// Memastikan kamus Indonesia dan Inggris punya kunci yang sama,
// dan setiap kunci yang dipakai di kode ada di kamus (supaya tidak muncul tulisan "abc.xyz" mentah).
const fs = require('fs'), vm = require('vm'), path = require('path');
const akar = path.join(__dirname, '..');
const ctx = { chrome: { storage: { local: { get: async () => ({}), set() {} }, onChanged: { addListener() {} } } }, navigator: { language: 'id' } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(akar, 'bahasa.js'), 'utf8') + ';this.K = KAMUS', ctx);
const id = Object.keys(ctx.K.id), en = Object.keys(ctx.K.en);
const masalah = [];
for (const k of id) if (!en.includes(k)) masalah.push('hanya di Indonesia: ' + k);
for (const k of en) if (!id.includes(k)) masalah.push('hanya di Inggris: ' + k);
const kode = ['popup.js', 'popup.html', 'background.js', 'umum.js', 'ekstensi.js'].map((f) => fs.readFileSync(path.join(akar, f), 'utf8')).join('\n');
const dipakai = new Set([...kode.matchAll(/(?:tr\(|data-i18n(?:-placeholder|-aria)?=)\s*"([a-zA-Z0-9_.]+)"/g)].map((m) => m[1]));
for (const k of dipakai) if (!k.endsWith('.') && !id.includes(k)) masalah.push('dipakai tapi tidak ada di kamus: ' + k);
for (const s of ['startup', 'jendela', 'manual', 'tab', 'darurat']) if (!id.includes('bersih.sumber.' + s)) masalah.push('sumber riwayat tanpa teks: ' + s);
masalah.forEach((m) => console.log('GAGAL ' + m));
console.log(masalah.length === 0 ? 'UJI_KUNCI_OK (' + id.length + ' kunci)' : 'UJI_KUNCI_ADA_MASALAH ' + masalah.length);
if (masalah.length) process.exitCode = 1;
