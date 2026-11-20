import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] || 'http://127.0.0.1:5173/'
const width = Number(process.argv[3] || 1440)
const height = Number(process.argv[4] || 900)
const prefix = process.argv[5] || 'desktop'
const mobile = process.argv[6] === 'mobile'
const fractions = (process.argv[7] || '0,0.15,0.3,0.45,0.58,0.7,0.82,0.92,1')
  .split(',')
  .map(Number)

const outDir = 'tools/shots'
mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
  defaultViewport: { width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile },
})

const page = await browser.newPage()
const logs = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 })
await new Promise((r) => setTimeout(r, 2600))

const info = await page.evaluate(() => ({
  stage: (() => {
    const s = document.querySelector('.stage')
    if (!s) return null
    const r = s.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }
  })(),
  docH: document.documentElement.scrollHeight,
  vh: window.innerHeight,
  board: (() => {
    const b = document.querySelector('.artboard')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }
  })(),
  pinPad: document.querySelector('.pin-spacer')?.style.paddingBottom,
  preloader: (() => {
    const p = document.querySelector('.preloader')
    return p ? getComputedStyle(p).display + ' op=' + getComputedStyle(p).opacity : 'none'
  })(),
}))
console.log(JSON.stringify(info, null, 1))

for (const f of fractions) {
  await page.evaluate((fr) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, Math.round(max * fr))
  }, f)
  await new Promise((r) => setTimeout(r, 1900))
  const st = await page.evaluate(() => ({
    y: Math.round(window.scrollY),
    pct: document.querySelector('[data-id="progress-pct"]')?.textContent,
    pin: document.querySelector('.stage')?.getBoundingClientRect().top,
  }))
  const name = `${outDir}/${prefix}-${String(Math.round(f * 100)).padStart(3, '0')}.png`
  await page.screenshot({ path: name })
  console.log(name, JSON.stringify(st))
}

if (logs.length) {
  console.log('--- console ---')
  console.log(logs.slice(0, 40).join('\n'))
} else console.log('no console errors')

await browser.close()
