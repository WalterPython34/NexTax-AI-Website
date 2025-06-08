"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

declare global {
  interface Window {
    Calendly: any
  }
}

interface CalendlyPopupProps {
  className?: string
  children?: React.ReactNode
}

export function CalendlyPopup({ className, children }: CalendlyPopupProps) {
  const [isCalendlyLoaded, setIsCalendlyLoaded] = useState(false)

  useEffect(() => {
    // Check if Calendly is already loaded
    if (window.Calendly) {
      setIsCalendlyLoaded(true)
      return
    }

    // Load Calendly popup script
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true

    script.onload = () => {
      setIsCalendlyLoaded(true)
    }

    script.onerror = () => {
      console.error("Failed to load Calendly script")
    }

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const openCalendly = () => {
    if (window.Calendly && isCalendlyLoaded) {
      window.Calendly.initPopupWidget({
        url: "https://calendly.com/steven-morello-nextax",
      })
    } else {
      // Fallback: open in new tab if popup fails
      window.open("https://calendly.com/steven-morello-nextax", "_blank")
    }
  }

  return (
    <Button onClick={openCalendly} className={className}>
      {children || (
        <>
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Consultation
        </>
      )}
    </Button>
  )
}
