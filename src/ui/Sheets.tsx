import { sheet } from './store'
import { Sheet } from './primitives'
export function Sheets() {
  const open = sheet.value
  return <Sheet open={open !== null} onClose={() => (sheet.value = null)} title={open ?? ''}><p class="dim">…</p></Sheet>
}
