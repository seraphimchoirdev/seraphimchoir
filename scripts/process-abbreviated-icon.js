
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const icons = [
    {
        input: 'public/icons/seraphim-logo-abbreviated.png',
        name: 'seraphim-logo-abbreviated'
    }
];

const sizes = [128, 512];
const outputDir = path.join(process.cwd(), 'public', 'icons');

async function processIcons() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const icon of icons) {
        const inputPath = path.join(process.cwd(), icon.input);

        // 1. Generate sizes
        for (const size of sizes) {
            const outputFilename = `${icon.name}-${size}x${size}.png`;
            const outputPath = path.join(outputDir, outputFilename);

            try {
                await sharp(inputPath)
                    .resize(size, size)
                    .toFile(outputPath);
                console.log(`Generated ${outputFilename}`);
            } catch (err) {
                console.error(`Error processing ${outputFilename}:`, err);
            }
        }

        // 2. Generate Refined (Trimmed + Transparent)
        const refinedFilename = `${icon.name}-refined.png`;
        const refinedPath = path.join(outputDir, refinedFilename);

        try {
            console.log(`Refining ${icon.name}...`);
            const image = sharp(inputPath);

            // Trim whitespace
            const trimmedBuffer = await image
                .trim({ threshold: 15 })
                .toBuffer();

            // Create Transparency Mask (White -> Transparent)
            const trimmed = sharp(trimmedBuffer);
            const maskBuffer = await trimmed.clone()
                .grayscale()
                .threshold(250)
                .negate()
                .toBuffer();

            // Apply mask
            await trimmed
                .removeAlpha()
                .joinChannel(maskBuffer)
                .toFile(refinedPath);

            console.log(`Generated ${refinedFilename}`);

        } catch (err) {
            console.error(`Error refining ${icon.name}:`, err);
        }
    }
}

processIcons();
