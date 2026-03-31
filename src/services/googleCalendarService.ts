import { ClassSession, Student } from "../types";
import { format, parseISO } from "date-fns";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const googleCalendarService = {
  getAccessToken: () => localStorage.getItem("google_calendar_access_token"),

  async createEvent(session: ClassSession, studentName: string, studentEmail?: string): Promise<string | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    const event: any = {
      summary: `Treino: ${studentName}`,
      description: `Treino de ${session.workoutTitle}\nNotas: ${session.notes || "Nenhuma"}`,
      start: {
        dateTime: new Date(session.start).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(session.end).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: "10", // Green color
    };

    if (studentEmail) {
      event.attendees = [{ email: studentEmail }];
      event.sendUpdates = "all"; // Send invitation email
    }

    try {
      const response = await fetch(CALENDAR_API_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        const data = await response.json();
        return data.id; // Return the Google Calendar event ID
      } else if (response.status === 401) {
        console.error("Google Calendar token expired");
        localStorage.removeItem("google_calendar_access_token");
        return null;
      } else {
        console.error("Failed to create Google Calendar event", await response.text());
        return null;
      }
    } catch (error) {
      console.error("Error creating Google Calendar event", error);
      return null;
    }
  },

  async updateEvent(eventId: string, session: ClassSession, studentName: string): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) return false;

    const event = {
      summary: `Treino: ${studentName}`,
      description: `Treino de ${session.workoutTitle}\nNotas: ${session.notes || "Nenhuma"}`,
      start: {
        dateTime: new Date(session.start).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(session.end).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: session.status === "completed" ? "10" : session.status === "cancelled" ? "11" : "10",
    };

    try {
      const response = await fetch(`${CALENDAR_API_BASE}/${eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (response.status === 401) {
        console.error("Google Calendar token expired");
        localStorage.removeItem("google_calendar_access_token");
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error("Error updating Google Calendar event", error);
      return false;
    }
  },

  async deleteEvent(eventId: string): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const response = await fetch(`${CALENDAR_API_BASE}/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        console.error("Google Calendar token expired");
        localStorage.removeItem("google_calendar_access_token");
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error("Error deleting Google Calendar event", error);
      return false;
    }
  }
};
