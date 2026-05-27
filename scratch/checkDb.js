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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY; // Using service role

console.log('Connecting to Supabase at:', supabaseUrl, 'using SERVICE ROLE');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*');

    if (catError) {
      console.error('Error querying categories:', catError.message);
      return;
    }

    console.log(`Found ${categories?.length || 0} categories in database.`);
    if (categories?.length > 0) console.log(categories.map(c => c.slug).join(', '));

    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('*');

    if (storeError) {
      console.error('Error querying stores:', storeError.message);
      return;
    }

    console.log(`Found ${stores?.length || 0} stores in database.`);

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*');

    if (prodError) {
      console.error('Error querying products:', prodError.message);
      return;
    }

    console.log(`Found ${products?.length || 0} products in database.`);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkDatabase();
