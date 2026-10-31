/// <reference types="node" />
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSET_VERSION, registryRecords } from '../src/art/registry';
import { getLevel } from '../src/config/v3/levels';
import elementFrames from '../src/art/elementFrames.json';

describe('3.9.0 素材注册', () => {
  it('版本号固定，换图不改第 50 关生命', () => {
    expect(ASSET_VERSION).toBe('3.9.0');
    expect(getLevel(50).hp).toBe(18984);
  });

  it('已接入的文件真实存在，且是带透明通道的 PNG', () => {
    const wired = registryRecords().filter(r => r.status === 'wired' || r.status === 'verified');
    expect(wired.length).toBeGreaterThan(20);
    const hashes = new Set<string>();
    for (const rec of wired) {
      expect(rec.path, rec.id).toBeTruthy();
      expect(existsSync(rec.path!), rec.id).toBe(true);
      if (!rec.path!.endsWith('.png')) continue;
      const buf = readFileSync(rec.path!);
      expect(buf[0], rec.id).toBe(0x89);
      expect(buf.length, rec.id).toBeGreaterThan(4000);
      if (rec.status === 'wired') expect(buf[25], rec.id).toBe(6);
      hashes.add(buf.toString('base64').slice(0, 80));
    }
    expect(hashes.size).toBeGreaterThan(20);
  });

  it('六件衬甲和熔炉四种新姿态都有独立文件', () => {
    const ids = registryRecords().filter(r => r.status === 'wired').map(r => r.id);
    for (const kind of ['travel_lining', 'gilded_lining', 'root_lining', 'tide_lining', 'furnace_lining', 'stone_lining']) {
      expect(ids).toContain(kind);
    }
    for (const pose of ['windup', 'attack', 'hurt', 'defeat']) expect(ids).toContain(`B35.${pose}`);
  });

  it('五元素图集帧数按实际切片记录，不补复制帧', () => {
    expect(elementFrames.fire.frames).toHaveLength(6);
    expect(elementFrames.water.frames).toHaveLength(6);
    expect(elementFrames.wood.frames).toHaveLength(6);
    expect(elementFrames.earth.frames.length).toBeGreaterThanOrEqual(4);
    expect(elementFrames.metal.frames.length).toBeGreaterThanOrEqual(6);
    const files = new Set(Object.values(elementFrames).flatMap(p => p.frames.map(f => f.file)));
    expect(files.size).toBe([...files].length);
  });

  it('其余首领姿态和遗物绘稿仍标缺失或后备', () => {
    const missing = registryRecords().filter(r => r.id.startsWith('B20.') && r.id !== 'B20.idle');
    expect(missing.every(r => r.status === 'missing' && r.path === null)).toBe(true);
    expect(registryRecords().filter(r => r.type === 'relic').every(r => r.status === 'fallback')).toBe(true);
  });
});