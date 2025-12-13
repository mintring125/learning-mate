/**
 * Image Optimization Script
 * Compresses all images in the public folder to reduce file sizes for web.
 * Run with: node scripts/optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const QUALITY = {
    jpg: 80,  // JPEG quality (0-100)
    png: 80,  // PNG quality (0-100) - uses pngquant compression
    webp: 80, // WebP quality (0-100)
};
const MAX_WIDTH = 1200; // Max width for emblem images
const THEME_MAX_WIDTH = 800; // Max width for theme assets

async function getImageFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await getImageFiles(fullPath));
        } else if (/\.(png|jpg|jpeg|gif)$/i.test(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

async function optimizeImage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(PUBLIC_DIR, filePath);
    const stats = fs.statSync(filePath);
    const originalSize = stats.size;

    // Skip if already small (< 100KB)
    if (originalSize < 100 * 1024 && !filePath.includes('img_bonus')) {
        console.log(`⏭️  Skipping (already small): ${relativePath}`);
        return { skipped: true, originalSize };
    }

    try {
        let pipeline = sharp(filePath);
        const metadata = await pipeline.metadata();

        // Determine max width based on folder
        const maxWidth = filePath.includes('img_bonus') ? MAX_WIDTH : THEME_MAX_WIDTH;

        // Resize if too large
        if (metadata.width > maxWidth) {
            pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true });
        }

        let outputBuffer;
        if (ext === '.png') {
            outputBuffer = await pipeline
                .png({ quality: QUALITY.png, compressionLevel: 9 })
                .toBuffer();
        } else if (ext === '.jpg' || ext === '.jpeg') {
            outputBuffer = await pipeline
                .jpeg({ quality: QUALITY.jpg, mozjpeg: true })
                .toBuffer();
        } else if (ext === '.gif') {
            // Skip GIF optimization (sharp doesn't handle animated GIFs well)
            console.log(`⏭️  Skipping GIF: ${relativePath}`);
            return { skipped: true, originalSize };
        } else {
            console.log(`⏭️  Unknown format: ${relativePath}`);
            return { skipped: true, originalSize };
        }

        const newSize = outputBuffer.length;
        const savings = originalSize - newSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

        // Only save if we actually reduced size
        if (newSize < originalSize) {
            fs.writeFileSync(filePath, outputBuffer);
            console.log(`✅ ${relativePath}: ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (-${savingsPercent}%)`);
            return { skipped: false, originalSize, newSize, savings };
        } else {
            console.log(`⏭️  No savings: ${relativePath}`);
            return { skipped: true, originalSize };
        }
    } catch (error) {
        console.error(`❌ Error processing ${relativePath}:`, error.message);
        return { error: true, originalSize };
    }
}

async function main() {
    console.log('🖼️  Image Optimization Script');
    console.log('============================\n');

    const imageFiles = await getImageFiles(PUBLIC_DIR);
    console.log(`Found ${imageFiles.length} images to process.\n`);

    let totalOriginal = 0;
    let totalNew = 0;
    let optimizedCount = 0;

    for (const file of imageFiles) {
        const result = await optimizeImage(file);
        totalOriginal += result.originalSize || 0;
        if (!result.skipped && !result.error) {
            totalNew += result.newSize || 0;
            optimizedCount++;
        } else {
            totalNew += result.originalSize || 0;
        }
    }

    console.log('\n============================');
    console.log(`📊 Summary:`);
    console.log(`   Images processed: ${imageFiles.length}`);
    console.log(`   Images optimized: ${optimizedCount}`);
    console.log(`   Original total: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   New total: ${(totalNew / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total savings: ${((totalOriginal - totalNew) / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);
