// import { Redirect } from 'expo-router';

// export default function Index() {
//   return <Redirect href="/(employee)" />;
// }

import { useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Index() {
  useEffect(() => {
    checkRole();
  }, []);

  async function checkRole() {
    const testEmail = 'rahul@karyasiddhi.com'; // Change this

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', testEmail)
      .single();

    if (error) {
      console.log(error);
      return;
    }

    if (data.role === 'admin') {
      router.replace('/(admin)');
    } else {
      router.replace('/(employee)');
    }
  }

  return null;
}