// ============================================================
// ekstensi.js
// Fungsi bersama untuk memeriksa ekstensi browser lain.
// Dipakai oleh background.js (lewat importScripts) dan popup.html
// (lewat tag <script>), supaya aturannya cukup ditulis satu kali.
// ============================================================

// Apakah pola alamat ini berarti "semua situs"?
function hostMencakupSemuaSitus(host) {
  return host.some(
    (h) =>
      h === "<all_urls>" ||
      h === "*://*/*" ||
      h === "http://*/*" ||
      h === "https://*/*"
  );
}

// Memeriksa izin satu ekstensi. Hasilnya:
//   alasan: daftar kalimat penjelasan (kosong = tidak ada yang perlu dicurigai)
//   tinggi: true kalau risikonya tinggi
function periksaEkstensi(info) {
  const izin = info.permissions || [];
  const host = info.hostPermissions || [];
  const semuaSitus = hostMencakupSemuaSitus(host);

  const alasan = [];
  let tinggi = false;

  if (izin.includes("cookies")) {
    if (semuaSitus) {
      alasan.push(tr("e.semua"));
      tinggi = true;
    } else {
      alasan.push(tr("e.tertentu"));
    }
  }

  if ((izin.includes("webRequest") || izin.includes("webRequestBlocking")) && semuaSitus) {
    alasan.push(tr("e.lalulintas"));
    tinggi = true;
  }

  return { alasan: alasan, tinggi: tinggi };
}

// Hanya ekstensi biasa yang aktif dan bukan ekstensi ini sendiri yang diperiksa.
function bisaDiperiksa(info) {
  return (
    info.type === "extension" &&
    info.enabled &&
    info.id !== chrome.runtime.id
  );
}

// Izin "management" bersifat opsional: baru diminta saat kamu menyalakan pemeriksaan
// ekstensi lewat popup, dan bisa dicabut kapan saja. Fungsi ini mengecek apakah
// izinnya sedang aktif.
async function adaIzinManajemen() {
  try {
    return await chrome.permissions.contains({ permissions: ["management"] });
  } catch (e) {
    return false;
  }
}

// Daftar ekstensi tepercaya, disimpan sebagai [{ id, nama }].
async function ambilEkstensiTepercaya() {
  const data = await chrome.storage.local.get("ekstensiTepercaya");
  return data.ekstensiTepercaya || [];
}

// Mengambil semua ekstensi aktif yang mencurigakan (di luar yang tepercaya).
async function ambilEkstensiBerisiko() {
  if (!chrome.management || typeof chrome.management.getAll !== "function") throw new Error("Izin management belum diberikan");
  const semua = await chrome.management.getAll();
  const tepercaya = await ambilEkstensiTepercaya();

  return semua
    .filter(bisaDiperiksa)
    .filter((info) => !tepercaya.some((t) => t.id === info.id))
    .map((info) => ({ info: info, ...periksaEkstensi(info) }))
    .filter((hasil) => hasil.alasan.length > 0);
}
