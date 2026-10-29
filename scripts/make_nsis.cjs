// 用 Linux 原生 makensis 生成 Windows NSIS 安装包（无需 wine）。存档在 %APPDATA%\背包守财奴，卸载不删除。
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const root = path.resolve(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;
const base = path.join(os.homedir(), '.cache/electron-builder');
const dir = fs.readdirSync(base).filter(d => d.startsWith('nsis-')).map(d => path.join(base, d)).flatMap(d => fs.readdirSync(d).map(x => path.join(d, x))).find(d => fs.existsSync(path.join(d, 'linux/makensis')));
if (!dir) throw new Error('makensis not found; run electron-builder --win nsis once to download');
const out = path.join(root, 'release/desktop', `BackpackMiser-Setup-${version}.exe`);
execFileSync(path.join(dir, 'linux/makensis'), ['-V2', `-DVERSION=${version}`, `-DOUTFILE=${out}`, `-DSRCDIR=${path.join(root, 'release/desktop/win-unpacked')}`, path.join(root, 'build/installer.nsi')], { stdio: 'inherit', env: { ...process.env, NSISDIR: dir }, cwd: path.join(root, 'build') });
console.log('NSIS ->', out);
