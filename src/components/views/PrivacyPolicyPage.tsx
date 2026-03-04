import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to App
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Last updated: March 3, 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              1. Introduction
            </h2>
            <p className="text-gray-700 leading-relaxed">
              ML-Scheduler ("we," "our," or "the app") is a personal
              productivity and course planning tool. This Privacy Policy
              explains how we collect, use, and protect your information when
              you use our application hosted at ml-scheduler.vercel.app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              2. Information We Collect
            </h2>
            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">
              2.1 Account Information
            </h3>
            <p className="text-gray-700 leading-relaxed">
              When you sign up, we collect your email address through Supabase
              Authentication. We do not collect passwords directly;
              authentication is handled securely by Supabase.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">
              2.2 Task & Course Data
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We store the tasks, courses, daily logs, and scheduling data you
              create within the app. This data is stored in a Supabase
              (PostgreSQL) database and is associated with your user account.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">
              2.3 Google Calendar & Tasks Data
            </h3>
            <p className="text-gray-700 leading-relaxed">
              If you enable Google Calendar and Google Tasks integration, the
              app accesses your Google account data using the following OAuth
              scopes:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>
                <strong>Google Calendar Events</strong> (
                <code className="text-sm bg-gray-100 px-1 rounded">
                  calendar.events
                </code>
                ): Used to create, read, update, and delete study session events
                that you schedule through the app.
              </li>
              <li>
                <strong>Google Tasks</strong> (
                <code className="text-sm bg-gray-100 px-1 rounded">tasks</code>
                ): Used to create and manage task items with due dates that
                correspond to your course deadlines.
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-2">
              We only access calendar events and tasks that are created by this
              app (identified via metadata tags). We do not read, modify, or
              delete your other personal calendar events or tasks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>
                To provide and maintain the scheduling and task management
                service
              </li>
              <li>
                To sync your study sessions and deadlines with Google Calendar
                and Google Tasks
              </li>
              <li>
                To calculate risk scores, due-date alerts, and productivity
                metrics
              </li>
              <li>
                To enable two-way sync so changes on either platform are
                reflected in both
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-2">
              We do <strong>not</strong> use your data for advertising, sell it
              to third parties, or share it with anyone outside of the services
              required for the app to function (Supabase, Google APIs).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              4. Data Storage & Security
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Your data is stored securely using Supabase with Row Level
              Security (RLS) policies, ensuring only you can access your own
              data. Google OAuth tokens are stored locally on your device and
              are never sent to our servers. All communication is encrypted via
              HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              5. Third-Party Services
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>
                <strong>Supabase</strong> — Authentication and database hosting
              </li>
              <li>
                <strong>Google Calendar API</strong> — Calendar event
                synchronization
              </li>
              <li>
                <strong>Google Tasks API</strong> — Task management
                synchronization
              </li>
              <li>
                <strong>Vercel</strong> — Application hosting
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-2">
              Each service has its own privacy policy. We encourage you to
              review them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              6. Data Retention & Deletion
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Your data is retained as long as your account is active. You may
              request deletion of your account and all associated data at any
              time by contacting us. Upon deletion, all your tasks, courses,
              logs, and sync mappings will be permanently removed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              7. Your Rights
            </h2>
            <p className="text-gray-700 leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Access your personal data stored in the app</li>
              <li>Export your data (via the built-in Export feature)</li>
              <li>Request correction or deletion of your data</li>
              <li>
                Revoke Google API access at any time through your Google Account
                settings
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              8. Changes to This Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              9. Contact
            </h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about this Privacy Policy, please open an
              issue on our{" "}
              <a
                href="https://github.com/HrudithL/ML-Scheduler"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
