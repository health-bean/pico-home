import Link from "next/link";

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Effective Date: April 5, 2026
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-stone-700">
          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Introduction
            </h2>
            <p>
              HealthBean LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
              operates Pico Home, a home maintenance tracking application. This
              Privacy Policy explains how we collect, use, and protect your
              information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Information We Collect
            </h2>
            <p className="mb-3">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account information</strong> — When you sign in with
                Google, we receive your name, email address, and profile photo.
              </li>
              <li>
                <strong>Home details</strong> — Information you provide about
                your property, including address, home type, year built, square
                footage, installed systems, and appliances.
              </li>
              <li>
                <strong>Task and maintenance data</strong> — Task schedules,
                completion records, notes, and home health scores.
              </li>
              <li>
                <strong>Documents</strong> — Files you upload such as
                warranties, insurance documents, receipts, and manuals. These
                may contain personally identifiable information.
              </li>
              <li>
                <strong>Household information</strong> — Optional health and
                household flags you provide (such as allergies, pets, young
                children, or elderly household members) to personalize
                maintenance recommendations.
              </li>
              <li>
                <strong>Contractor information</strong> — Names, phone numbers,
                emails, and ratings of contractors you save.
              </li>
              <li>
                <strong>Notification data</strong> — Push notification
                subscription information and email preferences.
              </li>
              <li>
                <strong>Device and usage data</strong> — Browser type, operating
                system, and error data collected through our error tracking
                service to improve app stability.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and maintain the Pico Home service</li>
              <li>
                To generate personalized maintenance schedules and
                recommendations
              </li>
              <li>
                To send push notifications and email digests about upcoming
                tasks
              </li>
              <li>To calculate your home health score</li>
              <li>To improve the app and fix errors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              How We Store Your Data
            </h2>
            <p>
              Your data is stored in a PostgreSQL database hosted by Supabase.
              Uploaded documents are stored in Supabase Storage with
              access-controlled signed URLs that expire after 15 minutes. The
              application is hosted on Vercel. All data is transmitted over
              encrypted HTTPS connections.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Third-Party Services
            </h2>
            <p className="mb-3">
              We use the following third-party services to operate Pico Home:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Google</strong> — Authentication (OAuth sign-in)
              </li>
              <li>
                <strong>Supabase</strong> — Database and file storage
              </li>
              <li>
                <strong>Resend</strong> — Email delivery for weekly digests
              </li>
              <li>
                <strong>Sentry</strong> — Error tracking and monitoring
              </li>
              <li>
                <strong>Vercel</strong> — Application hosting
              </li>
            </ul>
            <p className="mt-3">
              These services process your data only as necessary to provide
              their functionality. We do not sell your personal information to
              any third party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Data Sharing
            </h2>
            <p>
              We do not sell, rent, or share your personal data with third
              parties for marketing or advertising purposes. Your data is shared
              only with the service providers listed above, solely as necessary
              to operate the application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Your Rights
            </h2>
            <p>
              You have the right to access, correct, or delete your personal
              data. To exercise these rights, contact us at{" "}
              <a
                href="mailto:support@healthbean.io"
                className="text-[var(--color-primary-700)] hover:text-[var(--color-primary-900)] underline"
              >
                support@healthbean.io
              </a>
              . When you delete your account, all associated data — including
              home details, tasks, documents, and contractor information — is
              permanently removed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Children&apos;s Privacy
            </h2>
            <p>
              Pico Home is not intended for children under 13. We do not
              knowingly collect personal information from children under 13. If
              you believe a child has provided us with personal information,
              please contact us and we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated effective date. Your
              continued use of Pico Home after changes are posted constitutes
              acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, contact us at:
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
