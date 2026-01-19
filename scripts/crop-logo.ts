
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const INPUT_PATH = path.join(process.cwd(), 'public/images/logo_seraphim_on.png');
const OUTPUT_PATH = path.join(process.cwd(), 'public/images/logo_seraphim_on.png');

async function cropImage() {
    try {
        console.log(`Processing: ${INPUT_PATH}`);

        const image = sharp(INPUT_PATH);
        const { width, height } = await image.metadata();

        if (!width || !height) throw new Error('Could not get image dimensions');

        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });

        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;

        // Scan for non-white pixels
        // Assuming 3 channels (RGB) or 4 (RGBA)
        // We check if pixel is NOT close to pure white (255, 255, 255)
        // Using a threshold to be safe
        const THRESHOLD = 240;
        const channels = info.channels;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const offset = (y * width + x) * channels;
                const r = data[offset];
                const g = data[offset + 1];
                const b = data[offset + 2];

                // Check if pixel is effectively "empty" (white)
                const isWhite = r > THRESHOLD && g > THRESHOLD && b > THRESHOLD;

                if (!isWhite) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // Add comfortable padding to avoid looking too cramped
        const padding = 30;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(width, maxX + padding);
        maxY = Math.min(height, maxY + padding);

        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;

        console.log(`Original: ${width}x${height}`);
        console.log(`Crop Box: x=${minX}, y=${minY}, w=${cropWidth}, h=${cropHeight}`);

        if (cropWidth <= 0 || cropHeight <= 0) {
            throw new Error("Cropping area is invalid. Is the image completely white?");
        }

        await image
            .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
            .png()
            .toFile(OUTPUT_PATH + '.temp.png'); // Write to temp first

        fs.renameSync(OUTPUT_PATH + '.temp.png', OUTPUT_PATH);

        console.log(`Successfully cropped image to ${cropWidth}x${cropHeight}`);

    } catch (error) {
        console.error('Error cropping image:', error);
        process.exit(1);
    }
}

cropImage();
