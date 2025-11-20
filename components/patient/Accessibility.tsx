'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Accessibility() {
  const [largeTextMode, setLargeTextMode] = useState(false)
  const [language, setLanguage] = useState('en')
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    // Apply large text mode
    if (largeTextMode) {
      document.documentElement.style.fontSize = '120%'
    } else {
      document.documentElement.style.fontSize = '100%'
    }
  }, [largeTextMode])

  const startVoiceNavigation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser')
      return
    }

    setIsListening(true)
    setVoiceEnabled(true)
    
    // Mock voice recognition
    const recognition = new (window as any).webkitSpeechRecognition() || new (window as any).SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase()
      handleVoiceCommand(command)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const stopVoiceNavigation = () => {
    setIsListening(false)
    setVoiceEnabled(false)
  }

  const handleVoiceCommand = (command: string) => {
    // Simple voice command handling
    if (command.includes('symptom')) {
      alert('Opening symptom checker...')
    } else if (command.includes('appointment')) {
      alert('Opening appointments...')
    } else if (command.includes('hospital')) {
      alert('Opening hospital finder...')
    }
  }

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyan-500">Accessibility & Elderly-Friendly Features</h2>
        <Link href="/premium" className="text-sm text-cyan-500 hover:underline">
          Upgrade to Premium
        </Link>
      </div>

      {/* Large Text Mode */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Large Text UI Mode</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-cyan-500 mb-2">Enable large text mode for better visibility</p>
            <p className="text-sm text-gray-500">Increases font size across the application</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={largeTextMode}
              onChange={(e) => setLargeTextMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
          </label>
        </div>
      </div>

      {/* Voice Navigation */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Voice-Based Navigation</h3>
        <div className="space-y-4">
          <div>
            <p className="text-cyan-500 mb-2">Use voice commands to navigate and enter symptoms</p>
            <p className="text-sm text-gray-500 mb-4">
              Say commands like "Open symptom checker", "Book appointment", or "Find hospital"
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {!isListening ? (
              <button
                onClick={startVoiceNavigation}
                className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 flex items-center space-x-2"
              >
                <span>🎤</span>
                <span>Start Voice Navigation</span>
              </button>
            ) : (
              <button
                onClick={stopVoiceNavigation}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center space-x-2"
              >
                <span>⏹️</span>
                <span>Stop Listening</span>
              </button>
            )}
            {isListening && (
              <div className="flex items-center space-x-2 text-cyan-500">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>Listening...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multilingual Support */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Language Selection</h3>
        <div>
          <p className="text-cyan-500 mb-4">Switch to your preferred language</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-black"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-2">
            Note: Full translation requires premium subscription
          </p>
        </div>
      </div>

      {/* AI Voice Guidance */}
      <div className="surface rounded-lg p-6 border subtle-border">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">AI Voice Guidance</h3>
        <div className="space-y-4">
          <p className="text-cyan-500">
            Get AI-powered voice instructions for medical procedures and medication reminders
          </p>
          <div className="flex space-x-4">
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Play Medication Instructions
            </button>
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Play Procedure Guide
            </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              "Take one tablet with food twice daily. Store in a cool, dry place. If you experience any side effects, contact your doctor immediately."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

