# CiteCheck AI
### Don't Just Trust the Citation. Verify the Claim.

**An AI-powered citation verification platform that helps researchers determine whether cited sources actually support the claims made in their documents.**

Research papers, technical reports, and academic documents often contain dozens of claims backed by references. But a bibliography alone does not guarantee that those references support the statements they accompany.

A paper may cite a genuine source that discusses a related topic without supporting the specific statistic, conclusion, or argument being presented. Manually checking every citation is time-consuming, difficult to scale, and easy to overlook.

**CiteCheck AI aims to close this gap by moving beyond citation existence to citation evidence.**

Instead of asking only *“Does this reference exist?”*, CiteCheck asks a more meaningful question:

**“Does the available evidence from this source actually support the claim?”**

---

## The Problem We're Solving

Citations are essential to research integrity, but traditional citation checking primarily focuses on reference formatting, source identification, and whether a reference can be located.

These checks do not necessarily establish that a source supports the statement citing it.

Consider an example:

> **Claim:** A study found that the proposed method improves accuracy by 35%.

> **Retrieved evidence:** The study reports a 12% improvement on a different dataset.

The reference might be genuine and relevant to the topic, but the available evidence does not establish the claim as written.

This creates several challenges:

- **Misleading statistics:** Numbers may be quoted without the correct context, baseline, or experimental conditions.
- **Weak evidence:** A source may discuss a related subject without directly supporting the claim.
- **Citation mismatch:** A cited paper may contradict, qualify, or fail to establish a statement.
- **Manual verification overhead:** Researchers and reviewers must repeatedly locate sources and compare passages with individual claims.
- **False confidence:** A correctly formatted citation can make an unsupported statement appear credible.

CiteCheck AI is designed to make these evidence gaps easier to identify and investigate.

## Our Solution

CiteCheck AI combines a modern web interface, a Python backend, and a Gemini-powered verification workflow to assess claims against retrieved source evidence.

The system is designed to distinguish four verification outcomes:

| Verdict | Meaning |
|---|---|
| `supported` | The available evidence directly supports the claim. |
| `weakly_supported` | The evidence supports only part of the claim or provides indirect support. |
| `mismatched` | The evidence contradicts a material part of the claim. |
| `unverifiable` | The available evidence is insufficient or unavailable. |

These outcomes are intended to communicate the strength of the available evidence rather than present AI-generated judgments as unquestionable facts.

A crucial distinction is that **missing evidence is not automatically contradictory evidence**. CiteCheck treats unavailable sources and insufficient passages differently from evidence that disagrees with a claim.

---

## How CiteCheck AI Works

### 1. Document input

The application provides a web interface for interacting with the citation verification workflow. The intended workflow starts with a research document or its extracted text.

### 2. Claim and citation identification

The document-processing stage identifies claims and associates them with their citation references. Each claim receives an identifier so that its verification result can be connected to the correct statement.

### 3. Source evidence preparation

The source-retrieval stage gathers available evidence associated with the relevant references. Retrieved passages are passed to the verification stage together with source identifiers and any known retrieval limitations.

A source that cannot be retrieved should not be treated as though it has been successfully checked.

### 4. AI-assisted evidence analysis

The Python backend uses Google's Gemini model to evaluate the relationship between the claim and the supplied evidence.

The verification instructions emphasize direct evidence, uncertainty, numerical accuracy, source limitations, and the distinction between related information and actual support.

### 5. Structured verification results

The verification stage produces a structured result containing:

- Claim identifier
- Verification verdict
- Explanation of the judgment
- Relevant evidence excerpts
- Limitations and uncertainty notes

Structured outputs make results easier for the frontend to display and for other application components to consume.

### 6. Review and interpretation

The results are intended to help users identify which claims deserve closer inspection. CiteCheck supports the researcher's review process; it does not replace reading the original source or exercising academic judgment.

---

## Technology Stack

We selected technologies that support rapid development, a responsive user experience, maintainable code, and AI-assisted analysis.

### Frontend

#### Next.js

Next.js provides the web application framework and project structure.

**Why we use it:**
- Organizes the application into maintainable pages and components.
- Supports modern React-based user interfaces.
- Provides a clear foundation for integrating the frontend with a backend API.
- Offers a straightforward path to deploying the web application.

#### React

React powers the interactive user interface.

**Why we use it:**
- Enables reusable UI components.
- Makes it easier to represent claims, verdicts, evidence, and limitations as structured interface elements.
- Supports a responsive workflow as verification results are received.

#### TypeScript

TypeScript adds static type checking to the frontend and shared application code.

**Why we use it:**
- Helps catch incompatible data structures during development.
- Makes API request and response contracts easier to understand.
- Reduces ambiguity when passing structured verification results between components.

#### Tailwind CSS

Tailwind CSS is included in the frontend development stack.

**Why we use it:**
- Supports consistent styling through utility classes.
- Speeds up interface iteration.
- Helps maintain a coherent visual system without requiring a separate stylesheet for every component.

### Backend

#### Python

Python powers the backend verification service.

**Why we use it:**
- Provides a practical environment for AI integration and text processing.
- Supports structured data handling and asynchronous API operations.
- Makes the verification workflow easier to extend with additional analysis and testing.

#### FastAPI

The backend is configured around a Python API service.

**Why we use it:**
- Provides a structured way to expose backend functionality over HTTP.
- Supports integration between the frontend and verification logic.
- Makes it possible to configure allowed frontend origins through environment variables.

#### REST API and JSON

The frontend communicates with the backend through an API integration layer, with JSON serving as the data-exchange format.

**Why we use them:**
- Keep the frontend separate from backend implementation details.
- Make request and response structures explicit.
- Allow the frontend and backend to be developed and deployed independently.

### Artificial Intelligence

#### Google Gemini API

CiteCheck uses Google's Gemini API for AI-assisted claim verification.

The current configuration specifies **`gemini-2.5-flash-lite`** through the `GEMINI_MODEL` environment variable.

**Why we use Gemini:**
- To analyze natural-language claims against supplied evidence passages.
- To produce explanations and structured verification judgments.
- To support a workflow that must interpret context rather than simply match identical strings.
- To make model selection configurable without embedding the model name throughout the application.

The model is an analysis component, not the source of truth. Its judgments must be constrained by retrieved evidence, validated outputs, and explicit uncertainty handling.

### Data and Caching

#### SQLite

The backend directory contains a SQLite database file, `cache.db`.

SQLite is a lightweight, file-based database suitable for local development and simple persistence or caching workflows.

Its precise role depends on the backend's implementation; it should not be assumed to be the permanent storage layer for every verification result.

### Development and Deployment Tools

#### Git and GitHub

Git provides version control, while GitHub hosts the project repository.

They support collaborative development, change tracking, code review, and a reproducible history of project changes.

#### Antigravity IDE

Antigravity is used as the development environment for working on the application, editing code, and assisting the implementation workflow.

AI-assisted development helps accelerate iteration, but code changes still need to be reviewed, tested, and validated.

#### Vercel and Render

The deployment architecture can use separate hosting services:

- **Vercel:** for the Next.js frontend.
- **Render:** for the Python backend.

This separation allows each service to be configured and deployed independently. Production deployment requires the frontend API URL, backend CORS origins, and server-side secrets to be configured correctly.

---

## Architecture Overview

```text
Research Document / Extracted Text
                 |
                 v
       Next.js Web Interface
                 |
                 v
          Frontend API Layer
                 |
                 v
          Python API Backend
                 |
                 v
     Claim and Citation Workflow
                 |
                 v
       Retrieved Source Evidence
                 |
                 v
       Google Gemini Verification
                 |
                 v
       Structured Result Validation
                 |
                 v
     Verdict + Evidence + Limitations
                 |
                 v
          Results Interface
```

The architecture separates user interaction, backend processing, source evidence, and AI analysis. This makes it easier to test individual components and improve the verification workflow without tightly coupling everything to the frontend.

*The diagram represents the intended verification workflow; each stage should be confirmed against the implemented code before presenting it as a fully operational feature.*

---

## What Makes CiteCheck Different?

### 1. Claim-level verification

Checking whether a bibliography entry exists is not the same as checking whether it supports a statement.

CiteCheck focuses on the relationship between an individual claim and its cited evidence.

### 2. Evidence-backed explanations

A verdict should be accompanied by the passages and reasoning that justify it. Users should be able to investigate why a claim was flagged instead of receiving only an unexplained score.

### 3. Four outcomes instead of a simplistic yes/no

Research evidence is rarely binary. A source may support only part of a statement, contradict one important detail, or provide too little information to decide.

The four-outcome model communicates these differences more clearly.

### 4. Numerical discrepancy awareness

A percentage or performance claim must be interpreted in context. Metrics, datasets, populations, baselines, timeframes, and experimental conditions can change what a number means.

CiteCheck's verification design accounts for these distinctions rather than assuming every numerical difference proves a contradiction.

### 5. Explicit uncertainty

An unavailable source or incomplete abstract cannot establish that a claim is false. Communicating these limitations helps prevent false confidence in automated judgments.

### 6. Human review remains essential

CiteCheck is intended to assist researchers, students, reviewers, and technical teams in identifying claims that warrant further inspection. The original sources remain the authority.

---

## Responsible AI and Reliability

Citation verification has a higher bar than generating a plausible-sounding explanation. A convincing but fabricated quotation can undermine the very trust the application is designed to protect.

CiteCheck's verification design therefore emphasizes:

- **Evidence grounding:** Explanations should be tied to the supplied source material.
- **Quotation integrity:** Evidence excerpts should be selected from actual retrieved passages, not invented by the model.
- **Source identity:** Evidence must remain associated with the correct reference.
- **Uncertainty handling:** Missing or insufficient evidence should be reported honestly.
- **Structured output validation:** AI responses should be checked against the expected result schema.
- **Input isolation:** Instructions embedded inside retrieved documents must be treated as untrusted source content rather than commands to the AI.
- **Human oversight:** Important findings should be checked against the original source.

These are design and implementation requirements; their completeness must be demonstrated through automated tests and end-to-end validation.

---

## Installation and Local Development

### Prerequisites

- Node.js and npm
- Python and pip
- A Google Gemini API key
- Git

### 1. Clone the repository

```bash
git clone https://github.com/kushwanthpallenna-alt/citecheck.git
cd citecheck
```

### 2. Configure the frontend

Install the Node.js dependencies:

```bash
npm install
```

Create a frontend environment file named `.env.local` and configure the backend URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Use the actual backend port configured by the application if it differs.

### 3. Configure the backend

Move into the backend directory:

```bash
cd backend
```

Create and activate a Python virtual environment.

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
pip install -r requirements.txt
```

Create `backend/.env` with your own configuration:

```env
GEMINI_API_KEY=your_gemini_api_key
CONTACT_EMAIL=your_contact_email
GEMINI_MODEL=gemini-2.5-flash-lite
MAX_CLAIMS=15
```

Configure the allowed frontend origins using the backend's existing `ALLOWED_ORIGINS` setting if needed.

**Security:** Never commit `.env`, API keys, or other secrets to GitHub. Use the hosting provider's environment-variable settings for production.

### 4. Start the backend

From the `backend` directory, run the server command specified by the application. For example, if `main.py` exposes a FastAPI application object named `app`:

```bash
uvicorn main:app --reload --port 8000
```

If the application object or startup configuration differs, use the command defined by the project.

### 5. Start the frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

`http://localhost:3000`

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Authenticates requests to the Gemini API. |
| `GEMINI_MODEL` | Selects the configured Gemini model. |
| `MAX_CLAIMS` | Configures the maximum claim count where enforced by the backend. |
| `CONTACT_EMAIL` | Provides the configured contact email. |
| `ALLOWED_ORIGINS` | Controls which frontend origins may call the backend, where configured. |
| `NEXT_PUBLIC_API_URL` | Sets the backend API URL used by the frontend. |

Actual defaults and enforcement should be confirmed against the application code. Values containing secrets must remain server-side.

---

## Future Scope

CiteCheck can be extended in several directions:

- Support for additional academic document formats.
- More robust DOI and reference resolution.
- Better retrieval from full-text papers rather than abstracts alone.
- Comparison across multiple conflicting sources.
- More advanced numerical and methodological discrepancy analysis.
- Confidence calibration and reliability evaluation against human-labeled examples.
- Batch verification for large documents.
- Exportable verification reports for research and review workflows.
- Expanded automated testing and evaluation across disciplines.

These improvements would help transform citation checking
