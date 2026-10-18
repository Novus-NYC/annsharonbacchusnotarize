"use client"

import Link from "next/link"

export default function Navbar() {
  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-semibold">
          <Link href="/">Business Name</Link>
        </div>

        <div className="flex gap-6 text-sm">
          <Link href="/">Home</Link>
          <Link href="/pages/about">About</Link>
          <Link href="/pages/contact">Contact</Link>
        </div>
      </div>
    </nav>
  )
}
