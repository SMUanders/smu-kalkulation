// ============================================================================
// Celle-komponenter — indtastning direkte i gridet.
// Målet er "regneark": ingen kant før man rører feltet, dansk talformat,
// og ingen reformattering mens man taster.
// ============================================================================

import { useState } from "react";
import { parseTal, tal } from "../lib/format";

interface TalCelleProps {
  vaerdi: number | null;
  onSaet: (v: number | null) => void;
  decimaler?: number;
  pladsholder?: string;
  ekstraKlasse?: string;
  titel?: string;
}

export function TalCelle({
  vaerdi,
  onSaet,
  decimaler = 2,
  pladsholder = "–",
  ekstraKlasse = "",
  titel,
}: TalCelleProps) {
  const [raa, saetRaa] = useState<string | null>(null);
  const vist = raa !== null ? raa : tal(vaerdi, decimaler);

  return (
    <input
      className={`celle tal ${ekstraKlasse}`}
      value={vist}
      title={titel}
      placeholder={pladsholder}
      inputMode="decimal"
      onChange={(e) => saetRaa(e.target.value)}
      onFocus={(e) => {
        saetRaa(tal(vaerdi, decimaler));
        e.currentTarget.select();
      }}
      onBlur={() => {
        if (raa !== null) onSaet(parseTal(raa));
        saetRaa(null);
      }}
      onKeyDown={(e) => {
        // Enter committer eksplicit — vi må ikke være afhængige af at blur() når frem.
        if (e.key === "Enter") {
          if (raa !== null) onSaet(parseTal(raa));
          saetRaa(null);
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          saetRaa(null);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

interface TekstCelleProps {
  vaerdi: string;
  onSaet: (v: string) => void;
  pladsholder?: string;
  ekstraKlasse?: string;
  titel?: string;
}

export function TekstCelle({
  vaerdi,
  onSaet,
  pladsholder,
  ekstraKlasse = "",
  titel,
}: TekstCelleProps) {
  return (
    <input
      className={`celle ${ekstraKlasse}`}
      value={vaerdi}
      title={titel || vaerdi}
      placeholder={pladsholder}
      onChange={(e) => onSaet(e.target.value)}
    />
  );
}

interface ValgCelleProps<T extends string> {
  vaerdi: T;
  muligheder: { vaerdi: T; tekst: string }[];
  onSaet: (v: T) => void;
  titel?: string;
  ekstraKlasse?: string;
}

export function ValgCelle<T extends string>({
  vaerdi,
  muligheder,
  onSaet,
  titel,
  ekstraKlasse = "",
}: ValgCelleProps<T>) {
  return (
    <select
      className={`celle ${ekstraKlasse}`}
      value={vaerdi}
      title={titel}
      onChange={(e) => onSaet(e.target.value as T)}
    >
      {muligheder.map((m) => (
        <option key={m.vaerdi} value={m.vaerdi}>
          {m.tekst}
        </option>
      ))}
    </select>
  );
}

/** Viser en beregnet værdi — aldrig redigerbar. */
export function Beregnet({
  tekst,
  svag = false,
  titel,
}: {
  tekst: string;
  svag?: boolean;
  titel?: string;
}) {
  return (
    <span className={svag ? "svag" : undefined} title={titel}>
      {tekst || "–"}
    </span>
  );
}
