#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read assets from root directory  
const rootDir = join(__dirname, '..');

const indexHTML = readFileSync(join(rootDir, 'index.html'), 'utf8');
const styleCSS = readFileSync(join(rootDir, 'style.css'), 'utf8');
const scriptJS = readFileSync(join(rootDir, 'script.js'), 'utf8');

// Generate assets.js file
const assetsContent = `// Auto-generated assets file
// This file is generated from root directory assets to maintain code unification

export const indexHTML = ${JSON.stringify(indexHTML)};
export const styleCSS = ${JSON.stringify(styleCSS)};  
export const scriptJS = ${JSON.stringify(scriptJS)};
`;

writeFileSync(join(__dirname, 'src/assets.js'), assetsContent);

console.log('✅ Assets built successfully!');
console.log(`📏 HTML size: ${(indexHTML.length / 1024).toFixed(1)}KB`);
console.log(`📏 CSS size: ${(styleCSS.length / 1024).toFixed(1)}KB`);
console.log(`📏 JS size: ${(scriptJS.length / 1024).toFixed(1)}KB`);