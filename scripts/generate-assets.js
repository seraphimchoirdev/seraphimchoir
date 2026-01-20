
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_ICON = path.join(process.cwd(), 'public/seraphim_on_icon.png');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const IOS_DIR = path.join(PUBLIC_DIR, 'ios');

if (!fs.existsSync(IOS_DIR)) {
    fs.mkdirSync(IOS_DIR, { recursive: true });
}

const IOS_SPLASH_SCREENS = [
    { width: 2048, height: 2732, name: 'ipad_pro_12.9' },
    { width: 1668, height: 2388, name: 'ipad_pro_11' },
    { width: 1640, height: 2360, name: 'ipad_air_10.9' },
    { width: 1536, height: 2048, name: 'ipad_9.7' },
    { width: 1290, height: 2796, name: 'iphone_14_pro_max' },
    { width: 1284, height: 2778, name: 'iphone_13_pro_max' }, // 12 Pro Max too
    { width: 1179, height: 2556, name: 'iphone_14_pro' },
    { width: 1170, height: 2532, name: 'iphone_13_pro' }, // 13, 13 Pro, 12, 12 Pro
    { width: 1242, height: 2688, name: 'iphone_11_pro_max' }, // XS Max
    { width: 1125, height: 2436, name: 'iphone_11_pro' }, // X, XS, 11 Pro
    { width: 828, height: 1792, name: 'iphone_11' }, // XR, 11
    { width: 1242, height: 2208, name: 'iphone_8_plus' }, // 6+, 6s+, 7+, 8+
    { width: 750, height: 1334, name: 'iphone_8' }, // 6, 6s, 7, 8
    { width: 640, height: 1136, name: 'iphone_se' }
];

async function generate() {
    console.log('Generating PWA assets...');

    // 1. Standard PWA Icons and Apple Touch Icon
    const sizes = [
        { w: 192, h: 192, name: 'icon-192x192.png' },
        { w: 512, h: 512, name: 'icon-512x512.png' },
        { w: 192, h: 192, name: 'icon-maskable-192x192.png', padding: true },
        { w: 512, h: 512, name: 'icon-maskable-512x512.png', padding: true },
        { w: 180, h: 180, name: 'apple-touch-icon.png' }, // Apple Touch Icon
    ];

    for (const size of sizes) {
        const pipeline = sharp(SOURCE_ICON).resize(size.w, size.h);

        let buffer;
        if (size.padding) {
            // For maskable icons, we might want to add safe area if the source doesn't have it.
            // Assuming source IS the full bleed icon.
            // Actually, maskable icons are recommended to have important content in center 80%.
            // Since our icon is on white background, it's safe.
            // Let's just resize.
            buffer = await pipeline.toBuffer();
        } else {
            buffer = await pipeline.toBuffer();
        }

        await sharp(buffer).toFile(path.join(PUBLIC_DIR, size.name));
        console.log(`Generated ${size.name}`);
    }

    // 2. iOS Splash Screens
    // For each size, we want to place the logo in the center of a white canvas.
    // Logo size should be appropriate (e.g., 20-30% of width or fixed size?).
    // Usually fixed visual size looks better across devices.
    // Let's say logo is 192px or 256px wide visually.

    // Using a base logo size of around 256px for phones, maybe larger for tablets.
    // Simple heuristic: logo width = min(screen_width * 0.4, 300)

    const sourceBuffer = await sharp(SOURCE_ICON).toBuffer();

    let linkTags = [];

    for (const screen of IOS_SPLASH_SCREENS) {
        // User requested larger icons (referenced 512px).
        // Previous cap was 300px which is small on high-res.
        // We'll use 40% of screen width, but at least 300px, and cap at 802px if needed?
        // Actually, let's just use 40% of width which scales nicely.
        // e.g. 640 -> 256, 1290 -> 516, 2048 -> 819.
        const logoSize = Math.round(screen.width * 0.5);

        const logoResized = await sharp(sourceBuffer)
            .resize(Math.round(logoSize))
            .toBuffer();

        const fileName = `splash-${screen.width}x${screen.height}.png`;
        const filePath = path.join(IOS_DIR, fileName);

        await sharp({
            create: {
                width: screen.width,
                height: screen.height,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        })
            .composite([{ input: logoResized, gravity: 'center' }])
            .toFile(filePath);

        console.log(`Generated ${fileName}`);

        // Generate Link Tag
        // <link rel="apple-touch-startup-image" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/ios/splash-640x1136.png">
        // Calculating ratio is tricky without exact mapping, simpler to output generic media query based on dimension?
        // Actually easiest is to just provide the dimensions in the media.
        // But iOS expects device-width/height which are logical points, not pixels.
        // For simplicity in this script, we'll just log the filename for map in layout.

        // Actually, let's try to generate the Next.js metadata format or HTML tags.
        // It's better to verify files first.
    }

    console.log('All assets generated.');
}

generate().catch(console.error);
