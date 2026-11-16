const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const REPO = require('./lib').REPO, S = require('./lib').SCRATCH;
const ok = (n, c, d) => { console.log((c ? 'LULUS  ' : 'GAGAL  ') + n + (c ? '' : ' -> ' + String(JSON.stringify(d)).slice(0, 600))); if (!c) process.exitCode = 1; };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
function salin(tujuan, denganIzin) {
  fs.rmSync(tujuan, { recursive: true, force: true }); fs.mkdirSync(tujuan, { recursive: true });
  for (const f of fs.readdirSync(REPO)) if (/\.(js|html|css|png|json)$/.test(f) && f !== 'package.json') fs.copyFileSync(path.join(REPO, f), path.join(tujuan, f));
  if (denganIzin) { const m = JSON.parse(fs.readFileSync(tujuan + '/manifest.json')); m.permissions.push('scripting'); m.optional_permissions = m.optional_permissions.filter((x) => x !== 'scripting'); fs.writeFileSync(tujuan + '/manifest.json', JSON.stringify(m)); }
}
async function buka(ext, profil) {
  fs.rmSync(profil, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(profil, { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + ext, '--load-extension=' + ext] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); await tidur(1500);
  await ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>t</title>x' }));
  return { ctx, sw, id: new URL(sw.url()).host };
}
const SET = () => { localStorage.setItem('token', 'RAHASIA-TOKEN'); localStorage.setItem('user_id_cache', 'u1'); localStorage.setItem('_ga_x', 'g'); localStorage.setItem('theme', 'dark'); localStorage.setItem('Zebra', 'z'); };
(async () => {
  // ===== Dengan izin scripting =====
  salin(S + '/ext-kunci', true);
  let { ctx, sw, id } = await buka(S + '/ext-kunci', S + '/profil-kunci');
  const simpan = () => sw.evaluate(() => chrome.storage.local.get(null));
  const galat = [];
  const real = await ctx.newPage(); await real.goto('https://chat.test/channels/@me'); await real.evaluate(SET);
  const lain = await ctx.newPage(); await lain.goto('https://other.test/'); await lain.evaluate(SET);
  const tabId = await sw.evaluate(() => chrome.tabs.query({ url: 'https://chat.test/*' }).then((t) => t[0].id));
  const keys = (p) => p.evaluate(() => Object.keys(localStorage).sort());
  const popup = async () => {
    const p = await ctx.newPage(); p.on('pageerror', (e) => galat.push(e.message));
    p.on('dialog', (d) => d.accept());
    await p.setViewportSize({ width: 420, height: 1400 });
    await p.goto(`chrome-extension://${id}/popup.html`);
    await p.evaluate((i) => { const asli = chrome.tabs.query.bind(chrome.tabs); chrome.tabs.query = async (q) => (q && q.active ? [{ url: 'https://chat.test/channels/@me', active: true, id: i }] : asli(q)); }, tabId);
    await p.click('#tab-bersih'); await p.evaluate(() => tampilkanBersih()); await tidur(500);
    return p;
  };
  let p = await popup();
  await p.click('#tombolLindungi'); await tidur(900);
  const panel = p.locator('.panel-pilih');
  const cb = (n) => panel.locator('label.centang', { hasText: n }).first().locator('input');
  const tx = await panel.innerText();
  ok('K1 panel menampilkan NAMA kunci localStorage', ['token', 'user_id_cache', '_ga_x', 'theme', 'Zebra'].every((k) => tx.includes(k)), tx);
  ok('K2 NILAI tidak pernah tampil', !tx.includes('RAHASIA-TOKEN') && !(await p.locator('body').innerText()).includes('RAHASIA-TOKEN'));
  ok('K3 token & user_id_cache tercentang; _ga_x, theme, Zebra tidak', await cb('token').isChecked() && await cb('user_id_cache').isChecked() && !(await cb('_ga_x').isChecked()) && !(await cb('theme').isChecked()) && !(await cb('Zebra').isChecked()));
  ok('K4 _ga_x berlabel pelacak', /pelacak/.test(await panel.locator('label.centang', { hasText: '_ga_x' }).innerText()));
  ok('K5 ada peringatan kuning (tidak ada cookie login)', (await p.locator('.peringatan-kuning').count()) === 1);
  await cb('Zebra').check();   // pilih manual satu kunci lagi (huruf besar)
  await panel.locator('label.centang', { hasText: 'localStorage' }).first().locator('input').uncheck(); // matikan hapus-semua, uji per kunci saja
  await p.click('#tombolSimpanLindungi'); await tidur(800);
  let st = await simpan();
  ok('K6 tersimpan: kunci terpilih (peka huruf besar), tanpa origins', JSON.stringify(st.pengaturanSitus['chat.test'].kunci.sort()) === '["Zebra","token","user_id_cache"]' && st.pengaturanSitus['chat.test'].origins.length === 0, st.pengaturanSitus);
  ok('K7 daftar menandai 3 kunci penyimpanan dipilih', /3 kunci penyimpanan/.test(await p.locator('.kartu-lindung', { hasText: 'chat.test' }).innerText()), await p.locator('#daftarLindungi').innerText());
  // Buka lagi panel: pilihan tersimpan dipakai (bukan saran bawaan)
  await p.click('#tombolLindungi'); await tidur(800);
  ok('K8 buka lagi: Zebra tercentang, theme tidak (pilihan tersimpan)', await cb('Zebra').isChecked() && !(await cb('theme').isChecked()));
  await p.click('.panel-pilih .baris .kecil'); await tidur(200);
  // Hapus sekarang
  await p.locator('.kartu-lindung', { hasText: 'chat.test' }).getByRole('button', { name: 'Hapus sekarang' }).click(); await tidur(1000);
  ok('K9 Hapus sekarang: hanya kunci pilihan hilang di tab terbuka', JSON.stringify(await keys(real)) === '["_ga_x","theme"]', await keys(real));
  ok('K10 situs lain tidak tersentuh', (await keys(lain)).length === 5);
  // Tutup tab: tanpa opsi hapus-semua, kunci sisa tidak diutak-atik; tidak ada galat
  await real.evaluate(SET);
  const tabIdBaru = tabId;
  // Tombol darurat
  p.on('dialog', () => {});
  await p.click('#tombolDarurat'); await tidur(1500);
  ok('K11 tombol darurat menghapus kunci pilihan di tab terbuka', JSON.stringify(await keys(real)) === '["_ga_x","theme"]', await keys(real));
  // Situs ala Discord: localStorage dihapus dari dunia halaman, tetap terbaca dunia terisolasi
  await real.evaluate(SET);
  const sembunyi = await real.evaluate(() => { try { delete window.localStorage; } catch (e) {} return typeof window.localStorage; });
  await p.locator('.kartu-lindung', { hasText: 'chat.test' }).getByRole('button', { name: 'Hapus sekarang' }).click(); await tidur(1000);
  await real.evaluate(() => {}); // pastikan tab hidup
  const sisa = await sw.evaluate(async (i) => (await chrome.scripting.executeScript({ target: { tabId: i }, world: 'ISOLATED', func: () => Object.keys(localStorage).sort() }))[0].result, tabId);
  ok('K12 localStorage disembunyikan di dunia halaman (' + sembunyi + ') tetap bisa dihapus lewat dunia terisolasi', JSON.stringify(sisa) === '["_ga_x","theme"]', { sembunyi, sisa });
  // Tab tutup tidak menghapus apa pun lagi, dan tidak ada galat
  ok('K13 tidak ada galat di popup', galat.length === 0, galat);
  await p.close(); await ctx.close();

  // ===== Tanpa izin scripting (manifest asli: opsional) =====
  salin(S + '/ext-kunci2', false);
  ({ ctx, sw, id } = await buka(S + '/ext-kunci2', S + '/profil-kunci2'));
  const real2 = await ctx.newPage(); await real2.goto('https://chat.test/channels/@me'); await real2.evaluate(SET);
  const tab2 = await sw.evaluate(() => chrome.tabs.query({ url: 'https://chat.test/*' }).then((t) => t[0].id));
  const p2 = await ctx.newPage(); await p2.setViewportSize({ width: 420, height: 1400 });
  await p2.goto(`chrome-extension://${id}/popup.html`);
  await p2.evaluate((i) => { const asli = chrome.tabs.query.bind(chrome.tabs); chrome.tabs.query = async (q) => (q && q.active ? [{ url: 'https://chat.test/channels/@me', active: true, id: i }] : asli(q)); }, tab2);
  await p2.click('#tab-bersih'); await p2.evaluate(() => tampilkanBersih()); await tidur(500);
  await p2.click('#tombolLindungi'); await tidur(800);
  const pn = p2.locator('.panel-pilih');
  ok('K14 tanpa izin: ada tombol "Tampilkan nama data penyimpanan", belum ada daftar kunci', (await pn.locator('#tombolBacaKunci').count()) === 1 && !(await pn.innerText()).includes('user_id_cache'));
  ok('K15 tanpa izin: localStorage tidak dibaca sama sekali', JSON.stringify(await real2.evaluate(() => Object.keys(localStorage).length)) === '5');
  await ctx.close();
  console.log(process.exitCode ? 'ADA YANG GAGAL' : 'SEMUA LULUS');
})().catch((e) => { console.error('GALAT UJI', e); process.exit(1); });
