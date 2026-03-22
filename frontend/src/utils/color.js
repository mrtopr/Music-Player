/**
 * Extracts the dominant color from an image URL using a hidden Canvas.
 * @param {string} url - The cross-origin image URL
 * @returns {Promise<number[]>} - Returns [r, g, b] array
 */
export function extractDominantColor(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Downscale to 50x50 to make pixel reading incredibly fast
            canvas.width = 50;
            canvas.height = 50;

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, 50, 50);

            let data;
            try {
                data = ctx.getImageData(0, 0, 50, 50).data;
            } catch (e) {
                // If CORS blocks us despite Anonymous, fallback immediately
                return reject(e);
            }

            let rSum = 0, gSum = 0, bSum = 0;
            let validPixels = 0;

            // Step by 4 bytes (R, G, B, A)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Skip fully transparent
                if (a < 128) continue;

                // Skip very dark or very bright colors (muds)
                const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                if (luma < 25 || luma > 230) continue;

                /*
                 * Determine how "grey" the pixel is.
                 * Max diff between color channels provides saturation proxy.
                 * Skip desaturated pixels to find vibrant colors.
                 */
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                if (max - min < 20) continue;

                rSum += r;
                gSum += g;
                bSum += b;
                validPixels++;
            }

            // If the algorithm washed out all pixels, fallback to average everything
            if (validPixels === 0) {
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 0) {
                        rSum += data[i];
                        gSum += data[i + 1];
                        bSum += data[i + 2];
                        validPixels++;
                    }
                }
            }

            if (validPixels === 0) {
                // Return default Gold if image is somehow 100% transparent or empty
                return resolve([212, 175, 55]);
            }

            const rAvg = Math.floor(rSum / validPixels);
            const gAvg = Math.floor(gSum / validPixels);
            const bAvg = Math.floor(bSum / validPixels);

            resolve([rAvg, gAvg, bAvg]);
        };

        img.onerror = (e) => reject(e);
        img.src = url;
    });
}
