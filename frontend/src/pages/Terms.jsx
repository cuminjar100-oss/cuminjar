import React from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { FileText } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-4xl mx-auto px-6 lg:px-10 pt-14 pb-6">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full"><FileText size={12} className="inline mr-1 -mt-0.5" /> LEGAL</span>
        <h1 className="font-serif-display text-[46px] md:text-[54px] font-semibold mt-6 leading-[1.05]">Terms &amp; Privacy</h1>
        <p className="mt-4 text-neutral-500 text-[14px]">Last updated: July 22, 2025</p>
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-6 space-y-10">
        <Section title="Our Promise">
          Your family’s stories belong to your family. CuminJar exists to preserve, not exploit. We will never sell your data, share your recordings, or use your family’s voice or content to train third-party AI models without your explicit, opt-in consent.
        </Section>

        <Section title="1. Acceptance of Terms">
          By creating an account or using CuminJar, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the service.
        </Section>

        <Section title="2. Your Account">
          You are responsible for keeping your account credentials safe and for the activity that happens on your family space. Please invite only people you trust to your family group.
        </Section>

        <Section title="3. Content Ownership">
          All recipes, stories, voice recordings, photos, and any other content you upload remain your property. You grant CuminJar a limited licence to store, transcribe, translate, and display this content back to you and the family members you invite.
        </Section>

        <Section title="4. AI Transcription &amp; Translation">
          To transcribe voice recordings, we use our AI (speech-to-text). To translate transcripts across languages, we use AI translator. These providers process audio and text only to return the transcript/translation to you — they do not retain the content for training purposes.
        </Section>

        <Section title="5. Privacy">
          We collect the minimum information required to run the service: account details, family group data, and content you upload. Voice audio bytes are processed for transcription and are NOT stored on our servers — only the transcript and duration are kept. All storage is encrypted at rest.
        </Section>

        <Section title="6. Sharing &amp; Family Access">
          When you invite family members via email, they can view content shared within your family group. You can revoke access at any time from Settings.
        </Section>

        <Section title="7. Cancellation &amp; Data Export">
          You may cancel any time. On request, we will export all your family jar content in a portable format (JSON + audio when applicable). Upon deletion, your data is permanently removed from our systems within 30 days.
        </Section>

        <Section title="8. Prohibited Use">
          You must not upload content that is unlawful, infringing, hateful, or violates the privacy of another person. Recording another individual’s voice without their knowledge or consent is your responsibility, not ours.
        </Section>

        <Section title="9. Limitation of Liability">
          CuminJar is provided “as is.” While we take great care of your memories, we are not liable for indirect losses arising from use of the service.
        </Section>

        <Section title="10. Contact">
          Questions? Reach us at <a className="text-cumin-green underline underline-offset-2" href="mailto:hello@cuminjar.com">hello@cuminjar.com</a> or via our <a className="text-cumin-green underline underline-offset-2" href="/contact">contact page</a>.
        </Section>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-serif-display text-[24px] font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-[15px] text-neutral-700 leading-relaxed">{children}</p>
    </div>
  );
}
