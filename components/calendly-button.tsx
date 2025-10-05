"use client"

import type React from "react"
import { useEffect, useState } from "react"

interface CalendlyButtonProps {
  url: string
  className?: string
  children: React.ReactNode
}

export default function CalendlyButton({ url, className, children }: CalendlyButtonProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    console.log("[v0] Loading Calendly script...")

    const link = document.createElement("link")
    link.href = "https://assets.calendly.com/assets/external/widget.css"
    link.rel = "stylesheet"
    document.head.appendChild(link)

    // Load Calendly widget script
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true

    script.onload = () => {
      console.log("[v0] Calendly script loaded successfully")
      setIsLoaded(true)
    }

    script.onerror = () => {
      console.error("[v0] Failed to load Calendly script")
    }

    document.body.appendChild(script)

    return () => {
      // Cleanup script and stylesheet on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }
  }, [])

  const openCalendly = () => {
    console.log("[v0] Button clicked, isLoaded:", isLoaded)
    console.log("[v0] window.Calendly exists:", typeof window !== "undefined" && "Calendly" in window)

    // @ts-ignore - Calendly is loaded via external script
    if (window.Calendly) {
      console.log("[v0] Opening Calendly popup with URL:", url)
      // @ts-ignore
      window.Calendly.initPopupWidget({ url: url })
    } else {
      console.error("[v0] Calendly is not loaded yet")
      alert("Calendly is still loading. Please try again in a moment.")
    }
  }

  return (
    <button onClick={openCalendly} className={className} disabled={!isLoaded}>
      {children}
    </button>
  )
}


