import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assembleFromBytes, sourceSpecs } from "./assemble-ccd-1.4.mjs";
import { assertGitIgnored, sha256 } from "./oe1-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = join(root, "data/ccd/local/oe1-evaluation");
const corpusRoot = join(root, "data/ccd/local/product-knowledge-v2");
const expectedHash = "810794a83b40eb95a064532283cb9f7f59a6137b984f730952ed60f662ee2324";
const releaseId = "10af4ffd-effb-41fc-bbfe-4dc48cb3398f";
const manifestSha = "fde23cabe95c83f5bd632d129312ad68c90624e6ebd489e79e98c6a3d0d96852";
const stop = new Set("para como segun sobre entre desde esta este estos estas cuales cuando donde documento documentacion describe referencia orientacion general entregado incluida release frente corresponde indica incluida datos puede caso curso cursos pilar pilares diagnostico diagnostica ccd tiene cuales debe ruta".split(" "));
function terms(text) {
  return new Set(text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g)?.filter(word => word.length > 3 && !stop.has(word)) ?? []);
}
function overlap(a, b) {
  const common = [...a].filter(word => b.has(word));
  return { common, jaccard: common.length / Math.max(1, new Set([...a, ...b]).size) };
}
const distinct = values => [...new Set(values.map(value => JSON.stringify(value)))];

// Signals are grouped by cause. They never constitute semantic approval or a correction.
export function screenCases(cases, units, limit = 12) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw new Error("Límite de revisión inválido.");
  const byKey = new Map(units.map(unit => [unit.document_key, unit]));
  if (byKey.size !== units.length || new Set(cases.map(item => item.id)).size !== cases.length) throw new Error("Identidades duplicadas.");
  const reports = cases.map(item => {
    const gold = item.relevant_contexts.map(context => {
      const unit = byKey.get(context.document_key);
      if (!unit) throw new Error("Contexto sin unidad publicada.");
      return unit;
    });
    const provenance = [...new Set(item.relevant_contexts.flatMap(context => context.evidence_provenance.flatMap(entry => entry.kind)))];
    const queryTerms = terms(`${item.question} ${item.reference_answer}`);
    const alternatives = units.filter(unit => !gold.includes(unit)).map(unit => {
      const similarity = overlap(queryTerms, terms(unit.statement));
      return { document_key: unit.document_key, claim_id: unit.claim_id, family: unit.family,
        common_terms: similarity.common, lexical_overlap: Number(similarity.jaccard.toFixed(3)),
        reason: "Coincidencia de términos; pertinencia y necesidad no demostradas." };
    }).filter(unit => unit.common_terms.length >= 3 && unit.lexical_overlap >= 0.08)
      .sort((a, b) => b.lexical_overlap - a.lexical_overlap || a.document_key.localeCompare(b.document_key)).slice(0, 8);
    const related = cases.filter(other => other.id !== item.id).flatMap(other => {
      const sharedGold = item.relevant_contexts.filter(context => other.relevant_contexts.some(value => value.document_key === context.document_key)).length;
      const score = overlap(terms(item.question), terms(other.question)).jaccard;
      return score >= 0.3 || sharedGold ? [{ id: other.id, shared_gold_units: sharedGold, question_token_jaccard: Number(score.toFixed(3)),
        reason: "Soporte compartido o vocabulario similar; no demuestra duplicación semántica." }] : [];
    });
    const mixedPeriods = distinct(item.relevant_contexts.map(context => context.period)).length > 1;
    const mixedPopulations = distinct(item.relevant_contexts.map(context => context.population)).length > 1;
    const contradiction = gold.some(unit => (unit.domain_metadata?.possible_contradictions?.length ?? 0) > 0) || /divergencia|contradicci/i.test(item.reference_answer);
    const clauses = item.reference_answer.split(/[.;]|\b(?:mientras|pero|además)\b/i).filter(text => text.trim().length > 12).length;
    const signals = {
      inference: provenance.includes("INFERENCE"), domain_confirmation: provenance.includes("DOMAIN_CONFIRMATION"),
      mixed_periods: mixedPeriods, mixed_populations: mixedPopulations,
      multiple_claims_few_contexts: clauses >= 2 && gold.length <= 2,
      possible_documentary_tension: contradiction, possible_redundancy: related.length > 0,
      possible_alternative_support: alternatives.length > 0,
    };
    const groups = [
      ["inference", signals.inference, 100], ["domain_confirmation", signals.domain_confirmation, 40],
      ["scope_mixture", mixedPeriods || mixedPopulations, 30], ["documentary_tension", contradiction, 20],
      ["claim_support_review", signals.multiple_claims_few_contexts || signals.possible_alternative_support, 10],
      ["conceptual_overlap", signals.possible_redundancy, 5],
    ].filter(([, active]) => active).map(([cause, , weight]) => ({ cause, weight }));
    return { id: item.id, origin: item.origin, gold_context_count: gold.length,
      families: [...new Set(gold.map(unit => unit.family))], provenance, periods: item.period, populations: item.population,
      gold_contexts: item.relevant_contexts.map(context => ({ ...context, family: byKey.get(context.document_key).family })),
      documentary_tension_metadata: gold.map(unit => ({ document_key: unit.document_key,
        possible_contradictions: unit.domain_metadata?.possible_contradictions ?? [],
        pending_clarifications: unit.domain_metadata?.pending_clarifications ?? [] })),
      signals, grouped_priority_reasons: groups, priority_score: groups.reduce((sum, group) => sum + group.weight, 0),
      alternative_support_candidates: alternatives, related_cases: related,
      scope_warning: "Diferencias de etiquetas y número de cláusulas son señales de cotejo; no errores demostrados.",
      semantic_status: "NOT_DOCUMENTARILY_EXAMINED_IN_THIS_BLOCK" };
  }).sort((a, b) => b.priority_score - a.priority_score || a.id.localeCompare(b.id));
  return { cases: reports, selected_ids: reports.slice(0, limit).map(item => item.id),
    pending_ids: reports.slice(limit).map(item => item.id),
    signal_counts: Object.fromEntries(Object.keys(reports[0]?.signals ?? {}).map(key => [key, reports.filter(item => item.signals[key]).length])) };
}

export function renderAuthorPacket(benchmark, assessment, artifactTexts) {
  const allowed = new Set(["SIN_PROBLEMA_DETECTADO_EN_ESTA_REVISION", "REQUIERE_REVISION_DEL_AUTOR", "POSIBLE_CORRECCION_VERSIONADA", "CONFLICTO_DOCUMENTAL"]);
  if (assessment.findings.length > 12 || new Set(assessment.findings.map(item => item.id)).size !== assessment.findings.length) throw new Error("Bloque de revisión inválido.");
  const lines = ["# Revisión privada priorizada del gold — OE1-D5.5B", "",
    `Benchmark SHA-256: ${assessment.benchmark_sha256}`, "",
    "Estas observaciones no son nuevas decisiones humanas. El benchmark y sus seis ledgers permanecen intactos. No se solicita repetir una aprobación sin un motivo concreto.", "",
    "## Cómo usar el paquete", "",
    "Coteje las afirmaciones señaladas con los localizadores y fuentes originales. Registre su respuesta a cada observación en un archivo separado, fechado y vinculado al hash de este paquete. Conservar una decisión previa no congela el gold. Una modificación futura de pregunta, respuesta, contexto o procedencia exige nueva versión trazable y la revisión correspondiente.", "",
    "Las coincidencias léxicas y los soportes compartidos no son resultados del RAG ni demuestran redundancia o pertinencia. Los contextos alternativos listados se inspeccionaron; no se añadieron al gold.", ""];
  for (const finding of assessment.findings) {
    const item = benchmark.cases.find(value => value.id === finding.id);
    if (!item || !allowed.has(finding.status)) throw new Error("Hallazgo sin caso o clasificación válida.");
    lines.push(`## ${item.id} — ${finding.status}`, "", `Prioridad: ${finding.selection_reason}`, "", `**Pregunta aprobada:** ${item.question}`, "", `**Referencia aprobada:** ${item.reference_answer}`, "",
      `**Origen:** ${item.origin}; fuente ${item.approval.source_id}; evento línea ${item.approval.ledger_line}, SHA-256 ${item.approval.event_sha256}.`, "",
      "### A. Problemas demostrados", "", ...(finding.demonstrated.length ? finding.demonstrated.map(text => `- ${text}`) : ["No se demostró un problema nuevo en este cotejo."]), "",
      "### B. Riesgos que requieren cotejo", "", ...(finding.risks.length ? finding.risks.map(text => `- ${text}`) : ["Sin riesgo específico adicional identificado en el alcance examinado."]), "",
      "### C. Comprobaciones sin problemas detectados", "", ...finding.completed.map(text => `- ${text}`), "", "### Contraste por afirmación", "");
    for (const claim of finding.claims) lines.push(`- **${claim.assertion}** — ${claim.judgment}. ${claim.support} Fuentes: ${claim.source_refs.join("; ")}.`);
    lines.push("", "### Contextos gold conservados", "");
    for (const context of item.relevant_contexts) {
      const content = artifactTexts.get(context.document_key);
      if (typeof content !== "string") throw new Error("Texto gold no disponible para revisión.");
      lines.push(`#### ${context.document_key}`, "", `Versión ${context.document_version_id}; chunk ${context.chunk_id}; ordinal ${context.ordinal}; localizador ${context.locator}; SHA-256 ${context.source_sha256}.`, "",
        `Periodo: ${JSON.stringify(context.period)}. Población: ${JSON.stringify(context.population)}.`, "",
        `Condiciones: ${JSON.stringify(context.conditions)}. Excepciones: ${JSON.stringify(context.exceptions)}.`, "",
        "Procedencia y referencias:", "");
      for (const evidence of context.evidence_provenance) {
        lines.push(`- **${evidence.kind}**`);
        for (const reference of evidence.references ?? []) lines.push(`  - ${reference.source}; ${reference.locator}; SHA-256 ${reference.sha256}${reference.scope ? `; alcance: ${reference.scope}` : ""}.`);
      }
      lines.push("", "```text", content.trimEnd(), "```", "");
    }
    lines.push("### Alternativas inspeccionadas y solapamiento", "");
    for (const alternate of finding.alternatives) lines.push(`- ${alternate.claim_id} (${alternate.document_key}): ${alternate.conclusion}`);
    lines.push("", `Casos relacionados: ${finding.related.join(", ") || "Ninguno señalado"}.`, "",
      `**Decisión solicitada al autor:** ${finding.author_action}`, "", `**Conservar sin repetir aprobación sin motivo:** ${finding.preserve_approved_parts}`, "");
  }
  lines.push("## Pendientes fuera del bloque", "", assessment.pending_ids.join(", "), "",
    "## Propuesta metodológica pendiente de aceptación académica", "", ...assessment.sample_proposal.map(text => `- ${text}`), "",
    "No hay congelación, evaluación ni nuevas aprobaciones registradas por este paquete.", "");
  return lines.join("\n");
}

async function inspectPublication(benchmark, adoption) {
  const inspect = JSON.parse(execFileSync("docker", ["inspect", "banuchat-unified-postgres"], { encoding: "utf8", windowsHide: true }))[0];
  assert.equal(inspect?.State?.Status, "running");
  assert.ok(inspect.Mounts?.some(mount => mount.Name === "banuchat-unified-data"));
  assert.ok(inspect.NetworkSettings.Ports["5432/tcp"].some(binding => binding.HostPort === "55463"));
  const env = Object.fromEntries(inspect.Config.Env.map(entry => entry.split(/=(.*)/s).slice(0, 2)));
  const { Client } = createRequire(join(root, "backend/api/package.json"))("pg");
  const db = new Client({ host: "127.0.0.1", port: 55463, database: env.POSTGRES_DB, user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD, options: "-c default_transaction_read_only=on -c statement_timeout=15000" });
  await db.connect();
  let rows, release;
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    assert.equal((await db.query("SHOW transaction_read_only")).rows[0].transaction_read_only, "on");
    release = (await db.query(`SELECT r.id,r.dataset_schema_version,r.manifest_sha256,r.status,d.current_release_id
      FROM banuchat.dataset_releases r JOIN banuchat.datasets d ON d.id=r.dataset_id WHERE r.id=$1`, [releaseId])).rows[0];
    assert.ok(release && release.current_release_id === releaseId && release.status === "ready" && release.dataset_schema_version === "ccd-1.4.0" && release.manifest_sha256 === manifestSha);
    rows = (await db.query(`SELECT d.document_key,v.id AS document_version_id,c.id AS chunk_id,c.ordinal,c.locator,
      v.source_path,v.source_sha256,v.processing_status,c.content,c.embedding IS NOT NULL AS has_embedding
      FROM banuchat.documents d JOIN banuchat.document_versions v ON v.document_id=d.id
      JOIN banuchat.document_chunks c ON c.document_version_id=v.id WHERE v.dataset_release_id=$1`, [releaseId])).rows;
    await db.query("ROLLBACK");
  } catch (error) { await db.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await db.end(); }
  assert.equal(rows.length, 107);
  assert.equal(new Set(rows.map(row => row.document_version_id)).size, 107);
  assert.equal(new Set(rows.map(row => row.document_key)).size, 107);
  const byKey = new Map(rows.map(row => [row.document_key, row]));
  for (const row of rows) {
    assert.equal(row.processing_status, "ready"); assert.equal(row.has_embedding, true);
    const artifact = adoption.artifacts.find(item => item.document_key === row.document_key);
    assert.ok(artifact && artifact.sha256 === row.source_sha256 && artifact.path === row.source_path);
    const path = resolve(corpusRoot, row.source_path);
    assert.ok(path.startsWith(`${corpusRoot}\\`) || path.startsWith(`${corpusRoot}/`));
    const bytes = await readFile(path);
    assert.equal(sha256(bytes), row.source_sha256); assert.equal(bytes.toString("utf8"), row.content);
  }
  for (const item of benchmark.cases) for (const context of item.relevant_contexts) {
    const row = byKey.get(context.document_key);
    assert.ok(row);
    for (const key of ["document_version_id", "chunk_id", "ordinal", "locator", "source_path", "source_sha256"]) assert.equal(context[key], row[key]);
    assert.equal(context.artifact_sha256, row.source_sha256);
  }
  return { release, units_verified: rows.length, gold_references_verified: benchmark.cases.reduce((sum, item) => sum + item.relevant_contexts.length, 0) };
}

async function main() {
  const benchmarkPath = join(privateRoot, "approved-benchmark-ccd-1.4.0-v1.json");
  await assertGitIgnored(benchmarkPath, root);
  const bytes = await readFile(benchmarkPath);
  assert.equal(sha256(bytes), expectedHash);
  const benchmark = JSON.parse(bytes);
  const sources = [];
  for (const spec of sourceSpecs) {
    const bankPath = join(privateRoot, spec.bank_name), ledgerPath = join(privateRoot, spec.ledger_name);
    await Promise.all([assertGitIgnored(bankPath, root), assertGitIgnored(ledgerPath, root)]);
    sources.push({ spec, bankBytes: await readFile(bankPath), ledgerBytes: await readFile(ledgerPath) });
  }
  assert.deepEqual(assembleFromBytes(sources, benchmark.assembled_at), benchmark);
  assert.equal(benchmark.release_id, releaseId); assert.equal(benchmark.manifest_sha256, manifestSha);
  const adoptionBytes = await readFile(join(corpusRoot, "adoption.json"));
  const hashes = JSON.parse(await readFile(join(corpusRoot, "hashes.json")));
  assert.equal(sha256(adoptionBytes), hashes.adoption_sha256);
  const adoption = JSON.parse(adoptionBytes);
  const coverage = JSON.parse(await readFile(join(privateRoot, "coverage-audit-ccd-1.4.0-d5-4f-v1.json")));
  const units = adoption.claims.map(claim => {
    const metadata = coverage.units.find(unit => unit.document_key === claim.document_key);
    const artifact = adoption.artifacts.find(item => item.document_key === claim.document_key);
    assert.ok(metadata && artifact && metadata.artifact_sha256 === artifact.sha256);
    return { ...claim, family: metadata.family };
  });
  const publication = await inspectPublication(benchmark, adoption);
  const screen = screenCases(benchmark.cases, units);
  const report = { schema_version: "oe1-gold-audit-prioritized-d5-5b-v1", status: "AUTOMATIC_SCREEN_COMPLETED_SEMANTIC_REVIEW_PENDING",
    generated_at: new Date().toISOString(), benchmark_sha256: expectedHash, adoption_sha256: sha256(adoptionBytes),
    publication, source_integrity: benchmark.sources, method: "Offline lexical screening of 107 units; no vector retrieval or RAG outputs. Risk groups are not independent probabilities.", ...screen };
  const output = join(privateRoot, "gold-audit-prioritized-ccd-1.4.0-d5-5b-v1.json");
  await assertGitIgnored(output, root);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, cases: report.cases.length, selected_ids: report.selected_ids,
    pending: report.pending_ids.length, signal_counts: report.signal_counts, sha256: sha256(await readFile(output)) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error("Auditoría bloqueada: no se pudo verificar una fuente, identidad, permiso o destino privado. No se alteraron los insumos."); process.exitCode = 1; });
}
