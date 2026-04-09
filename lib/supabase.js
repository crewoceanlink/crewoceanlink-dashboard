import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://icpejqytgplahzifgdov.supabase.co'
const supabaseKey = 'sb_publishable_6ZOFQ03G5vux5wkodjNLcA_g1pyTb8c'

export const supabase = createClient(supabaseUrl, supabaseKey)