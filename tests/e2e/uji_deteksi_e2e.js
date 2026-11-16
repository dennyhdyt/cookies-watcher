// Deteksi cookie login: hanya nama yang dikenal yang dihitung; nama yang cuma mirip diabaikan.
const { chromium } = require('playwright');
const { REPO: E, SCRATCH: S } = require('./lib');
const ok = (n, c, d) => { console.log((c ? 'LULUS  ' : 'GAGAL  ') + n + (c ? '' : ' -> ' + String(JSON.stringify(d)).slice(0, 500))); if (!c) process.exitCode = 1; };
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const besok = Math.floor(Date.now() / 1000) + 86400 * 30;
const ck = (name, domain) => ({ name, value: 'v', domain, path: '/', secure: true, expires: besok });
const nama = async (ctx) => (await ctx.cookies()).map((c) => c.domain + ':' + c.name).sort();
(async () => {
  const ctx = await chromium.launchPersistentContext(S + '/profil-deteksi', { channel: 'chromium', headless: true, args: ['--disable-extensions-except=' + E, '--load-extension=' + E] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  await tidur(1000);
  await ctx.addCookies([
    ck('user_session', '.github.com'), ck('_ga', '.github.com'), ck('locale', '.github.com'),
    ck('app_token_v2', '.tokokita.com'), ck('guest_session_id', '.tokokita.com'), ck('theme', '.tokokita.com'),
    ck('sessionid', '.instagram.com'), ck('csrf_auth_x', '.instagram.com'),
  ]);
  const d = await sw.evaluate(() => cariSitusCookieLogin());
  const per = Object.fromEntries(d.map((x) => [x.situs, x]));
  ok('1 nama login dikenal terdeteksi', per['github.com'] && per['github.com'].jumlah === 1 && per['instagram.com'] && per['instagram.com'].jumlah === 1, d);
  ok('2 situs yang hanya punya cookie "mirip" (token/guest_session) tidak terdeteksi', !per['tokokita.com'], d);
  ok('3 nama mirip di situs yang terdeteksi tidak ikut dihitung', per['instagram.com'].jumlah === 1, per['instagram.com']);

  const p = await ctx.newPage();
  await p.goto('chrome-extension://' + id + '/popup.html');
  await p.click('#tab-bersih'); await tidur(800);
  const teks = await p.locator('#daftarDeteksi').innerText();
  ok('4 popup menampilkan situs pasti dan tidak menampilkan tokokita.com', /instagram\.com/.test(teks) && !/tokokita\.com/.test(teks), teks);

  const h = await sw.evaluate(() => keluarkanSemuaLogin());
  const n = await nama(ctx);
  ok('5 darurat menghapus cookie login yang dikenal', !n.includes('.github.com:user_session') && !n.includes('.instagram.com:sessionid'), n);
  ok('6 darurat tidak menyentuh cookie lain (mirip, pelacak, tema)', n.includes('.tokokita.com:app_token_v2') && n.includes('.tokokita.com:theme') && n.includes('.github.com:_ga') && n.includes('.instagram.com:csrf_auth_x'), n);
  await ctx.close();
})().catch((e) => { console.log('GAGAL  galat: ' + e.message); process.exit(1); });
