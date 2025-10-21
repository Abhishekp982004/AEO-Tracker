#!/usr/bin/env python3
"""
Import seed data into Supabase
This script loads seed_data.json and inserts it into the Supabase database
"""

import json
import os
from supabase import create_client, Client

# Load environment variables
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Supabase credentials not found in environment")
    print("Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def import_seed_data():
    """Import seed data from seed_data.json"""
    
    # Load seed data
    with open('/app/seed_data.json', 'r') as f:
        seed_data = json.load(f)
    
    project = seed_data['project']
    checks = seed_data['checks']
    
    print("📥 Importing seed data...")
    print(f"Project: {project['name']}")
    print(f"Keywords: {len(project['keywords'])}")
    print(f"Checks: {len(checks)}")
    
    # Note: This script requires authentication
    # You'll need to manually import via Supabase dashboard or
    # use service role key (not recommended to commit)
    
    print("\n⚠️  Manual Import Required:")
    print("1. Go to Supabase Dashboard → Table Editor")
    print("2. Import project data into 'projects' table")
    print("3. Import checks data into 'visibility_checks' table")
    print("\nOr use the Supabase SQL Editor to run bulk inserts")
    
    # Generate SQL for manual import
    print("\n📝 SQL Insert Statements:")
    print("\n-- Insert Project:")
    print(f"INSERT INTO projects (id, \"userId\", name, domain, brand, competitors, keywords, \"createdAt\", \"updatedAt\")")
    print(f"VALUES (")
    print(f"  '{project['id']}',")
    print(f"  auth.uid(),  -- Replace with your user ID")
    print(f"  '{project['name']}',")
    print(f"  '{project['domain']}',")
    print(f"  '{project['brand']}',")
    print(f"  ARRAY{json.dumps(project['competitors'])},")
    print(f"  ARRAY{json.dumps(project['keywords'])},")
    print(f"  NOW(),")
    print(f"  NOW()")
    print(f");")
    
    print(f"\n-- Insert {len(checks)} Visibility Checks:")
    print("-- (Run in Supabase SQL Editor for bulk import)")
    
    # Save to SQL file
    with open('/app/import_seed.sql', 'w') as f:
        f.write("-- Import Seed Data for AEO Tracker\n\n")
        f.write("-- Step 1: Insert Project\n")
        f.write(f"INSERT INTO projects (id, \"userId\", name, domain, brand, competitors, keywords, \"createdAt\", \"updatedAt\")\n")
        f.write(f"VALUES (\n")
        f.write(f"  '{project['id']}',\n")
        f.write(f"  auth.uid(),  -- Replace with your user ID if needed\n")
        f.write(f"  '{project['name']}',\n")
        f.write(f"  '{project['domain']}',\n")
        f.write(f"  '{project['brand']}',\n")
        f.write(f"  ARRAY{json.dumps(project['competitors'])},\n")
        f.write(f"  ARRAY{json.dumps(project['keywords'])},\n")
        f.write(f"  NOW(),\n")
        f.write(f"  NOW()\n")
        f.write(f");\n\n")
        
        f.write("-- Step 2: Insert Visibility Checks\n")
        f.write("-- Insert checks in batches\n\n")
        
        # Write checks in batches of 50
        batch_size = 50
        for i in range(0, len(checks), batch_size):
            batch = checks[i:i+batch_size]
            f.write(f"INSERT INTO visibility_checks (id, \"projectId\", engine, keyword, position, presence, \"answerSnippet\", \"citationsCount\", \"observedUrls\", \"competitorsMentioned\", timestamp, \"createdAt\")\n")
            f.write("VALUES\n")
            
            values = []
            for check in batch:
                position_val = f"{check['position']}" if check['position'] is not None else "NULL"
                values.append(f"('{check['id']}', '{check['projectId']}', '{check['engine']}', '{check['keyword'].replace(\"'\", \"''\")}', {position_val}, {str(check['presence']).lower()}, '{check['answerSnippet'].replace(\"'\", \"''\")}', {check['citationsCount']}, ARRAY{json.dumps(check['observedUrls'])}, ARRAY{json.dumps(check['competitorsMentioned'])}, '{check['timestamp']}', '{check['timestamp']}')")
            
            f.write(",\n".join(values))
            f.write(";\n\n")
    
    print(f"\n✅ SQL import file created: /app/import_seed.sql")
    print("Run this file in your Supabase SQL Editor to import all data")

if __name__ == '__main__':
    import_seed_data()
