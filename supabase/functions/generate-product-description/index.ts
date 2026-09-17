import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const STORE_NAME = Deno.env.get("STORE_NAME")?.trim() || "Tripura Sarees";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, category, mode } = await req.json();
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('NVIDIA_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing NVIDIA_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSeo = mode === 'seo';
    const isDetails = mode === 'details';
    const prompt = isSeo
      ? `Generate SEO metadata for a saree on the "${STORE_NAME}" store. Product name: "${name}"${category ? `. Category: ${category}` : ''}. Return STRICT JSON only (no markdown, no code fences) with this shape: {"seo_title":"...","seo_description":"..."}. seo_title max 60 chars, seo_description max 160 chars, keyword-rich, single line, no quotes inside.`
      : isDetails
      ? `Generate product details for a saree on the "${STORE_NAME}" store. Product name: "${name}"${category ? `. Category: ${category}` : ''}. Return STRICT JSON only (no markdown, no code fences) with this exact shape: {"specifications":[{"label":"...","value":"..."}],"care_instructions":["..."],"country_of_origin":"India","disclaimer":"..."}. Include 5-8 specification rows (Fabric, Weave, Saree Length, Blouse Piece, Border, Pallu, Work/Zari, Occasion as relevant). Include 4-6 short care instruction lines. Country of origin should be "India" unless clearly otherwise. Disclaimer MUST mention that handwoven sarees may show slight irregularities in the weave, images are for reference only, and slight color variation may occur.`
      : `Write a single-line, concise, appealing product description (max 25 words) for a saree on the "${STORE_NAME}" store. No quotes, no emojis, no line breaks. Product name: "${name}"${category ? `. Category: ${category}` : ''}.`;

    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
        messages: [
          { role: 'system', content: 'You write concise, single-line product descriptions for a saree store.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 401 || resp.status === 403) {
        return new Response(JSON.stringify({ error: 'AI request unauthorized. Check NVIDIA API key/credits.' }), {
          status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI request failed', detail: txt }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    let content: string = data?.choices?.[0]?.message?.content ?? '';
    content = content.replace(/```json|```/g, '').trim();

    if (isSeo) {
      let seo_title = '', seo_description = '';
      try {
        const parsed = JSON.parse(content);
        seo_title = String(parsed.seo_title || '').slice(0, 60);
        seo_description = String(parsed.seo_description || '').slice(0, 160);
      } catch {
        seo_title = name.slice(0, 60);
        seo_description = content.replace(/\s+/g, ' ').slice(0, 160);
      }
      return new Response(JSON.stringify({ seo_title, seo_description }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isDetails) {
      let specifications: any[] = [];
      let care_instructions: string[] = [];
      let country_of_origin = 'India';
      let disclaimer = 'Handwoven sarees may show slight irregularities in the weave, a hallmark of handloom. Product images are for reference only. Slight color variation may occur due to lighting or your screen settings.';
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.specifications)) {
          specifications = parsed.specifications
            .map((s: any) => ({ label: String(s?.label || '').trim(), value: String(s?.value || '').trim() }))
            .filter((s: any) => s.label && s.value);
        }
        if (Array.isArray(parsed.care_instructions)) {
          care_instructions = parsed.care_instructions.map((s: any) => String(s || '').trim()).filter(Boolean);
        }
        if (parsed.country_of_origin) country_of_origin = String(parsed.country_of_origin).trim() || 'India';
        if (parsed.disclaimer) disclaimer = String(parsed.disclaimer).trim() || disclaimer;
      } catch {
        // keep defaults
      }
      return new Response(JSON.stringify({ specifications, care_instructions, country_of_origin, disclaimer }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const description = content.replace(/\s+/g, ' ').replace(/^["']|["']$/g, '').trim();
    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
