// Bantuan bersama untuk tes Chromium.
// REPO    = salinan bersih ekstensi (tanpa .git, node_modules, tests, zip) di folder sementara,
//           supaya yang diuji persis berkas ekstensi.
// SCRATCH = folder kerja sementara (profil browser dll), dihapus saat selesai.
const fs = require("fs"), os = require("os"), path = require("path");
const ASLI = path.resolve(__dirname, "..", "..");
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), "pemantau-e2e-"));
const REPO = path.join(SCRATCH, "ekstensi");
fs.mkdirSync(REPO);
const LEWATI = new Set([".git", ".github", "node_modules", "tests", "package.json", "package-lock.json"]);
for (const n of fs.readdirSync(ASLI)) {
  if (LEWATI.has(n) || /\.(zip|sha256)$/.test(n)) continue;
  fs.cpSync(path.join(ASLI, n), path.join(REPO, n), { recursive: true });
}
process.on("exit", () => { try { fs.rmSync(SCRATCH, { recursive: true, force: true }); } catch (e) {} });
module.exports = { REPO, SCRATCH, ASLI };
