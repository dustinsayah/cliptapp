/**
 * lib/sportsConfig.ts
 * Single source of truth for all sport data used across the app.
 * Import from here — never duplicate sport/position/stat data in components.
 */

export interface StatField {
  label: string;
  key: string;
  placeholder: string;
  benchmark: number;
}

export interface ClipType {
  label: string;
  confidence: number;
}

export interface MeasurableField {
  label: string;
  key: string;
  placeholder: string;
}

export interface SportConfig {
  icon: string;
  positions: string[];
  recommendedLength: { min: number; max: number; warnAt: number };
  measurables: MeasurableField[];
  clipLabels: string[];
  clipTypes: ClipType[];
  getClipTypes: (position: string) => ClipType[];
  getStatFields: (position: string) => { base: StatField[]; extra: StatField[] };
}

export const SPORTS_CONFIG: Record<string, SportConfig> = {
  Basketball: {
    icon: "🏀",
    positions: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    recommendedLength: { min: 1, max: 4, warnAt: 240 },
    measurables: [
      { label: "Height",       key: "height_m",    placeholder: "6'3\""         },
      { label: "Weight",       key: "weight_m",    placeholder: "185 lbs"       },
      { label: "Wingspan",     key: "wingspan",    placeholder: "6'7\""         },
      { label: "Vertical",     key: "vertical",    placeholder: "36\""          },
      { label: "Hand Size",    key: "handsize",    placeholder: "9.5\""         },
      { label: "Sprint Speed", key: "sprintspeed", placeholder: "4.45s"        },
    ],
    clipLabels: ["Layup/Dunk", "Jump Shot", "3-Pointer", "Block", "Steal", "Assist", "Defense", "Rebound", "Free Throw", "Transition"],
    clipTypes: [
      { label: "Scoring Play",    confidence: 0.97 },
      { label: "Defensive Stop",  confidence: 0.94 },
      { label: "Assist",          confidence: 0.91 },
      { label: "Three Pointer",   confidence: 0.89 },
      { label: "Drive to Basket", confidence: 0.87 },
      { label: "Hustle Play",     confidence: 0.84 },
      { label: "Fast Break",      confidence: 0.81 },
      { label: "Post Move",       confidence: 0.78 },
    ],
    getClipTypes: (_position) => [
      { label: "Scoring Play",    confidence: 0.97 },
      { label: "Defensive Stop",  confidence: 0.94 },
      { label: "Assist",          confidence: 0.91 },
      { label: "Three Pointer",   confidence: 0.89 },
      { label: "Drive to Basket", confidence: 0.87 },
      { label: "Hustle Play",     confidence: 0.84 },
      { label: "Fast Break",      confidence: 0.81 },
      { label: "Post Move",       confidence: 0.78 },
    ],
    getStatFields: (_position) => ({
      base: [
        { label: "PPG",  key: "ppg", placeholder: "18.5", benchmark: 25 },
        { label: "RPG",  key: "rpg", placeholder: "7.2",  benchmark: 12 },
        { label: "APG",  key: "apg", placeholder: "4.1",  benchmark: 10 },
        { label: "SPG",  key: "spg", placeholder: "1.8",  benchmark: 3  },
        { label: "FG%",  key: "fg",  placeholder: "47%",  benchmark: 55 },
        { label: "3PT%", key: "tpt", placeholder: "38%",  benchmark: 45 },
      ],
      extra: [
        { label: "MPG",    key: "mpg",    placeholder: "28",    benchmark: 35  },
        { label: "BPG",    key: "bpg",    placeholder: "0.8",   benchmark: 3   },
        { label: "TOV",    key: "tov",    placeholder: "2.1",   benchmark: 5   },
        { label: "+/-",    key: "pm",     placeholder: "+8",    benchmark: 15  },
        { label: "FT%",    key: "ft",     placeholder: "78%",   benchmark: 90  },
        { label: "OREB",   key: "oreb",   placeholder: "1.8",   benchmark: 5   },
        { label: "DREB",   key: "dreb",   placeholder: "5.2",   benchmark: 8   },
        { label: "AST/TO", key: "astto",  placeholder: "2.4",   benchmark: 4   },
        { label: "GP",     key: "gp",     placeholder: "28",    benchmark: 35  },
        { label: "Record", key: "record", placeholder: "22-8",  benchmark: 0   },
      ],
    }),
  },

  Football: {
    icon: "🏈",
    positions: [
      "Quarterback", "Running Back", "Wide Receiver", "Tight End",
      "Offensive Lineman", "Defensive End", "Defensive Tackle",
      "Linebacker", "Cornerback", "Safety", "Kicker", "Punter",
    ],
    recommendedLength: { min: 1, max: 5, warnAt: 300 },
    measurables: [
      { label: "Height",      key: "height_m", placeholder: "6'2\""  },
      { label: "Weight",      key: "weight_m", placeholder: "215 lbs" },
      { label: "40-Yard Dash",key: "forty",    placeholder: "4.52s"  },
      { label: "Bench Press", key: "bench",    placeholder: "225 lbs" },
      { label: "Vertical",    key: "vertical", placeholder: "34\""   },
      { label: "Shuttle",     key: "shuttle",  placeholder: "4.15s"  },
    ],
    clipLabels: ["Run", "Reception", "Block", "Tackle", "Sack", "Interception", "Route", "Kickoff", "Pass", "Blitz"],
    clipTypes: [
      { label: "Touchdown",      confidence: 0.96 },
      { label: "Big Play",       confidence: 0.93 },
      { label: "Key Block",      confidence: 0.90 },
      { label: "Sack",           confidence: 0.88 },
      { label: "Interception",   confidence: 0.85 },
      { label: "Tackle for Loss",confidence: 0.82 },
      { label: "Special Teams",  confidence: 0.79 },
      { label: "Hustle Play",    confidence: 0.76 },
    ],
    getClipTypes: (position) => {
      if (position === "Quarterback") return [
        { label: "Touchdown Pass",    confidence: 0.97 },
        { label: "Scramble",          confidence: 0.94 },
        { label: "Deep Ball",         confidence: 0.91 },
        { label: "Quick Release",     confidence: 0.88 },
        { label: "Red Zone TD",       confidence: 0.86 },
        { label: "Play Action",       confidence: 0.83 },
        { label: "Two-Minute Drill",  confidence: 0.80 },
        { label: "Mobile Play",       confidence: 0.77 },
      ];
      if (position === "Running Back") return [
        { label: "Touchdown Run",       confidence: 0.96 },
        { label: "Break Away Run",      confidence: 0.93 },
        { label: "Highlight Catch",     confidence: 0.90 },
        { label: "Yards After Contact", confidence: 0.87 },
        { label: "Blitz Pickup",        confidence: 0.84 },
        { label: "Spin Move",           confidence: 0.81 },
        { label: "Open Field Run",      confidence: 0.78 },
        { label: "Goal Line Run",       confidence: 0.75 },
      ];
      if (["Wide Receiver", "Tight End"].includes(position)) return [
        { label: "Highlight Catch",       confidence: 0.97 },
        { label: "Touchdown Reception",   confidence: 0.94 },
        { label: "Route Run",             confidence: 0.91 },
        { label: "YAC Run",               confidence: 0.88 },
        { label: "Deep Ball",             confidence: 0.85 },
        { label: "Red Zone Catch",        confidence: 0.82 },
        { label: "Jump Ball",             confidence: 0.79 },
        { label: "Back Shoulder Catch",   confidence: 0.76 },
      ];
      if (["Linebacker", "Cornerback", "Safety", "Defensive End", "Defensive Tackle"].includes(position)) return [
        { label: "Sack",           confidence: 0.97 },
        { label: "Tackle for Loss",confidence: 0.94 },
        { label: "Interception",   confidence: 0.91 },
        { label: "Pass Breakup",   confidence: 0.88 },
        { label: "Forced Fumble",  confidence: 0.85 },
        { label: "Blitz",          confidence: 0.82 },
        { label: "Run Stop",       confidence: 0.79 },
        { label: "Zone Coverage",  confidence: 0.76 },
      ];
      return [
        { label: "Touchdown",      confidence: 0.96 },
        { label: "Big Play",       confidence: 0.93 },
        { label: "Key Block",      confidence: 0.90 },
        { label: "Sack",           confidence: 0.88 },
        { label: "Interception",   confidence: 0.85 },
        { label: "Tackle for Loss",confidence: 0.82 },
        { label: "Special Teams",  confidence: 0.79 },
        { label: "Hustle Play",    confidence: 0.76 },
      ];
    },
    getStatFields: (position) => {
      if (position === "Quarterback") return {
        base: [
          { label: "Pass Yds", key: "passyds", placeholder: "2,847", benchmark: 4000 },
          { label: "TDs",      key: "tds",     placeholder: "28",    benchmark: 40   },
          { label: "Comp%",    key: "comppct", placeholder: "67%",   benchmark: 70   },
          { label: "Rush Yds", key: "rushyds", placeholder: "312",   benchmark: 1000 },
          { label: "INT",      key: "ints",    placeholder: "5",     benchmark: 10   },
          { label: "Rating",   key: "rating",  placeholder: "108",   benchmark: 120  },
        ],
        extra: [
          { label: "Yds/Att",  key: "ypa",      placeholder: "8.2", benchmark: 10 },
          { label: "Long",     key: "longcomp", placeholder: "72",   benchmark: 80 },
          { label: "Rush TDs", key: "rushtds",  placeholder: "4",    benchmark: 10 },
          { label: "Fumbles",  key: "fumbles",  placeholder: "2",    benchmark: 5  },
        ],
      };
      if (position === "Running Back") return {
        base: [
          { label: "Rush Yds",  key: "rushyds", placeholder: "1,204", benchmark: 2000 },
          { label: "TDs",       key: "tds",     placeholder: "14",    benchmark: 20   },
          { label: "Yds/Carry", key: "ypc",     placeholder: "6.2",   benchmark: 7    },
          { label: "Rec",       key: "rec",     placeholder: "38",    benchmark: 80   },
          { label: "Long",      key: "long",    placeholder: "68",    benchmark: 80   },
        ],
        extra: [
          { label: "YAC",     key: "yac",     placeholder: "312", benchmark: 500 },
          { label: "Fumbles", key: "fumbles", placeholder: "1",   benchmark: 5   },
        ],
      };
      if (["Wide Receiver", "Tight End"].includes(position)) return {
        base: [
          { label: "Rec Yds", key: "recyds",  placeholder: "1,204", benchmark: 1500 },
          { label: "TDs",     key: "tds",     placeholder: "12",    benchmark: 20   },
          { label: "Rec",     key: "rec",     placeholder: "72",    benchmark: 120  },
          { label: "Yds/Rec", key: "ypr",     placeholder: "16.7",  benchmark: 20   },
          { label: "Targets", key: "targets", placeholder: "98",    benchmark: 140  },
        ],
        extra: [
          { label: "Long",      key: "long",     placeholder: "78", benchmark: 80 },
          { label: "Drop Rate", key: "droprate", placeholder: "4%", benchmark: 10 },
        ],
      };
      if (["Linebacker", "Cornerback", "Safety", "Defensive End", "Defensive Tackle"].includes(position)) return {
        base: [
          { label: "Tackles", key: "tackles", placeholder: "89",  benchmark: 120 },
          { label: "Sacks",   key: "sacks",   placeholder: "7.5", benchmark: 15  },
          { label: "INTs",    key: "ints",    placeholder: "3",   benchmark: 8   },
          { label: "PBUs",    key: "pbus",    placeholder: "12",  benchmark: 20  },
          { label: "TFLs",    key: "tfls",    placeholder: "11",  benchmark: 20  },
        ],
        extra: [
          { label: "FF",       key: "ff",      placeholder: "2",  benchmark: 5  },
          { label: "FR",       key: "fr",      placeholder: "1",  benchmark: 3  },
          { label: "Pass Def", key: "passdef", placeholder: "8",  benchmark: 20 },
          { label: "QB Hurry", key: "qbhurry", placeholder: "12", benchmark: 20 },
        ],
      };
      return { base: [], extra: [] };
    },
  },

  Lacrosse: {
    icon: "🥍",
    positions: ["Attack", "Midfield", "Defense", "Goalkeeper", "Long Stick Midfielder"],
    recommendedLength: { min: 1, max: 4, warnAt: 240 },
    measurables: [
      { label: "Height",      key: "height_m",    placeholder: "6'0\""  },
      { label: "Weight",      key: "weight_m",    placeholder: "185 lbs"},
      { label: "Shot Speed",  key: "shotspeed",   placeholder: "82 mph" },
      { label: "Sprint Speed",key: "sprintspeed", placeholder: "4.6s"   },
      { label: "Vertical",    key: "vertical",    placeholder: "32\""   },
      { label: "Stick Hand",  key: "stickhand",   placeholder: "Right"  },
    ],
    clipLabels: ["Goal", "Assist", "Groundball", "Caused Turnover", "Save", "Behind the Back", "Dodge", "Clear", "Faceoff Win", "Man-up Goal"],
    clipTypes: [
      { label: "Goal",                  confidence: 0.97 },
      { label: "Assist",                confidence: 0.94 },
      { label: "Groundball Pick-up",    confidence: 0.91 },
      { label: "Caused Turnover",       confidence: 0.88 },
      { label: "Behind the Back Shot",  confidence: 0.85 },
      { label: "Dive Goal",             confidence: 0.82 },
      { label: "Man-up Goal",           confidence: 0.79 },
      { label: "Clear",                 confidence: 0.76 },
    ],
    getClipTypes: (position) => {
      if (position === "Goalkeeper") return [
        { label: "Big Save",        confidence: 0.97 },
        { label: "Diving Save",     confidence: 0.95 },
        { label: "Outlet Pass",     confidence: 0.90 },
        { label: "Shot Stopped",    confidence: 0.87 },
        { label: "Clear Started",   confidence: 0.84 },
        { label: "Low Save",        confidence: 0.81 },
        { label: "Man-down Save",   confidence: 0.78 },
        { label: "Quick Stick",     confidence: 0.75 },
      ];
      if (position === "Defense" || position === "Long Stick Midfielder") return [
        { label: "Caused Turnover",  confidence: 0.97 },
        { label: "Groundball Pick-up",confidence: 0.94 },
        { label: "Clamp",            confidence: 0.91 },
        { label: "Clear",            confidence: 0.88 },
        { label: "Man-down Stop",    confidence: 0.85 },
        { label: "Interception",     confidence: 0.82 },
        { label: "Pursuit Check",    confidence: 0.79 },
        { label: "Assist",           confidence: 0.76 },
      ];
      return [
        { label: "Goal",                 confidence: 0.97 },
        { label: "Assist",               confidence: 0.94 },
        { label: "Groundball Pick-up",   confidence: 0.91 },
        { label: "Behind the Back Shot", confidence: 0.88 },
        { label: "Dive Goal",            confidence: 0.85 },
        { label: "Man-up Goal",          confidence: 0.82 },
        { label: "Dodge",                confidence: 0.79 },
        { label: "Clear",                confidence: 0.76 },
      ];
    },
    getStatFields: (position) => {
      if (position === "Goalkeeper") return {
        base: [
          { label: "Saves",         key: "saves",    placeholder: "142",  benchmark: 200 },
          { label: "Save%",         key: "savepct",  placeholder: "54%",  benchmark: 65  },
          { label: "Goals Against", key: "ga",       placeholder: "122",  benchmark: 200 },
          { label: "GAA",           key: "gaa",      placeholder: "8.4",  benchmark: 15  },
          { label: "GB",            key: "gb",       placeholder: "18",   benchmark: 40  },
          { label: "Clear%",        key: "clrpct",   placeholder: "82%",  benchmark: 92  },
        ],
        extra: [],
      };
      return {
        base: [
          { label: "Goals",   key: "goals",   placeholder: "42",  benchmark: 80  },
          { label: "Assists", key: "assists", placeholder: "28",  benchmark: 60  },
          { label: "Points",  key: "points",  placeholder: "70",  benchmark: 120 },
          { label: "Shots",   key: "shots",   placeholder: "98",  benchmark: 150 },
          { label: "GB",      key: "gb",      placeholder: "52",  benchmark: 100 },
          { label: "CTO",     key: "cto",     placeholder: "22",  benchmark: 50  },
        ],
        extra: [
          { label: "2-pt Goals", key: "twopt",  placeholder: "4",   benchmark: 10 },
          { label: "Faceoff%",   key: "fopct",  placeholder: "58%", benchmark: 75 },
          { label: "Man-up G",   key: "manupg", placeholder: "8",   benchmark: 20 },
          { label: "Turnovers",  key: "tos",    placeholder: "14",  benchmark: 30 },
        ],
      };
    },
  },
};

export const SPORT_NAMES = Object.keys(SPORTS_CONFIG);

export function getSportConfig(sport: string): SportConfig | null {
  return SPORTS_CONFIG[sport] ?? null;
}

export function getSportIcon(sport: string): string {
  return SPORTS_CONFIG[sport]?.icon ?? "🏆";
}
