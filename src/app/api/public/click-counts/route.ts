import { NextResponse } from 'next/server';
import { isSimulationMode, isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { mockClickCounts } from '@/data/mockData';

type ClickCountEntry = { product_id: string; click_count: number };

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseAdminClient();

      // Select only product_id — no referrer, source, device, or timestamps
      const { data, error } = await supabase
        .from('clicks')
        .select('product_id');

      if (error) {
        console.error('Error fetching click counts:', error);
        return NextResponse.json([], { status: 500 });
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((row) => {
        if (row.product_id) {
          counts[row.product_id] = (counts[row.product_id] || 0) + 1;
        }
      });

      const result: ClickCountEntry[] = Object.entries(counts).map(
        ([product_id, click_count]) => ({ product_id, click_count })
      );

      return NextResponse.json(result);
    }

    if (isSimulationMode()) {
      const result: ClickCountEntry[] = Object.entries(mockClickCounts).map(
        ([product_id, click_count]) => ({ product_id, click_count })
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  } catch (err) {
    console.error('Click counts API error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
