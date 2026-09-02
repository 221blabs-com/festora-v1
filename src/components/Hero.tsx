// Hero.tsx - Art Deco Event Ticketing Hero
import React from 'react'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="hero relative select-none">
      {/* Vertical side ornament lines */}
      <div className="hero-side-line-left" aria-hidden="true" />
      <div className="hero-side-line-right" aria-hidden="true" />

      <div className="max-w-4xl mx-auto text-center relative z-10 w-full px-4">
        {/* Eyebrow label */}
        <p className="hero-eyebrow">
          ◆ &nbsp; The Premier Ticketing Platform &nbsp; ◆
        </p>

        {/* Main headline */}
        <h1 className="hero-headline">
          Every Great <span className="accent">Event</span><br />
          Starts Here
        </h1>

        {/* Subheadline */}
        <p className="hero-sub">
          Discover extraordinary events. Secure your seat.
          Experience the unforgettable.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-4 flex-wrap mt-2">
          <Link href="/events">
            <button className="btn-primary">
              Browse Events
            </button>
          </Link>
          <Link href="/organizer/apply">
            <button className="btn-ghost">
              Sell Tickets
            </button>
          </Link>
        </div>

      </div>
    </section>
  )
}
