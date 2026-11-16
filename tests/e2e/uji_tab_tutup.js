const { chromium } = require('playwright');
const fs = require('fs');
const E = require('./lib').REPO, S = require('./lib').SCRATCH, PROFIL = S + '/profil-tabtutup';
const ok = (n, c, d) => { console.log((c ? 'LULUS  ' : 'GAGAL  ') + n + (c ? '' : ' -> ' + String(JSON.stringify(d)).slice(0, 500))); if (!c) process.exitCode = 1; };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const besok = Math.floor(Date.now() / 1000) + 86400 * 30;
const ck = (name, domain) => ({ name, value: 'v', domain, path: '/', secure: true, expires: besok });
const nama = async (ctx) => (await ctx.cookies()).map((c) => c.domain + ':' + c.name).sort();
(async () => {
  fs.rmSync(PROFIL, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(PROFIL, { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + E, '--load-extension=' + E] });
  let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); const id = new URL(sw.url()).host;
  await tidur(1500);
  await ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'x' }));
  ok('0 manifest tanpa izin tabs', !JSON.parse(fs.readFileSync(E + '/manifest.json')).permissions.includes('tabs'));
  const semuaCookie = [ck('xs', '.facebook.com'), ck('c_user', '.facebook.com'), ck('locale', '.facebook.com'), ck('sessionid', '.instagram.com'), ck('sessionid', '.github.com')];
  await ctx.addCookies(semuaCookie);

  // --- A. fitur tab tutup ---
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatTabTutup: ['facebook.com'] }));
  await tidur(500);
  const a = await ctx.newPage(); await a.goto('https://www.facebook.com/a');
  const b = await ctx.newPage(); await b.goto('https://m.facebook.com/b');
  const g = await ctx.newPage(); await g.goto('https://github.com/x');
  await tidur(600);
  const peta = await sw.evaluate(async () => (await chrome.storage.session.get('petaTab')).petaTab);
  ok('1 peta hanya berisi situs di daftar, tanpa alamat lengkap', Object.values(peta).length === 2 && Object.values(peta).every((v) => v === 'facebook.com'), peta);

  await g.close(); await tidur(700);
  ok('2 menutup tab situs yang tidak ada di daftar: cookie aman', (await nama(ctx)).includes('.github.com:sessionid'));
  await a.close(); await tidur(900);
  ok('3 masih ada tab facebook lain: cookie TIDAK dihapus', (await nama(ctx)).includes('.facebook.com:xs'), await nama(ctx));
  await b.close(); await tidur(1200);
  let n = await nama(ctx);
  ok('4 tab facebook terakhir ditutup: cookie login dihapus', !n.includes('.facebook.com:xs') && !n.includes('.facebook.com:c_user'), n);
  ok('5 cookie non-login (locale) dan situs lain tidak disentuh', n.includes('.facebook.com:locale') && n.includes('.instagram.com:sessionid') && n.includes('.github.com:sessionid'), n);
  const r = await sw.evaluate(async () => (await chrome.storage.local.get('riwayatBersih')).riwayatBersih);
  ok('6 riwayat mencatat sumber "tab"', r && r[0] && r[0].sumber === 'tab' && r[0].jumlah === 2, r);
  const peta2 = await sw.evaluate(async () => (await chrome.storage.session.get('petaTab')).petaTab);
  ok('7 peta dibersihkan setelah tab ditutup', Object.keys(peta2).length === 0, peta2);

  // --- B. tab sudah terbuka SEBELUM situs ditambah ke daftar ---
  await ctx.addCookies([ck('sessionid', '.instagram.com')]);
  const ig = await ctx.newPage(); await ig.goto('https://www.instagram.com/'); await tidur(500);
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatTabTutup: ['facebook.com', 'instagram.com'] }));
  await tidur(900);
  await ig.close(); await tidur(1200);
  ok('8 tab yang sudah terbuka sebelum ditambahkan juga terpantau', !(await nama(ctx)).includes('.instagram.com:sessionid'), await nama(ctx));

  // --- C. situs dikeluarkan dari daftar -> tidak dihapus ---
  await ctx.addCookies([ck('sessionid', '.instagram.com')]);
  const ig2 = await ctx.newPage(); await ig2.goto('https://www.instagram.com/'); await tidur(500);
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatTabTutup: ['facebook.com'] }));
  await tidur(700);
  await ig2.close(); await tidur(1000);
  ok('9 situs sudah dikeluarkan dari daftar: cookie aman', (await nama(ctx)).includes('.instagram.com:sessionid'));

  // --- D. data rusak / terlalu umum ---
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatTabTutup: ['co.id', 5, null, 'github.com', 'github.com'] }));
  const dd = await sw.evaluate(() => ambilHapusSaatTabTutup());
  ok('10 data rusak disaring, duplikat dibuang', JSON.stringify(dd) === '["github.com"]', dd);
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatTabTutup: [] }));

  // --- E. UI popup + tombol darurat ---
  await ctx.addCookies(semuaCookie);
  const p = await ctx.newPage(); const galat = []; p.on('pageerror', (e) => galat.push(e.message));
  let dialog = null; p.on('dialog', (d) => { dialog = d.message(); d.accept(); });
  await p.setViewportSize({ width: 420, height: 900 });
  await p.goto(`chrome-extension://${id}/popup.html`); await tidur(500);
  await p.click('#tab-bersih'); await p.evaluate(() => tampilkanBersih()); await tidur(500);
  ok('11 tombol darurat tampil', (await p.locator('#tombolDarurat').innerText()).includes('Keluarkan semua login sekarang'));
  const barisGithub = p.locator('#daftarDeteksi .chip', { hasText: 'github.com' });
  await barisGithub.getByRole('button', { name: 'Saat tab ditutup' }).click(); await tidur(500);
  const daftar = await sw.evaluate(() => ambilHapusSaatTabTutup());
  ok('12 tombol baris menambah situs ke daftar tab-tutup', daftar.includes('github.com'), daftar);
  ok('13 daftar terlindungi tampil, baris berubah jadi "Tab tutup ✓"', (await p.locator('#daftarLindungi').innerText()).includes('github.com') && (await p.locator('#daftarDeteksi .chip', { hasText: 'github.com' }).innerText()).includes('Tab tutup ✓'));
  await p.locator('#daftarLindungi .kartu-lindung', { hasText: 'github.com' }).locator('.pil', { hasText: 'Saat tab ditutup' }).click(); await tidur(500);
  ok('14 Keluarkan menghapus dari daftar', (await sw.evaluate(() => ambilHapusSaatTabTutup())).length === 0);

  await p.click('#tombolDarurat'); await tidur(1200);
  n = await nama(ctx);
  ok('15 darurat: konfirmasi menyebut jumlah situs', /3 situs/.test(dialog || ''), dialog);
  ok('16 darurat: semua cookie login semua situs hilang', !n.some((x) => /xs|c_user|sessionid/.test(x)), n);
  ok('17 darurat: cookie non-login tetap', n.includes('.facebook.com:locale'), n);
  ok('18 pesan hasil tampil', /3 situs/.test(await p.locator('#pesanBersih').innerText()), await p.locator('#pesanBersih').innerText());
  const r2 = await sw.evaluate(async () => (await chrome.storage.local.get('riwayatBersih')).riwayatBersih);
  ok('19 riwayat mencatat "darurat"', r2[0].sumber === 'darurat' && r2[0].jumlah === 4, r2[0]);
  ok('20 riwayat tampil di popup dengan nama sumber', /tombol darurat/.test(await p.locator('#riwayatBersih').innerText()));
  dialog = null; await p.click('#tombolDarurat'); await tidur(500);
  ok('21 darurat tanpa cookie login: pesan kosong, tanpa konfirmasi', dialog === null && /Tidak ada cookie login/.test(await p.locator('#pesanBersih').innerText()));

  // --- F. bahasa Inggris ---
  await p.click('#bahasa-en'); await tidur(500); await p.click('#tab-bersih');
  ok('22 bahasa Inggris untuk tombol darurat dan bagian tab', (await p.locator('#tombolDarurat').innerText()) === 'Sign out of everything now' && /Protected sites/.test(await p.locator('#panel-bersih').innerText()));
  ok('23 tidak ada galat halaman', galat.length === 0, galat);
  await ctx.close();
})();
