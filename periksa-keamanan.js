// ============================================================
// periksa-keamanan.js
// Cara pakai (butuh Node.js):   node periksa-keamanan.js
//
// Memeriksa aturan keamanan yang harus tetap berlaku di setiap perubahan:
//   - izin ekstensi tidak melebar
//   - tidak ada pemanggilan jaringan, eval, atau kode dari luar
//   - tidak ada yang membaca NILAI cookie
//   - tidak ada pintu masuk pesan dari situs web atau ekstensi lain
//
// Ini alat bantu untuk menangkap kesalahan dan perubahan berbahaya, BUKAN jaminan
// bahwa kode aman. Tetap baca setiap perubahan sebelum commit.
// ============================================================

const fs = require("fs");
const path = require("path");

const FOLDER = __dirname;
const gagal = [];
const peringatan = [];
const lolos = [];

// ---------- 1. manifest.json ----------

const IZIN_BOLEH = ["cookies", "storage", "notifications"];
const IZIN_OPSIONAL_BOLEH = ["management"];
const KUNCI_TERLARANG = [
  "content_scripts",          // menjalankan kode di dalam halaman situs lain
  "web_accessible_resources", // membuka file ekstensi ke halaman web
  "externally_connectable",   // membuka pintu pesan dari situs web / ekstensi lain
  "devtools_page",
  "chrome_url_overrides",
  "update_url",               // sumber pembaruan di luar toko resmi
  "declarative_net_request",
  "sandbox",
];

let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(FOLDER, "manifest.json"), "utf8"));
} catch (e) {
  gagal.push("manifest.json tidak bisa dibaca: " + e.message);
}

if (manifest) {
  const izin = manifest.permissions || [];
  const asing = izin.filter((i) => !IZIN_BOLEH.includes(i));
  if (asing.length) gagal.push("Izin baru di 'permissions': " + asing.join(", ") + ". Tinjau dulu; kalau memang perlu, ubah daftar IZIN_BOLEH di berkas ini.");
  else lolos.push("Izin wajib: " + (izin.join(", ") || "(tidak ada)"));

  const opsional = manifest.optional_permissions || [];
  const opsionalAsing = opsional.filter((i) => !IZIN_OPSIONAL_BOLEH.includes(i));
  if (opsionalAsing.length) gagal.push("Izin opsional baru: " + opsionalAsing.join(", "));
  else lolos.push("Izin opsional: " + (opsional.join(", ") || "(tidak ada)"));

  const host = manifest.host_permissions || [];
  if (host.length !== 1 || host[0] !== "<all_urls>") {
    gagal.push("host_permissions berubah: " + JSON.stringify(host) + ". Satu-satunya yang diharapkan adalah [\"<all_urls>\"].");
  } else {
    lolos.push("Akses situs: <all_urls> (diperlukan untuk membaca cookies semua situs)");
  }

  for (const kunci of KUNCI_TERLARANG) {
    if (kunci in manifest) gagal.push("manifest.json memuat '" + kunci + "', yang tidak boleh ada tanpa tinjauan khusus.");
  }

  const csp = (manifest.content_security_policy || {}).extension_pages || "";
  if (/unsafe-eval|unsafe-inline|https?:|\*/.test(csp)) {
    gagal.push("content_security_policy melonggarkan aturan (unsafe-eval/unsafe-inline/alamat luar): " + csp);
  } else if (!/script-src\s+'self'(\s*;|\s*$)/.test(csp)) {
    gagal.push("content_security_policy.extension_pages harus memuat \"script-src 'self'\".");
  } else {
    lolos.push("Kebijakan keamanan konten (CSP): " + csp);
  }

  const sw = manifest.background && manifest.background.service_worker;
  if (!sw || !fs.existsSync(path.join(FOLDER, sw))) gagal.push("service_worker tidak ditemukan: " + sw);
}

// ---------- 2. Isi berkas ----------

function kumpulkanBerkas(folder, hasil) {
  for (const nama of fs.readdirSync(folder)) {
    if (nama === ".git" || nama === "node_modules") continue;
    const penuh = path.join(folder, nama);
    if (fs.statSync(penuh).isDirectory()) kumpulkanBerkas(penuh, hasil);
    else hasil.push(penuh);
  }
  return hasil;
}

const EKSTENSI_AMAN = [".js", ".html", ".css", ".json", ".png", ".md"];
const EKSTENSI_BERBAHAYA = [".exe", ".dll", ".wasm", ".node", ".so", ".dylib", ".bat", ".cmd", ".ps1", ".vbs", ".scr", ".msi", ".jar"];

// Pola yang tidak boleh muncul di kode ekstensi: [pola, alasan].
const POLA_JS = [
  [/\bfetch\s*\(/, "fetch(): pemanggilan jaringan"],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest: pemanggilan jaringan"],
  [/\bWebSocket\b/, "WebSocket: pemanggilan jaringan"],
  [/\bEventSource\b/, "EventSource: pemanggilan jaringan"],
  [/\bsendBeacon\b/, "sendBeacon: mengirim data keluar"],
  [/\beval\s*\(/, "eval(): menjalankan teks sebagai kode"],
  [/\bnew\s+Function\b/, "new Function: menjalankan teks sebagai kode"],
  [/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/, "menulis HTML mentah (pakai textContent)"],
  [/\bchrome\.(scripting|debugger|webRequest|declarativeNetRequest|proxy|downloads|history|bookmarks|identity|nativeMessaging|privacy|sessions|topSites|pageCapture|tabCapture|desktopCapture)\b/, "API Chrome yang tidak dipakai proyek ini"],
  [/\bcookies\.set\s*\(/, "chrome.cookies.set: menulis cookie"],
  [/\b(?:cookie|ck)\.value\b/, "membaca NILAI cookie (proyek ini hanya boleh membaca nama dan pengaturannya)"],
  [/\bchrome\.runtime\.(onMessage|onMessageExternal|onConnect|onConnectExternal|sendMessage|connect|sendNativeMessage)\b/, "pintu masuk atau pengiriman pesan antar-bagian"],
  [/["'`]http:\/\/[a-z0-9]/i, "alamat http:// tanpa enkripsi"],
];

const berkas = kumpulkanBerkas(FOLDER, []);
let jumlahTautanHttps = 0;

for (const penuh of berkas) {
  const rel = path.relative(FOLDER, penuh);
  const ext = path.extname(penuh).toLowerCase();

  if (EKSTENSI_BERBAHAYA.includes(ext)) {
    gagal.push(rel + ": jenis berkas berbahaya/tak terduga (" + ext + ")");
    continue;
  }
  if (!EKSTENSI_AMAN.includes(ext) && rel !== ".gitignore") {
    peringatan.push(rel + ": jenis berkas tak terduga (" + (ext || "tanpa ekstensi") + ")");
    continue;
  }
  if (ext !== ".js" && ext !== ".html") continue;
  if (rel.startsWith("tests") || rel === path.basename(__filename) || rel === "buat-rilis.js") continue; // alat bantu, bukan bagian ekstensi

  const baris = fs.readFileSync(penuh, "utf8").split("\n");
  baris.forEach((teks, i) => {
    const t = teks.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("<!--")) return; // komentar
    const lokasi = rel + ":" + (i + 1);

    if (ext === ".js") {
      for (const [pola, alasan] of POLA_JS) {
        if (pola.test(teks)) gagal.push(lokasi + "  " + alasan + "\n      " + t.slice(0, 110));
      }
      // importScripts hanya boleh memuat berkas lokal, dan hanya di background.js
      const m = teks.match(/importScripts\s*\(([^)]*)\)/);
      if (m) {
        const argumen = m[1].split(",").map((s) => s.trim()).filter(Boolean);
        if (!argumen.every((a) => /^["'][\w.-]+\.js["']$/.test(a))) {
          gagal.push(lokasi + "  importScripts memuat sesuatu selain berkas .js lokal\n      " + t.slice(0, 110));
        }
      }
      // Alamat https:// hanya boleh ada di umum.js (tujuan tombol "keluar dari semua perangkat")
      if (/["'`]https:\/\/[a-z0-9]/i.test(teks)) {
        if (rel === "umum.js") jumlahTautanHttps++;
        else gagal.push(lokasi + "  alamat https:// di luar umum.js\n      " + t.slice(0, 110));
      }
    } else {
      if (/\son[a-z]+\s*=/i.test(teks)) gagal.push(lokasi + "  atribut event inline (onclick dll.)\n      " + t.slice(0, 110));
      if (/<script(?![^>]*\ssrc=)/i.test(teks)) gagal.push(lokasi + "  <script> inline\n      " + t.slice(0, 110));
      if (/(src|href)\s*=\s*["'](https?:)?\/\//i.test(teks)) gagal.push(lokasi + "  sumber dari alamat luar\n      " + t.slice(0, 110));
      if (/<(iframe|object|embed|form)\b/i.test(teks)) gagal.push(lokasi + "  elemen " + (teks.match(/<(iframe|object|embed|form)\b/i)[1]) + " tidak diharapkan\n      " + t.slice(0, 110));
      const s = teks.match(/<script[^>]*\ssrc=["']([^"']+)["']/i);
      if (s && !fs.existsSync(path.join(path.dirname(penuh), s[1]))) gagal.push(lokasi + "  skrip tidak ditemukan: " + s[1]);
    }
  });
}

if (jumlahTautanHttps > 0) lolos.push("Tautan https:// di umum.js (tujuan membuka halaman keamanan situs): " + jumlahTautanHttps);

// ---------- 3. Laporan ----------

console.log("PEMERIKSAAN KEAMANAN\n");
for (const t of lolos) console.log("  ok       " + t);
for (const t of peringatan) console.log("  PERHATIAN " + t);
for (const t of gagal) console.log("  GAGAL    " + t);
console.log(
  "\n" + (gagal.length === 0
    ? "Lolos: tidak ada aturan yang dilanggar. (Ini bukan jaminan; tetap tinjau setiap perubahan.)"
    : gagal.length + " aturan dilanggar. Tinjau dulu sebelum commit atau rilis.")
);
process.exit(gagal.length === 0 ? 0 : 1);
