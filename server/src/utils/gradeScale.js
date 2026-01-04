export function gradeFromPercentage(pct) {
  const p = Number(pct);
  if (p >= 85) return { letter: "A",  gp: 4.0 };
  if (p >= 80) return { letter: "A-", gp: 3.7 };
  if (p >= 75) return { letter: "B+", gp: 3.3 };
  if (p >= 70) return { letter: "B",  gp: 3.0 };
  if (p >= 65) return { letter: "B-", gp: 2.7 };
  if (p >= 60) return { letter: "C+", gp: 2.3 };
  if (p >= 55) return { letter: "C",  gp: 2.0 };
  if (p >= 50) return { letter: "D",  gp: 1.0 };
  return { letter: "F", gp: 0.0 };
}
