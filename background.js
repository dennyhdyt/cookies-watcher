// ============================================================
// background.js
// Berjalan di latar belakang. Tugasnya: memantau setiap perubahan
// cookies dan memberi peringatan kalau ada yang mencurigakan.
// ============================================================

// Situs-situs penting yang ingin kita jaga.
const SITUS_PENTING = [
  "facebook.com",
  "instagram.com",
  "google.com",
  "youtube.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "github.com",
];

// Nama cookie yang biasanya menyimpan "sesi login".
// Kalau cookie ini dicuri, orang lain bisa masuk ke akunmu.
const NAMA_COOKIE_SESI = [
  "sessionid",
  "session",
  "sid",
  "ssid",
  "c_user",
  "xs",
  "auth_token",
  "token",
  "access_token",
  "li_at",
  "user_session",
];

// Menghapus titik di depan domain. Contoh: ".facebook.com" -> "facebook.com"
function bersihkanDomain(domain) {
  return domain.replace(/^\./, "");
}

// Cek apakah domain cookie termasuk situs penting. Kalau ya, kembalikan nama situsnya.
function cariSitusPenting(domain) {
  const d = bersihkanDomain(domain);
  return SITUS_PENTING.find((situs) => d === situs || d.endsWith("." + situs));
}

// Cek apakah domain ada di daftar putih (situs yang kamu percaya).
// Daftar putih disimpan di chrome.storage dengan nama "daftarPutih".
async function dalamDaftarPutih(domain) {
  const data = await chrome.storage.local.get("daftarPutih");
  const daftar = data.daftarPutih || [];
  const d = bersihkanDomain(domain);
  return daftar.some((situs) => d === situs || d.endsWith("." + situs));
}

// Cek apakah ada tab yang sedang membuka situs tersebut.
async function adaTabTerbuka(situs) {
  const semuaTab = await chrome.tabs.query({});
  return semuaTab.some((tab) => {
    try {
      const host = new URL(tab.url).hostname;
      return host === situs || host.endsWith("." + situs);
    } catch (e) {
      return false; // tab tanpa alamat biasa (misal halaman kosong)
    }
  });
}

// Simpan peringatan ke penyimpanan ekstensi, lalu tampilkan notifikasi.
async function simpanPeringatan(cookie, situs) {
  const data = await chrome.storage.local.get("peringatan");
  const daftar = data.peringatan || [];

  daftar.unshift({
    waktu: Date.now(),
    situs: situs,
    domain: cookie.domain,
    nama: cookie.name,
    path: cookie.path,
    secure: cookie.secure,
    storeId: cookie.storeId,
    alasan:
      "Cookie sesi berubah padahal kamu tidak sedang membuka " + situs,
  });

  // Simpan maksimal 50 peringatan terakhir supaya tidak menumpuk.
  await chrome.storage.local.set({ peringatan: daftar.slice(0, 50) });

  // Angka merah di ikon ekstensi
  await chrome.action.setBadgeText({ text: String(Math.min(daftar.length, 99)) });
  await chrome.action.setBadgeBackgroundColor({ color: "#d93025" });

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "Cookie mencurigakan: " + situs,
    message:
      "Cookie sesi '" + cookie.name + "' berubah tanpa kamu membuka situs ini. Buka ekstensi untuk memeriksa.",
  });
}

// Ini bagian utama: dipanggil setiap kali ada cookie yang berubah di browser.
chrome.cookies.onChanged.addListener(async (info) => {
  // Kita hanya peduli saat cookie dibuat/diperbarui, bukan dihapus.
  if (info.removed) return;

  const cookie = info.cookie;

  // 1) Apakah ini cookie sesi?
  if (!NAMA_COOKIE_SESI.includes(cookie.name.toLowerCase())) return;

  // 2) Apakah ini milik situs penting?
  const situs = cariSitusPenting(cookie.domain);
  if (!situs) return;

  // 2b) Kalau situs ada di daftar putih, abaikan.
  if (await dalamDaftarPutih(cookie.domain)) return;

  // 3) Kalau kamu sedang membuka situs itu, perubahan cookie wajar (misalnya login).
  if (await adaTabTerbuka(situs)) return;

  // Selain itu: mencurigakan! Catat dan beri peringatan.
  await simpanPeringatan(cookie, situs);
});
