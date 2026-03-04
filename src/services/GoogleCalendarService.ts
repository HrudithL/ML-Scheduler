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
      action: "get_auth_url",
      redirect_uri: redirectUri,
    });

    if (!data?.url) {
      throw new Error(data?.error || "Failed to get Google authorization URL");
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
      action: "exchange_code",
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
   * This is the original method - kept for backward compatibility
   */
  async pullChanges(): Promise<{ changes: any[] }> {
    const data = await this.invoke("google-sync", {
      action: "pull_changes",
    });
    if (data?.error) throw new Error(data.error);
    return { changes: data.changes };
  }

  /**
   * Enhanced 2-way sync: Pull changes from Google Calendar and apply them locally
   * Returns information about what was synced and any conflicts
   */
  async syncFromGoogle(): Promise<SyncFromGoogleResult> {
    if (!this._connected) {
      const connected = await this.isConnected();
      if (!connected) {
        return { 
          success: false, 
          updatedTasks: [], 
          conflicts: [], 
          error: "Not connected to Google Calendar" 
        };
      }
    }

    try {
      const data = await this.invoke("google-sync", {
        action: "sync_from_google",
      });

      if (data?.error) {
        return { 
          success: false, 
          updatedTasks: [], 
          conflicts: [], 
          error: data.error 
        };
      }

      return {
        success: true,
        updatedTasks: data.updated_tasks || [],
        conflicts: data.conflicts || [],
        deletedTasks: data.deleted_tasks || [],
        newEvents: data.new_events || [],
      };
    } catch (err) {
      console.error("Failed to sync from Google:", err);
      return { 
        success: false, 
        updatedTasks: [], 
        conflicts: [], 
        error: String(err) 
      };
    }
  }

  /**
   * Fetch Google Calendar events for a given time range.
   * Returns raw calendar events to display alongside tasks.
   */
  async fetchCalendarEvents(
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarEvent[]> {
    if (!this._connected) {
      const connected = await this.isConnected();
      if (!connected) return [];
    }

    try {
      const data = await this.invoke("google-sync", {
        action: "fetch_calendar_events",
        time_min: timeMin,
        time_max: timeMax,
      });

      if (data?.error) {
        console.error("Error fetching calendar events:", data.error);
        return [];
      }

      return (data?.events ?? []).map((e: any) => ({
        id: e.id,
        title: e.summary ?? "(No Title)",
        start: e.start?.dateTime ?? e.start?.date ?? "",
        end: e.end?.dateTime ?? e.end?.date ?? "",
        allDay: !e.start?.dateTime,
        description: e.description ?? "",
        location: e.location ?? "",
        htmlLink: e.htmlLink ?? "",
        isGoogleEvent: true,
      }));
    } catch (err) {
      console.error("Failed to fetch Google Calendar events:", err);
      return [];
    }
  }

  /**
   * Sync a task to Google Calendar with specific date/time and reminders.
   * Sets reminders for morning of due date (8 AM) and 30 min before due time.
   */
  async syncTaskWithReminders(
    taskId: string,
    startAt: string,
    endAt: string,
    dueAt: string | null,
  ): Promise<void> {
    if (!this._connected) {
      const connected = await this.isConnected();
      if (!connected) return;
    }

    try {
      const data = await this.invoke("google-sync", {
        action: "sync_task_with_reminders",
        task_id: taskId,
        start_at: startAt,
        end_at: endAt,
        due_at: dueAt,
        reminders: {
          morning_of_due: true, // 8 AM on due date
          before_due_minutes: 30, // 30 minutes before
        },
      });
      if (data?.error) {
        console.error("Google sync with reminders error:", data.error);
      }
    } catch (err) {
      console.error("Failed to sync task with reminders:", err);
    }
  }

  /**
   * Remove a completed task from Google Tasks (but keep calendar event for history)
   */
  async removeCompletedTask(taskId: string): Promise<void> {
    if (!this._connected) {
      const connected = await this.isConnected();
      if (!connected) return;
    }

    try {
      await this.invoke("google-sync", {
        action: "complete_task",
        task_id: taskId,
      });
    } catch (err) {
      console.error("Failed to remove completed task from Google:", err);
    }
  }
}

/** Represents a Google Calendar event for display */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  description: string;
  location: string;
  htmlLink: string;
  isGoogleEvent: boolean;
}

/** Result of syncing from Google Calendar back to local */
export interface SyncFromGoogleResult {
  success: boolean;
  updatedTasks: Array<{
    taskId: string;
    changes: {
      planned_start_at?: string;
      planned_end_at?: string;
      title?: string;
      description?: string;
    };
  }>;
  conflicts: Array<{
    taskId: string;
    localValue: any;
    googleValue: any;
    field: string;
  }>;
  deletedTasks?: string[];
  newEvents?: any[];
  error?: string;
}

// Export singleton instance
export const googleCalendarService = GoogleCalendarService.getInstance();
export default googleCalendarService;
