'use client';

import { CustomVoiceManager } from '@/components/CustomVoiceManager';
import { Sparkles, Mic, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomVoicesPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header with back link */}
      <header className="space-y-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Generate
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-warm/15 rounded-lg">
            <Sparkles className="h-6 w-6 text-accent-warm" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-h1 text-accent-warm">Custom Voices</h1>
            <p className="text-fg-muted text-body-lg mt-1">
              Manage your cloned voices for speech generation
            </p>
          </div>
        </div>
      </header>

      {/* Custom Voice Manager */}
      <section aria-labelledby="custom-voices-heading" className="surface-panel p-6 md:p-8">
        <h2 id="custom-voices-heading" className="sr-only">Custom Voices</h2>
        <CustomVoiceManager showUpload={true} showBackLink={false} />
      </section>

      {/* Empty state helper */}
      <div className="text-center py-8 text-fg-dim border-t border-border-subtle">
        <Mic className="h-12 w-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
        <p className="text-sm">Custom voices appear in the voice dropdown when generating speech</p>
        <p className="text-caption mt-1">Select "Add Custom Voice" from the voice selector to return here</p>
      </div>
    </div>
  );
}