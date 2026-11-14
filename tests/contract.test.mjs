// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arybil
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function inspectPng(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(bytes.length <= 1048576, 'artifact exceeds 1 MiB');
  let offset = 8;
  const chunks = [];
  let width, height, depth, color, interlace;
  const idat = [];
  while (offset < bytes.length) {
    assert.ok(offset + 12 <= bytes.length, 'truncated chunk header');
    const length = bytes.readUInt32BE(offset);
    const end = offset + length + 12;
    assert.ok(end <= bytes.length, 'truncated chunk body');
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const payload = bytes.subarray(offset + 8, end - 4);
    assert.equal(crc32(bytes.subarray(offset + 4, end - 4)), bytes.readUInt32BE(end - 4), `${type} CRC`);
    chunks.push(type);
    if (type === 'IHDR') {
      assert.equal(chunks.length, 1);
      assert.equal(length, 13);
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      depth = payload[8]; color = payload[9]; interlace = payload[12];
      assert.ok(width > 0 && width <= 1024);
      assert.ok(height > 0 && height <= 1024);
      assert.equal(depth, 8, 'authored asset uses 8-bit samples');
      assert.equal(color, 2, 'authored asset uses RGB');
      assert.equal(payload[10], 0); assert.equal(payload[11], 0); assert.equal(interlace, 0);
    }
    if (type === 'IDAT') idat.push(payload);
    if (type === 'IEND') { assert.equal(length, 0); assert.equal(end, bytes.length); }
    offset = end;
  }
  assert.equal(chunks.filter((x) => x === 'IHDR').length, 1);
  assert.equal(chunks.at(-1), 'IEND');
  assert.equal(chunks.filter((x) => x === 'IEND').length, 1);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = 1 + width * 3;
  assert.equal(raw.length, stride * height, 'decoded image rows are complete');
  for (let row = 0; row < height; row++) assert.ok(raw[row * stride] <= 4, 'valid PNG filter');
  return { width, height, bytes: bytes.length, sha256: digest(bytes) };
}

test('entrypoint emits a complete bounded original PNG reproducibly from any cwd', () => {
  assert.ok(existsSync(join(root, 'main.ts')), 'main.ts entrypoint is missing');
  const scratch = mkdtempSync(join(tmpdir(), 'news-image-contract-'));
  try {
    const results = [];
    for (let index = 0; index < 2; index++) {
      const out = join(scratch, `run-${index}`, 'nested');
      const run = spawnSync(process.execPath, [join(root, 'main.ts')], {
        cwd: scratch, encoding: 'utf8', timeout: 60000,
        env: { ...process.env, MAKEFUN_OUTPUT_DIR: out, TZ: 'UTC', LANG: 'C.UTF-8' },
      });
      assert.equal(run.status, 0, run.stderr);
      assert.equal(run.stderr, '');
      assert.deepEqual(readdirSync(out), ['entry.png']);
      const bytes = readFileSync(join(out, 'entry.png'));
      assert.deepEqual(bytes, readFileSync(join(root, 'entry.png')));
      results.push(inspectPng(bytes));
    }
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual([results[0].width, results[0].height], [1024, 1024]);
    console.log(JSON.stringify({ deterministic: true, ...results[0] }));
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test('damaged shipped image is rejected before any artifact is written', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'news-image-damage-'));
  try {
    const bot = join(scratch, 'bot');
    const out = join(scratch, 'output');
    mkdirSync(bot);
    copyFileSync(join(root, 'main.ts'), join(bot, 'main.ts'));
    writeFileSync(join(bot, 'entry.png'), Buffer.from('not the authored PNG'));
    const run = spawnSync(process.execPath, [join(bot, 'main.ts')], {
      cwd: scratch, encoding: 'utf8', timeout: 60000,
      env: { ...process.env, MAKEFUN_OUTPUT_DIR: out },
    });
    assert.notEqual(run.status, 0, 'a damaged asset must fail loudly');
    assert.ok(!existsSync(join(out, 'entry.png')), 'must not emit corrupt artwork');
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test('size and dimension guardrails reject assets beyond the published limits', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'news-image-limits-'));
  try {
    const original = readFileSync(join(root, 'entry.png'));
    const cases = [
      ['wide', (bytes) => { bytes.writeUInt32BE(1025, 16); return bytes; }],
      ['tall', (bytes) => { bytes.writeUInt32BE(1025, 20); return bytes; }],
      ['zero', (bytes) => { bytes.writeUInt32BE(0, 16); return bytes; }],
      ['large', () => Buffer.alloc(1048577)],
    ];
    for (const [name, mutate] of cases) {
      const bot = join(scratch, name);
      const out = join(bot, 'out');
      mkdirSync(bot);
      copyFileSync(join(root, 'main.ts'), join(bot, 'main.ts'));
      writeFileSync(join(bot, 'entry.png'), mutate(Buffer.from(original)));
      const run = spawnSync(process.execPath, [join(bot, 'main.ts')], {
        encoding: 'utf8', timeout: 60000,
        env: { ...process.env, MAKEFUN_OUTPUT_DIR: out },
      });
      assert.notEqual(run.status, 0, `${name} asset should be rejected`);
      assert.ok(!existsSync(join(out, 'entry.png')), `${name} must emit no artifact`);
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});
