// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arybil
// The committed PNG is rendered from our original artwork/news.svg.
// Runtime: Node 22, standard library only. No network or build tools.
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

// CommonJS also runs on Node 22 builds with type stripping disabled.
const outputDirectory = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const artwork = readFileSync(resolve(__dirname, 'entry.png'));
const signature = Buffer.from('89504e470d0a1a0a', 'hex');
if (artwork.length < 33 || artwork.length > 1048576 || !artwork.subarray(0, 8).equals(signature)) {
  throw new Error('The shipped artwork must have a PNG header and fit within 1 MiB.');
}
const width = artwork.readUInt32BE(16);
const height = artwork.readUInt32BE(20);
if (!width || !height || width > 1024 || height > 1024) {
  throw new Error('The shipped artwork exceeds the 1024 by 1024 pixel limit.');
}
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(resolve(outputDirectory, 'entry.png'), artwork);
