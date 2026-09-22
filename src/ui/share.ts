/** Share or download a rendered image, and the PWA install prompt hook. */
export async function shareBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: 'Hollowspire Season Card' }); return }
  } catch { /* user cancelled or unsupported; fall through to download */ }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

let deferredPrompt: (Event & { prompt: () => Promise<void> }) | null = null
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e as any })
export const pwaInstall = {
  get available() { return deferredPrompt !== null },
  async prompt() { if (!deferredPrompt) return false; await deferredPrompt.prompt(); deferredPrompt = null; return true },
}
