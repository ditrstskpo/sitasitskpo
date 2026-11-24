// Kompres foto di browser sebelum diunggah (PRD: foto maksimal 1 MB per foto).
// Foto dikecilkan ke sisi terpanjang ≤ 1600 px lalu disimpan sebagai JPG dengan kualitas menurun bertahap
// sampai ukurannya ≤ 1 MB. Foto yang sudah kecil (JPG/PNG ≤ 1 MB) dikirim apa adanya.
export const BATAS_FOTO = 1024 * 1024;

function muat(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file).catch(() => muatImg(file));
  return muatImg(file);
}
function muatImg(file) {
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('Foto tidak dapat dibaca browser ini. Jika foto HEIC dari iPhone: buka dengan Safari atau Chrome terbaru, atau di iPhone pilih Pengaturan › Kamera › Format › Paling Kompatibel, lalu foto ulang.')); };
    img.src = url;
  });
}
const keBlob = (kanvas, q) => new Promise((ok) => kanvas.toBlob(ok, 'image/jpeg', q));

export async function kecilkanFoto(file, { maks = BATAS_FOTO, sisi = 1600 } = {}) {
  const jenisOk = /^image\/(jpeg|png)$/i.test(file.type);
  if (!/^image\//i.test(file.type) && !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)) {
    throw new Error('Bagian ini hanya menerima foto (JPG, PNG, atau HEIC dari iPhone).');
  }
  if (jenisOk && file.size <= maks) return file;
  const img = await muat(file);
  let w = img.width, h = img.height;
  const skala = Math.min(1, sisi / Math.max(w, h));
  w = Math.round(w * skala); h = Math.round(h * skala);
  const kanvas = document.createElement('canvas');
  for (let putaran = 0; putaran < 5; putaran++) {
    kanvas.width = w; kanvas.height = h;
    const c = kanvas.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);   // latar putih untuk PNG transparan
    c.drawImage(img, 0, 0, w, h);
    for (const q of [0.86, 0.78, 0.7, 0.62, 0.54, 0.46]) {
      const b = await keBlob(kanvas, q);
      if (b && b.size <= maks) return new File([b], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
    }
    w = Math.round(w * 0.8); h = Math.round(h * 0.8);
  }
  throw new Error('Foto terlalu besar dan tidak dapat dikecilkan di bawah 1 MB. Coba foto lain.');
}

/** Foto iPhone (HEIC/HEIF) atau WebP → JPG ≤ 1 MB sebelum diunggah (server hanya menerima JPG/PNG). Berkas lain dikembalikan apa adanya. */
export const adalahHeic = (f) => /^image\/(heic|heif|heic-sequence|heif-sequence)$/i.test(f?.type || '') || /\.(heic|heif)$/i.test(f?.name || '');
export async function siapkanGambar(file) {
  if (!file) return file;
  if (adalahHeic(file) || /^image\/webp$/i.test(file.type || '') || /\.webp$/i.test(file.name || '')) return kecilkanFoto(file);
  return file;
}
