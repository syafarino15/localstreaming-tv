/**
 * Subtitle parsing and rendering support.
 *
 * expo-video exposes subtitle tracks that are embedded in the container, but it
 * cannot load a sidecar `.srt`/`.vtt` file. Since the media ingest engine pairs
 * sidecar files from the flashdisk, the player renders them itself: the cues are
 * parsed here and drawn as an overlay driven by the player clock.
 */

export interface Cue {
  start: number;
  end: number;
  text: string;
}

const TIMESTAMP = /(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})/;

function toSeconds(match: RegExpMatchArray): number {
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const millis = Number((match[4] ?? "0").padEnd(3, "0"));
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/**
 * Parses SRT or WebVTT content into ordered cues.
 *
 * Malformed blocks are skipped rather than failing the whole file: a single bad
 * cue must never prevent a film from playing.
 */
export function parseSubtitles(raw: string): Cue[] {
  if (!raw.trim()) {
    return [];
  }

  const normalised = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalised.split(/\n{2,}/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      continue;
    }

    // Drop the numeric index line used by SRT.
    if (/^\d+$/.test(lines[0]?.trim() ?? "")) {
      lines.shift();
    }

    const timingLine = lines[0];
    if (!timingLine || !timingLine.includes("-->")) {
      continue;
    }

    const [rawStart, rawEnd] = timingLine.split("-->");
    const startMatch = rawStart?.trim().match(TIMESTAMP);
    const endMatch = rawEnd?.trim().match(TIMESTAMP);
    if (!startMatch || !endMatch) {
      continue;
    }

    const text = lines
      .slice(1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\{[^}]+\}/g, "")
      .trim();

    if (text === "") {
      continue;
    }

    cues.push({
      start: toSeconds(startMatch),
      end: toSeconds(endMatch),
      text,
    });
  }

  cues.sort((a, b) => a.start - b.start);
  return cues;
}

/** Returns the cue that should be visible at the given playback time. */
export function activeCueText(cues: Cue[], timeSeconds: number): string {
  if (cues.length === 0) {
    return "";
  }

  // Cues are sorted, so a linear scan is cheap for the few hundred entries a
  // normal film has, and it keeps this function pure and easy to test.
  let current = "";
  for (const cue of cues) {
    if (cue.start > timeSeconds) {
      break;
    }
    if (timeSeconds <= cue.end) {
      current = cue.text;
    }
  }
  return current;
}
