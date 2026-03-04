import { supabase } from "@/lib/supabase";

/**
 * GoogleCalendarService — Frontend service that calls Supabase Edge Functions
 * for Google Calendar & Tasks integration.
 *
 * Uses supabase.functions.invoke() which automatically handles auth headers
 * and the apikey header required by Supabase's API gateway.
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
   * Helper to invoke an edge function with proper error handling
   */
  private async invoke(
    functionName: string,
    body?: Record<string, unknown>,
  ): Promise<any> {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: body ?? {},
    });

    if (error) {
      throw new Error(error.message || "Edge function call failed");
    }

    return data;
  }

  /**
   * Check if Google Calendar is connected for the current user
   */
  async isConnected(): Promise<boolean> {
    try {
      const data = await this.invoke("google-auth", { action: "status" });
      this._connected = data?.connected === true;
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
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    const data = await this.invoke("google-auth", {
      action: "auth_url",
      redirect_uri: redirectUri,
    });

    if (!data?.url) {
      throw new Error(
        data?.error || "Failed to get Google authorization URL",
      );
    }

    // Redirect the user to Google consent screen
    window.location.href = data.url;
  }

  /**
   * Exchange authorization code for tokens (called from OAuth callback page)
   */
  async exchangeCode(code: string): Promise<{ success: boolean }> {
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    const data = await this.invoke("google-auth", {
      action: "exchange",
      code,
      redirect_uri: redirectUri,
    });

    if (data?.error) throw new Error(data.error);
    this._connected = true;
    return { success: true };
  }

  /**
   * Disconnect Google Calendar integration
   */
  async disconnect(): Promise<void> {
    const data = await this.invoke("google-auth", { action: "disconnect" });
    if (data?.error) throw new Error(data.error);
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
      const data = await this.invoke("google-sync", {
        action: "sync_task",
        task_id: taskId,
      });
      if (data?.error) {
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
      await this.invoke("google-sync", {
        action: "delete_sync",
        task_id: taskId,
      });
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
    const data = await this.invoke("google-sync", { action: "sync_all" });
    if (data?.error) throw new Error(data.error);
    return { synced: data.synced, total: data.total, errors: data.errors };
  }

  /**
   * Pull changes from Google Calendar back into local tasks
   */
  async pullChanges(): Promise<{ changes: any[] }> {
    const data = await this.invoke("google-sync", {
      action: "pull_changes",
    });
    if (data?.error) throw new Error(data.error);
    return { changes: data.changes };
  }
}

// Export singleton instance
export const googleCalendarService = GoogleCalendarService.getInstance();
export default googleCalendarService;
