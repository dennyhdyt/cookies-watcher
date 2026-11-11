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
| `popup.js` | Logika tampilan: daftar peringatan, pemindaian, tombol hapus |

## Cara deteksi saat ini

- **Peringatan:** cookie sesi di situs penting (Facebook, Google, dll.) dibuat atau diubah padahal tidak ada tab yang membuka situs itu.
- **Pemindaian:** cookie sesi tanpa HttpOnly, tanpa Secure, atau dengan SameSite longgar.

Ini heuristik (tebakan berdasarkan tanda-tanda), bukan bukti pasti pembajakan, jadi
kadang bisa salah peringatan.

## Penting

Menghapus cookie di browser **tidak membatalkan sesi di server**. Kalau curiga akun
dibajak: ganti password dan keluar dari semua perangkat di situs terkait.

## Ide pengembangan berikutnya

1. Daftar putih (situs yang dipercaya tidak diperingatkan)
2. Pengaturan untuk menambah situs penting sendiri
3. Deteksi domain pihak ketiga yang mencurigakan
4. Tautan langsung ke halaman "keluar dari semua perangkat" tiap platform
5. Memantau ekstensi baru yang meminta izin cookies
