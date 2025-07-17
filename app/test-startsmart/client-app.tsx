import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          StartSmart
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Business Formation Assistant
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>AI-powered business guidance</p>
          <p>Document generation</p>
          <p>Compliance management</p>
        </div>
        <div className="mt-8 text-xs text-gray-400">
          Version 1.0.0
        </div>
      </div>
    </div>
  )
}

export default App