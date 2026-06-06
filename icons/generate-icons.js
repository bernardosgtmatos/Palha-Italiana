/**
 * Script para gerar os ícones PNG do PWA a partir do SVG.
 * 
 * Uso: node generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SVG_PATH = path.join(__dirname, 'icon.svg');
const OUTPUT_DIR = __dirname;

async function generateIcon(size) {
  const filePath = path.join(OUTPUT_DIR, `icon-${size}.png`);
  await sharp(SVG_PATH)
    .resize(size, size)
    .png()
    .toFile(filePath);
  console.log(`✅ Gerado: icon-${size}.png (${size}x${size})`);
}

async function main() {
  console.log('🎨 Gerando ícones PWA...\n');
  for (const size of SIZES) {
    await generateIcon(size);
  }
  console.log('\n✨ Todos os ícones gerados com sucesso!');
}

main().catch(console.error);
