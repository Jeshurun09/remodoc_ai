import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function analyzeSymptoms(
  symptoms: string,
  imageBase64?: string,
  location?: { lat: number; lng: number }
) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

    const prompt = `You are a medical AI assistant. Analyze the following symptoms and provide:
1. Likely conditions (list top 3-5)
2. Urgency level (LOW, MEDIUM, HIGH, CRITICAL)
3. Care advice
4. Whether immediate medical attention is needed

Symptoms: ${symptoms}
${location ? `Location: ${location.lat}, ${location.lng}` : ''}

Respond in JSON format:
{
  "likelyConditions": ["condition1", "condition2", ...],
  "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
  "careAdvice": "detailed advice",
  "needsImmediateCare": boolean
}`

    let result
    if (imageBase64) {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
      result = await model.generateContent([prompt, imagePart])
    } else {
      result = await model.generateContent(prompt)
    }

    const response = result.response
    const text = response.text()

    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return { ...parsed, aiUnavailable: false }
    }

    // Fallback parsing
    return {
      likelyConditions: extractConditions(text),
      urgency: extractUrgency(text),
      careAdvice: text,
      needsImmediateCare: text.toLowerCase().includes('emergency') || text.toLowerCase().includes('immediate'),
      aiUnavailable: false
    }
  } catch (error) {
    console.error('Gemini AI Error:', error)
    // Fallback: return a safe default analysis so the API doesn't return 500
    return {
      likelyConditions: ['Unable to determine - consult a clinician'],
      urgency: 'MEDIUM' as const,
      careAdvice: 'The AI assistant is currently unavailable. Please consult a healthcare professional for an accurate assessment.',
      needsImmediateCare: false,
      aiUnavailable: true
    }
  }
}

function extractConditions(text: string): string[] {
  const conditions: string[] = []
  const conditionPatterns = [
    /likely conditions?:?\s*([^\n]+)/i,
    /possible conditions?:?\s*([^\n]+)/i,
    /may be:\s*([^\n]+)/i
  ]
  
  for (const pattern of conditionPatterns) {
    const match = text.match(pattern)
    if (match) {
      conditions.push(...match[1].split(',').map(c => c.trim()))
    }
  }
  
  return conditions.length > 0 ? conditions : ['Unknown condition']
}

function extractUrgency(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const lowerText = text.toLowerCase()
  if (lowerText.includes('critical') || lowerText.includes('emergency')) return 'CRITICAL'
  if (lowerText.includes('high') || lowerText.includes('urgent')) return 'HIGH'
  if (lowerText.includes('medium') || lowerText.includes('moderate')) return 'MEDIUM'
  return 'LOW'
}

// Voice Health Analysis - Analyzes voice patterns for health indicators
export async function analyzeVoiceHealth(audioTranscript: string, duration: number) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const prompt = `You are a medical AI assistant specializing in voice health analysis. Analyze the following voice recording transcript and provide health insights.

Transcript: ${audioTranscript}
Duration: ${duration} seconds

Analyze for:
1. Voice quality indicators (hoarseness, breathiness, strain)
2. Respiratory patterns
3. Speech clarity and articulation
4. Potential health indicators

Respond in JSON format:
{
  "healthIndicators": ["indicator1", "indicator2", ...],
  "recommendations": "detailed recommendations",
  "confidence": 0.0-1.0,
  "analysis": "detailed analysis"
}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      healthIndicators: [],
      recommendations: 'Please consult a healthcare professional for voice health concerns.',
      confidence: 0.5,
      analysis: text,
      aiUnavailable: false
    }
  } catch (error) {
    console.error('Voice Health Analysis Error:', error)
    return {
      healthIndicators: [],
      recommendations: 'AI analysis unavailable. Please consult a healthcare professional.',
      confidence: 0.0,
      analysis: 'Analysis unavailable',
      aiUnavailable: true
    }
  }
}

// Medical Report Summary - Summarizes complex medical reports
export async function summarizeMedicalReport(reportText: string, reportType: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const prompt = `You are a medical AI assistant. Summarize the following medical report in clear, patient-friendly language.

Report Type: ${reportType}
Report Content:
${reportText}

Provide:
1. A clear, concise summary (2-3 paragraphs)
2. Key findings (list format)
3. Recommendations (if any)
4. Urgency level (LOW, MEDIUM, HIGH, CRITICAL)

Respond in JSON format:
{
  "summary": "clear summary text",
  "keyFindings": ["finding1", "finding2", ...],
  "recommendations": "recommendations text",
  "urgency": "LOW|MEDIUM|HIGH|CRITICAL"
}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return { ...parsed, aiUnavailable: false }
    }

    return {
      summary: text.substring(0, 500),
      keyFindings: extractFindings(text),
      recommendations: 'Please discuss with your healthcare provider.',
      urgency: extractUrgency(text),
      aiUnavailable: false
    }
  } catch (error) {
    console.error('Medical Report Summary Error:', error)
    return {
      summary: 'Unable to summarize report. Please consult your healthcare provider.',
      keyFindings: [],
      recommendations: 'Please consult your healthcare provider for report interpretation.',
      urgency: 'MEDIUM' as const,
      aiUnavailable: true
    }
  }
}

function extractFindings(text: string): string[] {
  const findings: string[] = []
  const findingPatterns = [
    /key findings?:?\s*([^\n]+)/i,
    /findings?:?\s*([^\n]+)/i,
    /results?:?\s*([^\n]+)/i
  ]
  
  for (const pattern of findingPatterns) {
    const match = text.match(pattern)
    if (match) {
      findings.push(...match[1].split(/[,\n]/).map(f => f.trim()).filter(f => f.length > 0))
    }
  }
  
  return findings.length > 0 ? findings : ['No specific findings extracted']
}

// Symptom Pattern Recognition - Identifies patterns in symptoms
export async function recognizeSymptomPattern(symptoms: string[], historicalData?: any) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const prompt = `You are a medical AI assistant specializing in pattern recognition. Analyze the following symptoms and identify patterns that human doctors might miss.

Current Symptoms: ${symptoms.join(', ')}
${historicalData ? `Historical Context: ${JSON.stringify(historicalData)}` : ''}

Analyze for:
1. Pattern type (recurring, seasonal, progressive, cyclic, etc.)
2. Frequency patterns
3. Potential triggers
4. Hidden connections between symptoms
5. Recommendations

Respond in JSON format:
{
  "patternType": "recurring|seasonal|progressive|cyclic|other",
  "frequency": "daily|weekly|monthly|seasonal|irregular",
  "triggers": ["trigger1", "trigger2", ...],
  "aiInsights": "detailed insights about patterns",
  "recommendations": "recommendations based on patterns",
  "confidence": 0.0-1.0
}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      patternType: 'other',
      frequency: 'irregular',
      triggers: [],
      aiInsights: text,
      recommendations: 'Please consult a healthcare professional for pattern analysis.',
      confidence: 0.5,
      aiUnavailable: false
    }
  } catch (error) {
    console.error('Symptom Pattern Recognition Error:', error)
    return {
      patternType: 'other',
      frequency: 'irregular',
      triggers: [],
      aiInsights: 'Pattern analysis unavailable.',
      recommendations: 'Please consult a healthcare professional.',
      confidence: 0.0,
      aiUnavailable: true
    }
  }
}

// Skin Lesion Analysis - Analyzes skin lesion images
export async function analyzeSkinLesion(imageBase64: string, bodyLocation?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })
    
    const prompt = `You are a medical AI assistant specializing in dermatology. Analyze this skin lesion image and provide insights.

${bodyLocation ? `Body Location: ${bodyLocation}` : ''}

Analyze for:
1. Lesion characteristics (size, color, shape, borders, texture)
2. Lesion type (mole, freckle, rash, growth, etc.)
3. Risk level (low, medium, high, urgent)
4. Recommendations
5. Whether professional evaluation is recommended

IMPORTANT: This is NOT a diagnosis. Always recommend professional evaluation for concerning lesions.

Respond in JSON format:
{
  "lesionType": "type description",
  "riskLevel": "low|medium|high|urgent",
  "characteristics": {
    "size": "description",
    "color": "description",
    "shape": "description",
    "borders": "description",
    "texture": "description"
  },
  "recommendations": "detailed recommendations",
  "confidence": 0.0-1.0,
  "analysis": "detailed analysis"
}`

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg'
      }
    }

    const result = await model.generateContent([prompt, imagePart])
    const response = result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      lesionType: 'Unable to determine',
      riskLevel: 'medium',
      characteristics: {},
      recommendations: 'Please consult a dermatologist for professional evaluation.',
      confidence: 0.5,
      analysis: text,
      aiUnavailable: false
    }
  } catch (error) {
    console.error('Skin Lesion Analysis Error:', error)
    return {
      lesionType: 'Analysis unavailable',
      riskLevel: 'medium',
      characteristics: {},
      recommendations: 'Please consult a dermatologist for professional evaluation.',
      confidence: 0.0,
      analysis: 'Analysis unavailable',
      aiUnavailable: true
    }
  }
}

