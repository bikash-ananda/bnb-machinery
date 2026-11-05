/**
 * Tihar greeting engine (Nepali only).
 *
 * EDIT TIHAR_STAGES EVERY YEAR. Dates differ between sources, so confirm them against the
 * government holiday notice / Nepal Panchanga Nirnayak Samiti / Hamro Patro before publishing.
 * All times are Nepal time (UTC+5:45). A stage is active when from <= now < to.
 */
export type TiharTheme = "general" | "kaag" | "kukur" | "laxmi" | "goru" | "bhaitika";
export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

export type TiharStage = { theme: Exclude<TiharTheme, "general">; from: string; to: string };

/** Tihar 2083 BS (Nov 2026). Kukur Tihar and Laxmi Puja share Nov 8, so Laxmi starts at 5 pm. */
export const TIHAR_STAGES: readonly TiharStage[] = [
  { theme: "kaag", from: "2026-11-07T00:00:00+05:45", to: "2026-11-08T00:00:00+05:45" },
  { theme: "kukur", from: "2026-11-08T00:00:00+05:45", to: "2026-11-08T17:00:00+05:45" },
  { theme: "laxmi", from: "2026-11-08T17:00:00+05:45", to: "2026-11-10T00:00:00+05:45" },
  { theme: "goru", from: "2026-11-10T00:00:00+05:45", to: "2026-11-11T00:00:00+05:45" },
  { theme: "bhaitika", from: "2026-11-11T00:00:00+05:45", to: "2026-11-12T00:00:00+05:45" },
];

export const NEPAL_UTC_OFFSET_MINUTES = 345;
export const SIGNATURE = "बि एण्ड बि मेसिनरी परिवार";

const SALUTATIONS: Record<DayPeriod, string> = {
  morning: "शुभ प्रभात!",
  afternoon: "शुभ दिन!",
  evening: "शुभ सन्ध्या!",
  night: "शुभ रात्रि!",
};

const TITLES: Record<TiharTheme, string> = {
  general: "शुभ तिहार!",
  kaag: "काग तिहारको शुभकामना!",
  kukur: "कुकुर तिहारको शुभकामना!",
  laxmi: "गाई तिहार तथा लक्ष्मी पूजाको शुभकामना!",
  goru: "गोवर्धन तथा म्ह पूजाको शुभकामना!",
  bhaitika: "भाइटीकाको शुभकामना!",
};

/** Three wishes per theme; repeat visits rotate through them. */
const WISHES: Record<TiharTheme, readonly [string, string, string]> = {
  general: [
    "तिहारको यो पावन पर्वले तपाईंको घरमा सुख, शान्ति र समृद्धि ल्याओस्।",
    "दीपको उज्यालोले जीवनका सबै अन्धकार हटाओस्।",
    "तपाईं र तपाईंको परिवारमा सुस्वास्थ्य र सफलताको हार्दिक कामना।",
  ],
  kaag: [
    "काग तिहारको पावन अवसरमा सुखद खबर र शुभ समाचारको हार्दिक कामना।",
    "आजबाट पाँच दिने तिहारको शुभारम्भ भएको छ; सबैको जीवन मंगलमय होस्।",
    "दीपावलीको पहिलो उज्यालोले तपाईंको घरमा खुसी र शान्ति ल्याओस्।",
  ],
  kukur: [
    "वफादारी र मित्रताको पर्व कुकुर तिहारको हार्दिक शुभकामना।",
    "घर र परिवारका रक्षक साथीलाई सम्मान गर्ने यो दिन मंगलमय होस्।",
    "माला, टीका र मायाले भरिएको यो दिनले सबैलाई खुसी दिओस्।",
  ],
  laxmi: [
    "लक्ष्मी माताको कृपाले तपाईंको घर र व्यवसायमा सुख, समृद्धि र सफलता छाओस्।",
    "दीप बालेर लक्ष्मीको स्वागत गरौँ; सबैका घर-आँगन उज्यालो र खुसीले भरिऊन्।",
    "यो दीपावलीमा परिवार र व्यापार दुवैमा शान्ति, स्वास्थ्य र उन्नतिको कामना।",
  ],
  goru: [
    "गोवर्धन पूजा, म्ह पूजा र नेपाल सम्वत्को नयाँ वर्षको हार्दिक मंगलमय शुभकामना।",
    "आफ्नो र परिवारको उन्नति, आत्मविश्वास र सुस्वास्थ्यको कामना।",
    "कर्म, कृषि र व्यवसायमा नयाँ उत्साह र समृद्धि प्राप्त होस्।",
  ],
  bhaitika: [
    "दाजुभाइ र दिदीबहिनीबीचको अटुट मायाको पर्व भाइटीकाको हार्दिक शुभकामना।",
    "सप्तरङ्गी टीकाले दीर्घायु, सफलता र खुसी प्रदान गरोस्।",
    "भाइटीकाको शुभ दिनमा सम्पूर्ण परिवारमा माया र एकता बढोस्।",
  ],
};

export type TiharGreeting = {
  theme: TiharTheme;
  period: DayPeriod;
  /** 0, 1 or 2. Changes the petal colour and the wish on repeat visits. */
  variant: 0 | 1 | 2;
  salutation: string;
  title: string;
  message: string;
  signature: string;
};

/** Hour of the day (0-23) in Nepal, whatever the visitor's own time zone is. */
export function getNepalHour(now: number): number {
  return new Date(now + NEPAL_UTC_OFFSET_MINUTES * 60_000).getUTCHours();
}

export function getDayPeriod(now: number): DayPeriod {
  const h = getNepalHour(now);
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function getTiharTheme(now: number, stages: readonly TiharStage[] = TIHAR_STAGES): TiharTheme {
  for (const s of stages) {
    if (Date.parse(s.from) <= now && now < Date.parse(s.to)) return s.theme;
  }
  return "general";
}

/** `visit` counts the visitor's sessions (0 when unknown). */
export function getTiharGreeting(now: number, visit = 0, stages: readonly TiharStage[] = TIHAR_STAGES): TiharGreeting {
  const v = Number.isFinite(visit) ? Math.trunc(visit) : 0;
  const variant = (((v % 3) + 3) % 3) as 0 | 1 | 2;
  const theme = getTiharTheme(now, stages);
  const period = getDayPeriod(now);
  return {
    theme,
    period,
    variant,
    salutation: SALUTATIONS[period],
    title: TITLES[theme],
    message: WISHES[theme][variant],
    signature: SIGNATURE,
  };
}
