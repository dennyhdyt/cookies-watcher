// ============================================================
// background.js
// Berjalan di latar belakang. Tugasnya: memantau setiap perubahan
// cookies, memantau ekstensi baru, dan membersihkan cookie login.
// ============================================================

// Memuat data dan fungsi bersama (lihat umum.js dan ekstensi.js).
importScripts("bahasa.js", "umum.js", "ekstensi.js");
muatBahasa();

// ---------- Fungsi bantu ----------

// Lencana angka merah di ikon toolbar = jumlah peringatan yang belum dibersihkan.
async function perbaruiLencana() {
  try {
    const data = await chrome.storage.local.get("peringatan");
    const jumlah = (data.peringatan || []).length;
    await chrome.action.setBadgeText({ text: jumlah === 0 ? "" : jumlah > 99 ? "99+" : String(jumlah) });
    await chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
  } catch (e) {
    // Lencana hanya tampilan; kalau gagal, peringatan tetap tersimpan.
  }
}
// Lencana tidak bertahan setelah browser ditutup, jadi dipasang lagi tiap ekstensi mulai.
perbaruiLencana();

// Mencatat waktu terakhir ada perubahan cookie, sebagai bukti bahwa pemantauan hidup.
// Ditulis paling sering sekali per menit supaya tidak membebani penyimpanan.
let terakhirCatatDilihat = 0;
async function catatCookieDilihat() {
  const sekarang = Date.now();
  if (sekarang - terakhirCatatDilihat < 60000) return;
  terakhirCatatDilihat = sekarang;
  try {
    await chrome.storage.local.set({ cookieTerakhirDilihat: sekarang });
  } catch (e) {
    // Abaikan.
  }
}

// Batas laju: paling banyak 5 notifikasi per jam. Peringatan tetap tercatat di popup; ini hanya
// mencegah situs yang membanjiri cookie membuat notifikasi tanpa henti.
const BATAS_NOTIFIKASI_PER_JAM = 5;
async function bolehNotifikasi() {
  try {
    const sekarang = Date.now();
    const data = await chrome.storage.session.get("notifJam");
    let catatan = data.notifJam;
    if (!catatan || typeof catatan.mulai !== "number" || sekarang - catatan.mulai > 3600000) {
      catatan = { mulai: sekarang, jumlah: 0 };
    }
    if (catatan.jumlah >= BATAS_NOTIFIKASI_PER_JAM) return false;
    catatan.jumlah += 1;
    await chrome.storage.session.set({ notifJam: catatan });
    return true;
  } catch (e) {
    return true; // kalau penyimpanan sesi gagal, jangan sampai peringatan penting hilang
  }
}

async function kirimNotifikasi(judul, pesan) {
  if (!(await bolehNotifikasi())) return;
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: judul,
    message: pesan,
  });
}

// Cek apakah domain ada di daftar putih (situs yang kamu percaya).
async function dalamDaftarPutih(domain) {
  return cocokSalahSatu(domain, await ambilDaftarPutih());
}

// Cek apakah domain cookie termasuk situs yang dipantau.
// Kalau ya, kembalikan nama situsnya.
async function cariSitusPenting(domain) {
  const daftar = await ambilSitusDipantau();
  return daftar.find((situs) => cocokDomain(domain, situs));
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

// ---------- Menyimpan peringatan ----------

// Beberapa cookie bisa berubah hampir bersamaan. Supaya penyimpanan tidak
// saling menimpa, semua penulisan peringatan dibuat antre satu per satu.
let antrianTulis = Promise.resolve();

function tambahPeringatan(peringatan) {
  const kerja = antrianTulis.then(() => catatPeringatan(peringatan));
  antrianTulis = kerja.catch(() => {});
  return kerja;
}

// Mengembalikan true kalau peringatan baru dicatat, false kalau sudah ada.
async function catatPeringatan(peringatan) {
  const data = await chrome.storage.local.get("peringatan");
  const daftar = data.peringatan || [];

  // Cookie sesi yang sama dari situs yang sama tidak dicatat ulang dalam 10 menit.
  if (peringatan.jenis === "sesi") {
    const baruSaja = daftar.some(
      (p) =>
        p.jenis === "sesi" &&
        p.situs === peringatan.situs &&
        p.nama === peringatan.nama &&
        peringatan.waktu - (p.waktu || 0) < 10 * 60 * 1000
    );
    if (baruSaja) return false;
  }

  // Satu domain tiruan cukup satu peringatan, walau cookie-nya banyak.
  if (peringatan.jenis === "domain-mirip") {
    const sudahAda = daftar.some(
      (p) =>
        p.jenis === "domain-mirip" &&
        bersihkanDomain(p.domain) === bersihkanDomain(peringatan.domain)
    );
    if (sudahAda) return false;
  }

  daftar.unshift(peringatan);

  // Simpan maksimal 50 peringatan terakhir supaya tidak menumpuk.
  const dipangkas = daftar.slice(0, 50);
  await chrome.storage.local.set({ peringatan: dipangkas });

  // Angka merah di ikon ekstensi
  await chrome.action.setBadgeText({ text: String(Math.min(dipangkas.length, 99)) });
  await chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
  return true;
}

// Peringatan jenis "sesi": cookie sesi berubah padahal situsnya tidak dibuka.
async function simpanPeringatan(cookie, situs) {
  await muatBahasa();
  const baru = await tambahPeringatan({
    jenis: "sesi",
    waktu: Date.now(),
    situs: situs,
    domain: pangkasTeks(cookie.domain, 253),
    nama: pangkasTeks(cookie.name, 200),
    path: pangkasTeks(cookie.path, 200),
    secure: cookie.secure,
    storeId: pangkasTeks(cookie.storeId, 50),
    alasan: tr("b.sesi.alasan", { s: situs }),
  });

  if (baru) {
    kirimNotifikasi(
      tr("b.sesi.judul", { s: situs }),
      tr("b.sesi.isi", { n: pangkasTeks(cookie.name, 200) })
    );
  }
}

// Peringatan jenis "domain-mirip": domain yang meniru situs yang dipantau.
async function simpanPeringatanDomain(cookie, mirip) {
  await muatBahasa();
  const domain = bersihkanDomain(cookie.domain);
  const baru = await tambahPeringatan({
    jenis: "domain-mirip",
    waktu: Date.now(),
    situs: domain,
    ditiru: mirip.ditiru,
    domain: pangkasTeks(cookie.domain, 253),
    nama: pangkasTeks(cookie.name, 200),
    path: pangkasTeks(cookie.path, 200),
    secure: cookie.secure,
    storeId: pangkasTeks(cookie.storeId, 50),
    alasan: tr("b.dom.alasan", { a: mirip.alasan }),
  });

  if (baru) {
    kirimNotifikasi(
      tr("p.domCuriga", { d: domain }),
      tr("b.dom.isi", { a: mirip.alasan })
    );
  }
}

// ---------- Pemantauan cookies ----------

// Ini bagian utama: dipanggil setiap kali ada cookie yang berubah di browser.
chrome.cookies.onChanged.addListener(async (info) => {
  catatCookieDilihat();

  // Kita hanya peduli saat cookie dibuat/diperbarui, bukan dihapus.
  if (info.removed) return;

  const cookie = info.cookie;

  // Situs yang sudah kamu percaya (daftar putih) selalu dilewati.
  if (await dalamDaftarPutih(cookie.domain)) return;

  // Pemeriksaan A: apakah domain ini meniru situs yang dipantau?
  const dipantau = await ambilSitusDipantau();
  await muatBahasa(); // alasan domain mirip ditulis dalam bahasa pilihan
  const mirip = periksaDomainMirip(cookie.domain, dipantau);
  if (mirip) {
    await simpanPeringatanDomain(cookie, mirip);
    return;
  }

  // Pemeriksaan B: apakah ini cookie sesi dari situs yang dipantau?
  const situs = dipantau.find((s) => cocokDomain(cookie.domain, s));
  if (!situs) return;

  const namaSesi = namaSesiUntuk(situs, await ambilPengaturanNama());
  if (!namaSesi.includes(cookie.name.toLowerCase())) return;

  // Kalau kamu sedang membuka situs itu, perubahan cookie wajar (misalnya login).
  if (await adaTabTerbuka(situs)) return;

  // Selain itu: mencurigakan! Catat dan beri peringatan.
  await simpanPeringatan(cookie, situs);
});

// ---------- Pemantauan ekstensi lain ----------

// Dipanggil saat ada ekstensi baru dipasang atau diaktifkan.
// Kalau ekstensi itu berizin cookies (atau bisa melihat lalu lintas web),
// kita beri notifikasi supaya kamu bisa memeriksanya.
async function periksaEkstensiBaru(info) {
  if (!bisaDiperiksa(info)) return;

  const tepercaya = await ambilEkstensiTepercaya();
  if (tepercaya.some((t) => t.id === info.id)) return;

  await muatBahasa();
  const hasil = periksaEkstensi(info);
  if (hasil.alasan.length === 0) return;

  kirimNotifikasi(
    hasil.tinggi ? tr("b.ext.tinggi") : tr("b.ext.sedang"),
    tr("b.ext.isi", { n: info.name, a: hasil.alasan.join("; ") })
  );
}

// Izin "management" bersifat opsional. Kalau belum diberikan, chrome.management
// tidak ada, jadi pendengarnya hanya dipasang kalau tersedia. Fungsi ini aman
// dipanggil berulang kali (pendengar yang sama tidak terpasang dua kali).
function pasangPendengarEkstensi() {
  if (!chrome.management || !chrome.management.onInstalled) return;
  chrome.management.onInstalled.addListener(periksaEkstensiBaru);
  chrome.management.onEnabled.addListener(periksaEkstensiBaru);
}

pasangPendengarEkstensi();

// Saat izinnya baru saja diberikan lewat popup, langsung pasang pendengarnya.
chrome.permissions.onAdded.addListener((izin) => {
  if ((izin.permissions || []).includes("management")) pasangPendengarEkstensi();
});

// ---------- Bersihkan cookie login saat browser dibuka ----------
//
// Ada dua pemicu, karena browser sering tetap berjalan di latar belakang setelah jendela
// terakhir ditutup (Chrome/Edge "lanjutkan menjalankan aplikasi latar belakang", Startup boost).
// Dalam kasus itu "browser mulai" tidak pernah terjadi, tetapi jendela baru tetap dibuat.
//   1. onStartup: prosesnya benar-benar mulai dari awal.
//   2. Semua jendela ditutup (onRemoved) lalu ada jendela baru (onCreated).
// Keduanya bisa terjadi berurutan, jadi pembersihan otomatis dibatasi satu kali per 20 detik.

async function jalankanBersihOtomatis(sumber) {
  try {
    await chrome.storage.local.remove("jendelaTertutup");
    if (chrome.storage.session) {
      const sesi = await chrome.storage.session.get("bersihOtomatisTerakhir");
      if (sesi.bersihOtomatisTerakhir && Date.now() - sesi.bersihOtomatisTerakhir < 20000) return;
      await chrome.storage.session.set({ bersihOtomatisTerakhir: Date.now() });
    }
    await bersihkanCookieTerpilih(sumber);
  } catch (e) {
    // Kalau gagal, biarkan: cookie tetap ada dan bisa dibersihkan manual dari popup.
  }
}

async function saatBrowserDibuka() {
  await jalankanBersihOtomatis("startup");
}
chrome.runtime.onStartup.addListener(saatBrowserDibuka);

// Menandai bahwa jendela biasa terakhir sudah ditutup.
async function tandaiJendelaTertutup() {
  try {
    const jendela = await chrome.windows.getAll({ windowTypes: ["normal"] });
    if (jendela.length === 0) await chrome.storage.local.set({ jendelaTertutup: Date.now() });
  } catch (e) {
    // Abaikan: pemicu onStartup tetap berjalan.
  }
}

// Jendela baru dibuat setelah semua jendela ditutup = browser "dibuka" lagi.
async function saatJendelaDibuat() {
  const data = await chrome.storage.local.get("jendelaTertutup");
  if (!data.jendelaTertutup) return;
  await jalankanBersihOtomatis("jendela");
}
chrome.windows.onRemoved.addListener(tandaiJendelaTertutup);
chrome.windows.onCreated.addListener(saatJendelaDibuat);

// ---------- Hapus cookie login saat tab situs ditutup ----------
//
// Setelah tab ditutup, alamatnya tidak bisa dibaca lagi. Jadi kita mencatat tabId -> situs
// selagi tab masih ada, HANYA untuk situs yang ada di daftar kamu (di memori sesi, hilang
// saat browser ditutup). Alamat lengkap tidak pernah disimpan atau dikirim ke mana pun.
// Membaca alamat tab memakai izin situs (host) yang sudah ada, bukan izin "tabs".

let antrianTab = Promise.resolve();
function urutkanTab(kerja) {
  antrianTab = antrianTab.then(kerja, kerja).catch(() => {});
  return antrianTab;
}

async function ambilPetaTab() {
  if (!chrome.storage.session) return {};
  const d = await chrome.storage.session.get("petaTab");
  return d.petaTab || {};
}

async function catatTab(idTab, alamat) {
  if (!chrome.storage.session || typeof alamat !== "string") return;
  const [peta, daftar] = await Promise.all([ambilPetaTab(), ambilHapusSaatTabTutup()]);
  const situs = situsDariAlamat(alamat);
  if (situs && daftar.includes(situs)) peta[idTab] = situs;
  else delete peta[idTab];
  await chrome.storage.session.set({ petaTab: peta });
}

// Mencatat semua tab yang sudah terbuka (dipanggil saat service worker menyala dan saat daftar berubah).
async function sinkronTab() {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) await catatTab(t.id, t.url);
}

async function saatTabDitutup(idTab) {
  const peta = await ambilPetaTab();
  const situs = peta[idTab];
  if (!situs) return;
  delete peta[idTab];
  await chrome.storage.session.set({ petaTab: peta });
  const tersisa = (await chrome.tabs.query({})).map((t) => t.url).filter(Boolean);
  await hapusSetelahTabTutup(situs, tersisa);
}

chrome.tabs.onUpdated.addListener((idTab, perubahan, tab) => {
  if (perubahan.url !== undefined) urutkanTab(() => catatTab(idTab, perubahan.url));
});
chrome.tabs.onReplaced.addListener((idBaru, idLama) =>
  urutkanTab(async () => {
    const peta = await ambilPetaTab();
    if (peta[idLama]) {
      peta[idBaru] = peta[idLama];
      delete peta[idLama];
      await chrome.storage.session.set({ petaTab: peta });
    }
  })
);
chrome.tabs.onRemoved.addListener((idTab) => urutkanTab(() => saatTabDitutup(idTab)));
urutkanTab(sinkronTab);

// Kalau pengaturan diubah dari popup, tampilan dan pemantauan langsung disesuaikan.
chrome.storage.onChanged.addListener((perubahan, area) => {
  if (area === "local" && perubahan.peringatan) perbaruiLencana();
  if (area === "local" && perubahan.hapusSaatTabTutup) urutkanTab(sinkronTab);
});
