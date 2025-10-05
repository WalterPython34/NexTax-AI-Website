"use client"

import type React from "react"

import { useState } from "react"
import { Calculator, Users, Home, Computer, Shield, TrendingUp, Download, Info, Plus, X, Mail } from "lucide-react"

const StartupCostCalculator = () => {
  const [costs, setCosts] = useState({
    legal: {
      businessRegistration: 100,
      licenses: 250,
      trademarksPatents: 0,
      legalConsulting: 500,
      insurance: 1200,
      contracts: 300,
    },
    operations: {
      officeSpace: 0,
      utilities: 200,
      equipment: 2000,
      furniture: 1000,
      software: 500,
      supplies: 300,
    },
    marketing: {
      branding: 1500,
      website: 2000,
      advertising: 1000,
      marketingMaterials: 500,
      socialMedia: 300,
    },
    personnel: {
      salaries: 0,
      contractors: 2000,
      benefits: 0,
      training: 500,
      recruiting: 0,
    },
    technology: {
      hardware: 3000,
      softwareLicenses: 800,
      cloudServices: 200,
      cybersecurity: 300,
      development: 0,
    },
    contingency: {
      emergencyFund: 5000,
      miscellaneous: 1000,
    },
  })

  const [customItems, setCustomItems] = useState([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomItem, setNewCustomItem] = useState({ name: "", amount: "" })
  const [businessType, setBusinessType] = useState("")

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")

  const categoryIcons = {
    legal: Shield,
    operations: Home,
    marketing: TrendingUp,
    personnel: Users,
    technology: Computer,
    contingency: Calculator,
    custom: Plus,
  }

  const categoryColors = {
    legal: "from-blue-500 to-blue-600",
    operations: "from-purple-500 to-purple-600",
    marketing: "from-pink-500 to-pink-600",
    personnel: "from-green-500 to-green-600",
    technology: "from-indigo-500 to-indigo-600",
    contingency: "from-gray-500 to-gray-600",
    custom: "from-orange-500 to-orange-600",
  }

  const businessTypePresets = {
    "tech-startup": {
      legal: {
        businessRegistration: 150,
        licenses: 300,
        trademarksPatents: 2000,
        legalConsulting: 1000,
        insurance: 1500,
        contracts: 500,
      },
      operations: { officeSpace: 0, utilities: 100, equipment: 1000, furniture: 500, software: 800, supplies: 200 },
      marketing: { branding: 2000, website: 3000, advertising: 2000, marketingMaterials: 300, socialMedia: 500 },
      personnel: { salaries: 0, contractors: 5000, benefits: 0, training: 1000, recruiting: 0 },
      technology: {
        hardware: 5000,
        softwareLicenses: 2000,
        cloudServices: 500,
        cybersecurity: 500,
        development: 10000,
      },
    },
    retail: {
      legal: {
        businessRegistration: 200,
        licenses: 500,
        trademarksPatents: 500,
        legalConsulting: 800,
        insurance: 2000,
        contracts: 400,
      },
      operations: {
        officeSpace: 3000,
        utilities: 500,
        equipment: 5000,
        furniture: 2000,
        software: 300,
        supplies: 1000,
      },
      marketing: { branding: 1500, website: 1500, advertising: 1500, marketingMaterials: 800, socialMedia: 400 },
      personnel: { salaries: 5000, contractors: 0, benefits: 1000, training: 800, recruiting: 500 },
      technology: { hardware: 2000, softwareLicenses: 500, cloudServices: 100, cybersecurity: 200, development: 0 },
    },
    service: {
      legal: {
        businessRegistration: 100,
        licenses: 300,
        trademarksPatents: 0,
        legalConsulting: 500,
        insurance: 1000,
        contracts: 300,
      },
      operations: { officeSpace: 1000, utilities: 200, equipment: 1500, furniture: 800, software: 400, supplies: 300 },
      marketing: { branding: 1200, website: 1800, advertising: 800, marketingMaterials: 400, socialMedia: 300 },
      personnel: { salaries: 0, contractors: 3000, benefits: 0, training: 600, recruiting: 0 },
      technology: { hardware: 2000, softwareLicenses: 600, cloudServices: 150, cybersecurity: 250, development: 0 },
    },
  }

  const handleCostChange = (category, item, value) => {
    const numValue = Number.parseFloat(value) || 0
    setCosts((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [item]: numValue,
      },
    }))
  }

  const handleBusinessTypeChange = (type) => {
    setBusinessType(type)
    if (businessTypePresets[type]) {
      setCosts((prev) => ({
        ...prev,
        ...businessTypePresets[type],
        contingency: prev.contingency,
      }))
    }
  }

  const addCustomItem = () => {
    if (newCustomItem.name && newCustomItem.amount) {
      setCustomItems([
        ...customItems,
        {
          id: Date.now(),
          name: newCustomItem.name,
          amount: Number.parseFloat(newCustomItem.amount) || 0,
        },
      ])
      setNewCustomItem({ name: "", amount: "" })
      setShowAddCustom(false)
    }
  }

  const removeCustomItem = (id) => {
    setCustomItems(customItems.filter((item) => item.id !== id))
  }

  const calculateCategoryTotal = (category) => {
    return Object.values(costs[category]).reduce((sum, cost) => sum + cost, 0)
  }

  const calculateCustomTotal = () => {
    return customItems.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateGrandTotal = () => {
    const standardTotal = Object.keys(costs).reduce((sum, category) => {
      return sum + calculateCategoryTotal(category)
    }, 0)
    return standardTotal + calculateCustomTotal()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")

    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    setIsSubmittingEmail(true)

    try {
      // Send email to API for lead capture
      await fetch("/api/capture-calculator-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          totalCost: calculateGrandTotal(),
          businessType: businessType || "Custom",
        }),
      })

      // Close modal and generate PDF
      setShowEmailModal(false)
      setEmail("")
      generateReport()
    } catch (error) {
      console.error("[v0] Error submitting email:", error)
      setEmailError("Something went wrong. Please try again.")
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  const generateReport = () => {
    // Generate HTML content for PDF
    const reportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const businessTypeLabel = businessType
      ? businessType
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "Custom Business"

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Startup Cost Report - NexTax.AI</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
          }
          h1 {
            color: #1f2937;
            margin: 10px 0;
            font-size: 28px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 16px;
          }
          .summary-box {
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
            text-align: center;
          }
          .total-amount {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
          }
          .category {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .category-header {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }
          .category-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
          }
          .category-total {
            font-size: 18px;
            font-weight: 600;
            color: #10b981;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          .item-row:last-child {
            border-bottom: none;
          }
          .item-name {
            color: #6b7280;
            text-transform: capitalize;
          }
          .item-amount {
            color: #1f2937;
            font-weight: 500;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .tips-section {
            background: #eff6ff;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            border: 1px solid #3b82f6;
          }
          .tips-title {
            color: #1e40af;
            font-weight: 600;
            margin-bottom: 10px;
          }
          @media print {
            body { padding: 20px; }
            .summary-box { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .category { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">NexTax.AI</div>
          <h1>Startup Cost Report</h1>
          <div class="subtitle">${businessTypeLabel} • Generated on ${reportDate}</div>
        </div>

        <div class="summary-box">
          <div>Total Startup Investment Needed</div>
          <div class="total-amount">${formatCurrency(calculateGrandTotal())}</div>
        </div>
    `

    // Add categories breakdown
    Object.entries(costs).forEach(([category, items]) => {
      const categoryTotal = calculateCategoryTotal(category)
      if (categoryTotal > 0) {
        htmlContent += `
          <div class="category">
            <div class="category-header">
              <div class="category-title">${category
                .replace(/([A-Z])/g, " $1")
                .trim()
                .toUpperCase()}</div>
              <div class="category-total">${formatCurrency(categoryTotal)}</div>
            </div>
        `

        Object.entries(items).forEach(([item, value]) => {
          if (value > 0) {
            htmlContent += `
              <div class="item-row">
                <div class="item-name">${item.replace(/([A-Z])/g, " $1").trim()}</div>
                <div class="item-amount">${formatCurrency(value)}</div>
              </div>
            `
          }
        })

        htmlContent += `</div>`
      }
    })

    // Add custom items if any
    if (customItems.length > 0) {
      const customTotal = calculateCustomTotal()
      htmlContent += `
        <div class="category">
          <div class="category-header">
            <div class="category-title">CUSTOM EXPENSES</div>
            <div class="category-total">${formatCurrency(customTotal)}</div>
          </div>
      `

      customItems.forEach((item) => {
        htmlContent += `
          <div class="item-row">
            <div class="item-name">${item.name}</div>
            <div class="item-amount">${formatCurrency(item.amount)}</div>
          </div>
        `
      })

      htmlContent += `</div>`
    }

    // Add tips section
    htmlContent += `
      <div class="tips-section">
        <div class="tips-title">Important Considerations</div>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Add 10-20% contingency to your total for unexpected expenses</li>
          <li>Many startup costs are tax-deductible - consult with NexTax.AI for optimization</li>
          <li>Consider phasing certain expenses to manage cash flow</li>
          <li>Review and update your cost estimates quarterly</li>
        </ul>
      </div>

      <div class="footer">
        <p>This report was generated by NexTax.AI Startup Cost Calculator</p>
        <p>Visit nextax.ai/resources for more business planning tools</p>
      </div>
    </body>
    </html>
    `

    // Create blob and open in new window
    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = window.URL.createObjectURL(blob)

    // Open in new window for printing/saving as PDF
    const printWindow = window.open(url, "_blank")

    // Clean up
    setTimeout(() => {
      window.URL.revokeObjectURL(url)
    }, 100)

    // Show instructions
    if (printWindow) {
      setTimeout(() => {
        alert('To save as PDF: Press Ctrl+P (or Cmd+P on Mac) and select "Save as PDF" as the destination.')
      }, 500)
    }
  }

  const handleDownloadClick = () => {
    setShowEmailModal(true)
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex justify-center items-center mb-4">
          <div className="p-3 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl shadow-lg">
            <Calculator className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Startup Cost Calculator</h2>
        <p className="text-gray-400">Calculate your initial business expenses and funding needs</p>
      </div>

      {/* Business Type Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-3">Select Business Type (Optional)</label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleBusinessTypeChange("")}
            className={`p-3 rounded-xl border-2 transition-all ${
              businessType === ""
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-gray-700 hover:border-gray-600 text-gray-400"
            }`}
          >
            Custom Setup
          </button>
          <button
            onClick={() => handleBusinessTypeChange("tech-startup")}
            className={`p-3 rounded-xl border-2 transition-all ${
              businessType === "tech-startup"
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-gray-700 hover:border-gray-600 text-gray-400"
            }`}
          >
            Tech Startup
          </button>
          <button
            onClick={() => handleBusinessTypeChange("retail")}
            className={`p-3 rounded-xl border-2 transition-all ${
              businessType === "retail"
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-gray-700 hover:border-gray-600 text-gray-400"
            }`}
          >
            Retail Business
          </button>
          <button
            onClick={() => handleBusinessTypeChange("service")}
            className={`p-3 rounded-xl border-2 transition-all ${
              businessType === "service"
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-gray-700 hover:border-gray-600 text-gray-400"
            }`}
          >
            Service Business
          </button>
        </div>
      </div>

      {/* Cost Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {Object.entries(costs).map(([category, items]) => {
          const Icon = categoryIcons[category]
          const colorClass = categoryColors[category]
          const categoryTotal = calculateCategoryTotal(category)

          return (
            <div key={category} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-gradient-to-r ${colorClass} rounded-xl`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {category.replace(/([A-Z])/g, " $1").trim()}
                  </h3>
                </div>
                <span className="text-lg font-bold text-green-400">{formatCurrency(categoryTotal)}</span>
              </div>

              <div className="space-y-3">
                {Object.entries(items).map(([item, value]) => (
                  <div key={item} className="flex items-center justify-between">
                    <label className="text-sm text-gray-300 capitalize flex-1">
                      {item.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">$</span>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleCostChange(category, item, e.target.value)}
                        className="w-24 px-3 py-1.5 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Custom Items Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 bg-gradient-to-r ${categoryColors.custom} rounded-xl`}>
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Custom Expenses</h3>
            </div>
            <span className="text-lg font-bold text-green-400">{formatCurrency(calculateCustomTotal())}</span>
          </div>

          <div className="space-y-3">
            {customItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex-1">{item.name}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400">{formatCurrency(item.amount)}</span>
                  <button
                    onClick={() => removeCustomItem(item.id)}
                    className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}

            {showAddCustom ? (
              <div className="space-y-3 pt-3 border-t border-gray-700">
                <input
                  type="text"
                  placeholder="Expense name"
                  value={newCustomItem.name}
                  onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
                />
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newCustomItem.amount}
                    onChange={(e) => setNewCustomItem({ ...newCustomItem, amount: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
                  />
                  <button
                    onClick={addCustomItem}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCustom(false)
                      setNewCustomItem({ name: "", amount: "" })
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCustom(true)}
                className="w-full py-2 border-2 border-dashed border-gray-600 hover:border-gray-500 text-gray-400 rounded-lg transition-colors"
              >
                + Add Custom Expense
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Total and Actions */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <p className="text-white/80 text-sm mb-1">Total Startup Investment Needed</p>
            <p className="text-4xl font-bold text-white">{formatCurrency(calculateGrandTotal())}</p>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleDownloadClick}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300">
              <strong className="text-blue-400">Pro Tip:</strong> Add a 10-20% contingency buffer to your total for
              unexpected expenses. Consider tax implications with NexTax.AI's expert guidance.
            </p>
          </div>
        </div>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowEmailModal(false)
                setEmail("")
                setEmailError("")
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Modal content */}
            <div className="p-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white text-center mb-2">Download Your Report</h3>
              <p className="text-gray-400 text-center mb-6">
                Enter your email to receive your personalized startup cost report
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError("")
                    }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                    disabled={isSubmittingEmail}
                  />
                  {emailError && <p className="text-red-400 text-sm mt-2">{emailError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingEmail}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmittingEmail ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download Report</span>
                    </>
                  )}
                </button>
              </form>

              <p className="text-gray-500 text-xs text-center mt-4">
                We'll use your email to send you helpful business planning resources
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StartupCostCalculator
