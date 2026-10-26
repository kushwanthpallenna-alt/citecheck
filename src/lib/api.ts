export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JobResult {
  claim_text: string;
  citation_marker: string;
  reference_string: string;
  resolved_title: string;
  authors: string;
  year: string;
  doi: string;
  source_url: string;
  source_depth: "full text" | "abstract only" | "not retrieved";
  verdict: "supported" | "weakly_supported" | "mismatched" | "unverifiable";
  confidence: number;
  evidence_quote: string;
  reason: string;
  claim_position_in_document: string;
}

export interface JobStatusResponse {
  id: string;
  status: "queued" | "extracting" | "verifying" | "done" | "rate_limited" | "error";
  total: number;
  done: number;
  results: JobResult[];
  error: string | null;
  references_found: number;
}

export function getVerdictBadgeInfo(verdict: string) {
  switch (verdict?.toLowerCase()) {
    case "supported":
      return {
        label: "SUPPORTED",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        icon: "check_circle",
      };
    case "weakly_supported":
    case "weak evidence":
    case "weak corroboration":
      return {
        label: "WEAK CORROBORATION",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        icon: "warning",
      };
    case "mismatched":
    case "mismatch":
    case "citation mismatch":
      return {
        label: "CITATION MISMATCH",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
        icon: "cancel",
      };
    case "unverifiable":
    default:
      return {
        label: "UNVERIFIABLE",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
        icon: "help",
      };
  }
}

export async function analyzeDocument(file?: File | null, text?: string): Promise<{ job_id: string }> {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  if (text) {
    formData.append("text", text);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });
  } catch (err: any) {
    throw new Error(`Backend is unreachable at ${API_BASE_URL}. Please ensure the backend server is running.`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to start document verification pipeline");
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
  } catch (err: any) {
    throw new Error(`Backend is unreachable at ${API_BASE_URL}. Please ensure the backend server is running.`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch job status");
  }
  return res.json();
}

export async function verifySingleClaim(claim: string, reference: string): Promise<JobResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ claim, reference }),
    });
  } catch (err: any) {
    throw new Error(`Backend is unreachable at ${API_BASE_URL}. Please ensure the backend server is running.`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Verification failed");
  }

  return res.json();
}
