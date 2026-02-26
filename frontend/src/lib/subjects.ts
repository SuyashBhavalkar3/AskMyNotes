export const loadSubjects = () => {
  try {
    const s = localStorage.getItem("askynotes_subjects");
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
};

export const saveSubjects = (subjects: any[]) => {
  // Persist only when a user session/token exists
  const token = localStorage.getItem("askynotes_token") || localStorage.getItem("askynotes_user");
  if (token) {
    try {
      localStorage.setItem("askynotes_subjects", JSON.stringify(subjects));
    } catch (e) {
      console.error("failed to persist subjects", e);
    }
  }
};
