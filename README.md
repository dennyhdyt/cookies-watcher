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
| `background.js` | Pemantau di latar belakang: cookie sesi yang berubah, domain mirip, ekstensi baru, dan pengingat berkala |
| `popup.html` / `popup.css` | Tampilan jendela kecil saat ikon diklik, dibagi dalam 5 tab: Peringatan, Pemindaian, Ekstensi, Login, Pengaturan (angka merah di tab Peringatan = jumlah peringatan) |
| `bahasa.js` | Kamus teks Indonesia dan Inggris, plus pemilihan bahasa. Dimuat paling awal oleh `background.js` dan popup |
| `umum.js` | Data dan fungsi bersama (daftar situs, nama cookie sesi, deteksi domain mirip, penyimpanan, catatan cek). Dimuat oleh `background.js` dan popup |
| `ekstensi.js` | Aturan pemeriksaan izin ekstensi lain, dipakai bersama oleh `background.js` dan popup |
| `popup.js` | Logika tampilan: peringatan, pemindaian, pengaturan situs, nama cookie, aktivitas login, daftar putih |
| `periksa-keamanan.js` | Alat bantu: `node periksa-keamanan.js` memeriksa izin dan melarang jaringan, eval, pembacaan nilai cookie, dll. |
| `buat-rilis.js` | Alat bantu: membuat zip rilis dari commit terakhir plus checksum SHA-256 |
| `SECURITY.md` | Aturan keamanan, cara melapor kerentanan, daftar periksa rilis |

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
- **Periksa aktivitas login:** popup mengumpulkan tombol ke halaman aktivitas login/sesi tiap situs, tempat kamu bisa melihat perangkat dan lokasi yang sedang masuk. Tiap baris mencatat kapan terakhir dicek (merah kalau belum pernah atau sudah lewat dari jarak pengingat). Tombol **Buka** dan **Sudah dicek** sama-sama mencatat waktu; "Buka" dianggap pengecekan, jadi pastikan kamu benar-benar melihat daftar perangkatnya.
- **Pengingat berkala:** mati secara bawaan. Centang "Ingatkan saya setiap N hari"; notifikasi hanya muncul kalau ada situs yang belum dicek dalam N hari terakhir, dan menyebut situs mana saja. Tombol **Tes notifikasi** menampilkan satu notifikasi contoh untuk memastikan notifikasi tidak diblokir. Pengingat memakai izin `alarms`.
- **Situs dipantau:** selain daftar bawaan (Facebook, Google, dll.), kamu bisa menambah situs sendiri, dengan tautan halaman aktivitas login yang opsional (harus https; kalau mengarah ke host lain, kamu diminta mengonfirmasi dulu). Menyimpan ulang situs yang sama memperbarui tautannya. Menghapus situs tambahan juga membersihkan tautan, nama cookie, dan catatan cek miliknya.
- **Nama cookie sesi:** tambahkan nama cookie sesi sendiri, untuk **semua situs** atau **satu situs saja** (pilih lewat kotak pilihan). Berlaku untuk pemantauan dan pemindaian. Namanya bisa dicari lewat DevTools: F12, tab Application, Cookies.
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
| `alarms` | ya | Pengingat berkala |
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
3. Tombol untuk memicu pengingat sekarang juga, bukan hanya menunggu jaraknya
