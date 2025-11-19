'use client';

import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setAnswer(null);
    setError(null);

    // Simple session tracking per browser
    const sessionKey = 'ai-diag-session-id';
    let sessionId: string | null = null;

    if (typeof window !== 'undefined') {
      sessionId = window.localStorage.getItem(sessionKey);
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        window.localStorage.setItem(sessionKey, sessionId);
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unknown error');
      } else {
        setAnswer(data.answer);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col max-w-xl mx-auto p-4 gap-4">
      <h1 className="text-2xl font-semibold">
        Automotive Diagnostics Assistant
      </h1>
      <p className="text-sm text-gray-600">
        Describe your vehicle, mileage, and symptoms. I'll suggest likely
        causes and next steps. This is not a substitute for an in-person
        mechanic.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          className="border rounded p-2 min-h-[140px]"
          placeholder="Example: 2015 Subaru Outback 2.5, 145k miles. Check engine light with P0171. Rough idle when cold and smells like gas at start-up..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Get diagnostic suggestions'}
        </button>
      </form>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {answer && (
        <div className="border rounded p-3 whitespace-pre-wrap text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </main>
  );
}
