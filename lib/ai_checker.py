#!/usr/bin/env python3
import sys
import json
import os
from emergentintegrations.llm.chat import LlmChat, UserMessage
import uuid

def check_visibility(keyword, brand, competitors):
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise Exception('EMERGENT_LLM_KEY not found in environment')
    
    session_id = str(uuid.uuid4())
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message="You are a search assistant. Provide direct, comprehensive answers to queries as if you were an AI search engine like ChatGPT, Perplexity, or Gemini. Include specific recommendations when relevant."
    ).with_model('openai', 'gpt-4o-mini')
    
    user_message = UserMessage(text=keyword)
    response = chat.send_message(user_message)
    answer = response.text or ''
    
    # Analyze response
    lower_answer = answer.lower()
    lower_brand = brand.lower()
    
    # Check brand presence
    brand_mentioned = lower_brand in lower_answer
    
    # Count citations
    citations_count = lower_answer.count(lower_brand)
    
    # Extract URLs (simple)
    import re
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, answer)
    
    # Check position
    position = None
    if brand_mentioned:
        words = answer.split()
        for i, word in enumerate(words):
            if lower_brand in word.lower():
                position = i + 1
                break
    
    # Check competitors
    competitors_mentioned = [comp for comp in competitors if comp.lower() in lower_answer]
    
    result = {
        'presence': brand_mentioned,
        'position': position,
        'citations_count': citations_count,
        'observed_urls': urls,
        'competitors_mentioned': competitors_mentioned,
        'answer_snippet': answer[:500]
    }
    
    return result

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Missing arguments'}), file=sys.stderr)
        sys.exit(1)
    
    keyword = sys.argv[1]
    brand = sys.argv[2]
    competitors = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []
    
    try:
        result = check_visibility(keyword, brand, competitors)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)