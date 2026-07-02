// import 'react-native-url-polyfill/auto'
// import { createClient } from '@supabase/supabase-js'
// import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env'

// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//   auth: {
//     autoRefreshToken: true,
//     persistSession: false,
//     detectSessionInUrl: false,
//   }
// })

import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage' // 👈 1. Import storage
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,       // 2. Add the storage engine
    autoRefreshToken: true,
    persistSession: true,        // 3. Change this to true
    detectSessionInUrl: false,
  }
})
