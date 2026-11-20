import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Experience from './components/Experience'
import Preloader from './components/Preloader'
import Epilogue from './components/Epilogue'

function collectSources(m) {
  const list = [m.sky.src, m.reference.src, m.trunk.src]
  list.push(m.mountains.left.src, m.mountains.right.src)
  m.rocks.forEach((r) => list.push(r.src))
  m.boulders.forEach((r) => list.push(r.src))
  list.push(m.canopy.left.src, m.canopy.right.src)
  m.blooms.left.forEach((b) => list.push(b.src))
  m.blooms.right.forEach((b) => list.push(b.src))
  return [...new Set(list)]
}

export default function App() {
  const [manifest, setManifest] = useState(null)
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const reducedRef = useRef(false)

  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    document.documentElement.classList.add('loading')

    let cancelled = false

    fetch('/layers/manifest.json')
      .then((r) => {
        if (!r.ok) throw new Error('manifest missing')
        return r.json()
      })
      .then((m) => {
        const srcs = collectSources(m)
        let done = 0
        let total = srcs.length
        return Promise.all(
          srcs.map(
            (src) =>
              new Promise((resolve) => {
                const img = new Image()
                const finish = () => {
                  done += 1
                  if (!cancelled) setProgress(done / total)
                  resolve()
                }
                img.onload = finish
                img.onerror = finish
                img.src = src
              })
          )
        ).then(() => {
          if (!cancelled) {
            setManifest(m)
            setReady(true)
            document.documentElement.classList.remove('loading')
            requestAnimationFrame(() => {
              ScrollTrigger.refresh()
              window.scrollTo(0, 0)
            })
          }
        })
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      cancelled = true
      document.documentElement.classList.remove('loading')
    }
  }, [])

  return (
    <main>
      <Preloader progress={progress} ready={ready} />
      {manifest ? <Experience manifest={manifest} reducedMotion={reducedRef.current} /> : <div style={{ height: '100vh' }} />}
      <Epilogue reducedMotion={reducedRef.current} />
    </main>
  )
}
