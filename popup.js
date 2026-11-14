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
    ? tr("p.domMirip", { d: ditiru, x: domain })
    : tr("p.domCuriga", { d: domain });
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
  tampilkanJumlahTab(daftar.length);

  if (daftar.length === 0) {
    wadah.append(buatKosong(tr("p.kosong")));
    return;
  }

  for (const p of daftar) {
    const waktu = formatWaktu(p.waktu);
    const mirip = p.jenis === "domain-mirip";

    const item = mirip
      ? buatItem(
          judulDomain(p.ditiru, p.situs),
          p.alasan + " (" + waktu + ")",
          tr("p.hapusDom"),
          async () => {
            if (!confirm(tr("p.konfDom", { s: p.situs }))) return;
            await hapusSemuaCookieDomain(p.domain);
            await buangPeringatan(p);
          },
          true
        )
      : buatItem(
          p.situs + " - " + p.nama,
          p.alasan + " (" + waktu + ")",
          tr("p.hapusCk"),
          async () => {
            if (!confirm(tr("p.konfCk", { n: p.nama, s: p.situs }))) return;
            await hapusCookie(p);
            await buangPeringatan(p);
          },
          true
        );

    // Tombol kedua: masukkan situs ini ke daftar putih.
    item.append(
      buatTombol(tr("p.percaya"), "percaya", async () => {
        const peringatanTambahan = mirip
          ? tr("p.perhatian") + (p.ditiru ? tr("p.meniru", { x: p.ditiru }) : "") + ". "
          : "";
        if (!confirm(peringatanTambahan + tr("p.konfPercaya", { s: p.situs }))) return;
        await tambahKeDaftarPutih(p.situs);
      })
    );

    // Tombol ketiga: buka halaman untuk keluar dari semua perangkat (kalau ada).
    // Hanya untuk cookie sesi; domain tiruan bukan situs milikmu.
    const tautan = mirip ? null : halaman[p.situs];
    if (tautan) {
      item.append(
        buatTombol(tr("p.keluarSemua"), "keamanan", async () => {
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
    alasan.push(tr("r.httponly"));
  }
  if (!cookie.secure) {
    alasan.push(tr("r.secure"));
  }
  if (cookie.sameSite === "no_restriction") {
    alasan.push(tr("r.samesite"));
  }
  return alasan;
}

document.getElementById("tombolPindai").addEventListener("click", async () => {
  const wadah = document.getElementById("hasilPindai");
  wadah.textContent = tr("s.memindai");

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
    buatTombol(tr("s.percayai"), "percaya", async () => {
      if (!confirm(tr("s.konfPercaya", { d: dom }))) return;
      await tambahKeDaftarPutih(dom);
      item.remove();
    });

  for (const [dom, catatan] of domainMirip) {
    const item = buatItem(
      judulDomain(catatan.info.ditiru, dom),
      tr("s.isiMirip", { a: catatan.info.alasan, n: catatan.jumlah }),
      tr("p.hapusDom"),
      async () => {
        if (!confirm(tr("p.konfDom", { s: dom }))) return;
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
      tr("s.perlu", { d: dom }),
      tr("s.tanda", { a: catatan.alasan, n: catatan.jumlah }),
      tr("p.hapusDom"),
      async () => {
        if (!confirm(tr("p.konfDom", { s: dom }))) return;
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
      tr("s.hapus"),
      async () => {
        if (!confirm(tr("s.konfCk", { n: cookie.name }))) return;
        await hapusCookie(cookie);
        item.remove();
      },
      false
    );
    wadah.append(item);
  }

  if (domainMirip.size === 0 && domainPerhatian.size === 0 && berisiko.length === 0) {
    wadah.append(buatKosong(tr("s.kosong")));
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

// Pemeriksaan ekstensi butuh izin opsional "management". Izin itu baru diminta saat
// kamu menekan tombolnya, dan bisa dicabut lagi kapan saja.
async function tampilkanEkstensi() {
  const wadah = document.getElementById("daftarEkstensi");
  const izin = document.getElementById("izinEkstensi");
  wadah.textContent = "";
  izin.textContent = "";
  document.getElementById("daftarEkstensiTepercaya").textContent = "";

  if (!(await adaIzinManajemen())) {
    const pesanIzin = document.createElement("div");
    pesanIzin.className = "info";
    izin.append(
      buatKosong(tr("x.belumAktif")),
      buatTombol(tr("x.aktifkan"), "", async () => {
        let diberikan = false;
        try {
          diberikan = await chrome.permissions.request({ permissions: ["management"] });
        } catch (e) {
          diberikan = false;
        }
        if (diberikan) {
          tampilkanEkstensi();
        } else {
          pesanIzin.textContent = tr("x.ditolak");
        }
      }),
      pesanIzin
    );
    return;
  }

  wadah.textContent = tr("x.memeriksa");

  let hasil;
  try {
    hasil = await ambilEkstensiBerisiko();
  } catch (e) {
    wadah.textContent = tr("x.gagalBaca");
    return;
  }
  wadah.textContent = "";

  if (hasil.length === 0) {
    wadah.append(buatKosong(tr("x.kosong")));
  }

  for (const h of hasil) {
    const info = h.info;
    const tingkat = h.tinggi ? tr("x.tinggi") : tr("x.sedang");

    // Tombol utama: nonaktifkan (bisa diaktifkan lagi lewat halaman extensions).
    const item = buatItem(
      info.name + " (" + tingkat + ")",
      h.alasan.join("; "),
      tr("x.nonaktif"),
      async () => {
        try {
          await chrome.management.setEnabled(info.id, false);
        } catch (e) {
          alert(tr("x.gagalNonaktif"));
          return;
        }
        tampilkanEkstensi();
      },
      h.tinggi
    );

    item.append(
      buatTombol(tr("x.hapusExt"), "hapus", async () => {
        try {
          // Browser menampilkan kotak konfirmasinya sendiri.
          await chrome.management.uninstall(info.id, { showConfirmDialog: true });
        } catch (e) {
          return; // dibatalkan atau tidak bisa dihapus
        }
        tampilkanEkstensi();
      }),
      buatTombol(tr("s.percayai"), "percaya", async () => {
        if (!confirm(tr("x.konfPercaya", { n: info.name }))) return;
        await tambahEkstensiTepercaya(info);
        tampilkanEkstensi();
      })
    );
    wadah.append(item);
  }

  await tampilkanEkstensiTepercaya();

  izin.append(
    buatTombol(tr("x.matikan"), "kecil", async () => {
      try {
        await chrome.permissions.remove({ permissions: ["management"] });
      } catch (e) {
        // abaikan: tampilan di bawah akan memeriksa ulang izinnya
      }
      tampilkanEkstensi();
    })
  );
}

async function tampilkanEkstensiTepercaya() {
  const wadah = document.getElementById("daftarEkstensiTepercaya");
  wadah.textContent = "";

  const daftar = await ambilEkstensiTepercaya();
  if (daftar.length === 0) return;

  const judul = document.createElement("div");
  judul.className = "info";
  judul.textContent = tr("x.tepercaya");
  wadah.append(judul);

  for (const t of daftar) {
    wadah.append(
      buatChip(t.nama, null, [
        buatTombol(tr("x.keluarkan"), "", async () => {
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
        tr("l.dicek", { w: waktuRelatif(terbaru, sekarang) }),
        [
          buatTombol(tr("l.buka"), "keamanan", async () => {
            // Membuka halaman dianggap sebagai pengecekan.
            await catatTerakhirCek(daftarSitus);
            chrome.tabs.create({ url: url });
            tampilkanAktivitas();
          }),
          buatTombol(tr("l.sudah"), "", async () => {
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
    info.textContent = tr("l.tanpaTautan", { l: tanpaTautan.join(", ") });
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
    ? tr("l.pengingatAktif", { h: hari })
    : tr("l.pengingatMati");
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
      title: tr("n.judul"),
      message: tr("n.isi"),
    },
    () => {
      if (chrome.runtime.lastError) {
        pesan.textContent = tr("n.gagal", { e: chrome.runtime.lastError.message });
      } else {
        pesan.textContent = tr("n.terkirim");
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
      buatChip(situs, halaman[situs] ? tr("d.bawaan") : tr("d.bawaanTanpa"), [])
    );
  }

  // Situs tambahan dari kamu: bisa dihapus
  for (const situs of tambahan) {
    wadah.append(
      buatChip(
        situs,
        halaman[situs] ? tr("d.ada") : tr("d.tanpa"),
        [buatTombol(tr("d.hapus"), "", () => hapusSitusTambahan(situs))]
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
    pesan.textContent = tr("d.formatSitus");
    return;
  }

  const tautan = rapikanTautan(inputTautan.value);
  if (tautan === null) {
    pesan.textContent = tr("d.formatTautan");
    return;
  }

  // Tautan yang mengarah ke host lain bisa jadi salah ketik atau tautan penipuan,
  // jadi minta konfirmasi dulu. (Beberapa situs memang memakai host lain, misalnya
  // YouTube memakai myaccount.google.com, jadi tidak diblokir sepenuhnya.)
  if (tautan) {
    const host = new URL(tautan).hostname;
    if (
      !cocokDomain(host, situs) &&
      !confirm(tr("d.konfHost", { h: host, s: situs }))
    ) {
      return;
    }
  }

  const tambahan = await ambilSitusTambahan();
  const sudahAda = SITUS_BAWAAN.includes(situs) || tambahan.includes(situs);

  if (sudahAda && !tautan) {
    pesan.textContent = tr("d.sudahAda", { s: situs });
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
    ? tr("d.tautanUpdate", { s: situs })
    : tautan
      ? tr("d.ditambahTautan", { s: situs })
      : tr("d.ditambah", { s: situs });
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
  semua.textContent = tr("c.semuaSitus");
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
      buatChip(nama, tr("c.chipSemua"), [
        buatTombol(tr("d.hapus"), "", async () => {
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
        buatChip(nama, tr("c.chipHanya", { s: situs }), [
          buatTombol(tr("d.hapus"), "", async () => {
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

  if (jumlah === 0) wadah.append(buatKosong(tr("c.kosong")));
}

async function tambahNamaSesi() {
  const input = document.getElementById("inputNamaSesi");
  const pesan = document.getElementById("pesanNamaSesi");
  const situs = document.getElementById("pilihSitusNama").value; // "" = semua situs

  const nama = rapikanNamaCookie(input.value);
  if (!nama) {
    pesan.textContent = tr("c.tidakValid");
    return;
  }

  const pengaturan = await ambilPengaturanNama();

  if (NAMA_COOKIE_SESI.includes(nama)) {
    pesan.textContent = tr("c.bawaan", { n: nama });
    return;
  }
  if (pengaturan.global.includes(nama)) {
    pesan.textContent = tr("c.sudahSemua", { n: nama });
    return;
  }

  if (!situs) {
    pengaturan.global.push(nama);
    await chrome.storage.local.set({ namaCookieTambahan: pengaturan.global });
    pesan.textContent = tr("c.tambahSemua", { n: nama });
  } else {
    const daftar = pengaturan.perSitus[situs] || [];
    if (daftar.includes(nama)) {
      pesan.textContent = tr("c.sudahUntuk", { n: nama, s: situs });
      return;
    }
    daftar.push(nama);
    pengaturan.perSitus[situs] = daftar;
    await chrome.storage.local.set({ namaCookiePerSitus: pengaturan.perSitus });
    pesan.textContent = tr("c.tambahSaja", { n: nama, s: situs });
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
    wadah.append(buatKosong(tr("w.kosong")));
    return;
  }

  for (const situs of daftar) {
    wadah.append(
      buatChip(situs, null, [
        buatTombol(tr("w.keluarkan"), "", async () => {
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
    pesan.textContent = tr("w.format");
    return;
  }

  await tambahKeDaftarPutih(situs);
  pesan.textContent = tr("w.ditambah", { s: situs });
  input.value = "";
}

document.getElementById("tombolTambah").addEventListener("click", tambahDariInput);
document.getElementById("inputSitus").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tambahDariInput();
});

// ---------- Tab ----------

const tombolTab = Array.from(document.querySelectorAll(".tab button"));

// Angka merah di tab Peringatan. Dibuat dengan textContent, bukan HTML.
function tampilkanJumlahTab(jumlah) {
  const tab = document.getElementById("tab-peringatan");
  const lama = tab.querySelector(".jumlah");
  if (lama) lama.remove();
  if (!jumlah) return;
  const angka = document.createElement("span");
  angka.className = "jumlah";
  angka.textContent = String(jumlah);
  tab.append(angka);
}

function pilihTab(tab) {
  for (const t of tombolTab) {
    const aktif = t === tab;
    t.setAttribute("aria-selected", aktif ? "true" : "false");
    t.tabIndex = aktif ? 0 : -1;
    document.getElementById(t.dataset.panel).hidden = !aktif;
  }
  try { localStorage.setItem("tabAktif", tab.id); } catch (e) { /* boleh gagal */ }
}

tombolTab.forEach((t, i) => {
  t.addEventListener("click", () => pilihTab(t));
  t.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const baru = tombolTab[(i + (e.key === "ArrowRight" ? 1 : tombolTab.length - 1)) % tombolTab.length];
    pilihTab(baru);
    baru.focus();
  });
});

{
  let awal = tombolTab[0];
  try {
    const tersimpan = tombolTab.find((t) => t.id === localStorage.getItem("tabAktif"));
    if (tersimpan) awal = tersimpan;
  } catch (e) { /* abaikan */ }
  pilihTab(awal);
}

// ---------- Tab Bersihkan: cookie login terdeteksi otomatis ----------

const namaMode = () => ({ sesi: tr("bersih.mode.sesi"), semua: tr("bersih.mode.semua") });

// Situs dari tab yang sedang dibuka (null kalau bukan halaman web biasa).
async function ambilSitusTabAktif() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return null;
    const alamat = new URL(tab.url);
    if (alamat.protocol !== "https:" && alamat.protocol !== "http:") return null;
    return domainUtama(alamat.hostname);
  } catch (e) {
    return null;
  }
}

// Satu baris situs yang terdeteksi punya cookie login.
function barisSitusLogin(situs, jumlah, sudahOtomatis) {
  const tombol = [];
  if (sudahOtomatis) {
    const label = document.createElement("span");
    label.className = "bawaan";
    label.textContent = tr("bersih.otomatis");
    tombol.push(label);
  } else {
    tombol.push(
      buatTombol(tr("bersih.tambah"), "percaya", async () => {
        const daftar = await ambilHapusSaatBuka();
        if (!daftar.some((x) => x.situs === situs)) {
          await chrome.storage.local.set({ hapusSaatBuka: daftar.concat({ situs: situs, mode: "sesi" }) });
        }
        document.getElementById("pesanBersih").textContent = tr("bersih.ditambah", { s: situs });
        tampilkanBersih();
      })
    );
  }
  tombol.push(
    buatTombol(tr("bersih.hapusSekarang"), "hapus", async () => {
      if (!confirm(tr("bersih.konfSatu", { n: jumlah, s: situs }))) return;
      const dihapus = await hapusCookieSitus(situs, "sesi", await ambilPengaturanNama());
      document.getElementById("pesanBersih").textContent = tr("bersih.hasilSatu", { s: situs, n: dihapus });
      tampilkanBersih();
    })
  );
  return buatChip(situs, tr("bersih.cookieN", { n: jumlah }), tombol);
}

async function tampilkanBersih() {
  const [daftarOto, terdeteksi, situsTab] = await Promise.all([
    ambilHapusSaatBuka(),
    cariSitusCookieLogin(),
    ambilSitusTabAktif(),
  ]);
  const otomatis = new Set(daftarOto.map((x) => x.situs));

  // 1. Situs di tab yang sedang dibuka, paling atas.
  const kotakTab = document.getElementById("tabIniBersih");
  kotakTab.textContent = "";
  let lewati = null;
  if (situsTab) {
    const cocok = terdeteksi.find((x) => x.situs === situsTab);
    const judul = document.createElement("h3");
    judul.textContent = tr("bersih.tabIni");
    kotakTab.append(judul);
    if (cocok) {
      const baris = barisSitusLogin(cocok.situs, cocok.jumlah, otomatis.has(cocok.situs));
      baris.classList.add("sorot");
      kotakTab.append(baris);
      lewati = cocok.situs;
    } else {
      kotakTab.append(buatKosong(tr("bersih.tabIniKosong", { s: situsTab })));
    }
  }

  // 2. Semua situs lain yang cookie login-nya terdeteksi.
  const wadahDeteksi = document.getElementById("daftarDeteksi");
  wadahDeteksi.textContent = "";
  const lain = terdeteksi.filter((x) => x.situs !== lewati);
  if (terdeteksi.length === 0) wadahDeteksi.append(buatKosong(tr("bersih.deteksiKosong")));
  for (const { situs, jumlah } of lain) {
    wadahDeteksi.append(barisSitusLogin(situs, jumlah, otomatis.has(situs)));
  }

  // 3. Daftar yang dibersihkan otomatis tiap browser dibuka.
  const wadah = document.getElementById("daftarBersih");
  wadah.textContent = "";
  if (daftarOto.length === 0) wadah.append(buatKosong(tr("bersih.kosong")));
  for (const { situs, mode } of daftarOto) {
    wadah.append(
      buatChip(situs, namaMode()[mode], [
        buatTombol(tr("w.keluarkan"), "", async () => {
          const sisa = (await ambilHapusSaatBuka()).filter((x) => x.situs !== situs);
          await chrome.storage.local.set({ hapusSaatBuka: sisa });
          tampilkanBersih();
        }),
      ])
    );
  }

  const hasil = await ambilHasilBersih();
  document.getElementById("statusBersih").textContent = hasil
    ? tr("bersih.status", { w: formatWaktu(hasil.waktu), n: hasil.jumlah })
    : tr("bersih.belum");
  document.getElementById("tombolBersihkanSekarang").disabled = daftarOto.length === 0;
}

document.getElementById("tombolBersihkanSekarang").addEventListener("click", async () => {
  const daftar = await ambilHapusSaatBuka();
  if (daftar.length === 0) return;
  const peringatan = daftar.some((x) => x.mode === "semua") ? tr("bersih.konfSemua") : "";
  if (!confirm(tr("bersih.konf", { n: daftar.length }) + peringatan)) return;
  const jumlah = await bersihkanCookieTerpilih();
  document.getElementById("pesanBersih").textContent = tr("bersih.hasil", { n: jumlah });
  tampilkanBersih();
});

// ---------- Bahasa ----------

// Mengisi semua teks tetap di popup.html sesuai bahasa aktif (pakai textContent).
function terapkanTeksStatis() {
  document.documentElement.lang = bahasaAktif;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = tr(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = tr(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", tr(el.dataset.i18nAria));
  for (const el of document.querySelectorAll("[data-bahasa]")) {
    el.setAttribute("aria-pressed", el.dataset.bahasa === bahasaAktif ? "true" : "false");
  }
}

// Menggambar ulang semua bagian yang isinya dibuat oleh kode.
function renderSemua() {
  terapkanTeksStatis();
  tampilkanPeringatan();
  tampilkanEkstensi();
  tampilkanAktivitas();
  muatPengingat();
  tampilkanSitusDipantau();
  tampilkanPilihanSitus();
  tampilkanNamaSesi();
  tampilkanBersih();
  tampilkanDaftarPutih();
}

for (const tombol of document.querySelectorAll("[data-bahasa]")) {
  tombol.addEventListener("click", async () => {
    if (tombol.dataset.bahasa === bahasaAktif) return;
    await simpanBahasa(tombol.dataset.bahasa);
    // Pesan dan hasil pemindaian lama masih memakai bahasa sebelumnya, jadi dikosongkan.
    for (const id of ["pesanPengingat", "pesanDipantau", "pesanNamaSesi", "pesanBersih", "pesanDaftarPutih", "hasilPindai"]) {
      document.getElementById(id).textContent = "";
    }
    renderSemua();
  });
}

// ---------- Jalankan saat popup dibuka ----------

muatBahasa().then(renderSemua);
