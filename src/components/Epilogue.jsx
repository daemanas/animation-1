import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function Epilogue({ reducedMotion }) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (reducedMotion) return
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('[data-ep]')
      items.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            duration: 1.5,
            delay: i * 0.09,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        )
      })
    }, rootRef)
    return () => ctx.revert()
  }, [reducedMotion])

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <section ref={rootRef} className="epilogue px-6 py-[18vh] sm:px-10">
      <div className="epilogue__glow" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p data-ep className="eyebrow">Epilogue</p>
        <h2
          data-ep
          className="mt-7 font-display text-[clamp(1.9rem,4.4vw,3.4rem)] font-light leading-[1.12] tracking-[0.03em] text-paper"
        >
          Some roots are remembered
          <br />
          as constellations.
        </h2>
        <p
          data-ep
          className="mx-auto mt-8 max-w-xl text-[0.82rem] font-light leading-[1.9] tracking-[0.05em] text-paper/55"
        >
          In the old stories the heartwood never truly finishes growing. It waits below the frost,
          beneath the sleeping stone, for the next traveller to scroll — and lets them watch it be
          born again.
        </p>
        <div data-ep className="mt-12">
          <button type="button" onClick={backToTop} className="btn-ghost">
            <span aria-hidden="true">↑</span> Return to the beginning
          </button>
        </div>
        <div
          data-ep
          className="mt-20 flex flex-col items-center gap-3 text-[0.52rem] uppercase tracking-[0.44em] text-paper/30"
        >
          <span>Heartwood</span>
          <span>A scroll-driven legend · MMXXVI</span>
        </div>
      </div>
    </section>
  )
}
