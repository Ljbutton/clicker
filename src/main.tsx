import { render } from 'preact'
import './styles.css'
import { App } from './ui/App'

render(<App />, document.getElementById('app')!)

// PWA: register the service worker in production builds only (dev server serves from source).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* offline shell is optional */ }) })
}
