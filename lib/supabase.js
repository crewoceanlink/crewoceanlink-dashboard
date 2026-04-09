import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://icpejqytgplahzifgdov.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcGVqcXl0Z3BsYWh6aWZnZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzA1NDcsImV4cCI6MjA5MTMwNjU0N30.BUoOOnhJoucL-tS67YDlPwlCR1Gwwv7VuQRqAjeChog'

export const supabase = createClient(supabaseUrl, supabaseKey)