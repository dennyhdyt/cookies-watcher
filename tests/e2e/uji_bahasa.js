const { chromium } = require('playwright');
const fs = require('fs');
const E = require('./lib').REPO, S = require('./lib').SCRATCH;
const ok = (n, c, d) => { console.log((c ? 'LULUS  ' : 'GAGAL  ') + n + (c ? '' : ' -> ' + String(JSON.stringify(d)).slice(0, 400))); if (!c) process.exitCode = 1; };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.rmSync(S + '/profil-bhs', { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(S + '/profil-bhs', { channel: 'chromium', headless: true,
    args: ['--disable-extensions-except=' + E, '--load-extension=' + E] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); const id = new URL(sw.url()).host;
  await ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'x' }));
  const galat = [];
  const p = await ctx.newPage(); p.on('pageerror', (e) => galat.push(e.message)); p.on('dialog', (d) => { galat.dialog = d.message(); d.dismiss(); });
  await p.setViewportSize({ width: 420, height: 800 });
  await p.goto(`chrome-extension://${id}/popup.html`); await tidur(600);
  const teks = async (sel) => (await p.locator(sel).first().innerText()).trim();
  // 1. bawaan Indonesia
  ok('1 bawaan: bahasa Indonesia', (await teks('#tab-pindai')) === 'Pemindaian' && (await teks('#bersihkanPeringatan')) === 'Bersihkan semua peringatan', await teks('#tab-pindai'));
  ok('1b tombol ID menyala', (await p.getAttribute('#bahasa-id', 'aria-pressed')) === 'true');
  // 2. ganti ke Inggris
  await p.click('#bahasa-en'); await tidur(500);
  ok('2 tab jadi Inggris', (await teks('#tab-pindai')) === 'Scan' && (await teks('#tab-pengaturan')) === 'Settings' && (await teks('#tab-peringatan')) === 'Alerts', await teks('#tab-pindai'));
  ok('2b isi panel peringatan Inggris', /No alerts/.test(await teks('#peringatan')) && (await teks('#bersihkanPeringatan')) === 'Clear all alerts', await teks('#peringatan'));
  ok('2c tombol EN menyala, html lang=en', (await p.getAttribute('#bahasa-en', 'aria-pressed')) === 'true' && (await p.getAttribute('html', 'lang')) === 'en');
  // 3. tiap tab: tidak ada teks Indonesia tersisa
  const kataId = /\b(Hapus|Percayai|Belum|Tidak ada|Pindai|Pengaturan|Ingatkan|bawaan|situs yang|Keluarkan|Tambah|Simpan|Daftar putih|Nama cookie)\b/;
  const sisa = [];
  for (const t of ['peringatan', 'pindai', 'ekstensi', 'bersih', 'pengaturan']) {
    await p.click('#tab-' + t);
    if (t === 'pengaturan') await p.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    if (t === 'pindai') { await p.click('#tombolPindai'); await tidur(600); }
    const isi = await p.locator('.panel:not([hidden])').innerText();
    if (kataId.test(isi)) sisa.push([t, isi.match(kataId)[0]]);
    await p.screenshot({ path: `${S}/bhs-en-${t}.png` });
  }
  ok('3 tidak ada sisa teks Indonesia di 6 tab (Inggris)', sisa.length === 0, sisa);
  // placeholder
  // 4. pesan dinamis Inggris
  await p.click('#inputSitus'); await p.fill('#inputSitus', '???'); await p.click('#tombolTambah'); await tidur(300);
  ok('4 pesan galat dalam Inggris', /Invalid format/.test(await teks('#pesanDaftarPutih')), await teks('#pesanDaftarPutih'));
  await p.fill('#inputSitus', 'github.com'); await p.click('#tombolTambah'); await tidur(400);
  ok('4b "ditambahkan" dalam Inggris', /added to the allowlist/.test(await teks('#pesanDaftarPutih')), await teks('#pesanDaftarPutih'));
  // 5. disimpan setelah dibuka ulang
  await p.reload(); await tidur(700);
  ok('5 pilihan Inggris diingat setelah popup dibuka ulang', (await teks('#tab-pindai')) === 'Scan', await teks('#tab-pindai'));
  // 6. notifikasi dari latar belakang dalam Inggris + alasan peringatan
  const notif = await sw.evaluate(() => new Promise((res) => { const asli = chrome.notifications.create; const log = []; chrome.notifications.create = function (...a) { log.push(a.find((x) => x && typeof x === 'object')); return asli.apply(this, a); }; self.__log = log; res(true); }));
  await ctx.addCookies([{ name: 'a', value: 'v', domain: '.facebook-login.com', path: '/', secure: true }]);
  await tidur(1500);
  const log = await sw.evaluate(() => self.__log);
  const st = await sw.evaluate(() => chrome.storage.local.get('peringatan'));
  ok('6 peringatan domain mirip tercatat dalam bahasa Inggris', st.peringatan && st.peringatan[0] && /^This domain /.test(st.peringatan[0].alasan), st.peringatan && st.peringatan[0]);
  ok('6b notifikasi latar belakang berbahasa Inggris', log.length > 0 && /Suspicious domain/.test(log[0].title), log);
  await p.reload(); await tidur(600);
  ok('6c popup menampilkan peringatan itu', /Domain similar to facebook\.com/.test(await teks('#peringatan')), await teks('#peringatan'));
  // 7. kembali ke Indonesia
  await p.click('#bahasa-id'); await tidur(500);
  ok('7 kembali ke Indonesia', (await teks('#tab-pindai')) === 'Pemindaian', await teks('#tab-pindai'));
  // 9. nilai bahasa tak valid -> Indonesia
  await sw.evaluate(() => chrome.storage.local.set({ bahasa: 'xx' }));
  await p.reload(); await tidur(600);
  ok('9 nilai bahasa tak valid -> kembali ke Indonesia', (await teks('#tab-pindai')) === 'Pemindaian', await teks('#tab-pindai'));
  ok('10 tanpa galat JavaScript', galat.length === 0, galat);
  await ctx.close();
})().catch((e) => { console.log('BERHENTI:', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(2); });
