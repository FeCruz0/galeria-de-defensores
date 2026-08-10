export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 a 1.0
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Comprime e redimensiona uma imagem client-side preservando a proporção de aspecto original.
 * Retorna uma promessa com o novo arquivo otimizado.
 */
export async function compressAndResizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.82,
    outputFormat = 'image/webp',
  } = options;

  return new Promise((resolve) => {
    // Caso não seja um arquivo de imagem válido, retorna o próprio arquivo
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    // Caso o ambiente não possua FileReader ou canvas (ex: execução SSR/Node nos testes), retorna o próprio arquivo
    if (typeof window === 'undefined' || !window.FileReader || !window.document) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcula proporções ideais
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const ext = outputFormat === 'image/webp' ? '.webp' : outputFormat === 'image/jpeg' ? '.jpg' : '.png';
            const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newFileName = `${originalNameWithoutExt}${ext}`;

            const optimizedFile = new File([blob], newFileName, {
              type: outputFormat,
              lastModified: Date.now(),
            });

            resolve(optimizedFile);
          },
          outputFormat,
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
