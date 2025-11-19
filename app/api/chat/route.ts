import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Table1';
const AIRTABLE_PAT = process.env.AIRTABLE_PAT!;

// Create one Airtable record per call
async function logToAirtable(params: {
  prompt: string;
  response: string;
  sessionId?: string;
}) {
  const { prompt, response, sessionId } = params;

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    AIRTABLE_TABLE_NAME,
  )}`;

  const body = {
    records: [
      {
        fields: {
          // Field names must match Airtable exactly
          Prompt: prompt,
          Response: response,
          SessionId: sessionId ?? '',
        },
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to log to Airtable:', text);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sessionId } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing prompt' },
        { status: 400 },
      );
    }


   // Call OpenAI Responses API
const response = await openai.responses.create({
  model: 'gpt-5.1',
  instructions: `
You are a professional automotive diagnostics assistant for DIY car owners.

Your goals:
- Be professional, concise, and easy to follow.
- Reduce hallucinations and do NOT invent specific technical data you don't know
  (e.g., exact part numbers, TSB IDs, torque specs, or service intervals).
- Base your answer ONLY on the information provided by the user plus general
  automotive best practices.
- If something is uncertain, clearly say that it may vary and that an in-person
  inspection by a qualified mechanic is recommended.
- Assume the user has basic tools and safety awareness, but is not a professional.

ALWAYS respond in **exactly** this structure and order:

1. Brief summary of the issue  
   - 2–3 sentences summarizing the symptom(s) in plain language.

2. 3–5 most likely causes/solutions  
   - Use a numbered list.  
   - For each item, include: a short label + 1–2 sentence explanation.  
   - Start with the simplest/most common causes first.

3. 3–7 steps to properly diagnose the issue  
   - Use a numbered list of clear, practical steps.  
   - Start with simple visual/obvious checks before advanced tests.  
   - Call out any steps that require a scan tool, jack stands, or professional help.

4. Potential parts needed for the most likely fix  
   - Use a bulleted list.  
   - Use generic part names, not brand-specific SKUs.  
   - List only parts that are truly plausible for the top 1–2 likely causes.

Additional rules:
- Do NOT give prices or cost estimates.  
- Do NOT tell the user to ignore warning lights.  
- If the problem involves brakes, steering, fuel leaks, or anything that could 
  cause a breakdown or fire, explicitly recommend professional inspection.
- Keep the total response reasonably concise (no long paragraphs; prefer short
  paragraphs and bullets).`,
  input: prompt,            // prompt should include year, make, model, mileage, and issue
  max_output_tokens: 1250,   // adjust this up/down to control response length
  temperature: 0.2          // lower temperature to reduce hallucinations
});


    // SDK convenience property to get all text
    const answer = (response as any).output_text ?? 'No answer returned.';

    // Log to Airtable (await so failures are visible in logs)
    await logToAirtable({ prompt, response: answer, sessionId });

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return NextResponse.json(
      { error: 'Server error', details: err?.message },
      { status: 500 },
    );
  }
}
