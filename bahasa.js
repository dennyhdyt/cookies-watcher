// ============================================================
// bahasa.js
// Kamus teks Indonesia (id) dan Inggris (en), plus pemilihan bahasa.
// Dimuat paling awal oleh background.js (importScripts) dan popup.html.
//
// Cara pakai:  tr("kunci")  atau  tr("kunci", { nama: "nilai" })
// Tanda {nama} di dalam teks diganti dengan nilai yang diberikan.
//
// Menambah bahasa baru: salin satu blok bahasa di bawah, terjemahkan isinya,
// lalu daftarkan kodenya di DAFTAR_BAHASA.
// ============================================================

const DAFTAR_BAHASA = ["id", "en"];
const LOCALE = { id: "id-ID", en: "en-US" };

let bahasaAktif = "id";

const KAMUS = {
  id: {
    // ----- Bagian tetap di popup.html -----
    "bahasa.label": "Bahasa",
    "tab.aria": "Bagian",
    "tab.peringatan": "Peringatan",
    "tab.pindai": "Pemindaian",
    "tab.ekstensi": "Ekstensi",
    "tab.login": "Login",
    "tab.pengaturan": "Pengaturan",
    "h.peringatan": "Peringatan",
    "btn.bersihkan": "Bersihkan semua peringatan",
    "tips.judul": "Kalau akunmu terasa dibajak:",
    "tips.isi": "menghapus cookie di sini saja tidak cukup. Segera ganti password dan pilih \"keluar dari semua perangkat\" di situs tersebut.",
    "pindai.judul": "Pemindaian cookies",
    "pindai.info": "Mencari domain yang meniru situs yang dipantau, domain yang perlu diperhatikan (alamat IP publik, domain internasional), dan cookies sesi dengan pengaturan keamanan lemah.",
    "pindai.tombol": "Pindai sekarang",
    "ekstensi.judul": "Ekstensi berizin cookies",
    "ekstensi.info": "Ekstensi lain yang bisa mengambil cookies atau melihat lalu lintas web. Nonaktifkan atau hapus yang tidak kamu kenal.",
    "login.judul": "Periksa aktivitas login",
    "login.info": "Satu-satunya cara melihat apakah akunmu dipakai di perangkat lain adalah lewat halaman di bawah. Cari perangkat atau lokasi yang tidak kamu kenal, lalu keluarkan dari sana.",
    "login.ingatkan": "Ingatkan saya setiap",
    "login.hari": "hari",
    "login.tesnotif": "Tes notifikasi",
    "set.dipantau": "Situs yang dipantau",
    "set.dipantau.info": "Peringatan hanya muncul untuk situs di daftar ini. Tautan aktivitas login boleh dikosongkan; isi kalau situsnya punya halaman perangkat yang sedang masuk.",
    "set.dipantau.situs": "situs, contoh: tokopedia.com",
    "set.dipantau.tautan": "tautan aktivitas login (opsional)",
    "btn.simpan": "Simpan",
    "set.nama": "Nama cookie sesi",
    "set.nama.info": "Cookie dengan nama ini dianggap cookie sesi login. Nama yang umum sudah termasuk. Pilih \"Semua situs\", atau satu situs saja kalau namanya khusus untuk situs itu.",
    "set.nama.input": "nama_cookie_sesi",
    "btn.tambah": "Tambah",
    "set.putih": "Daftar putih",
    "set.putih.info": "Situs di sini tidak akan memicu peringatan dan tidak muncul di hasil pemindaian.",
    "set.putih.input": "contoh: github.com",

    // ----- Peringatan -----
    "p.domMirip": "Domain mirip {d}: {x}",
    "p.domCuriga": "Domain mencurigakan: {d}",
    "p.kosong": "Belum ada peringatan. Bagus!",
    "p.hapusDom": "Hapus semua cookie domain ini",
    "p.konfDom": "Hapus semua cookie dari {s}?",
    "p.hapusCk": "Hapus cookie ini",
    "p.konfCk": "Hapus cookie '{n}' dari {s}? Kamu mungkin logout dari situs itu.",
    "p.percaya": "Percayai situs ini",
    "p.perhatian": "PERHATIAN: domain ini terlihat mencurigakan",
    "p.meniru": " (meniru {x})",
    "p.konfPercaya": "Percayai {s}? Peringatan dari situs ini tidak akan muncul lagi.",
    "p.keluarSemua": "Keluar dari semua perangkat",

    // ----- Pemindaian -----
    "r.httponly": "tanpa HttpOnly (bisa dibaca oleh skrip di halaman)",
    "r.secure": "tanpa Secure (bisa terkirim lewat koneksi tidak aman)",
    "r.samesite": "SameSite longgar (bisa terkirim dari situs lain)",
    "s.memindai": "Memindai...",
    "s.percayai": "Percayai",
    "s.konfPercaya": "Percayai {d}? Domain ini tidak akan ditandai lagi.",
    "s.isiMirip": "Domain ini {a}. Menyimpan {n} cookie.",
    "s.perlu": "Perlu diperhatikan: {d}",
    "s.tanda": "Tanda: {a}. Menyimpan {n} cookie.",
    "s.hapus": "Hapus",
    "s.konfCk": "Hapus cookie '{n}'? Kamu mungkin logout dari situs itu.",
    "s.kosong": "Tidak ada domain mencurigakan atau cookie sesi berisiko ditemukan.",

    // ----- Ekstensi -----
    "x.belumAktif": "Pemeriksaan ekstensi belum aktif. Fitur ini butuh izin tambahan untuk melihat daftar ekstensi lain. Izinnya bisa kamu cabut kapan saja.",
    "x.aktifkan": "Aktifkan pemeriksaan ekstensi",
    "x.ditolak": "Izin tidak diberikan, jadi pemeriksaan ekstensi tetap mati.",
    "x.memeriksa": "Memeriksa...",
    "x.gagalBaca": "Tidak bisa membaca daftar ekstensi.",
    "x.kosong": "Tidak ada ekstensi lain yang berizin cookies. Bagus!",
    "x.tinggi": "risiko tinggi",
    "x.sedang": "risiko sedang",
    "x.nonaktif": "Nonaktifkan",
    "x.gagalNonaktif": "Tidak bisa menonaktifkan ekstensi ini (mungkin diatur oleh administrator).",
    "x.hapusExt": "Hapus ekstensi",
    "x.konfPercaya": "Percayai '{n}'? Ekstensi ini tidak akan ditandai lagi.",
    "x.matikan": "Matikan pemeriksaan ekstensi",
    "x.tepercaya": "Ekstensi yang kamu percayai:",
    "x.keluarkan": "Keluarkan",
    "e.semua": "bisa membaca dan mengubah cookies di SEMUA situs",
    "e.tertentu": "punya izin cookies (untuk situs tertentu)",
    "e.lalulintas": "bisa melihat semua lalu lintas web, termasuk cookie yang terkirim",

    // ----- Login, pengingat, notifikasi -----
    "l.dicek": "terakhir dicek: {w}",
    "l.buka": "Buka",
    "l.sudah": "Sudah dicek",
    "l.tanpaTautan": "Belum punya tautan aktivitas login: {l}. Kamu bisa menambahkannya di bagian 'Situs yang dipantau'.",
    "l.pengingatAktif": "Pengingat aktif: setiap {h} hari.",
    "l.pengingatMati": "Pengingat dimatikan.",
    "n.judul": "Tes notifikasi berhasil",
    "n.isi": "Notifikasi Pemantau Cookies berfungsi. Peringatan dan pengingat akan muncul seperti ini.",
    "n.gagal": "Gagal menampilkan notifikasi: {e}",
    "n.terkirim": "Notifikasi dikirim. Kalau tidak terlihat, periksa pengaturan notifikasi di sistem operasi dan browser kamu.",
    "waktu.belum": "belum pernah",
    "waktu.hariIni": "hari ini",
    "waktu.kemarin": "kemarin",
    "waktu.hariLalu": "{n} hari lalu",

    // ----- Situs yang dipantau -----
    "d.bawaan": "bawaan",
    "d.bawaanTanpa": "bawaan, tanpa tautan aktivitas login",
    "d.ada": "ada tautan aktivitas login",
    "d.tanpa": "tanpa tautan aktivitas login",
    "d.hapus": "Hapus",
    "d.formatSitus": "Format situs tidak valid. Contoh yang benar: tokopedia.com",
    "d.formatTautan": "Tautan harus berupa alamat lengkap yang diawali https://",
    "d.konfHost": "Tautan ini mengarah ke {h}, bukan {s}. Tetap simpan? Pastikan kamu benar-benar mempercayainya.",
    "d.sudahAda": "{s} sudah ada di daftar.",
    "d.tautanUpdate": "Tautan untuk {s} diperbarui.",
    "d.ditambah": "{s} ditambahkan.",
    "d.ditambahTautan": "{s} ditambahkan beserta tautannya.",

    // ----- Nama cookie sesi -----
    "c.semuaSitus": "Semua situs",
    "c.chipSemua": "semua situs",
    "c.chipHanya": "hanya {s}",
    "c.kosong": "Belum ada nama tambahan.",
    "c.tidakValid": "Nama tidak valid. Pakai huruf, angka, _ . atau - (maksimal 60 karakter).",
    "c.bawaan": "{n} sudah termasuk bawaan.",
    "c.sudahSemua": "{n} sudah berlaku untuk semua situs.",
    "c.tambahSemua": "{n} ditambahkan untuk semua situs.",
    "c.sudahUntuk": "{n} sudah ada untuk {s}.",
    "c.tambahSaja": "{n} ditambahkan untuk {s} saja.",

    // ----- Tab Bersihkan: hapus cookie login situs yang dikunjungi -----
    "tab.bersih": "Bersihkan",
    "bersih.judul": "Bersihkan cookie login",
    "bersih.info": "Situs yang kamu kunjungi dan punya cookie login muncul otomatis di sini. Tambahkan ke daftar supaya cookie login-nya dihapus setiap browser dibuka, atau hapus langsung sekarang. Cookie lain (tema, bahasa) tidak disentuh. Penghapusan otomatis terjadi saat browser dibuka, bukan saat ditutup.",
    "bersih.tabIni": "Tab ini",
    "bersih.tabIniKosong": "Tab ini ({s}) belum punya cookie login yang dikenali.",
    "bersih.deteksiJudul": "Cookie login terdeteksi",
    "bersih.deteksiKosong": "Belum ada cookie login yang terdeteksi di browser ini.",
    "bersih.otoJudul": "Dibersihkan otomatis saat browser dibuka",
    "bersih.mode.sesi": "Cookie sesi login saja",
    "bersih.mode.semua": "Semua cookie situs",
    "bersih.cookieN": "{n} cookie login",
    "bersih.tambah": "Tambahkan",
    "bersih.otomatis": "Otomatis",
    "bersih.hapusSekarang": "Hapus sekarang",
    "bersih.kosong": "Belum ada situs. Fitur otomatis ini mati sampai kamu menambahkan situs.",
    "bersih.status": "Terakhir dibersihkan: {w} ({n} cookie).",
    "bersih.belum": "Belum pernah dibersihkan.",
    "bersih.riwayat": "Riwayat pembersihan:",
    "bersih.riwayatKosong": "Belum ada catatan. Setelah kamu menutup semua jendela browser lalu membukanya lagi, catatannya muncul di sini.",
    "bersih.sumber.startup": "browser dibuka",
    "bersih.sumber.jendela": "jendela dibuka kembali",
    "bersih.sumber.manual": "manual",
    "bersih.cookieDihapus": "{n} cookie dihapus",
    "bersih.sekarang": "Bersihkan semua sekarang",
    "bersih.konf": "Hapus cookie dari {n} situs sekarang? Kamu akan logout dari situs itu.",
    "bersih.konfSemua": " Mode \"Semua cookie\" juga menghapus tema, bahasa, dan pengaturan situs.",
    "bersih.konfSatu": "Hapus {n} cookie login dari {s} sekarang? Kamu akan logout dari situs itu.",
    "bersih.hasil": "Selesai: {n} cookie dihapus.",
    "bersih.hasilSatu": "{s}: {n} cookie dihapus.",
    "bersih.ditambah": "{s} akan dibersihkan setiap browser dibuka.",

    // ----- Daftar putih -----
    "w.kosong": "Belum ada situs di daftar putih.",
    "w.format": "Format tidak valid. Contoh yang benar: github.com",
    "w.ditambah": "{s} ditambahkan ke daftar putih.",
    "w.keluarkan": "Keluarkan",

    // ----- Alasan domain mirip / perlu diperhatikan (umum.js) -----
    "a.ip": "alamat IP publik, bukan nama situs (situs resmi jarang memakai IP untuk login)",
    "a.punycode": "domain internasional (punycode), terbaca sebagai '{t}'. Pastikan kamu mengenalnya",
    "m.homograf": "memakai huruf non-Latin yang menyerupai nama '{m}' (serangan homograf)",
    "m.campuran": "mencampur huruf Latin dengan huruf Kiril/Yunani dalam satu nama (ciri serangan homograf)",
    "m.alamat": "memuat alamat '{s}' tetapi bukan milik situs itu",
    "m.subdomain": "memakai nama '{m}' sebagai subdomain dari domain lain",
    "m.akhiran": "memakai nama persis '{m}' di akhiran .{a} yang sering disalahgunakan",
    "m.leet": "memakai angka/simbol untuk meniru nama '{m}'",
    "m.mirip": "namanya nyaris sama dengan '{m}'",
    "m.pancing": "memuat nama '{m}' dengan kata seperti login/verify",

    // ----- Notifikasi dan peringatan dari latar belakang (background.js) -----
    "b.sesi.alasan": "Cookie sesi berubah padahal kamu tidak sedang membuka {s}",
    "b.sesi.judul": "Cookie mencurigakan: {s}",
    "b.sesi.isi": "Cookie sesi '{n}' berubah tanpa kamu membuka situs ini. Buka ekstensi untuk memeriksa.",
    "b.dom.alasan": "Domain ini {a} (kemungkinan situs tiruan)",
    "b.dom.isi": "Domain ini {a} dan baru menyimpan cookie. Buka ekstensi untuk memeriksa.",
    "b.ext.tinggi": "Ekstensi berisiko tinggi terdeteksi",
    "b.ext.sedang": "Ekstensi berizin cookies terdeteksi",
    "b.ext.isi": "{n}: {a}. Buka Pemantau Cookies untuk memeriksanya.",
    "b.ingat.judul": "Waktunya cek aktivitas login",
    "b.ingat.lainnya": " dan {n} lainnya",
    "b.ingat.isi": "Belum kamu cek dalam {h} hari: {t}. Buka Pemantau Cookies, bagian 'Periksa aktivitas login'.",
  },

  en: {
    // ----- Static parts of popup.html -----
    "bahasa.label": "Language",
    "tab.aria": "Sections",
    "tab.peringatan": "Alerts",
    "tab.pindai": "Scan",
    "tab.ekstensi": "Extensions",
    "tab.login": "Login",
    "tab.pengaturan": "Settings",
    "h.peringatan": "Alerts",
    "btn.bersihkan": "Clear all alerts",
    "tips.judul": "If you think your account was hijacked:",
    "tips.isi": "deleting cookies here is not enough. Change your password right away and choose \"sign out of all devices\" on that site.",
    "pindai.judul": "Cookie scan",
    "pindai.info": "Looks for domains imitating the monitored sites, domains worth a look (public IP addresses, international domains), and session cookies with weak security settings.",
    "pindai.tombol": "Scan now",
    "ekstensi.judul": "Extensions with cookie access",
    "ekstensi.info": "Other extensions that can take your cookies or see web traffic. Disable or remove any you do not recognize.",
    "login.judul": "Check login activity",
    "login.info": "The only way to see whether your account is being used on another device is the page below. Look for devices or locations you do not recognize, then sign them out.",
    "login.ingatkan": "Remind me every",
    "login.hari": "days",
    "login.tesnotif": "Test notification",
    "set.dipantau": "Monitored sites",
    "set.dipantau.info": "Alerts only appear for sites in this list. The login activity link can be left empty; fill it in if the site has a page showing signed-in devices.",
    "set.dipantau.situs": "site, e.g. tokopedia.com",
    "set.dipantau.tautan": "login activity link (optional)",
    "btn.simpan": "Save",
    "set.nama": "Session cookie names",
    "set.nama.info": "Cookies with these names are treated as login session cookies. Common names are already included. Choose \"All sites\", or a single site if the name is specific to it.",
    "set.nama.input": "session_cookie_name",
    "btn.tambah": "Add",
    "set.putih": "Allowlist",
    "set.putih.info": "Sites here will not trigger alerts and will not show up in scan results.",
    "set.putih.input": "e.g. github.com",

    // ----- Alerts -----
    "p.domMirip": "Domain similar to {d}: {x}",
    "p.domCuriga": "Suspicious domain: {d}",
    "p.kosong": "No alerts. All good!",
    "p.hapusDom": "Delete all cookies of this domain",
    "p.konfDom": "Delete all cookies from {s}?",
    "p.hapusCk": "Delete this cookie",
    "p.konfCk": "Delete cookie '{n}' from {s}? You may be logged out of that site.",
    "p.percaya": "Trust this site",
    "p.perhatian": "WARNING: this domain looks suspicious",
    "p.meniru": " (imitating {x})",
    "p.konfPercaya": "Trust {s}? Alerts from this site will no longer appear.",
    "p.keluarSemua": "Sign out of all devices",

    // ----- Scan -----
    "r.httponly": "no HttpOnly (can be read by scripts on the page)",
    "r.secure": "no Secure flag (can be sent over an insecure connection)",
    "r.samesite": "loose SameSite (can be sent from other sites)",
    "s.memindai": "Scanning...",
    "s.percayai": "Trust",
    "s.konfPercaya": "Trust {d}? This domain will no longer be flagged.",
    "s.isiMirip": "This domain {a}. Stores {n} cookies.",
    "s.perlu": "Worth a look: {d}",
    "s.tanda": "Sign: {a}. Stores {n} cookies.",
    "s.hapus": "Delete",
    "s.konfCk": "Delete cookie '{n}'? You may be logged out of that site.",
    "s.kosong": "No suspicious domains or risky session cookies found.",

    // ----- Extensions -----
    "x.belumAktif": "Extension checking is not active yet. This feature needs an extra permission to see the list of other extensions. You can revoke it at any time.",
    "x.aktifkan": "Turn on extension checking",
    "x.ditolak": "Permission was not granted, so extension checking stays off.",
    "x.memeriksa": "Checking...",
    "x.gagalBaca": "Could not read the extension list.",
    "x.kosong": "No other extensions have cookie access. All good!",
    "x.tinggi": "high risk",
    "x.sedang": "medium risk",
    "x.nonaktif": "Disable",
    "x.gagalNonaktif": "Cannot disable this extension (it may be managed by an administrator).",
    "x.hapusExt": "Remove extension",
    "x.konfPercaya": "Trust '{n}'? This extension will no longer be flagged.",
    "x.matikan": "Turn off extension checking",
    "x.tepercaya": "Extensions you trust:",
    "x.keluarkan": "Remove",
    "e.semua": "can read and change cookies on ALL sites",
    "e.tertentu": "has cookie permission (for specific sites)",
    "e.lalulintas": "can see all web traffic, including cookies being sent",

    // ----- Login, reminders, notifications -----
    "l.dicek": "last checked: {w}",
    "l.buka": "Open",
    "l.sudah": "Mark as checked",
    "l.tanpaTautan": "No login activity link yet: {l}. You can add one under 'Monitored sites'.",
    "l.pengingatAktif": "Reminder on: every {h} days.",
    "l.pengingatMati": "Reminder turned off.",
    "n.judul": "Notification test succeeded",
    "n.isi": "Pemantau Cookies notifications work. Alerts and reminders will appear like this.",
    "n.gagal": "Failed to show notification: {e}",
    "n.terkirim": "Notification sent. If you do not see it, check the notification settings of your operating system and browser.",
    "waktu.belum": "never",
    "waktu.hariIni": "today",
    "waktu.kemarin": "yesterday",
    "waktu.hariLalu": "{n} days ago",

    // ----- Monitored sites -----
    "d.bawaan": "built-in",
    "d.bawaanTanpa": "built-in, no login activity link",
    "d.ada": "has login activity link",
    "d.tanpa": "no login activity link",
    "d.hapus": "Delete",
    "d.formatSitus": "Invalid site format. Valid example: tokopedia.com",
    "d.formatTautan": "The link must be a full address starting with https://",
    "d.konfHost": "This link points to {h}, not {s}. Save anyway? Make sure you really trust it.",
    "d.sudahAda": "{s} is already in the list.",
    "d.tautanUpdate": "Link for {s} updated.",
    "d.ditambah": "{s} added.",
    "d.ditambahTautan": "{s} added together with its link.",

    // ----- Session cookie names -----
    "c.semuaSitus": "All sites",
    "c.chipSemua": "all sites",
    "c.chipHanya": "only {s}",
    "c.kosong": "No extra names yet.",
    "c.tidakValid": "Invalid name. Use letters, digits, _ . or - (max 60 characters).",
    "c.bawaan": "{n} is already built in.",
    "c.sudahSemua": "{n} already applies to all sites.",
    "c.tambahSemua": "{n} added for all sites.",
    "c.sudahUntuk": "{n} already exists for {s}.",
    "c.tambahSaja": "{n} added for {s} only.",

    // ----- Cleanup tab: delete login cookies of visited sites -----
    "tab.bersih": "Cleanup",
    "bersih.judul": "Clean up login cookies",
    "bersih.info": "Sites you visit that have login cookies show up here automatically. Add one to the list so its login cookies are deleted every time the browser opens, or delete them right now. Other cookies (themes, language) are not touched. Automatic deletion happens when the browser opens, not when it closes.",
    "bersih.tabIni": "This tab",
    "bersih.tabIniKosong": "This tab ({s}) has no recognized login cookies yet.",
    "bersih.deteksiJudul": "Login cookies detected",
    "bersih.deteksiKosong": "No login cookies detected in this browser yet.",
    "bersih.otoJudul": "Cleaned automatically when the browser opens",
    "bersih.mode.sesi": "Login session cookies only",
    "bersih.mode.semua": "All cookies of the site",
    "bersih.cookieN": "{n} login cookies",
    "bersih.tambah": "Add",
    "bersih.otomatis": "Automatic",
    "bersih.hapusSekarang": "Delete now",
    "bersih.kosong": "No sites yet. This automatic feature stays off until you add a site.",
    "bersih.status": "Last cleaned: {w} ({n} cookies).",
    "bersih.belum": "Never cleaned yet.",
    "bersih.riwayat": "Cleanup history:",
    "bersih.riwayatKosong": "No records yet. After you close all browser windows and open the browser again, the record shows up here.",
    "bersih.sumber.startup": "browser opened",
    "bersih.sumber.jendela": "window reopened",
    "bersih.sumber.manual": "manual",
    "bersih.cookieDihapus": "{n} cookies deleted",
    "bersih.sekarang": "Clean all now",
    "bersih.konf": "Delete cookies of {n} site(s) now? You will be signed out of those sites.",
    "bersih.konfSemua": " \"All cookies\" mode also deletes themes, language, and site settings.",
    "bersih.konfSatu": "Delete {n} login cookies from {s} now? You will be signed out of that site.",
    "bersih.hasil": "Done: {n} cookies deleted.",
    "bersih.hasilSatu": "{s}: {n} cookies deleted.",
    "bersih.ditambah": "{s} will be cleaned every time the browser opens.",

    // ----- Allowlist -----
    "w.kosong": "No sites in the allowlist yet.",
    "w.format": "Invalid format. Valid example: github.com",
    "w.ditambah": "{s} added to the allowlist.",
    "w.keluarkan": "Remove",

    // ----- Reasons for lookalike / worth-a-look domains (umum.js) -----
    "a.ip": "public IP address instead of a site name (legitimate sites rarely use an IP for login)",
    "a.punycode": "internationalized domain (punycode), reads as '{t}'. Make sure you recognize it",
    "m.homograf": "uses non-Latin letters that look like the name '{m}' (homograph attack)",
    "m.campuran": "mixes Latin letters with Cyrillic/Greek letters in one name (a sign of a homograph attack)",
    "m.alamat": "contains the address '{s}' but does not belong to that site",
    "m.subdomain": "uses the name '{m}' as a subdomain of another domain",
    "m.akhiran": "uses the exact name '{m}' under the .{a} ending, which is often abused",
    "m.leet": "uses digits/symbols to imitate the name '{m}'",
    "m.mirip": "has a name almost identical to '{m}'",
    "m.pancing": "contains the name '{m}' with words like login/verify",

    // ----- Notifications and alerts from the background script (background.js) -----
    "b.sesi.alasan": "Session cookie changed while you did not have {s} open",
    "b.sesi.judul": "Suspicious cookie: {s}",
    "b.sesi.isi": "Session cookie '{n}' changed without you having this site open. Open the extension to check.",
    "b.dom.alasan": "This domain {a} (possibly a fake site)",
    "b.dom.isi": "This domain {a} and just stored a cookie. Open the extension to check.",
    "b.ext.tinggi": "High-risk extension detected",
    "b.ext.sedang": "Extension with cookie access detected",
    "b.ext.isi": "{n}: {a}. Open Pemantau Cookies to review it.",
    "b.ingat.judul": "Time to check login activity",
    "b.ingat.lainnya": " and {n} more",
    "b.ingat.isi": "Not checked in {h} days: {t}. Open Pemantau Cookies, 'Check login activity' section.",
  },
};

// Mengambil teks sesuai bahasa aktif. Kalau kunci tidak ada di bahasa itu,
// dipakai bahasa Indonesia; kalau tetap tidak ada, kuncinya sendiri yang tampil.
function tr(kunci, nilai) {
  let teks = (KAMUS[bahasaAktif] && KAMUS[bahasaAktif][kunci]) || KAMUS.id[kunci] || kunci;
  if (nilai) {
    teks = teks.replace(/\{(\w+)\}/g, (asli, nama) => (nama in nilai ? String(nilai[nama]) : asli));
  }
  return teks;
}

// Format tanggal sesuai bahasa aktif.
function formatWaktu(waktu) {
  return new Date(waktu).toLocaleString(LOCALE[bahasaAktif] || LOCALE.id);
}

function bahasaValid(kode) {
  return DAFTAR_BAHASA.includes(kode);
}

// Membaca pilihan bahasa dari penyimpanan. Bawaan: Indonesia.
async function muatBahasa() {
  try {
    const data = await chrome.storage.local.get("bahasa");
    bahasaAktif = bahasaValid(data.bahasa) ? data.bahasa : "id";
  } catch (e) {
    bahasaAktif = "id";
  }
  return bahasaAktif;
}

async function simpanBahasa(kode) {
  if (!bahasaValid(kode)) return;
  bahasaAktif = kode;
  await chrome.storage.local.set({ bahasa: kode });
}

// Kalau bahasa diganti dari bagian lain (misalnya popup), latar belakang ikut tahu.
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((perubahan, area) => {
    if (area === "local" && perubahan.bahasa && bahasaValid(perubahan.bahasa.newValue)) {
      bahasaAktif = perubahan.bahasa.newValue;
    }
  });
}
