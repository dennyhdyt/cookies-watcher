// Uji menyeluruh di Chromium sungguhan: memuat ekstensi, memakai popup lewat klik,
// dan memicu cookie asli lewat API browser.
const { chromium } = require('playwright');
const fs = require('fs');

const S = require('./lib').SCRATCH;
// Versi dengan izin "management" langsung aktif, supaya bagian ekstensi bisa diuji tanpa kotak izin browser.
function buatVarian(tujuan) {
  fs.rmSync(tujuan, { recursive: true, force: true }); fs.mkdirSync(tujuan, { recursive: true });
  for (const n of fs.readdirSync(require('./lib').REPO)) if (n !== '.git') fs.cpSync('/home/claude/pemantau-cookies/' + n, tujuan + '/' + n, { recursive: true });
  const p = tujuan + '/manifest.json'; const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  m.permissions.push('management'); m.optional_permissions = []; fs.writeFileSync(p, JSON.stringify(m));
  return tujuan;
}
const EXT = buatVarian(S + '/ext-dengan-management');
const PALSU = S + '/ekstensi-palsu';

fs.mkdirSync(PALSU, { recursive: true });
fs.writeFileSync(PALSU + '/manifest.json', JSON.stringify({
  name: 'Penyedot Cookie Palsu', version: '1.0', manifest_version: 3,
  permissions: ['cookies'], host_permissions: ['<all_urls>'],
}));
fs.rmSync(S + '/profil-e2e', { recursive: true, force: true });

const hasil = [];
function cek(nama, ok, detail) {
  hasil.push({ nama, ok: !!ok });
  console.log((ok ? 'LULUS  ' : 'GAGAL  ') + nama + (ok || !detail ? '' : '\n         -> ' + String(detail).slice(0, 400)));
}
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
async function tunggu(fn, ms = 6000) {
  const mulai = Date.now();
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch (e) { /* coba lagi */ }
    if (Date.now() - mulai > ms) return false;
    await tidur(100);
  }
}

(async () => {
  const ctx = await chromium.launchPersistentContext(S + '/profil-e2e', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${EXT},${PALSU}`, `--load-extension=${EXT},${PALSU}`],
  });
  await ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>halaman uji</body></html>' }));

  const diminta = [];
  ctx.on('request', (r) => diminta.push(r.url()));
  let sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 15000 }));
  const id = new URL(sw.url()).host;
  const simpan = () => sw.evaluate(() => chrome.storage.local.get(null));
  const notif = () => sw.evaluate(() => globalThis.__notif || []);
  const alarm = () => sw.evaluate(() => chrome.alarms.getAll());
  const badge = () => sw.evaluate(() => chrome.action.getBadgeText({}));

  // Rekam isi notifikasi (tetap dikirim sungguhan).
  await sw.evaluate(() => {
    globalThis.__notif = [];
    const asli = chrome.notifications.create.bind(chrome.notifications);
    chrome.notifications.create = (o, cb) => { globalThis.__notif.push(o); return asli(o, cb); };
  });

  const galat = [];
  const dialog = [];
  let aksiDialog = 'terima';
  const popup = await ctx.newPage();
  popup.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
  popup.on('console', (m) => { if (m.type() === 'error') galat.push('console: ' + m.text()); });
  popup.on('dialog', async (d) => { dialog.push(d.message()); await (aksiDialog === 'tolak' ? d.dismiss() : d.accept()); });
  await popup.setViewportSize({ width: 420, height: 1100 });
  const bukaPopup = async () => {
    await popup.goto(`chrome-extension://${id}/popup.html`); await popup.evaluate(() => { document.querySelectorAll('.panel').forEach((p) => { p.hidden = false; }); document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
    await popup.waitForSelector('#barisStatus .status-baris');
  };
  await bukaPopup();

  // ===== 0. Dasar =====
  cek('0.1 ID ekstensi terbaca dan popup terbuka', /^[a-p]{32}$/.test(id), id);
  cek('0.2 Popup terbuka tanpa galat', galat.length === 0, galat.join(' | '));

  // ===== 1. Domain mirip: real-time =====
  await ctx.addCookies([{ name: 'sessionid', value: 'a', domain: 'faceb00k.com', path: '/', secure: true }]);
  await tunggu(async () => ((await simpan()).peringatan || []).length >= 1);
  let st = await simpan();
  let mirip = (st.peringatan || []).filter((p) => p.jenis === 'domain-mirip');
  cek('1.1 faceb00k.com memicu 1 peringatan domain mirip (menirukan facebook.com)',
    mirip.length === 1 && mirip[0].ditiru === 'facebook.com', JSON.stringify(mirip));
  await ctx.addCookies([
    { name: 'token', value: 'b', domain: 'faceb00k.com', path: '/', secure: true },
    { name: 'xs', value: 'c', domain: 'faceb00k.com', path: '/', secure: true },
  ]);
  await tidur(700);
  st = await simpan();
  cek('1.2 Cookie lain dari domain tiruan yang sama tidak menggandakan peringatan',
    (st.peringatan || []).filter((p) => p.jenis === 'domain-mirip').length === 1);
  cek('1.3 Notifikasi "Domain mencurigakan" terkirim', (await notif()).some((n) => /Domain mencurigakan: faceb00k\.com/.test(n.title)), JSON.stringify(await notif()));
  cek('1.4 Angka merah di ikon = 1', (await badge()) === '1', await badge());

  await ctx.addCookies([
    { name: 'sessionid', value: 'z', domain: 'google.co.id', path: '/', secure: true },
    { name: 'foo', value: 'z', domain: 'doubleclick.net', path: '/', secure: true },
    { name: 'foo', value: 'z', domain: 'fonts.googleapis.com', path: '/', secure: true },
  ]);
  await tidur(600);
  st = await simpan();
  cek('1.5 Domain sah (google.co.id, doubleclick.net, googleapis.com) tidak memicu peringatan',
    (st.peringatan || []).length === 1, JSON.stringify((st.peringatan || []).map((p) => p.situs)));

  // ===== 2. Cookie sesi: ada/tidaknya tab =====
  await ctx.addCookies([{ name: 'sessionid', value: 'c', domain: '.facebook.com', path: '/', secure: true }]);
  await tunggu(async () => ((await simpan()).peringatan || []).some((p) => p.jenis === 'sesi'));
  st = await simpan();
  cek('2.1 Cookie sesi facebook.com berubah tanpa tab terbuka -> peringatan sesi',
    (st.peringatan || []).some((p) => p.jenis === 'sesi' && p.situs === 'facebook.com' && p.nama === 'sessionid'));
  const tabFb = await ctx.newPage();
  await tabFb.goto('https://www.facebook.com/');
  const sebelum = ((await simpan()).peringatan || []).length;
  await ctx.addCookies([{ name: 'xs', value: 'd', domain: '.facebook.com', path: '/', secure: true }]);
  await tidur(700);
  cek('2.2 Saat tab facebook.com terbuka, perubahan cookie sesi dianggap wajar (tanpa peringatan)',
    ((await simpan()).peringatan || []).length === sebelum);
  await tabFb.close();
  await ctx.addCookies([{ name: 'c_user', value: 'e', domain: '.facebook.com', path: '/', secure: true }]);
  await tunggu(async () => ((await simpan()).peringatan || []).some((p) => p.nama === 'c_user'));
  cek('2.3 Setelah tab ditutup, cookie sesi baru kembali memicu peringatan',
    ((await simpan()).peringatan || []).some((p) => p.nama === 'c_user'));

  // ===== 3. Popup: peringatan dan tombol =====
  await bukaPopup();
  const teksPer = await popup.locator('#peringatan').innerText();
  cek('3.1 Popup menampilkan peringatan domain mirip dan cookie sesi',
    /Domain mirip facebook\.com: faceb00k\.com/.test(teksPer) && /facebook\.com - sessionid/.test(teksPer), teksPer);
  const itemMirip = popup.locator('#peringatan .item', { hasText: 'Domain mirip facebook.com' });
  const tombolMirip = await itemMirip.locator('button').allInnerTexts();
  cek('3.2 Peringatan domain mirip: tombol hapus-semua dan percayai, TANPA tombol "keluar dari semua perangkat"',
    tombolMirip.includes('Hapus semua cookie domain ini') && tombolMirip.includes('Percayai situs ini') && !tombolMirip.includes('Keluar dari semua perangkat'), tombolMirip.join(','));
  const itemSesi = popup.locator('#peringatan .item', { hasText: 'facebook.com - c_user' });
  const tombolSesi = await itemSesi.locator('button').allInnerTexts();
  cek('3.3 Peringatan cookie sesi facebook punya tombol "Keluar dari semua perangkat"', tombolSesi.includes('Keluar dari semua perangkat'), tombolSesi.join(','));

  // Pemindaian (sebelum daftar putih)
  await popup.click('#tombolPindai');
  await tunggu(async () => (await popup.locator('#hasilPindai .item').count()) > 0);
  const teksScan = await popup.locator('#hasilPindai').innerText();
  cek('3.4 Pemindaian menemukan domain mirip', /Domain mirip facebook\.com: faceb00k\.com/.test(teksScan), teksScan);
  cek('3.5 Pemindaian menandai cookie sesi tanpa HttpOnly', /facebook\.com - sessionid[\s\S]*tanpa HttpOnly/.test(teksScan), teksScan);

  // Klik "Keluar dari semua perangkat": buka halaman + catat waktu cek
  const [halamanKeamanan] = await Promise.all([ctx.waitForEvent('page'), itemSesi.getByText('Keluar dari semua perangkat').click()]);
  const adaFb = await tunggu(() => diminta.some((u) => /^https:\/\/www\.facebook\.com\/settings\?tab=security/.test(u)));
  cek('3.6 Tombol "Keluar dari semua perangkat" meminta halaman keamanan facebook yang benar', adaFb, diminta.slice(-5).join(' '));
  await halamanKeamanan.close();

  // Hapus satu cookie dari peringatan
  await bukaPopup();
  await popup.locator('#peringatan .item', { hasText: 'facebook.com - c_user' }).getByText('Hapus cookie ini').click();
  await tunggu(async () => !(await ctx.cookies()).some((c) => c.name === 'c_user'));
  cek('3.8 "Hapus cookie ini" benar-benar menghapus cookie c_user dari browser', !(await ctx.cookies()).some((c) => c.name === 'c_user'));

  // Hapus semua cookie domain tiruan
  await popup.locator('#peringatan .item', { hasText: 'Domain mirip facebook.com' }).getByText('Hapus semua cookie domain ini').click();
  await tunggu(async () => (await ctx.cookies()).filter((c) => c.domain.includes('faceb00k')).length === 0);
  cek('3.9 "Hapus semua cookie domain ini" menghapus ketiga cookie faceb00k.com',
    (await ctx.cookies()).filter((c) => c.domain.includes('faceb00k')).length === 0);
  st = await simpan();
  cek('3.10 Peringatan domain mirip ikut hilang dari daftar', !(st.peringatan || []).some((p) => p.jenis === 'domain-mirip'));

  // ===== 9. Ekstensi berizin cookies (fitur sebelumnya, belum pernah diuji di browser) =====
  await bukaPopup();
  await tunggu(async () => /Penyedot Cookie Palsu/.test(await popup.locator('#daftarEkstensi').innerText()));
  const teksEks = await popup.locator('#daftarEkstensi').innerText();
  cek('9.1 Ekstensi palsu berizin cookies + semua situs terdeteksi sebagai risiko tinggi',
    /Penyedot Cookie Palsu \(risiko tinggi\)/.test(teksEks) && !/Pemantau Cookies \(/.test(teksEks), teksEks);
  await popup.locator('#daftarEkstensi .item', { hasText: 'Penyedot Cookie Palsu' }).getByText('Percayai', { exact: true }).click();
  await tunggu(async () => /Ekstensi yang kamu percayai/.test(await popup.locator('#daftarEkstensiTepercaya').innerText()));
  cek('9.2 "Percayai" memindahkannya ke daftar tepercaya', /Penyedot Cookie Palsu/.test(await popup.locator('#daftarEkstensiTepercaya').innerText()) && /Tidak ada ekstensi lain/.test(await popup.locator('#daftarEkstensi').innerText()));
  await popup.locator('#daftarEkstensiTepercaya .chip').getByText('Keluarkan').click();
  await tunggu(async () => /Penyedot Cookie Palsu \(/.test(await popup.locator('#daftarEkstensi').innerText()));
  await popup.locator('#daftarEkstensi .item', { hasText: 'Penyedot Cookie Palsu' }).getByText('Nonaktifkan').click();
  await tunggu(async () => /Tidak ada ekstensi lain/.test(await popup.locator('#daftarEkstensi').innerText()));
  const status = await sw.evaluate(() => chrome.management.getAll().then((a) => a.filter((x) => x.name === 'Penyedot Cookie Palsu').map((x) => x.enabled)));
  cek('9.3 "Nonaktifkan" benar-benar menonaktifkan ekstensi tersebut di browser', status.length === 1 && status[0] === false, JSON.stringify(status));

  // ===== 10. Daftar putih dan pembersihan =====
  await ctx.addCookies([{ name: 'sessionid', value: 'a', domain: 'faceb00k.com', path: '/', secure: true }]);
  await tunggu(async () => ((await simpan()).peringatan || []).some((p) => p.jenis === 'domain-mirip'));
  await bukaPopup();
  await popup.fill('#inputSitus', 'https://www.Faceb00k.com/halaman');
  await popup.click('#tombolTambah');
  await tunggu(async () => ((await simpan()).daftarPutih || []).includes('faceb00k.com'));
  cek('10.1 Daftar putih merapikan alamat lengkap jadi "faceb00k.com"', ((await simpan()).daftarPutih || []).includes('faceb00k.com'));
  cek('10.2 ...dan membuang peringatan domain itu', !((await simpan()).peringatan || []).some((p) => p.domain.includes('faceb00k')));
  const jumlahSebelum = ((await simpan()).peringatan || []).length;
  await ctx.addCookies([{ name: 'xs', value: 'a', domain: 'faceb00k.com', path: '/', secure: true }]);
  await tidur(700);
  cek('10.3 Domain di daftar putih tidak memicu peringatan lagi', ((await simpan()).peringatan || []).length === jumlahSebelum);

  // ===== Penutup =====
  await popup.screenshot({ path: S + '/popup.png', fullPage: true });
  cek('99 Tidak ada galat JavaScript di popup selama seluruh uji', galat.length === 0, galat.join(' | '));

  await ctx.close();
  const gagal = hasil.filter((h) => !h.ok);
  console.log('\nRINGKASAN: ' + (hasil.length - gagal.length) + '/' + hasil.length + ' lulus' + (gagal.length ? ' | GAGAL: ' + gagal.map((g) => g.nama.split(' ')[0]).join(', ') : ''));
  process.exit(gagal.length ? 1 : 0);
})().catch((e) => { console.log('UJI BERHENTI KARENA GALAT:', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(2); });
