import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/supabase/dataManager';
import { isAllowedAffiliateUrl } from '@/lib/security/affiliateUrl';
import { registerAffiliateClickServer } from '@/lib/supabase/clicksServer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productSlug: string }> }
) {
  try {
    // Resolve dynamic params following the current App Router Promise shape.
    const resolvedParams = await params;
    const { productSlug } = resolvedParams;

    // Extract store query parameter (?store=shopee)
    const { searchParams } = new URL(request.url);
    const storeSlug = searchParams.get('store');

    if (!productSlug || !storeSlug) {
      return renderErrorHTML('Parâmetros inválidos.', 'Slug do produto ou identificador da loja não foram fornecidos.');
    }

    // Load products from dataManager
    const products = await getProducts();
    const product = products.find((p) => p.slug === productSlug && p.is_active);

    if (!product) {
      return renderErrorHTML('Produto não encontrado', 'O produto solicitado não existe ou foi desativado pelo curador.');
    }

    // Find matching active store offer
    const offer = product.offers.find(
      (o) => o.store.slug.toLowerCase() === storeSlug.toLowerCase() && o.is_active
    );

    if (!offer) {
      return renderErrorHTML(
        'Oferta indisponível',
        `A loja "${storeSlug.toUpperCase()}" não possui uma oferta ativa vinculada a este produto.`
      );
    }

    if (!isAllowedAffiliateUrl(offer.affiliate_url, offer.store.allowed_domain)) {
      return renderErrorHTML(
        'Link de afiliado inválido',
        'O link cadastrado para esta oferta não passa na validação de segurança.'
      );
    }

    // 1. Extract Referrer domain
    let referrer = request.headers.get('referer') || 'Direto';
    if (referrer !== 'Direto') {
      try {
        const url = new URL(referrer);
        referrer = url.hostname;
      } catch {
        // Keep original if parsing fails
      }
    }

    // 2. Parse User-Agent into clean categories
    const ua = request.headers.get('user-agent') || 'Desconhecido';
    let device = 'Desktop';
    if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
      if (/iphone|ipad|ipod/i.test(ua)) {
        device = 'Celular (iOS)';
      } else if (/android/i.test(ua)) {
        device = 'Celular (Android)';
      } else {
        device = 'Celular';
      }
    } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
      device = 'Tablet';
    } else {
      if (/windows/i.test(ua)) {
        device = 'Desktop (Windows)';
      } else if (/macintosh|mac os/i.test(ua)) {
        device = 'Desktop (macOS)';
      } else if (/linux/i.test(ua)) {
        device = 'Desktop (Linux)';
      } else {
        device = 'Desktop';
      }
    }

    // 3. Extract Campaign UTM Source parameter
    const source = searchParams.get('source') || searchParams.get('utm_source') || 'link_bio';

    // Register click trail (relational metadata mapping)
    await registerAffiliateClickServer({
      productId: product.id,
      offerId: offer.id,
      storeId: offer.store_id,
      categoryId: product.category_id,
      source,
      referrer,
      device,
    });

    // Securely redirect to the saved affiliate URL
    return NextResponse.redirect(offer.affiliate_url, 307);

  } catch (err) {
    console.error('Redirection error:', err);
    return renderErrorHTML('Erro de Redirecionamento', 'Ocorreu uma falha interna ao tentar direcionar para a loja.');
  }
}

/**
 * Returns a high-fidelity HTML error page conforming to our beige fashion curation style.
 */
function renderErrorHTML(title: string, message: string) {
  const safeTitle = escapeHTML(title);
  const safeMessage = escapeHTML(message);
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecionamento - Achadinhos</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #FDFBF7;
          color: #4A3D3C;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          width: 90%;
          max-width: 400px;
          background-color: #FCFAF6;
          border: 1px solid #E8E2D5;
          padding: 24px;
          border-radius: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          text-align: center;
        }
        .icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        h2 {
          font-family: Georgia, serif;
          font-size: 20px;
          margin: 0 0 10px 0;
          font-weight: 800;
        }
        p {
          font-size: 13px;
          color: #8A7A78;
          line-height: 1.6;
          margin: 0 0 20px 0;
        }
        .btn {
          display: inline-block;
          background-color: #5C4033;
          color: #FCFAF6;
          text-decoration: none;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 12px 24px;
          border-radius: 16px;
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #4A3227;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h2>${safeTitle}</h2>
        <p>${safeMessage}</p>
        <a href="/" class="btn">Voltar para Início</a>
      </div>
    </body>
    </html>
  `;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
