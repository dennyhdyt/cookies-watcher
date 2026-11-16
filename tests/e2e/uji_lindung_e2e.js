const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = require('./lib').REPO, S = require('./lib').SCRATCH;
const ok = (n, c, d) => { console.log((c ? 'LULUS  ' : 'GAGAL  ') + n + (c ? '' : ' -> ' + String(JSON.stringify(d)).slice(0, 600))); if (!c) process.exitCode = 1; };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
const ck = (name, domain) => ({ name, value: 'RAHASIA123', domain, path: '/', secure: true, expires: exp });
function salin(tujuan, denganBd) {
  fs.rmSync(tujuan, { recursive: true, force: true }); fs.mkdirSync(tujuan, { recursive: true });
  for (const f of fs.readdirSync(REPO)) if (/\.(js|html|css|png|json)$/.test(f) && f !== 'package.json') fs.copyFileSync(path.join(REPO, f), path.join(tujuan, f));
  if (denganBd) { const m = JSON.parse(fs.readFileSync(tujuan + '/manifest.json')); m.permissions.push('browsingData'); m.optional_permissions = m.optional_permissions.filter((x) => x !== 'browsingData'); fs.writeFileSync(tujuan + '/manifest.json', JSON.stringify(m)); }
}
async function buka(ext, profil) {
  fs.rmSync(profil, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(profil, { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + ext, '--load-extension=' + ext] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker'); await tidur(1500);
  await ctx.route(/^https?:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>t</title>x' }));
  return { ctx, sw, id: new URL(sw.url()).host };
}
(async () => {
  salin(S + '/ext-lindung', true);
  const { ctx, sw, id } = await buka(S + '/ext-lindung', S + '/profil-lindung');
  const nama = async () => (await ctx.cookies()).map((c) => c.domain + ':' + c.name).sort();
  const ls = async (u) => { const p = await ctx.newPage(); await p.goto(u); const v = await p.evaluate(() => localStorage.getItem('token')); await p.close(); return v; };
  const setLs = async (u) => { const p = await ctx.newPage(); await p.goto(u); await p.evaluate(() => localStorage.setItem('token', 'rahasia')); await p.close(); };
  const simpan = () => sw.evaluate(() => chrome.storage.local.get(null));
  const galat = [];
  const popup = async (urlTab) => {
    const p = await ctx.newPage(); p.on('pageerror', (e) => galat.push(e.message));
    p.on('dialog', (d) => { p._dialog = d.message(); d.accept(); });
    await p.setViewportSize({ width: 420, height: 1100 });
    await p.goto(`chrome-extension://${id}/popup.html`);
    await p.evaluate((u) => { chrome.tabs.query = async () => [{ url: u, active: true }]; }, urlTab);
    await p.click('#tab-bersih'); await p.evaluate(() => tampilkanBersih()); await tidur(500);
    return p;
  };

  // ===== A. situs dengan cookie login biasa =====
  await ctx.addCookies([ck('sid_toko', '.tokokita.test'), ck('_ga', '.tokokita.test'), ck('theme', '.tokokita.test'), ck('auth_token', 'www.tokokita.test')]);
  let p = await popup('https://www.tokokita.test/dashboard');
  ok('A1 kartu Tab ini: nama situs dari tab, status Belum dilindungi', /tokokita\.test/.test(await p.locator('.kartu-tab').innerText()) && /Belum dilindungi/.test(await p.locator('.kartu-tab').innerText()), await p.locator('.kartu-tab').innerText());
  await p.click('#tombolLindungi'); await tidur(600);
  const panel = p.locator('.panel-pilih');
  const baris = async (n) => panel.locator('label.centang', { hasText: n }).first();
  const dicentang = async (n) => (await baris(n)).locator('input').isChecked();
  ok('A2 panel menampilkan NAMA cookie', (await panel.innerText()).includes('sid_toko') && (await panel.innerText()).includes('_ga') && (await panel.innerText()).includes('theme'));
  ok('A3 sid_toko dan auth_token tercentang (disarankan), _ga dan theme tidak', await dicentang('sid_toko') && await dicentang('auth_token') && !(await dicentang('_ga')) && !(await dicentang('theme')));
  ok('A4 _ga diberi keterangan pelacak', /pelacak/.test(await (await baris('_ga')).innerText()));
  ok('A5 tidak ada peringatan kuning (ada cookie login), opsi data penyimpanan tidak tercentang', (await p.locator('.peringatan-kuning').count()) === 0 && !(await panel.locator('label.centang', { hasText: 'localStorage' }).locator('input').isChecked()));
  ok('A6 nilai cookie tidak muncul di panel', !(await p.locator('#panel-bersih').innerText()).includes('RAHASIA123'));
  await p.click('#tombolSimpanLindungi'); await tidur(700);
  let st = await simpan();
  ok('A7 tersimpan: nama pilihan, tab-tutup, browser-dibuka', JSON.stringify(st.pengaturanSitus['tokokita.test'].nama.sort()) === '["auth_token","sid_toko"]' && st.hapusSaatTabTutup.includes('tokokita.test') && st.hapusSaatBuka.some((x) => x.situs === 'tokokita.test' && x.mode === 'sesi'), st);
  ok('A8 origins kosong (opsi data tidak dipilih)', st.pengaturanSitus['tokokita.test'].origins.length === 0);
  ok('A9 kartu kini berstatus Dilindungi dan panel tertutup', /Dilindungi/.test(await p.locator('.kartu-tab').innerText()) && await p.locator('.panel-pilih').isHidden());
  ok('A10 muncul di daftar Situs terlindungi dengan dua pil nyala', (await p.locator('.kartu-lindung', { hasText: 'tokokita.test' }).locator('.pil.aktif').count()) === 2);
  await p.close();

  // tab ditutup: hanya cookie pilihan yang hilang
  await tidur(600);
  const t1 = await ctx.newPage(); await t1.goto('https://www.tokokita.test/a'); await tidur(500);
  await t1.close(); await tidur(1200);
  let n = await nama();
  ok('A11 tab ditutup: cookie pilihan terhapus', !n.includes('.tokokita.test:sid_toko') && !n.includes('www.tokokita.test:auth_token'), n);
  ok('A12 cookie yang tidak dipilih (_ga, theme) tetap ada', n.includes('.tokokita.test:_ga') && n.includes('.tokokita.test:theme'), n);

  // ===== B. situs login di localStorage (seperti Discord) =====
  await ctx.addCookies([ck('__dcfduid', '.chat.test'), ck('locale', '.chat.test')]);
  await setLs('https://chat.test/');
  p = await popup('https://chat.test/channels/@me');
  await p.click('#tombolLindungi'); await tidur(600);
  ok('B1 peringatan kuning "login tidak terlihat di cookie" muncul', (await p.locator('.peringatan-kuning').count()) === 1 && /tidak terlihat di cookie/.test(await p.locator('.peringatan-kuning').innerText()));
  ok('B2 __dcfduid ditandai pelacak dan TIDAK tercentang', /pelacak/.test(await p.locator('.panel-pilih label.centang', { hasText: '__dcfduid' }).innerText()) && !(await p.locator('.panel-pilih label.centang', { hasText: '__dcfduid' }).locator('input').isChecked()));
  ok('B3 opsi data penyimpanan sudah tercentang otomatis', await p.locator('.panel-pilih label.centang', { hasText: 'localStorage' }).locator('input').isChecked());
  await p.click('#tombolSimpanLindungi'); await tidur(800);
  st = await simpan();
  ok('B4 origin tab tersimpan', JSON.stringify(st.pengaturanSitus['chat.test'].origins) === '["https://chat.test"]', st.pengaturanSitus);
  ok('B5 daftar menandai data penyimpanan ikut dihapus', /data penyimpanan/.test(await p.locator('.kartu-lindung', { hasText: 'chat.test' }).innerText()));
  await p.close(); await tidur(500);
  const t2 = await ctx.newPage(); await t2.goto('https://chat.test/x'); await tidur(500);
  await t2.close(); await tidur(1500);
  ok('B6 tab ditutup: localStorage token terhapus', (await ls('https://chat.test/')) === null);
  ok('B7 cookie non-login tidak disentuh', (await nama()).includes('.chat.test:__dcfduid') && (await nama()).includes('.chat.test:locale'));
  ok('B8 situs lain tidak tersentuh (localStorage other.test aman)', await (async () => { await setLs('https://other.test/'); await setLs('https://chat.test/'); const t = await ctx.newPage(); await t.goto('https://chat.test/y'); await tidur(400); await t.close(); await tidur(1200); return (await ls('https://other.test/')) === 'rahasia'; })());
  const hist = await sw.evaluate(() => new Promise((r) => chrome.permissions.contains({ permissions: ['history'] }, r)));
  ok('B9 ekstensi tidak punya izin history', hist === false);

  // ===== C. mode "semua cookie" =====
  await ctx.addCookies([ck('_ga', '.penuh.test'), ck('x1', '.penuh.test'), ck('sid', '.penuh.test')]);
  p = await popup('https://penuh.test/');
  await p.click('#tombolLindungi'); await tidur(500);
  await p.locator('.panel-pilih label.centang', { hasText: 'SEMUA cookie' }).locator('input').check();
  await p.click('#tombolSimpanLindungi'); await tidur(700); await p.close(); await tidur(500);
  const t3 = await ctx.newPage(); await t3.goto('https://penuh.test/'); await tidur(500); await t3.close(); await tidur(1200);
  ok('C1 mode semua: seluruh cookie situs terhapus saat tab ditutup', !(await nama()).some((x) => x.includes('penuh.test')), await nama());
  st = await simpan();
  ok('C2 mode browser-dibuka ikut "semua"', st.hapusSaatBuka.some((x) => x.situs === 'penuh.test' && x.mode === 'semua'), st.hapusSaatBuka);

  // ===== D. daftar: pil, hapus dari daftar, hapus sekarang =====
  p = await popup('https://chat.test/');
  const kartuChat = () => p.locator('.kartu-lindung', { hasText: 'chat.test' });
  await kartuChat().locator('.pil', { hasText: 'Saat tab ditutup' }).click(); await tidur(500);
  st = await simpan();
  ok('D1 pil tab-ditutup dimatikan: situs keluar dari daftar tab-tutup', !st.hapusSaatTabTutup.includes('chat.test'));
  ok('D2 tampilan pil: mati', (await kartuChat().locator('.pil', { hasText: 'Saat tab ditutup' }).getAttribute('aria-pressed')) === 'false');
  await setLs('https://chat.test/');
  await kartuChat().getByRole('button', { name: 'Hapus sekarang' }).click(); await tidur(1000);
  ok('D3 "Hapus sekarang" juga menghapus localStorage situs itu', (await ls('https://chat.test/')) === null);
  await setLs('https://chat.test/');
  await kartuChat().getByRole('button', { name: 'Hapus dari daftar' }).click(); await tidur(700);
  st = await simpan();
  ok('D4 Hapus dari daftar: bersih dari ketiga tempat', !st.pengaturanSitus['chat.test'] && !st.hapusSaatTabTutup.includes('chat.test') && !st.hapusSaatBuka.some((x) => x.situs === 'chat.test'), st);
  ok('D5 setelah dikeluarkan, localStorage tidak dihapus lagi', (await ls('https://chat.test/')) === 'rahasia');
  await p.close();

  // ===== E. tombol darurat mencakup situs terlindungi tanpa cookie login =====
  await setLs('https://chat.test/');
  await sw.evaluate(() => simpanPerlindunganSitus('chat.test', { nama: [], semua: false, origins: ['https://chat.test'], tabTutup: false, browserDibuka: false }));
  await ctx.addCookies([ck('sessionid', '.instagram.com')]);
  p = await popup('https://chat.test/');
  await p.click('#tombolDarurat'); await tidur(1500);
  ok('E1 konfirmasi menyebut 4 situs (1 terdeteksi + 3 terlindungi)', /4 situs/.test(p._dialog || ''), p._dialog);
  ok('E2 darurat menghapus login instagram dan localStorage chat.test', !(await nama()).includes('.instagram.com:sessionid') && (await ls('https://chat.test/')) === null);

  // ===== F. Inggris =====
  await p.click('#bahasa-en'); await tidur(400); await p.click('#tab-bersih'); await p.evaluate(() => tampilkanBersih()); await tidur(500);
  ok('F1 teks Inggris di kartu dan daftar', /Protected sites/.test(await p.locator('#panel-bersih').innerText()) && /Protect this site|Manage protection/.test(await p.locator('#tombolLindungi').innerText()), await p.locator('#tombolLindungi').innerText());
  ok('F2 tidak ada galat halaman', galat.length === 0, galat);
  await ctx.close();

  // ===== G. manifest asli (browsingData opsional): tanpa izin, hapus data situs aman dilewati =====
  salin(S + '/ext-asli', false);
  const g = await buka(S + '/ext-asli', S + '/profil-asli');
  const hasil = await g.sw.evaluate(async () => {
    await simpanPerlindunganSitus('chat.test', { nama: [], semua: false, origins: ['https://chat.test'], tabTutup: true, browserDibuka: false });
    return { ada: typeof chrome.browsingData, n: await hapusDataPenyimpananSitus('chat.test') };
  });
  ok('G1 tanpa izin browsingData: tidak ada galat, tidak ada yang dihapus (0)', hasil.ada === 'undefined' && hasil.n === 0, hasil);
  const m = JSON.parse(fs.readFileSync(S + '/ext-asli/manifest.json'));
  ok('G2 manifest asli: browsingData hanya opsional', m.optional_permissions.includes('browsingData') && !m.permissions.includes('browsingData'), m);
  await g.ctx.close();
})();
