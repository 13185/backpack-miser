import Phaser from 'phaser';
import type { MonsterKind } from '../config/monsters';
/** 程序绘制的圆润卡通角色（无外部素材） */
export function drawMonster(g: Phaser.GameObjects.Graphics, kind: MonsterKind, r: number) {
  g.clear();
  const eye = (x: number, y: number, s: number) => { g.fillStyle(0xffffff); g.fillCircle(x, y, s); g.fillStyle(0x221a2e); g.fillCircle(x + s * 0.2, y + s * 0.15, s * 0.55); g.fillStyle(0xffffff); g.fillCircle(x + s * 0.4, y - s * 0.2, s * 0.18); };
  g.fillStyle(0x000000, 0.35); g.fillEllipse(0, r * 0.95, r * 1.8, r * 0.35);
  if (kind === 'slime') {
    g.fillStyle(0x5fd17a); g.fillEllipse(0, r * 0.25, r * 2, r * 1.5); g.fillCircle(0, -r * 0.1, r * 0.8);
    g.fillStyle(0x9ff0b0, 0.8); g.fillEllipse(-r * 0.4, -r * 0.35, r * 0.4, r * 0.25);
    eye(-r * 0.32, r * 0.05, r * 0.2); eye(r * 0.32, r * 0.05, r * 0.2);
    g.fillStyle(0x2a6b3b); g.fillEllipse(0, r * 0.45, r * 0.4, r * 0.18);
  } else if (kind === 'bat') {
    g.fillStyle(0x6b4aa8);
    g.fillTriangle(-r * 0.3, -r * 0.1, -r * 1.5, -r * 0.7, -r * 1.1, r * 0.5);
    g.fillTriangle(r * 0.3, -r * 0.1, r * 1.5, -r * 0.7, r * 1.1, r * 0.5);
    g.fillStyle(0x8b6ad0); g.fillCircle(0, 0, r * 0.75);
    g.fillTriangle(-r * 0.55, -r * 0.4, -r * 0.35, -r * 1.05, -r * 0.1, -r * 0.6);
    g.fillTriangle(r * 0.55, -r * 0.4, r * 0.35, -r * 1.05, r * 0.1, -r * 0.6);
    eye(-r * 0.28, -r * 0.05, r * 0.2); eye(r * 0.28, -r * 0.05, r * 0.2);
    g.fillStyle(0xffffff); g.fillTriangle(-r * 0.15, r * 0.3, -r * 0.05, r * 0.3, -r * 0.1, r * 0.45); g.fillTriangle(r * 0.15, r * 0.3, r * 0.05, r * 0.3, r * 0.1, r * 0.45);
  } else if (kind === 'skeleton') {
    g.fillStyle(0x7a8794); g.fillRoundedRect(-r * 0.7, r * 0.2, r * 1.4, r * 0.8, r * 0.25);
    g.fillStyle(0xf2ead8); g.fillCircle(0, -r * 0.15, r * 0.8);
    g.fillStyle(0x8e9aa6); g.fillRoundedRect(-r * 0.85, -r * 0.95, r * 1.7, r * 0.5, r * 0.2);
    g.fillStyle(0xffd45c); g.fillRect(-r * 0.08, -r * 1.2, r * 0.16, r * 0.3);
    g.fillStyle(0x3a2e45); g.fillCircle(-r * 0.3, -r * 0.1, r * 0.2); g.fillCircle(r * 0.3, -r * 0.1, r * 0.2);
    g.fillStyle(0x7ff0ff); g.fillCircle(-r * 0.3, -r * 0.1, r * 0.07); g.fillCircle(r * 0.3, -r * 0.1, r * 0.07);
    g.fillStyle(0x3a2e45); for (let i = -2; i <= 2; i++) g.fillRect(i * r * 0.12 - r * 0.03, r * 0.3, r * 0.06, r * 0.14);
  } else if (kind === 'brute') {
    g.fillStyle(0xc9784a); g.fillCircle(0, r * 0.1, r * 0.95);
    g.fillStyle(0xe8a06e); g.fillEllipse(0, r * 0.35, r * 1.1, r * 0.8);
    g.fillStyle(0xf2ead8); g.fillTriangle(-r * 0.7, -r * 0.6, -r * 0.95, -r * 1.25, -r * 0.4, -r * 0.8); g.fillTriangle(r * 0.7, -r * 0.6, r * 0.95, -r * 1.25, r * 0.4, -r * 0.8);
    g.fillStyle(0x5a3a2a); g.fillRect(-r * 0.6, -r * 0.42, r * 0.45, r * 0.1); g.fillRect(r * 0.15, -r * 0.42, r * 0.45, r * 0.1);
    eye(-r * 0.35, -r * 0.2, r * 0.17); eye(r * 0.35, -r * 0.2, r * 0.17);
    g.fillStyle(0xffffff); g.fillTriangle(-r * 0.3, r * 0.35, -r * 0.18, r * 0.35, -r * 0.24, r * 0.15); g.fillTriangle(r * 0.3, r * 0.35, r * 0.18, r * 0.35, r * 0.24, r * 0.15);
  } else if (kind === 'harbor_patrol') {
    g.fillStyle(0x4a6a8a); g.fillRoundedRect(-r * 0.7, r * 0.1, r * 1.4, r * 0.9, r * 0.2);
    g.fillStyle(0xffd9b0); g.fillCircle(0, -r * 0.2, r * 0.55);
    g.fillStyle(0x2a4058); g.fillRoundedRect(-r * 0.6, -r * 0.85, r * 1.2, r * 0.35, r * 0.1);
    eye(-r * 0.22, -r * 0.25, r * 0.14); eye(r * 0.22, -r * 0.25, r * 0.14);
    g.fillStyle(0xc0d0e0); g.fillRect(r * 0.55, -r * 0.1, r * 0.15, r * 0.9);
  } else if (kind === 'tide_crab') {
    g.fillStyle(0xd4784a); g.fillEllipse(0, r * 0.2, r * 2.0, r * 1.2);
    g.fillStyle(0xe8a06e); g.fillCircle(0, -r * 0.1, r * 0.7);
    for (const sx of [-1, 1]) {
      g.fillStyle(0xc06838); g.fillTriangle(sx * r * 0.9, 0, sx * r * 1.5, -r * 0.5, sx * r * 1.3, r * 0.4);
    }
    eye(-r * 0.25, -r * 0.15, r * 0.16); eye(r * 0.25, -r * 0.15, r * 0.16);
    g.fillStyle(0x6ab0d0, 0.5); g.fillEllipse(0, r * 0.55, r * 1.6, r * 0.25);
  } else if (kind === 'salt_captain') {
    g.fillStyle(0x3a4a5a); g.fillRoundedRect(-r * 0.85, r * 0.05, r * 1.7, r * 1.0, r * 0.2);
    g.fillStyle(0xffd9b0); g.fillCircle(0, -r * 0.25, r * 0.6);
    g.fillStyle(0x1a2838); g.fillTriangle(-r * 0.7, -r * 0.5, 0, -r * 1.35, r * 0.7, -r * 0.5);
    g.fillStyle(0xe8c060); g.fillCircle(0, -r * 0.85, r * 0.12);
    eye(-r * 0.25, -r * 0.3, r * 0.15); eye(r * 0.25, -r * 0.3, r * 0.15);
    g.fillStyle(0x6ab0d0, 0.45); g.fillEllipse(0, r * 0.7, r * 1.8, r * 0.3);
  } else if (kind === 'furnace_colossus') {
    g.fillStyle(0x6a3a2a); g.fillRoundedRect(-r, -r * 0.2, r * 2, r * 1.3, r * 0.2);
    g.fillStyle(0xff6a30); g.fillCircle(0, -r * 0.4, r * 0.55);
    g.fillStyle(0xffd080); g.fillCircle(0, -r * 0.4, r * 0.25);
    eye(-r * 0.25, -r * 0.5, r * 0.12); eye(r * 0.25, -r * 0.5, r * 0.12);
  } else if (kind === 'golden_heart') {
    g.fillStyle(0xffd45c); g.fillCircle(0, 0, r * 0.95);
    g.fillStyle(0xff8a3a); g.fillCircle(0, 0, r * 0.55);
    g.fillStyle(0xfff0c0); g.fillCircle(-r * 0.2, -r * 0.2, r * 0.2);
  } else if (kind === 'silence_warden' || kind === 'debt_regent' || kind === 'priest') {
    g.fillStyle(0xd8d0e8); g.fillRoundedRect(-r * 0.7, r * 0.05, r * 1.4, r * 1.0, r * 0.2);
    g.fillStyle(0xffd9b0); g.fillCircle(0, -r * 0.25, r * 0.55);
    g.fillStyle(0x3a2a5a); g.fillTriangle(-r * 0.6, -r * 0.5, 0, -r * 1.2, r * 0.6, -r * 0.5);
    eye(-r * 0.2, -r * 0.3, r * 0.12); eye(r * 0.2, -r * 0.3, r * 0.12);
  } else if (kind === 'iron_warden' || kind === 'spider_queen' || kind === 'tax_lord') {
    g.fillStyle(0x8a9098); g.fillRoundedRect(-r * 0.85, 0, r * 1.7, r * 1.0, r * 0.15);
    g.fillStyle(0xffd9b0); g.fillCircle(0, -r * 0.35, r * 0.55);
    eye(-r * 0.22, -r * 0.4, r * 0.14); eye(r * 0.22, -r * 0.4, r * 0.14);
    g.fillStyle(0xffd45c); g.fillRect(-r * 0.5, r * 0.3, r, r * 0.12);
  } else if (kind === 'mirror_auditor') {
    g.fillStyle(0xc8b890); g.fillRoundedRect(-r * 0.9, -r * 0.2, r * 1.8, r * 1.2, r * 0.15);
    g.fillStyle(0x8ab0c8); g.fillRect(-r * 0.7, -r * 0.9, r * 0.55, r * 0.9); g.fillRect(r * 0.15, -r * 0.9, r * 0.55, r * 0.9);
    g.fillStyle(0xffd9b0); g.fillCircle(0, -r * 0.35, r * 0.45);
    eye(-r * 0.18, -r * 0.4, r * 0.12); eye(r * 0.18, -r * 0.4, r * 0.12);
    g.fillStyle(0xe8d080); g.fillRect(-r * 0.15, r * 0.2, r * 0.3, r * 0.5);
  } else if (kind === 'smuggler') {
    g.fillStyle(0x5a4a3a); g.fillRoundedRect(-r * 0.65, r * 0.1, r * 1.3, r * 0.85, r * 0.2);
    g.fillStyle(0xffd9b0); g.fillCircle(0, -r * 0.2, r * 0.5);
    g.fillStyle(0x3a2a1a); g.fillCircle(0, -r * 0.7, r * 0.35);
    eye(-r * 0.2, -r * 0.25, r * 0.13); eye(r * 0.2, -r * 0.25, r * 0.13);
  } else {
    g.fillStyle(0x8a5a2b); g.fillRoundedRect(-r * 1.05, -r * 0.1, r * 2.1, r * 1.05, r * 0.15);
    g.fillStyle(0xa8703a); g.fillRoundedRect(-r * 1.05, -r * 0.95, r * 2.1, r * 0.6, { tl: r * 0.5, tr: r * 0.5, bl: 0, br: 0 });
    g.fillStyle(0xffd45c); g.fillRect(-r * 1.05, -r * 0.4, r * 2.1, r * 0.12); g.fillRect(-r * 0.12, -r * 0.95, r * 0.24, r * 1.9);
    g.fillRoundedRect(-r * 0.2, -r * 0.2, r * 0.4, r * 0.4, r * 0.08);
    g.fillStyle(0x3a1d10); g.fillRect(-r * 0.95, -r * 0.3, r * 1.9, r * 0.25);
    g.fillStyle(0xffffff); for (let i = 0; i < 7; i++) { const x = -r * 0.9 + i * r * 0.28; g.fillTriangle(x, -r * 0.3, x + r * 0.24, -r * 0.3, x + r * 0.12, -r * 0.12); }
    eye(-r * 0.5, -r * 0.65, r * 0.16); eye(r * 0.5, -r * 0.65, r * 0.16);
    g.fillStyle(0xffe58a); g.fillCircle(-r * 0.7, r * 0.6, r * 0.1); g.fillCircle(r * 0.75, r * 0.5, r * 0.08);
  }
}
export function drawHero(g: Phaser.GameObjects.Graphics, r: number) {
  g.clear();
  g.fillStyle(0x000000, 0.35); g.fillEllipse(0, r * 0.95, r * 1.6, r * 0.3);
  g.fillStyle(0x8a5a2b); g.fillRoundedRect(-r * 1.0, -r * 0.4, r * 0.7, r * 1.1, r * 0.2); // 背包
  g.fillStyle(0xffd45c); g.fillCircle(-r * 0.65, r * 0.1, r * 0.12);
  g.fillStyle(0x3d6fb6); g.fillRoundedRect(-r * 0.5, -r * 0.1, r * 1.0, r * 1.0, r * 0.3);
  g.fillStyle(0xffd9b0); g.fillCircle(0, -r * 0.45, r * 0.55);
  g.fillStyle(0xb8c4d0); g.slice(0, -r * 0.5, r * 0.6, Math.PI, 0, false); g.fillPath();
  g.fillStyle(0xffd45c); g.fillRect(-r * 0.62, -r * 0.55, r * 1.24, r * 0.1);
  g.fillStyle(0x221a2e); g.fillCircle(r * 0.12, -r * 0.35, r * 0.08); g.fillCircle(r * 0.38, -r * 0.35, r * 0.08);
  g.fillStyle(0xff9a8a, 0.7); g.fillCircle(r * 0.45, -r * 0.2, r * 0.08);
  g.lineStyle(r * 0.05, 0x221a2e); g.beginPath(); g.arc(r * 0.25, -r * 0.22, r * 0.12, 0.2, Math.PI - 0.2); g.strokePath();
}
