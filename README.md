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
| `background.js` | Pemantau di latar belakang. Mendeteksi cookie sesi yang berubah saat situsnya tidak sedang dibuka |
| `popup.html` / `popup.css` | Tampilan jendela kecil saat ikon diklik |
| `ekstensi.js` | Aturan pemeriksaan izin ekstensi lain, dipakai bersama oleh `background.js` dan popup |
| `popup.js` | Logika tampilan: daftar peringatan, pemindaian, tombol hapus |

## Cara deteksi saat ini

- **Peringatan:** cookie sesi di situs penting (Facebook, Google, dll.) dibuat atau diubah padahal tidak ada tab yang membuka situs itu.
- **Pemindaian:** cookie sesi tanpa HttpOnly, tanpa Secure, atau dengan SameSite longgar.

- **Ekstensi berizin cookies:** popup menampilkan ekstensi lain yang bisa membaca cookies atau melihat lalu lintas web (risiko tinggi kalau berlaku untuk semua situs). Kamu bisa menonaktifkan, menghapus, atau menandainya tepercaya (misalnya pengelola password milikmu). Notifikasi juga muncul saat ekstensi baru seperti itu dipasang atau diaktifkan. Fitur ini memakai izin `management`, yang membuat Chrome/Edge menampilkan peringatan "mengelola ekstensi" saat memasang.
- **Periksa aktivitas login:** popup mengumpulkan tombol ke halaman aktivitas login/sesi tiap situs, tempat kamu bisa melihat perangkat dan lokasi yang sedang masuk. Ada juga pengingat berkala (mati secara bawaan): centang "Ingatkan saya setiap N hari" dan notifikasi akan muncul sesuai jaraknya. Pengingat memakai izin `alarms`.
- **Situs dipantau:** selain daftar bawaan (Facebook, Google, dll.), kamu bisa menambah situs sendiri lewat popup. Catatan: pemantauan memakai daftar nama cookie sesi yang umum, jadi untuk situs yang memakai nama berbeda, tambahkan namanya di bagian "Nama cookie sesi".
- **Nama cookie sesi:** tambahkan nama cookie sesi sendiri (berlaku untuk pemantauan dan pemindaian). Namanya bisa dicari lewat DevTools: F12, tab Application, Cookies.
- **Keluar dari semua perangkat:** setiap peringatan punya tombol yang membuka halaman sesi/keamanan situs terkait (Facebook, Instagram, Google/YouTube, X, LinkedIn, GitHub). Alamat halaman bisa berubah kalau situsnya mengubah pengaturan.
- **Daftar putih:** situs yang kamu percaya tidak memicu peringatan dan tidak muncul di hasil pemindaian. Tambahkan lewat kolom input di popup, atau tombol "Percayai situs ini" pada peringatan. Subdomain ikut dihitung (menambah `google.com` juga mencakup `accounts.google.com`).

Ini heuristik (tebakan berdasarkan tanda-tanda), bukan bukti pasti pembajakan, jadi
kadang bisa salah peringatan.

## Batasan

- Ekstensi browser **tidak bisa melihat apakah cookie dipakai di perangkat lain**. Itu hanya terlihat oleh server situs, lewat halaman "aktivitas login" atau "perangkat yang masuk". Tombol "Keluar dari semua perangkat" di peringatan membuka halaman itu.
- Pemeriksaan ekstensi hanya membaca izin yang tercantum, bukan perilaku sebenarnya. Ekstensi tanpa izin cookies masih bisa membaca cookie biasa lewat skrip di halaman, jadi ini bukan jaminan keamanan penuh.
- Ekstensi pribadi yang dipasang lewat Load unpacked (seperti ekstensi ini) tidak diperiksa terhadap dirinya sendiri.

## Penting

Menghapus cookie di browser **tidak membatalkan sesi di server**. Kalau curiga akun
dibajak: ganti password dan keluar dari semua perangkat di situs terkait.

## Ide pengembangan berikutnya

1. Deteksi domain pihak ketiga yang mencurigakan
2. Nama cookie sesi per situs (saat ini berlaku untuk semua situs)
3. Tautan "keluar dari semua perangkat" untuk situs tambahan
4. Mencatat kapan terakhir kamu mengecek aktivitas login tiap situs
