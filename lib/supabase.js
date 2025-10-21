import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function checkConnection() {
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1)
    if (error && error.code === '42P01') {
      console.log('Tables not yet created')
      return false
    }
    return true
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}