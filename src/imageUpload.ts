export const MAX_IMAGE_BYTES = 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function imageFileError(file: {size: number; type: string}): string | null {
  if (!imageTypes.has(file.type)) return 'เลือกรูป JPG, PNG, WebP หรือ GIF เท่านั้น';
  if (!Number.isFinite(file.size) || file.size <= 0) return 'ไฟล์รูปภาพนี้ว่าง กรุณาเลือกไฟล์ใหม่';
  if (file.size > MAX_IMAGE_BYTES) return 'รูปภาพต้องมีขนาดไม่เกิน 1 MB กรุณาลดขนาดแล้วเลือกใหม่';
  return null;
}

export function hasImageSignature(bytes: Uint8Array, type: string): boolean {
  const matches = (values: number[], offset = 0) => values.every((v, i) => bytes[offset + i] === v);
  if (type === 'image/png') return matches([137, 80, 78, 71, 13, 10, 26, 10]);
  if (type === 'image/jpeg') return matches([255, 216, 255]);
  if (type === 'image/gif') return matches([71, 73, 70, 56]) && [55, 57].includes(bytes[4]) && bytes[5] === 97;
  if (type === 'image/webp') return matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8);
  return false;
}

/** Local preview only. A future upload API must validate files independently. */
export async function readImageFile(file: File): Promise<string> {
  const issue = imageFileError(file);
  if (issue) throw new Error(issue);
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.arrayBuffer()); }
  catch { throw new Error('อ่านไฟล์นี้ไม่ได้ กรุณาเลือกไฟล์อีกครั้ง'); }
  if (!hasImageSignature(bytes, file.type)) throw new Error('เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพ กรุณาเลือกรูปที่เปิดดูได้');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  const data = `data:${file.type};base64,${btoa(binary)}`;
  await new Promise<void>((resolve, reject) => {
    const picture = new Image();
    const timeout = setTimeout(() => { picture.onload = null; picture.onerror = null; reject(new Error('อ่านรูปภาพใช้เวลานานเกินไป กรุณาเลือกใหม่')); }, 10000);
    picture.onload = () => {
      clearTimeout(timeout);
      if (picture.naturalWidth > 0 && picture.naturalHeight > 0) resolve();
      else reject(new Error('ไม่พบขนาดรูปภาพ กรุณาเลือกไฟล์ใหม่'));
    };
    picture.onerror = () => { clearTimeout(timeout); reject(new Error('ไฟล์รูปภาพเสียหรือเปิดไม่ได้ กรุณาเลือกไฟล์ใหม่')); };
    picture.src = data;
  });
  return data;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

