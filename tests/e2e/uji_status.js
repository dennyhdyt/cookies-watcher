const { chromium } = require('playwright'); const fs = require('fs');
const E = require('./lib').REPO, S = require('./lib').SCRATCH, P = S + '/profil-status';
const ok = (n, c, d) => { console.log((c ? 'LULUS  ' : 'GAGAL  ') + n + (c ? '' : ' -> ' + String(JSON.stringify(d)).slice(0, 400))); if (!c) process.exitCode = 1; };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const buka = () => chromium.launchPersistentContext(P, { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + E, '--load-extension=' + E] });
const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
const ck = (name, domain, extra) => Object.assign({ name, value: 'v', domain, path: '/', secure: true, expires: exp }, extra || {});
(async () => {
  fs.rmSync(P, { recursive: true, force: true });
  let ctx = await buka();
  let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); await tidur(1500);
  await ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'x' }));
  const galat = [];
  const popup = async () => { const p = await ctx.newPage(); p.on('pageerror', (e) => galat.push(e.message)); await p.setViewportSize({ width: 420, height: 900 }); const id = new URL(sw.url()).host; await p.goto(`chrome-extension://${id}/popup.html`); await tidur(700); return p; };
  const teks = async (p, s) => (await p.locator(s).first().innerText()).trim();
  const lencana = () => sw.evaluate(() => chrome.action.getBadgeText({}));

  let p = await popup();
  let st = await teks(p, '#barisStatus');
  ok('1 kartu status tampil di tab Peringatan (paling atas)', /Status pemantauan/.test(await teks(p, '#panel-peringatan')) && /Pemantauan aktif/.test(st), st);
  ok('1b awal: belum ada perubahan cookie, tidak ada cookie login, pembersihan otomatis mati', /Belum ada perubahan cookie/.test(st) && /Cookie login terdeteksi: 0 di 0 situs/.test(st) && /Pembersihan otomatis: mati/.test(st), st);
  ok('1d izin notifikasi terbaca', /Notifikasi diizinkan|Notifikasi diblokir/.test(st), st);
  ok('1e lencana kosong saat belum ada peringatan', (await lencana()) === '');

  // pembatasan tulis: banyak cookie berubah cepat -> 1 kali tulis
  await sw.evaluate(() => { self.__tulis = 0; chrome.storage.onChanged.addListener((c) => { if (c.cookieTerakhirDilihat) self.__tulis++; }); });
  await ctx.addCookies(Array.from({ length: 12 }, (_, i) => ck('k' + i, '.acak-' + i + '.test')));
  await tidur(1500);
  const tulis = await sw.evaluate(() => self.__tulis);
  ok('2 12 perubahan cookie beruntun hanya menulis waktu terakhir 1 kali (hemat penyimpanan)', tulis === 1, tulis);
  await p.evaluate(() => tampilkanStatus()); await tidur(500);
  st = await teks(p, '#barisStatus');
  ok('2b "Terakhir melihat perubahan cookie: baru saja"', /Terakhir melihat perubahan cookie: baru saja/.test(st), st);

  // cookie login & pembersihan otomatis
  await ctx.addCookies([ck('xs', '.facebook.com'), ck('c_user', '.facebook.com'), ck('sessionid', '.instagram.com')]);
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatBuka: [{ situs: 'facebook.com', mode: 'sesi' }] }));
  await p.evaluate(() => tampilkanStatus()); await tidur(500);
  st = await teks(p, '#barisStatus');
  ok('3 cookie login terdeteksi: 3 di 2 situs', /Cookie login terdeteksi: 3 di 2 situs/.test(st), st);
  ok('3b pembersihan otomatis: 1 situs', /Pembersihan otomatis: 1 situs/.test(st), st);

  // notifikasi diblokir
  await p.evaluate(() => { chrome.notifications.getPermissionLevel = async () => 'denied'; return tampilkanStatus(); }); await tidur(500);
  st = await teks(p, '#barisStatus');
  ok('5 izin notifikasi "denied" -> peringatan jelas (baris oranye)', /Notifikasi diblokir/.test(st) && (await p.locator('#barisStatus .status-baris.awas').count()) >= 1, st);

  // Inggris
  await p.click('#bahasa-en'); await tidur(600);
  st = await teks(p, '#barisStatus');
  ok('6 teks Inggris', /Monitoring status/.test(await teks(p, '#panel-peringatan')) && /Monitoring is on/.test(st) && /Login cookies detected: 3 across 2 site\(s\)/.test(st) && /Automatic cleanup: 1 site\(s\)/.test(st), st);
  await p.screenshot({ path: S + '/status.png' });
  await p.click('#bahasa-id'); await tidur(300);

  // lencana: tiga peringatan dari langkah sebelumnya (cookie login tanpa tab terbuka) harus tercermin dulu
  const awal = await sw.evaluate(() => chrome.storage.local.get('peringatan').then((d) => (d.peringatan || []).length));
  ok('6b lencana = jumlah peringatan tersimpan (' + awal + ')', (await lencana()) === String(awal) && awal === 3, [await lencana(), awal]);
  await sw.evaluate(() => chrome.storage.local.remove('peringatan')); await tidur(500);
  ok('6c peringatan dikosongkan -> lencana hilang', (await lencana()) === '', await lencana());
  await ctx.addCookies([ck('sessionid', '.facebook.com')]);
  await tidur(1200);
  ok('7 peringatan cookie sesi -> lencana "1"', (await lencana()) === '1', await lencana());
  await ctx.addCookies([ck('a', '.facebook-login.com')]);
  await tidur(1200);
  ok('7b peringatan kedua (domain mirip) -> lencana "2"', (await lencana()) === '2', await lencana());
  const warna = await sw.evaluate(() => chrome.action.getBadgeBackgroundColor({}));
  ok('7c lencana berwarna merah', warna[0] > 200 && warna[1] < 80, warna);
  // restart: lencana dipasang lagi dari peringatan yang tersimpan
  await ctx.close(); await tidur(800);
  ctx = await buka(); sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); await tidur(1500);
  ok('8 setelah browser dimulai ulang lencana tetap "2" (dipasang lagi dari data tersimpan)', (await lencana()) === '2', await lencana());
  // batas 99+
  await sw.evaluate(() => chrome.storage.local.set({ peringatan: Array.from({ length: 120 }, (_, i) => ({ jenis: 'sesi', situs: 's' + i, nama: 'x', domain: 's.com', path: '/', waktu: Date.now() })) })); await tidur(500);
  ok('9 lebih dari 99 peringatan -> "99+"', (await lencana()) === '99+', await lencana());
  // bersihkan lewat popup
  p = await popup(); p.on('dialog', (d) => d.accept());
  await p.click('#bersihkanPeringatan'); await tidur(700);
  ok('10 "Bersihkan semua peringatan" -> lencana hilang', (await lencana()) === '', await lencana());
  ok('11 tanpa galat JS', galat.length === 0, galat);
  await ctx.close();
})().catch((e) => { console.log('BERHENTI:', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(2); });
