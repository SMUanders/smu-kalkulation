// Dansk tal- og beløbsformatering. Ren visningslogik — ikke en del af prismotoren.

export function kr(v: number, decimaler = 0): string {
  if (!Number.isFinite(v)) return "–";
  return v.toLocaleString("da-DK", {
    minimumFractionDigits: decimaler,
    maximumFractionDigits: decimaler,
  });
}

export function tal(v: number | null, decimaler = 2): string {
  if (v === null || !Number.isFinite(v)) return "";
  return v.toLocaleString("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimaler,
  });
}

/** Parser dansk taltekst ("2,5" / "1.250,75") til tal. Tom tekst giver null. */
export function parseTal(tekst: string): number | null {
  const t = tekst.trim().replace(/\s/g, "");
  if (t === "") return null;
  const normaliseret = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normaliseret);
  return Number.isFinite(n) ? n : null;
}
