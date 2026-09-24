import { GENRES } from "@/lib/genres";
import type { Question, QuestionOption } from "./types";

export const EMOTIONS = [
  "Peur",
  "Rire",
  "Ému",
  "Tendu",
  "Zen",
  "Inspiré",
  "Nostalgique",
  "Amoureux",
  "Dépaysé",
  "Réfléchi",
  "Choqué",
  "Mystère",
  "Épique",
] as const;

// "Guerre" et "Fantastique" sont volontairement absents : déjà couverts par
// la question Genre, les redemander ici duplique le signal.
export const AMBIANCES = [
  "Spatial",
  "Futuriste",
  "Historique",
  "Urbain",
  "Rural",
  "Film noir",
  "Nature",
  "Conte",
  "Surréaliste",
  "Post-apocalyptique",
  "Médiéval",
  "Dystopique",
  "Mer",
  "Montagne/froid",
  "Minimaliste",
] as const;

export const REGIONS: QuestionOption[] = [
  { id: "US", label: "Américain" },
  { id: "GB", label: "Britannique" },
  { id: "FR", label: "Français" },
  { id: "JP", label: "Japonais" },
  { id: "KR", label: "Sud-Coréen" },
];

export const OTHER_COUNTRIES = [
  "DE",
  "IT",
  "ES",
  "CA",
  "MX",
  "IN",
  "CN",
  "BR",
  "SE",
  "AU",
];

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  allemagne: "DE",
  australia: "AU",
  australie: "AU",
  brésil: "BR",
  bresil: "BR",
  brésilienne: "BR",
  canada: "CA",
  chine: "CN",
  china: "CN",
  corée: "KR",
  coree: "KR",
  espagne: "ES",
  "états-unis": "US",
  "etats-unis": "US",
  france: "FR",
  inde: "IN",
  italie: "IT",
  japon: "JP",
  japan: "JP",
  mexique: "MX",
  "royaume-uni": "GB",
  "royaume uni": "GB",
  suède: "SE",
  suede: "SE",
};

export function resolveCountryCode(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (/^[a-z]{2}$/i.test(normalized)) return normalized.toUpperCase();
  return COUNTRY_NAME_TO_CODE[normalized] ?? null;
}

// Le choix "je m'en fous" est toujours en tête de liste : c'est le chemin
// rapide pour qui ne veut pas se prononcer sur ce critère, il doit se voir
// et se trouver en premier, pas se noyer parmi les autres options.
function withNoPreferenceFirst(
  noPreference: QuestionOption,
  options: QuestionOption[],
): QuestionOption[] {
  return [noPreference, ...options];
}

export function getQuestions(): Question[] {
  const genreOptions = withNoPreferenceFirst(
    { id: "none", label: "Pas de préférence" },
    [...GENRES],
  );
  const emotionOptions = withNoPreferenceFirst(
    { id: "none", label: "Peu m'importe" },
    EMOTIONS.map((e) => ({ id: e, label: e })),
  );
  const ambianceOptions = withNoPreferenceFirst(
    { id: "none", label: "Pas de préférence" },
    AMBIANCES.map((a) => ({ id: a, label: a })),
  );
  const regionOptions: QuestionOption[] = [
    { id: "none", label: "Pas de préférence" },
    ...REGIONS,
    { id: "other", label: "Autre pays" },
  ];

  return [
    {
      id: "duration",
      label: "Tu as combien de temps devant toi ?",
      phase: "Contexte",
      hard: true,
      multi: false,
      exclusiveId: "any",
      options: [
        { id: "any", label: "Peu importe" },
        { id: "lt90", label: "Moins d'1h30" },
        { id: "90-120", label: "1h30–2h" },
        { id: "120-150", label: "2h–2h30" },
        { id: "150plus", label: "2h30+" },
      ],
    },
    {
      id: "withWho",
      label: "Tu regardes avec qui ?",
      phase: "Contexte",
      hard: false,
      multi: false,
      exclusiveId: "any",
      options: [
        { id: "any", label: "Pas de préférence" },
        { id: "seul", label: "Seul" },
        { id: "amis", label: "Entre amis" },
        { id: "couple", label: "En couple" },
        { id: "famille", label: "En famille" },
      ],
    },
    {
      id: "genre",
      label: "Quel genre te tente ?",
      phase: "Contenu",
      hard: true,
      multi: true,
      exclusiveId: "none",
      options: genreOptions,
    },
    {
      id: "era",
      label: "Une époque en tête ?",
      phase: "Contenu",
      hard: true,
      multi: false,
      exclusiveId: "any",
      options: [
        { id: "any", label: "Pas de préférence" },
        { id: "silent", label: "Muet & Noir/Blanc (avant 1930)" },
        { id: "golden", label: "Âge d'or Hollywood (1930–1959)" },
        { id: "newwave", label: "Nouvelle Vague & Westerns (1960–1979)" },
        { id: "blockbuster", label: "Blockbusters & Indie (1980–1999)" },
        { id: "2000s", label: "2000–2014" },
        { id: "recent", label: "Récent (2015+)" },
      ],
    },
    {
      id: "region",
      label: "Produit dans quel pays ?",
      phase: "Contenu",
      hard: true,
      multi: true,
      exclusiveId: "none",
      options: regionOptions,
    },
    {
      id: "emotion",
      label: "Tu as envie de ressentir quoi ?",
      phase: "Ambiance",
      hard: false,
      multi: true,
      exclusiveId: "none",
      options: emotionOptions,
    },
    {
      id: "ambiance",
      label: "Quelle ambiance tu cherches ?",
      phase: "Ambiance",
      hard: false,
      multi: true,
      exclusiveId: "none",
      options: ambianceOptions,
    },
    {
      id: "seen",
      label: "Tu veux du jamais-vu ?",
      phase: "Verrou",
      hard: true,
      multi: false,
      exclusiveId: "any",
      options: [
        { id: "any", label: "Peu importe" },
        { id: "nouveau", label: "Non, je veux du nouveau" },
      ],
    },
  ];
}
