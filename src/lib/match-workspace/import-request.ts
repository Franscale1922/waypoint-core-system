/**
 * Turn a multipart import request into the arguments the import module takes.
 *
 * Shared by the preview and commit routes so the two cannot drift in how they read a request. A
 * divergence there would mean commit analyzing something subtly different from what preview showed,
 * which is the one thing a preview-then-commit flow must never do.
 *
 * Field contract:
 *   package        the matcher JSON, as a file or a plain text field
 *   input:0..n     one file per declared inputVersion, paired BY INDEX with the package's array
 *   bindings       optional JSON object of { brandName: "wpb_..." } operator bindings
 */
import type { ImportInputFile } from "./import";

export type ParsedImportRequest =
  | { ok: true; rawJson: string; files: ImportInputFile[]; bindings: Record<string, string> }
  | { ok: false; error: string };

export async function parseImportRequest(req: Request): Promise<ParsedImportRequest> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, error: "Expected a multipart/form-data request carrying the package and its input files." };
  }

  const pkgField = form.get("package");
  if (pkgField === null) {
    return { ok: false, error: 'Missing the "package" field (the matcher JSON).' };
  }
  const rawJson = typeof pkgField === "string" ? pkgField : await pkgField.text();
  if (!rawJson.trim()) return { ok: false, error: 'The "package" field is empty.' };

  // Read input:0, input:1, ... in order and stop at the first gap, so a mis-numbered form is a
  // clear count mismatch downstream rather than a silently reordered pairing.
  const files: ImportInputFile[] = [];
  for (let i = 0; ; i++) {
    const entry = form.get(`input:${i}`);
    if (entry === null) break;
    if (typeof entry === "string") {
      return { ok: false, error: `Field "input:${i}" must be a file, not text.` };
    }
    files.push({ filename: entry.name || `input-${i}`, bytes: new Uint8Array(await entry.arrayBuffer()) });
  }

  let bindings: Record<string, string> = {};
  const bindingsField = form.get("bindings");
  if (bindingsField !== null) {
    const text = typeof bindingsField === "string" ? bindingsField : await bindingsField.text();
    if (text.trim()) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          return { ok: false, error: '"bindings" must be a JSON object of { brandName: "wpb_..." }.' };
        }
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v !== "string") {
            return { ok: false, error: `"bindings" entry for "${k}" must be a string waypoint brand id.` };
          }
          bindings[k] = v;
        }
      } catch {
        return { ok: false, error: '"bindings" is not valid JSON.' };
      }
    }
  }

  return { ok: true, rawJson, files, bindings };
}
