import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { spawn } from 'child_process'
import path from 'path'

// Helper function to call Python script for AI checks
function callPythonAI(keyword, brand, competitors) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(process.cwd(), 'lib', 'ai_checker.py'),
      keyword,
      brand,
      JSON.stringify(competitors || [])
    ])

    let result = ''
    let errorOutput = ''

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorOutput}`))
      } else {
        try {
          resolve(JSON.parse(result))
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${result}`))
        }
      }
    })
  })
}

export async function POST(request) {
  try {
    const { pathname } = new URL(request.url)
    const path = pathname.replace('/api', '')

    // Auth endpoints
    if (path.startsWith('/auth/login')) {
      const { email } = await request.json()
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
        }
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ 
        message: 'Check your email for the magic link!',
        success: true 
      })
    }

    if (path.startsWith('/auth/logout')) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    // Get session
    if (path.startsWith('/auth/session')) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json({ user: null })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (error || !user) {
        return NextResponse.json({ user: null })
      }

      return NextResponse.json({ user })
    }

    // All other routes require authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Projects endpoints
    if (path.startsWith('/projects')) {
      if (request.method === 'POST' && path === '/projects') {
        const body = await request.json()
        const { data, error } = await supabase
          .from('projects')
          .insert([{ ...body, userId: user.id }])
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(data)
      }
    }

    // Run visibility checks
    if (path.startsWith('/checks/run')) {
      const { projectId } = await request.json()

      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('userId', user.id)
        .single()

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const engines = ['ChatGPT', 'Perplexity', 'Gemini', 'Claude']
      const results = []

      // Run checks for each keyword and engine
      for (const keyword of project.keywords) {
        for (const engine of engines) {
          try {
            // Call Python AI checker
            const checkResult = await callPythonAI(
              keyword,
              project.brand,
              project.competitors
            )

            const checkData = {
              projectId: project.id,
              engine,
              keyword,
              position: checkResult.position,
              presence: checkResult.presence,
              answerSnippet: checkResult.answer_snippet,
              citationsCount: checkResult.citations_count,
              observedUrls: checkResult.observed_urls,
              competitorsMentioned: checkResult.competitors_mentioned,
              timestamp: new Date().toISOString()
            }

            const { data, error } = await supabase
              .from('visibility_checks')
              .insert([checkData])
              .select()
              .single()

            if (!error) {
              results.push(data)
            }
          } catch (err) {
            console.error(`Error checking ${keyword} on ${engine}:`, err)
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        checksCreated: results.length,
        results 
      })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { pathname, searchParams } = new URL(request.url)
    const path = pathname.replace('/api', '')

    // Public health check
    if (path === '/health') {
      return NextResponse.json({ status: 'ok' })
    }

    // Auth session check (public)
    if (path.startsWith('/auth/session')) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json({ user: null })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (error || !user) {
        return NextResponse.json({ user: null })
      }

      return NextResponse.json({ user })
    }

    // All other routes require authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get projects
    if (path === '/projects') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(data || [])
    }

    // Get checks history
    if (path.startsWith('/checks/history')) {
      const projectId = searchParams.get('projectId')
      const days = parseInt(searchParams.get('days') || '30')
      
      if (!projectId) {
        return NextResponse.json({ error: 'projectId required' }, { status: 400 })
      }

      // Verify project belongs to user
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('userId', user.id)
        .single()

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const { data, error } = await supabase
        .from('visibility_checks')
        .select('*')
        .eq('projectId', projectId)
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(data || [])
    }

    // Dashboard stats
    if (path === '/dashboard/stats') {
      const projectId = searchParams.get('projectId')
      
      if (!projectId) {
        return NextResponse.json({ error: 'projectId required' }, { status: 400 })
      }

      // Verify project belongs to user
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('userId', user.id)
        .single()

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      // Get recent checks
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: checks, error } = await supabase
        .from('visibility_checks')
        .select('*')
        .eq('projectId', projectId)
        .gte('timestamp', thirtyDaysAgo.toISOString())

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Calculate stats
      const totalChecks = checks.length
      const presenceCount = checks.filter(c => c.presence).length
      const visibilityScore = totalChecks > 0 
        ? Math.round((presenceCount / totalChecks) * 100) 
        : 0

      // Group by engine
      const byEngine = {}
      checks.forEach(check => {
        if (!byEngine[check.engine]) {
          byEngine[check.engine] = { total: 0, present: 0 }
        }
        byEngine[check.engine].total++
        if (check.presence) {
          byEngine[check.engine].present++
        }
      })

      const engineStats = Object.entries(byEngine).map(([engine, stats]) => ({
        engine,
        score: Math.round((stats.present / stats.total) * 100),
        total: stats.total
      }))

      return NextResponse.json({
        visibilityScore,
        totalChecks,
        presenceCount,
        engineStats,
        project
      })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}