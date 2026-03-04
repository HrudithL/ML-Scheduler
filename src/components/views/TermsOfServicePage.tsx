import { Link } from "react-router-dom";

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <div className="mb-6">
          <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
            &larr; Back to App
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Last updated: March 3, 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using ML-Scheduler ("the app") at
              ml-scheduler.vercel.app, you agree to be bound by these Terms of
              Service. If you do not agree to these terms, do not use the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              2. Description of Service
            </h2>
            <p className="text-gray-700 leading-relaxed">
              ML-Scheduler is a personal productivity and course planning
              application that helps users manage tasks, track courses, log
              daily activity, and optionally sync with Google Calendar and
              Google Tasks. The app is provided as-is for personal and
              educational use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              3. User Accounts
            </h2>
            <p className="text-gray-700 leading-relaxed">
              You must create an account to use the app. You are responsible for
              maintaining the confidentiality of your account credentials and
              for all activities that occur under your account. You agree to
              provide accurate and complete information when creating your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              4. Google API Integration
            </h2>
            <p className="text-gray-700 leading-relaxed">
              The app offers optional integration with Google Calendar and
              Google Tasks. By enabling this integration, you authorize the app
              to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>
                Create, read, update, and delete calendar events on your behalf
              </li>
              <li>Create, read, update, and delete tasks on your behalf</li>
              <li>
                Perform two-way synchronization between the app and Google
                services
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-2">
              You may revoke this access at any time through your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Google Account permissions
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              5. User Data & Content
            </h2>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of all content you create within the app
              (tasks, courses, logs, etc.). We do not claim any intellectual
              property rights over your content. You are solely responsible for
              the content you enter into the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              6. Acceptable Use
            </h2>
            <p className="text-gray-700 leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              <li>Use the app for any unlawful purpose</li>
              <li>
                Attempt to gain unauthorized access to the app's systems or
                other users' data
              </li>
              <li>Interfere with or disrupt the app's infrastructure</li>
              <li>Use the app to store or transmit malicious code</li>
              <li>
                Exceed reasonable usage limits that may impact service
                availability
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              7. Disclaimer of Warranties
            </h2>
            <p className="text-gray-700 leading-relaxed">
              The app is provided <strong>"as is"</strong> and{" "}
              <strong>"as available"</strong> without warranties of any kind,
              whether express or implied, including but not limited to implied
              warranties of merchantability, fitness for a particular purpose,
              or non-infringement. We do not guarantee that the app will be
              uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              To the maximum extent permitted by law, we shall not be liable for
              any indirect, incidental, special, consequential, or punitive
              damages, including but not limited to loss of data, loss of
              profits, or business interruption, arising out of or in connection
              with your use of the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              9. Termination
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to suspend or terminate your access to the
              app at any time, with or without cause. You may also delete your
              account at any time. Upon termination, your data will be deleted
              in accordance with our{" "}
              <Link
                to="/privacy"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              10. Changes to These Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may update these Terms of Service from time to time. Changes
              will be posted on this page with an updated revision date.
              Continued use of the app after changes constitutes acceptance of
              the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              11. Contact
            </h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about these Terms of Service, please open an
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
