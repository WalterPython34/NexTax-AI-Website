"use client"

import type React from "react"
import { useEffect } from "react"

interface CalendlyButtonProps {
  url: string
  className?: string
  children: React.ReactNode
}

export default function CalendlyButton({ url, className, children }: CalendlyButtonProps) {
  useEffect(() => {
    // Load Calendly widget script
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const openCalendly = () => {
    // @ts-ignore - Calendly is loaded via external script
    if (window.Calendly) {
      // @ts-ignore
      window.Calendly.initPopupWidget({ url })
    }
  }

  return (
    <button onClick={openCalendly} className={className}>
      {children}
    </button>
  )
}

