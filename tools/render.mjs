// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arybil
// Development tool only: librsvg renders our SVG; ImageMagick downsamples it.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const scratch = mkdtempSync(join(tmpdir(), 'news-image-render-'));
try {
  const draft = join(scratch, 'large.png');
  const raster = spawnSync('python3', [resolve(root, 'tools/render-svg.py'), resolve(root, 'artwork/news.svg'), draft], { encoding: 'utf8' });
  if (raster.error || raster.status !== 0) throw new Error(raster.error?.message ?? raster.stderr);
  const result = spawnSync('convert', [
    draft, '-resize', '1024x1024', '-strip', '-interlace', 'none',
    '-define', 'png:exclude-chunks=date,time', '-define', 'png:compression-level=9',
    `PNG24:${resolve(root, 'entry.png')}`,
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
} finally { rmSync(scratch, { recursive: true, force: true }); }
const bytes = readFileSync(resolve(root, 'entry.png'));
const sha256 = createHash('sha256').update(bytes).digest('hex');
writeFileSync(resolve(root, 'artwork/entry.sha256'), `${sha256}  entry.png\n`);
console.log(JSON.stringify({ file: 'entry.png', bytes: bytes.length, sha256 }));
