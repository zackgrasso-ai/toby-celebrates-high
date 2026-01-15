// Calendar event details
const EVENT_DETAILS = {
  title: "Toby's 22nd Birthday Party",
  description: "Join us for an unforgettable evening of celebration at A'DAM 360!",
  location: "A'DAM 360, Overhoeksplein 5, 1031 KS Amsterdam, Netherlands",
  startDate: new Date("2026-02-21T21:00:00+01:00"), // 21:00 CET
  endDate: new Date("2026-02-22T02:00:00+01:00"), // 02:00 next day CET
};

// Format date for Google Calendar (YYYYMMDDTHHMMSS)
const formatGoogleDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  
  // Get timezone offset
  const offset = -date.getTimezoneOffset();
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const offsetSign = offset >= 0 ? "+" : "-";
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}${offsetSign}${offsetHours}${offsetMinutes}`;
};

// Generate Google Calendar URL
export const getGoogleCalendarUrl = (): string => {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: EVENT_DETAILS.title,
    dates: `${formatGoogleDate(EVENT_DETAILS.startDate)}/${formatGoogleDate(EVENT_DETAILS.endDate)}`,
    details: EVENT_DETAILS.description,
    location: EVENT_DETAILS.location,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generate ICS file content
export const generateICSFile = (): string => {
  const formatICSDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    
    // Get timezone offset for CET (UTC+1)
    const offset = -date.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, "0");
    const offsetSign = offset >= 0 ? "+" : "-";
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}${offsetSign}${offsetHours}${offsetMinutes}`;
  };

  const escapeICS = (text: string): string => {
    return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  };

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Toby's Birthday//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@toby-birthday`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(EVENT_DETAILS.startDate)}`,
    `DTEND:${formatICSDate(EVENT_DETAILS.endDate)}`,
    `SUMMARY:${escapeICS(EVENT_DETAILS.title)}`,
    `DESCRIPTION:${escapeICS(EVENT_DETAILS.description)}`,
    `LOCATION:${escapeICS(EVENT_DETAILS.location)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return icsContent;
};

// Download ICS file
export const downloadICSFile = (): void => {
  const icsContent = generateICSFile();
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "toby-birthday-party.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate Apple Calendar download (same as ICS but with better naming)
export const downloadAppleCalendar = (): void => {
  downloadICSFile();
};
