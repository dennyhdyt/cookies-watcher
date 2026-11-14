# Pemantau Cookies (versi awal)

Ekstensi untuk Chrome dan Edge yang memantau cookies sesi dan memberi peringatan
kalau ada yang berubah secara mencurigakan.

## Cara memasang (mode pengembang)

1. Ekstrak file zip ini sampai jadi folder `pemantau-cookies`.
2. Buka `chrome://extensions` (Chrome) atau `edge://extensions` (Edge).
3. Aktifkan **Developer mode** (pojok kanan atas atau kiri bawah).
4. Klik **Load unpacked** lalu pilih folder `pemantau-cookies`.
5. Ikon ekstensi muncul di toolbar. Klik untuk membuka.

Setelah mengubah kode, klik tombol refresh di kartu ekstensi pada halaman extensions.

## Fungsi tiap file

| File | Fungsi |
|------|--------|
| `manifest.json` | "KTP" ekstensi: nama, izin yang diminta, file yang dipakai |
| `background.js` | Pemantau di latar belakang: cookie sesi yang berubah, domain mirip, ekstensi baru, pembersihan cookie login, dan tab ditutup |
| `popup.html` / `popup.css` | Tampilan jendela kecil saat ikon diklik, dibagi dalam 5 tab: Peringatan, Pemindaian, Ekstensi, Bersihkan, Pengaturan (angka merah di tab Peringatan = jumlah peringatan) |
| `bahasa.js` | Kamus teks Indonesia dan Inggris, plus pemilihan bahasa. Dimuat paling awal oleh `background.js` dan popup |
| `umum.js` | Data dan fungsi bersama (daftar situs tetap, nama cookie sesi bawaan, deteksi domain mirip, penyimpanan). Dimuat oleh `background.js` dan popup |
| `ekstensi.js` | Aturan pemeriksaan izin ekstensi lain, dipakai bersama oleh `background.js` dan popup |
| `popup.js` | Logika tampilan: peringatan, pemindaian, pengaturan situs, nama cookie, bersihkan cookie, daftar putih |
| `periksa-keamanan.js` | Alat bantu: `node periksa-keamanan.js` memeriksa izin dan melarang jaringan, eval, pembacaan nilai cookie, dll. |
| `buat-rilis.js` | Alat bantu: membuat zip rilis dari commit terakhir plus checksum SHA-256 |
| `SECURITY.md` | Aturan keamanan, cara melapor kerentanan, daftar periksa rilis |

## Status pemantauan dan lencana di ikon

Bagian atas tab **Peringatan** berisi kartu status supaya kamu bisa memastikan ekstensi bekerja: kapan terakhir
ekstensi melihat perubahan cookie, jumlah cookie login yang terdeteksi, berapa situs yang dibersihkan otomatis,
dan apakah notifikasi diblokir oleh browser atau sistem operasi.
Tidak ada perubahan cookie dalam beberapa jam itu wajar; kalau ada situs yang mengubah cookie, waktunya ikut
berubah. Ikon di toolbar juga menampilkan angka merah sebesar jumlah peringatan yang belum dibersihkan.

## Tab Bersihkan: cookie login terdeteksi otomatis (opsional)

Tab **Bersihkan** menampilkan situs yang kamu kunjungi dan punya cookie login, tanpa perlu mengetik apa pun.
Situs di tab yang sedang dibuka muncul paling atas. Untuk tiap situs ada dua tombol:

- **Tambahkan:** masukkan situs ke daftar yang cookie login-nya dihapus otomatis setiap browser dibuka. Cookie
  yang tercuri dari sesi sebelumnya jadi tidak berlaku lagi, tetapi kamu harus login ulang di situs itu.
- **Hapus sekarang:** hapus cookie login situs itu saat itu juga (misalnya setelah selesai berkunjung).

Yang dihapus hanya cookie bernama sesi (sessionid, xs, dll.), termasuk di subdomain. Tema, bahasa, dan cookie lain
tidak disentuh. Yang dibaca hanya nama cookie, bukan nilainya. Situs yang nama cookie loginnya tidak dikenal baru
muncul kalau namanya ada di daftar nama login bawaan. Tombol **Bersihkan semua sekarang** menjalankan
seluruh daftar otomatis langsung. Fitur otomatis mati selama daftarnya kosong.

Kapan penghapusan otomatis berjalan: saat browser **dibuka**, bukan saat ditutup (browser tidak memberi ekstensi
sinyal "akan ditutup" yang andal), jadi cookie masih ada di disk selama browser mati. Ada dua pemicu: browser mulai
dari awal, atau jendela baru dibuka setelah **semua jendela ditutup** (browser sering tetap berjalan di latar
belakang setelah jendelanya ditutup, dan dalam kasus itu "browser mulai" tidak pernah terjadi). Membuka jendela
tambahan di tengah sesi tidak menghapus apa pun. Bagian **Riwayat pembersihan** di tab Bersihkan mencatat kapan
dan karena apa pembersihan berjalan, supaya kamu bisa memastikannya.

Kalau setelah dibersihkan kamu masih login: sebagian situs memakai beberapa cookie login sekaligus dan sebagian
namanya mungkin belum dikenali. Situs seperti itu belum bisa dideteksi. Halaman yang sudah terbuka
(misalnya tab yang dipulihkan browser) tetap terlihat login sampai dimuat ulang.

## Bahasa

Popup punya tombol **ID | EN** di pojok kanan atas. Pilihannya tersimpan di browser dan juga dipakai untuk
notifikasi. Bawaannya Indonesia. Peringatan yang sudah tercatat tetap memakai bahasa saat peringatan itu dibuat.

Menambah bahasa baru: salin satu blok bahasa di `bahasa.js`, terjemahkan, lalu tambahkan kodenya ke `DAFTAR_BAHASA`
dan `LOCALE`, dan satu tombol di `popup.html`.

## Cara deteksi saat ini

- **Peringatan:** cookie sesi di situs penting (Facebook, Google, dll.) dibuat atau diubah padahal tidak ada tab yang membuka situs itu.
- **Pemindaian:** cookie sesi tanpa HttpOnly, tanpa Secure, atau dengan SameSite longgar; domain yang meniru situs yang dipantau; dan domain yang "perlu diperhatikan" (alamat IP publik atau domain internasional/punycode, ditampilkan dengan kotak kuning).
- **Domain mirip:** cookie dari domain yang meniru situs yang dipantau langsung memicu peringatan dan notifikasi, sekali per domain. Yang dikenali: salah ketik atau angka pengganti huruf (`faceb00k.com`, `facebok.com`), nama dengan kata pancingan (`facebook-login.com`), nama sebagai subdomain (`facebook.com.evil.net`), nama persis di akhiran yang sering disalahgunakan (`google.xyz`, `facebook.top`), serta serangan homograf: huruf Kiril/Yunani yang menyerupai huruf Latin (`g[o Kiril][o Kiril]gle.com`) atau satu nama yang mencampur huruf Latin dan Kiril. Domain homograf ditampilkan dalam bentuk punycode (`xn--...`) supaya tidak ikut mengecoh. Cookie pelacak/iklan biasa sengaja **tidak** ditandai, karena jumlahnya sangat banyak dan umumnya bukan pencurian. Domain resmi seperti `google.co.id` atau `googleapis.com` dikenali sebagai aman.
- **Perlu diperhatikan:** alamat IP publik (alamat jaringan lokal seperti 192.168.x.x tidak dihitung) dan domain punycode biasa (misalnya situs berhuruf Mandarin atau Rusia yang sah) hanya muncul di pemindaian, **tanpa notifikasi**, karena situs sah juga kadang begini. Tombol **Percayai** memasukkannya ke daftar putih.

- **Ekstensi berizin cookies:** popup menampilkan ekstensi lain yang bisa membaca cookies atau melihat lalu lintas web (risiko tinggi kalau berlaku untuk semua situs). Kamu bisa menonaktifkan, menghapus, atau menandainya tepercaya (misalnya pengelola password milikmu). Notifikasi juga muncul saat ekstensi baru seperti itu dipasang atau diaktifkan. Fitur ini memakai izin `management`, yang bersifat **opsional**: mati secara bawaan, dan baru aktif kalau kamu menekan tombol "Aktifkan pemeriksaan ekstensi" di popup (browser akan meminta persetujuan). Bisa dimatikan lagi kapan saja dengan tombol yang sama.
- **Keluar dari semua perangkat:** peringatan cookie sesi punya tombol yang membuka halaman sesi/keamanan situs terkait (Facebook, Instagram, Google/YouTube, X, LinkedIn, GitHub, dan situs tambahan yang kamu beri tautan). Alamat halaman bisa berubah kalau situsnya mengubah pengaturan.
- **Daftar putih:** situs yang kamu percaya tidak memicu peringatan dan tidak muncul di hasil pemindaian. Tambahkan lewat kolom input di popup, atau tombol "Percayai situs ini" pada peringatan. Subdomain ikut dihitung (menambah `google.com` juga mencakup `accounts.google.com`).

Ini heuristik (tebakan berdasarkan tanda-tanda), bukan bukti pasti pembajakan, jadi
kadang bisa salah peringatan.

## Keamanan

Ekstensi ini sengaja dibuat kecil permukaan serangnya. Detail lengkap ada di `SECURITY.md`.

| Izin | Wajib? | Untuk apa |
|---|---|---|
| `cookies` | ya | Melihat nama, domain, dan pengaturan cookie (nilai tidak dibaca) |
| `storage` | ya | Menyimpan daftar peringatan dan pengaturan secara lokal |
| `notifications` | ya | Memberi tahu saat ada perubahan mencurigakan |
| akses semua situs | ya | Syarat Chrome agar cookies semua situs bisa dibaca |
| `management` | opsional | Memeriksa ekstensi lain, hanya kalau kamu aktifkan |

Tanpa jaringan, tanpa kode dari luar, tanpa penerima pesan dari situs web. Ini bukan jaminan
kebal: malware di komputer atau akun pemilik yang dibobol tetap di luar jangkauan ekstensi ini.

Sebelum commit atau rilis: jalankan `node periksa-keamanan.js`. Untuk rilis: `node buat-rilis.js`.

## Batasan

- Ekstensi browser **tidak bisa melihat apakah cookie dipakai di perangkat lain**. Itu hanya terlihat oleh server situs, lewat halaman "aktivitas login" atau "perangkat yang masuk". Tombol "Keluar dari semua perangkat" di peringatan membuka halaman itu.
- Pemeriksaan ekstensi hanya membaca izin yang tercantum, bukan perilaku sebenarnya. Ekstensi tanpa izin cookies masih bisa membaca cookie biasa lewat skrip di halaman, jadi ini bukan jaminan keamanan penuh.
- Ekstensi pribadi yang dipasang lewat Load unpacked (seperti ekstensi ini) tidak diperiksa terhadap dirinya sendiri.
- Deteksi domain mirip adalah tebakan dari bentuk nama domain. Daftar domain resmi yang dikecualikan dan daftar akhiran berisiko hanya sebagian; kalau ada situs sah yang salah ditandai, masukkan ke daftar putih. Nama merek yang pendek (kurang dari 5 huruf, misalnya `x.com`) tidak diperiksa karena terlalu sering salah cocok.
- Ekstensi tidak punya cara mengetahui situs induk sebuah cookie, jadi cookie pihak ketiga biasa (iklan, pelacak) tidak dinilai. Yang dinilai adalah apakah domainnya meniru situs yang kamu pantau.

## Penting

Menghapus cookie di browser **tidak membatalkan sesi di server**. Kalau curiga akun
dibajak: ganti password dan keluar dari semua perangkat di situs terkait.

## Ide pengembangan berikutnya

1. Panduan darurat di popup: daftar langkah berurutan saat ada peringatan (ganti password dari perangkat bersih, keluar dari semua perangkat, periksa ekstensi, pindai antivirus)
2. Ekspor/impor pengaturan (situs, nama cookie, daftar putih)

## Tombol darurat dan hapus saat tab ditutup

- **Keluarkan semua login sekarang** (tab Bersihkan): menghapus cookie login semua situs yang terdeteksi di browser ini, dengan konfirmasi. Ini tidak mengeluarkan login di perangkat lain; untuk itu ganti password dan pilih "keluar dari semua perangkat" di situsnya.
- **Saat tab ditutup**: tombol di tiap situs yang terdeteksi. Situs yang dipilih dihapus cookie login-nya saat tab terakhir situs itu ditutup (tidak dihapus kalau masih ada tab lain dari situs yang sama). Hanya situs yang kamu pilih yang dipantau; ekstensi mencatat nama situsnya (bukan alamat lengkap) di memori sesi, hilang saat browser ditutup. Tidak ada izin baru: alamat tab dibaca lewat izin situs yang sudah ada, bukan izin "tabs".
- Batas: kalau seluruh browser ditutup sekaligus, penghapusan saat tab ditutup bisa tidak sempat berjalan. Tambahkan situs yang sama ke daftar "saat browser dibuka" supaya pasti.

## Ekstensi yang dipasang program lain

Di tab Ekstensi (setelah izin opsional `management` kamu aktifkan), ekstensi lain ditandai juga kalau: **dipasang oleh program lain** di komputer (`sideload`, jalur yang dipakai software Windows), **dipasang lewat kebijakan sistem** (`admin`, registry/Group Policy), atau **bisa berkomunikasi dengan program di komputer** (`nativeMessaging`), selain yang berizin cookies atau lalu lintas web. Notifikasi muncul saat ekstensi seperti itu baru dipasang atau diaktifkan.

Batas yang jujur: ekstensi browser tidak bisa melihat program atau service Windows. Yang terlihat hanya jejaknya di browser (ekstensi yang mereka selipkan). Situs web juga tidak bisa membaca cookie situs lain; yang bisa membaca cookie semua situs adalah ekstensi, dan itulah yang dipantau di sini. Ekstensi ini tidak memasang skrip di halaman web, jadi tidak bisa melihat iklan atau skrip yang membaca cookie di dalam halaman (itu sengaja, supaya permukaan serangannya kecil).

## Tes otomatis

Jalankan `node tests/jalankan.js` (tanpa browser, tanpa instalasi). Tes ini juga berjalan otomatis di GitHub Actions setiap ada perubahan ke `main` atau pull request, bersama `periksa-keamanan.js`. Folder `tests` dan `.github` tidak ikut masuk ke zip rilis.
