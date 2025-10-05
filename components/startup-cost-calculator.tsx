"use client"

import { useState } from "react"
import { Calculator, Users, Home, Computer, Shield, TrendingUp, Download, Info, Plus, X } from "lucide-react"

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

  const generateReport = () => {
    const report = {
      businessType: businessType || "custom",
      totalCost: calculateGrandTotal(),
      breakdown: {},
      customItems: customItems,
      date: new Date().toLocaleDateString(),
    }

    Object.keys(costs).forEach((category) => {
      report.breakdown[category] = {
        total: calculateCategoryTotal(category),
        items: costs[category],
      }
    })

    // Create and download JSON report
    const dataStr = JSON.stringify(report, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `startup-costs-${Date.now()}.json`
    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
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
              onClick={generateReport}
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
    </div>
  )
}

export default StartupCostCalculator
