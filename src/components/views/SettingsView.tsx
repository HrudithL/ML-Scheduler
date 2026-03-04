import { useEffect, useState } from "react";
import { googleCalendarService } from "@/services/GoogleCalendarService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function SettingsView() {
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkGoogleStatus();
  }, []);

  const checkGoogleStatus = async () => {
    setLoading(true);
    try {
      const connected = await googleCalendarService.isConnected();
      setGoogleConnected(connected);
    } catch {
      setGoogleConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await googleCalendarService.connect();
      // This will redirect to Google, so no need to update state
    } catch (err: any) {
      toast({
        title: "Connection Failed",
        description: err.message || "Failed to start Google connection.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await googleCalendarService.disconnect();
      setGoogleConnected(false);
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to disconnect.",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const result = await googleCalendarService.syncAll();
      toast({
        title: "Sync Complete",
        description: `Synced ${result.synced}/${result.total} tasks to Google.${result.errors.length > 0 ? ` ${result.errors.length} errors.` : ""}`,
      });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to sync tasks.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePullChanges = async () => {
    setPulling(true);
    try {
      const result = await googleCalendarService.pullChanges();
      const changeCount = result.changes.length;
      toast({
        title: "Pull Complete",
        description:
          changeCount > 0
            ? `${changeCount} change(s) pulled from Google Calendar.`
            : "No changes found on Google Calendar.",
      });
    } catch (err: any) {
      toast({
        title: "Pull Failed",
        description: err.message || "Failed to pull changes from Google.",
        variant: "destructive",
      });
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your integrations and preferences.
        </p>
      </div>

      {/* Google Calendar & Tasks Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google Calendar & Tasks
          </CardTitle>
          <CardDescription>
            Two-way sync your tasks with Google Calendar events and Google
            Tasks. Changes on either platform are reflected on both.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Checking connection status...
            </div>
          ) : googleConnected ? (
            <>
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Connected to Google Calendar & Tasks
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSyncAll} disabled={syncing} size="sm">
                  {syncing ? (
                    <>
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Syncing...
                    </>
                  ) : (
                    "Sync All Tasks"
                  )}
                </Button>

                <Button
                  onClick={handlePullChanges}
                  disabled={pulling}
                  variant="outline"
                  size="sm"
                >
                  {pulling ? (
                    <>
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Pulling...
                    </>
                  ) : (
                    "Pull Changes from Google"
                  )}
                </Button>

                <Button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  variant="destructive"
                  size="sm"
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Tasks are automatically synced when you create, update, or
                complete them. Use "Pull Changes" to import time changes made
                directly on Google Calendar.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Connect your Google account to sync tasks as calendar events and
                reminders. Your tasks will appear in Google Calendar with
                scheduled times, and in Google Tasks with due dates and
                completion status.
              </p>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="gap-2"
              >
                {connecting ? (
                  <>
                    <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                    </svg>
                    Connect Google Calendar & Tasks
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>ML Scheduler — Productivity & Deadline Optimizer</p>
          <p>
            <a href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            {" · "}
            <a href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
