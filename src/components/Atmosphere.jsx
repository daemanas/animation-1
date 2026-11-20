import { useEffect, useRef } from 'react'

/**
 * Canvas atmosphere: drifting bokeh, blossom petals, hearts and rock sparks.
 * All motion runs off one rAF loop; scroll progress only steers spawn rates.
 */

const TAU = Math.PI * 2
const ART_W = 776
const ART_H = 621
const CENTER_X = ART_W / 2
const CENTER_Y = ART_H / 2

function makeSprite(size, draw) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  draw(ctx, size)
  return c
}

const sprites = {}

function initSprites() {
  if (sprites.petal) return
  sprites.petal = makeSprite(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.45, 1, s * 0.5, s * 0.5, s * 0.5)
    g.addColorStop(0, 'rgba(255,225,235,0.95)')
    g.addColorStop(0.35, 'rgba(250,160,190,0.9)')
    g.addColorStop(1, 'rgba(214,70,120,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(s * 0.5, s * 0.5, s * 0.24, s * 0.42, 0.2, 0, TAU)
    ctx.fill()
  })
  sprites.heart = makeSprite(64, (ctx, s) => {
    const glow = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2)
    glow.addColorStop(0, 'rgba(255,140,175,0.5)')
    glow.addColorStop(0.6, 'rgba(240,80,130,0.14)')
    glow.addColorStop(1, 'rgba(240,80,130,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, s, s)
    ctx.translate(s / 2, s / 2)
    const k = s * 0.24
    ctx.beginPath()
    ctx.moveTo(0, k * 0.85)
    ctx.bezierCurveTo(-k * 1.25, k * 0.05, -k * 0.85, -k * 0.78, 0, -k * 0.24)
    ctx.bezierCurveTo(k * 0.85, -k * 0.78, k * 1.25, k * 0.05, 0, k * 0.85)
    const hg = ctx.createLinearGradient(0, -k, 0, k)
    hg.addColorStop(0, 'rgba(255,190,210,0.98)')
    hg.addColorStop(1, 'rgba(226,74,124,0.9)')
    ctx.fillStyle = hg
    ctx.fill()
  })
  sprites.bokeh = makeSprite(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,238,243,0.30)')
    g.addColorStop(0.4, 'rgba(255,208,222,0.12)')
    g.addColorStop(0.75, 'rgba(246,178,198,0.035)')
    g.addColorStop(1, 'rgba(246,178,198,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
  sprites.spark = makeSprite(32, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,248,238,0.95)')
    g.addColorStop(0.3, 'rgba(255,205,215,0.55)')
    g.addColorStop(1, 'rgba(255,180,205,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

const rand = (a, b) => a + Math.random() * (b - a)

export default function Atmosphere({ sceneRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    initSprites()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: true })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.innerWidth < 768

    let w = 0
    let h = 0
    let dpr = 1
    const resize = () => {
      const stage = canvas.parentElement
      w = stage.clientWidth
      h = stage.clientHeight
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const count = (base) => Math.round(base * (mobile ? 0.45 : 1))
    const bokeh = Array.from({ length: count(20) }, () => ({
      x: Math.random(), y: Math.random(), r: rand(9, 34), a: rand(0.04, 0.11),
      vx: rand(-0.004, 0.004), vy: rand(-0.002, 0.002), seed: rand(0, TAU),
    }))
    const petals = []
    const hearts = []
    const sparks = []

    let raf = 0
    let last = performance.now()
    let acc = { petal: 0, heart: 0, spark: 0 }
    let prevProgress = sceneRef.current?.progress ?? 0
    let velocity = 0

    const spawnPetal = () => {
      const lobe = Math.random() < 0.5 ? -1 : 1
      petals.push({
        x: CENTER_X + lobe * rand(30, 220) * (Math.random() < 0.25 ? 0.4 : 1),
        y: rand(70, 400),
        vx: rand(-0.25, 0.25),
        vy: rand(0.18, 0.65),
        rot: rand(0, TAU),
        vr: rand(-0.02, 0.02),
        s: rand(2.6, 7),
        a: rand(0.35, 0.9),
        sway: rand(0.4, 1.6),
        seed: rand(0, TAU),
        life: 0,
      })
    }
    const spawnHeart = () => {
      const lobe = Math.random() < 0.5 ? -1 : 1
      hearts.push({
        x: CENTER_X + lobe * rand(20, 210),
        y: rand(140, 400),
        vx: rand(-0.12, 0.12),
        vy: rand(-0.55, -0.18),
        rot: rand(-0.3, 0.3),
        vr: rand(-0.006, 0.006),
        s: rand(3.5, 8),
        a: rand(0.25, 0.7),
        sway: rand(0.5, 1.4),
        seed: rand(0, TAU),
        life: 0,
      })
    }
    const spawnSpark = () => {
      sparks.push({
        x: rand(292, 492),
        y: rand(468, 560),
        vx: rand(-0.2, 0.2),
        vy: rand(-0.75, -0.3),
        s: rand(1.2, 3.6),
        a: rand(0.4, 1),
        life: 0,
        ttl: rand(1.6, 3.4),
        seed: rand(0, TAU),
      })
    }

    const toScreen = (x, y) => {
      const sc = sceneRef.current
      if (!sc) return [0, 0]
      const k = sc.boardScale * sc.camScale
      return [
        sc.vw / 2 + sc.camX + (x - CENTER_X) * k,
        sc.vh / 2 + sc.camY + sc.by * sc.camScale + (y - CENTER_Y) * k,
        k,
      ]
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h)
      for (const b of bokeh) {
        ctx.globalAlpha = b.a
        const sx = b.x * w
        const sy = b.y * h
        ctx.drawImage(sprites.bokeh, sx - b.r, sy - b.r, b.r * 2, b.r * 2)
      }
      ctx.globalAlpha = 1
    }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const sc = sceneRef.current
      const p = sc?.progress ?? 0

      // progress velocity (used for wind push)
      const dv = Math.abs(p - prevProgress)
      prevProgress = p
      velocity += (Math.min(0.03, dv) * 6 - velocity) * 0.08
      const t = now / 1000

      // ---- spawn ----
      const petalRate = p < 0.5 ? 0 : (p - 0.5) * 42
      const heartRate = p < 0.55 ? 0 : (p - 0.55) * 26
      const sparkRate = p > 0.16 && p < 0.55 ? 26 * Math.sin(((p - 0.16) / 0.39) * Math.PI) : 0
      acc.petal += petalRate * dt
      acc.heart += heartRate * dt
      acc.spark += sparkRate * dt
      while (acc.petal >= 1) { if (petals.length < count(48)) spawnPetal(); acc.petal -= 1 }
      while (acc.heart >= 1) { if (hearts.length < count(26)) spawnHeart(); acc.heart -= 1 }
      while (acc.spark >= 1) { if (sparks.length < count(36)) spawnSpark(); acc.spark -= 1 }

      ctx.clearRect(0, 0, w, h)

      // ---- bokeh (screen space, soft parallax) ----
      ctx.globalCompositeOperation = 'lighter'
      for (const b of bokeh) {
        b.x += b.vx * dt + velocity * 0.003
        b.y += b.vy * dt - velocity * 0.0015
        if (b.x < -0.1) b.x = 1.1
        if (b.x > 1.1) b.x = -0.1
        if (b.y < -0.1) b.y = 1.1
        if (b.y > 1.1) b.y = -0.1
        const sx = b.x * w + Math.sin(t * 0.25 + b.seed) * 10
        const sy = b.y * h + Math.cos(t * 0.2 + b.seed) * 8
        ctx.globalAlpha = b.a
        ctx.drawImage(sprites.bokeh, sx - b.r, sy - b.r, b.r * 2, b.r * 2)
      }

      // ---- sparks (rock magic) ----
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life += dt
        if (s.life > s.ttl) { sparks.splice(i, 1); continue }
        s.x += s.vx * dt * 60 + Math.sin(t * 1.4 + s.seed) * 0.16
        s.y += s.vy * dt * 60
        const fade = Math.sin((s.life / s.ttl) * Math.PI)
        const [sx, sy, k] = toScreen(s.x, s.y)
        const size = s.s * k * 6
        ctx.globalAlpha = s.a * fade * 0.9
        ctx.drawImage(sprites.spark, sx - size / 2, sy - size / 2, size, size)
      }

      // ---- petals ----
      for (let i = petals.length - 1; i >= 0; i--) {
        const pt = petals[i]
        pt.life += dt
        pt.x += (pt.vx + Math.sin(t * 0.9 + pt.seed) * 0.18 + velocity * 6) * dt * 60
        pt.y += pt.vy * dt * 60
        pt.rot += pt.vr * dt * 60
        if (pt.y > 640 || pt.life > 26) { petals.splice(i, 1); continue }
        const [sx, sy, k] = toScreen(pt.x, pt.y)
        const size = pt.s * k
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue
        ctx.globalAlpha = pt.a * Math.min(1, pt.life * 1.4) * (p > 0.62 ? 1 : 0.5)
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(pt.rot + Math.sin(t * 1.2 + pt.seed) * 0.5)
        ctx.drawImage(sprites.petal, -size, -size, size * 2, size * 2)
        ctx.restore()
      }

      // ---- hearts ----
      for (let i = hearts.length - 1; i >= 0; i--) {
        const hh = hearts[i]
        hh.life += dt
        hh.x += (hh.vx + Math.sin(t * 0.7 + hh.seed) * 0.3 + velocity * 4) * dt * 60
        hh.y += hh.vy * dt * 60
        hh.rot += hh.vr * dt * 60
        if (hh.y < -20 || hh.life > 30) { hearts.splice(i, 1); continue }
        const [sx, sy, k] = toScreen(hh.x, hh.y)
        const size = hh.s * k
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue
        ctx.globalAlpha = hh.a * Math.min(1, hh.life * 1.2)
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(hh.rot + Math.sin(t * 1.1 + hh.seed) * 0.25)
        ctx.drawImage(sprites.heart, -size, -size, size * 2, size * 2)
        ctx.restore()
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    if (reduced) {
      drawStatic()
    } else {
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (reduced) return
      cancelAnimationFrame(raf)
      last = performance.now()
      if (!document.hidden) raf = requestAnimationFrame(frame)
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [sceneRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 12,
        pointerEvents: 'none',
      }}
    />
  )
}
