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
    "x.kosong": "Tidak ada ekstensi lain yang mencurigakan (izin cookies, lalu lintas web, dipasang program lain, atau jembatan ke aplikasi). Bagus!",
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
    "e.sideload": "dipasang oleh program lain di komputermu (bukan dari toko resmi, bukan lewat kamu)",
    "e.admin": "dipasang lewat kebijakan sistem (registry/Group Policy), bukan olehmu",
    "e.native": "bisa berkomunikasi dengan program di komputermu (nativeMessaging)",

    // ----- Login, pengingat, notifikasi -----
    "waktu.belum": "belum pernah",
    "waktu.hariIni": "hari ini",
    "waktu.kemarin": "kemarin",
    "waktu.hariLalu": "{n} hari lalu",
    "waktu.baru": "baru saja",
    "waktu.menit": "{n} menit lalu",
    "waktu.jam": "{n} jam lalu",
    "status.judul": "Status pemantauan",
    "status.aktif": "Pemantauan aktif",
    "status.cookieDilihat": "Terakhir melihat perubahan cookie: {w}",
    "status.cookieBelum": "Belum ada perubahan cookie yang terlihat sejak ekstensi dimulai. Itu wajar kalau tidak ada situs yang mengubah cookie.",
    "status.login": "Cookie login terdeteksi: {n} di {m} situs",
    "status.oto": "Pembersihan otomatis: {k} situs",
    "status.otoMati": "Pembersihan otomatis: mati",
    "status.notifOk": "Notifikasi diizinkan",
    "status.notifBlokir": "Notifikasi diblokir, jadi peringatan hanya terlihat di popup dan di ikon. Izinkan notifikasi di pengaturan browser dan sistem operasi.",

    // ----- Situs yang dipantau -----

    // ----- Nama cookie sesi -----

    // ----- Tab Bersihkan: hapus cookie login situs yang dikunjungi -----
    "tab.bersih": "Bersihkan",
    "bersih.judul": "Bersihkan cookie login",
    "bersih.info": "Situs yang kamu kunjungi dan punya cookie login muncul otomatis di sini. Tambahkan ke daftar supaya cookie login-nya dihapus setiap browser dibuka, atau hapus langsung sekarang. Cookie lain (tema, bahasa) tidak disentuh. Penghapusan otomatis bisa dipilih: saat browser dibuka, atau saat tab situsnya ditutup.",
    "bersih.tabIni": "Tab ini",
    "bersih.deteksiJudul": "Cookie login terdeteksi",
    "bersih.deteksiKosong": "Belum ada cookie login yang terdeteksi di browser ini.",
    "bersih.cookieN": "{n} cookie login",
    "bersih.tambah": "Tambahkan",
    "bersih.otomatis": "Otomatis",
    "bersih.hapusSekarang": "Hapus sekarang",
    "bersih.status": "Terakhir dibersihkan: {w} ({n} cookie).",
    "bersih.belum": "Belum pernah dibersihkan.",
    "bersih.riwayat": "Riwayat pembersihan:",
    "bersih.riwayatKosong": "Belum ada catatan. Setelah kamu menutup semua jendela browser lalu membukanya lagi, catatannya muncul di sini.",
    "bersih.sumber.startup": "browser dibuka",
    "bersih.sumber.jendela": "jendela dibuka kembali",
    "bersih.sumber.manual": "manual",
    "lindung.judul": "Situs terlindungi",
    "lindung.info": "Satu tempat untuk semua situs. Nyalakan kapan login dihapus untuk tiap situs. Kalau seluruh browser ditutup sekaligus, penghapusan saat tab ditutup bisa tidak sempat berjalan; nyalakan juga \"saat browser dibuka\" supaya pasti.",
    "lindung.kosong": "Belum ada situs yang dilindungi. Buka situsnya, lalu klik \"Lindungi situs ini\" di atas.",
    "lindung.subSemua": "Semua cookie situs",
    "lindung.subNama": "{n} cookie login dipilih",
    "lindung.subOtomatis": "Cookie login dikenali otomatis",
    "lindung.subData": "data penyimpanan ikut dihapus",
    "lindung.pilTab": "Saat tab ditutup",
    "lindung.pilBuka": "Saat browser dibuka",
    "lindung.nyala": "nyala",
    "lindung.mati": "mati",
    "lindung.hapusDaftar": "Hapus dari daftar",
    "lindung.konfSekarang": "Hapus login {s} sekarang? Kamu mungkin keluar dari situs itu.",
    "lindung.dikeluarkan": "{s} dikeluarkan dari daftar perlindungan.",
    "tabIni.terbaca": "Terbaca dari tab yang sedang kamu buka",
    "tabIni.belum": "Belum dilindungi",
    "tabIni.sudah": "Dilindungi",
    "tabIni.tombol": "Lindungi situs ini",
    "tabIni.atur": "Atur perlindungan",
    "pilih.judul": "Pilih cookie login untuk {s}",
    "pilih.info": "Centang cookie yang menyimpan login. Yang kami sarankan sudah tercentang. Hanya NAMA cookie yang ditampilkan, isinya tidak pernah dibaca.",
    "pilih.dikenal": "Nama login yang dikenal",
    "pilih.mirip": "Nama mirip cookie login (sesi, token, dll.)",
    "pilih.pelacak": "Terlihat seperti pelacak, bukan login",
    "pilih.kosongCookie": "Situs ini belum menaruh cookie di browsermu.",
    "pilih.tidakAdaJudul": "Login situs ini tidak terlihat di cookie",
    "pilih.tidakAdaIsi": "Tidak ada cookie yang tampak seperti cookie login. Situs seperti ini sering menyimpan login di penyimpanan lokal browser (localStorage). Di bawah kamu bisa melihat NAMA data penyimpanannya dan memilih mana yang dihapus.",
    "kunci.judul": "Data penyimpanan situs (localStorage)",
    "kunci.info": "Hanya NAMA yang dibaca, isinya tidak. Yang tercentang dihapus lewat tombol Hapus sekarang atau tombol darurat, selama tab situsnya terbuka (muat ulang tab setelahnya). Untuk hapus otomatis saat tab ditutup, pakai opsi hapus SEMUA data penyimpanan di bawah.",
    "kunci.tombolIzin": "Tampilkan nama data penyimpanan (butuh izin)",
    "kunci.catatanIzin": "Chrome akan menampilkan kotak izin dan popup ini bisa tertutup. Pilih Izinkan, lalu buka popup lagi dan tekan Lindungi situs ini; daftar nama akan langsung muncul.",
    "kunci.ditolak": "Izin ditolak, jadi nama data penyimpanan tidak bisa ditampilkan.",
    "kunci.kosong": "Tab ini tidak menyimpan data di localStorage.",
    "kunci.mirip": "Nama mirip data login (sesi, token, dll.)",
    "kunci.pelacak": "Terlihat seperti pelacak, bukan login",
    "lindung.subKunci": "{n} kunci penyimpanan dipilih",
    "pilih.kapan": "Kapan login dihapus?",
    "pilih.tab": "Saat tab situs ini ditutup",
    "pilih.buka": "Saat browser dibuka kembali",
    "pilih.semua": "Hapus SEMUA cookie situs (bukan hanya yang dipilih)",
    "pilih.data": "Hapus SEMUA data penyimpanan situs (localStorage) di {o} secara otomatis. Butuh izin tambahan; hanya menghapus, tidak membaca. Riwayat penelusuran tidak disentuh.",
    "pilih.simpan": "Lindungi situs ini",
    "pilih.batal": "Batal",
    "pilih.kosongPilihan": "Pilih minimal satu cookie, atau nyalakan opsi hapus semua cookie / data penyimpanan.",
    "pilih.izinDitolak": "Izin tambahan ditolak, jadi data penyimpanan tidak akan dihapus. Pilihan lainnya tetap disimpan.",
    "pilih.tersimpan": "{s} sekarang dilindungi.",
    "bersih.sumber.tab": "tab ditutup",
    "bersih.sumber.darurat": "tombol darurat",
    "darurat.tombol": "Keluarkan semua login sekarang",
    "darurat.info": "Menghapus cookie login dari semua situs yang terdeteksi di browser ini. Pakai saat curiga akun dibajak atau komputer dipakai orang lain. Ini hanya mengeluarkan login di browser ini; login di perangkat lain tetap ada, jadi ganti password dan pilih \"keluar dari semua perangkat\" di situsnya.",
    "darurat.konf": "Keluar dari {n} situs sekarang? Semua cookie login yang terdeteksi akan dihapus.",
    "darurat.kosong": "Tidak ada cookie login yang terdeteksi, jadi tidak ada yang dihapus.",
    "darurat.hasil": "Selesai: {c} cookie login dari {n} situs dihapus. Kamu sudah keluar dari situs-situs itu di browser ini.",
    "tabTutup.tambah": "Saat tab ditutup",
    "tabTutup.aktif": "Tab tutup ✓",
    "tabTutup.ditambah": "{s}: cookie login dihapus saat tab-nya ditutup.",
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
  },

  en: {
    // ----- Static parts of popup.html -----
    "bahasa.label": "Language",
    "tab.aria": "Sections",
    "tab.peringatan": "Alerts",
    "tab.pindai": "Scan",
    "tab.ekstensi": "Extensions",
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
    "x.kosong": "No other suspicious extensions (cookie access, web traffic, installed by another program, or bridge to desktop apps). All good!",
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
    "e.sideload": "installed by another program on your computer (not from the official store, not by you)",
    "e.admin": "installed through a system policy (registry/Group Policy), not by you",
    "e.native": "can communicate with programs on your computer (nativeMessaging)",

    // ----- Login, reminders, notifications -----
    "waktu.belum": "never",
    "waktu.hariIni": "today",
    "waktu.kemarin": "yesterday",
    "waktu.hariLalu": "{n} days ago",
    "waktu.baru": "just now",
    "waktu.menit": "{n} min ago",
    "waktu.jam": "{n} h ago",
    "status.judul": "Monitoring status",
    "status.aktif": "Monitoring is on",
    "status.cookieDilihat": "Last cookie change seen: {w}",
    "status.cookieBelum": "No cookie change seen since the extension started. That is normal if no site changed a cookie.",
    "status.login": "Login cookies detected: {n} across {m} site(s)",
    "status.oto": "Automatic cleanup: {k} site(s)",
    "status.otoMati": "Automatic cleanup: off",
    "status.notifOk": "Notifications allowed",
    "status.notifBlokir": "Notifications are blocked, so alerts only show in the popup and on the icon. Allow notifications in your browser and operating system settings.",

    // ----- Monitored sites -----

    // ----- Session cookie names -----

    // ----- Cleanup tab: delete login cookies of visited sites -----
    "tab.bersih": "Cleanup",
    "bersih.judul": "Clean up login cookies",
    "bersih.info": "Sites you visit that have login cookies show up here automatically. Add one to the list so its login cookies are deleted every time the browser opens, or delete them right now. Other cookies (themes, language) are not touched. Automatic deletion can be chosen: when the browser opens, or when the site's tab is closed.",
    "bersih.tabIni": "This tab",
    "bersih.deteksiJudul": "Login cookies detected",
    "bersih.deteksiKosong": "No login cookies detected in this browser yet.",
    "bersih.cookieN": "{n} login cookies",
    "bersih.tambah": "Add",
    "bersih.otomatis": "Automatic",
    "bersih.hapusSekarang": "Delete now",
    "bersih.status": "Last cleaned: {w} ({n} cookies).",
    "bersih.belum": "Never cleaned yet.",
    "bersih.riwayat": "Cleanup history:",
    "bersih.riwayatKosong": "No records yet. After you close all browser windows and open the browser again, the record shows up here.",
    "bersih.sumber.startup": "browser opened",
    "bersih.sumber.jendela": "window reopened",
    "bersih.sumber.manual": "manual",
    "lindung.judul": "Protected sites",
    "lindung.info": "One place for every site. Choose when each site's login is deleted. If the whole browser closes at once, the on-tab-close deletion may not get to run; also turn on \"when the browser opens\" to be sure.",
    "lindung.kosong": "No protected sites yet. Open the site, then click \"Protect this site\" above.",
    "lindung.subSemua": "All cookies of the site",
    "lindung.subNama": "{n} login cookie(s) chosen",
    "lindung.subOtomatis": "Login cookies recognized automatically",
    "lindung.subData": "site storage is deleted too",
    "lindung.pilTab": "On tab close",
    "lindung.pilBuka": "When the browser opens",
    "lindung.nyala": "on",
    "lindung.mati": "off",
    "lindung.hapusDaftar": "Remove from list",
    "lindung.konfSekarang": "Delete the login of {s} now? You may be signed out of that site.",
    "lindung.dikeluarkan": "{s} was removed from protection.",
    "tabIni.terbaca": "Read from the tab you are viewing",
    "tabIni.belum": "Not protected",
    "tabIni.sudah": "Protected",
    "tabIni.tombol": "Protect this site",
    "tabIni.atur": "Manage protection",
    "pilih.judul": "Choose login cookies for {s}",
    "pilih.info": "Tick the cookies that hold the login. Suggested ones are already ticked. Only cookie NAMES are shown; their contents are never read.",
    "pilih.dikenal": "Known login name",
    "pilih.mirip": "Looks like a login cookie (session, token, etc.)",
    "pilih.pelacak": "Looks like a tracker, not a login",
    "pilih.kosongCookie": "This site has not set any cookies in your browser.",
    "pilih.tidakAdaJudul": "This site's login is not visible in cookies",
    "pilih.tidakAdaIsi": "No cookie looks like a login cookie. Sites like this often keep the login in the browser's local storage (localStorage). Below you can see the NAMES of its stored data and choose which to delete.",
    "kunci.judul": "Site storage (localStorage)",
    "kunci.info": "Only NAMES are read, never the contents. Ticked items are deleted by the Delete now button or the emergency button, while the site's tab is open (reload the tab afterwards). For automatic deletion when the tab closes, use the delete ALL site storage option below.",
    "kunci.tombolIzin": "Show storage names (needs permission)",
    "kunci.catatanIzin": "Chrome will show a permission prompt and this popup may close. Choose Allow, then open the popup again and press Protect this site; the names will appear right away.",
    "kunci.ditolak": "Permission denied, so storage names cannot be shown.",
    "kunci.kosong": "This tab keeps no data in localStorage.",
    "kunci.mirip": "Name looks like login data (session, token, etc.)",
    "kunci.pelacak": "Looks like a tracker, not a login",
    "lindung.subKunci": "{n} storage keys chosen",
    "pilih.kapan": "When is the login deleted?",
    "pilih.tab": "When this site's tab is closed",
    "pilih.buka": "When the browser opens again",
    "pilih.semua": "Delete ALL cookies of the site (not only the chosen ones)",
    "pilih.data": "Automatically delete ALL of the site's storage (localStorage) at {o}. Needs an extra permission; it only deletes and never reads. Browsing history is not touched.",
    "pilih.simpan": "Protect this site",
    "pilih.batal": "Cancel",
    "pilih.kosongPilihan": "Choose at least one cookie, or turn on delete-all-cookies / site storage.",
    "pilih.izinDitolak": "The extra permission was denied, so site storage will not be deleted. Your other choices were saved.",
    "pilih.tersimpan": "{s} is now protected.",
    "bersih.sumber.tab": "tab closed",
    "bersih.sumber.darurat": "emergency button",
    "darurat.tombol": "Sign out of everything now",
    "darurat.info": "Deletes the login cookies of every site detected in this browser. Use it when you suspect an account was hijacked or someone else used your computer. This only signs you out in this browser; logins on other devices stay active, so change your password and choose \"sign out of all devices\" on the site.",
    "darurat.konf": "Sign out of {n} site(s) now? All detected login cookies will be deleted.",
    "darurat.kosong": "No login cookies detected, so nothing was deleted.",
    "darurat.hasil": "Done: {c} login cookies from {n} site(s) deleted. You are signed out of those sites in this browser.",
    "tabTutup.tambah": "On tab close",
    "tabTutup.aktif": "Tab close ✓",
    "tabTutup.ditambah": "{s}: login cookies are deleted when its tab is closed.",
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
