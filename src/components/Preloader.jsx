import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function Preloader({ progress, ready }) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!ready || !rootRef.current) return
    const el = rootRef.current
    const tl = gsap.timeline({
      onComplete: () => {
        el.style.display = 'none'
      },
    })
    tl.to(el.querySelector('.preloader__fill'), { scaleX: 1, duration: 0.4, ease: 'power2.out' })
      .to(el.querySelector('.preloader__inner'), { opacity: 0, y: -18, duration: 0.8, ease: 'power2.inOut' }, 0.15)
      .to(el, { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, 0.35)
    return () => tl.kill()
  }, [ready])

  return (
    <div ref={rootRef} className="preloader">
      <div className="preloader__inner">
        <div className="preloader__mark">Heartwood</div>
        <div className="preloader__line">
          <div className="preloader__fill" style={{ transform: `scaleX(${Math.min(1, progress)})` }} />
        </div>
        <div className="preloader__hint">
          {ready ? 'Enter the legend' : `Awakening the tree · ${Math.round(progress * 100)}%`}
        </div>
      </div>
    </div>
  )
}
