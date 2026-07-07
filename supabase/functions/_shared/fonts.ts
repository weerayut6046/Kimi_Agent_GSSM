/**
 * Thai font loader for Edge Functions
 * Fetches THSarabunNew.ttf from the deployed site's public URL and caches it in memory
 */

let cachedFontBase64: string | null = null;
let fontLoadingPromise: Promise<string | null> | null = null;

/**
 * Get the public URL for the Thai font.
 * This should be the deployed website URL where /fonts/THSarabunNew.ttf is accessible.
 * Falls back to Supabase Storage if configured.
 */
function getFontUrl(): string {
  // Priority 1: Environment variable pointing to the site's public font URL
  const siteUrl = Deno.env.get('SITE_URL');
  if (siteUrl) {
    return `${siteUrl}/fonts/THSarabunNew.ttf`;
  }

  // Priority 2: Supabase Storage public URL (if bucket 'public' has fonts folder)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/assets/fonts/THSarabunNew.ttf`;
  }

  // Fallback: localhost (for local development only)
  return 'http://localhost:5173/fonts/THSarabunNew.ttf';
}

async function fetchFont(): Promise<string | null> {
  try {
    const fontUrl = getFontUrl();
    const response = await fetch(fontUrl);

    if (!response.ok) {
      console.warn(`Failed to fetch font from ${fontUrl}: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  } catch (error) {
    console.warn('Failed to load Thai font:', error);
    return null;
  }
}

/**
 * Load Thai font as base64 string.
 * Results are cached in memory for the lifetime of the Edge Function instance.
 */
export async function loadThaiFont(): Promise<string | null> {
  if (cachedFontBase64 !== null) {
    return cachedFontBase64;
  }

  if (fontLoadingPromise !== null) {
    return fontLoadingPromise;
  }

  fontLoadingPromise = fetchFont().then((font) => {
    cachedFontBase64 = font;
    return font;
  });

  return fontLoadingPromise;
}

/**
 * Apply Thai font to a jsPDF document instance
 */
export function applyThaiFont(doc: InstanceType<typeof import('npm:jspdf').jsPDF>, fontBase64: string | null): void {
  if (fontBase64) {
    try {
      doc.addFileToVFS('THSarabunNew.ttf', fontBase64);
      doc.addFont('THSarabunNew.ttf', 'THSarabunNew', 'normal');
      doc.setFont('THSarabunNew');
    } catch {
      doc.setFont('helvetica');
    }
  } else {
    doc.setFont('helvetica');
  }
}
