// OpenAI integration using emergentintegrations
import { LlmChat, UserMessage } from 'emergentintegrations/llm/chat'
import { v4 as uuidv4 } from 'uuid'

export class AIVisibilityChecker {
  constructor() {
    this.apiKey = process.env.EMERGENT_LLM_KEY
  }

  async checkVisibility(keyword, brand, competitors = []) {
    const sessionId = uuidv4()
    
    const chat = new LlmChat({
      apiKey: this.apiKey,
      sessionId: sessionId,
      systemMessage: `You are a search assistant. Provide direct, comprehensive answers to queries as if you were an AI search engine like ChatGPT, Perplexity, or Gemini.`
    }).with_model('openai', 'gpt-4o-mini')

    try {
      const userMessage = new UserMessage({
        text: keyword
      })
      
      const response = await chat.send_message(userMessage)
      const answer = response.text || ''
      
      // Analyze the response for brand visibility
      const analysis = this.analyzeResponse(answer, brand, competitors)
      
      return {
        answer,
        ...analysis
      }
    } catch (error) {
      console.error('AI visibility check error:', error)
      throw error
    }
  }

  analyzeResponse(answer, brand, competitors) {
    const lowerAnswer = answer.toLowerCase()
    const lowerBrand = brand.toLowerCase()
    
    // Check brand presence
    const brandMentioned = lowerAnswer.includes(lowerBrand)
    
    // Count brand mentions
    const brandRegex = new RegExp(lowerBrand, 'gi')
    const brandMatches = answer.match(brandRegex)
    const citationsCount = brandMatches ? brandMatches.length : 0
    
    // Extract URLs (simple regex for demo)
    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = answer.match(urlRegex) || []
    
    // Check position (first mention)
    let position = null
    if (brandMentioned) {
      const words = answer.split(/\s+/)
      for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase().includes(lowerBrand)) {
          position = i + 1
          break
        }
      }
    }
    
    // Check competitors
    const competitorsMentioned = competitors.filter(comp => 
      lowerAnswer.includes(comp.toLowerCase())
    )
    
    return {
      presence: brandMentioned,
      position,
      citations_count: citationsCount,
      observed_urls: urls,
      competitors_mentioned: competitorsMentioned,
      answer_snippet: answer.substring(0, 500) // First 500 chars
    }
  }
}