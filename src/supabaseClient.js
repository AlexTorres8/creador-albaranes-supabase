import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iahwjtvsolebgcztkbpj.supabase.co'
const supabaseKey = 'sb_publishable_jpJBl1oJRre-DFDAUUUllw_ShEAOMzb'

export const supabase = createClient(supabaseUrl, supabaseKey)

