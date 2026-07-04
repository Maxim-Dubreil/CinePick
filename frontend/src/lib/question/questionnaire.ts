import type { Question, QuestionOption } from "./types";

export const GENRES = [
  "Action",
  "Aventure",
  "Animation",
  "Comédie",
  "Crime",
  "Documentaire",
  "Drame",
  "Familial",
  "Fantastique",
  "Histoire",
  "Horreur",
  "Musique",
  "Mystère",
  "Romance",
  "Science-Fiction",
  "Thriller",
  "Guerre",
  "Western",
] as const;

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

export const AMBIANCES = [
  "Spatial",
  "Futuriste",
  "Historique",
  "Urbain",
  "Rural",
  "Film noir",
  "Nature",
  "Guerre",
  "Fantastique",
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

function withExtraOption(
  options: QuestionOption[],
  extra: QuestionOption,
): QuestionOption[] {
  return [...options, extra];
}

export function getQuestions(): Question[] {
  const genreOptions = withExtraOption(
    GENRES.map((g) => ({ id: g, label: g })),
    { id: "none", label: "Pas de préférence" },
  );
  const emotionOptions = withExtraOption(
    EMOTIONS.map((e) => ({ id: e, label: e })),
    { id: "none", label: "Peu m'importe" },
  );
  const ambianceOptions = withExtraOption(
    AMBIANCES.map((a) => ({ id: a, label: a })),
    { id: "none", label: "Pas de préférence" },
  );
  const regionOptions: QuestionOption[] = [
    ...REGIONS,
    { id: "none", label: "Pas de préférence" },
    { id: "other", label: "Autre région" },
  ];

  return [
    {
      id: "genre",
      label: "Quel genre te tente ce soir ?",
      hard: true,
      multi: true,
      exclusiveId: "none",
      options: genreOptions,
    },
    {
      id: "emotion",
      label: "Tu as envie de ressentir quoi ?",
      hard: false,
      multi: true,
      exclusiveId: "none",
      options: emotionOptions,
    },
    {
      id: "ambiance",
      label: "Quelle ambiance tu cherches ?",
      hard: false,
      multi: true,
      exclusiveId: "none",
      options: ambianceOptions,
    },
    {
      id: "withWho",
      label: "Tu regardes avec qui ce soir ?",
      hard: false,
      multi: false,
      options: [
        { id: "seul", label: "Seul" },
        { id: "amis", label: "Entre amis" },
        { id: "couple", label: "En couple" },
        { id: "famille", label: "En famille" },
        { id: "any", label: "Pas de préférence" },
      ],
    },
    {
      id: "duration",
      label: "Tu as combien de temps devant toi ?",
      hard: true,
      multi: false,
      options: [
        { id: "lt90", label: "Moins d'1h30" },
        { id: "90-120", label: "1h30–2h" },
        { id: "120-150", label: "2h–2h30" },
        { id: "150plus", label: "2h30+" },
        { id: "any", label: "Peu importe" },
      ],
    },
    {
      id: "era",
      label: "Une époque en tête ?",
      hard: true,
      multi: false,
      options: [
        { id: "silent", label: "Muet & Noir/Blanc (avant 1930)" },
        { id: "golden", label: "Âge d'or Hollywood (1930–1959)" },
        { id: "newwave", label: "Nouvelle Vague & Westerns (1960–1979)" },
        { id: "blockbuster", label: "Blockbusters & Indie (1980–1999)" },
        { id: "2000s", label: "2000–2014" },
        { id: "recent", label: "Récent (2015+)" },
        { id: "any", label: "Pas de préférence" },
      ],
    },
    {
      id: "region",
      label: "Une région du monde qui t'attire ?",
      hard: true,
      multi: true,
      exclusiveId: "none",
      options: regionOptions,
    },
    {
      id: "subtitles",
      label: "Sous-titres ou pas ?",
      hard: false,
      multi: false,
      options: [
        { id: "with", label: "Avec sous-titres" },
        { id: "without", label: "Sans sous-titre" },
        { id: "any", label: "Pas de préférence" },
      ],
    },
    {
      id: "seen",
      label: "Tu veux du jamais-vu ?",
      hard: true,
      multi: false,
      options: [
        { id: "nouveau", label: "Non, je veux du nouveau" },
        { id: "any", label: "Peu importe" },
      ],
    },
  ];
}
