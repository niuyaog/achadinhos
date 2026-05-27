import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminUsers() {
  try {
    const { data: admins, error } = await supabase
      .from('admin_users')
      .select('*');

    if (error) {
      console.error('Error fetching admin_users:', error.message);
      return;
    }

    console.log('Admin Users currently in database:', admins);
  } catch (err) {
    console.error(err);
  }
}

checkAdminUsers();
