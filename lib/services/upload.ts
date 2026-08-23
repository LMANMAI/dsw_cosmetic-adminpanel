/**
 * Upload de imágenes a Cloudinary (unsigned), igual que en la app móvil.
 * El preset es "unsigned", así que no hay secretos en el navegador.
 */
const CLOUD_NAME = "dpgrqqshe";
const UPLOAD_PRESET = "yopi-app";

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/** Tamaño máximo aceptado (Cloudinary free tier admite hasta 10 MB). */
export const MAX_MB = 8;

/**
 * Sube un archivo y devuelve la URL pública.
 * @param folder Carpeta en Cloudinary, p. ej. "banners" o "categorias".
 */
export async function uploadImagen(file: File, folder = "banners"): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo tiene que ser una imagen.");
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`La imagen no puede pesar más de ${MAX_MB} MB.`);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`No se pudo subir la imagen (${res.status}).`);
  }
  const data = await res.json();
  return data.secure_url as string;
}
