"use client"

import type React from "react"

import { useEffect } from "react"
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
  useEffect(() => {
    // Load Calendly popup script
    const script = document.createElement("script")
    script.src = "https://assets.calendly.com/assets/external/widget.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: "https://calendly.com/steven-morello-nextax",
      })
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
