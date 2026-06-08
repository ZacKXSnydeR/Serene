export function cleanTrackTitle(title: string): string {
  if (!title) return title;
  
  return title
    // Remove (Official Video), [Official Music Video], etc.
    .replace(/\s*[\[\(](?:Official\s+)?(?:Music\s+)?(?:Video|Audio|Lyric(?:s)?(?:\s+Video)?)[\]\)]/gi, "")
    // Remove (Encore), (Live), etc.
    .replace(/\s*[\[\(](?:Encore|Live|Remastered|Performance|Visualizer)[\]\)]/gi, "")
    // Remove " - Topic" or similar common YouTube suffixes
    .replace(/\s*-\s*Topic\s*/gi, "")
    .trim();
}
