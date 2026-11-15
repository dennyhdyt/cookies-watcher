# Security / Keamanan

**Pick a language / Pilih bahasa:** click a heading below to open it. / Klik judul di bawah untuk membukanya.

<details open>
<summary><h2>🇬🇧 English</h2></summary>

This extension holds powerful permissions (reading cookies on all sites), so its security
needs to be guarded more strictly than an ordinary extension. This document explains the
design rules, how to report a vulnerability, and what to do when something goes wrong.

### Reporting a vulnerability

Do not open a public issue for a security problem. Use **GitHub → Security tab →
Report a vulnerability** on the repository page. The repository owner must enable it first
under **Settings → Code security → Private vulnerability reporting**.

Include the steps to reproduce the problem, the extension version, and the browser used.

### Design rules (kept on every change)

1. **Never read cookie values.** Only the name, domain, and security attributes are read
   (Secure, HttpOnly, SameSite, expiry). Login session values are never touched.
2. **No network.** No `fetch`, `XMLHttpRequest`, WebSocket, or tracking. All data is stored
   locally in the browser. Nothing is sent to any server.
3. **No outside code.** No `eval`, inline code, or third-party libraries. The Content
   Security Policy (CSP) in `manifest.json` forbids anything other than `script-src 'self'`.
4. **No entry points from outside.** No message receivers, `externally_connectable`,
   `web_accessible_resources`, or `content_scripts`. Websites and other extensions have no
   path into this extension.
5. **Smallest possible permissions.** See the table in the README. The `management`
   permission is optional and only requested when you turn on the extension check.
   The `browsingData` permission is also optional: only requested when you tick "also delete
   the site's storage" in the Protect panel. Its use is restricted and guarded by the security
   checker: only `chrome.browsingData.remove({ origins: ... }, { localStorage: true })`, that is,
   it only deletes (never reads) `localStorage`, only for site addresses you saved.
   Browsing history, downloads, passwords, cache, and deletion without an address limit are
   forbidden by the checker and will turn GitHub Actions red.
   The `scripting` permission is also optional, only requested when you press "Show storage
   names" or choose keys. Only `chrome.scripting.executeScript` with a built-in function (not
   files or outside code), in the isolated world, and that function may only use
   `Object.keys(localStorage)` (key names) and `localStorage.removeItem` (delete). Reading
   values, `sessionStorage`, the MAIN world, `files`, and other `chrome.scripting` APIs are
   forbidden by the checker. There are still no `content_scripts`: no code runs in a page
   unless you press a button.
   The "delete when tab closes" feature does not use the `tabs` permission: tab addresses are
   read through the existing site permission, and only the names of sites you chose are
   recorded (session memory, not full addresses, never sent anywhere).
6. **The interface never writes raw HTML.** All text (including cookie names and domains that
   other sites can control) is written with `textContent`.

Rules 1 to 6 are checked automatically by `node periksa-keamanan.js`. That tool catches
obvious mistakes and dangerous changes, but it is **not a guarantee**. Still read every
change before committing.

### What this extension cannot protect against

- Malware on the computer that takes cookies straight from the browser's files.
- Use of already-stolen cookies on another device (only visible to the site's server).
- The owner's account (GitHub or the extension store) being hijacked and the code replaced.

For the last one, protect the account with a passkey or two-step verification.

### Checklist before releasing

- [ ] GitHub and extension store accounts use a passkey or two-step verification
- [ ] The `main` branch is protected (forbid force push)
- [ ] All changes were read personally, including those written by AI
- [ ] `node periksa-keamanan.js` passes
- [ ] The permission list in the README matches `manifest.json`
- [ ] The release was built with `node buat-rilis.js` from a commit that has been pushed
- [ ] The SHA-256 checksum is shared through a channel separate from the zip file
- [ ] For a public release: reviewed by someone experienced in extension security

### If the owner's account is hijacked

1. Change the password and revoke all active sessions from a clean device.
2. Revoke app access and tokens connected to the account (GitHub: Settings → Applications).
3. Review the commit and release history; revert changes you did not make yourself.
4. Withdraw any suspicious release, then announce it and publish a fixed version.
5. Ask users to change passwords of important accounts if they may have been affected.

</details>

<details>
<summary><h2>🇮🇩 Bahasa Indonesia</h2></summary>

Ekstensi ini memegang izin yang kuat (membaca cookies di semua situs), jadi keamanannya
perlu dijaga lebih ketat daripada ekstensi biasa. Dokumen ini menjelaskan aturan desainnya,
cara melapor kerentanan, dan apa yang dilakukan kalau ada yang salah.

### Melapor kerentanan

Jangan membuka issue publik untuk masalah keamanan. Gunakan **GitHub → tab Security →
Report a vulnerability** di halaman repositori. Pemilik repositori perlu mengaktifkannya
dulu di **Settings → Code security → Private vulnerability reporting**.

Sertakan langkah untuk mengulang masalahnya, versi ekstensi, dan browser yang dipakai.

### Aturan desain (yang dijaga setiap perubahan)

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

### Yang tidak bisa dilindungi ekstensi ini

- Malware di komputer yang mengambil cookies langsung dari file browser.
- Pemakaian cookie yang sudah dicuri di perangkat lain (hanya terlihat oleh server situs).
- Akun pemilik (GitHub atau toko ekstensi) yang dibobol lalu kodenya diganti.

Untuk yang terakhir, jagalah akun dengan passkey atau verifikasi dua langkah.

### Daftar periksa sebelum merilis

- [ ] Akun GitHub dan akun toko ekstensi memakai passkey atau verifikasi dua langkah
- [ ] Branch `main` dilindungi (larang force push)
- [ ] Semua perubahan sudah dibaca sendiri, termasuk yang ditulis oleh AI
- [ ] `node periksa-keamanan.js` lolos
- [ ] Daftar izin di README sesuai dengan `manifest.json`
- [ ] Rilis dibuat dengan `node buat-rilis.js` dari commit yang sudah di-push
- [ ] Checksum SHA-256 dibagikan lewat jalur terpisah dari file zip
- [ ] Untuk rilis publik: ditinjau orang yang berpengalaman di keamanan ekstensi

### Kalau akun pemilik dibobol

1. Ganti password dan cabut semua sesi aktif dari perangkat yang bersih.
2. Cabut akses aplikasi dan token yang terhubung ke akun (GitHub: Settings → Applications).
3. Periksa riwayat commit dan rilis; kembalikan perubahan yang bukan buatan sendiri.
4. Tarik rilis yang mencurigakan, lalu umumkan dan terbitkan versi perbaikan.
5. Minta pengguna mengganti password akun penting kalau ada kemungkinan terpengaruh.

</details>
