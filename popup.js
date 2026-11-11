// ============================================================
// popup.js
// Mengatur tampilan saat ikon ekstensi diklik:
//   1) Menampilkan daftar peringatan dari background.js
//   2) Memindai cookies dan menandai yang berisiko
//   3) Mengelola daftar putih (situs yang dipercaya)
//   4) Menghapus cookie lewat tombol
// ============================================================

// Nama cookie yang biasanya berisi sesi login (sama seperti di background.js)
const NAMA_COOKIE_SESI = [
  "sessionid", "session", "sid", "ssid", "c_user", "xs",
  "auth_token", "token", "access_token", "li_at", "user_session",
];

// Situs bawaan yang selalu dipantau (harus sama dengan SITUS_PENTING di background.js)
const SITUS_BAWAAN = [
  "facebook.com", "instagram.com", "google.com", "youtube.com", "tiktok.com",
  "x.com", "twitter.com", "linkedin.com", "github.com",
];

// Halaman untuk melihat dan mengakhiri sesi login di tiap situs.
// Alamat ini bisa berubah sewaktu-waktu kalau situsnya mengubah pengaturan.
// TikTok tidak punya halaman web yang stabil, jadi tidak disertakan.
const HALAMAN_KELUAR = {
  "facebook.com": "https://www.facebook.com/settings?tab=security",
  "instagram.com": "https://accountscenter.instagram.com/password_and_security/",
  "google.com": "https://myaccount.google.com/device-activity",
  "youtube.com": "https://myaccount.google.com/device-activity",
  "x.com": "https://x.com/settings/sessions",
  "twitter.com": "https://x.com/settings/sessions",
  "linkedin.com": "https://www.linkedin.com/psettings/sessions",
  "github.com": "https://github.com/settings/sessions",
};

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

// ---------- Daftar putih: fungsi bantu ----------

// Mengambil daftar putih dari penyimpanan ekstensi.
async function ambilDaftarPutih() {
  const data = await chrome.storage.local.get("daftarPutih");
  return data.daftarPutih || [];
}

// Apakah domain ini cocok dengan salah satu situs di daftar putih?
// Contoh: "accounts.google.com" cocok dengan "google.com".
function cocokDaftarPutih(domain, daftarPutih) {
  const d = bersihkanDomain(domain);
  return daftarPutih.some((situs) => d === situs || d.endsWith("." + situs));
}

// Merapikan teks yang diketik. "https://www.GitHub.com/abc" -> "github.com"
// Mengembalikan null kalau bentuknya bukan domain yang valid.
function rapikanNamaSitus(teks) {
  let t = teks.trim().toLowerCase();
  if (!t) return null;
  t = t.replace(/^https?:\/\//, "");
  t = t.split("/")[0].split("?")[0].split("#")[0];
  t = t.replace(/^www\./, "").replace(/^\./, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(t)) return null;
  return t;
}

// Menambah satu situs ke daftar putih, lalu membuang peringatan lama dari situs itu.
async function tambahKeDaftarPutih(situs) {
  const daftar = await ambilDaftarPutih();
  if (!daftar.includes(situs)) {
    daftar.push(situs);
    await chrome.storage.local.set({ daftarPutih: daftar });
  }

  // Peringatan yang sudah ada dari situs ini ikut dibuang.
  const data = await chrome.storage.local.get("peringatan");
  const sisa = (data.peringatan || []).filter(
    (p) => !cocokDaftarPutih(p.domain, [situs])
  );
  await chrome.storage.local.set({ peringatan: sisa });
  await chrome.action.setBadgeText({ text: sisa.length ? String(sisa.length) : "" });

  tampilkanPeringatan();
  tampilkanDaftarPutih();
}

// Mengeluarkan satu situs dari daftar putih.
async function hapusDariDaftarPutih(situs) {
  const daftar = await ambilDaftarPutih();
  await chrome.storage.local.set({
    daftarPutih: daftar.filter((s) => s !== situs),
  });
  tampilkanDaftarPutih();
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

    // Tombol kedua: masukkan situs ini ke daftar putih.
    const tombolPercaya = document.createElement("button");
    tombolPercaya.className = "percaya";
    tombolPercaya.textContent = "Percayai situs ini";
    tombolPercaya.addEventListener("click", async () => {
      if (!confirm("Percayai " + p.situs + "? Peringatan dari situs ini tidak akan muncul lagi.")) return;
      await tambahKeDaftarPutih(p.situs);
    });
    item.append(tombolPercaya);

    // Tombol ketiga: buka halaman untuk keluar dari semua perangkat (kalau ada).
    const halaman = HALAMAN_KELUAR[p.situs];
    if (halaman) {
      const tombolKeamanan = document.createElement("button");
      tombolKeamanan.className = "keamanan";
      tombolKeamanan.textContent = "Keluar dari semua perangkat";
      tombolKeamanan.addEventListener("click", () => {
        chrome.tabs.create({ url: halaman });
      });
      item.append(tombolKeamanan);
    }

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
function periksaRisiko(cookie, namaSesi) {
  const alasan = [];
  const cookieSesi = namaSesi.includes(cookie.name.toLowerCase());

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

  const daftarPutih = await ambilDaftarPutih();
  const namaSesi = NAMA_COOKIE_SESI.concat(await ambilNamaTambahan());
  const semuaCookie = await chrome.cookies.getAll({});
  wadah.textContent = "";

  let jumlah = 0;
  for (const cookie of semuaCookie) {
    // Lewati situs yang ada di daftar putih.
    if (cocokDaftarPutih(cookie.domain, daftarPutih)) continue;

    const alasan = periksaRisiko(cookie, namaSesi);
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

// ---------- Bagian 3: Daftar putih ----------

async function tampilkanDaftarPutih() {
  const wadah = document.getElementById("daftarPutih");
  wadah.textContent = "";

  const daftar = await ambilDaftarPutih();
  if (daftar.length === 0) {
    const p = document.createElement("div");
    p.className = "kosong";
    p.textContent = "Belum ada situs di daftar putih.";
    wadah.append(p);
    return;
  }

  for (const situs of daftar) {
    const chip = document.createElement("div");
    chip.className = "chip";

    const nama = document.createElement("span");
    nama.textContent = situs;

    const tombol = document.createElement("button");
    tombol.textContent = "Keluarkan";
    tombol.addEventListener("click", () => hapusDariDaftarPutih(situs));

    chip.append(nama, tombol);
    wadah.append(chip);
  }
}

async function tambahDariInput() {
  const input = document.getElementById("inputSitus");
  const pesan = document.getElementById("pesanDaftarPutih");

  const situs = rapikanNamaSitus(input.value);
  if (!situs) {
    pesan.textContent = "Format tidak valid. Contoh yang benar: github.com";
    return;
  }

  await tambahKeDaftarPutih(situs);
  pesan.textContent = situs + " ditambahkan ke daftar putih.";
  input.value = "";
}

document.getElementById("tombolTambah").addEventListener("click", tambahDariInput);
document.getElementById("inputSitus").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tambahDariInput();
});

// ---------- Bagian 4: Situs yang dipantau ----------

async function ambilSitusTambahan() {
  const data = await chrome.storage.local.get("situsTambahan");
  return data.situsTambahan || [];
}

async function tampilkanSitusDipantau() {
  const wadah = document.getElementById("daftarDipantau");
  wadah.textContent = "";

  const tambahan = await ambilSitusTambahan();

  // Situs bawaan: tidak bisa dihapus
  for (const situs of SITUS_BAWAAN) {
    const chip = document.createElement("div");
    chip.className = "chip";

    const nama = document.createElement("span");
    nama.textContent = situs;

    const label = document.createElement("span");
    label.className = "bawaan";
    label.textContent = "bawaan";

    chip.append(nama, label);
    wadah.append(chip);
  }

  // Situs tambahan dari kamu: bisa dihapus
  for (const situs of tambahan) {
    const chip = document.createElement("div");
    chip.className = "chip";

    const nama = document.createElement("span");
    nama.textContent = situs;

    const tombol = document.createElement("button");
    tombol.textContent = "Hapus";
    tombol.addEventListener("click", async () => {
      const sisa = (await ambilSitusTambahan()).filter((s) => s !== situs);
      await chrome.storage.local.set({ situsTambahan: sisa });
      tampilkanSitusDipantau();
    });

    chip.append(nama, tombol);
    wadah.append(chip);
  }
}

async function tambahSitusDipantau() {
  const input = document.getElementById("inputDipantau");
  const pesan = document.getElementById("pesanDipantau");

  const situs = rapikanNamaSitus(input.value);
  if (!situs) {
    pesan.textContent = "Format tidak valid. Contoh yang benar: tokopedia.com";
    return;
  }

  const tambahan = await ambilSitusTambahan();
  if (SITUS_BAWAAN.includes(situs) || tambahan.includes(situs)) {
    pesan.textContent = situs + " sudah ada di daftar.";
    return;
  }

  tambahan.push(situs);
  await chrome.storage.local.set({ situsTambahan: tambahan });
  pesan.textContent = situs + " ditambahkan ke daftar pantauan.";
  input.value = "";
  tampilkanSitusDipantau();
}

document.getElementById("tombolTambahDipantau").addEventListener("click", tambahSitusDipantau);
document.getElementById("inputDipantau").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tambahSitusDipantau();
});

// ---------- Bagian 5: Nama cookie sesi tambahan ----------

async function ambilNamaTambahan() {
  const data = await chrome.storage.local.get("namaCookieTambahan");
  return data.namaCookieTambahan || [];
}

// Nama cookie hanya boleh huruf, angka, garis bawah, titik, dan strip.
// Hasilnya huruf kecil karena pencocokan dilakukan tanpa membedakan besar-kecil.
function rapikanNamaCookie(teks) {
  const t = teks.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{1,60}$/.test(t)) return null;
  return t;
}

async function tampilkanNamaSesi() {
  const wadah = document.getElementById("daftarNamaSesi");
  wadah.textContent = "";

  const daftar = await ambilNamaTambahan();
  if (daftar.length === 0) {
    const p = document.createElement("div");
    p.className = "kosong";
    p.textContent = "Belum ada nama tambahan.";
    wadah.append(p);
    return;
  }

  for (const nama of daftar) {
    const chip = document.createElement("div");
    chip.className = "chip";

    const teks = document.createElement("span");
    teks.textContent = nama;

    const tombol = document.createElement("button");
    tombol.textContent = "Hapus";
    tombol.addEventListener("click", async () => {
      const sisa = (await ambilNamaTambahan()).filter((n) => n !== nama);
      await chrome.storage.local.set({ namaCookieTambahan: sisa });
      tampilkanNamaSesi();
    });

    chip.append(teks, tombol);
    wadah.append(chip);
  }
}

async function tambahNamaSesi() {
  const input = document.getElementById("inputNamaSesi");
  const pesan = document.getElementById("pesanNamaSesi");

  const nama = rapikanNamaCookie(input.value);
  if (!nama) {
    pesan.textContent = "Nama tidak valid. Pakai huruf, angka, _ . atau - (maksimal 60 karakter).";
    return;
  }

  const daftar = await ambilNamaTambahan();
  if (NAMA_COOKIE_SESI.includes(nama) || daftar.includes(nama)) {
    pesan.textContent = nama + " sudah termasuk.";
    return;
  }

  daftar.push(nama);
  await chrome.storage.local.set({ namaCookieTambahan: daftar });
  pesan.textContent = nama + " ditambahkan.";
  input.value = "";
  tampilkanNamaSesi();
}

document.getElementById("tombolTambahNamaSesi").addEventListener("click", tambahNamaSesi);
document.getElementById("inputNamaSesi").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tambahNamaSesi();
});

// ---------- Bagian 6: Ekstensi berizin cookies ----------

async function tambahEkstensiTepercaya(info) {
  const daftar = await ambilEkstensiTepercaya();
  if (!daftar.some((t) => t.id === info.id)) {
    daftar.push({ id: info.id, nama: info.name });
    await chrome.storage.local.set({ ekstensiTepercaya: daftar });
  }
}

async function tampilkanEkstensi() {
  const wadah = document.getElementById("daftarEkstensi");
  wadah.textContent = "Memeriksa...";

  let hasil;
  try {
    hasil = await ambilEkstensiBerisiko();
  } catch (e) {
    wadah.textContent = "Tidak bisa membaca daftar ekstensi.";
    return;
  }
  wadah.textContent = "";

  if (hasil.length === 0) {
    const p = document.createElement("div");
    p.className = "kosong";
    p.textContent = "Tidak ada ekstensi lain yang berizin cookies. Bagus!";
    wadah.append(p);
  }

  for (const h of hasil) {
    const info = h.info;
    const tingkat = h.tinggi ? "risiko tinggi" : "risiko sedang";

    // Tombol utama: nonaktifkan (bisa diaktifkan lagi lewat halaman extensions).
    const item = buatItem(
      info.name + " (" + tingkat + ")",
      h.alasan.join("; "),
      "Nonaktifkan",
      async () => {
        try {
          await chrome.management.setEnabled(info.id, false);
        } catch (e) {
          alert("Tidak bisa menonaktifkan ekstensi ini (mungkin diatur oleh administrator).");
          return;
        }
        tampilkanEkstensi();
      },
      h.tinggi
    );

    const tombolHapus = document.createElement("button");
    tombolHapus.className = "hapus";
    tombolHapus.textContent = "Hapus ekstensi";
    tombolHapus.addEventListener("click", async () => {
      try {
        // Browser menampilkan kotak konfirmasinya sendiri.
        await chrome.management.uninstall(info.id, { showConfirmDialog: true });
      } catch (e) {
        return; // dibatalkan atau tidak bisa dihapus
      }
      tampilkanEkstensi();
    });

    const tombolPercaya = document.createElement("button");
    tombolPercaya.className = "percaya";
    tombolPercaya.textContent = "Percayai";
    tombolPercaya.addEventListener("click", async () => {
      if (!confirm("Percayai '" + info.name + "'? Ekstensi ini tidak akan ditandai lagi.")) return;
      await tambahEkstensiTepercaya(info);
      tampilkanEkstensi();
    });

    item.append(tombolHapus, tombolPercaya);
    wadah.append(item);
  }

  await tampilkanEkstensiTepercaya();
}

async function tampilkanEkstensiTepercaya() {
  const wadah = document.getElementById("daftarEkstensiTepercaya");
  wadah.textContent = "";

  const daftar = await ambilEkstensiTepercaya();
  if (daftar.length === 0) return;

  const judul = document.createElement("div");
  judul.className = "info";
  judul.textContent = "Ekstensi yang kamu percayai:";
  wadah.append(judul);

  for (const t of daftar) {
    const chip = document.createElement("div");
    chip.className = "chip";

    const nama = document.createElement("span");
    nama.textContent = t.nama;

    const tombol = document.createElement("button");
    tombol.textContent = "Keluarkan";
    tombol.addEventListener("click", async () => {
      const sisa = (await ambilEkstensiTepercaya()).filter((x) => x.id !== t.id);
      await chrome.storage.local.set({ ekstensiTepercaya: sisa });
      tampilkanEkstensi();
    });

    chip.append(nama, tombol);
    wadah.append(chip);
  }
}

// Jalankan saat popup dibuka
tampilkanEkstensi();
tampilkanPeringatan();
tampilkanSitusDipantau();
tampilkanNamaSesi();
tampilkanDaftarPutih();
