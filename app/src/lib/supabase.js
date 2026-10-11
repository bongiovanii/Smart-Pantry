import { createClient } from '@supabase/supabase-js'

const subabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Validação de URL e Key do Supabase
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas.')
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
)