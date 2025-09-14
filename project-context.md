# OpenDicom Project Documentation

## 🏥 Project Overview

**OpenDicom** is a modular DICOM viewer web application for medical professionals and developers, built with **TypeScript** and optimized for **large medical imaging files (100MB+)**.

### Core Architecture

```
Monorepo Structure:
├── packages/core/           # Core DICOM functionality
│   ├── types/              # TypeScript definitions
│   ├── __tests__/          # Test utilities & mock data
│   ├── core/               # Plugin system, event hub
│   ├── viewport/           # Viewport management
│   ├── image-loader/       # DICOM loading & caching
│   ├── events/             # Event system
│   └── ui/                 # UI components
├── scripts/                # Build & analysis tools
├── docs/                   # Documentation
└── examples/               # Usage examples
```

### Technology Stack

| Layer        | Technology              | Purpose                           |
| ------------ | ----------------------- | --------------------------------- |
| **Frontend** | Next.js 14+, React      | SSR, routing, UI framework        |
| **Language** | TypeScript              | Type safety, developer experience |
| **Medical**  | Cornerstone.js, dcmjs   | DICOM parsing, rendering          |
| **State**    | Zustand                 | Lightweight state management      |
| **UI**       | shadcn/ui, Tailwind CSS | Component library, styling        |
| **Build**    | Rollup, Webpack         | Package building, bundling        |
| **Testing**  | Jest, RTL               | Unit/integration testing          |
| **Quality**  | ESLint, Prettier, Husky | Code quality, pre-commit hooks    |

---

## 🚀 Getting Started

### Prerequisites

* Node.js v20+
* pnpm (preferred) or npm
* Docker (optional, PACS/test services)

### Installation

```bash
git clone https://github.com/opendicom/opendicom.git
cd opendicom

pnpm install
pnpm build
pnpm dev
```

### Run Example Viewer

```bash
cd apps/viewer
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📦 Monorepo Structure

```
/app # integrating package to develop custom viewer
/packages/
├── core/
│   ├── core/                  # @dicom-viewer/core (plugin system, event hub, shared types)
│   ├── image-loader/          # @dicom-viewer/image-loader (DICOM parsing & caching)
│   ├── events/                # @dicom-viewer/events (typed event system)
│   ├── ui/                    # @dicom-viewer/ui (shared React components + Tailwind)
│   └── viewport/              # @dicom-viewer/viewport (image rendering & sync)
│
├── extension/
│   ├── tools/                 # @dicom-viewer/tools (pan, zoom, rotate, probe, etc.)
│   ├── annotations/           # @dicom-viewer/annotations (drawing + SR integration)
│   ├── measurements/          # @dicom-viewer/measurements (distance, area, volume)
│   ├── segmentation/          # @dicom-viewer/segmentation (SEG, RTSTRUCT tools)
│   ├── mpr/                   # @dicom-viewer/mpr (multi-planar reconstruction)
│   ├── 3d/                    # @dicom-viewer/3d (volume rendering, MIP, VR)
│   ├── hanging-protocols/     # @dicom-viewer/hanging-protocols (layout engine)
│   └── studylist/             # @dicom-viewer/studylist (PACS integration, search UI)
```

---

## 🌟 Key Features

### Medical Imaging

* **DICOM Compliance**: Part 10, Part 14 support
* **Performance**: Sub-second loading for 100MB+ files
* **Modalities**: CT, MRI, X-Ray, Ultrasound
* **Viewport**: Multi-viewport sync, window/level, cine
* **Security**: HIPAA compliance, no real patient data in tests

### Development

* **Modular**: 16+ independent NPM packages
* **Typed**: Strong TypeScript with medical imaging types
* **Testing**: Mock DICOM utilities for safe tests
* **CI/CD**: GitHub Actions for automation
* **Bundle Analysis**: Monitor large file performance

---

## 🏥 Medical Imaging Context

### Clinical Requirements

* Sub-second load for radiologists
* 24/7 uptime for emergency workflows
* HIPAA + medical device compliance
* Multi-study comparison & measurements
* Large datasets: 100MB+ DICOM series

### DICOM Standards

* Common transfer syntaxes supported
* Metadata integrity preserved
* No real PHI in dev/test
* Accurate DICOM tag parsing

---

## 🔧 Development Guidelines

### Code Style

* Explicit TypeScript types (no `any`)
* Medical naming conventions:

  * DICOM tags: `PatientName`
  * Functions: `loadDicomSeries()`
  * Constants: `MAX_VIEWPORT_COUNT`
* Typed errors for workflows
* JSDoc for medical imaging functions

---

## 🧪 Quality Assurance

### Testing Strategy

* Synthetic/mock DICOM data only
* Performance tests with 100MB+ datasets
* Multi-modality & edge case coverage
* Security validation for HIPAA compliance

### Testing Stack

* **Unit**: Jest + ts-jest
* **UI**: React Testing Library, Playwright
* **Performance**: Puppeteer + mock DICOM
* **CI/CD**: GitHub Actions

---

## 🛠 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build all packages
npm run test             # Run test suite
npm run lint             # Code quality checks

# Analysis
npm run analyze          # Bundle analysis
npm run analyze:ci       # CI bundle analysis

# Quality
npm run prepare          # Setup Husky hooks
npm run format           # Format code
```

---

## 📑 Key Files

* `package.json` – root scripts & deps
* `tsconfig.json` – TypeScript config
* `jest.config.base.js` – testing config
* `rollup.config.base.js` – build config
* `webpack.analyzer.config.js` – bundle analysis
* `.eslintrc.js`, `.prettierrc.js`, `.husky/pre-commit`, `.lintstagedrc.js` – quality tools
* `packages/core/types/dicom.ts` – DICOM type definitions
* `packages/core/__tests__/utils/mock-dicom.ts` – mock DICOM data
* `scripts/bundle-analyzer.js` – performance monitoring

---

## 📦 Dependencies

### Core Medical

* `cornerstone-core` – DICOM rendering
* `dcmjs` – DICOM parsing
* `zustand` – state management

### Development

* `typescript`, `jest`, `rollup`, `webpack`
* `eslint`, `prettier`, `husky`

---

## ⚡ Performance Considerations

### Medical Imaging

* Progressive loading for 100MB+ files
* Efficient memory caching + cleanup
* Network optimizations for PACS
* Hardware-accelerated viewport rendering

### Bundle Analysis

* Strict medical imaging size thresholds
* Gzip/Brotli compression
* Code splitting by modality
* Tree shaking unused features

---

## 🗺 Roadmap

* Multi-viewport sync (CT, MR, PET/CT fusion)
* Annotation & DICOM-SR export
* DICOMweb + FHIR integration
* Offline caching (mobile use)
* AI-assisted interpretation
* Plugin marketplace

---

## 📚 Additional Resources

* [OHIF viewer](https://viewer.ohif.org/)
* [OHIF viewer repo](https://github.com/OHIF/Viewers)
* [DICOM Standard](https://www.dicomstandard.org/)
* [Cornerstone.js](https://cornerstonejs.org/)
* [Dicom Tags](https://www.dicomlibrary.com/dicom/dicom-tags/)
---