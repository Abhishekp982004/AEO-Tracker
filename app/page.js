'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Search, Plus, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [dashboardStats, setDashboardStats] = useState(null)
  const [checks, setChecks] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    checkUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user || null)
        loadProjects()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProjects([])
        setSelectedProject(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadDashboardStats()
      loadChecksHistory()
    }
  }, [selectedProject])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await loadProjects()
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setLoginMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      })

      if (error) throw error

      setLoginMessage('Check your email for the magic link!')
      setEmail('')
    } catch (error) {
      setLoginMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('createdAt', { ascending: false })

      if (error) throw error

      setProjects(data || [])
      
      // Auto-select first project if available
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  async function loadDashboardStats() {
    if (!selectedProject) return

    try {
      const { data, error } = await supabase
        .from('visibility_checks')
        .select('*')
        .eq('projectId', selectedProject.id)
        .order('timestamp', { ascending: false })

      if (error) throw error

      const allChecks = data || []
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentChecks = allChecks.filter(c => new Date(c.timestamp) >= thirtyDaysAgo)

      // Calculate stats
      const totalChecks = recentChecks.length
      const presenceCount = recentChecks.filter(c => c.presence).length
      const visibilityScore = totalChecks > 0 ? Math.round((presenceCount / totalChecks) * 100) : 0

      // Group by engine
      const byEngine = {}
      recentChecks.forEach(check => {
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

      setDashboardStats({
        visibilityScore,
        totalChecks,
        presenceCount,
        engineStats
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  async function loadChecksHistory() {
    if (!selectedProject) return

    try {
      const { data, error } = await supabase
        .from('visibility_checks')
        .select('*')
        .eq('projectId', selectedProject.id)
        .order('timestamp', { ascending: true })
        .limit(500)

      if (error) throw error

      setChecks(data || [])
    } catch (error) {
      console.error('Error loading checks:', error)
    }
  }

  // Calculate trend data for charts
  function getTrendData() {
    if (checks.length === 0) return []

    const dailyData = {}
    checks.forEach(check => {
      const date = new Date(check.timestamp).toLocaleDateString()
      if (!dailyData[date]) {
        dailyData[date] = { date, total: 0, present: 0 }
      }
      dailyData[date].total++
      if (check.presence) dailyData[date].present++
    })

    return Object.values(dailyData).map(d => ({
      ...d,
      score: Math.round((d.present / d.total) * 100)
    }))
  }

  // Get keyword performance
  function getKeywordPerformance() {
    if (!selectedProject || checks.length === 0) return []

    const keywordData = {}
    checks.forEach(check => {
      if (!keywordData[check.keyword]) {
        keywordData[check.keyword] = { keyword: check.keyword, total: 0, present: 0 }
      }
      keywordData[check.keyword].total++
      if (check.presence) keywordData[check.keyword].present++
    })

    return Object.values(keywordData)
      .map(d => ({
        ...d,
        score: Math.round((d.present / d.total) * 100)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  // Get recommendations
  function getRecommendations() {
    if (!dashboardStats || !selectedProject) return []

    const recommendations = []

    // Check overall visibility
    if (dashboardStats.visibilityScore < 50) {
      recommendations.push({
        type: 'warning',
        title: 'Low Overall Visibility',
        message: `Your brand appears in only ${dashboardStats.visibilityScore}% of AI responses. Consider improving content quality and relevance.`
      })
    } else if (dashboardStats.visibilityScore >= 75) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Visibility',
        message: `Great job! Your brand appears in ${dashboardStats.visibilityScore}% of AI responses.`
      })
    }

    // Check engine-specific visibility
    dashboardStats.engineStats.forEach(engine => {
      if (engine.score < 40) {
        recommendations.push({
          type: 'warning',
          title: `Low ${engine.engine} Visibility`,
          message: `Your brand rarely appears on ${engine.engine}. Focus on creating content that aligns with this platform's preferences.`
        })
      }
    })

    // Check keyword coverage
    const keywordPerf = getKeywordPerformance()
    const lowPerformingKeywords = keywordPerf.filter(k => k.score < 30)
    if (lowPerformingKeywords.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Keyword Optimization Needed',
        message: `${lowPerformingKeywords.length} keywords have low visibility. Consider creating targeted content for: ${lowPerformingKeywords.slice(0, 3).map(k => k.keyword).join(', ')}`
      })
    }

    return recommendations
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-purple-600 text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-purple-200 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-purple-900">AEO Tracker</CardTitle>
            <CardDescription className="text-purple-600">
              Track your brand visibility across AI search engines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-purple-200 focus:border-purple-400"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>
            {loginMessage && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md text-sm text-purple-800">
                {loginMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-purple-900">AEO Tracker</h1>
                <p className="text-sm text-purple-600">AI Search Visibility Monitor</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-purple-700">{user.email}</div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle>No Projects Yet</CardTitle>
              <CardDescription>Create your first project to start tracking visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                To get started, you need to create tables in your Supabase database.
                Please run the SQL script in DATABASE_SETUP.md file.
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Project (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Project Selector */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value)
                    setSelectedProject(project)
                  }}
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.domain}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProject && dashboardStats && (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                    <CardHeader className="pb-3">
                      <CardDescription>Overall Visibility</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline space-x-2">
                        <div className="text-4xl font-bold text-purple-900">
                          {dashboardStats.visibilityScore}%
                        </div>
                        {dashboardStats.visibilityScore >= 50 ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200">
                    <CardHeader className="pb-3">
                      <CardDescription>Total Checks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-purple-900">
                        {dashboardStats.totalChecks}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200">
                    <CardHeader className="pb-3">
                      <CardDescription>Positive Mentions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-green-600">
                        {dashboardStats.presenceCount}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200">
                    <CardHeader className="pb-3">
                      <CardDescription>Keywords Tracked</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-purple-900">
                        {selectedProject.keywords?.length || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="bg-purple-100">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white">Overview</TabsTrigger>
                    <TabsTrigger value="engines" className="data-[state=active]:bg-white">Engines</TabsTrigger>
                    <TabsTrigger value="keywords" className="data-[state=active]:bg-white">Keywords</TabsTrigger>
                    <TabsTrigger value="recommendations" className="data-[state=active]:bg-white">Recommendations</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {/* Trend Chart */}
                    <Card className="border-purple-200">
                      <CardHeader>
                        <CardTitle>Visibility Trend (Last 30 Days)</CardTitle>
                        <CardDescription>Daily visibility score across all engines</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={getTrendData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                            <XAxis dataKey="date" stroke="#9333ea" />
                            <YAxis stroke="#9333ea" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#9333ea"
                              strokeWidth={2}
                              name="Visibility Score %"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Engine Performance */}
                    <Card className="border-purple-200">
                      <CardHeader>
                        <CardTitle>Engine Performance</CardTitle>
                        <CardDescription>Visibility score by AI engine</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={dashboardStats.engineStats}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                            <XAxis dataKey="engine" stroke="#9333ea" />
                            <YAxis stroke="#9333ea" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}
                            />
                            <Legend />
                            <Bar dataKey="score" fill="#9333ea" name="Visibility Score %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="engines">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {dashboardStats.engineStats.map(engine => (
                        <Card key={engine.engine} className="border-purple-200">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>{engine.engine}</span>
                              <Badge
                                variant={engine.score >= 50 ? 'default' : 'destructive'}
                                className={engine.score >= 50 ? 'bg-green-500' : 'bg-red-500'}
                              >
                                {engine.score}%
                              </Badge>
                            </CardTitle>
                            <CardDescription>{engine.total} checks performed</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Visibility Score</span>
                                <span className="font-semibold">{engine.score}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full transition-all"
                                  style={{ width: `${engine.score}%` }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="keywords">
                    <Card className="border-purple-200">
                      <CardHeader>
                        <CardTitle>Keyword Performance</CardTitle>
                        <CardDescription>Top performing keywords by visibility</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {getKeywordPerformance().map((kw, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-purple-900">{kw.keyword}</div>
                                <div className="text-sm text-purple-600">
                                  {kw.present} of {kw.total} mentions
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full"
                                    style={{ width: `${kw.score}%` }}
                                  />
                                </div>
                                <div className="font-bold text-purple-900 w-12 text-right">
                                  {kw.score}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="recommendations">
                    <div className="space-y-4">
                      {getRecommendations().map((rec, idx) => (
                        <Card key={idx} className="border-purple-200">
                          <CardContent className="pt-6">
                            <div className="flex items-start space-x-4">
                              {rec.type === 'success' && (
                                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                              )}
                              {rec.type === 'warning' && (
                                <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                              )}
                              {rec.type === 'info' && (
                                <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-purple-900 mb-2">{rec.title}</h3>
                                <p className="text-sm text-gray-600">{rec.message}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {getRecommendations().length === 0 && (
                        <Card className="border-purple-200">
                          <CardContent className="pt-6">
                            <div className="text-center text-gray-600">
                              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                              <p>No specific recommendations at this time. Keep up the good work!</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}