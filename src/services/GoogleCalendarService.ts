import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * GoogleCalendarService — Frontend service that calls Supabase Edge Functions
 * for Google Calendar & Tasks integration.
 */
class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private _connected: boolean | null = null;

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Get the current access token for authenticated requests to edge functions
   */
  private async getAuthHeader(): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }
    return `Bearer ${session.access_token}`;
  }

  /**
   * Check if Google Calendar is connected for the current user
   */
  async isConnected(): Promise<boolean> {
    try {
      const auth = await this.getAuthHeader();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/google-auth?action=status`,
        {
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await res.json();
      this._connected = data.connected === true;
      return this._connected;
    } catch {
      this._connected = false;
      return false;
    }
  }

  /**
   * Get cached connection status (call isConnected() first to populate)
   */
  get connected(): boolean | null {
    return this._connected;
  }

  /**
   * Start the Google OAuth flow — redirects the user to Google consent screen
   */
  async connect(): Promise<void> {
    const auth = await this.getAuthHeader();
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/google-auth?action=auth_url`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ redirect_uri: redirectUri }),
      },
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Redirect the user to Google consent screen
    window.location.href = data.auth_url;
  }

  /**
   * Exchange authorization code for tokens (called from OAuth callback page)
   */
  async exchangeCode(code: string): Promise<{ success: boolean }> {
    const auth = await this.getAuthHeader();
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/google-auth?action=exchange`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      },
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    this._connected = true;
    return { success: true };
  }

  /**
   * Disconnect Google Calendar integration
   */
  async disconnect(): Promise<void> {
    const auth = await this.getAuthHeader();

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/google-auth?action=disconnect`,
      {
        method: "DELETE",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    this._connected = false;
  }

  /**
   * Sync a single task to Google Calendar & Tasks
   */
  async syncTask(taskId: string): Promise<void> {
    if (!this._connected) {
      const connected = await this.isConnected();
      if (!connected) return; // Silently skip if not connected
    }

    try {
      const auth = await this.getAuthHeader();
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/google-sync?action=sync_task`,
        {
          method: "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ task_id: taskId }),
        },
      );

      const data = await res.json();
      if (data.error) {
        console.error("Google sync error:", data.error);
      }
    } catch (err) {
      console.error("Failed to sync task to Google:", err);
    }
  }

  /**
   * Delete synced Google items when a task is deleted
   */
  async deleteSyncedTask(taskId: string): Promise<void> {
    if (!this._connected) {
      const connected = await this.isConnected();
      if (!connected) return;
    }

    try {
      const auth = await this.getAuthHeader();
      await fetch(
        `${SUPABASE_URL}/functions/v1/google-sync?action=delete_sync`,
        {
          method: "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ task_id: taskId }),
        },
      );
    } catch (err) {
      console.error("Failed to delete synced task from Google:", err);
    }
  }

  /**
   * Sync all active tasks to Google Calendar & Tasks
   */
  async syncAll(): Promise<{
    synced: number;
    total: number;
    errors: string[];
  }> {
    const auth = await this.getAuthHeader();
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/google-sync?action=sync_all`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return { synced: data.synced, total: data.total, errors: data.errors };
  }

  /**
   * Pull changes from Google Calendar back into local tasks
   */
  async pullChanges(): Promise<{ changes: any[] }> {
    const auth = await this.getAuthHeader();
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/google-sync?action=pull_changes`,
      {
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return { changes: data.changes };
  }
}

// Export singleton instance
export const googleCalendarService = GoogleCalendarService.getInstance();
export default googleCalendarService;
