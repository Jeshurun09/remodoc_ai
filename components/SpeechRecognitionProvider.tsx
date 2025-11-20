'use client'

import { useEffect } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

// This is a workaround for the speech recognition hook
// In a real app, you'd want to handle browser compatibility
export function useSpeechRecognitionHook() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  const startListening = () => {
    if (browserSupportsSpeechRecognition) {
      SpeechRecognition.startListening({ continuous: true })
    } else {
      alert('Speech recognition is not supported in this browser')
    }
  }

  const stopListening = () => {
    SpeechRecognition.stopListening()
  }

  return {
    transcript,
    listening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition
  }
}

