// Uji keamanan di Chromium sungguhan: izin yang diperkecil, CSP, dan isolasi dari halaman web.
const { chromium } = require('playwright');
const fs = require('fs');
const S = require('./lib').SCRATCH;
const ASLI = require('./lib').REPO;
const hasil = [];
const cek = (nama, ok, detail) => { hasil.push({ nama, ok: !!ok }); console.log((ok ? 'LULUS  ' : 'GAGAL  ') + nama + (ok || detail === undefined ? '' : '\n         -> ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 500))); };
const info = (t) => console.log('INFO   ' + t);
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
async function tunggu(fn, ms = 6000) { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch (e) {} if (Date.now() - t > ms) return false; await tidur(100); } }
function salinProyek(tujuan, ubahManifest) {
  fs.rmSync(tujuan, { recursive: true, force: true }); fs.mkdirSync(tujuan, { recursive: true });
  for (const n of fs.readdirSync(ASLI)) if (n !== '.git') fs.cpSync(ASLI + '/' + n, tujuan + '/' + n, { recursive: true });
  if (ubahManifest) { const p = tujuan + '/manifest.json'; const m = JSON.parse(fs.readFileSync(p, 'utf8')); ubahManifest(m); fs.writeFileSync(p, JSON.stringify(m)); }
  return tujuan;
}
const halamanPalsu = (ctx) => ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>halaman uji</body></html>' }));

(async () => {
  // =============== MODE A: build yang dikirim (management opsional, tanpa tabs) ===============
  fs.rmSync(S + '/profil-aman', { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(S + '/profil-aman', { channel: 'chromium', headless: true,
    args: ['--disable-extensions-except=' + ASLI, '--load-extension=' + ASLI] });
  const diminta = []; ctx.on('requestfinished', (r) => diminta.push(r.url()));
  await halamanPalsu(ctx);
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 15000 }));
  const id = new URL(sw.url()).host;
  const simpan = () => sw.evaluate(() => chrome.storage.local.get(null));
  const peringatan = async () => (await simpan()).peringatan || [];

  const mf = await sw.evaluate(() => chrome.runtime.getManifest());
  cek('A1 izin wajib TIDAK memuat "tabs" dan "management"', !mf.permissions.includes('tabs') && !mf.permissions.includes('management'), mf.permissions);
  cek('A2 "management" hanya sebagai izin opsional', JSON.stringify(mf.optional_permissions) === '["management","browsingData","scripting"]', mf.optional_permissions);
  const aktif = await sw.evaluate(() => chrome.permissions.getAll());
  cek('A3 izin yang benar-benar aktif: hanya cookies, storage, notifications + semua situs', JSON.stringify([...aktif.permissions].sort()) === JSON.stringify(['cookies', 'notifications', 'storage']) && JSON.stringify(aktif.origins) === '["<all_urls>"]', aktif);
  cek('A4 chrome.management.getAll/onInstalled tidak tersedia (belum diizinkan), tetapi service worker tetap hidup', (await sw.evaluate(() => typeof (chrome.management || {}).getAll + typeof (chrome.management || {}).onInstalled)) === 'undefinedundefined' && (await sw.evaluate(() => typeof chrome.cookies.onChanged)) === 'object');
  cek('A4b CSP di manifest terbaca browser', /script-src 'self'/.test(mf.content_security_policy.extension_pages), mf.content_security_policy);

  // Deteksi tab tetap jalan tanpa izin "tabs"
  await ctx.addCookies([{ name: 'sessionid', value: 'v', domain: '.facebook.com', path: '/', secure: true }]);
  await tunggu(async () => (await peringatan()).some((p) => p.jenis === 'sesi'));
  cek('A5 pemantauan cookie sesi tetap jalan setelah izin "tabs" dihapus', (await peringatan()).some((p) => p.jenis === 'sesi' && p.situs === 'facebook.com'));
  const tabFb = await ctx.newPage(); await tabFb.goto('https://www.facebook.com/');
  const alamatTab = await sw.evaluate(() => chrome.tabs.query({}).then((ts) => ts.map((t) => t.url)));
  cek('A6 tanpa izin "tabs", alamat tab situs yang dipantau tetap terbaca (lewat izin situs)', alamatTab.includes('https://www.facebook.com/'), alamatTab);
  const n0 = (await peringatan()).length;
  await ctx.addCookies([{ name: 'xs', value: 'v', domain: '.facebook.com', path: '/', secure: true }]);
  await tidur(800);
  cek('A7 tab terbuka -> perubahan cookie sesi dianggap wajar (tanpa peringatan)', (await peringatan()).length === n0);
  await tabFb.close();
  await ctx.addCookies([{ name: 'c_user', value: 'v', domain: '.facebook.com', path: '/', secure: true }]);
  await tunggu(async () => (await peringatan()).some((p) => p.nama === 'c_user'));
  cek('A8 tab ditutup -> cookie sesi baru kembali memicu peringatan', (await peringatan()).some((p) => p.nama === 'c_user'));

  // Popup tanpa izin management
  const galat = [];
  const popup = await ctx.newPage();
  popup.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
  popup.on('console', (m) => { if (m.type() === 'error' && !/Content Security Policy|Failed to load resource/.test(m.text())) galat.push('console: ' + m.text()); });
  popup.on('dialog', (d) => d.accept());
  await popup.setViewportSize({ width: 420, height: 1000 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.click('#tab-ekstensi'); await popup.waitForSelector('#izinEkstensi button');
  const teksIzin = await popup.locator('#izinEkstensi').innerText();
  cek('A9 popup menjelaskan pemeriksaan ekstensi belum aktif dan menawarkan tombol aktivasi', /belum aktif/.test(teksIzin) && /Aktifkan pemeriksaan ekstensi/.test(teksIzin), teksIzin);
  cek('A10 ...tanpa daftar ekstensi dan tanpa galat', (await popup.locator('#daftarEkstensi').innerText()) === '' && galat.length === 0, galat);
  cek('A10b bagian lain popup tetap jalan (peringatan cookie sesi tampil)', /facebook\.com - sessionid|facebook\.com - c_user/.test(await popup.locator('#peringatan').textContent()));

  await popup.click('#izinEkstensi button');
  let hasilIzin = 'menggantung';
  const mulai = Date.now();
  while (Date.now() - mulai < 8000) {
    const t = await popup.locator('#izinEkstensi').innerText();
    if (/Izin tidak diberikan/.test(t)) { hasilIzin = 'ditolak'; break; }
    if (/Matikan pemeriksaan ekstensi/.test(t)) { hasilIzin = 'diberikan'; break; }
    await tidur(150);
  }
  info('klik "Aktifkan pemeriksaan ekstensi" di Chromium headless -> ' + hasilIzin + (hasilIzin === 'menggantung' ? ' (kotak izin bawaan browser tidak bisa diklik oleh uji otomatis)' : ''));
  if (hasilIzin === 'diberikan') {
    cek('A11 setelah diizinkan: popup menampilkan hasil pemeriksaan dan tombol "Matikan"', /Tidak ada ekstensi lain/.test(await popup.locator('#daftarEkstensi').innerText()));
    await popup.getByText('Matikan pemeriksaan ekstensi').click();
    await tunggu(async () => /belum aktif/.test(await popup.locator('#izinEkstensi').innerText()));
    cek('A12 "Matikan" mencabut izin dan popup kembali ke keadaan belum aktif', /belum aktif/.test(await popup.locator('#izinEkstensi').innerText()));
  } else if (hasilIzin === 'ditolak') {
    cek('A11 izin ditolak -> pesan jelas dan popup tetap stabil', /Izin tidak diberikan/.test(await popup.locator('#izinEkstensi').innerText()) && galat.length === 0, galat);
  } else {
    cek('A11 popup tetap stabil walau kotak izin tidak terjawab', galat.length === 0, galat);
  }

  // CSP: kode asing tidak bisa jalan di halaman ekstensi
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.click('#tab-bersih');
  const csp = await popup.evaluate(() => {
    const h = {};
    const s = document.createElement('script'); s.textContent = 'window.__inline = 1'; document.body.append(s);
    h.inline = window.__inline === 1;
    return h;
  });
  cek('A13 CSP memblokir script inline di popup (eval tidak diuji: evaluate() Playwright melewati CSP)', !csp.inline, csp);
  const luar = await popup.evaluate(() => new Promise((r) => { const s = document.createElement('script'); s.src = 'https://skrip-jahat.test/x.js'; s.onload = () => r('dimuat'); s.onerror = () => r('diblokir'); document.head.append(s); }));
  cek('A14 skrip dari alamat luar diblokir dan tidak pernah diminta ke jaringan', luar === 'diblokir' && !diminta.some((u) => /skrip-jahat/.test(u)), [luar, diminta.filter((u) => /skrip-jahat/.test(u))]);

  // Isolasi dari halaman web biasa
  const jahat = await ctx.newPage(); await jahat.goto('https://halaman-jahat.test/');
  const baca = await jahat.evaluate(async (i) => { try { await fetch('chrome-extension://' + i + '/popup.html'); return 'terbaca'; } catch (e) { return 'ditolak'; } }, id);
  cek('A15 halaman web tidak bisa membaca popup.html ekstensi lewat fetch', baca === 'ditolak', baca);
  await jahat.evaluate((i) => { const f = document.createElement('iframe'); f.src = 'chrome-extension://' + i + '/popup.html'; document.body.append(f); }, id);
  await tidur(1500);
  let bocor = false;
  for (const fr of jahat.frames()) { try { if (/Pemantau Cookies/.test(await fr.content())) bocor = true; } catch (e) {} }
  cek('A16 halaman web tidak bisa menyematkan popup.html ekstensi dalam iframe', !bocor);
  const kirim = await jahat.evaluate(() => typeof (window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage));
  cek('A17 halaman web tidak punya jalur kirim pesan ke ekstensi (runtime.sendMessage tidak tersedia)', kirim === 'undefined', kirim);
  cek('A18 tidak ada galat JavaScript di popup selama uji', galat.length === 0, galat);
  await ctx.close();

  // =============== MODE B: nama ekstensi lain berisi HTML berbahaya ===============
  const varian = salinProyek(S + '/ext-b', (m) => { m.permissions.push('management'); m.optional_permissions = []; });
  const PAYLOAD = '<img src=x onerror="window.__pwn=1">Penyedot';
  const palsu = S + '/ekstensi-xss'; fs.mkdirSync(palsu, { recursive: true });
  fs.writeFileSync(palsu + '/manifest.json', JSON.stringify({ name: PAYLOAD + ' Palsu', version: '1.0', manifest_version: 3, permissions: ['cookies'], host_permissions: ['<all_urls>'] }));
  fs.rmSync(S + '/profil-aman-b', { recursive: true, force: true });
  const ctxB = await chromium.launchPersistentContext(S + '/profil-aman-b', { channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${varian},${palsu}`, `--load-extension=${varian},${palsu}`] });
  const swB = ctxB.serviceWorkers()[0] || (await ctxB.waitForEvent('serviceworker', { timeout: 15000 }));
  const idB = new URL(swB.url()).host;
  const popB = await ctxB.newPage();
  const galatB = []; popB.on('pageerror', (e) => galatB.push(e.message));
  await popB.goto(`chrome-extension://${idB}/popup.html`);
  await popB.click('#tab-ekstensi'); await tunggu(async () => /Penyedot/.test(await popB.locator('#daftarEkstensi').innerText()));
  const teksB = await popB.locator('#daftarEkstensi').innerText();
  cek('B1 nama ekstensi berisi HTML ditampilkan sebagai TEKS apa adanya (bukan dijalankan)', teksB.includes(PAYLOAD), teksB);
  cek('B2 tidak ada elemen <img> yang tercipta, dan kode di dalamnya tidak jalan', (await popB.locator('#daftarEkstensi img').count()) === 0 && (await popB.evaluate(() => window.__pwn)) === undefined);
  cek('B3 tidak ada galat JavaScript', galatB.length === 0, galatB);
  await ctxB.close();

  fs.rmSync(S + '/ext-b', { recursive: true, force: true });
  const gagal = hasil.filter((h) => !h.ok);
  console.log('\nRINGKASAN KEAMANAN: ' + (hasil.length - gagal.length) + '/' + hasil.length + ' lulus');
  process.exit(gagal.length ? 1 : 0);
})().catch((e) => { console.log('BERHENTI:', e.stack.split('\n').slice(0, 7).join('\n')); process.exit(2); });
