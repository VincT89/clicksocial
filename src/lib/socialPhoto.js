import { acquireImage } from './mobile';

export async function prepareSocialPhoto(value, platform) {
  const asset = await acquireImage(value);
  try {
    const image = new window.Image(); image.src = asset.url;
    await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('L’immagine è troppo grande. Esporta il post dallo Studio e riprova.');
    const ratio = image.naturalWidth / image.naturalHeight;
    if (platform === 'instagram' && (ratio < 0.8 || ratio > 1.91 || image.naturalWidth < 320)) throw new Error('Per un post foto Instagram usa quadrato, 4:5 o 16:9. Modifica il formato nello Studio e salva.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1080 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Non riesco a preparare la foto. Riprova.')), 'image/jpeg', 0.94));
    return new File([blob], 'post-social.jpg', { type: 'image/jpeg' });
  } finally { asset.release(); }
}
