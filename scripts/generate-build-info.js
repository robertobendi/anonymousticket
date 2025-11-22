#!/usr/bin/env node

/**
 * Generates build information file with incremental build number
 * This file is used to display build version in the app footer
 */

const fs = require('fs');
const path = require('path');

const buildCounterPath = path.join(__dirname, '..', '.build-counter');
const outputPath = path.join(__dirname, '..', 'public', 'build-info.json');

// Read current build number or start at 1
let buildNumber = 1;
if (fs.existsSync(buildCounterPath)) {
  try {
    const counterContent = fs.readFileSync(buildCounterPath, 'utf8').trim();
    buildNumber = parseInt(counterContent, 10) || 1;
    buildNumber += 1; // Increment for this build
  } catch (error) {
    console.warn('Failed to read build counter, starting at 1:', error);
  }
}

// Save incremented build number
fs.writeFileSync(buildCounterPath, buildNumber.toString(), 'utf8');

const buildInfo = {
  buildNumber: buildNumber,
  buildDate: new Date().toISOString(),
  buildDateFormatted: new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
};

// Ensure public directory exists
const publicDir = path.dirname(outputPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2), 'utf8');

console.log(`✓ Build info generated: Build #${buildNumber} (${buildInfo.buildDateFormatted})`);

