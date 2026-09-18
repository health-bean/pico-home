import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] font-[family-name:var(--font-plus-jakarta-sans)]">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="text-sm font-semibold text-[var(--color-primary-700)] hover:text-[var(--color-primary-900)] transition-colors"
        >
          &larr; Back
        </Link>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-stone-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Effective Date: April 5, 2026
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-stone-700">
          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Acceptance of Terms
            </h2>
            <p>
              By accessing or using Pico Home (&quot;the Service&quot;),
              operated by HealthBean LLC (&quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              The Service
            </h2>
            <p>
              Pico Home is a home maintenance tracking application that helps
              you schedule, track, and manage home upkeep tasks. The Service
              includes task management, home health scoring, document storage,
              push notifications, and email digests.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Accounts
            </h2>
            <p>
              You sign in to Pico Home using Google OAuth. You are responsible
              for all activity that occurs under your account. Each account is
              for a single individual. You may invite household members to share
              access to your home&apos;s maintenance data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>
                Attempt to gain unauthorized access to the Service or its
                systems
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any part of the
                Service
              </li>
              <li>
                Use automated tools to scrape, crawl, or extract data from the
                Service
              </li>
              <li>Upload malicious files, viruses, or harmful content</li>
              <li>
                Interfere with or disrupt the Service or its infrastructure
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Your Content
            </h2>
            <p>
              You retain ownership of all data you provide to Pico Home,
              including home details, task information, documents, and
              contractor records. By using the Service, you grant HealthBean LLC
              a limited license to store, process, and display your content
              solely to provide the Service. We do not claim ownership of your
              content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Home Health Score Disclaimer
            </h2>
            <p>
              The home health score provided by Pico Home reflects your task
              completion compliance only. It is{" "}
              <strong>
                not a safety assessment, home inspection, or professional
                evaluation
              </strong>{" "}
              of your property&apos;s condition. Do not rely on the health score
              for safety decisions. Always consult qualified professionals for
              home safety, structural, electrical, plumbing, or HVAC concerns.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Documents &amp; Files
            </h2>
            <p>
              You are responsible for the content of files you upload to
              Pico Home. Do not upload content you do not have the right to
              store. We store your documents securely and provide time-limited
              access URLs, but we are not responsible for the accuracy or
              completeness of uploaded documents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Service Availability
            </h2>
            <p>
              We strive to keep Pico Home available at all times, but we do not
              guarantee uninterrupted or error-free operation. We may modify,
              suspend, or discontinue features of the Service at any time, with
              or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, HealthBean LLC shall not
              be liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of the Service. Our total
              liability for any claim related to the Service shall not exceed
              the amount you paid us in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Termination
            </h2>
            <p>
              We may suspend or terminate your account if you violate these
              Terms of Service. You may delete your account at any time. Upon
              termination, your data will be permanently deleted in accordance
              with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Governing Law
            </h2>
            <p>
              These Terms of Service are governed by and construed in accordance
              with the laws of the State of Maryland, United States of America,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Changes to These Terms
            </h2>
            <p>
              We may update these Terms of Service from time to time. Changes
              will be posted on this page with an updated effective date. Your
              continued use of Pico Home after changes are posted constitutes
              acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Contact Us
            </h2>
            <p>
              If you have questions about these Terms of Service, contact us at:
            </p>
            <p className="mt-2">
              <a
                href="mailto:support@healthbean.io"
                className="text-[var(--color-primary-700)] hover:text-[var(--color-primary-900)] underline"
              >
                support@healthbean.io
              </a>
              <br />
              HealthBean LLC
              <br />
              Maryland, USA
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
