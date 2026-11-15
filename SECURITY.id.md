# Keamanan

**Bahasa:** [English](SECURITY.md) | **Bahasa Indonesia**

Ekstensi ini memegang izin yang kuat (membaca cookies di semua situs), jadi keamanannya
perlu dijaga lebih ketat daripada ekstensi biasa. Dokumen ini menjelaskan aturan desainnya,
cara melapor kerentanan, dan apa yang dilakukan kalau ada yang salah.

## Melapor kerentanan

Jangan membuka issue publik untuk masalah keamanan. Gunakan **GitHub → tab Security →
Report a vulnerability** di halaman repositori. Pemilik repositori perlu mengaktifkannya
dulu di **Settings → Code security → Private vulnerability reporting**.

Sertakan langkah untuk mengulang masalahnya, versi ekstensi, dan browser yang dipakai.

## Aturan desain (yang dijaga setiap perubahan)

1. **Tidak pernah membaca nilai cookie.** Yang dibaca hanya nama, domain, dan pengaturan
   keamanannya (Secure, HttpOnly, SameSite, masa berlaku). Nilai sesi login tidak disentuh.
2. **Tidak ada jaringan.** Tidak ada `fetch`, `XMLHttpRequest`, WebSocket, atau pelacakan.
   Semua data tersimpan lokal di browser. Tidak ada yang dikirim ke server mana pun.
3. **Tidak ada kode dari luar.** Tidak ada `eval`, kode inline, atau pustaka pihak ketiga.
   Kebijakan keamanan konten (CSP) di `manifest.json` melarang yang selain `script-src 'self'`.
4. **Tidak ada pintu masuk dari luar.** Tidak ada penerima pesan, `externally_connectable`,
   `web_accessible_resources`, atau `content_scripts`. Situs web dan ekstensi lain tidak
   punya jalur ke ekstensi ini.
5. **Izin sekecil mungkin.** Lihat tabel di README. Izin `management` bersifat opsional dan
   hanya diminta kalau kamu menyalakan pemeriksaan ekstensi.
   Izin `browsingData` juga opsional: hanya diminta kalau kamu mencentang "hapus juga data
   penyimpanan situs" di panel Lindungi. Kodenya dibatasi dan dijaga pemeriksa keamanan:
   hanya `chrome.browsingData.remove({ origins: ... }, { localStorage: true })`, yaitu hanya
   menghapus (tidak membaca) `localStorage`, hanya untuk alamat situs yang kamu simpan.
   Riwayat penelusuran, unduhan, kata sandi, cache, dan penghapusan tanpa batas alamat
   dilarang oleh pemeriksa dan akan membuat GitHub Actions merah.
   Izin `scripting` juga opsional, hanya diminta saat kamu menekan "Tampilkan nama data
   penyimpanan" atau memilih kunci. Hanya `chrome.scripting.executeScript` dengan fungsi bawaan
   (bukan berkas atau kode luar), di dunia terisolasi, dan fungsi itu hanya boleh
   `Object.keys(localStorage)` (nama kunci) dan `localStorage.removeItem` (hapus). Membaca nilai,
   `sessionStorage`, dunia MAIN, `files`, dan API `chrome.scripting` lain dilarang oleh pemeriksa.
   Tetap tidak ada `content_scripts`: tidak ada kode yang berjalan di halaman tanpa kamu menekan tombol.
   Fitur "hapus saat tab ditutup" tidak memakai izin `tabs`: alamat tab dibaca lewat izin situs
   yang sudah ada, dan hanya nama situs yang kamu pilih yang dicatat (memori sesi, bukan alamat
   lengkap, tidak dikirim ke mana pun).
6. **Tampilan tidak menulis HTML mentah.** Semua teks (termasuk nama cookie dan domain yang
   bisa dikendalikan situs lain) ditulis dengan `textContent`.

Aturan 1 sampai 6 diperiksa otomatis oleh `node periksa-keamanan.js`. Alat itu menangkap
kesalahan dan perubahan berbahaya yang jelas, tetapi **bukan jaminan**. Tetap baca setiap
perubahan sebelum commit.

## Yang tidak bisa dilindungi ekstensi ini

- Malware di komputer yang mengambil cookies langsung dari file browser.
- Pemakaian cookie yang sudah dicuri di perangkat lain (hanya terlihat oleh server situs).
- Akun pemilik (GitHub atau toko ekstensi) yang dibobol lalu kodenya diganti.

Untuk yang terakhir, jagalah akun dengan passkey atau verifikasi dua langkah.

## Daftar periksa sebelum merilis

- [ ] Akun GitHub dan akun toko ekstensi memakai passkey atau verifikasi dua langkah
- [ ] Branch `main` dilindungi (larang force push)
- [ ] Semua perubahan sudah dibaca sendiri, termasuk yang ditulis oleh AI
- [ ] `node periksa-keamanan.js` lolos
- [ ] Daftar izin di README sesuai dengan `manifest.json`
- [ ] Rilis dibuat dengan `node buat-rilis.js` dari commit yang sudah di-push
- [ ] Checksum SHA-256 dibagikan lewat jalur terpisah dari file zip
- [ ] Untuk rilis publik: ditinjau orang yang berpengalaman di keamanan ekstensi

## Kalau akun pemilik dibobol

1. Ganti password dan cabut semua sesi aktif dari perangkat yang bersih.
2. Cabut akses aplikasi dan token yang terhubung ke akun (GitHub: Settings → Applications).
3. Periksa riwayat commit dan rilis; kembalikan perubahan yang bukan buatan sendiri.
4. Tarik rilis yang mencurigakan, lalu umumkan dan terbitkan versi perbaikan.
5. Minta pengguna mengganti password akun penting kalau ada kemungkinan terpengaruh.
