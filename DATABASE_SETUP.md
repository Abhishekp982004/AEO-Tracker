# Database Schema Setup SQL for Supabase

Run this SQL in your Supabase SQL Editor (go to https://supabase.com/dashboard -> SQL Editor -> New Query)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  brand TEXT NOT NULL,
  competitors TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visibility checks table
CREATE TABLE IF NOT EXISTS visibility_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engine TEXT NOT NULL,
  keyword TEXT NOT NULL,
  position INTEGER,
  presence BOOLEAN NOT NULL DEFAULT false,
  "answerSnippet" TEXT,
  "citationsCount" INTEGER DEFAULT 0,
  "observedUrls" TEXT[] DEFAULT '{}',
  "competitorsMentioned" TEXT[] DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects" 
  ON projects FOR SELECT 
  USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own projects" 
  ON projects FOR UPDATE 
  USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own projects" 
  ON projects FOR DELETE 
  USING (auth.uid() = "userId");

-- RLS Policies for visibility_checks
CREATE POLICY "Users can view checks for their projects" 
  ON visibility_checks FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = visibility_checks."projectId" 
      AND projects."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can insert checks for their projects" 
  ON visibility_checks FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = visibility_checks."projectId" 
      AND projects."userId" = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_projects_user ON projects("userId");
CREATE INDEX idx_checks_project ON visibility_checks("projectId");
CREATE INDEX idx_checks_timestamp ON visibility_checks(timestamp DESC);
CREATE INDEX idx_checks_engine ON visibility_checks(engine);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updatedAt
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

After running this SQL:
1. Verify tables are created in Table Editor
2. Check that RLS policies are active
3. The application will be ready to use