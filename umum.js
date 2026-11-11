// ============================================================
// umum.js
// Data dan fungsi yang dipakai bersama oleh background.js dan popup.js.
// Dimuat lewat importScripts (background) dan tag <script> (popup),
// jadi setiap aturan cukup ditulis satu kali di sini.
// ============================================================

// ---------- Data bawaan ----------

// Situs penting yang selalu dipantau.
const SITUS_BAWAAN = [
  "facebook.com", "instagram.com", "google.com", "youtube.com", "tiktok.com",
  "x.com", "twitter.com", "linkedin.com", "github.com",
];

// Nama cookie yang biasanya menyimpan "sesi login".
// Kalau cookie ini dicuri, orang lain bisa masuk ke akunmu.
const NAMA_COOKIE_SESI = [
  "sessionid", "session", "sid", "ssid", "c_user", "xs",
  "auth_token", "token", "access_token", "li_at", "user_session",
];

// Halaman untuk melihat dan mengakhiri sesi login di tiap situs.
// Alamat ini bisa berubah sewaktu-waktu kalau situsnya mengubah pengaturan.
// TikTok tidak punya halaman web yang stabil, jadi tidak disertakan.
const HALAMAN_BAWAAN = {
  "facebook.com": "https://www.facebook.com/settings?tab=security",
  "instagram.com": "https://accountscenter.instagram.com/password_and_security/",
  "google.com": "https://myaccount.google.com/device-activity",
  "youtube.com": "https://myaccount.google.com/device-activity",
  "x.com": "https://x.com/settings/sessions",
  "twitter.com": "https://x.com/settings/sessions",
  "linkedin.com": "https://www.linkedin.com/psettings/sessions",
  "github.com": "https://github.com/settings/sessions",
};

// Domain resmi milik situs-situs besar yang namanya kebetulan mirip.
// Daftar ini sebagian saja; sisanya bisa kamu masukkan ke daftar putih.
const DOMAIN_RESMI_LAIN = [
  "tiktokv.com", "tiktokcdn.com", "googleapis.com", "gstatic.com",
  "googleusercontent.com", "googlesyndication.com", "googletagmanager.com",
  "google-analytics.com", "googleadservices.com", "googlevideo.com",
  "github.io", "githubusercontent.com", "githubassets.com",
  "facebook.net", "fbcdn.net", "youtube-nocookie.com", "cdninstagram.com",
  "twimg.com", "licdn.com",
];

// Akhiran domain bertingkat seperti "co.id" atau "com.sg".
const SLD_UMUM = ["co", "com", "net", "org", "ac", "go", "or", "gov", "edu", "sch", "web", "mil", "biz"];

// Kata yang sering dipakai situs tiruan: "facebook-login.com", "google-verify.net", dst.
const KATA_PENIPUAN = /(login|signin|sign-in|secure|verify|verification|account|support|auth|password|recover|update|helpdesk|security)/;

// ---------- Domain ----------

// Menghapus titik di depan domain. Contoh: ".facebook.com" -> "facebook.com"
function bersihkanDomain(domain) {
  return domain.replace(/^\./, "");
}

// Apakah domain ini adalah situs tersebut atau subdomainnya?
// Contoh: "accounts.google.com" cocok dengan "google.com".
function cocokDomain(domain, situs) {
  const d = bersihkanDomain(domain).toLowerCase();
  return d === situs || d.endsWith("." + situs);
}

function cocokSalahSatu(domain, daftarSitus) {
  return daftarSitus.some((situs) => cocokDomain(domain, situs));
}

// Posisi "nama utama" dalam daftar bagian domain.
// "google.com" -> 0, "a.evil.com" -> 1, "bca.co.id" -> 0
function indeksNamaUtama(bagian) {
  const n = bagian.length;
  if (n >= 3 && bagian[n - 1].length === 2 && SLD_UMUM.includes(bagian[n - 2])) {
    return n - 3;
  }
  return Math.max(0, n - 2);
}

// Nama merek dari sebuah situs. "facebook.com" -> "facebook"
function merekDari(situs) {
  const bagian = situs.split(".");
  return bagian[indeksNamaUtama(bagian)];
}

// Jarak edit antar dua teks: berapa banyak huruf yang harus ditambah,
// dihapus, diganti, atau ditukar posisinya supaya keduanya sama.
function jarakEdit(a, b) {
  const m = a.length;
  const n = b.length;
  const d = [];
  for (let i = 0; i <= m; i++) d.push([i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const biaya = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + biaya);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

// Mengganti angka/simbol yang biasa dipakai meniru huruf. "g00gle" -> "google"
// Angka 1 bisa berarti "l" atau "i", jadi hasilnya dua kemungkinan.
function variasiLeet(teks) {
  const peta = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t", "$": "s", "@": "a" };
  let dasar = "";
  for (const huruf of teks) dasar += peta[huruf] || huruf;
  return [dasar.replace(/1/g, "l"), dasar.replace(/1/g, "i")];
}

// Memeriksa apakah sebuah domain tampak meniru salah satu situs yang dipantau.
// Hasilnya null (tidak mencurigakan) atau { ditiru, alasan }.
//
// Cookie pelacak pihak ketiga yang biasa (misalnya dari jaringan iklan) TIDAK
// ditandai di sini, karena jumlahnya sangat banyak dan umumnya bukan pencurian.
function periksaDomainMirip(domain, daftarSitus) {
  const d = bersihkanDomain(domain).toLowerCase();
  if (!d || !d.includes(".") || /^[0-9.]+$/.test(d)) return null;

  // Domain asli situs yang dipantau, atau domain resmi lain: aman.
  if (cocokSalahSatu(d, daftarSitus)) return null;
  if (cocokSalahSatu(d, DOMAIN_RESMI_LAIN)) return null;

  const bagian = d.split(".");
  const label = bagian.slice(0, -1); // buang akhiran seperti ".com"
  const idxUtama = indeksNamaUtama(bagian);

  for (const situs of daftarSitus) {
    const merek = merekDari(situs);
    if (merek.length < 5) continue; // nama pendek (misal "x") terlalu sering salah cocok

    // 1) Memuat alamat resmi lengkap, tapi bukan milik situs itu.
    //    Contoh: "google.com.evil.net". Versi negara seperti "google.com.sg" wajar.
    const polaNegara = new RegExp("(^|\\.)" + situs.replace(/\./g, "\\.") + "\\.[a-z]{2}$");
    if (d.includes(situs) && !polaNegara.test(d)) {
      return { ditiru: situs, alasan: "memuat alamat '" + situs + "' tetapi bukan milik situs itu" };
    }

    for (let i = 0; i < label.length; i++) {
      const l = label[i];

      // 2) Nama merek dipakai sebagai subdomain domain lain. Contoh: "facebook.evil.com"
      if (l === merek) {
        if (i !== idxUtama) {
          return { ditiru: situs, alasan: "memakai nama '" + merek + "' sebagai subdomain dari domain lain" };
        }
        continue; // nama sama dengan akhiran lain (google.co.id) wajar
      }

      // 3) Huruf diganti angka/simbol. Contoh: "faceb00k"
      if (variasiLeet(l).includes(merek)) {
        return { ditiru: situs, alasan: "memakai angka/simbol untuk meniru nama '" + merek + "'" };
      }

      // 4) Salah ketik yang nyaris sama. Contoh: "facebok", "googel"
      if (l.length >= 5 && jarakEdit(l, merek) === 1) {
        return { ditiru: situs, alasan: "namanya nyaris sama dengan '" + merek + "'" };
      }

      // 5) Memuat nama merek dengan kata pancingan. Contoh: "facebook-login"
      if (l.includes(merek) && KATA_PENIPUAN.test(l)) {
        return { ditiru: situs, alasan: "memuat nama '" + merek + "' dengan kata seperti login/verify" };
      }
    }
  }
  return null;
}

// ---------- Penyimpanan (chrome.storage) ----------

async function ambilDaftarPutih() {
  const data = await chrome.storage.local.get("daftarPutih");
  return data.daftarPutih || [];
}

async function ambilSitusTambahan() {
  const data = await chrome.storage.local.get("situsTambahan");
  return data.situsTambahan || [];
}

// Situs bawaan + situs tambahan dari kamu.
async function ambilSitusDipantau() {
  return SITUS_BAWAAN.concat(await ambilSitusTambahan());
}

// Nama cookie sesi tambahan: untuk semua situs (global) dan per situs.
async function ambilPengaturanNama() {
  const data = await chrome.storage.local.get(["namaCookieTambahan", "namaCookiePerSitus"]);
  return {
    global: data.namaCookieTambahan || [],
    perSitus: data.namaCookiePerSitus || {},
  };
}

// Daftar nama cookie sesi yang berlaku untuk satu situs.
function namaSesiUntuk(situs, pengaturan) {
  let nama = NAMA_COOKIE_SESI.concat(pengaturan.global);
  if (situs && pengaturan.perSitus[situs]) {
    nama = nama.concat(pengaturan.perSitus[situs]);
  }
  return nama;
}

// Tautan halaman aktivitas login: bawaan + yang kamu atur sendiri.
async function ambilHalamanSitus() {
  const data = await chrome.storage.local.get("halamanSitus");
  return Object.assign({}, HALAMAN_BAWAAN, data.halamanSitus || {});
}

// ---------- Pencatatan terakhir cek ----------

async function ambilTerakhirCek() {
  const data = await chrome.storage.local.get("terakhirCek");
  return data.terakhirCek || {};
}

// Mencatat waktu sekarang sebagai waktu terakhir dibuka untuk beberapa situs.
async function catatTerakhirCek(daftarSitus) {
  const catatan = await ambilTerakhirCek();
  const sekarang = Date.now();
  for (const situs of daftarSitus) catatan[situs] = sekarang;
  await chrome.storage.local.set({ terakhirCek: catatan });
}

// "belum pernah", "hari ini", "kemarin", "3 hari lalu"
function waktuRelatif(waktu, sekarang) {
  if (!waktu) return "belum pernah";
  const hari = Math.floor((sekarang - waktu) / 86400000);
  if (hari <= 0) return "hari ini";
  if (hari === 1) return "kemarin";
  return hari + " hari lalu";
}

// Mengelompokkan situs yang dipantau berdasarkan alamat halamannya,
// supaya situs yang berbagi halaman (Google dan YouTube) jadi satu baris.
// Hasilnya Map: alamat -> [situs, situs, ...]
function kelompokkanHalaman(halaman, dipantau) {
  const kelompok = new Map();
  for (const situs of dipantau) {
    const url = halaman[situs];
    if (!url) continue;
    if (!kelompok.has(url)) kelompok.set(url, []);
    kelompok.get(url).push(situs);
  }
  return kelompok;
}

// Kelompok yang belum dibuka dalam "hari" hari terakhir (atau belum pernah).
function kelompokTerlambat(kelompok, terakhir, hari, sekarang) {
  const batas = hari * 86400000;
  const hasil = [];
  for (const [url, daftarSitus] of kelompok) {
    const terbaru = Math.max(0, ...daftarSitus.map((s) => terakhir[s] || 0));
    if (!terbaru || sekarang - terbaru >= batas) hasil.push([url, daftarSitus]);
  }
  return hasil;
}

// ---------- Pengingat ----------

// Pengaturan pengingat: { aktif, hari }. Mati secara bawaan.
async function ambilPengingat() {
  const data = await chrome.storage.local.get("pengingat");
  const p = Object.assign({ aktif: false, hari: 7 }, data.pengingat || {});
  // Jaga supaya jarak hari wajar (1 sampai 90).
  p.hari = Math.max(1, Math.min(90, Number(p.hari) || 7));
  return p;
}
