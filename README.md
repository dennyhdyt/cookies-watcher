# Pemantau Cookies (Cookie Watcher)

Version 0.5.0 · Chrome and Edge · [Security / Keamanan](SECURITY.md)

**Pick a language / Pilih bahasa:** click a heading below to open it. / Klik judul di bawah untuk membukanya.

<details open>
<summary><h2>🇬🇧 English</h2></summary>

A Chrome and Edge extension that helps limit account takeover by stolen login cookies. It watches session
cookies and warns you when something changes suspiciously, and it can clear the logins a browser leaves behind
(when a tab closes, when the browser opens, or with an emergency button).

> **Honest limits:** this extension only sees what happens *inside the browser*. It cannot see Windows programs,
> and malware on your computer or a hacked account is outside its reach. Deleting a cookie in your browser does
> **not** end a session on the server. See [Limits](#limits).

### How to install (developer mode)

1. Unzip the file until you have the `pemantau-cookies` folder.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode** (top right or bottom left).
4. Click **Load unpacked** and choose the `pemantau-cookies` folder.
5. The extension icon appears in the toolbar. Click it to open.

After changing the code, click the refresh button on the extension's card on the extensions page.

### What each file does

| File | Purpose |
|------|---------|
| `manifest.json` | The extension's "ID card": name, requested permissions, files used |
| `background.js` | Background monitor: changing session cookies, look-alike domains, new extensions, login cleanup, closed tabs |
| `popup.html` / `popup.css` | The small window shown when you click the icon, split into 5 tabs: Alerts, Scan, Extensions, Clean, Settings (the red number on the Alerts tab is the alert count) |
| `bahasa.js` | Indonesian and English text dictionary plus language selection. Loaded first by `background.js` and the popup |
| `umum.js` | Shared data and functions (fixed site list, default session cookie names, look-alike domain detection, storage). Loaded by `background.js` and the popup |
| `ekstensi.js` | Rules for checking other extensions' permissions, shared by `background.js` and the popup |
| `popup.js` | Popup logic: alerts, scan, site settings, clean cookies, allowlist |
| `periksa-keamanan.js` | Helper: `node periksa-keamanan.js` checks permissions and forbids network calls, eval, reading cookie values, etc. |
| `buat-rilis.js` | Helper: builds a release zip from the latest commit plus a SHA-256 checksum |
| `SECURITY.md` | Security rules (English and Indonesian), how to report vulnerabilities, release checklist |

### Monitoring status and the icon badge

The top of the **Alerts** tab has a status card so you can confirm the extension is working: when it last saw a
cookie change, how many login cookies were detected, how many sites are cleaned automatically, and whether
notifications are blocked by the browser or operating system. No cookie changes for a few hours is normal; when a
site changes a cookie, the time updates. The toolbar icon also shows a red number equal to the alerts you have
not cleared yet.

### Clean tab: login cookies detected automatically (optional)

The **Clean** tab lists sites you visited that have login cookies, with no typing needed. The site in your
current tab appears at the top. Each site has two buttons:

- **Add:** put the site on the list whose login cookies are deleted automatically every time the browser opens.
  A cookie stolen from an earlier session stops working, but you have to log in to that site again.
- **Delete now:** delete that site's login cookies immediately (for example after you finish a visit).

Only cookies with session-like names (sessionid, xs, etc.) are deleted, including on subdomains. Themes,
language, and other cookies are not touched. Only cookie **names** are read, never their values. A site only shows
up if one of its cookie names is in the built-in login-name list. The **Clean all now** button runs the whole
automatic list immediately. The automatic feature is off while the list is empty.

When automatic cleanup runs: when the browser **opens**, not when it closes (browsers do not give extensions a
reliable "about to close" signal), so cookies stay on disk while the browser is off. There are two triggers: the
browser starts from scratch, or a new window opens after **all windows were closed** (browsers often keep running
in the background after the last window closes, and then "browser start" never happens). Opening an extra window
in the middle of a session deletes nothing. The **Cleanup history** section on the Clean tab records when and why
a cleanup ran, so you can verify it.

If you are still logged in after cleaning: some sites use several login cookies at once, and some names may not
be recognized yet. Such sites cannot be detected yet. A page that is already open (for example a tab restored by
the browser) still looks logged in until you reload it.

### Language

The popup has an **ID | EN** button at the top right. Your choice is saved in the browser and is also used for
notifications. The default is Indonesian. Alerts that were already recorded keep the language they were created in.

Adding a new language: copy one language block in `bahasa.js`, translate it, add its code to `DAFTAR_BAHASA` and
`LOCALE`, and add one button in `popup.html`.

### How detection works today

- **Alerts:** a session cookie on an important site (Facebook, Google, etc.) is created or changed while no tab has that site open.
- **Scan:** session cookies without HttpOnly, without Secure, or with loose SameSite; domains that imitate a monitored site; and domains that "need attention" (public IP addresses or international/punycode domains, shown in a yellow box).
- **Look-alike domains:** a cookie from a domain imitating a monitored site immediately triggers an alert and a notification, once per domain. Recognized patterns: typos or digits replacing letters (`faceb00k.com`, `facebok.com`), bait words (`facebook-login.com`), the name as a subdomain (`facebook.com.evil.net`), the exact name on commonly abused endings (`google.xyz`, `facebook.top`), and homograph attacks: Cyrillic/Greek letters that look like Latin ones, or one name mixing Latin and Cyrillic letters. Homograph domains are shown in punycode (`xn--...`) so they cannot fool you. Ordinary tracking/advertising cookies are deliberately **not** flagged: there are very many and they are usually not theft. Official domains such as `google.co.id` or `googleapis.com` are recognized as safe.
- **Needs attention:** public IP addresses (local network addresses such as 192.168.x.x do not count) and ordinary punycode domains (for example legitimate Chinese or Russian sites) only appear in the scan, **without a notification**, because legitimate sites sometimes look like this too. The **Trust** button adds them to the allowlist.
- **Extensions with cookie permissions:** the popup lists other extensions that can read cookies or see web traffic (high risk if it applies to all sites). You can disable, remove, or mark them trusted (for example your own password manager). A notification also appears when such a new extension is installed or enabled. This uses the `management` permission, which is **optional**: off by default, and only enabled when you press "Enable extension check" in the popup (the browser asks for approval). You can turn it off again with the same button.
- **Sign out of all devices:** session cookie alerts have a button that opens the related site's session/security page (Facebook, Instagram, Google/YouTube, X, LinkedIn, GitHub, and any extra site you give a link for). Page addresses can change if the site changes its settings.
- **Allowlist:** sites you trust do not trigger alerts and do not appear in scan results. Add them with the input field in the popup, or the "Trust this site" button on an alert. Subdomains count (adding `google.com` also covers `accounts.google.com`).

These are heuristics (educated guesses from signs), not proof of a takeover, so false alerts can happen.

### Security

This extension is deliberately built with a small attack surface. Full details are in [`SECURITY.md`](SECURITY.md) (English and Indonesian).

| Permission | Required? | What for |
|---|---|---|
| `cookies` | yes | Read cookie names, domains, and settings (values are not read) |
| `storage` | yes | Store the alert list and settings locally |
| `notifications` | yes | Notify you of suspicious changes |
| access to all sites | yes | Chrome requires it to read cookies for all sites |
| `management` | optional | Check other extensions, only if you turn it on |
| `browsingData` | optional | Delete ALL `localStorage` of sites you protect (without reading it), only if you tick that option |
| `scripting` | optional | Read the NAMES of `localStorage` keys in a tab you choose and delete the keys you tick. Values are not read; it only runs when you press the button |

No network access, no outside code, no message receivers from web pages. This is not an invulnerability
guarantee: malware on your computer or a compromised owner account is still beyond this extension's reach.

Before committing or releasing: run `node periksa-keamanan.js`. For a release: `node buat-rilis.js`.

### Limits

- A browser extension **cannot tell whether a cookie is being used on another device**. Only the site's server can see that, through its "login activity" or "signed-in devices" page. The "Sign out of all devices" button on an alert opens that page.
- The extension check only reads declared permissions, not real behavior. An extension without cookie permissions can still read ordinary cookies through scripts in the page, so this is not full security.
- Personal extensions installed via Load unpacked (like this one) are not checked against themselves.
- Look-alike domain detection is a guess from the shape of the domain name. The lists of excluded official domains and risky endings are only partial; if a legitimate site is flagged, add it to the allowlist. Short brand names (under 5 letters, for example `x.com`) are not checked because they match wrongly too often.
- The extension has no way to know a cookie's parent site, so ordinary third-party cookies (ads, trackers) are not rated. What is rated is whether the domain imitates a site you monitor.

### Important

Deleting cookies in the browser **does not cancel the session on the server**. If you suspect your account was
hijacked: change your password and sign out of all devices on the related site.

### Ideas for later

1. An emergency guide in the popup: an ordered checklist when an alert appears (change password from a clean device, sign out of all devices, check extensions, run an antivirus scan)
2. Export/import of settings (sites, cookie names, allowlist)

### Protect this site (no typing)

On the Clean tab, the **This tab** card reads the site name from the tab you have open. Click **Protect this site**:
- The extension shows the cookie **names** of that site (the contents are never read). Login-like ones (`sessionid`, `token`, `auth`, etc.) are already ticked; trackers such as `_ga` are labeled and left unticked. You can change the choice.
- Choose when the login is deleted: when the tab closes, when the browser opens, or both. There is an option to **delete ALL cookies of the site**.
- An option to **also delete the site's storage (localStorage)** for sites that keep the login there (for example, sites with no visible login cookie). It needs the optional `browsingData` permission, only deletes, only for the address of the tab you protect (other subdomains need to be protected from their own tab), and browsing history is not touched.
- **localStorage can be chosen key by key.** The extension shows the key NAMES in the tab you have open (for example `token`) and you tick which to delete. It needs the optional `scripting` permission, and values are never read. Limit: per-key deletion only works while the site's tab is still open (through Delete now or the emergency button); after the tab closes, the browser does not let extensions touch those keys, so for automatic deletion when the tab closes use the delete ALL storage option.
- All protected sites are in the **Protected sites** list, with an on/off button per site, Delete now, and Remove from list. The emergency button covers these sites too.

Limit: logins a site keeps somewhere other than cookies and `localStorage` (for example `indexedDB`) are out of reach. Matching and deletion are tested automatically in Chromium and were tried manually in Chrome and Edge by the author.

### Emergency button and delete when a tab closes

- **Sign out everything now** (Clean tab): deletes the login cookies of all sites detected in this browser, with a confirmation. It does not sign you out on other devices; for that, change your password and choose "sign out of all devices" on the site.
- **When tab closes:** a button on each detected site. Chosen sites have their login cookies deleted when the last tab of that site is closed (nothing is deleted if another tab of the same site is still open). Only the sites you choose are watched; the extension keeps the site name (not the full address) in session memory, which disappears when the browser closes. No new permission: tab addresses are read through the existing site permission, not the "tabs" permission.
- Limit: if the whole browser is closed at once, deletion on tab close may not get to run. Add the same site to the "when browser opens" list to be sure.

### Extensions installed by other programs

On the Extensions tab (after you turn on the optional `management` permission), other extensions are also flagged if they were: **installed by another program** on the computer (`sideload`, the path used by Windows software), **installed by system policy** (`admin`, registry/Group Policy), or **able to talk to programs on the computer** (`nativeMessaging`), in addition to those with cookie or web-traffic permissions. A notification appears when such an extension is newly installed or enabled.

The honest limit: a browser extension cannot see Windows programs or services. All it sees is their trace in the browser (extensions they slip in). Websites also cannot read other sites' cookies; what can read cookies of all sites is an extension, and that is what is monitored here. This extension has no permanent script in web pages (no `content_scripts`), so it cannot see ads or scripts that read cookies inside a page (this is deliberate, to keep the attack surface small). The only script it runs in a page is a small function that reads the NAMES of `localStorage` keys or deletes keys you chose, and only when you press the button.

### Automated tests

Run `node tests/jalankan.js` (no browser, no installation). These tests also run automatically in GitHub Actions on every change to `main` or pull request, together with `periksa-keamanan.js`. The `tests` and `.github` folders are not included in the release zip.

</details>

<details>
<summary><h2>🇮🇩 Bahasa Indonesia</h2></summary>

Ekstensi untuk Chrome dan Edge yang memantau cookies sesi dan memberi peringatan
kalau ada yang berubah secara mencurigakan.

### Cara memasang (mode pengembang)

1. Ekstrak file zip ini sampai jadi folder `pemantau-cookies`.
2. Buka `chrome://extensions` (Chrome) atau `edge://extensions` (Edge).
3. Aktifkan **Developer mode** (pojok kanan atas atau kiri bawah).
4. Klik **Load unpacked** lalu pilih folder `pemantau-cookies`.
5. Ikon ekstensi muncul di toolbar. Klik untuk membuka.

Setelah mengubah kode, klik tombol refresh di kartu ekstensi pada halaman extensions.

### Fungsi tiap file

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
| `SECURITY.md` | Aturan keamanan, cara melapor kerentanan, daftar periksa rilis (Inggris dan Indonesia) |

### Status pemantauan dan lencana di ikon

Bagian atas tab **Peringatan** berisi kartu status supaya kamu bisa memastikan ekstensi bekerja: kapan terakhir
ekstensi melihat perubahan cookie, jumlah cookie login yang terdeteksi, berapa situs yang dibersihkan otomatis,
dan apakah notifikasi diblokir oleh browser atau sistem operasi.
Tidak ada perubahan cookie dalam beberapa jam itu wajar; kalau ada situs yang mengubah cookie, waktunya ikut
berubah. Ikon di toolbar juga menampilkan angka merah sebesar jumlah peringatan yang belum dibersihkan.

### Tab Bersihkan: cookie login terdeteksi otomatis (opsional)

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

### Bahasa

Popup punya tombol **ID | EN** di pojok kanan atas. Pilihannya tersimpan di browser dan juga dipakai untuk
notifikasi. Bawaannya Indonesia. Peringatan yang sudah tercatat tetap memakai bahasa saat peringatan itu dibuat.

Menambah bahasa baru: salin satu blok bahasa di `bahasa.js`, terjemahkan, lalu tambahkan kodenya ke `DAFTAR_BAHASA`
dan `LOCALE`, dan satu tombol di `popup.html`.

### Cara deteksi saat ini

- **Peringatan:** cookie sesi di situs penting (Facebook, Google, dll.) dibuat atau diubah padahal tidak ada tab yang membuka situs itu.
- **Pemindaian:** cookie sesi tanpa HttpOnly, tanpa Secure, atau dengan SameSite longgar; domain yang meniru situs yang dipantau; dan domain yang "perlu diperhatikan" (alamat IP publik atau domain internasional/punycode, ditampilkan dengan kotak kuning).
- **Domain mirip:** cookie dari domain yang meniru situs yang dipantau langsung memicu peringatan dan notifikasi, sekali per domain. Yang dikenali: salah ketik atau angka pengganti huruf (`faceb00k.com`, `facebok.com`), nama dengan kata pancingan (`facebook-login.com`), nama sebagai subdomain (`facebook.com.evil.net`), nama persis di akhiran yang sering disalahgunakan (`google.xyz`, `facebook.top`), serta serangan homograf: huruf Kiril/Yunani yang menyerupai huruf Latin (`g[o Kiril][o Kiril]gle.com`) atau satu nama yang mencampur huruf Latin dan Kiril. Domain homograf ditampilkan dalam bentuk punycode (`xn--...`) supaya tidak ikut mengecoh. Cookie pelacak/iklan biasa sengaja **tidak** ditandai, karena jumlahnya sangat banyak dan umumnya bukan pencurian. Domain resmi seperti `google.co.id` atau `googleapis.com` dikenali sebagai aman.
- **Perlu diperhatikan:** alamat IP publik (alamat jaringan lokal seperti 192.168.x.x tidak dihitung) dan domain punycode biasa (misalnya situs berhuruf Mandarin atau Rusia yang sah) hanya muncul di pemindaian, **tanpa notifikasi**, karena situs sah juga kadang begini. Tombol **Percayai** memasukkannya ke daftar putih.

- **Ekstensi berizin cookies:** popup menampilkan ekstensi lain yang bisa membaca cookies atau melihat lalu lintas web (risiko tinggi kalau berlaku untuk semua situs). Kamu bisa menonaktifkan, menghapus, atau menandainya tepercaya (misalnya pengelola password milikmu). Notifikasi juga muncul saat ekstensi baru seperti itu dipasang atau diaktifkan. Fitur ini memakai izin `management`, yang bersifat **opsional**: mati secara bawaan, dan baru aktif kalau kamu menekan tombol "Aktifkan pemeriksaan ekstensi" di popup (browser akan meminta persetujuan). Bisa dimatikan lagi kapan saja dengan tombol yang sama.
- **Keluar dari semua perangkat:** peringatan cookie sesi punya tombol yang membuka halaman sesi/keamanan situs terkait (Facebook, Instagram, Google/YouTube, X, LinkedIn, GitHub, dan situs tambahan yang kamu beri tautan). Alamat halaman bisa berubah kalau situsnya mengubah pengaturan.
- **Daftar putih:** situs yang kamu percaya tidak memicu peringatan dan tidak muncul di hasil pemindaian. Tambahkan lewat kolom input di popup, atau tombol "Percayai situs ini" pada peringatan. Subdomain ikut dihitung (menambah `google.com` juga mencakup `accounts.google.com`).

Ini heuristik (tebakan berdasarkan tanda-tanda), bukan bukti pasti pembajakan, jadi
kadang bisa salah peringatan.

### Keamanan

Ekstensi ini sengaja dibuat kecil permukaan serangnya. Detail lengkap ada di [`SECURITY.md`](SECURITY.md) (Inggris dan Indonesia).

| Izin | Wajib? | Untuk apa |
|---|---|---|
| `cookies` | ya | Melihat nama, domain, dan pengaturan cookie (nilai tidak dibaca) |
| `storage` | ya | Menyimpan daftar peringatan dan pengaturan secara lokal |
| `notifications` | ya | Memberi tahu saat ada perubahan mencurigakan |
| akses semua situs | ya | Syarat Chrome agar cookies semua situs bisa dibaca |
| `management` | opsional | Memeriksa ekstensi lain, hanya kalau kamu aktifkan |
| `browsingData` | opsional | Menghapus SEMUA `localStorage` situs yang kamu lindungi (tanpa membaca), hanya kalau kamu centang opsinya |
| `scripting` | opsional | Membaca NAMA kunci `localStorage` di tab yang kamu pilih dan menghapus kunci yang kamu centang. Nilainya tidak dibaca; hanya dijalankan saat kamu menekan tombolnya |

Tanpa jaringan, tanpa kode dari luar, tanpa penerima pesan dari situs web. Ini bukan jaminan
kebal: malware di komputer atau akun pemilik yang dibobol tetap di luar jangkauan ekstensi ini.

Sebelum commit atau rilis: jalankan `node periksa-keamanan.js`. Untuk rilis: `node buat-rilis.js`.

### Batasan

- Ekstensi browser **tidak bisa melihat apakah cookie dipakai di perangkat lain**. Itu hanya terlihat oleh server situs, lewat halaman "aktivitas login" atau "perangkat yang masuk". Tombol "Keluar dari semua perangkat" di peringatan membuka halaman itu.
- Pemeriksaan ekstensi hanya membaca izin yang tercantum, bukan perilaku sebenarnya. Ekstensi tanpa izin cookies masih bisa membaca cookie biasa lewat skrip di halaman, jadi ini bukan jaminan keamanan penuh.
- Ekstensi pribadi yang dipasang lewat Load unpacked (seperti ekstensi ini) tidak diperiksa terhadap dirinya sendiri.
- Deteksi domain mirip adalah tebakan dari bentuk nama domain. Daftar domain resmi yang dikecualikan dan daftar akhiran berisiko hanya sebagian; kalau ada situs sah yang salah ditandai, masukkan ke daftar putih. Nama merek yang pendek (kurang dari 5 huruf, misalnya `x.com`) tidak diperiksa karena terlalu sering salah cocok.
- Ekstensi tidak punya cara mengetahui situs induk sebuah cookie, jadi cookie pihak ketiga biasa (iklan, pelacak) tidak dinilai. Yang dinilai adalah apakah domainnya meniru situs yang kamu pantau.

### Penting

Menghapus cookie di browser **tidak membatalkan sesi di server**. Kalau curiga akun
dibajak: ganti password dan keluar dari semua perangkat di situs terkait.

### Ide pengembangan berikutnya

1. Panduan darurat di popup: daftar langkah berurutan saat ada peringatan (ganti password dari perangkat bersih, keluar dari semua perangkat, periksa ekstensi, pindai antivirus)
2. Ekspor/impor pengaturan (situs, nama cookie, daftar putih)

### Lindungi situs ini (tanpa mengetik)

Di tab Bersihkan, kartu **Tab ini** membaca nama situs dari tab yang sedang kamu buka. Klik **Lindungi situs ini**:
- Ekstensi menampilkan **nama** cookie situs itu (isinya tidak pernah dibaca). Yang mirip login (`sessionid`, `token`, `auth`, dst.) sudah tercentang; pelacak seperti `_ga` diberi keterangan dan tidak dicentang. Kamu bisa mengubah pilihannya.
- Pilih kapan login dihapus: saat tab ditutup, saat browser dibuka, atau keduanya. Ada opsi **hapus SEMUA cookie situs**.
- Opsi **hapus juga data penyimpanan situs (localStorage)** untuk situs yang menyimpan login di sana (misalnya yang tidak punya cookie login terlihat). Ini butuh izin opsional `browsingData`, hanya menghapus, hanya untuk alamat tab yang kamu lindungi (subdomain lain perlu dilindungi dari tabnya sendiri), dan riwayat penelusuran tidak disentuh.
- **Data penyimpanan (localStorage) bisa dipilih per kunci.** Ekstensi menampilkan NAMA kunci di tab yang sedang dibuka (misalnya `token`), kamu centang mana yang dihapus. Butuh izin opsional `scripting`, dan nilainya tidak pernah dibaca. Batasan: penghapusan per kunci hanya jalan saat tab situsnya masih terbuka (lewat Hapus sekarang atau tombol darurat); setelah tab ditutup browser tidak mengizinkan ekstensi menyentuh kunci itu, jadi untuk hapus otomatis saat tab ditutup pakai opsi hapus SEMUA data penyimpanan.
- Semua situs yang dilindungi ada di daftar **Situs terlindungi**, dengan tombol nyala/mati per situs, Hapus sekarang, dan Hapus dari daftar. Tombol darurat ikut mencakup situs-situs ini.

Batas: login yang disimpan situs di tempat selain cookie dan `localStorage` (misalnya `indexedDB`) tidak terjangkau. Pencocokan dan penghapusan sudah diuji otomatis di Chromium dan dicoba manual di Chrome dan Edge oleh pembuatnya.

### Tombol darurat dan hapus saat tab ditutup

- **Keluarkan semua login sekarang** (tab Bersihkan): menghapus cookie login semua situs yang terdeteksi di browser ini, dengan konfirmasi. Ini tidak mengeluarkan login di perangkat lain; untuk itu ganti password dan pilih "keluar dari semua perangkat" di situsnya.
- **Saat tab ditutup**: tombol di tiap situs yang terdeteksi. Situs yang dipilih dihapus cookie login-nya saat tab terakhir situs itu ditutup (tidak dihapus kalau masih ada tab lain dari situs yang sama). Hanya situs yang kamu pilih yang dipantau; ekstensi mencatat nama situsnya (bukan alamat lengkap) di memori sesi, hilang saat browser ditutup. Tidak ada izin baru: alamat tab dibaca lewat izin situs yang sudah ada, bukan izin "tabs".
- Batas: kalau seluruh browser ditutup sekaligus, penghapusan saat tab ditutup bisa tidak sempat berjalan. Tambahkan situs yang sama ke daftar "saat browser dibuka" supaya pasti.

### Ekstensi yang dipasang program lain

Di tab Ekstensi (setelah izin opsional `management` kamu aktifkan), ekstensi lain ditandai juga kalau: **dipasang oleh program lain** di komputer (`sideload`, jalur yang dipakai software Windows), **dipasang lewat kebijakan sistem** (`admin`, registry/Group Policy), atau **bisa berkomunikasi dengan program di komputer** (`nativeMessaging`), selain yang berizin cookies atau lalu lintas web. Notifikasi muncul saat ekstensi seperti itu baru dipasang atau diaktifkan.

Batas yang jujur: ekstensi browser tidak bisa melihat program atau service Windows. Yang terlihat hanya jejaknya di browser (ekstensi yang mereka selipkan). Situs web juga tidak bisa membaca cookie situs lain; yang bisa membaca cookie semua situs adalah ekstensi, dan itulah yang dipantau di sini. Ekstensi ini tidak punya skrip permanen di halaman web (tanpa `content_scripts`), jadi tidak bisa melihat iklan atau skrip yang membaca cookie di dalam halaman (itu sengaja, supaya permukaan serangannya kecil). Satu-satunya skrip yang dijalankan di halaman adalah fungsi kecil untuk membaca NAMA kunci `localStorage` atau menghapus kunci yang kamu pilih, dan hanya saat kamu menekan tombolnya.

### Tes otomatis

Jalankan `node tests/jalankan.js` (tanpa browser, tanpa instalasi). Tes ini juga berjalan otomatis di GitHub Actions setiap ada perubahan ke `main` atau pull request, bersama `periksa-keamanan.js`. Folder `tests` dan `.github` tidak ikut masuk ke zip rilis.

</details>
