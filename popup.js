// ============================================================
// popup.js
// Mengatur tampilan saat ikon ekstensi diklik. Data dan aturan
// bersama ada di umum.js dan ekstensi.js (dimuat lebih dulu).
// ============================================================

// ---------- Fungsi bantu tampilan ----------

// Membuat satu tombol.
function buatTombol(label, kelas, aksi) {
  const tombol = document.createElement("button");
  if (kelas) tombol.className = kelas;
  tombol.textContent = label;
  tombol.addEventListener("click", aksi);
  return tombol;
}

// Membuat tulisan "kosong" berwarna abu-abu.
function buatKosong(teks) {
  const p = document.createElement("div");
  p.className = "kosong";
  p.textContent = teks;
  return p;
}

// Judul untuk domain yang mencurigakan. "ditiru" kosong kalau tidak jelas meniru siapa.
function judulDomain(ditiru, domain) {
  return ditiru
    ? "Domain mirip " + ditiru + ": " + domain
    : "Domain mencurigakan: " + domain;
}

// Membuat satu kotak item di layar.
// PENTING: kita pakai textContent (bukan innerHTML) supaya nama cookie
// atau domain yang berbahaya tidak bisa menjalankan kode di ekstensi kita.
function buatItem(judul, alasan, labelTombol, aksi, bahaya) {
  const kotak = document.createElement("div");
  kotak.className = "item" + (bahaya ? " bahaya" : "");

  const elJudul = document.createElement("div");
  elJudul.className = "judul";
  elJudul.textContent = judul;

  const elAlasan = document.createElement("div");
  elAlasan.className = "alasan";
  elAlasan.textContent = alasan;

  kotak.append(elJudul, elAlasan, buatTombol(labelTombol, "hapus", aksi));
  return kotak;
}

// Membuat satu baris daftar: teks utama, teks kecil (opsional), dan tombol di kanan.
function buatChip(teksUtama, teksKecil, daftarTombol, kelasKecil) {
  const chip = document.createElement("div");
  chip.className = "chip";

  const kiri = document.createElement("div");
  kiri.className = "kiri";
  const utama = document.createElement("span");
  utama.textContent = teksUtama;
  kiri.append(utama);
  if (teksKecil) {
    const kecil = document.createElement("span");
    kecil.className = "bawaan" + (kelasKecil ? " " + kelasKecil : "");
    kecil.textContent = teksKecil;
    kiri.append(kecil);
  }

  const aksi = document.createElement("div");
  aksi.className = "aksi";
  aksi.append(...daftarTombol);

  chip.append(kiri, aksi);
  return chip;
}

// ---------- Fungsi bantu data ----------

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

// Menghapus SEMUA cookie milik satu domain (dipakai untuk domain tiruan).
async function hapusSemuaCookieDomain(domain) {
  const bersih = bersihkanDomain(domain);
  const semua = await chrome.cookies.getAll({ domain: bersih });
  for (const cookie of semua) await hapusCookie(cookie);
  return semua.length;
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

// Merapikan tautan. Hasilnya "" (dikosongkan), null (tidak valid), atau alamat lengkap.
// Hanya https yang diterima supaya tidak membuka alamat berbahaya.
function rapikanTautan(teks) {
  const t = teks.trim();
  if (!t) return "";
  try {
    const url = new URL(t);
    if (url.protocol !== "https:") return null;
    return url.href;
  } catch (e) {
    return null;
  }
}

// Nama cookie hanya boleh huruf, angka, garis bawah, titik, dan strip.
// Hasilnya huruf kecil karena pencocokan dilakukan tanpa membedakan besar-kecil.
function rapikanNamaCookie(teks) {
  const t = teks.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{1,60}$/.test(t)) return null;
  return t;
}

async function setBadge(jumlah) {
  await chrome.action.setBadgeText({ text: jumlah ? String(jumlah) : "" });
}

// ---------- Bagian 1: Peringatan ----------

async function tampilkanPeringatan() {
  const wadah = document.getElementById("peringatan");
  wadah.textContent = "";

  const [data, halaman] = await Promise.all([
    chrome.storage.local.get("peringatan"),
    ambilHalamanSitus(),
  ]);
  const daftar = data.peringatan || [];

  if (daftar.length === 0) {
    wadah.append(buatKosong("Belum ada peringatan. Bagus!"));
    return;
  }

  for (const p of daftar) {
    const waktu = new Date(p.waktu).toLocaleString("id-ID");
    const mirip = p.jenis === "domain-mirip";

    const item = mirip
      ? buatItem(
          judulDomain(p.ditiru, p.situs),
          p.alasan + " (" + waktu + ")",
          "Hapus semua cookie domain ini",
          async () => {
            if (!confirm("Hapus semua cookie dari " + p.situs + "?")) return;
            await hapusSemuaCookieDomain(p.domain);
            await buangPeringatan(p);
          },
          true
        )
      : buatItem(
          p.situs + " - " + p.nama,
          p.alasan + " (" + waktu + ")",
          "Hapus cookie ini",
          async () => {
            if (!confirm("Hapus cookie '" + p.nama + "' dari " + p.situs + "? Kamu mungkin logout dari situs itu.")) return;
            await hapusCookie(p);
            await buangPeringatan(p);
          },
          true
        );

    // Tombol kedua: masukkan situs ini ke daftar putih.
    item.append(
      buatTombol("Percayai situs ini", "percaya", async () => {
        const peringatanTambahan = mirip
          ? "PERHATIAN: domain ini terlihat mencurigakan" + (p.ditiru ? " (meniru " + p.ditiru + ")" : "") + ". "
          : "";
        if (!confirm(peringatanTambahan + "Percayai " + p.situs + "? Peringatan dari situs ini tidak akan muncul lagi.")) return;
        await tambahKeDaftarPutih(p.situs);
      })
    );

    // Tombol ketiga: buka halaman untuk keluar dari semua perangkat (kalau ada).
    // Hanya untuk cookie sesi; domain tiruan bukan situs milikmu.
    const tautan = mirip ? null : halaman[p.situs];
    if (tautan) {
      item.append(
        buatTombol("Keluar dari semua perangkat", "keamanan", async () => {
          await catatTerakhirCek([p.situs]);
          chrome.tabs.create({ url: tautan });
          tampilkanAktivitas();
        })
      );
    }

    wadah.append(item);
  }
}

// Membuang satu peringatan. Dikenali lewat isinya (bukan nomor urut),
// karena daftar bisa bertambah saat popup masih terbuka.
async function buangPeringatan(p) {
  const data = await chrome.storage.local.get("peringatan");
  const sisa = (data.peringatan || []).filter(
    (x) => !(x.waktu === p.waktu && x.domain === p.domain && x.nama === p.nama)
  );
  await chrome.storage.local.set({ peringatan: sisa });
  await setBadge(sisa.length);
  tampilkanPeringatan();
}

document.getElementById("bersihkanPeringatan").addEventListener("click", async () => {
  await chrome.storage.local.set({ peringatan: [] });
  await setBadge(0);
  tampilkanPeringatan();
});

// ---------- Bagian 2: Pemindaian ----------

// Mengembalikan daftar alasan risiko untuk satu cookie (kosong = aman).
function periksaRisiko(cookie, namaSesi) {
  const alasan = [];
  if (!namaSesi.includes(cookie.name.toLowerCase())) return alasan;

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

  const [daftarPutih, dipantau, pengaturan, semuaCookie] = await Promise.all([
    ambilDaftarPutih(),
    ambilSitusDipantau(),
    ambilPengaturanNama(),
    chrome.cookies.getAll({}),
  ]);
  wadah.textContent = "";

  const cacheMirip = new Map(); // domain -> hasil periksaDomainMirip
  const domainMirip = new Map(); // domain -> { info, jumlah, contoh }
  const domainPerhatian = new Map(); // domain -> { alasan, jumlah }
  const berisiko = []; // { cookie, alasan }

  for (const cookie of semuaCookie) {
    // Lewati situs yang ada di daftar putih.
    if (cocokSalahSatu(cookie.domain, daftarPutih)) continue;

    // Domain yang meniru situs yang dipantau.
    const dom = bersihkanDomain(cookie.domain).toLowerCase();
    if (!cacheMirip.has(dom)) cacheMirip.set(dom, periksaDomainMirip(dom, dipantau));
    const mirip = cacheMirip.get(dom);
    if (mirip) {
      const catatan = domainMirip.get(dom) || { info: mirip, jumlah: 0, contoh: cookie };
      catatan.jumlah++;
      domainMirip.set(dom, catatan);
      continue;
    }

    // Tanda yang lebih lemah: alamat IP publik atau domain internasional (punycode).
    // Hanya dicatat; pemeriksaan cookie sesi di bawah tetap berjalan.
    const perhatian = periksaDomainPerhatian(dom);
    if (perhatian) {
      const catatan = domainPerhatian.get(dom) || { alasan: perhatian.alasan, jumlah: 0 };
      catatan.jumlah++;
      domainPerhatian.set(dom, catatan);
    }

    // Cookie sesi dengan pengaturan lemah (nama sesi bisa berbeda per situs).
    const situs = dipantau.find((s) => cocokDomain(cookie.domain, s)) || null;
    const alasan = periksaRisiko(cookie, namaSesiUntuk(situs, pengaturan));
    if (alasan.length > 0) berisiko.push({ cookie: cookie, alasan: alasan });
  }

  // Tombol "Percayai" untuk hasil pemindaian: masuk daftar putih lalu barisnya hilang.
  const tombolPercayaiDomain = (dom, item) =>
    buatTombol("Percayai", "percaya", async () => {
      if (!confirm("Percayai " + dom + "? Domain ini tidak akan ditandai lagi.")) return;
      await tambahKeDaftarPutih(dom);
      item.remove();
    });

  for (const [dom, catatan] of domainMirip) {
    const item = buatItem(
      judulDomain(catatan.info.ditiru, dom),
      "Domain ini " + catatan.info.alasan + ". Menyimpan " + catatan.jumlah + " cookie.",
      "Hapus semua cookie domain ini",
      async () => {
        if (!confirm("Hapus semua cookie dari " + dom + "?")) return;
        await hapusSemuaCookieDomain(dom);
        item.remove();
      },
      true
    );
    item.append(tombolPercayaiDomain(dom, item));
    wadah.append(item);
  }

  for (const [dom, catatan] of domainPerhatian) {
    const item = buatItem(
      "Perlu diperhatikan: " + dom,
      "Tanda: " + catatan.alasan + ". Menyimpan " + catatan.jumlah + " cookie.",
      "Hapus semua cookie domain ini",
      async () => {
        if (!confirm("Hapus semua cookie dari " + dom + "?")) return;
        await hapusSemuaCookieDomain(dom);
        item.remove();
      },
      false
    );
    item.classList.add("perhatian");
    item.append(tombolPercayaiDomain(dom, item));
    wadah.append(item);
  }

  for (const { cookie, alasan } of berisiko) {
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

  if (domainMirip.size === 0 && domainPerhatian.size === 0 && berisiko.length === 0) {
    wadah.append(buatKosong("Tidak ada domain mencurigakan atau cookie sesi berisiko ditemukan."));
  }
});

// ---------- Bagian 3: Ekstensi berizin cookies ----------

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
    wadah.append(buatKosong("Tidak ada ekstensi lain yang berizin cookies. Bagus!"));
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

    item.append(
      buatTombol("Hapus ekstensi", "hapus", async () => {
        try {
          // Browser menampilkan kotak konfirmasinya sendiri.
          await chrome.management.uninstall(info.id, { showConfirmDialog: true });
        } catch (e) {
          return; // dibatalkan atau tidak bisa dihapus
        }
        tampilkanEkstensi();
      }),
      buatTombol("Percayai", "percaya", async () => {
        if (!confirm("Percayai '" + info.name + "'? Ekstensi ini tidak akan ditandai lagi.")) return;
        await tambahEkstensiTepercaya(info);
        tampilkanEkstensi();
      })
    );
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
    wadah.append(
      buatChip(t.nama, null, [
        buatTombol("Keluarkan", "", async () => {
          const sisa = (await ambilEkstensiTepercaya()).filter((x) => x.id !== t.id);
          await chrome.storage.local.set({ ekstensiTepercaya: sisa });
          tampilkanEkstensi();
        }),
      ])
    );
  }
}

// ---------- Bagian 4: Periksa aktivitas login, pengingat, tes notifikasi ----------

async function tampilkanAktivitas() {
  const wadah = document.getElementById("daftarAktivitas");
  const info = document.getElementById("situsTanpaTautan");
  wadah.textContent = "";
  info.textContent = "";

  const [halaman, dipantau, terakhir, pengingat] = await Promise.all([
    ambilHalamanSitus(),
    ambilSitusDipantau(),
    ambilTerakhirCek(),
    ambilPengingat(),
  ]);

  const sekarang = Date.now();
  const kelompok = kelompokkanHalaman(halaman, dipantau);

  for (const [url, daftarSitus] of kelompok) {
    const terbaru = Math.max(0, ...daftarSitus.map((s) => terakhir[s] || 0));
    const terlambat = !terbaru || sekarang - terbaru >= pengingat.hari * 86400000;

    wadah.append(
      buatChip(
        daftarSitus.join(" / "),
        "terakhir dicek: " + waktuRelatif(terbaru, sekarang),
        [
          buatTombol("Buka", "keamanan", async () => {
            // Membuka halaman dianggap sebagai pengecekan.
            await catatTerakhirCek(daftarSitus);
            chrome.tabs.create({ url: url });
            tampilkanAktivitas();
          }),
          buatTombol("Sudah dicek", "", async () => {
            await catatTerakhirCek(daftarSitus);
            tampilkanAktivitas();
          }),
        ],
        terlambat ? "lewat" : ""
      )
    );
  }

  const tanpaTautan = dipantau.filter((s) => !halaman[s]);
  if (tanpaTautan.length > 0) {
    info.textContent =
      "Belum punya tautan aktivitas login: " + tanpaTautan.join(", ") +
      ". Kamu bisa menambahkannya di bagian 'Situs yang dipantau'.";
  }
}

async function muatPengingat() {
  const p = await ambilPengingat();
  document.getElementById("centangPengingat").checked = p.aktif;
  document.getElementById("pilihHari").value = String(p.hari);
}

async function simpanPengingat() {
  const aktif = document.getElementById("centangPengingat").checked;
  const hari = Number(document.getElementById("pilihHari").value);
  const pesan = document.getElementById("pesanPengingat");

  // background.js memantau perubahan ini dan menyesuaikan alarmnya sendiri.
  await chrome.storage.local.set({ pengingat: { aktif: aktif, hari: hari } });
  pesan.textContent = aktif
    ? "Pengingat aktif: setiap " + hari + " hari."
    : "Pengingat dimatikan.";
  tampilkanAktivitas(); // warna "terlambat" bergantung pada jarak hari
}

document.getElementById("centangPengingat").addEventListener("change", simpanPengingat);
document.getElementById("pilihHari").addEventListener("change", simpanPengingat);

// Tes notifikasi: langsung menampilkan satu notifikasi contoh.
document.getElementById("tombolTesNotif").addEventListener("click", () => {
  const pesan = document.getElementById("pesanPengingat");
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "icon128.png",
      title: "Tes notifikasi berhasil",
      message: "Notifikasi Pemantau Cookies berfungsi. Peringatan dan pengingat akan muncul seperti ini.",
    },
    () => {
      if (chrome.runtime.lastError) {
        pesan.textContent = "Gagal menampilkan notifikasi: " + chrome.runtime.lastError.message;
      } else {
        pesan.textContent =
          "Notifikasi dikirim. Kalau tidak terlihat, periksa pengaturan notifikasi di sistem operasi dan browser kamu.";
      }
    }
  );
});

// ---------- Bagian 5: Situs yang dipantau ----------

async function tampilkanSitusDipantau() {
  const wadah = document.getElementById("daftarDipantau");
  wadah.textContent = "";

  const [tambahan, halaman] = await Promise.all([ambilSitusTambahan(), ambilHalamanSitus()]);

  // Situs bawaan: tidak bisa dihapus
  for (const situs of SITUS_BAWAAN) {
    wadah.append(
      buatChip(situs, halaman[situs] ? "bawaan" : "bawaan, tanpa tautan aktivitas login", [])
    );
  }

  // Situs tambahan dari kamu: bisa dihapus
  for (const situs of tambahan) {
    wadah.append(
      buatChip(
        situs,
        halaman[situs] ? "ada tautan aktivitas login" : "tanpa tautan aktivitas login",
        [buatTombol("Hapus", "", () => hapusSitusTambahan(situs))]
      )
    );
  }
}

// Menghapus situs tambahan beserta semua pengaturan yang terkait dengannya.
async function hapusSitusTambahan(situs) {
  const data = await chrome.storage.local.get([
    "situsTambahan", "halamanSitus", "namaCookiePerSitus", "terakhirCek",
  ]);

  const halaman = data.halamanSitus || {};
  const nama = data.namaCookiePerSitus || {};
  const terakhir = data.terakhirCek || {};
  delete halaman[situs];
  delete nama[situs];
  delete terakhir[situs];

  await chrome.storage.local.set({
    situsTambahan: (data.situsTambahan || []).filter((s) => s !== situs),
    halamanSitus: halaman,
    namaCookiePerSitus: nama,
    terakhirCek: terakhir,
  });
  segarkanDaftarSitus();
}

// Dipanggil setiap daftar situs berubah, supaya semua bagian ikut diperbarui.
function segarkanDaftarSitus() {
  tampilkanSitusDipantau();
  tampilkanAktivitas();
  tampilkanPilihanSitus();
  tampilkanNamaSesi();
  tampilkanPeringatan();
}

async function simpanSitusDipantau() {
  const inputSitus = document.getElementById("inputDipantau");
  const inputTautan = document.getElementById("inputTautan");
  const pesan = document.getElementById("pesanDipantau");

  const situs = rapikanNamaSitus(inputSitus.value);
  if (!situs) {
    pesan.textContent = "Format situs tidak valid. Contoh yang benar: tokopedia.com";
    return;
  }

  const tautan = rapikanTautan(inputTautan.value);
  if (tautan === null) {
    pesan.textContent = "Tautan harus berupa alamat lengkap yang diawali https://";
    return;
  }

  // Tautan yang mengarah ke host lain bisa jadi salah ketik atau tautan penipuan,
  // jadi minta konfirmasi dulu. (Beberapa situs memang memakai host lain, misalnya
  // YouTube memakai myaccount.google.com, jadi tidak diblokir sepenuhnya.)
  if (tautan) {
    const host = new URL(tautan).hostname;
    if (
      !cocokDomain(host, situs) &&
      !confirm("Tautan ini mengarah ke " + host + ", bukan " + situs + ". Tetap simpan? Pastikan kamu benar-benar mempercayainya.")
    ) {
      return;
    }
  }

  const tambahan = await ambilSitusTambahan();
  const sudahAda = SITUS_BAWAAN.includes(situs) || tambahan.includes(situs);

  if (sudahAda && !tautan) {
    pesan.textContent = situs + " sudah ada di daftar.";
    return;
  }

  if (!sudahAda) {
    tambahan.push(situs);
    await chrome.storage.local.set({ situsTambahan: tambahan });
  }

  if (tautan) {
    const data = await chrome.storage.local.get("halamanSitus");
    const halaman = data.halamanSitus || {};
    halaman[situs] = tautan;
    await chrome.storage.local.set({ halamanSitus: halaman });
  }

  pesan.textContent = sudahAda
    ? "Tautan untuk " + situs + " diperbarui."
    : situs + " ditambahkan" + (tautan ? " beserta tautannya." : ".");
  inputSitus.value = "";
  inputTautan.value = "";
  segarkanDaftarSitus();
}

document.getElementById("tombolTambahDipantau").addEventListener("click", simpanSitusDipantau);
for (const id of ["inputDipantau", "inputTautan"]) {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") simpanSitusDipantau();
  });
}

// ---------- Bagian 6: Nama cookie sesi (semua situs atau per situs) ----------

// Mengisi pilihan cakupan: "Semua situs" + tiap situs yang dipantau.
async function tampilkanPilihanSitus() {
  const pilih = document.getElementById("pilihSitusNama");
  const terpilih = pilih.value;
  pilih.textContent = "";

  const semua = document.createElement("option");
  semua.value = "";
  semua.textContent = "Semua situs";
  pilih.append(semua);

  for (const situs of await ambilSitusDipantau()) {
    const opsi = document.createElement("option");
    opsi.value = situs;
    opsi.textContent = situs;
    pilih.append(opsi);
  }

  // Pertahankan pilihan sebelumnya kalau masih ada.
  if ([...pilih.options].some((o) => o.value === terpilih)) pilih.value = terpilih;
}

async function tampilkanNamaSesi() {
  const wadah = document.getElementById("daftarNamaSesi");
  wadah.textContent = "";

  const pengaturan = await ambilPengaturanNama();
  let jumlah = 0;

  for (const nama of pengaturan.global) {
    jumlah++;
    wadah.append(
      buatChip(nama, "semua situs", [
        buatTombol("Hapus", "", async () => {
          const data = await ambilPengaturanNama();
          await chrome.storage.local.set({
            namaCookieTambahan: data.global.filter((n) => n !== nama),
          });
          tampilkanNamaSesi();
        }),
      ])
    );
  }

  for (const [situs, daftar] of Object.entries(pengaturan.perSitus)) {
    for (const nama of daftar) {
      jumlah++;
      wadah.append(
        buatChip(nama, "hanya " + situs, [
          buatTombol("Hapus", "", async () => {
            const data = await ambilPengaturanNama();
            const sisa = (data.perSitus[situs] || []).filter((n) => n !== nama);
            if (sisa.length > 0) data.perSitus[situs] = sisa;
            else delete data.perSitus[situs];
            await chrome.storage.local.set({ namaCookiePerSitus: data.perSitus });
            tampilkanNamaSesi();
          }),
        ])
      );
    }
  }

  if (jumlah === 0) wadah.append(buatKosong("Belum ada nama tambahan."));
}

async function tambahNamaSesi() {
  const input = document.getElementById("inputNamaSesi");
  const pesan = document.getElementById("pesanNamaSesi");
  const situs = document.getElementById("pilihSitusNama").value; // "" = semua situs

  const nama = rapikanNamaCookie(input.value);
  if (!nama) {
    pesan.textContent = "Nama tidak valid. Pakai huruf, angka, _ . atau - (maksimal 60 karakter).";
    return;
  }

  const pengaturan = await ambilPengaturanNama();

  if (NAMA_COOKIE_SESI.includes(nama)) {
    pesan.textContent = nama + " sudah termasuk bawaan.";
    return;
  }
  if (pengaturan.global.includes(nama)) {
    pesan.textContent = nama + " sudah berlaku untuk semua situs.";
    return;
  }

  if (!situs) {
    pengaturan.global.push(nama);
    await chrome.storage.local.set({ namaCookieTambahan: pengaturan.global });
    pesan.textContent = nama + " ditambahkan untuk semua situs.";
  } else {
    const daftar = pengaturan.perSitus[situs] || [];
    if (daftar.includes(nama)) {
      pesan.textContent = nama + " sudah ada untuk " + situs + ".";
      return;
    }
    daftar.push(nama);
    pengaturan.perSitus[situs] = daftar;
    await chrome.storage.local.set({ namaCookiePerSitus: pengaturan.perSitus });
    pesan.textContent = nama + " ditambahkan untuk " + situs + " saja.";
  }

  input.value = "";
  tampilkanNamaSesi();
}

document.getElementById("tombolTambahNamaSesi").addEventListener("click", tambahNamaSesi);
document.getElementById("inputNamaSesi").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tambahNamaSesi();
});

// ---------- Bagian 7: Daftar putih ----------

// Menambah satu situs ke daftar putih, lalu membuang peringatan lama dari situs itu.
async function tambahKeDaftarPutih(situs) {
  const daftar = await ambilDaftarPutih();
  if (!daftar.includes(situs)) {
    daftar.push(situs);
    await chrome.storage.local.set({ daftarPutih: daftar });
  }

  const data = await chrome.storage.local.get("peringatan");
  const sisa = (data.peringatan || []).filter((p) => !cocokDomain(p.domain, situs));
  await chrome.storage.local.set({ peringatan: sisa });
  await setBadge(sisa.length);

  tampilkanPeringatan();
  tampilkanDaftarPutih();
}

async function tampilkanDaftarPutih() {
  const wadah = document.getElementById("daftarPutih");
  wadah.textContent = "";

  const daftar = await ambilDaftarPutih();
  if (daftar.length === 0) {
    wadah.append(buatKosong("Belum ada situs di daftar putih."));
    return;
  }

  for (const situs of daftar) {
    wadah.append(
      buatChip(situs, null, [
        buatTombol("Keluarkan", "", async () => {
          const sisa = (await ambilDaftarPutih()).filter((s) => s !== situs);
          await chrome.storage.local.set({ daftarPutih: sisa });
          tampilkanDaftarPutih();
        }),
      ])
    );
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

// ---------- Jalankan saat popup dibuka ----------

tampilkanPeringatan();
tampilkanEkstensi();
tampilkanAktivitas();
muatPengingat();
tampilkanSitusDipantau();
tampilkanPilihanSitus();
tampilkanNamaSesi();
tampilkanDaftarPutih();
