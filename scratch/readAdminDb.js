import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkAdmin() {
  const { data: categories } = await supabaseAdmin.from('categories').select('*');
  console.log(`[Admin check] Categories count: ${categories?.length || 0}`);
  
  const { data: stores } = await supabaseAdmin.from('stores').select('*');
  console.log(`[Admin check] Stores count: ${stores?.length || 0}`);
  
  const { data: products } = await supabaseAdmin.from('products').select('*');
  console.log(`[Admin check] Products count: ${products?.length || 0}`);
}

checkAdmin();
