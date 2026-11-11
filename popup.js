// ============================================================
// popup.js
// Mengatur tampilan saat ikon ekstensi diklik:
//   1) Menampilkan daftar peringatan dari background.js
//   2) Memindai cookies dan menandai yang berisiko
//   3) Menghapus cookie lewat tombol
// ============================================================

// Nama cookie yang biasanya berisi sesi login (sama seperti di background.js)
const NAMA_COOKIE_SESI = [
  "sessionid", "session", "sid", "ssid", "c_user", "xs",
  "auth_token", "token", "access_token", "li_at", "user_session",
];

function bersihkanDomain(domain) {
  return domain.replace(/^\./, "");
}

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

// Membuat satu kotak item di layar.
// PENTING: kita pakai textContent (bukan innerHTML) supaya nama cookie
// yang berbahaya tidak bisa menjalankan kode di ekstensi kita.
function buatItem(judul, alasan, labelTombol, aksi, bahaya) {
  const kotak = document.createElement("div");
  kotak.className = "item" + (bahaya ? " bahaya" : "");

  const elJudul = document.createElement("div");
  elJudul.className = "judul";
  elJudul.textContent = judul;

  const elAlasan = document.createElement("div");
  elAlasan.className = "alasan";
  elAlasan.textContent = alasan;

  const tombol = document.createElement("button");
  tombol.className = "hapus";
  tombol.textContent = labelTombol;
  tombol.addEventListener("click", aksi);

  kotak.append(elJudul, elAlasan, tombol);
  return kotak;
}

// ---------- Bagian 1: Peringatan ----------

async function tampilkanPeringatan() {
  const wadah = document.getElementById("peringatan");
  wadah.textContent = "";

  const data = await chrome.storage.local.get("peringatan");
  const daftar = data.peringatan || [];

  if (daftar.length === 0) {
    const p = document.createElement("div");
    p.className = "kosong";
    p.textContent = "Belum ada peringatan. Bagus!";
    wadah.append(p);
    return;
  }

  daftar.forEach((p, indeks) => {
    const waktu = new Date(p.waktu).toLocaleString("id-ID");
    const item = buatItem(
      p.situs + " - " + p.nama,
      p.alasan + " (" + waktu + ")",
      "Hapus cookie ini",
      async () => {
        if (!confirm("Hapus cookie '" + p.nama + "' dari " + p.situs + "? Kamu mungkin logout dari situs itu.")) return;
        await hapusCookie(p);
        await buangPeringatan(indeks);
      },
      true
    );
    wadah.append(item);
  });
}

// Membuang satu peringatan dari daftar
async function buangPeringatan(indeks) {
  const data = await chrome.storage.local.get("peringatan");
  const daftar = data.peringatan || [];
  daftar.splice(indeks, 1);
  await chrome.storage.local.set({ peringatan: daftar });
  await chrome.action.setBadgeText({ text: daftar.length ? String(daftar.length) : "" });
  tampilkanPeringatan();
}

document.getElementById("bersihkanPeringatan").addEventListener("click", async () => {
  await chrome.storage.local.set({ peringatan: [] });
  await chrome.action.setBadgeText({ text: "" });
  tampilkanPeringatan();
});

// ---------- Bagian 2: Pemindaian ----------

// Mengembalikan daftar alasan risiko untuk satu cookie (kosong = aman).
function periksaRisiko(cookie) {
  const alasan = [];
  const cookieSesi = NAMA_COOKIE_SESI.includes(cookie.name.toLowerCase());

  if (!cookieSesi) return alasan; // versi awal: hanya periksa cookie sesi

  if (!cookie.httpOnly) {
    alasan.push("tanpa HttpOnly (bisa dibaca oleh skrip di halaman)");
  }
  if (!cookie.secure) {
    alasan.push("tanpa Secure (bisa terkirim lewat koneksi tidak aman)");
  }
  if (cookie.sameSite === "no_restriction") {
    alasan.push("SameSite longgar (bisa terkirim dari situs lain)");
  }
  return alasan;
}

document.getElementById("tombolPindai").addEventListener("click", async () => {
  const wadah = document.getElementById("hasilPindai");
  wadah.textContent = "Memindai...";

  const semuaCookie = await chrome.cookies.getAll({});
  wadah.textContent = "";

  let jumlah = 0;
  for (const cookie of semuaCookie) {
    const alasan = periksaRisiko(cookie);
    if (alasan.length === 0) continue;

    jumlah++;
    const item = buatItem(
      bersihkanDomain(cookie.domain) + " - " + cookie.name,
      alasan.join("; "),
      "Hapus",
      async () => {
        if (!confirm("Hapus cookie '" + cookie.name + "'? Kamu mungkin logout dari situs itu.")) return;
        await hapusCookie(cookie);
        item.remove();
      },
      false
    );
    wadah.append(item);
  }

  if (jumlah === 0) {
    const p = document.createElement("div");
    p.className = "kosong";
    p.textContent = "Tidak ada cookie sesi berisiko ditemukan.";
    wadah.append(p);
  }
});

// Jalankan saat popup dibuka
tampilkanPeringatan();
