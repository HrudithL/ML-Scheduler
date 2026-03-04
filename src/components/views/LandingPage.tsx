import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Calendar,
  BarChart3,
  Bell,
  ArrowRight,
} from "lucide-react";

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 w-9 h-9 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              ML Scheduler
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Terms
            </Link>
            {user ? (
              <Button onClick={() => navigate("/today")} size="sm">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/login")} size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            ML Scheduler
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            A smart productivity and course planning tool for students. Organize
            tasks, track deadlines, manage courses, and sync everything with
            Google Calendar &amp; Tasks.
          </p>
          <p className="text-base text-gray-500 mb-10 max-w-xl mx-auto">
            Built for students who need to stay on top of assignments,
            scheduling, and daily productivity — all in one place.
          </p>
          {user ? (
            <Button
              onClick={() => navigate("/today")}
              size="lg"
              className="text-lg px-8"
            >
              Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/login")}
              size="lg"
              className="text-lg px-8"
            >
              Get Started
            </Button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            What ML Scheduler Does
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="mx-auto bg-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <CheckSquare className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Task Management
              </h3>
              <p className="text-sm text-gray-600">
                Create, prioritize, and track tasks with states, deadlines,
                difficulty ratings, and risk scores.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto bg-green-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Google Calendar Sync
              </h3>
              <p className="text-sm text-gray-600">
                Two-way sync study sessions and deadlines with Google Calendar.
                Changes on either platform stay in sync.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto bg-purple-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Smart Reminders
              </h3>
              <p className="text-sm text-gray-600">
                Set reminders that appear in Google Tasks with due dates, so you
                never miss an assignment.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto bg-orange-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Daily Logging
              </h3>
              <p className="text-sm text-gray-600">
                Track energy, focus, stress, and sleep to understand your
                productivity patterns over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it uses Google APIs */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            How We Use Google APIs
          </h2>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Google Calendar Events
              </h3>
              <p className="text-sm text-gray-600">
                We create, read, update, and delete study session events that
                you schedule through the app. We only access events created by
                ML Scheduler, identified by metadata tags. We do not access your
                other personal calendar events.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Google Tasks</h3>
              <p className="text-sm text-gray-600">
                We create task items with due dates corresponding to your course
                deadlines. Tasks are managed in a dedicated task list and synced
                two-way so changes appear on both platforms.
              </p>
            </div>
            <p className="text-xs text-gray-400 pt-2 border-t">
              ML Scheduler's use of Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              ML Scheduler &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Terms of Service
            </Link>
            <a
              href="https://github.com/HrudithL/ML-Scheduler"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
