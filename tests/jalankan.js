// Menjalankan semua tes tanpa browser. Pakai: node tests/jalankan.js
const cp = require('child_process'), path = require('path');
let gagal = 0;
for (const n of ['uji_murni.js', 'uji_sinyal_murni.js', 'uji_kunci_bahasa.js', 'uji_ekstensi.js', 'uji_pemeriksa.js']) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, n)], { encoding: 'utf8' });
  const baris = (r.stdout || '').trim().split('\n').filter(Boolean);
  console.log((r.status === 0 ? 'LULUS ' : 'GAGAL ') + n + '  ' + (baris[baris.length - 1] || r.stderr.slice(0, 200)));
  if (r.status !== 0) { gagal++; console.log(r.stdout.slice(-1500), r.stderr.slice(-500)); }
}
process.exit(gagal ? 1 : 0);
