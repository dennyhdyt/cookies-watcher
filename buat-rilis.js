// ============================================================
// buat-rilis.js
// Cara pakai (butuh Node.js dan Git):   node buat-rilis.js
//
// Membuat zip rilis dari COMMIT terakhir (bukan dari isi folder kerja), lalu
// menulis checksum SHA-256 di samping zip-nya. Orang yang mengunduh bisa
// memastikan filenya tidak diubah di tengah jalan dengan membandingkan checksum.
//
// Syarat: tidak ada perubahan yang belum di-commit, dan pemeriksaan keamanan lolos.
// ============================================================

const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

process.chdir(__dirname);

function git(...argumen) {
  return execFileSync("git", argumen, { encoding: "utf8" }).trim();
}

if (git("status", "--porcelain") !== "") {
  console.error("Masih ada perubahan yang belum di-commit. Commit dulu supaya rilis cocok dengan riwayat.");
  process.exit(1);
}

try {
  execFileSync(process.execPath, ["periksa-keamanan.js"], { stdio: "inherit" });
} catch (e) {
  console.error("\nPemeriksaan keamanan gagal, rilis dibatalkan.");
  process.exit(1);
}

const versi = JSON.parse(fs.readFileSync("manifest.json", "utf8")).version;
const komit = git("rev-parse", "--short", "HEAD");
const nama = "pemantau-cookies-v" + versi + "-" + komit + ".zip";

execFileSync("git", ["archive", "--format=zip", "--prefix=pemantau-cookies/", "-o", nama, "HEAD"]);

const sha = crypto.createHash("sha256").update(fs.readFileSync(nama)).digest("hex");
fs.writeFileSync(nama + ".sha256", sha + "  " + nama + "\n");

console.log("\nRilis dibuat dari commit " + komit + ":");
console.log("  " + path.resolve(nama));
console.log("  SHA-256: " + sha);
console.log("Bagikan checksum ini lewat jalur yang terpisah dari zip-nya (misalnya di halaman rilis GitHub).");
