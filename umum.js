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

// Akhiran domain yang sangat sering dipakai situs penipuan karena murah atau gratis.
// Hanya menjadi tanda kalau dipadukan dengan nama merek (misalnya "google.xyz");
// situs sah juga memakai akhiran ini, jadi akhiran saja tidak cukup.
const AKHIRAN_SERING_DISALAHGUNAKAN = [
  "xyz", "top", "tk", "ml", "ga", "cf", "gq", "click", "work", "loan", "zip", "mov",
  "icu", "buzz", "cyou", "monster", "cfd", "sbs", "rest", "bid", "win", "stream",
  "vip", "club", "site", "online", "shop", "live", "link", "bond", "quest", "autos",
];

// Huruf Kiril/Yunani yang sekilas sama dengan huruf Latin, untuk mengenali serangan
// "homograf" seperti "g[o Kiril][o Kiril]gle.com". Ditulis dengan kode \u supaya
// tidak membingungkan saat dibaca.
const HURUF_MIRIP = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c",
  "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s",
  "ԁ": "d", "һ": "h", "ӏ": "l", "ԛ": "q", "ԝ": "w",
  "к": "k", "ѵ": "v",                                  // Kiril
  "ο": "o", "ν": "v", "α": "a", "ρ": "p",
  "ι": "i", "κ": "k", "ϲ": "c",                   // Yunani
  "ɡ": "g", "ɑ": "a", "ı": "i",                   // Latin khusus
};

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

// ---------- Domain internasional (IDN / punycode) ----------

// Membaca teks punycode (RFC 3492) tanpa awalan "xn--". "mnchen-3ya" -> "munchen" berumlaut.
// Hasilnya null kalau bukan punycode yang sah.
function dekodePunycode(masukan) {
  const basis = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
  const keluaran = [];
  const panjang = masukan.length;
  let i = 0, n = 128, bias = 72;

  let batas = masukan.lastIndexOf("-");
  if (batas < 0) batas = 0;
  for (let j = 0; j < batas; j++) {
    if (masukan.charCodeAt(j) >= 0x80) return null;
    keluaran.push(masukan.charCodeAt(j));
  }

  const sesuaikan = (delta, jumlahTitik, pertama) => {
    let k = 0;
    delta = pertama ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / jumlahTitik);
    for (; delta > (((basis - tMin) * tMax) >> 1); k += basis) {
      delta = Math.floor(delta / (basis - tMin));
    }
    return Math.floor(k + ((basis - tMin + 1) * delta) / (delta + skew));
  };

  for (let indeks = batas > 0 ? batas + 1 : 0; indeks < panjang; ) {
    const iLama = i;
    for (let w = 1, k = basis; ; k += basis) {
      if (indeks >= panjang) return null;
      const c = masukan.charCodeAt(indeks++);
      const digit = c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : basis;
      if (digit >= basis) return null;
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) break;
      w *= basis - t;
    }
    const keluar = keluaran.length + 1;
    bias = sesuaikan(i - iLama, keluar, iLama === 0);
    n += Math.floor(i / keluar);
    i %= keluar;
    keluaran.splice(i++, 0, n);
  }
  return String.fromCodePoint(...keluaran);
}

// "xn--mnchen-3ya" -> teks aslinya. Mengembalikan null kalau bukan label IDN yang sah.
function bacaLabelIdn(label) {
  if (!label.startsWith("xn--")) return null;
  try {
    return dekodePunycode(label.slice(4));
  } catch (e) {
    return null;
  }
}

// Bentuk "kerangka" sebuah teks: aksen dibuang dan huruf Kiril/Yunani yang mirip
// diganti huruf Latin, sehingga hasilnya bisa dibandingkan dengan nama merek.
function kerangkaHuruf(teks) {
  let hasil = "";
  for (const huruf of teks.toLowerCase().normalize("NFKD")) {
    if (/[̀-ͯ]/.test(huruf)) continue; // tanda aksen
    hasil += HURUF_MIRIP[huruf] || huruf;
  }
  return hasil;
}

// Satu nama yang memuat huruf Latin sekaligus huruf Kiril/Yunani hampir selalu penyamaran.
function campuranHuruf(teks) {
  return /[a-z]/.test(teks) && /[Ͱ-ϿЀ-ӿԀ-ԯ]/.test(teks);
}

// Alamat IPv4 yang bukan alamat jaringan lokal (rumah, kantor, komputer sendiri).
function ipPublik(d) {
  const m = d.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some((x) => x > 255)) return false;
  const a = o[0];
  const b = o[1];
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return true;
}

// Tanda yang lebih lemah daripada "domain mirip": alamat IP publik atau domain
// internasional (punycode). Situs sah kadang begini juga, jadi hasilnya hanya
// ditampilkan di pemindaian, tanpa notifikasi. Hasilnya null atau { alasan }.
function periksaDomainPerhatian(domain) {
  const d = bersihkanDomain(domain).toLowerCase();
  const alasan = [];

  if (ipPublik(d)) {
    alasan.push(tr("a.ip"));
  }

  const bagian = d.split(".");
  if (bagian.some((l) => bacaLabelIdn(l))) {
    const terbaca = bagian.map((l) => bacaLabelIdn(l) || l).join(".");
    alasan.push(tr("a.punycode", { t: terbaca }));
  }

  return alasan.length > 0 ? { alasan: alasan.join("; ") } : null;
}

// Memeriksa apakah sebuah domain tampak meniru salah satu situs yang dipantau.
// Hasilnya null (tidak mencurigakan) atau { ditiru, alasan }.
// "ditiru" bisa null kalau domainnya mencurigakan tetapi tidak jelas meniru siapa
// (misalnya huruf Latin dan Kiril dicampur dalam satu nama).
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

  // 0) Domain internasional (IDN) yang memakai huruf non-Latin mirip nama merek,
  //    atau mencampur huruf Latin dengan huruf Kiril/Yunani dalam satu nama.
  //    Domain IDN biasa (misalnya "munchen" berumlaut) tidak ditandai di sini.
  for (const bagianIdn of bagian) {
    const asli = bacaLabelIdn(bagianIdn);
    if (!asli) continue;
    const kerangka = kerangkaHuruf(asli);

    for (const situs of daftarSitus) {
      const merek = merekDari(situs);
      if (merek.length < 5) continue;
      if (kerangka === merek || (kerangka.length >= 5 && jarakEdit(kerangka, merek) === 1)) {
        return {
          ditiru: situs,
          alasan: tr("m.homograf", { m: merek }),
        };
      }
    }

    if (campuranHuruf(asli)) {
      return {
        ditiru: null,
        alasan: tr("m.campuran"),
      };
    }
  }

  for (const situs of daftarSitus) {
    const merek = merekDari(situs);
    if (merek.length < 5) continue; // nama pendek (misal "x") terlalu sering salah cocok

    // 1) Memuat alamat resmi lengkap, tapi bukan milik situs itu.
    //    Contoh: "google.com.evil.net". Versi negara seperti "google.com.sg" wajar.
    const polaNegara = new RegExp("(^|\\.)" + situs.replace(/\./g, "\\.") + "\\.[a-z]{2}$");
    if (d.includes(situs) && !polaNegara.test(d)) {
      return { ditiru: situs, alasan: tr("m.alamat", { s: situs }) };
    }

    for (let i = 0; i < label.length; i++) {
      const l = label[i];

      // 2) Nama merek dipakai sebagai subdomain domain lain. Contoh: "facebook.evil.com"
      if (l === merek) {
        if (i !== idxUtama) {
          return { ditiru: situs, alasan: tr("m.subdomain", { m: merek }) };
        }

        // 2b) Nama persis sama, tetapi di akhiran yang sering disalahgunakan.
        //     Contoh: "google.xyz". Akhiran negara seperti "google.co.id" wajar.
        const akhiran = bagian[bagian.length - 1];
        if (AKHIRAN_SERING_DISALAHGUNAKAN.includes(akhiran)) {
          return {
            ditiru: situs,
            alasan: tr("m.akhiran", { m: merek, a: akhiran }),
          };
        }
        continue; // nama sama dengan akhiran lain (google.co.id) wajar
      }

      // 3) Huruf diganti angka/simbol. Contoh: "faceb00k"
      if (variasiLeet(l).includes(merek)) {
        return { ditiru: situs, alasan: tr("m.leet", { m: merek }) };
      }

      // 4) Salah ketik yang nyaris sama. Contoh: "facebok", "googel"
      if (l.length >= 5 && jarakEdit(l, merek) === 1) {
        return { ditiru: situs, alasan: tr("m.mirip", { m: merek }) };
      }

      // 5) Memuat nama merek dengan kata pancingan. Contoh: "facebook-login"
      if (l.includes(merek) && KATA_PENIPUAN.test(l)) {
        return { ditiru: situs, alasan: tr("m.pancing", { m: merek }) };
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

// ---------- Hapus cookie sesi saat browser dibuka ----------

// Menghapus satu cookie. Chrome butuh alamat (URL) lengkap untuk menghapus.
async function hapusCookie(cookie) {
  const protokol = cookie.secure ? "https://" : "http://";
  const url = protokol + bersihkanDomain(cookie.domain) + cookie.path;
  await chrome.cookies.remove({
    url: url,
    name: cookie.nama || cookie.name,
    storeId: cookie.storeId,
  });
}

// Daftar situs yang dibersihkan saat browser dibuka: [{ situs, mode }].
// mode "sesi"  = hanya cookie sesi login (nama dikenali)
// mode "semua" = semua cookie situs itu
// Data lama berupa teks biasa (sebelum ada mode) dianggap mode "sesi".
async function ambilHapusSaatBuka() {
  const data = await chrome.storage.local.get("hapusSaatBuka");
  return (data.hapusSaatBuka || [])
    .map((x) => (typeof x === "string" ? { situs: x, mode: "sesi" } : x))
    .filter((x) => x && typeof x.situs === "string")
    .map((x) => ({ situs: x.situs, mode: x.mode === "semua" ? "semua" : "sesi" }));
}

async function ambilHasilBersih() {
  const data = await chrome.storage.local.get("hasilBersih");
  return data.hasilBersih || null;
}

// Nama yang terlalu umum (co.id, com, ...) akan mencakup ribuan situs, jadi ditolak.
function terlaluUmum(situs) {
  const bagian = situs.split(".");
  return bagian.length < 2 || (bagian.length === 2 && SLD_UMUM.includes(bagian[0]));
}

// Menghapus cookie dari semua situs di daftar "hapus saat dibuka".
// Mode "sesi" hanya menghapus cookie yang namanya ada di daftar nama sesi;
// mode "semua" menghapus semua cookie situs itu.
// Mengembalikan jumlah cookie yang dihapus.
async function bersihkanCookieTerpilih() {
  const daftar = await ambilHapusSaatBuka();
  if (daftar.length === 0) return 0;

  const pengaturan = await ambilPengaturanNama();
  let jumlah = 0;
  for (const { situs, mode } of daftar) {
    if (terlaluUmum(situs)) continue; // pengaman kalau data tersimpan rusak
    const nama = namaSesiUntuk(situs, pengaturan);
    const semua = await chrome.cookies.getAll({ domain: situs });
    for (const cookie of semua) {
      if (!cocokDomain(cookie.domain, situs)) continue;
      if (mode === "sesi" && !nama.includes(cookie.name.toLowerCase())) continue;
      await hapusCookie(cookie);
      jumlah++;
    }
  }
  await chrome.storage.local.set({ hasilBersih: { waktu: Date.now(), jumlah: jumlah } });
  return jumlah;
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
  if (!waktu) return tr("waktu.belum");
  const hari = Math.floor((sekarang - waktu) / 86400000);
  if (hari <= 0) return tr("waktu.hariIni");
  if (hari === 1) return tr("waktu.kemarin");
  return tr("waktu.hariLalu", { n: hari });
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
