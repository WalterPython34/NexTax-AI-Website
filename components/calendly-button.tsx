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
    const link = document.createElement("link")
    link.href = "https://assets.calendly.com/assets/external/widget.css"
    link.rel = "stylesheet"
    document.head.appendChild(link)

    // Load Calendly widget script
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true

    script.onload = () => {
      setIsLoaded(true)
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
    // @ts-ignore - Calendly is loaded via external script
    if (window.Calendly) {
      // @ts-ignore
      window.Calendly.initPopupWidget({ url: url })
    } else {
      alert("Calendly is still loading. Please try again in a moment.")
    }
  }

  return (
    <button onClick={openCalendly} className={className} disabled={!isLoaded}>
      {children}
    </button>
  )
}

