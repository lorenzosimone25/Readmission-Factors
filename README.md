<div align="center">

# 🫀 Readmission Factors

**Clinical annotation workspace for 30-day heart failure readmissions**

📄 Review paired discharge summaries · 🖍️ Highlight supporting evidence · 🧩 Define readmission factors · 📤 Export structured JSON

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## 🩺 Overview

**Readmission Factors** is a browser-based annotation tool for reviewing why patients are readmitted after an index heart failure hospitalization.

Reviewers move through a case queue, compare the index and readmission discharge summaries, highlight clinically relevant evidence, group related spans, and convert those groups into structured readmission factors for downstream analysis.

The app is designed for a Yale readmission research workflow where clinicians and reviewers can turn narrative discharge summaries into analyzable annotations.

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| 🗂️ **Case queue** | Browse cases loaded from a local Parquet cohort file, with filtering and search by patient, ICD code, days to readmission, ICU flag, and other metadata. |
| 📑 **Dual-note review** | View the index HF discharge summary and readmission discharge summary side by side. Select text from either note as supporting evidence. |
| 🖍️ **Evidence grouping** | Organize highlighted spans into color-coded evidence groups before finalizing them as readmission factors. |
| 🧩 **Factor coding** | Assign each factor a role, modifiability, foreseeability, confidence score, and optional reviewer rationale. |
| 🧭 **Case navigation** | Move through cases in dataset order. Draft annotations persist locally while navigating between patients. |
| 📤 **JSON export** | Export a structured annotation payload with case metadata, evidence spans, factor definitions, and reviewer-entered fields. |
| 🧪 **Mock mode** | Develop against bundled fixture cases by setting `VITE_USE_MOCK_CASES=true` when the cohort file is unavailable. |

---

## 🚀 Quick start

**Requirements:** Node.js 20+

```bash
git clone https://github.com/lorenzosimone25/Readmission-Factors.git
cd Readmission-Factors
npm install
```

### 📦 Dataset

The cohort file is not checked into the repository. Copy your Parquet export here:

```text
src/data/readmit_30d.parquet
```

Expected columns include:

```text
row_id
patient_identifier
subject_id
index_hadm_id
readmit_hadm_id
index_primary_icd_code
readmit_has_icu
days_to_readmit
index_discharge_summary
readmit_discharge_summary
```

ZSTD-compressed Parquet files are supported through `hyparquet-compressors`.

### 💻 Run locally

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Typecheck and create a production build |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | Run ESLint |

---

## ☁️ Deploy on Render (Static Site)

Use a **Static Site** (not a Web Service). The cohort Parquet file is not in Git, so production builds use demo fixtures unless you add the file another way.

| Setting | Value |
| :--- | :--- |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |
| **Environment** | `VITE_USE_MOCK_CASES=true` |

`render.yaml` in the repo encodes these defaults. After connecting the GitHub repo, trigger a new deploy.

For real cohort data in production, serve cases from a private API (recommended) rather than bundling Parquet in the static site.

---

## 🗺️ App structure

```text
/                 Case queue and task overview
/research?case=…  Dual-note readmission annotation workspace
```

| Area | Path |
| :--- | :--- |
| 🧭 Pages | `src/pages` |
| 🫀 Annotation UI | `src/features/readmission/components` |
| 🧠 State and hooks | `src/features/readmission/hooks`, `context/` |
| 📦 Parquet loader | `src/features/readmission/data/readmissionDataset.ts` |
| 🧾 Types and export schema | `src/features/readmission/types`, `lib/exportAnnotation.ts` |
| 📚 Architecture notes | `docs/readmission-annotation-architecture.md` |

---

## 🧱 Stack

```text
React 19 · TypeScript · Vite 8 · Tailwind CSS 4
React Router 7 · hyparquet · Framer Motion · Lucide icons
Vitest · ESLint
```

---

## 📤 Annotation output

Each completed review exports a JSON document containing:

- 🪪 Case identifiers and Parquet metadata, including HADM IDs, primary ICD code, and days to readmission
- 🖍️ Evidence groups and highlighted evidence spans
- 🧩 Factor definitions with linked evidence span IDs
- 🩺 Reviewer-coded fields such as role, modifiability, foreseeability, confidence, and rationale
- 🔐 A note version hash for detecting changes in source note text across sessions

Drafts are saved in the browser while reviewing. Use **Export JSON** from the review bar when a case is ready.

---

## 📚 Docs

- [`docs/readmission-annotation-architecture.md`](docs/readmission-annotation-architecture.md) — annotation model, evidence workflow, section handling, and export design
- [`docs/readmission-release-checklist.md`](docs/readmission-release-checklist.md) — pre-release QA checklist

---

<div align="center">

**🫀 Readmission Factors**  
*Clinical evidence annotation for heart failure readmission research.*

</div>
