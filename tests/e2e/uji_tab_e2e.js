const { chromium } = require('playwright');
const E=require('./lib').REPO, S=require('./lib').SCRATCH;
const hasil=[]; const cek=(n,ok,d)=>{hasil.push(ok);console.log((ok?'LULUS  ':'GAGAL  ')+n+(ok||d===undefined?'':'\n   -> '+JSON.stringify(d).slice(0,300)));};
const tidur=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const ctx=await chromium.launchPersistentContext(S+'/profil-tab',{channel:'chromium',headless:true,args:['--disable-extensions-except='+E,'--load-extension='+E]});
const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
const id=new URL(sw.url()).host;
const p=await ctx.newPage(), gal=[]; p.on('pageerror',e=>gal.push(e.message));
p.on('console',m=>{if(m.type()==='error')gal.push(m.text());});
await p.setViewportSize({width:420,height:800});
await p.goto(`chrome-extension://${id}/popup.html`);
const panel=['peringatan','pindai','ekstensi','pengaturan'];
const terlihat=async()=>{const o=[];for(const x of panel) if(await p.locator('#panel-'+x).isVisible()) o.push(x);return o;};
cek('1 awalnya hanya tab Peringatan yang tampil', JSON.stringify(await terlihat())==='["peringatan"]', await terlihat());
cek('2 lima tab berjajar menyamping dalam satu baris', await p.evaluate(()=>{const t=[...document.querySelectorAll('.tab button')].map(b=>b.getBoundingClientRect().top);return t.length===5&&t.every(x=>Math.abs(x-t[0])<2);}));
for (const x of panel) {
  await p.click('#tab-'+x);
  const v=await terlihat();
  const sel=await p.locator('[role=tab][aria-selected=true]').count();
  cek(`3 klik tab ${x}: hanya panelnya yang tampil, satu tab terpilih`, JSON.stringify(v)===JSON.stringify([x])&&sel===1, v);
  const w=await p.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  cek(`3b tab ${x}: tanpa gulir samping`, w[0]<=w[1], w);
}
// keyboard
await p.click('#tab-peringatan'); await p.keyboard.press('ArrowRight');
cek('4 panah kanan pindah ke tab berikutnya', JSON.stringify(await terlihat())==='["pindai"]');
await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
cek('5 panah kiri dari tab pertama berputar ke tab terakhir', JSON.stringify(await terlihat())==='["pengaturan"]', await terlihat());
// ingat tab
await p.reload();
cek('6 tab terakhir diingat saat popup dibuka lagi', JSON.stringify(await terlihat())==='["pengaturan"]', await terlihat());
// seksi pengaturan lipat, bisa dibuka
await p.click('summary >> text=Daftar putih'); 
cek('7 seksi Pengaturan bisa dibuka dan isinya bisa dipakai', await p.locator('#inputSitus').isVisible());
await p.fill('#inputSitus','contoh.com'); await p.click('#tombolTambah'); await tidur(300);
cek('7b menambah daftar putih dari tab Pengaturan berfungsi', /contoh\.com/.test(await p.locator('#daftarPutih').innerText()));
// angka peringatan
await ctx.addCookies([{name:'sessionid',value:'v',domain:'.facebook.com',path:'/',secure:true}]);
const t0=Date.now(); while(Date.now()-t0<6000 && !/\d/.test(await p.locator('#tab-peringatan').innerText())){ await p.reload(); await tidur(300);} 
await p.click('#tab-peringatan');
const jumlah=await p.locator('#tab-peringatan .jumlah').innerText().catch(()=>null);
cek('8 tab Peringatan menampilkan jumlah peringatan', jumlah==='1', jumlah);
await p.click('#bersihkanPeringatan'); await tidur(400);
cek('8b angka hilang setelah peringatan dibersihkan', (await p.locator('#tab-peringatan .jumlah').count())===0);
cek('9 tanpa galat JavaScript', gal.length===0, gal);
await ctx.close();
const g=hasil.filter(x=>!x).length; console.log(`\nRINGKASAN TAB: ${hasil.length-g}/${hasil.length} lulus`); process.exit(g?1:0);
})().catch(e=>{console.log('BERHENTI',e.message.slice(0,300));process.exit(2);});
