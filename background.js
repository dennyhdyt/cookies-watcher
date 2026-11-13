// ============================================================
// background.js
// Berjalan di latar belakang. Tugasnya: memantau setiap perubahan
// cookies, memantau ekstensi baru, dan mengirim pengingat berkala.
// ============================================================

// Memuat data dan fungsi bersama (lihat umum.js dan ekstensi.js).
importScripts("bahasa.js", "umum.js", "ekstensi.js");
muatBahasa();

// ---------- Fungsi bantu ----------

function kirimNotifikasi(judul, pesan) {
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
    domain: cookie.domain,
    nama: cookie.name,
    path: cookie.path,
    secure: cookie.secure,
    storeId: cookie.storeId,
    alasan: tr("b.sesi.alasan", { s: situs }),
  });

  if (baru) {
    kirimNotifikasi(
      tr("b.sesi.judul", { s: situs }),
      tr("b.sesi.isi", { n: cookie.name })
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
    domain: cookie.domain,
    nama: cookie.name,
    path: cookie.path,
    secure: cookie.secure,
    storeId: cookie.storeId,
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

// ---------- Pengingat berkala: cek aktivitas login ----------
// Ekstensi tidak bisa melihat pemakaian cookie di perangkat lain, jadi kita
// mengingatkan kamu memeriksa halaman aktivitas login di situs penting.
// Pengaturannya (aktif/tidak dan jarak hari) disimpan dengan nama "pengingat".

const NAMA_ALARM = "pengingat-aktivitas-login";

// Menyiapkan alarm sesuai pengaturan.
// buatUlang = false: kalau alarm sudah ada, biarkan (supaya hitungan hari tidak
//   diulang dari nol setiap browser dibuka).
// buatUlang = true: dipakai saat pengaturan diubah.
async function aturAlarm(buatUlang) {
  const p = await ambilPengingat();
  const alarm = await chrome.alarms.get(NAMA_ALARM);

  if (!p.aktif) {
    if (alarm) await chrome.alarms.clear(NAMA_ALARM);
    return;
  }
  if (alarm && !buatUlang) return;

  const menit = p.hari * 24 * 60;
  await chrome.alarms.create(NAMA_ALARM, {
    delayInMinutes: menit,
    periodInMinutes: menit,
  });
}

chrome.runtime.onInstalled.addListener(() => aturAlarm(false));
chrome.runtime.onStartup.addListener(() => aturAlarm(false));

// Saat browser dibuka: hapus cookie sesi login situs yang kamu pilih (kalau ada).
async function saatBrowserDibuka() {
  try {
    await bersihkanCookieSesi();
  } catch (e) {
    // Kalau gagal, biarkan: cookie tetap ada dan bisa dibersihkan manual dari popup.
  }
}
chrome.runtime.onStartup.addListener(saatBrowserDibuka);

// Kalau pengaturan diubah dari popup, alarm langsung disesuaikan.
chrome.storage.onChanged.addListener((perubahan, area) => {
  if (area === "local" && perubahan.pengingat) aturAlarm(true);
});

// Saat alarm berbunyi: sebutkan situs yang belum kamu cek dalam beberapa hari ini.
// Kalau semuanya sudah dicek, tidak ada notifikasi (supaya tidak mengganggu).
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== NAMA_ALARM) return;

  const p = await ambilPengingat();
  const [halaman, dipantau, terakhir] = await Promise.all([
    ambilHalamanSitus(),
    ambilSitusDipantau(),
    ambilTerakhirCek(),
  ]);

  const kelompok = kelompokkanHalaman(halaman, dipantau);
  const terlambat = kelompokTerlambat(kelompok, terakhir, p.hari, Date.now());
  if (terlambat.length === 0) return;

  await muatBahasa();
  const nama = terlambat.map(([url, daftarSitus]) => daftarSitus.join(" / "));
  const tampil =
    nama.slice(0, 3).join(", ") +
    (nama.length > 3 ? tr("b.ingat.lainnya", { n: nama.length - 3 }) : "");

  kirimNotifikasi(
    tr("b.ingat.judul"),
    tr("b.ingat.isi", { h: p.hari, t: tampil })
  );
});
