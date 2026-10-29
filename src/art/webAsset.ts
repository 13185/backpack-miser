/** Repo art path → phone-sized WebP shipped in the web/Electron build. */
export function webAsset(src: string): string {
  return src.replace(/^art\//, 'art/web/').replace(/\.(png|jpe?g)$/i, '.webp');
}
