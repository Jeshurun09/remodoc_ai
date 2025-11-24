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

