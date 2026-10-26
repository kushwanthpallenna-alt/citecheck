export interface Claim {
  id: string;
  claimNumber: number;
  totalClaims: number;
  line: number;
  section: string;
  page: string;
  draftText: string;
  verdict: 'SUPPORTED' | 'WEAK CORROBORATION' | 'CITATION MISMATCH' | 'UNVERIFIABLE';
  badgeClass: string;
  icon: string;
  confidence: number;
  confidenceDescription: string;
  citationTitle: string;
  citationAuthors: string;
  citationJournal: string;
  citationDoi: string;
  provenanceStatus: 'open_access' | 'abstract_only' | 'paywalled';
  sourcePage: string;
  sourceText: string;
  mismatchHighlight?: string;
  discrepancyType?: string;
  discrepancyNote?: string;
  suggestedRevision?: string;
  raw?: any;
}

export const CLAIMS_DATA: Record<string, Claim> = {
  'claim-3': {
    id: 'claim-3',
    claimNumber: 3,
    totalClaims: 15,
    line: 58,
    section: 'Sec 2.2 • p. 2',
    page: 'Page 14, § 3.1 Results',
    draftText: 'Empirical experiments demonstrate that weight decay regularization reduces generalization error by 14% on out-of-domain benchmarks [3].',
    verdict: 'SUPPORTED',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    icon: 'check_circle',
    confidence: 98,
    confidenceDescription: 'Syntactic & Numerical Concordance Confirmed (p < 0.0001)',
    citationTitle: 'Generalization in High-Dimensional Overparameterized Models',
    citationAuthors: 'Zhang, C., Bengio, S., Hardt, M., Recht, B., & Vinyals, O. (2023)',
    citationJournal: 'Journal of Machine Learning Research, 24(12), 1-28',
    citationDoi: '10.5555/jmlr.2023.24.12',
    provenanceStatus: 'open_access',
    sourcePage: 'Page 14, § 3.1 Results',
    sourceText: 'Across ImageNet-O and out-of-domain natural benchmarks, applying decoupled weight decay λ=0.05 yields an average relative error reduction of 14.2% ± 0.4% compared to baseline Adam.',
    suggestedRevision: 'The draft claim aligns precisely with primary source measurements within margin of error.'
  },
  'claim-7': {
    id: 'claim-7',
    claimNumber: 7,
    totalClaims: 15,
    line: 112,
    section: 'Sec 3.0 • p. 3',
    page: 'Page 9, Discussion',
    draftText: 'Furthermore, ablation studies confirm that multi-head attention alone accounts for the entirety of downstream reasoning improvements [7].',
    verdict: 'WEAK CORROBORATION',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    icon: 'warning',
    confidence: 76,
    confidenceDescription: 'Partial Stance Match • Scope Overstatement Detected',
    citationTitle: 'Disentangling Attention Mechanisms in Deep Sequence Models',
    citationAuthors: 'Vaswani, A. & Gomez, A. (2021)',
    citationJournal: 'NeurIPS Proceedings, 34, 1102-1115',
    citationDoi: '10.48550/arXiv.2106.09685',
    provenanceStatus: 'abstract_only',
    sourcePage: 'Page 9, Discussion',
    sourceText: 'While multi-head projections improve gradient dispersion (contributing approx. 38% of gains), layer-norm dynamics and feed-forward intermediate width are indispensable to total reasoning performance.',
    discrepancyType: 'Overgeneralized Causal Attribution',
    discrepancyNote: 'Source attributes only ~38% of gains to multi-head attention, noting layer-norm and feed-forward widths are equally indispensable.',
    suggestedRevision: 'Ablation studies confirm multi-head attention accounts for a substantial fraction (~38%) of downstream reasoning improvements alongside normalization dynamics [7].'
  },
  'claim-9': {
    id: 'claim-9',
    claimNumber: 9,
    totalClaims: 15,
    line: 142,
    section: 'Sec 3.1 • p. 4',
    page: 'Page 6, Theorem 2',
    draftText: 'Recent findings prove that increasing model parameter size strictly decreases catastrophic forgetting across continuous learning benchmarks [9].',
    verdict: 'CITATION MISMATCH',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    icon: 'cancel',
    confidence: 92,
    confidenceDescription: 'Deterministic Syntactic & Semantic Polarity Inversion (p < 0.001)',
    citationTitle: 'Capacity Limits in Continual Neural Representations',
    citationAuthors: 'Vaswani, A., Marcus, G., & Bengio, S. (2023)',
    citationJournal: 'Journal of Machine Learning Research, 24(88), 1–34',
    citationDoi: '10.5555/jmlr.2023.24.88',
    provenanceStatus: 'open_access',
    sourcePage: 'Section 4.2 • p. 19',
    sourceText: 'Contrary to classical scaling assumptions, we observed that increasing parameter count beyond 7B models yielded a pronounced increase in retroactive interference during continuous sequence benchmarks unless explicit orthogonal gradient projections are enforced.',
    mismatchHighlight: 'increasing parameter count beyond 7B models yielded a pronounced increase in retroactive interference',
    discrepancyType: 'Direct Inversion of Empirical Polarity',
    discrepancyNote: 'The manuscript claims parameter scaling decreases forgetting, whereas the cited paper explicitly demonstrates unconstrained parameter inflation increases forgetting (retroactive interference).',
    suggestedRevision: 'Recent investigations reveal that increasing model parameter size without gradient orthogonalization tends to exacerbate catastrophic forgetting [9].'
  },
  'claim-12': {
    id: 'claim-12',
    claimNumber: 12,
    totalClaims: 15,
    line: 196,
    section: 'Sec 4.2 • p. 7',
    page: 'Document Unavailable',
    draftText: 'Archival historical analysis indicates early neural nets used identical normalization heuristics [12].',
    verdict: 'UNVERIFIABLE',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    icon: 'help',
    confidence: 34,
    confidenceDescription: 'Unresolved Digital Object Identifier • Archive Offline',
    citationTitle: 'Rosenblatt Lab Technical Memoranda Series IV',
    citationAuthors: 'Rosenblatt, F. (1962)',
    citationJournal: 'Cornell Aeronautical Laboratory Reports',
    citationDoi: 'unindexed/cal-memo-1962-4',
    provenanceStatus: 'paywalled',
    sourcePage: 'Unindexed Repository Archive',
    sourceText: 'Notice: Digital object identifier could not resolve through Crossref, PubMed, or ArXiv archives. Paper marked uncorroborated.',
    discrepancyType: 'Missing DOI / Unindexed Source',
    discrepancyNote: 'Historical technical report cannot be fetched from modern canonical academic APIs. Manual archivist verification required.'
  }
};

export const SAMPLE_MANUSCRIPT = `EVALUATING GENERALIZATION BOUNDS IN DEEP TRANSFORMER ARCHITECTURES
Zhang et al. (2023) • Preprint Draft v2.4

1. Introduction & Theoretical Motivation
Modern deep neural networks display unprecedented empirical capability across varied reasoning domains. However, rigorous analytical characterization of overparameterized hypothesis classes remains incomplete. Initial investigations postulated that explicit regularization constraints could be wholly omitted in favor of implicit stochastic gradient descent regularization.

2. Regularization Dynamics
Empirical experiments demonstrate that weight decay regularization reduces generalization error by 14% on out-of-domain benchmarks [3]. While benign overfitting guarantees bounded risk on interpolated training sets, non-convex manifolds require structured parameter decay to preserve representation geometry across distributional shifts.

3. Representation and Reasoning Bounds
Furthermore, ablation studies confirm that multi-head attention alone accounts for the entirety of downstream reasoning improvements [7]. This architectural inductive bias is hypothesized to prevent representation collapse during long-horizon composition tasks. 

Recent findings prove that increasing model parameter size strictly decreases catastrophic forgetting across continuous learning benchmarks [9]. Consequently, scaling laws are assumed to resolve plasticity-stability trade-offs without specialized architectural scaffolding.

4. Historical Context & Heuristics
Archival historical analysis indicates early neural nets used identical normalization heuristics [12]. Revisiting foundational perceptron paradigms offers valuable insights for designing contemporary token-level layer norms.`;

export const STREAMING_VERIFICATION_STEPS = [
  {
    claimId: 'claim-04',
    claimNum: '04',
    text: 'ResNet-50 models fine-tuned on multi-institutional datasets achieved an AUC of 0.94 on unseen histopathology slides [4].',
    citation: 'Esteva et al., Nature Medicine (2021) • DOI: 10.1038/s41591-021-01345-2',
    status: 'SUPPORTED',
    tag: 'Full text confirmed • 96% match',
    detail: 'Page 8, Para 3: "Receiver operating characteristic analysis yielded multi-site AUC = 0.941 [95% CI 0.92-0.96] on external cohort."'
  },
  {
    claimId: 'claim-05',
    claimNum: '05',
    text: 'In vitro toxicity assays demonstrated zero cellular degradation over a 72-hour incubation period [7].',
    citation: 'Vogel et al., Biomaterials (2020) • PubMed ID: 32419821',
    status: 'WEAK EVIDENCE',
    tag: 'Abstract only • Evidence claims "negligible" rather than "zero"',
    detail: 'Page 3: Viability measured at 98.4% ± 1.2%, documented as "negligible cytotoxic response", not absolute zero.'
  },
  {
    claimId: 'claim-09',
    claimNum: '09',
    text: 'Recent findings prove that increasing model parameter size strictly decreases catastrophic forgetting across continuous learning benchmarks [9].',
    citation: 'Vaswani, Marcus & Bengio, JMLR (2023) • DOI: 10.5555/jmlr.2023.24.88',
    status: 'MISMATCH',
    tag: 'Contradiction • Primary source proved increased interference with scale',
    detail: 'Section 4.2: Parameter scale beyond 7B strictly increases retroactive interference without orthogonal projections.'
  },
  {
    claimId: 'claim-12',
    claimNum: '12',
    text: 'Archival historical analysis indicates early neural nets used identical normalization heuristics [12].',
    citation: 'Rosenblatt Lab Memoranda (1962) • Unindexed Report',
    status: 'UNVERIFIABLE',
    tag: 'DOI unresolved in CrossRef / PubMed / arXiv',
    detail: 'Digital archive unavailable. Flagged for institutional manual review.'
  }
];
