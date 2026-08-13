import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return formatter.format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '')
  : '';

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

export async function compressImage(file: File, MAX_SIZE_BYTES = 4.5 * 1024 * 1024, MAX_DIMENSION = 1200): Promise<File> {
  if (file.size <= MAX_SIZE_BYTES) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');

    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > MAX_DIMENSION) { height = Math.round(height * MAX_DIMENSION / width); width = MAX_DIMENSION; }
      } else {
        if (height > MAX_DIMENSION) { width = Math.round(width * MAX_DIMENSION / height); height = MAX_DIMENSION; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const tryQuality = (q: number) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^/.]+$/, '.jpg');
          const newFile = new File([blob], name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          if (newFile.size <= MAX_SIZE_BYTES) {
            resolve(newFile);
          } else if (q > 0.3) {
            tryQuality(q - 0.2);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', q);
      };
      tryQuality(0.8);
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
