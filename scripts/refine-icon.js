
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputFilename = 'seraphim-logo-line.png';
const inputPath = path.join(process.cwd(), 'public/icons', inputFilename);
const outputFilename = 'seraphim-logo-line-refined.png';
const outputPath = path.join(process.cwd(), 'public/icons', outputFilename);

async function refineIcon() {
    try {
        console.log(`Processing ${inputPath}...`);

        // 1. First, Trim the whitespace (crop to content)
        // We use a high threshold to catch "near white" if there's compression artifacts, 
        // but these are PNGs so they should be clean. Default 10 is usually safe.
        const image = sharp(inputPath);
        const trimmedBuffer = await image
            .trim({ threshold: 15 })
            .toBuffer();

        console.log('Trimmed whitespace.');

        // 2. Create Transparency Mask
        // Convert to grayscale -> Threshold -> Negate
        // White background (>240) becomes 0 (Transparent)
        // Content (<=240) becomes 255 (Opaque)
        const trimmed = sharp(trimmedBuffer);
        const maskBuffer = await trimmed.clone()
            .grayscale()
            .threshold(250) // Aggressive threshold for white background
            .negate()
            .toBuffer();

        // 3. Combine
        // Ensure we start with pure RGB (no existing alpha) and join the new mask
        // We use removeAlpha() to ensure we are working with 3 channels
        await trimmed
            .removeAlpha()
            .joinChannel(maskBuffer)
            .toFile(outputPath);

        console.log(`Saved refined icon to ${outputPath}`);

        // Allow user to check sizes too?
        const meta = await sharp(outputPath).metadata();
        console.log(`New dimensions: ${meta.width}x${meta.height}`);

    } catch (err) {
        console.error('Error processing icon:', err);
    }
}

refineIcon();
