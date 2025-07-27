#!/usr/bin/env node

// generate-icons.js - Generador de iconos PWA para AFIP Monitor
// Requiere: npm install sharp

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Configuración de iconos
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = 'public/icons';
const SOURCE_ICON = 'public/favicon.svg'; // Tu icono fuente

// Colores del tema AFIP
const COLORS = {
    primary: '#0066cc',
    secondary: '#28a745',
    background: '#ffffff'
};

// Función para crear directorio si no existe
async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
    }
}

// Función para generar icono SVG si no existe
async function generateBaseSVG() {
    const svgContent = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Fondo circular -->
      <circle cx="256" cy="256" r="240" fill="url(#grad)" stroke="${COLORS.background}" stroke-width="8"/>
      
      <!-- Símbolo de documento/factura -->
      <rect x="180" y="140" width="152" height="200" rx="8" fill="${COLORS.background}" opacity="0.9"/>
      
      <!-- Líneas de texto -->
      <rect x="200" y="170" width="80" height="8" rx="2" fill="${COLORS.primary}" opacity="0.8"/>
      <rect x="200" y="190" width="60" height="6" rx="2" fill="${COLORS.primary}" opacity="0.6"/>
      <rect x="200" y="210" width="90" height="6" rx="2" fill="${COLORS.primary}" opacity="0.6"/>
      <rect x="200" y="230" width="70" height="6" rx="2" fill="${COLORS.primary}" opacity="0.6"/>
      
      <!-- Símbolo de verificación/compliance -->
      <circle cx="280" cy="280" r="25" fill="${COLORS.secondary}" opacity="0.9"/>
      <path d="M270 280 L277 287 L290 273" stroke="${COLORS.background}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Texto AFIP -->
      <text x="256" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="24" fill="${COLORS.background}">AFIP</text>
      <text x="256" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${COLORS.background}" opacity="0.9">Monitor</text>
    </svg>
  `;

    await fs.writeFile(SOURCE_ICON, svgContent.trim());
    console.log(`✅ Icono base SVG creado: ${SOURCE_ICON}`);
}

// Función para generar icono PNG desde SVG
async function generateIcon(size) {
    try {
        const outputFile = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

        await sharp(SOURCE_ICON)
            .resize(size, size)
            .png({
                quality: 90,
                compressionLevel: 9,
                adaptiveFiltering: true
            })
            .toFile(outputFile);

        console.log(`✅ Icono generado: ${outputFile}`);
        return outputFile;
    } catch (error) {
        console.error(`❌ Error generando icono ${size}x${size}:`, error.message);
        throw error;
    }
}

// Función para generar favicon.ico
async function generateFavicon() {
    try {
        const faviconPath = 'public/favicon.ico';

        await sharp(SOURCE_ICON)
            .resize(32, 32)
            .png()
            .toFile(faviconPath);

        console.log(`✅ Favicon generado: ${faviconPath}`);
    } catch (error) {
        console.error('❌ Error generando favicon:', error.message);
    }
}

// Función para generar iconos de shortcuts
async function generateShortcutIcons() {
    const shortcuts = [
        { name: 'taxpayer', color: COLORS.primary, symbol: '👤' },
        { name: 'alerts', color: '#dc3545', symbol: '⚠️' },
        { name: 'ai', color: '#6f42c1', symbol: '🤖' },
        { name: 'metrics', color: '#28a745', symbol: '📊' }
    ];

    for (const shortcut of shortcuts) {
        const svgContent = `
      <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="48" r="40" fill="${shortcut.color}"/>
        <text x="48" y="58" text-anchor="middle" font-size="32">${shortcut.symbol}</text>
      </svg>
    `;

        const tempSvg = `temp-${shortcut.name}.svg`;
        await fs.writeFile(tempSvg, svgContent.trim());

        const outputFile = path.join(OUTPUT_DIR, `shortcut-${shortcut.name}-96x96.png`);

        await sharp(tempSvg)
            .resize(96, 96)
            .png()
            .toFile(outputFile);

        await fs.unlink(tempSvg); // Limpiar archivo temporal
        console.log(`✅ Icono de shortcut generado: ${outputFile}`);
    }
}

// Función para generar screenshots de ejemplo
async function generateScreenshots() {
    const screenshotsDir = 'public/screenshots';
    await ensureDir(screenshotsDir);

    // Screenshot desktop (placeholder)
    const desktopSvg = `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#f8f9fa"/>
      <rect x="0" y="0" width="1280" height="60" fill="${COLORS.primary}"/>
      <text x="20" y="35" font-family="Arial" font-size="18" fill="white" font-weight="bold">AFIP Monitor - Dashboard</text>
      
      <!-- Cards de métricas -->
      <rect x="40" y="100" width="280" height="120" rx="8" fill="white" stroke="#dee2e6"/>
      <rect x="340" y="100" width="280" height="120" rx="8" fill="white" stroke="#dee2e6"/>
      <rect x="640" y="100" width="280" height="120" rx="8" fill="white" stroke="#dee2e6"/>
      <rect x="940" y="100" width="280" height="120" rx="8" fill="white" stroke="#dee2e6"/>
      
      <!-- Área de gráficos -->
      <rect x="40" y="250" width="580" height="300" rx="8" fill="white" stroke="#dee2e6"/>
      <rect x="640" y="250" width="580" height="300" rx="8" fill="white" stroke="#dee2e6"/>
      
      <text x="640" y="400" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">Dashboard Principal</text>
    </svg>
  `;

    await fs.writeFile('temp-desktop.svg', desktopSvg.trim());

    await sharp('temp-desktop.svg')
        .resize(1280, 720)
        .png()
        .toFile(path.join(screenshotsDir, 'desktop-dashboard.png'));

    await fs.unlink('temp-desktop.svg');

    // Screenshot mobile (placeholder)
    const mobileSvg = `
    <svg width="360" height="640" viewBox="0 0 360 640" xmlns="http://www.w3.org/2000/svg">
      <rect width="360" height="640" fill="#f8f9fa"/>
      <rect x="0" y="0" width="360" height="50" fill="${COLORS.primary}"/>
      <text x="20" y="30" font-family="Arial" font-size="14" fill="white" font-weight="bold">AFIP Monitor</text>
      
      <!-- Cards móviles -->
      <rect x="20" y="70" width="320" height="80" rx="8" fill="white" stroke="#dee2e6"/>
      <rect x="20" y="170" width="320" height="80" rx="8" fill="white" stroke="#dee2e6"/>
      <rect x="20" y="270" width="320" height="80" rx="8" fill="white" stroke="#dee2e6"/>
      
      <!-- Navegación inferior -->
      <rect x="0" y="580" width="360" height="60" fill="white" stroke="#dee2e6"/>
      
      <text x="180" y="420" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">Vista Móvil</text>
    </svg>
  `;

    await fs.writeFile('temp-mobile.svg', mobileSvg.trim());

    await sharp('temp-mobile.svg')
        .resize(360, 640)
        .png()
        .toFile(path.join(screenshotsDir, 'mobile-dashboard.png'));

    await fs.unlink('temp-mobile.svg');

    console.log('✅ Screenshots generados');
}

// Función principal
async function main() {
    try {
        console.log('🚀 Iniciando generación de iconos PWA para AFIP Monitor...\n');

        // Crear directorio de iconos
        await ensureDir(OUTPUT_DIR);

        // Verificar si existe el icono fuente, si no, crearlo
        try {
            await fs.access(SOURCE_ICON);
            console.log(`✅ Usando icono fuente existente: ${SOURCE_ICON}`);
        } catch {
            console.log('📝 Generando icono base SVG...');
            await generateBaseSVG();
        }

        // Generar iconos principales
        console.log('\n📱 Generando iconos PWA...');
        const promises = ICON_SIZES.map(size => generateIcon(size));
        await Promise.all(promises);

        // Generar favicon
        console.log('\n🌐 Generando favicon...');
        await generateFavicon();

        // Generar iconos de shortcuts
        console.log('\n🔗 Generando iconos de shortcuts...');
        await generateShortcutIcons();

        // Generar screenshots
        console.log('\n📸 Generando screenshots...');
        await generateScreenshots();

        console.log('\n✅ ¡Generación de iconos PWA completada exitosamente!');
        console.log('\n📋 Archivos generados:');
        console.log(`   • ${ICON_SIZES.length} iconos principales (${ICON_SIZES.join('x, ')}x)`);
        console.log('   • 1 favicon.ico');
        console.log('   • 4 iconos de shortcuts');
        console.log('   • 2 screenshots de ejemplo');
        console.log('\n🔧 Para usar en tu aplicación:');
        console.log('   1. Ejecuta: npm install sharp');
        console.log('   2. Ejecuta: node generate-icons.js');
        console.log('   3. Los archivos estarán en public/icons/');

    } catch (error) {
        console.error('\n❌ Error durante la generación:', error.message);
        process.exit(1);
    }
}

// Verificar dependencias
try {
    await import('sharp');
    await main();
} catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('❌ Sharp no está instalado. Ejecuta: npm install sharp');
        process.exit(1);
    } else {
        throw error;
    }
}