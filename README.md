<div align="center">

# 🫀 Readmission Factors

**Structured clinical review of 30-day heart failure readmissions**

*Index and readmission discharge summaries, side by side — highlight evidence, codify factors, export JSON.*

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## 📋 What this is

A browser-based annotation workspace for studying **why patients come back** after an index HF hospitalization. Reviewers work through a case queue, read paired discharge summaries, attach highlighted evidence to readmission factors, and export structured annotations for downstream analysis.

Built for a Yale readmission research workflow — focused on clinician judgment, not black-box summarization. Notes are rendered verbatim; every span is stored with character offsets into the original text.

---

## ✨ Features

| | |
| :---: | :--- |
| 📂 **Notes Left** | Paginated case queue loaded from a local Parquet cohort (`readmit_30d.parquet`). Filter and search by patient, ICD code, days to readmit, ICU flag, and more. |
| 📄 **Dual-note review** | Index HF discharge summary and readmission discharge summary shown together. Select text in either note to attach evidence. |
| 🎨 **Factor workbench** | Color-coded evidence groups → finalized factors with role, modifiability, foreseeability, confidence (1–5), and optional rationale. |
| 🧭 **Case navigation** | Prev/next through the queue in dataset order; drafts persist in `localStorage` while you move between cases. |
| 💾 **JSON export** | Download a single annotation payload with case metadata, evidence spans, and factor definitions — ready for analysis pipelines. |
| 🧪 **Mock mode** | Set `VITE_USE_MOCK_CASES=true` to develop against bundled fixtures when the cohort file isn't available. |

---

## 🚀 Quick start

**Requirements:** Node.js 20+

```bash
git clone https://github.com/lorenzosimone25/Readmission-Factors.git
cd Readmission-Factors
npm install
```

### Dataset

The cohort file is **not** checked into the repo. Copy your Parquet export here:

```
src/data/readmit_30d.parquet
```

Expected columns include `row_id`, `patient_identifier`, `subject_id`, `index_hadm_id`, `readmit_hadm_id`, `index_primary_icd_code`, `readmit_has_icu`, `days_to_readmit`, `index_discharge_summary`, and `readmit_discharge_summary`. ZSTD compression is supported via `hyparquet-compressors`.

### Run locally

```bash
npm run dev
```

Open **http://localhost:5173**

| Command | |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the built app |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | ESLint |

---

## 🗺️ App structure

```
/                 Notes Left — case queue and task estimates
/research?case=…  Readmission tab — dual-note annotation for one case
```

| Area | Path |
| :--- | :--- |
| Pages | `src/pages` |
| Annotation UI | `src/features/readmission/components` |
| State & hooks | `src/features/readmission/hooks`, `context/` |
| Parquet loader | `src/features/readmission/data/readmissionDataset.ts` |
| Types & export schema | `src/features/readmission/types`, `lib/exportAnnotation.ts` |
| Architecture notes | `docs/readmission-annotation-architecture.md` |

---

## 🧱 Stack

```
React 19 · TypeScript · Vite 8 · Tailwind CSS 4
React Router 7 · hyparquet · Framer Motion · Lucide icons
Vitest · ESLint
```

---

## 📤 Annotation output

Each completed review exports a JSON document containing:

- Case identifiers and Parquet metadata (HADM IDs, primary ICD, days to readmit)
- `evidenceGroups` and `evidenceSpans` with exact character offsets
- `factors` with clinical metadata and linked span IDs
- `noteVersionHash` to detect note drift between sessions

Drafts auto-save to the browser; use **Export JSON** from the review bar when a case is ready.

---

## 📚 Docs

- [`docs/readmission-annotation-architecture.md`](docs/readmission-annotation-architecture.md) — offset fidelity, section detection, factor workflow
- [`docs/readmission-release-checklist.md`](docs/readmission-release-checklist.md) — pre-release QA

---

<div align="center">

**Readmission Factors** — *evidence-first review for HF readmission research.*

</div>
