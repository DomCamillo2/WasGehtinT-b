export type Locale = "de" | "en";

export const defaultLocale: Locale = "de";

const copy = {
  de: {
    profile: {
      title: "Profil",
      subtitle: "Öffentliche Ansicht innerhalb der Plattform",
      hiddenTitle: "Profil ist verborgen",
      hiddenBody: "Diese Person hat das Profil auf verborgen gestellt.",
      age: "Alter",
      studyProgram: "Studiengang",
      gender: "Geschlecht",
      backToDiscover: "Zurück zu Entdecken",
      ownProfileCta: "Zum eigenen Profil",
      noName: "Ohne Namen",
      genderValues: {
        female: "weiblich",
        male: "männlich",
        diverse: "divers",
      },
    },
  },
  en: {
    profile: {
      title: "Profile",
      subtitle: "Public view inside the platform",
      hiddenTitle: "Profile is hidden",
      hiddenBody: "This person has set their profile visibility to hidden.",
      age: "Age",
      studyProgram: "Study program",
      gender: "Gender",
      backToDiscover: "Back to discover",
      ownProfileCta: "Go to my profile",
      noName: "No name",
      genderValues: {
        female: "female",
        male: "male",
        diverse: "diverse",
      },
    },
  },
} as const;

export function getCopy(locale: Locale = defaultLocale) {
  return copy[locale];
}
