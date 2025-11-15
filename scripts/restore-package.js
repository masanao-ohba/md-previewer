#!/usr/bin/env node

/**
 * Restore package.json after production build
 * Changes main entry point back from ./dist/extension.js to ./out/extension.js
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Change main back to out for development
packageJson.main = './out/extension.js';

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✓ Restored package.json main to ./out/extension.js');
