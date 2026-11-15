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
        buatTombol(tr("p.keluarSemua"), "keamanan", () => {
          chrome.tabs.create({ url: tautan });
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


// Situs dari tab yang sedang dibuka (null kalau bukan halaman web biasa).
// Tab yang sedang dibuka: { situs: domain utama, origin: alamat lengkap situs }, atau null.
async function ambilTabAktif() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return null;
    const alamat = new URL(tab.url);
    if (alamat.protocol !== "https:" && alamat.protocol !== "http:") return null;
    const situs = domainUtama(alamat.hostname);
    if (!situs || terlaluUmum(situs)) return null;
    return { situs: situs, origin: alamat.origin, id: tab.id };
  } catch (e) {
    return null;
  }
}
async function ambilSitusTabAktif() {
  const tab = await ambilTabAktif();
  return tab ? tab.situs : null;
}

// Satu baris situs yang terdeteksi punya cookie login.
function barisSitusLogin(situs, jumlah, sudahOtomatis, sudahTabTutup) {
  const tombol = [];
  if (sudahTabTutup) {
    const label = document.createElement("span");
    label.className = "bawaan";
    label.textContent = tr("tabTutup.aktif");
    tombol.push(label);
  } else {
    tombol.push(
      buatTombol(tr("tabTutup.tambah"), "percaya", async () => {
        const daftar = await ambilHapusSaatTabTutup();
        if (!daftar.includes(situs)) await chrome.storage.local.set({ hapusSaatTabTutup: daftar.concat(situs) });
        document.getElementById("pesanBersih").textContent = tr("tabTutup.ditambah", { s: situs });
        tampilkanBersih();
      })
    );
  }
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

// ---------- Kartu "Tab ini" dan daftar situs terlindungi ----------

function buatCentang(teks, tercentang) {
  const label = document.createElement("label");
  label.className = "centang";
  const kotak = document.createElement("input");
  kotak.type = "checkbox";
  kotak.checked = !!tercentang;
  const span = document.createElement("span");
  span.textContent = teks;
  label.append(kotak, span);
  return { label: label, kotak: kotak, span: span };
}

function buatPil(teks, aktif, aksi) {
  const t = document.createElement("button");
  t.className = "pil" + (aktif ? " aktif" : "");
  t.setAttribute("aria-pressed", aktif ? "true" : "false");
  t.textContent = teks + ": " + tr(aktif ? "lindung.nyala" : "lindung.mati");
  t.addEventListener("click", aksi);
  return t;
}

// Isi panel pilihan: daftar NAMA cookie situs (isinya tidak pernah dibaca) dan kapan dihapus.
async function bangunPanelPilih(panel, tab, ada, pesan) {
  panel.textContent = "";
  const [pengaturan, cookies] = await Promise.all([
    ambilPengaturanNama(),
    chrome.cookies.getAll({ domain: tab.situs }),
  ]);
  const tampil = new Map();
  for (const c of cookies) {
    if (!cocokDomain(c.domain, tab.situs)) continue;
    const kunci = c.name.toLowerCase();
    if (!tampil.has(kunci)) tampil.set(kunci, c.name);
  }
  const urutan = { dikenal: 0, mirip: 1, lain: 2, pelacak: 3 };
  const daftar = Array.from(tampil.keys())
    .map((n) => ({ nama: n, asli: tampil.get(n), jenis: jenisNamaCookie(n, tab.situs, pengaturan) }))
    .sort((a, b) => urutan[a.jenis] - urutan[b.jenis] || a.nama.localeCompare(b.nama));
  const adaLogin = daftar.some((x) => x.jenis === "dikenal" || x.jenis === "mirip");

  const judul = document.createElement("strong");
  judul.textContent = tr("pilih.judul", { s: tab.situs });
  const info = document.createElement("p");
  info.className = "info";
  info.textContent = tr("pilih.info");
  panel.append(judul, info);

  if (!adaLogin && !ada) {
    const peringatan = document.createElement("div");
    peringatan.className = "peringatan-kuning";
    const t = document.createElement("strong");
    t.textContent = tr("pilih.tidakAdaJudul");
    const isi = document.createElement("div");
    isi.textContent = tr("pilih.tidakAdaIsi");
    peringatan.append(t, isi);
    panel.append(peringatan);
  }
  if (daftar.length === 0) panel.append(buatKosong(tr("pilih.kosongCookie")));

  const kotakNama = [];
  for (const c of daftar) {
    const tercentang = ada ? ada.nama.includes(c.nama) : c.jenis === "dikenal" || c.jenis === "mirip";
    const cb = buatCentang(c.asli, tercentang);
    cb.span.className = "kode";
    const ket = document.createElement("small");
    if (c.jenis !== "lain") ket.textContent = tr("pilih." + c.jenis);
    cb.label.append(ket);
    panel.append(cb.label);
    kotakNama.push({ nama: c.nama, kotak: cb.kotak });
  }

  // Data penyimpanan situs (localStorage): hanya NAMA kunci yang dibaca, lalu kamu pilih mana yang dihapus.
  const kunciJudul = document.createElement("strong");
  kunciJudul.textContent = tr("kunci.judul");
  const kunciInfo = document.createElement("p");
  kunciInfo.className = "info";
  kunciInfo.textContent = tr("kunci.info");
  const wadahKunci = document.createElement("div");
  const kotakKunci = [];
  const isiKunci = async () => {
    wadahKunci.textContent = "";
    kotakKunci.length = 0;
    const terbaca = await bacaNamaKunciTab(tab.id);
    const tersimpan = ada ? ada.kunci : [];
    const gabung = (terbaca || []).concat(tersimpan.filter((k) => !(terbaca || []).includes(k)));
    const urutKunci = { mirip: 0, lain: 1, pelacak: 2 };
    const daftarKunci = gabung
      .map((k) => ({ nama: k, jenis: jenisNamaKunci(k) }))
      .sort((a, b) => urutKunci[a.jenis] - urutKunci[b.jenis] || a.nama.localeCompare(b.nama));
    if (terbaca === null) {
      const tombolIzin = buatTombol(tr("kunci.tombolIzin"), "percaya", async () => {
        let boleh = false;
        try {
          boleh = await chrome.permissions.request({ permissions: ["scripting"] });
        } catch (e) {
          boleh = false;
        }
        if (boleh) await isiKunci();
        else pesan.textContent = tr("kunci.ditolak");
      });
      tombolIzin.id = "tombolBacaKunci";
      const catatanIzin = document.createElement("p");
      catatanIzin.className = "info";
      catatanIzin.textContent = tr("kunci.catatanIzin");
      wadahKunci.append(tombolIzin, catatanIzin);
    } else if (daftarKunci.length === 0) {
      wadahKunci.append(buatKosong(tr("kunci.kosong")));
    }
    for (const k of daftarKunci) {
      const tercentang = ada ? tersimpan.includes(k.nama) : k.jenis === "mirip";
      const cb = buatCentang(k.nama, tercentang);
      cb.span.className = "kode";
      const ket = document.createElement("small");
      if (k.jenis === "mirip") ket.textContent = tr("kunci.mirip");
      else if (k.jenis === "pelacak") ket.textContent = tr("kunci.pelacak");
      cb.label.append(ket);
      wadahKunci.append(cb.label);
      kotakKunci.push({ nama: k.nama, kotak: cb.kotak });
    }
  };
  await isiKunci();
  panel.append(kunciJudul, kunciInfo, wadahKunci);

  const kapan = document.createElement("strong");
  kapan.textContent = tr("pilih.kapan");
  const cbTab = buatCentang(tr("pilih.tab"), ada ? ada.tabTutup : true);
  const cbBuka = buatCentang(tr("pilih.buka"), ada ? ada.browserDibuka : true);
  const cbSemua = buatCentang(tr("pilih.semua"), ada ? ada.semua : false);
  const cbData = buatCentang(tr("pilih.data", { o: tab.origin }), ada ? ada.origins.length > 0 : !adaLogin);
  panel.append(kapan, cbTab.label, cbBuka.label, cbSemua.label, cbData.label);

  const aksi = document.createElement("div");
  aksi.className = "baris";
  const simpan = buatTombol(tr("pilih.simpan"), "percaya", async () => {
    // Permintaan izin harus langsung dari klik, jadi dilakukan paling awal.
    const nama = kotakNama.filter((x) => x.kotak.checked).map((x) => x.nama);
    const kunci = kotakKunci.filter((x) => x.kotak.checked).map((x) => x.nama);
    const semua = cbSemua.kotak.checked;
    if (nama.length === 0 && kunci.length === 0 && !semua && !cbData.kotak.checked) {
      pesan.textContent = tr("pilih.kosongPilihan");
      return;
    }
    // Satu permintaan izin untuk semua yang dibutuhkan (harus langsung dari klik).
    const butuh = [];
    if (cbData.kotak.checked && !chrome.browsingData) butuh.push("browsingData");
    if (kunci.length > 0 && !chrome.scripting) butuh.push("scripting");
    let boleh = true;
    if (butuh.length > 0) {
      try {
        boleh = await chrome.permissions.request({ permissions: butuh });
      } catch (e) {
        boleh = false;
      }
    }
    let origins = [];
    let catatan = "";
    if (cbData.kotak.checked && boleh) origins = (ada ? ada.origins : []).concat(tab.origin);
    if (!boleh) catatan = " " + tr("pilih.izinDitolak");
    await simpanPerlindunganSitus(tab.situs, {
      nama: nama,
      semua: semua,
      origins: origins,
      kunci: kunci,
      tabTutup: cbTab.kotak.checked,
      browserDibuka: cbBuka.kotak.checked,
    });
    panel.hidden = true;
    // Pesan di kotak bersama bawah, karena kartu ini digambar ulang setelah disimpan.
    document.getElementById("pesanBersih").textContent = tr("pilih.tersimpan", { s: tab.situs }) + catatan;
    tampilkanBersih();
  });
  simpan.id = "tombolSimpanLindungi";
  const batal = buatTombol(tr("pilih.batal"), "kecil", () => {
    panel.hidden = true;
  });
  aksi.append(simpan, batal);
  panel.append(aksi);
}

async function tampilkanKartuTab(kotak, tab, terlindungi) {
  kotak.textContent = "";
  if (!tab) return;
  const ada = terlindungi.find((x) => x.situs === tab.situs) || null;
  const judul = document.createElement("h3");
  judul.textContent = tr("bersih.tabIni");
  const kartu = document.createElement("div");
  kartu.className = "kartu-tab";

  const kepala = document.createElement("div");
  kepala.className = "kartu-kepala";
  const huruf = document.createElement("div");
  huruf.className = "huruf";
  huruf.textContent = tab.situs.charAt(0).toUpperCase();
  const nama = document.createElement("div");
  nama.className = "kartu-nama";
  const n1 = document.createElement("strong");
  n1.textContent = tab.situs;
  const n2 = document.createElement("small");
  n2.textContent = tr("tabIni.terbaca");
  nama.append(n1, n2);
  const status = document.createElement("span");
  status.className = "lencana " + (ada ? "ok" : "awas");
  status.textContent = tr(ada ? "tabIni.sudah" : "tabIni.belum");
  kepala.append(huruf, nama, status);

  const pesan = document.createElement("div");
  pesan.className = "info";
  const panel = document.createElement("div");
  panel.className = "panel-pilih";
  panel.hidden = true;
  const tombol = buatTombol(tr(ada ? "tabIni.atur" : "tabIni.tombol"), "percaya", async () => {
    if (panel.hidden) {
      await bangunPanelPilih(panel, tab, ada, pesan);
      panel.hidden = false;
    } else {
      panel.hidden = true;
    }
  });
  tombol.id = "tombolLindungi";
  tombol.classList.add("lebar-penuh");
  kartu.append(kepala, tombol, panel, pesan);
  kotak.append(judul, kartu);
}

function tampilkanDaftarLindungi(wadah, daftar) {
  wadah.textContent = "";
  if (daftar.length === 0) wadah.append(buatKosong(tr("lindung.kosong")));
  const pesan = document.getElementById("pesanBersih");
  for (const item of daftar) {
    const kartu = document.createElement("div");
    kartu.className = "kartu-lindung";
    const atas = document.createElement("div");
    atas.className = "kartu-kepala";
    const nama = document.createElement("div");
    nama.className = "kartu-nama";
    const n1 = document.createElement("strong");
    n1.textContent = item.situs;
    const n2 = document.createElement("small");
    let sub = item.semua
      ? tr("lindung.subSemua")
      : item.nama.length > 0
        ? tr("lindung.subNama", { n: item.nama.length })
        : tr("lindung.subOtomatis");
    if (item.origins.length > 0) sub += " · " + tr("lindung.subData");
    if (item.kunci.length > 0) sub += " · " + tr("lindung.subKunci", { n: item.kunci.length });
    n2.textContent = sub;
    nama.append(n1, n2);
    const sekarang = buatTombol(tr("bersih.hapusSekarang"), "hapus", async () => {
      if (!confirm(tr("lindung.konfSekarang", { s: item.situs }))) return;
      const dihapus = await hapusCookieSitus(item.situs, item.semua ? "semua" : "sesi", await ambilPengaturanNama());
      pesan.textContent = tr("bersih.hasilSatu", { s: item.situs, n: dihapus });
      tampilkanBersih();
    });
    atas.append(nama, sekarang);

    const pil = document.createElement("div");
    pil.className = "pil-baris";
    pil.append(
      buatPil(tr("lindung.pilTab"), item.tabTutup, async () => {
        const sisa = (await ambilHapusSaatTabTutup()).filter((x) => x !== item.situs);
        if (!item.tabTutup) sisa.push(item.situs);
        await chrome.storage.local.set({ hapusSaatTabTutup: sisa });
        tampilkanBersih();
      }),
      buatPil(tr("lindung.pilBuka"), item.browserDibuka, async () => {
        const sisa = (await ambilHapusSaatBuka()).filter((x) => x.situs !== item.situs);
        if (!item.browserDibuka) sisa.push({ situs: item.situs, mode: item.semua ? "semua" : "sesi" });
        await chrome.storage.local.set({ hapusSaatBuka: sisa });
        tampilkanBersih();
      })
    );
    const keluarkan = buatTombol(tr("lindung.hapusDaftar"), "", async () => {
      await hapusPerlindunganSitus(item.situs);
      pesan.textContent = tr("lindung.dikeluarkan", { s: item.situs });
      tampilkanBersih();
    });
    keluarkan.classList.add("kecil");
    kartu.append(atas, pil, keluarkan);
    wadah.append(kartu);
  }
}

// ulangPanel: dipakai saat bahasa diganti, supaya panel Lindungi yang terbuka ikut digambar ulang.
async function tampilkanBersih(ulangPanel) {
  const [daftarOto, daftarTab, terdeteksi, tab, terlindungi] = await Promise.all([
    ambilHapusSaatBuka(),
    ambilHapusSaatTabTutup(),
    cariSitusCookieLogin(),
    ambilTabAktif(),
    ambilSitusTerlindungi(),
  ]);
  const otomatis = new Set(daftarOto.map((x) => x.situs));
  const tabTutup = new Set(daftarTab);

  // 1. Situs di tab yang sedang dibuka, paling atas. Panel yang sedang terbuka tidak ditutup paksa.
  const kotakTab = document.getElementById("tabIniBersih");
  const panelTerbuka = kotakTab.querySelector(".panel-pilih:not([hidden])");
  if (!panelTerbuka || ulangPanel) {
    await tampilkanKartuTab(kotakTab, tab, terlindungi);
    if (panelTerbuka && tab) {
      const tombolBuka = document.getElementById("tombolLindungi");
      if (tombolBuka) tombolBuka.click();
    }
  }
  const lewati = tab ? tab.situs : null;

  // 2. Semua situs lain yang cookie login-nya terdeteksi.
  const wadahDeteksi = document.getElementById("daftarDeteksi");
  wadahDeteksi.textContent = "";
  const lain = terdeteksi.filter((x) => x.situs !== lewati);
  if (terdeteksi.length === 0) wadahDeteksi.append(buatKosong(tr("bersih.deteksiKosong")));
  for (const { situs, jumlah } of lain) {
    wadahDeteksi.append(barisSitusLogin(situs, jumlah, otomatis.has(situs), tabTutup.has(situs)));
  }

  // 3. Semua situs yang kamu lindungi, dengan pilihan kapan login dihapus.
  tampilkanDaftarLindungi(document.getElementById("daftarLindungi"), terlindungi);

  const hasil = await ambilHasilBersih();
  document.getElementById("statusBersih").textContent = hasil
    ? tr("bersih.status", { w: formatWaktu(hasil.waktu), n: hasil.jumlah })
    : tr("bersih.belum");
  document.getElementById("tombolBersihkanSekarang").disabled = daftarOto.length === 0;

  // Riwayat: bukti bahwa pembersihan otomatis benar-benar berjalan.
  const kotakRiwayat = document.getElementById("riwayatBersih");
  kotakRiwayat.textContent = "";
  const riwayat = await ambilRiwayatBersih();
  if (riwayat.length === 0) {
    kotakRiwayat.textContent = tr("bersih.riwayatKosong");
  } else {
    const judulRiwayat = document.createElement("div");
    judulRiwayat.textContent = tr("bersih.riwayat");
    kotakRiwayat.append(judulRiwayat);
    for (const r of riwayat.slice(0, 5)) {
      const baris = document.createElement("div");
      baris.textContent =
        "• " + formatWaktu(r.waktu) + " · " + tr("bersih.sumber." + r.sumber) + " · " + tr("bersih.cookieDihapus", { n: r.jumlah });
      kotakRiwayat.append(baris);
    }
  }
}

document.getElementById("tombolBersihkanSekarang").addEventListener("click", async () => {
  const daftar = await ambilHapusSaatBuka();
  if (daftar.length === 0) return;
  const peringatan = daftar.some((x) => x.mode === "semua") ? tr("bersih.konfSemua") : "";
  if (!confirm(tr("bersih.konf", { n: daftar.length }) + peringatan)) return;
  const jumlah = await bersihkanCookieTerpilih("manual");
  document.getElementById("pesanBersih").textContent = tr("bersih.hasil", { n: jumlah });
  tampilkanBersih();
});

document.getElementById("tombolDarurat").addEventListener("click", async () => {
  const terdeteksi = await daftarSitusDarurat();
  const pesan = document.getElementById("pesanBersih");
  if (terdeteksi.length === 0) {
    pesan.textContent = tr("darurat.kosong");
    return;
  }
  if (!confirm(tr("darurat.konf", { n: terdeteksi.length }))) return;
  const hasil = await keluarkanSemuaLogin();
  pesan.textContent = tr("darurat.hasil", { c: hasil.cookie, n: hasil.situs });
  tampilkanBersih();
});

// ---------- Kartu status pemantauan ----------

function barisStatus(baik, teks) {
  const baris = document.createElement("div");
  baris.className = "status-baris " + (baik ? "ok" : "awas");
  const tanda = document.createElement("span");
  tanda.className = "tanda";
  tanda.textContent = baik ? "✓" : "!";
  const isi = document.createElement("span");
  isi.textContent = teks;
  baris.append(tanda, isi);
  return baris;
}

async function tampilkanStatus() {
  const wadah = document.getElementById("barisStatus");
  const sekarang = Date.now();

  const [dilihat, terdeteksi, daftarOto, izinNotif] = await Promise.all([
    ambilCookieTerakhirDilihat(),
    cariSitusCookieLogin(),
    ambilHapusSaatBuka(),
    chrome.notifications.getPermissionLevel().catch(() => "granted"),
  ]);

  wadah.textContent = "";
  wadah.append(barisStatus(true, tr("status.aktif")));
  wadah.append(
    barisStatus(
      true,
      dilihat ? tr("status.cookieDilihat", { w: waktuSingkat(dilihat, sekarang) }) : tr("status.cookieBelum")
    )
  );

  const jumlahCookie = terdeteksi.reduce((total, x) => total + x.jumlah, 0);
  wadah.append(barisStatus(true, tr("status.login", { n: jumlahCookie, m: terdeteksi.length })));
  wadah.append(
    barisStatus(
      true,
      daftarOto.length > 0 ? tr("status.oto", { k: daftarOto.length }) : tr("status.otoMati")
    )
  );

  wadah.append(
    izinNotif === "denied"
      ? barisStatus(false, tr("status.notifBlokir"))
      : barisStatus(true, tr("status.notifOk"))
  );
}

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
  tampilkanStatus();
  tampilkanPeringatan();
  tampilkanEkstensi();
  tampilkanBersih(true);
  tampilkanDaftarPutih();
}

for (const tombol of document.querySelectorAll("[data-bahasa]")) {
  tombol.addEventListener("click", async () => {
    if (tombol.dataset.bahasa === bahasaAktif) return;
    await simpanBahasa(tombol.dataset.bahasa);
    // Pesan dan hasil pemindaian lama masih memakai bahasa sebelumnya, jadi dikosongkan.
    for (const id of ["pesanBersih", "pesanDaftarPutih", "hasilPindai"]) {
      document.getElementById(id).textContent = "";
    }
    renderSemua();
  });
}

// ---------- Jalankan saat popup dibuka ----------

muatBahasa().then(renderSemua);
