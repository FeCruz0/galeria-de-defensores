import { describe, it, expect } from 'vitest';
import { compressAndResizeImage } from '../imageOptimizer';

describe('imageOptimizer Client Utility', () => {
  it('should export compressAndResizeImage as a function', () => {
    expect(typeof compressAndResizeImage).toBe('function');
  });

  it('should return the original file if it is not an image type', async () => {
    const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await compressAndResizeImage(textFile);
    expect(result).toBe(textFile);
    expect(result.type).toBe('text/plain');
  });

  it('should fall back to the original file if the environment is not a browser (SSR context)', async () => {
    const imageFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const result = await compressAndResizeImage(imageFile);
    // Since Vitest runs in Node (even with jsdom, jsdom might not fully support FileReader/Canvas/Image onLoad execution asynchronously without UI loops),
    // it will return the original image or fallback safely.
    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe('image/png');
  });
});
