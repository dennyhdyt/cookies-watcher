const { chromium } = require('playwright');
const fs = require('fs');
const E = require('./lib').REPO, S = require('./lib').SCRATCH, PROFIL = S + '/profil-buka';
const ok = (n, c, d) => { console.log((c ? 'LULUS  ' : 'GAGAL  ') + n + (c ? '' : ' -> ' + String(JSON.stringify(d)).slice(0, 500))); if (!c) process.exitCode = 1; };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
async function tunggu(fn, ms = 10000) { const m = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* coba lagi */ } if (Date.now() - m > ms) return false; await tidur(150); } }
const buka = () => chromium.launchPersistentContext(PROFIL, { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + E, '--load-extension=' + E] });
const besok = Math.floor(Date.now() / 1000) + 86400 * 30;
const ck = (name, domain) => ({ name, value: 'v', domain, path: '/', secure: true, expires: besok });
const norm = (a) => JSON.stringify(a.map((x) => ({ situs: x.situs, mode: x.mode })));
const namaCookie = async (ctx) => (await ctx.cookies()).map((c) => c.domain + ':' + c.name).sort();
(async () => {
  fs.rmSync(PROFIL, { recursive: true, force: true });
  let ctx = await buka();
  let sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); let id = new URL(sw.url()).host;
  await tidur(1500);
  await ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'x' }));
  await ctx.addCookies([
    ck('xs', '.facebook.com'), ck('c_user', '.facebook.com'), ck('locale', '.facebook.com'),
    ck('sessionid', '.instagram.com'), ck('tema', '.instagram.com'),
    ck('sessionid', '.github.com'),
    ck('sessionid', 'm.contoh.org'),                    // subdomain -> contoh.org
    ck('sessionid', '.tokokita.co.id'), ck('bahasa', '.tokokita.co.id'),   // nama khusus per situs
    ck('sessionid', '.co.id'),                          // terlalu umum -> diabaikan
    ck('sessionid', '.lain.net'),
    ck('SID', '.google.com'), ck('HSID', '.google.com'), ck('__Secure-1PSID', '.google.com'), ck('NID', '.google.com'),
  ]);
  const galat = [];
  const fb = await ctx.newPage(); await fb.goto('https://www.facebook.com/');
  const p = await ctx.newPage(); p.on('pageerror', (e) => galat.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.setViewportSize({ width: 420, height: 900 });
  await p.goto(`chrome-extension://${id}/popup.html`); await tidur(500);
  const teks = async (s) => (await p.locator(s).first().innerText()).trim();
  const segarkan = async () => { await p.evaluate(() => tampilkanBersih()); await tidur(400); };
  await p.click('#tab-bersih');

  ok('0 tidak ada lagi kotak ketik manual maupun pilihan mode', (await p.locator('#inputBersih, #pilihModeBersih, #tombolTambahBersih').count()) === 0);
  // popup dibuka sebagai tab biasa -> tab aktif adalah halaman ekstensi, bukan situs web
  ok('1 tab aktif bukan halaman web -> kotak "Tab ini" kosong', (await teks('#tabIniBersih')) === '', await teks('#tabIniBersih'));
  const dt = await teks('#daftarDeteksi');
  ok('2 terdeteksi otomatis: facebook (2), instagram (1), github (1), contoh.org (1), tokokita.co.id (1), lain.net (1)', /facebook\.com\s+2 cookie login/.test(dt) && /instagram\.com\s+1 cookie login/.test(dt) && /github\.com/.test(dt) && /contoh\.org\s+1 cookie login/.test(dt) && /tokokita\.co\.id\s+1 cookie login/.test(dt) && /lain\.net/.test(dt), dt);
  ok('2b cookie non-login (locale, tema, bahasa) tidak dihitung; ".co.id" terlalu umum diabaikan', !/co\.id\s+1/.test(dt.replace('tokokita.co.id', '')) && /facebook\.com\s+2 cookie/.test(dt), dt);
  ok('2c terurut abjad', dt.indexOf('contoh.org') < dt.indexOf('facebook.com') && dt.indexOf('facebook.com') < dt.indexOf('github.com'), dt);

  // tab aktif = facebook
  await fb.bringToFront(); await segarkan();
  const tab = await teks('#tabIniBersih');
  ok('3 tab aktif facebook.com: kartu Tab ini, belum dilindungi, ada tombol Lindungi', /Tab ini/.test(tab) && /facebook\.com/.test(tab) && /Belum dilindungi/.test(tab) && /Lindungi situs ini/.test(tab), tab);
  ok('3b situs tab aktif tidak dobel di daftar deteksi', !/facebook\.com/.test(await teks('#daftarDeteksi')), await teks('#daftarDeteksi'));
  await p.screenshot({ path: S + '/bersih-deteksi.png' });
  // tab aktif tanpa cookie login
  await fb.goto('https://example.org/'); await fb.bringToFront(); await segarkan();
  ok('4 tab aktif situs tanpa cookie login: kartu tetap tampil dengan tombol Lindungi', /example\.org/.test(await teks('#tabIniBersih')) && /Lindungi situs ini/.test(await teks('#tabIniBersih')), await teks('#tabIniBersih'));
  await fb.goto('https://www.facebook.com/'); await fb.bringToFront(); await segarkan();

  // tambah dari tab ini
  await p.click('#tombolLindungi'); await tidur(500); await p.click('#tombolSimpanLindungi'); await tidur(700);
  let dft = await sw.evaluate(() => chrome.storage.local.get('hapusSaatBuka'));
  ok('5 Lindungi di tab ini memasukkan facebook.com ke daftar browser-dibuka (mode sesi)', norm(dft.hapusSaatBuka) === norm([{ situs: 'facebook.com', mode: 'sesi' }]), dft);
  ok('5b kartu berubah jadi Dilindungi & muncul di daftar terlindungi', /Dilindungi/.test(await teks('#tabIniBersih')) && /facebook\.com/.test(await teks('#daftarLindungi')) && /sekarang dilindungi/.test(await teks('#pesanBersih')), [await teks('#tabIniBersih'), await teks('#daftarLindungi'), await teks('#pesanBersih')]);
  // tambah dari daftar
  await p.locator('#daftarDeteksi .chip', { hasText: 'instagram.com' }).locator('button', { hasText: 'Tambahkan' }).click(); await tidur(500);
  dft = await sw.evaluate(() => chrome.storage.local.get('hapusSaatBuka'));
  ok('6 "Tambahkan" dari daftar memasukkan instagram.com', norm(dft.hapusSaatBuka) === norm([{ situs: 'facebook.com', mode: 'sesi' }, { situs: 'instagram.com', mode: 'sesi' }]), dft);
  // hapus sekarang satu situs
  await p.locator('#daftarDeteksi .chip', { hasText: 'github.com' }).locator('button', { hasText: 'Hapus sekarang' }).click(); await tidur(700);
  let sisa = await namaCookie(ctx);
  ok('7 "Hapus sekarang" github.com: cookie loginnya hilang, situs lain utuh', !sisa.includes('.github.com:sessionid') && sisa.includes('.lain.net:sessionid') && sisa.includes('.instagram.com:sessionid'), sisa);
  ok('7b pesan hasil & baris github hilang dari daftar', /github\.com: 1 cookie dihapus/.test(await teks('#pesanBersih')) && !/github\.com/.test(await teks('#daftarDeteksi')), [await teks('#pesanBersih'), await teks('#daftarDeteksi')]);
  await p.locator('#daftarDeteksi .chip', { hasText: 'contoh.org' }).locator('button', { hasText: 'Hapus sekarang' }).click(); await tidur(700);
  sisa = await namaCookie(ctx);
  ok('7c cookie di subdomain (m.contoh.org) ikut terhapus lewat domain utama', !sisa.includes('m.contoh.org:sessionid'), sisa);
  // bersihkan semua
  await tunggu(async () => !(await p.locator('#tombolBersihkanSekarang').isDisabled()));
  await p.click('#tombolBersihkanSekarang');
  await tunggu(async () => !(await namaCookie(ctx)).includes('.instagram.com:sessionid') && /3 cookie dihapus/.test(await teks('#pesanBersih')));
  sisa = await namaCookie(ctx);
  ok('8 "Bersihkan semua": login facebook & instagram hilang; locale/tema tetap', !sisa.includes('.facebook.com:xs') && !sisa.includes('.facebook.com:c_user') && !sisa.includes('.instagram.com:sessionid') && sisa.includes('.facebook.com:locale') && sisa.includes('.instagram.com:tema'), sisa);
  ok('8b pesan & status: 3 cookie', /3 cookie dihapus/.test(await teks('#pesanBersih')) && /\(3 cookie\)/.test(await teks('#statusBersih')), [await teks('#pesanBersih'), await teks('#statusBersih')]);
  // Inggris
  await p.click('#bahasa-en'); await tidur(500);
  const en = await teks('#panel-bersih');
  ok('9 teks Inggris', /Clean up login cookies/.test(en) && /Login cookies detected/.test(en) && /Protected sites/.test(en) && /Last cleaned: .*\(3 cookies\)/.test(en), en.slice(0, 300));
  await p.click('#bahasa-id'); await tidur(300);
  await p.screenshot({ path: S + '/bersih.png' });

  // restart + handler startup
  await ctx.addCookies([ck('sessionid', '.instagram.com'), ck('c_user', '.facebook.com')]);
  await tidur(500); await ctx.close(); await tidur(800);
  ctx = await buka(); sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); await tidur(1500);
  console.log('INFO   event onStartup asli tidak dipicu oleh Chromium uji; handler-nya dipanggil langsung');
  await sw.evaluate(async () => { await chrome.storage.session.clear(); await saatBrowserDibuka(); }); await tidur(800);
  sisa = await namaCookie(ctx);
  ok('10 setelah restart + handler startup: login situs di daftar otomatis hilang, lainnya utuh', !sisa.includes('.instagram.com:sessionid') && !sisa.includes('.facebook.com:c_user') && sisa.includes('.lain.net:sessionid') && sisa.includes('.instagram.com:tema'), sisa);
  // format lama
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatBuka: ['instagram.com', { situs: 'tokokita.co.id', mode: 'semua' }] }));
  await ctx.addCookies([ck('sessionid', '.instagram.com')]);
  await sw.evaluate(async () => { await chrome.storage.session.clear(); await saatBrowserDibuka(); }); await tidur(700);
  sisa = await namaCookie(ctx);
  ok('11 data lama (teks biasa & mode "semua") tetap dibaca benar', !sisa.includes('.instagram.com:sessionid') && !sisa.some((x) => x.includes('tokokita.co.id')) && sisa.includes('.instagram.com:tema'), sisa);
  await sw.evaluate(() => chrome.storage.local.set({ hapusSaatBuka: [{ situs: 'co.id', mode: 'semua' }, { situs: 'org', mode: 'semua' }, 42, null] }));
  await ctx.addCookies([ck('apa', '.toko.co.id'), ck('x', '.lain.org')]);
  await sw.evaluate(async () => { await chrome.storage.session.clear(); await saatBrowserDibuka(); }); await tidur(600);
  sisa = await namaCookie(ctx);
  ok('12 data rusak / nama terlalu umum tidak menghapus apa pun', sisa.includes('.toko.co.id:apa') && sisa.includes('.lain.org:x'), sisa);

  id = new URL(sw.url()).host;
  const p2 = await ctx.newPage(); p2.on('pageerror', (e) => galat.push(e.message)); p2.on('dialog', (d) => d.accept());
  await p2.setViewportSize({ width: 420, height: 900 });
  await p2.goto(`chrome-extension://${id}/popup.html`); await tidur(500); await p2.click('#tab-bersih');
  // ---- Google: banyak cookie login sekaligus ----
  await ctx.addCookies([ck('SID', '.google.com'), ck('HSID', '.google.com'), ck('__Secure-1PSID', '.google.com'), ck('NID', '.google.com')]);
  await p2.evaluate(() => tampilkanBersih()); await tidur(500);
  const dg = await p2.locator('#daftarDeteksi').innerText();
  ok('14 google.com terdeteksi dengan 3 cookie login (SID, HSID, __Secure-1PSID), NID tidak dihitung', /google\.com\s+3 cookie login/.test(dg), dg);
  await p2.locator('#daftarDeteksi .chip', { hasText: 'google.com' }).locator('button', { hasText: 'Hapus sekarang' }).click(); await tidur(700);
  sisa = await namaCookie(ctx);
  ok('14b "Hapus sekarang" google.com menghapus SEMUA cookie login-nya, NID tetap', !sisa.includes('.google.com:SID') && !sisa.includes('.google.com:HSID') && !sisa.includes('.google.com:__Secure-1PSID') && sisa.includes('.google.com:NID'), sisa);

  // ---- Pemicu "semua jendela ditutup lalu dibuka lagi" ----
  const hasListener = await sw.evaluate(() => chrome.windows.onRemoved.hasListener(tandaiJendelaTertutup) && chrome.windows.onCreated.hasListener(saatJendelaDibuat) && chrome.runtime.onStartup.hasListener(saatBrowserDibuka));
  ok('15 ketiga pemicu terpasang (onStartup, windows.onRemoved, windows.onCreated)', hasListener);
  const siapkan = async () => { await sw.evaluate(async () => { await chrome.storage.session.clear(); await chrome.storage.local.remove(['jendelaTertutup', 'riwayatBersih']); await chrome.storage.local.set({ hapusSaatBuka: [{ situs: 'instagram.com', mode: 'sesi' }] }); }); await ctx.addCookies([ck('sessionid', '.instagram.com')]); await tidur(300); };
  const bendera = () => sw.evaluate(() => chrome.storage.local.get('jendelaTertutup').then((d) => !!d.jendelaTertutup));
  const riwayat = () => sw.evaluate(() => chrome.storage.local.get('riwayatBersih').then((d) => d.riwayatBersih || []));
  await siapkan();
  // masih ada jendela lain -> jangan ditandai
  await sw.evaluate(async () => { await tandaiJendelaTertutup(); });
  ok('16 masih ada jendela terbuka -> belum ditandai "tertutup"', !(await bendera()));
  await sw.evaluate(async () => { await saatJendelaDibuat(); }); await tidur(300);
  ok('16b jendela baru tanpa penanda -> TIDAK membersihkan (aman di tengah sesi)', (await namaCookie(ctx)).includes('.instagram.com:sessionid') && (await riwayat()).length === 0);
  // semua jendela ditutup
  await sw.evaluate(async () => { const asli = chrome.windows.getAll; chrome.windows.getAll = async () => []; try { await tandaiJendelaTertutup(); } finally { chrome.windows.getAll = asli; } });
  ok('17 semua jendela biasa tertutup -> ditandai', await bendera());
  await sw.evaluate(async () => { await saatJendelaDibuat(); }); await tidur(800);
  ok('17b jendela dibuka lagi -> cookie login situs terpilih dihapus, penanda dibersihkan', !(await namaCookie(ctx)).includes('.instagram.com:sessionid') && !(await bendera()), await namaCookie(ctx));
  let rw = await riwayat();
  ok('17c riwayat mencatat sumber "jendela" dan 1 cookie', rw.length === 1 && rw[0].sumber === 'jendela' && rw[0].jumlah === 1, rw);
  // startup menyusul dalam 20 detik -> tidak dobel
  await ctx.addCookies([ck('sessionid', '.instagram.com')]);
  await sw.evaluate(async () => { await saatBrowserDibuka(); }); await tidur(500);
  ok('18 startup tepat setelah pemicu jendela tidak dijalankan dobel (batas 20 detik)', (await namaCookie(ctx)).includes('.instagram.com:sessionid') && (await riwayat()).length === 1);
  // startup biasa
  await siapkan();
  await sw.evaluate(async () => { await saatBrowserDibuka(); }); await tidur(600);
  rw = await riwayat();
  ok('19 startup biasa: cookie dihapus & riwayat "startup"', !(await namaCookie(ctx)).includes('.instagram.com:sessionid') && rw.length === 1 && rw[0].sumber === 'startup', rw);
  // jendela sungguhan dibuat -> tidak boleh membersihkan karena masih ada jendela lain
  await siapkan();
  await sw.evaluate(async () => { const w = await chrome.windows.create({ url: 'about:blank' }); self.__w = w.id; }); await tidur(800);
  ok('20 membuat jendela sungguhan saat jendela lain masih terbuka tidak membersihkan apa pun', (await namaCookie(ctx)).includes('.instagram.com:sessionid') && (await riwayat()).length === 0);
  // tampilan riwayat
  await sw.evaluate(async () => { await chrome.storage.session.clear(); await saatBrowserDibuka(); }); await tidur(600);
  await p2.evaluate(() => tampilkanBersih()); await tidur(500);
  const tr1 = await p2.locator('#riwayatBersih').innerText();
  ok('21 popup menampilkan riwayat (sumber & jumlah)', /Riwayat pembersihan/.test(tr1) && /browser dibuka/.test(tr1) && /1 cookie dihapus/.test(tr1), tr1);
  await p2.screenshot({ path: S + '/bersih-riwayat.png' });
  ok('13 tanpa galat JS', galat.length === 0, galat);
  await ctx.close();
})().catch((e) => { console.log('BERHENTI:', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(2); });
