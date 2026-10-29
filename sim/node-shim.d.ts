// 仅供 sim 脚本类型检查（未安装 @types/node）
declare module 'fs' {
  export function writeFileSync(path: string | URL, data: string): void;
  export function mkdirSync(path: string | URL, opts?: { recursive?: boolean }): void;
}
