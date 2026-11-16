const { chromium } = require('playwright');
const fs = require('fs'), url = require('url');
const S = require('./lib').SCRATCH;
const EXT = require('./lib').REPO;
fs.rmSync(S + '/profil-sinyal', { recursive: true, force: true });
const A = (s) => url.domainToASCII(s);
const HOMOGRAF = A('gооgle.com'), CAMPUR = A('exаmple.com'), MUNCHEN = A('münchen.de');
const hasil = [];
const cek = (nama, ok, detail) => { hasil.push({ nama, ok: !!ok }); console.log((ok ? 'LULUS  ' : 'GAGAL  ') + nama + (ok || !detail ? '' : '\n         -> ' + String(detail).slice(0, 500))); };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
async function tunggu(fn, ms = 6000) { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch (e) {} if (Date.now() - t > ms) return false; await tidur(100); } }

(async () => {
  const ctx = await chromium.launchPersistentContext(S + '/profil-sinyal', { channel: 'chromium', headless: true,
    args: ['--disable-extensions-except=' + EXT, '--load-extension=' + EXT] });
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 15000 }));
  const id = new URL(sw.url()).host;
  const simpan = () => sw.evaluate(() => chrome.storage.local.get(null));
  const peringatan = async () => (await simpan()).peringatan || [];
  await sw.evaluate(() => { globalThis.__notif = []; const asli = chrome.notifications.create.bind(chrome.notifications); chrome.notifications.create = (o, cb) => { globalThis.__notif.push(o); return asli(o, cb); }; });
  const notif = () => sw.evaluate(() => globalThis.__notif);

  const galat = [], dialog = [];
  const popup = await ctx.newPage();
  popup.on('pageerror', (e) => galat.push(e.message));
  popup.on('console', (m) => { if (m.type() === 'error') galat.push(m.text()); });
  popup.on('dialog', async (d) => { dialog.push(d.message()); await d.accept(); });
  await popup.setViewportSize({ width: 420, height: 1000 });
  const bukaPopup = async () => { await popup.goto(`chrome-extension://${id}/popup.html`); await popup.evaluate(() => { document.querySelectorAll('.panel').forEach((p) => { p.hidden = false; }); document.querySelectorAll('details').forEach((d) => { d.open = true; }); }); await popup.waitForSelector('#barisStatus .status-baris'); };

  const kue = (domain, nama = 'tes') => ({ name: nama, value: 'v', domain, path: '/', secure: domain.includes('.') && !/^\d/.test(domain) });

  // ---- real-time ----
  await ctx.addCookies([kue('google.xyz', 'sessionid')]);
  await tunggu(async () => (await peringatan()).some((p) => p.situs === 'google.xyz'));
  let p1 = (await peringatan()).find((p) => p.situs === 'google.xyz');
  cek('1 google.xyz -> peringatan, meniru google.com, alasan menyebut akhiran .xyz', p1 && p1.jenis === 'domain-mirip' && p1.ditiru === 'google.com' && /\.xyz/.test(p1.alasan), JSON.stringify(p1));
  cek('1b notifikasi "Domain mencurigakan: google.xyz" terkirim', (await notif()).some((n) => n.title === 'Domain mencurigakan: google.xyz'), JSON.stringify(await notif()));

  await ctx.addCookies([kue(HOMOGRAF, 'sessionid')]);
  await tunggu(async () => (await peringatan()).some((p) => p.situs === HOMOGRAF));
  let p2 = (await peringatan()).find((p) => p.situs === HOMOGRAF);
  cek('2 domain homograf ("g[o Kiril][o Kiril]gle", ' + HOMOGRAF + ') -> peringatan, meniru google.com', p2 && p2.ditiru === 'google.com' && /homograf/.test(p2.alasan), JSON.stringify(p2));

  await ctx.addCookies([kue(CAMPUR, 'sessionid')]);
  await tunggu(async () => (await peringatan()).some((p) => p.situs === CAMPUR));
  let p3 = (await peringatan()).find((p) => p.situs === CAMPUR);
  cek('3 huruf Latin+Kiril tanpa merek (' + CAMPUR + ') -> peringatan dengan ditiru kosong', p3 && p3.ditiru === null && /mencampur/.test(p3.alasan), JSON.stringify(p3));

  const jumlah = (await peringatan()).length;
  await ctx.addCookies([kue(MUNCHEN), kue('203.0.113.5'), kue('192.168.1.5'), kue('google.co.id', 'sessionid'), kue('doubleclick.net')]);
  await tidur(900);
  cek('4 IDN sah (münchen.de), IP publik, IP lokal, google.co.id, doubleclick.net TIDAK memicu peringatan real-time', (await peringatan()).length === jumlah, JSON.stringify((await peringatan()).map((p) => p.situs)));

  // ---- popup: daftar peringatan ----
  await bukaPopup();
  const teksPer = await popup.locator('#peringatan').innerText();
  cek('5 peringatan menampilkan judul "Domain mirip google.com: google.xyz"', /Domain mirip google\.com: google\.xyz/.test(teksPer), teksPer);
  cek('6 peringatan tanpa merek berjudul "Domain mencurigakan: ' + CAMPUR + '"', teksPer.includes('Domain mencurigakan: ' + CAMPUR) && !/Domain mirip null/.test(teksPer), teksPer);
  dialog.length = 0;
  await popup.locator('#peringatan .item', { hasText: CAMPUR }).getByText('Percayai situs ini').click();
  await tidur(300);
  cek('6b konfirmasi "Percayai" untuk domain tanpa merek tidak menulis "meniru null"', dialog.length === 1 && /mencurigakan/.test(dialog[0]) && !/null|meniru/.test(dialog[0]), dialog.join('|'));
  await tunggu(async () => ((await simpan()).daftarPutih || []).includes(CAMPUR));

  // ---- popup: pemindaian ----
  await popup.click('#tombolPindai');
  await tunggu(async () => (await popup.locator('#hasilPindai .item').count()) > 0);
  const scan = await popup.locator('#hasilPindai').innerText();
  cek('7 pemindaian: domain mirip google.xyz muncul', /Domain mirip google\.com: google\.xyz/.test(scan), scan);
  cek('8 pemindaian: "Perlu diperhatikan: 203.0.113.5" dengan alasan IP publik', /Perlu diperhatikan: 203\.0\.113\.5/.test(scan) && /IP publik/.test(scan), scan);
  cek('9 pemindaian: domain punycode münchen.de muncul dengan bentuk terbacanya', scan.includes('Perlu diperhatikan: ' + MUNCHEN) && scan.includes("terbaca sebagai 'münchen.de'"), scan);
  cek('10 pemindaian: IP lokal 192.168.1.5 dan google.co.id tidak ditandai sebagai domain mencurigakan', !scan.includes('Perlu diperhatikan: 192.168.1.5') && !/Domain (mirip|mencurigakan)[^\n]*google\.co\.id/.test(scan), scan);
  cek('11 pemindaian: domain yang sudah dipercaya (' + CAMPUR + ') tidak muncul lagi', !scan.includes(CAMPUR));
  const kelas = await popup.locator('#hasilPindai .item', { hasText: 'Perlu diperhatikan: 203.0.113.5' }).getAttribute('class');
  cek('12 item "perlu diperhatikan" memakai gaya kuning (bukan merah)', /perhatian/.test(kelas) && !/bahaya/.test(kelas), kelas);
  await popup.screenshot({ path: S + '/popup-sinyal.png', fullPage: true });

  // Percayai dari pemindaian
  await popup.locator('#hasilPindai .item', { hasText: 'Perlu diperhatikan: 203.0.113.5' }).getByText('Percayai').click();
  await tunggu(async () => ((await simpan()).daftarPutih || []).includes('203.0.113.5'));
  cek('13 "Percayai" pada IP publik -> masuk daftar putih dan barisnya hilang', ((await simpan()).daftarPutih || []).includes('203.0.113.5') && (await popup.locator('#hasilPindai .item', { hasText: '203.0.113.5' }).count()) === 0);
  await popup.locator('#hasilPindai .item', { hasText: 'Domain mirip google.com: google.xyz' }).getByText('Percayai').click();
  await tunggu(async () => ((await simpan()).daftarPutih || []).includes('google.xyz'));
  cek('14 "Percayai" pada domain mirip -> masuk daftar putih dan peringatannya ikut hilang', ((await simpan()).daftarPutih || []).includes('google.xyz') && !(await peringatan()).some((p) => p.situs === 'google.xyz'));

  // Hapus cookie domain punycode
  await popup.locator('#hasilPindai .item', { hasText: 'Perlu diperhatikan: ' + MUNCHEN }).getByText('Hapus semua cookie domain ini').click();
  await tunggu(async () => !(await ctx.cookies()).some((c) => c.domain.includes('xn--mnchen')));
  cek('15 "Hapus semua cookie domain ini" pada domain punycode benar-benar menghapus cookie', !(await ctx.cookies()).some((c) => c.domain.includes('xn--mnchen')));

  // Pindai ulang: IP & google.xyz tak muncul lagi
  await popup.click('#tombolPindai');
  await tidur(800);
  const scan2 = await popup.locator('#hasilPindai').innerText();
  cek('16 pindai ulang: sisa hanya yang belum dipercaya/dihapus (homograf google; tanpa IP, tanpa google.xyz, tanpa münchen)', scan2.includes(HOMOGRAF) && !scan2.includes('203.0.113.5') && !scan2.includes('google.xyz') && !scan2.includes(MUNCHEN), scan2);
  cek('99 tidak ada galat JavaScript di popup', galat.length === 0, galat.join(' | '));

  await ctx.close();
  const gagal = hasil.filter((h) => !h.ok);
  console.log('\nRINGKASAN SINYAL: ' + (hasil.length - gagal.length) + '/' + hasil.length + ' lulus');
  process.exit(gagal.length ? 1 : 0);
})().catch((e) => { console.log('BERHENTI:', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(2); });
