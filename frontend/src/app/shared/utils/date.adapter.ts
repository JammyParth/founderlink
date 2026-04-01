export class DateAdapter {
  /**
   * Converts a backend LocalDateTime string (e.g. "2023-10-01T15:30:00") into a JS Date object.
   */
  static fromServer(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Formats a JS Date into a basic readable string or returns a fallback.
   */
  static formatShortDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
}
