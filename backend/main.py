import os
import io
import re
import json
import uuid
import time
import sqlite3
import threading
import hashlib
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import fitz  # PyMuPDF
import docx  # python-docx
from rank_bm25 import BM25Okapi
from google import genai
from google.genai import types

# Load settings from .env with python-dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "researcher@citecheck.org")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_CLAIMS = int(os.getenv("MAX_CLAIMS", "15"))

app = FastAPI(title="CiteCheck Backend API", version="1.0.0")

# Enable CORS from ALLOWED_ORIGINS environment variable
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite Cache setup
DB_FILE = "cache.db"
db_lock = threading.Lock()

def init_db():
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS resolved_sources (
                reference_string TEXT PRIMARY KEY,
                resolved_title TEXT,
                authors TEXT,
                year TEXT,
                doi TEXT,
                source_url TEXT,
                source_depth TEXT,
                source_text TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cached_verdicts (
                claim_text TEXT,
                reference_string TEXT,
                verdict TEXT,
                confidence REAL,
                evidence_quote TEXT,
                reason TEXT,
                directly_stated INTEGER,
                PRIMARY KEY(claim_text, reference_string)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cached_extractions (
                doc_hash TEXT PRIMARY KEY,
                claims_json TEXT
            )
        """)
        conn.commit()
        conn.close()

init_db()

def get_cached_source(ref_str: str) -> Optional[Dict[str, Any]]:
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cur = conn.cursor()
        cur.execute("SELECT resolved_title, authors, year, doi, source_url, source_depth, source_text FROM resolved_sources WHERE reference_string = ?", (ref_str,))
        row = cur.fetchone()
        conn.close()
        if row:
            return {
                "resolved_title": row[0],
                "authors": row[1],
                "year": row[2],
                "doi": row[3],
                "source_url": row[4],
                "source_depth": row[5],
                "source_text": row[6]
            }
        return None

def save_cached_source(ref_str: str, source_data: Dict[str, Any]):
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        conn.execute("""
            INSERT OR REPLACE INTO resolved_sources 
            (reference_string, resolved_title, authors, year, doi, source_url, source_depth, source_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ref_str,
            source_data.get("resolved_title", ""),
            source_data.get("authors", ""),
            source_data.get("year", ""),
            source_data.get("doi", ""),
            source_data.get("source_url", ""),
            source_data.get("source_depth", ""),
            source_data.get("source_text", "")
        ))
        conn.commit()
        conn.close()

def get_cached_verdict(claim_text: str, ref_str: str) -> Optional[Dict[str, Any]]:
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cur = conn.cursor()
        cur.execute("SELECT verdict, confidence, evidence_quote, reason, directly_stated FROM cached_verdicts WHERE claim_text = ? AND reference_string = ?", (claim_text, ref_str))
        row = cur.fetchone()
        conn.close()
        if row:
            return {
                "verdict": row[0],
                "confidence": row[1],
                "evidence_quote": row[2],
                "reason": row[3],
                "directly_stated": bool(row[4])
            }
        return None

def save_cached_verdict(claim_text: str, ref_str: str, verdict_data: Dict[str, Any]):
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        conn.execute("""
            INSERT OR REPLACE INTO cached_verdicts 
            (claim_text, reference_string, verdict, confidence, evidence_quote, reason, directly_stated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            claim_text,
            ref_str,
            verdict_data.get("verdict", ""),
            float(verdict_data.get("confidence", 0.0)),
            verdict_data.get("evidence_quote", ""),
            verdict_data.get("reason", ""),
            1 if verdict_data.get("directly_stated") else 0
        ))
        conn.commit()
        conn.close()

def get_cached_extraction(doc_hash: str) -> Optional[List[Dict[str, Any]]]:
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        cur = conn.cursor()
        cur.execute("SELECT claims_json FROM cached_extractions WHERE doc_hash = ?", (doc_hash,))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            try:
                return json.loads(row[0])
            except Exception:
                return None
        return None

def save_cached_extraction(doc_hash: str, claims: List[Dict[str, Any]]):
    with db_lock:
        conn = sqlite3.connect(DB_FILE, check_same_thread=False)
        conn.execute("""
            INSERT OR REPLACE INTO cached_extractions (doc_hash, claims_json)
            VALUES (?, ?)
        """, (doc_hash, json.dumps(claims)))
        conn.commit()
        conn.close()

# In-memory jobs tracking
jobs_lock = threading.Lock()
jobs: Dict[str, Dict[str, Any]] = {}

class RateLimitException(Exception):
    pass

# Global Gemini throttle: wait at least 7 seconds between any two Gemini calls across all threads
gemini_throttle_lock = threading.Lock()
last_gemini_call_time: float = 0.0

def call_gemini_with_throttle(client, model, prompt):
    global last_gemini_call_time
    with gemini_throttle_lock:
        now = time.time()
        elapsed = now - last_gemini_call_time
        if elapsed < 7.0:
            time.sleep(7.0 - elapsed)
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
            return response
        finally:
            last_gemini_call_time = time.time()

def call_gemini_json(prompt: str) -> Any:
    """
    Calls Gemini API with JSON output and temperature 0.
    Enforces a global 7s throttle across all threads.
    On a 429 error, retries up to 3 times with waits of 20s, 45s, and 70s.
    If the error message mentions "per day" or "daily", don't retry:
    raises RateLimitException immediately with "Daily Gemini quota reached".
    Otherwise only raises RateLimitException after all retries fail.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
    
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    client = genai.Client(api_key=api_key)

    retry_delays = [20, 45, 70]
    max_attempts = 1 + len(retry_delays)  # 1 initial + 3 retries = 4

    for attempt in range(max_attempts):
        try:
            response = call_gemini_with_throttle(client, model, prompt)
            raw = response.text.strip()
            # Clean possible markdown wrap if returned
            if raw.startswith("```"):
                lines = raw.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw = "\n".join(lines).strip()
            return json.loads(raw)
        except Exception as e:
            err_msg = str(e).lower()
            is_429 = "429" in err_msg or "resource_exhausted" in err_msg or "quota" in err_msg or "rate" in err_msg
            code = getattr(e, "code", None) or getattr(e, "status_code", None)
            if code == 429:
                is_429 = True

            if is_429:
                if "per day" in err_msg or "daily" in err_msg:
                    raise RateLimitException("Daily Gemini quota reached")
                
                if attempt < len(retry_delays):
                    time.sleep(retry_delays[attempt])
                    continue
                else:
                    raise RateLimitException("Gemini API rate limit exceeded after retries")
            
            raise e

def extract_text_from_bytes(filename: str, content: bytes) -> str:
    name_lower = filename.lower()
    if name_lower.endswith(".pdf"):
        doc = fitz.open(stream=content, filetype="pdf")
        text_parts = [page.get_text() for page in doc]
        return "\n".join(text_parts)
    elif name_lower.endswith(".docx"):
        doc = docx.Document(io.BytesIO(content))
        return "\n".join([p.text for p in doc.paragraphs if p.text])
    else:
        return content.decode("utf-8", errors="ignore")


def normalize_text(text: str) -> str:
    """
    Step 1: Normalize extracted text.
    - Replace ligatures (ﬁ -> fi, ﬂ -> fl)
    - Remove soft hyphens (\u00ad) and zero-width characters (\u200b)
    - Collapse repeated whitespace (but preserve newlines for structure)
    """
    # Replace common ligatures
    text = text.replace("\ufb01", "fi")  # ﬁ
    text = text.replace("\ufb02", "fl")  # ﬂ
    text = text.replace("\ufb00", "ff")  # ﬀ
    text = text.replace("\ufb03", "ffi") # ﬃ
    text = text.replace("\ufb04", "ffl") # ﬄ

    # Remove soft hyphens and zero-width characters
    text = text.replace("\u00ad", "")   # soft hyphen
    text = text.replace("\u200b", "")   # zero-width space
    text = text.replace("\u200c", "")   # zero-width non-joiner
    text = text.replace("\u200d", "")   # zero-width joiner
    text = text.replace("\ufeff", "")   # BOM / zero-width no-break space

    # Collapse repeated spaces/tabs (but preserve newlines)
    lines = text.split("\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in lines]
    text = "\n".join(lines)

    # Collapse multiple blank lines to at most two
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text


def split_body_and_references(text: str):
    """
    Step 2: Split document into BODY and REFERENCES.
    Find the last line that is just 'References' (case-insensitive).
    If none is found, use the last 20% of the text as the reference section.
    Returns (body_text, references_text).
    """
    lines = text.split("\n")
    ref_line_idx = None

    # Scan from the end to find the last standalone "References" heading
    for i in range(len(lines) - 1, -1, -1):
        stripped = lines[i].strip()
        if re.fullmatch(r"references", stripped, re.IGNORECASE):
            ref_line_idx = i
            break

    if ref_line_idx is not None:
        body = "\n".join(lines[:ref_line_idx])
        refs = "\n".join(lines[ref_line_idx + 1:])
    else:
        # Fallback: last 20% of lines as reference section
        split_at = max(0, int(len(lines) * 0.80))
        body = "\n".join(lines[:split_at])
        refs = "\n".join(lines[split_at:])

    return body.strip(), refs.strip()


def parse_reference_section(refs_text: str) -> Dict[int, str]:
    """
    Step 3: Parse reference section into {number: reference_string}.
    Entries start with a number followed by a period (e.g. "8. Liu X, ...").
    Continuation lines are joined until the next numbered entry starts.
    """
    ref_dict: Dict[int, str] = {}
    current_num: Optional[int] = None
    current_lines: List[str] = []

    for line in refs_text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Check if this line starts a new numbered entry
        m = re.match(r"^(\d+)\.\s+(.*)", line)
        if m:
            # Save the previous entry
            if current_num is not None and current_lines:
                ref_dict[current_num] = " ".join(current_lines).strip()
            current_num = int(m.group(1))
            current_lines = [m.group(2).strip()]
        else:
            # Continuation line
            if current_num is not None:
                current_lines.append(line)

    # Save the last entry
    if current_num is not None and current_lines:
        ref_dict[current_num] = " ".join(current_lines).strip()

    return ref_dict


def parse_citation_numbers(citation_marker: str) -> List[int]:
    """
    Step 5: Parse citation_marker string into a list of reference numbers.
    Handles: [8] -> [8], [1-7] or [1–7] -> [1,2,3,4,5,6,7], [10, 11] -> [10, 11]
    Also handles (Author et al., 2023) style (returns empty list — no numbered refs).
    """
    # Remove surrounding brackets/parens
    inner = re.sub(r"[\[\]()]", "", citation_marker).strip()

    numbers: List[int] = []

    # Split by comma first
    parts = re.split(r",\s*", inner)
    for part in parts:
        part = part.strip()
        # Check for range: e.g., "1-7" or "1–7"
        range_match = re.match(r"^(\d+)\s*[–\-]\s*(\d+)$", part)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2))
            numbers.extend(range(start, end + 1))
        elif re.match(r"^\d+$", part):
            numbers.append(int(part))
        # else: non-numeric part (e.g. author-year style) — skip

    return numbers


# Verdict priority order for "best result" selection
VERDICT_PRIORITY = {
    "supported": 0,
    "weakly_supported": 1,
    "mismatched": 2,
    "unverifiable": 3,
}


def resolve_reference(ref_str: str) -> Dict[str, Any]:
    """
    Step 3 & 4: Resolve reference string via arXiv or Crossref + OpenAlex/Unpaywall.
    Fetches open PDF (under 15MB, first 40 pages) or abstract.
    """
    cached = get_cached_source(ref_str)
    if cached:
        return cached

    result = {
        "resolved_title": "",
        "authors": "",
        "year": "",
        "doi": "",
        "source_url": "",
        "source_depth": "not retrieved",
        "source_text": ""
    }

    contact_email = os.getenv("CONTACT_EMAIL", "researcher@citecheck.org")
    headers = {"User-Agent": f"CiteCheck/1.0 (mailto:{contact_email})"}

    # 1. Check for arXiv ID
    arxiv_match = re.search(r'(?:arxiv:\s*|arxiv\.org/(?:abs|pdf)/)?(\d{4}\.\d{4,5}(?:v\d+)?)', ref_str, re.I)
    if arxiv_match:
        arxiv_id = arxiv_match.group(1)
        try:
            with httpx.Client(timeout=10.0, headers=headers) as client:
                resp = client.get(f"http://export.arxiv.org/api/query?id_list={arxiv_id}")
                if resp.status_code == 200:
                    root = ET.fromstring(resp.content)
                    ns = {"atom": "http://www.w3.org/2005/Atom"}
                    entry = root.find("atom:entry", ns)
                    if entry is not None:
                        title_el = entry.find("atom:title", ns)
                        summary_el = entry.find("atom:summary", ns)
                        published_el = entry.find("atom:published", ns)
                        authors_el = entry.findall("atom:author/atom:name", ns)
                        
                        title = title_el.text.strip().replace("\n", " ") if title_el is not None and title_el.text else ""
                        abstract = summary_el.text.strip().replace("\n", " ") if summary_el is not None and summary_el.text else ""
                        year = published_el.text[:4] if published_el is not None and published_el.text else ""
                        authors = ", ".join([a.text.strip() for a in authors_el if a.text])

                        result["resolved_title"] = title
                        result["authors"] = authors
                        result["year"] = year
                        result["doi"] = f"10.48550/arXiv.{arxiv_id}"
                        result["source_url"] = f"https://arxiv.org/abs/{arxiv_id}"
                        
                        # Try to fetch arXiv PDF
                        pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                        try:
                            pdf_resp = client.get(pdf_url, follow_redirects=True, timeout=15.0)
                            if pdf_resp.status_code == 200 and pdf_resp.content.startswith(b"%PDF") and len(pdf_resp.content) <= 15 * 1024 * 1024:
                                doc = fitz.open(stream=pdf_resp.content, filetype="pdf")
                                max_pages = min(40, len(doc))
                                full_text = "\n".join([doc[i].get_text() for i in range(max_pages)])
                                if len(full_text.split()) >= 150:
                                    result["source_text"] = full_text
                                    result["source_depth"] = "full text"
                        except Exception:
                            pass

                        if not result["source_text"] and abstract:
                            result["source_text"] = abstract
                            result["source_depth"] = "abstract only"

                        save_cached_source(ref_str, result)
                        return result
        except Exception:
            pass

    # 2. Crossref resolution
    try:
        clean_ref = re.sub(r'\[\d+\]', '', ref_str).strip()
        encoded_ref = urllib.parse.quote(clean_ref[:250])
        crossref_url = f"https://api.crossref.org/works?query.bibliographic={encoded_ref}&rows=1"
        
        with httpx.Client(timeout=10.0, headers=headers) as client:
            resp = client.get(crossref_url)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("message", {}).get("items", [])
                if items:
                    item = items[0]
                    titles = item.get("title", [])
                    returned_title = titles[0] if titles else ""
                    
                    # 60% words match rule
                    title_words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', returned_title)]
                    if title_words:
                        ref_lower = ref_str.lower()
                        matched_words = sum(1 for w in title_words if w in ref_lower)
                        match_ratio = matched_words / len(title_words)
                        if match_ratio >= 0.60:
                            doi = item.get("DOI", "")
                            result["doi"] = doi
                            result["resolved_title"] = returned_title
                            author_list = []
                            for a in item.get("author", []):
                                given = a.get("given", "")
                                family = a.get("family", "")
                                author_list.append(f"{given} {family}".strip())
                            result["authors"] = ", ".join(author_list) if author_list else "Unknown"
                            
                            pub = item.get("published", {}) or item.get("created", {})
                            parts = pub.get("date-parts", [[None]])
                            result["year"] = str(parts[0][0]) if parts[0][0] else ""
                            result["source_url"] = f"https://doi.org/{doi}"

                            # 3. Get abstract & open-access PDF from OpenAlex using DOI
                            abstract = ""
                            oa_pdf_url = ""
                            try:
                                openalex_url = f"https://api.openalex.org/works/https://doi.org/{doi}?mailto={contact_email}"
                                oa_resp = client.get(openalex_url, timeout=10.0)
                                if oa_resp.status_code == 200:
                                    oa_data = oa_resp.json()
                                    # Inverted index abstract reconstruction
                                    inv = oa_data.get("abstract_inverted_index")
                                    if inv:
                                        pairs = []
                                        for word, idxs in inv.items():
                                            for idx in idxs:
                                                pairs.append((idx, word))
                                        pairs.sort(key=lambda x: x[0])
                                        abstract = " ".join([p[1] for p in pairs])
                                    
                                    # OA PDF check
                                    oa_info = oa_data.get("open_access", {})
                                    best_oa = oa_data.get("best_oa_location", {}) or {}
                                    oa_pdf_url = best_oa.get("pdf_url") or oa_info.get("oa_url") or ""
                            except Exception:
                                pass

                            # 4. Check Unpaywall if no PDF url yet
                            if not oa_pdf_url:
                                try:
                                    unpaywall_url = f"https://api.unpaywall.org/v2/{doi}?email={contact_email}"
                                    unp_resp = client.get(unpaywall_url, timeout=10.0)
                                    if unp_resp.status_code == 200:
                                        unp_data = unp_resp.json()
                                        best_loc = unp_data.get("best_oa_location") or {}
                                        oa_pdf_url = best_loc.get("url_for_pdf") or best_loc.get("url") or ""
                                except Exception:
                                    pass

                            # 5. Fetch open PDF if available (must start with %PDF, under 15MB, first 40 pages)
                            if oa_pdf_url:
                                try:
                                    pdf_get = client.get(oa_pdf_url, follow_redirects=True, timeout=15.0)
                                    if pdf_get.status_code == 200 and pdf_get.content.startswith(b"%PDF") and len(pdf_get.content) <= 15 * 1024 * 1024:
                                        doc = fitz.open(stream=pdf_get.content, filetype="pdf")
                                        max_pages = min(40, len(doc))
                                        full_text = "\n".join([doc[i].get_text() for i in range(max_pages)])
                                        if len(full_text.split()) >= 150:
                                            result["source_text"] = full_text
                                            result["source_depth"] = "full text"
                                except Exception:
                                    pass

                            if not result["source_text"] and abstract:
                                result["source_text"] = abstract
                                result["source_depth"] = "abstract only"

    except Exception:
        pass

    save_cached_source(ref_str, result)
    return result

def chunk_text(text: str, chunk_size: int = 140, overlap: int = 35) -> List[str]:
    words = text.split()
    if not words:
        return []
    if len(words) <= chunk_size:
        return [" ".join(words)]
    
    chunks = []
    step = max(1, chunk_size - overlap)
    for i in range(0, len(words), step):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        if i + chunk_size >= len(words):
            break
    return chunks

def pick_top_chunks(claim: str, chunks: List[str], top_n: int = 4) -> List[str]:
    if not chunks:
        return []
    if len(chunks) <= top_n:
        return chunks
    
    tokenized_chunks = [re.findall(r'\w+', c.lower()) for c in chunks]
    bm25 = BM25Okapi(tokenized_chunks)
    query_tokens = re.findall(r'\w+', claim.lower())
    scores = bm25.get_scores(query_tokens)
    
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_n]
    return [chunks[i] for i in top_indices]

def verify_single_claim_against_ref(claim_text: str, citation_marker: str, ref_str: str, doc_full_text: str = "") -> Dict[str, Any]:
    """
    Verifies a single claim against a single reference string.
    Returns a full result dict (including verdict).
    """
    # Calculate position
    pos_desc = "Manuscript Citation"
    if doc_full_text and claim_text in doc_full_text:
        idx = doc_full_text.find(claim_text)
        line_num = doc_full_text[:idx].count("\n") + 1
        pos_desc = f"Line {line_num}"

    # Resolve reference
    resolved = resolve_reference(ref_str) if ref_str else {
        "resolved_title": "", "authors": "", "year": "", "doi": "",
        "source_url": "", "source_depth": "not retrieved", "source_text": ""
    }

    source_text = resolved.get("source_text", "").strip()
    source_depth = resolved.get("source_depth", "not retrieved")

    # Honesty rule: Reference not matched, or no source text available -> unverifiable
    if not resolved.get("resolved_title") or not source_text or source_depth == "not retrieved":
        return {
            "claim_text": claim_text,
            "citation_marker": citation_marker,
            "reference_string": ref_str,
            "resolved_title": resolved.get("resolved_title", ""),
            "authors": resolved.get("authors", ""),
            "year": resolved.get("year", ""),
            "doi": resolved.get("doi", ""),
            "source_url": resolved.get("source_url", ""),
            "source_depth": "not retrieved",
            "verdict": "unverifiable",
            "confidence": 0.0,
            "evidence_quote": "",
            "reason": "Cited reference could not be authoritatively resolved or no open source text was available.",
            "claim_position_in_document": pos_desc
        }

    # Check cache for judgment
    cached_v = get_cached_verdict(claim_text, ref_str)
    if cached_v:
        verdict = cached_v["verdict"]
        confidence = cached_v["confidence"]
        evidence_quote = cached_v["evidence_quote"]
        reason = cached_v["reason"]
        directly_stated = cached_v["directly_stated"]
    else:
        # Chunking & BM25
        chunks = chunk_text(source_text, chunk_size=140, overlap=35)
        top_chunks = pick_top_chunks(claim_text, chunks, top_n=4)
        snippets_text = "\n---\n".join([f"Snippet {i+1}:\n{c}" for i, c in enumerate(top_chunks)])

        # Gemini judgment call
        judge_prompt = f"""You are an exacting academic reviewer and fact-checker. 
Your task is to judge whether the specific empirical claim made in a manuscript draft is supported, weakly supported, or mismatched by the retrieved primary source snippets.

Manuscript Claim:
"{claim_text}"

Retrieved Primary Source Snippets:
{snippets_text}

Instructions:
1. verdict: must be one of "supported", "weakly_supported", "mismatched".
   - "supported": The primary text explicitly substantiates the factual assertions and numbers in the claim.
   - "weakly_supported": The claim is partially aligned or plausible, but omits key caveats, makes a scope leap, or is only tangentially indicated.
   - "mismatched": The primary text contradicts the claim, demonstrates the opposite polarity, or does not support the assertion.
2. directly_stated: boolean. True only if the assertion is explicitly stated in the snippets (not inferred).
3. evidence_quote: An exact verbatim quote copied directly from the provided snippets that serves as evidence. If no exact evidence quote exists, leave this empty string "".
4. reason: A concise explanation (1-2 sentences) of your judgment.
5. confidence: A float between 0.0 and 1.0 representing your certainty.

Respond ONLY with valid JSON following this schema:
{{
  "verdict": "supported" | "weakly_supported" | "mismatched",
  "directly_stated": true | false,
  "evidence_quote": "exact quote from snippets or empty string",
  "reason": "explanation string",
  "confidence": 0.95
}}
"""
        judge_res = call_gemini_json(judge_prompt)
        verdict = judge_res.get("verdict", "weakly_supported")
        directly_stated = bool(judge_res.get("directly_stated", False))
        evidence_quote = str(judge_res.get("evidence_quote", "")).strip()
        reason = str(judge_res.get("reason", "Evaluated against retrieved source passages.")).strip()
        confidence = float(judge_res.get("confidence", 0.5))

        # Save to cache
        save_cached_verdict(claim_text, ref_str, {
            "verdict": verdict,
            "confidence": confidence,
            "evidence_quote": evidence_quote,
            "reason": reason,
            "directly_stated": directly_stated
        })

    # Strict Honesty Rules
    # Rule: Source only had an abstract, verdict is "supported", but directly_stated is false -> downgrade
    if source_depth == "abstract only" and verdict == "supported" and not directly_stated:
        verdict = "weakly_supported"
        reason = f"{reason} (Downgraded to weakly_supported: source text was limited to abstract and claim is not directly stated.)"

    # Rule: If evidence_quote is not actually found in source text, blank it and cap confidence at 0.5
    if evidence_quote:
        if evidence_quote.lower() not in source_text.lower():
            evidence_quote = ""
            confidence = min(confidence, 0.5)

    # Rule: "supported" with no evidence quote becomes "weakly_supported"
    if verdict == "supported" and not evidence_quote:
        verdict = "weakly_supported"
        reason = f"{reason} (Downgraded to weakly_supported: no verbatim supporting evidence quote was isolated.)"

    return {
        "claim_text": claim_text,
        "citation_marker": citation_marker,
        "reference_string": ref_str,
        "resolved_title": resolved.get("resolved_title", ""),
        "authors": resolved.get("authors", ""),
        "year": resolved.get("year", ""),
        "doi": resolved.get("doi", ""),
        "source_url": resolved.get("source_url", ""),
        "source_depth": source_depth,
        "verdict": verdict,
        "confidence": round(confidence, 2),
        "evidence_quote": evidence_quote,
        "reason": reason,
        "claim_position_in_document": pos_desc
    }


def verify_single_claim_pipeline(claim_item: Dict[str, Any], doc_full_text: str = "", ref_dict: Dict[int, str] = None) -> Dict[str, Any]:
    """
    Executes the verification pipeline for a single extracted claim.
    Uses ref_dict (parsed from document) to look up cited reference numbers.
    Verifies against at most the first 2 cited references and keeps the best result.
    """
    claim_text = claim_item.get("claim", "").strip()
    citation_marker = claim_item.get("citation_marker", "").strip()

    if ref_dict is None:
        ref_dict = {}

    # Calculate position (for fallback path)
    pos_desc = "Manuscript Citation"
    if doc_full_text and claim_text in doc_full_text:
        idx = doc_full_text.find(claim_text)
        line_num = doc_full_text[:idx].count("\n") + 1
        pos_desc = f"Line {line_num}"

    # Step 5: Parse citation marker into numbers
    cited_numbers = parse_citation_numbers(citation_marker)

    if cited_numbers and ref_dict:
        # Verify against at most the first 2 cited references
        candidates_to_try = [n for n in cited_numbers[:2]]
        results: List[Dict[str, Any]] = []

        for num in candidates_to_try:
            if num in ref_dict:
                ref_str = ref_dict[num]
                try:
                    res = verify_single_claim_against_ref(claim_text, citation_marker, ref_str, doc_full_text)
                    results.append(res)
                except RateLimitException:
                    raise
                except Exception:
                    pass
            else:
                # Step 7: Cited number not in reference dict -> unverifiable
                results.append({
                    "claim_text": claim_text,
                    "citation_marker": citation_marker,
                    "reference_string": "",
                    "resolved_title": "",
                    "authors": "",
                    "year": "",
                    "doi": "",
                    "source_url": "",
                    "source_depth": "not retrieved",
                    "verdict": "unverifiable",
                    "confidence": 0.0,
                    "evidence_quote": "",
                    "reason": f"Reference [{num}] was not found in the reference list.",
                    "claim_position_in_document": pos_desc
                })

        if results:
            # Step 6: Keep the best result by verdict priority
            best = min(results, key=lambda r: VERDICT_PRIORITY.get(r["verdict"], 99))
            return best

    # Fallback: no numeric citation or no ref_dict available
    # Try to use reference_string from claim_item if present (single-claim verify endpoint)
    ref_str = claim_item.get("reference_string", "").strip()
    if ref_str:
        return verify_single_claim_against_ref(claim_text, citation_marker, ref_str, doc_full_text)

    # Truly unverifiable - no reference info at all
    return {
        "claim_text": claim_text,
        "citation_marker": citation_marker,
        "reference_string": "",
        "resolved_title": "",
        "authors": "",
        "year": "",
        "doi": "",
        "source_url": "",
        "source_depth": "not retrieved",
        "verdict": "unverifiable",
        "confidence": 0.0,
        "evidence_quote": "",
        "reason": "No reference information could be identified for this citation.",
        "claim_position_in_document": pos_desc
    }


def run_job_pipeline(job_id: str, document_text: str):
    """
    Background worker thread running the complete document pipeline.
    """
    try:
        with jobs_lock:
            jobs[job_id]["status"] = "extracting"

        max_claims = int(os.getenv("MAX_CLAIMS", "15"))

        # Step 1: Normalize text
        document_text = normalize_text(document_text)

        # Step 2: Split into body and references
        body_text, refs_text = split_body_and_references(document_text)

        # Step 3: Parse reference section into dict
        ref_dict = parse_reference_section(refs_text)
        refs_found = len(ref_dict)
        print(f"[CiteCheck] Job {job_id}: {refs_found} references parsed from reference section.")

        # Step 4: Gemini extraction call - send only the BODY (up to 45,000 chars)
        doc_hash = hashlib.sha256(document_text.encode("utf-8")).hexdigest()
        cached_claims = get_cached_extraction(doc_hash)
        if cached_claims is not None:
            claims = cached_claims
            print(f"[CiteCheck] Job {job_id}: {len(claims)} claims loaded from cache.")
        else:
            body_for_gemini = body_text[:45000]

            extraction_prompt = f"""You are an automated manuscript citation parser.
Extract up to {max_claims} specific factual or empirical claims from the research manuscript body below that cite one or two numbered references (e.g. [8] or [30]).

For each claim, return:
1. "claim": The exact sentence from the text containing the claim, copied verbatim.
2. "citation_marker": The in-text citation marker exactly as it appears (e.g. "[3]", "[10, 11]", "[1-7]").

Prefer claims that:
- Cite specific external findings, statistics, or results (e.g. "[8] showed 14% improvement...")
- Cite one or two references, not long ranges like [1-20]
- Are factual and verifiable against an external source

Skip claims that:
- Describe this paper's own methods, contributions, or results
- Do not contain a numbered citation marker

Manuscript Body:
\"\"\"
{body_for_gemini}
\"\"\"

Respond ONLY with valid JSON:
[
  {{
    "claim": "Exact sentence from text.",
    "citation_marker": "[8]"
  }}
]
"""
            extracted = call_gemini_json(extraction_prompt)

            # Handle both list and dict response formats
            if isinstance(extracted, dict):
                claims = extracted.get("claims", [])
            elif isinstance(extracted, list):
                claims = extracted
            else:
                claims = []

            save_cached_extraction(doc_hash, claims)

        claims = claims[:max_claims]
        print(f"[CiteCheck] Job {job_id}: {len(claims)} claims extracted by Gemini.")

        with jobs_lock:
            jobs[job_id]["status"] = "verifying"
            jobs[job_id]["total"] = len(claims)
            jobs[job_id]["done"] = 0
            jobs[job_id]["references_found"] = refs_found

        # Process each claim sequentially
        for item in claims:
            try:
                res_obj = verify_single_claim_pipeline(item, doc_full_text=document_text, ref_dict=ref_dict)
                with jobs_lock:
                    jobs[job_id]["results"].append(res_obj)
                    jobs[job_id]["done"] += 1
            except RateLimitException as rle:
                with jobs_lock:
                    jobs[job_id]["status"] = "rate_limited"
                    jobs[job_id]["error"] = str(rle)
                return

        with jobs_lock:
            jobs[job_id]["status"] = "done"

    except RateLimitException as rle:
        with jobs_lock:
            jobs[job_id]["status"] = "rate_limited"
            jobs[job_id]["error"] = str(rle)
    except Exception as e:
        with jobs_lock:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = str(e)


# ==================== ENDPOINTS ====================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        "configured": bool(os.getenv("GEMINI_API_KEY", "").strip())
    }

@app.post("/analyze")
async def analyze_document(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None)
):
    """
    Accepts multipart file (PDF, DOCX, TXT) or form field 'text'.
    Extracts the text, starts background worker thread, returns {job_id}.
    """
    doc_text = ""
    if file and file.filename:
        content = await file.read()
        doc_text = extract_text_from_bytes(file.filename, content)
    elif text:
        doc_text = text.strip()

    if not doc_text:
        raise HTTPException(status_code=400, detail="No document file or text content provided.")

    job_id = str(uuid.uuid4())
    with jobs_lock:
        jobs[job_id] = {
            "id": job_id,
            "status": "queued",
            "total": 0,
            "done": 0,
            "results": [],
            "error": None,
            "references_found": 0
        }

    # Start processing thread
    thread = threading.Thread(target=run_job_pipeline, args=(job_id, doc_text), daemon=True)
    thread.start()

    return {"job_id": job_id}

@app.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    """
    Returns {id, status, total, done, results[], error, references_found}.
    Status is one of: queued, extracting, verifying, done, rate_limited, error.
    """
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return {
            "id": job["id"],
            "status": job["status"],
            "total": job["total"],
            "done": job["done"],
            "results": job["results"],
            "error": job["error"],
            "references_found": job.get("references_found", 0)
        }

class VerifyRequest(BaseModel):
    claim: str
    reference: str

@app.post("/verify")
def verify_claim(req: VerifyRequest):
    """
    JSON {claim, reference}, returns one result object.
    """
    if not req.claim.strip():
        raise HTTPException(status_code=400, detail="Claim cannot be empty")
    
    try:
        item = {
            "claim": req.claim.strip(),
            "citation_marker": "",
            "reference_string": req.reference.strip()
        }
        result = verify_single_claim_pipeline(item, doc_full_text="", ref_dict={})
        return result
    except RateLimitException as rle:
        raise HTTPException(status_code=429, detail=str(rle))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
