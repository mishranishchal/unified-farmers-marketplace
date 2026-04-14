export type ImageSuitability = {
  accepted: boolean;
  vegetationRatio: number;
  brightness: number;
  reason: string;
};

export async function assessPlantImage(file: File): Promise<ImageSuitability> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to load image.'));
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { accepted: true, vegetationRatio: 0, brightness: 0, reason: 'Canvas analysis unavailable.' };
  }

  ctx.drawImage(image, 0, 0, 96, 96);
  const { data } = ctx.getImageData(0, 0, 96, 96);

  let vegetationPixels = 0;
  let brightPixels = 0;
  let totalPixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    if (alpha < 12) continue;
    totalPixels += 1;
    const brightness = (red + green + blue) / 3;
    if (brightness > 55 && brightness < 220) brightPixels += 1;
    if (green > red * 0.95 && green > blue * 0.95 && green - Math.max(red, blue) > 8) {
      vegetationPixels += 1;
    }
  }

  const vegetationRatio = totalPixels ? vegetationPixels / totalPixels : 0;
  const brightness = totalPixels ? brightPixels / totalPixels : 0;

  if (file.size < 15_000) {
    return {
      accepted: false,
      vegetationRatio,
      brightness,
      reason: 'Image is too small. Upload a clear crop or leaf photo.',
    };
  }

  if (vegetationRatio < 0.08) {
    return {
      accepted: false,
      vegetationRatio,
      brightness,
      reason: 'Upload a close plant image. Current photo does not show enough crop or leaf detail.',
    };
  }

  if (brightness < 0.25) {
    return {
      accepted: false,
      vegetationRatio,
      brightness,
      reason: 'Image is too dark or overcompressed for reliable analysis.',
    };
  }

  return {
    accepted: true,
    vegetationRatio,
    brightness,
    reason: 'Image passed field suitability checks.',
  };
}
