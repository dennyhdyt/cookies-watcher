const { chromium } = require('playwright'); const fs=require('fs');
const REPO=require('./lib').REPO, S=require('./lib').SCRATCH, E=S+'/ext-bn';
fs.rmSync(E,{recursive:true,force:true}); fs.mkdirSync(E);
for (const f of fs.readdirSync(REPO)) if (/\.(js|html|css|png|json)$/.test(f)&&f!=='package.json') fs.copyFileSync(REPO+'/'+f,E+'/'+f);
const t=(ms)=>new Promise(r=>setTimeout(r,ms));
const ok=(n,c,d)=>{console.log((c?'LULUS  ':'GAGAL  ')+n+(c?'':' -> '+JSON.stringify(d)));if(!c)process.exitCode=1;};
(async()=>{
 fs.rmSync(S+'/profil-bn',{recursive:true,force:true});
 const ctx=await chromium.launchPersistentContext(S+'/profil-bn',{channel:'chromium',headless:true,args:['--disable-extensions-except='+E,'--load-extension='+E]});
 const sw=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'); await t(1500);
 await sw.evaluate(()=>{ self.__notif=0; const asli=chrome.notifications.create.bind(chrome.notifications); chrome.notifications.create=(o,cb)=>{ self.__notif++; return asli(o,cb); }; });
 const exp=Math.floor(Date.now()/1000)+99999;
 // 9 domain tiruan berbeda -> 9 peringatan, tapi notifikasi maksimal 5
 const dom=['faceb00k.com','g00gle.com','githu6.com','faceb0ok.com','gooogle.com','gihtub.com','facebok.com','gogle.com','faceboook.com'];
 await ctx.addCookies(dom.map((d,i)=>({name:'c'+i,value:'v',domain:d,path:'/',secure:true,expires:exp})));
 await t(2500);
 const st=await sw.evaluate(async()=>({a:(await chrome.storage.local.get('peringatan')).peringatan||[], n:self.__notif}));
 ok('9 domain tiruan -> semua tercatat sebagai peringatan', st.a.length===9, st.a.length);
 ok('notifikasi dibatasi 5 per jam', st.n===5, st.n);
 // cookie sesi berulang dari situs yang sama tidak dicatat ulang dalam 10 menit
 await ctx.clearCookies(); await sw.evaluate(()=>chrome.storage.local.set({peringatan:[]}));
 for (let i=0;i<4;i++){ await ctx.addCookies([{name:'sessionid',value:'v'+i,domain:'.github.com',path:'/',secure:true,httpOnly:true,expires:exp}]); await t(300); }
 await t(800);
 const st2=await sw.evaluate(async()=>((await chrome.storage.local.get('peringatan')).peringatan||[]).filter(p=>p.jenis==='sesi').length);
 ok('4 perubahan cookie sesi yang sama -> 1 peringatan', st2===1, st2);
 // teks panjang dari situs dipangkas
 await sw.evaluate(()=>chrome.storage.local.set({peringatan:[]}));
 try{ await ctx.addCookies([{name:'x'.repeat(3000),value:'v',domain:'facebook-login.com',path:'/',secure:true,expires:exp}]); }catch(e){console.log('addCookies galat',String(e).slice(0,120));}
 console.log('ada di browser:', (await ctx.cookies()).filter(c=>c.domain.includes('login')).map(c=>c.name.length));
 await t(1000);
 console.log('mirip?', JSON.stringify(await sw.evaluate(async()=>periksaDomainMirip('facebook-login.com', await ambilSitusDipantau()))));
 const p=await sw.evaluate(async()=>((await chrome.storage.local.get('peringatan')).peringatan||[])[0]);
 ok('nama cookie sangat panjang dipangkas saat disimpan', p && p.nama.length<=200, p&&p.nama.length);
 await ctx.close();
})();
