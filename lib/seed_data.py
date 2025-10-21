#!/usr/bin/env python3
"""
Seed data generator for AEO Tracker
Generates 14 days of realistic visibility check data for demo project
"""

import json
from datetime import datetime, timedelta
import random
import uuid

def generate_seed_data():
    # Sample project
    project = {
        'id': str(uuid.uuid4()),
        'name': 'Acme Widgets',
        'domain': 'acmewidgets.com',
        'brand': 'Acme Widgets',
        'competitors': ['Widget Pro', 'Best Widgets Co'],
        'keywords': [
            'best widgets for home',
            'industrial widgets supplier',
            'custom widgets manufacturer',
            'widgets online store',
            'affordable widgets',
            'premium widget solutions',
            'widget installation service',
            'widgets for small business',
            'eco-friendly widgets',
            'smart widgets technology',
            'widget accessories',
            'commercial grade widgets',
            'widget repair services',
            'widgets wholesale',
            'innovative widget designs'
        ]
    }
    
    engines = ['ChatGPT', 'Perplexity', 'Gemini', 'Claude']
    checks = []
    
    # Generate 14 days of data
    for day_offset in range(14):
        check_date = datetime.now() - timedelta(days=(13 - day_offset))
        
        for keyword in project['keywords']:
            for engine in engines:
                # Simulate realistic visibility patterns
                # Higher visibility for some keywords/engines
                base_visibility = random.random()
                
                # ChatGPT tends to have better visibility in this simulation
                if engine == 'ChatGPT':
                    base_visibility += 0.2
                elif engine == 'Perplexity':
                    base_visibility += 0.15
                
                # Some keywords perform better
                if 'best' in keyword or 'premium' in keyword:
                    base_visibility += 0.15
                
                presence = base_visibility > 0.5
                
                # Calculate position if present
                position = None
                if presence:
                    position = random.randint(1, 50)
                
                # Citations count (1-5 if present)
                citations_count = random.randint(1, 5) if presence else 0
                
                # Observed URLs
                observed_urls = []
                if presence and random.random() > 0.3:
                    observed_urls = [
                        f'https://{project["domain"]}/products',
                        f'https://{project["domain"]}/about'
                    ][:random.randint(0, 2)]
                
                # Competitors mentioned
                competitors_mentioned = []
                if random.random() > 0.6:
                    competitors_mentioned = random.sample(
                        project['competitors'], 
                        random.randint(0, len(project['competitors']))
                    )
                
                # Answer snippet
                answer_snippet = f"When looking for {keyword}, "
                if presence:
                    answer_snippet += f"{project['brand']} is a leading provider offering quality solutions. "
                else:
                    answer_snippet += "there are several options available in the market. "
                
                if competitors_mentioned:
                    answer_snippet += f"Other notable providers include {', '.join(competitors_mentioned)}. "
                
                answer_snippet += "Consider factors like quality, price, and customer service when making your decision."
                
                check = {
                    'id': str(uuid.uuid4()),
                    'projectId': project['id'],
                    'engine': engine,
                    'keyword': keyword,
                    'position': position,
                    'presence': presence,
                    'answerSnippet': answer_snippet,
                    'citationsCount': citations_count,
                    'observedUrls': observed_urls,
                    'competitorsMentioned': competitors_mentioned,
                    'timestamp': check_date.isoformat()
                }
                
                checks.append(check)
    
    return {
        'project': project,
        'checks': checks
    }

if __name__ == '__main__':
    seed_data = generate_seed_data()
    print(json.dumps(seed_data, indent=2))
    
    # Save to file
    with open('/app/seed_data.json', 'w') as f:
        json.dump(seed_data, f, indent=2)
    
    print(f"\n✅ Generated {len(seed_data['checks'])} visibility checks for project '{seed_data['project']['name']}'")
    print(f"📊 Keywords: {len(seed_data['project']['keywords'])}")
    print(f"🔍 Engines: ChatGPT, Perplexity, Gemini, Claude")
    print(f"📅 Time range: 14 days")
    print(f"💾 Saved to: /app/seed_data.json")
