#!/usr/bin/env node

/**
 * Prepare package.json for production build
 * Changes main entry point from ./out/extension.js to ./dist/extension.js
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Change main to dist for production
packageJson.main = './dist/extension.js';

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✓ Updated package.json main to ./dist/extension.js');
