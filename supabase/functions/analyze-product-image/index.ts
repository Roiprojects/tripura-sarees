import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const STORE_NAME = Deno.env.get("STORE_NAME")?.trim() || "Tripura Sarees";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { image_url, category } = await req.json();
    if (!image_url || typeof image_url !== 'string') {
      return new Response(JSON.stringify({ error: 'image_url is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('NVIDIA_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing NVIDIA_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a product copywriter for "${STORE_NAME}", a saree store selling silk, handloom, cotton and designer sarees. Look at this saree image and generate listing content based on the weave, fabric, border, pallu, zari work, colors and overall appearance.${category ? ` Category context: ${category}.` : ''}

Return STRICT JSON only (no markdown, no code fences) with this exact shape:
{"name":"...","description":"..."}

Rules:
- name: short, catchy, max 60 chars, title-case, no quotes, mention key color/weave (e.g. "Crimson Banarasi Silk Saree with Zari Buta").
- description: single line, appealing, max 30 words, no emojis, no line breaks, mention weave, fabric feel, color, border/pallu detail and occasion.`;

    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'meta/llama-3.2-90b-vision-instruct',
        messages: [
          { role: 'system', content: 'You write concise product listings for a saree store. Always reply with strict JSON.' },
          { role: 'user', content: `${prompt}\n<img src="${image_url}" />` },
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

    let name = '', description = '';
    try {
      const parsed = JSON.parse(content);
      name = String(parsed.name || '').slice(0, 60).trim();
      description = String(parsed.description || '').replace(/\s+/g, ' ').trim();
    } catch {
      description = content.replace(/\s+/g, ' ').slice(0, 200);
    }

    return new Response(JSON.stringify({ name, description }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
