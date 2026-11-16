// Menjalankan semua tes Chromium satu per satu. Pakai: npm run test:e2e
// Syarat: npm ci, lalu  npx playwright install chromium
const cp = require("child_process"), fs = require("fs"), path = require("path");
const semua = fs.readdirSync(__dirname).filter((n) => /^uji_.*\.js$/.test(n)).sort();
const hanya = process.argv[2];
let gagal = 0;
for (const n of semua) {
  if (hanya && !n.includes(hanya)) continue;
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, n)], { encoding: "utf8", timeout: 240000 });
  const keluar = (r.stdout || "") + (r.stderr || "");
  const g = keluar.split("\n").filter((x) => /^GAGAL/.test(x)).length;
  const l = keluar.split("\n").filter((x) => /^LULUS/.test(x)).length;
  const baik = r.status === 0 && g === 0;
  console.log((baik ? "LULUS " : "GAGAL ") + n + "  (" + l + " lulus, " + g + " gagal)");
  if (!baik) { gagal++; console.log(keluar.slice(-2500)); }
}
process.exit(gagal ? 1 : 0);
