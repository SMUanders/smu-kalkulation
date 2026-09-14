import { describe, expect, it } from "vitest";
import { afgoerAdgang, tolkRolle, type AdgangsInput } from "./adgang";

const logget: AdgangsInput = {
  supabaseKonfigureret: true,
  erUdvikling: false,
  indlaeser: false,
  harSession: true,
  profilAktiv: true,
  erSuperAdmin: false,
  rolle: null,
};

describe("adgangsregel for SMU Kalkulation", () => {
  it("produktion uden Supabase-nøgler er aldrig åben", () => {
    expect(afgoerAdgang({ ...logget, supabaseKonfigureret: false, erUdvikling: false, erSuperAdmin: true })).toBe(
      "ingen_adgang",
    );
  });

  it("lokal udvikling uden nøgler kører på demo-data", () => {
    expect(afgoerAdgang({ ...logget, supabaseKonfigureret: false, erUdvikling: true, harSession: false })).toBe(
      "lokal_udvikling",
    );
  });

  it("udvikling MED nøgler giver ingen genvej uden om login", () => {
    expect(afgoerAdgang({ ...logget, erUdvikling: true, harSession: false })).toBe("ikke_logget_ind");
  });

  it("uden session sendes brugeren til Hub", () => {
    expect(afgoerAdgang({ ...logget, harSession: false })).toBe("ikke_logget_ind");
  });

  it("mens sessionen afklares, afgøres intet", () => {
    expect(afgoerAdgang({ ...logget, indlaeser: true })).toBe("indlaeser");
  });

  it("en gyldig session alene giver ikke adgang", () => {
    expect(afgoerAdgang(logget)).toBe("ingen_adgang");
  });

  it("global super-admin har adgang, før app-key'en findes", () => {
    expect(afgoerAdgang({ ...logget, erSuperAdmin: true })).toBe("adgang");
  });

  it("bruger og admin har adgang, når rollen findes", () => {
    expect(afgoerAdgang({ ...logget, rolle: "bruger" })).toBe("adgang");
    expect(afgoerAdgang({ ...logget, rolle: "admin" })).toBe("adgang");
  });

  it("en deaktiveret profil har ingen adgang — heller ikke som super-admin", () => {
    expect(afgoerAdgang({ ...logget, profilAktiv: false, erSuperAdmin: true })).toBe("ingen_adgang");
  });
});

describe("rolletolkning", () => {
  it("kender kun bruger og admin", () => {
    expect(tolkRolle("bruger")).toBe("bruger");
    expect(tolkRolle("admin")).toBe("admin");
  });

  it("observatør findes bevidst ikke i SMU Kalkulation (TR-059)", () => {
    expect(tolkRolle("observatoer")).toBeNull();
  });

  it("ukendt eller manglende rolle giver null", () => {
    expect(tolkRolle("redaktoer")).toBeNull();
    expect(tolkRolle(undefined)).toBeNull();
    expect(tolkRolle(null)).toBeNull();
  });
});
