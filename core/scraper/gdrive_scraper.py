#!/usr/bin/env python3
"""
drive_scraper.py
Extracts text from all PDF / DOCX / Google-Docs files inside a *public*
Google Drive folder — no API key, no OAuth, no tmp files.

Usage:
  python gdrive_scraper.py --folder https://drive.google.com/drive/folders/1AdUu4jh6DGwmCxfgnDQEMWWyo6_whPHJ --out result.json
"""

from __future__ import annotations
import argparse, io, json, os, re, sys, time, html
from dataclasses import dataclass, asdict
from typing import Iterable, List
from urllib.parse import urlparse
import requests, tqdm
from pdfminer.high_level import extract_text as pdf_text
from docx import Document
from PyPDF2 import PdfReader

# --------------------------------------------------------------------------- #
@dataclass
class Doc:
    path: str             # "sub/dir/Name.pdf"
    mime: str             # MIME from Drive
    bytes: bytes | None   # raw data or None for native Docs
    text: str             # extracted text
    author: str | None = None         # ← new
    def to_json(self):
        d = asdict(self)
        d.pop("bytes")    # raw bytes not wanted in final JSON
        return d

# --------------------------------------------------------------------------- #
def list_folder(folder_url: str):
    html_page = requests.get(folder_url, headers={"User-Agent": "Mozilla/5.0"}).text

    m = re.search(r"window\['_DRIVE_ivd']\s*=\s*'([^']+)'", html_page)
    if not m:
        raise RuntimeError("Drive blob not found — is the link public and does it keep the resourcekey?")

    # ① convert HTML entities, ② turn \x## escapes into real chars
    raw = bytes(html.unescape(m.group(1)), "utf-8").decode("unicode_escape")
    rows = json.loads(raw)[0]                     # <-- no crash now
    for r in rows:
        yield {"id": r[0], "name": r[2], "mime": r[5]}


def fetch_binary(fid: str) -> bytes:
    """
    Anonymous download endpoint; handles Google's 'confirm' cookie for >25 MB.
    """
    url = f"https://drive.google.com/uc?export=download&id={fid}"
    sess = requests.Session()
    r = sess.get(url, stream=True)
    token = next((v for k, v in r.cookies.items() if k.startswith("download_warning")), None)
    if token:
        r = sess.get(f"{url}&confirm={token}", stream=True)
    chunks = []
    for chunk in r.iter_content(32_768):
        if chunk:
            chunks.append(chunk)
    return b"".join(chunks)


def export_gdoc(fid: str, as_pdf: bool = False) -> bytes | str:
    """
    Export native Google Docs:
      TXT is capped at 10 MB → fall back to PDF if too big/asked.
    """
    if as_pdf:
        return fetch_binary(fid)  # we’ll fetch later via /uc
    url = f"https://docs.google.com/document/d/{fid}/export?format=txt"
    resp = requests.get(url)
    if resp.status_code != 200:
        raise RuntimeError(f"export failed {resp.status_code}")
    return resp.text


# --------------------------------------------------------------------------- #
def walk(folder_url: str, prefix: str = "") -> Iterable[tuple[str, str, str]]:
    """
    Recursively yield (id, name, mime, path) for every file in the tree.
    """
    for row in list_folder(folder_url):
        fid, name, mime = row["id"], row["name"], row["mime"]
        path = f"{prefix}{name}"
        if mime == "application/vnd.google-apps.folder":
            child = f"https://drive.google.com/drive/folders/{fid}"
            yield from walk(child, prefix=path + "/")
        else:
            yield fid, name, mime, path


# --------------------------------------------------------------------------- #
def extract(fid: str, name: str, path: str, mime: str) -> Doc | None:
    """
    Download & extract text. Returns None if unsupported type.
    """
    lower = name.lower()
    try:
        # PDF ----------------------------------------------------------------
        if mime == "application/pdf" or lower.endswith(".pdf"):
            data = fetch_binary(fid)
            text = pdf_text(io.BytesIO(data))

            # NEW: pull /Author from PDF info
            try:
                meta = PdfReader(io.BytesIO(data)).metadata
                author = (meta.author or meta.creator) if meta else None
            except Exception:
                author = None

            return Doc(path=name, mime=mime, bytes=data, text=text, author=author)

        # DOCX ---------------------------------------------------------------
        if mime.endswith("wordprocessingml.document") or lower.endswith(".docx"):
            data = fetch_binary(fid)
            docx = Document(io.BytesIO(data))
            text = "\n".join(p.text for p in docx.paragraphs)
            author = docx.core_properties.author or None   # NEW
            return Doc(path=name, mime=mime, bytes=data, text=text, author=author)

        # Native Google Docs --------------------------------------------------
        if mime == "application/vnd.google-apps.document":
            try:
                txt = export_gdoc(fid)
                author = None        # not exposed in anonymous export
                return Doc(path=name + ".txt", mime="text/plain", bytes=None, text=txt, author=author)
            except RuntimeError:          # too big for txt → export pdf instead
                data = fetch_binary(fid)
                txt = pdf_text(io.BytesIO(data))
                return Doc(path=f"{name}.pdf", mime="application/pdf", bytes=data, text=txt, author=None)

    except Exception as exc:
        print(f"[warn] could not extract {name}: {exc}")

    return None  # skip everything else


def extract_gdrive_folder(folder_url: str) -> List[Doc]:
    root = folder_url.rstrip("/")
    docs: List[Doc] = []

    for fid, name, mime, path in tqdm.tqdm(list(walk(root)), desc="files"):
        doc = extract(fid, name, path, mime)
        if doc:
            docs.append(doc)

    return docs

# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folder", required=True, help="https://drive.google.com/drive/folders/<ID>")
    ap.add_argument("--out", default="drive_textdump.json")
    args = ap.parse_args()
    docs = extract_gdrive_folder(args.folder)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump([d.to_json() for d in docs], f, indent=2, ensure_ascii=False)
    print(f"\n✓ {len(docs)} documents written to {args.out}")

if __name__ == "__main__":
    main()
