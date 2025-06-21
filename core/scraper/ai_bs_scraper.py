#!/usr/bin/env python3
"""
an_bs_scraper.py

An intelligent, AI-driven web scraper that uses the OpenAI API to understand,
classify, and extract content from web pages based on natural language instructions.

Usage:
  python core/scraper/an_bs_scraper.py \
    --link "https://interviewing.io/blog" \
    --instructions "Extract the title of the blog post, the main author's name, and a summary of the article." \
    --out "interviewing_blog_summary.json"

Required Environment Variables:
  - OPENAI_API_KEY: Your API key for the OpenAI service.
"""
from __future__ import annotations
import re
import html as _html

import argparse
import json
import os
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Literal, Optional, Set
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, NavigableString
from html2text import HTML2Text
from openai import OpenAI
from playwright.sync_api import sync_playwright, Error as PWError, TimeoutError as PWTimeout

MD_CONVERTER = HTML2Text()
MD_CONVERTER.body_width = 0
MD_CONVERTER.ignore_links = False
MD_CONVERTER.ignore_images = True

# --- Configuration ---
# It's good practice to use an environment variable for the API key.
# Load it once here.
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("The OPENAI_API_KEY environment variable is not set.")

# Data model
# ---------------------------------------------------------------------------
@dataclass
class KBItem:
    title: str
    content: str
    content_type: str  # "blog"
    source_url: str
    author: str | None = None

    def to_dict(self):
        d = asdict(self)
        d.update({"author": "", "user_id": ""})
        return d

# --- Data Models ---
@dataclass
class CrawledLink:
    """Represents a single discovered link and its AI-assessed properties."""
    link: str
    link_type: Literal["directory", "post", "unknown"]
    matches_what_the_user_wants: bool = False
    extracted_data: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converts the object to a dictionary for JSON serialization."""
        return {
            "link": self.link,
            "linkType": self.link_type,
            "matchesWhatTheUserWants": self.matches_what_the_user_wants,
            "extractedData": self.extracted_data
        }

# --- The Scraper Class ---
class AiScraper:
    """The main class for the AI-powered scraper."""

    def __init__(self, start_url: str, special_instructions: str):
        if not start_url or not special_instructions:
            raise ValueError("Start URL and special instructions cannot be empty.")
        
        self.start_url = start_url
        self.special_instructions = special_instructions
        self.base_domain = urlparse(start_url).netloc
        
        self.openai_client = OpenAI(api_key=api_key)
        
        # Data stores
        self.crawled_links: Dict[str, CrawledLink] = {}
        self.visited_urls: Set[str] = set()

        # --- Playwright setup ---
        print("[INFO] Initializing headless browser...")
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=True)
        self._context = self._browser.new_context(
            user_agent='OGTool-AI-Scraper/1.0 (Playwright)'
        )
        self._page = self._context.new_page()

    def close(self):
        """Closes the browser and cleans up Playwright resources."""
        print("[INFO] Shutting down headless browser...")
        if hasattr(self, '_context') and self._context:
            self._context.close()
        if hasattr(self, '_browser') and self._browser:
            self._browser.close()
        if hasattr(self, '_pw') and self._pw:
            self._pw.stop()

    def _current_soup(self) -> BeautifulSoup:
        return BeautifulSoup(self._page.content(), "html.parser")


    def _fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetches the content of a URL using Playwright and returns a BeautifulSoup object."""
        print(f"[INFO] Fetching {url}...")
        try:
            self._page.goto(url, timeout=20000, wait_until="domcontentloaded")
            # A short, dynamic wait can sometimes help with pages that load content late.
            self._page.wait_for_timeout(500)
            html_content = self._page.content()
            return BeautifulSoup(html_content, 'html.parser')
        except PWError as e:
            print(f"[ERROR] Playwright could not fetch {url}: {e}")
            return None

    def _batch_call_openai_classifier(self, urls: List[str]) -> Optional[List[Dict[str, Any]]]:
        """
        Asks the OpenAI API to classify a batch of URLs.
        """
        if not urls:
            return []
        
        print(f"[AI] Batch classifying {len(urls)} URLs...")

        # Create the list of URLs for the prompt
        url_list_str = "\n".join([f'{i+1}. "{url}"' for i, url in enumerate(urls)])

        prompt = f"""
        Given the following list of URLs and user instructions, please classify each page.

        User Instructions: "{self.special_instructions}"

        URL List:
        {url_list_str}

        For each URL, provide a JSON object with the following keys:
        - "link": (string) The URL you are classifying.
        - "linkType": (string) Must be one of "directory", "post", or "unknown".
        - "matchesWhatTheUserWants": (boolean) true or false.

        Please respond with a single JSON object containing a key "classifications", which is a list of these JSON objects, one for each URL in the original order.
        """
        try:
            time.sleep(1) # Be nice to the API
            response = self.openai_client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that classifies web pages in batches."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            # The response should be a JSON object like: {"classifications": [...]}
            result = json.loads(response.choices[0].message.content)
            classifications = result.get("classifications", [])
            
            print(f"[AI] Batch classification successful for {len(classifications)} URLs.")
            return classifications
        except Exception as e:
            print(f"[ERROR] OpenAI batch API call failed: {e}")
            return None

    def _call_openai_classifier(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Asks the OpenAI API to classify a URL as a 'directory' or a 'post' and
        if it matches the user's instructions.
        """
        print(f"[AI] Classifying {url}...")
        prompt = f"""
        Given the following URL and user instructions, please classify the page.
        
        URL: "{url}"
        User Instructions: "{self.special_instructions}"

        Tasks:
        1. Is this URL a "directory" (a page that primarily lists links to other articles/posts) or a "post" (a single, self-contained article or content page)?
        2. Based on the URL and the user instructions, does this link seem to match what the user is looking for? For example, if the user wants "engineering blog posts about scaling databases", a link to "/articles/how-we-scaled-postgres" would be a match, but "/about-us" would not.

        Please respond in JSON format with the following keys:
        - "linkType": (string) Must be one of "directory", "post", or "unknown".
        - "matchesWhatTheUserWants": (boolean) true or false.
        """
        try:
            # Add a delay to avoid hitting rate limits
            time.sleep(1)
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4.1-nano",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that classifies web pages."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            result = json.loads(response.choices[0].message.content)
            print(f"[AI] Classification for {url}: {result}")
            return result
        except Exception as e:
            print(f"[ERROR] OpenAI API call failed for {url}: {e}")
            return None

    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """
        Extracts links by finding all `a[href]` tags and then by programmatically
        clicking other interactive elements to discover their destinations.
        """
        # Phase 1: Fast extraction of standard `<a>` tags.
        links = set()
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            full_url = urljoin(base_url, href)
            full_url = full_url.split('#')[0]
            if urlparse(full_url).netloc == self.base_domain and full_url.startswith('http'):
                links.add(full_url)

        if len(links) > 5:
            return list(links) # more than 5 links, we can assume we have found all the links
        
        # Phase 2: Slower, stateful extraction by clicking other interactive elements.
        print("[INFO] Finding and clicking interactive elements. This may be slow...")
        selectors = ['button']
        
        for selector in selectors:
            i = 0
            while True:
                if self._page.url != base_url:
                    self._page.goto(base_url, wait_until="domcontentloaded")
                
                try:
                    locator = self._page.locator(selector).nth(i)
                    if locator.count() == 0:
                        break # No more elements for this selector
                    
                    is_anchor = locator.evaluate('element => element.tagName') == 'A'
                    is_visible = locator.is_visible(timeout=200)
                    is_pointer = locator.evaluate('element => window.getComputedStyle(element).cursor') == 'pointer'

                    if is_anchor or not is_visible or not is_pointer:
                        i += 1
                        continue
                except Exception:
                    break

                current_url = self._page.url
                
                try:
                    # Check if click opens a new tab.
                    with self._context.expect_page(timeout=3000) as new_page_info:
                        locator.click(timeout=2500)
                    
                    new_page = new_page_info.value
                    new_page.wait_for_load_state(timeout=10000)
                    url_from_new_tab = new_page.url.split('#')[0]
                    new_page.close()

                    if urlparse(url_from_new_tab).netloc == self.base_domain:
                        print(f"  Discovered link in new tab: {url_from_new_tab}")
                        links.add(url_from_new_tab)

                except PWTimeout:
                    # No new tab opened. Check if the current page navigated.
                    try:
                        self._page.wait_for_url(lambda url: url != current_url, timeout=3000)
                        navigated_url = self._page.url.split('#')[0]
                        if urlparse(navigated_url).netloc == self.base_domain:
                            print(f"  Discovered link by navigation: {navigated_url}")
                            links.add(navigated_url)
                        self._page.goto(base_url, wait_until="domcontentloaded")
                    except PWTimeout:
                        # No navigation occurred.
                        pass
                except Exception as e:
                    print(f"[WARN] Could not process click for element {i} with selector '{selector}': {e}")
                
                i += 1

        return list(links)
        
    def _run_crawl(self):
        """
        Performs a phased crawl: discovers links, batch-classifies them,
        then finds more directories to crawl from the results.
        """
        # 1. Initial classification of the start_url to see if we should crawl it for links.
        print("[INFO] Starting with initial classification of start URL.")
        initial_classification = self._call_openai_classifier(self.start_url)
        if not initial_classification:
            print("[ERROR] Could not classify start URL. Aborting.")
            return
        
        initial_crawled_link = CrawledLink(
            link=self.start_url,
            link_type=initial_classification.get("linkType", "unknown"),
            matches_what_the_user_wants=initial_classification.get("matchesWhatTheUserWants", False)
        )
        self.crawled_links[self.start_url] = initial_crawled_link
        self.visited_urls.add(self.start_url)

        # If the start URL is not a directory, we don't need to crawl.
        if initial_crawled_link.link_type != 'directory':
            print("[INFO] Start URL is not a directory. No further crawling needed.")
            return

        # 2. Setup for the main discovery loop
        dirs_to_crawl = deque([self.start_url])
        
        while dirs_to_crawl:
            # Batch process all directories currently in the queue
            urls_to_fetch = list(dirs_to_crawl)
            dirs_to_crawl.clear() # Clear the queue for the next level
            
            unclassified_links = set()

            for url in urls_to_fetch:
                print(f"[INFO] Exploring directory for links: {url}")
                soup = self._fetch_page(url)
                if soup:
                    links = self._extract_links(soup, url)
                    for link in links:
                        if link not in self.visited_urls:
                            self.visited_urls.add(link)
                            unclassified_links.add(link)
            
            if not unclassified_links:
                print("[INFO] No new unclassified links found in this batch.")
                continue

            print(f"[INFO] Found {len(unclassified_links)} links to classify.")

            # 3. Batch classify the newly found links
            link_list = list(unclassified_links)
            for i in range(0, len(link_list), 10):
                batch = link_list[i:i+10]
                classifications = self._batch_call_openai_classifier(batch)
                
                if classifications:
                    for classification in classifications:
                        link_url = classification.get("link")
                        if not link_url: continue

                        crawled_link = CrawledLink(
                            link=link_url,
                            link_type=classification.get("linkType", "unknown"),
                            matches_what_the_user_wants=classification.get("matchesWhatTheUserWants", False)
                        )
                        self.crawled_links[link_url] = crawled_link
                        
                        # If we found a new directory, add it to the queue for the next loop iteration
                        if crawled_link.link_type == 'directory':
                            dirs_to_crawl.append(link_url)

    def run(self) -> List[KBItem]:
        """
        The main orchestrator method.
        First, it crawls the site to classify all links.
        Then, it extracts content from all matching posts.
        """
        print("--- Starting Crawl Phase ---")
        self._run_crawl()

        print("\n--- Starting Extraction Phase ---")
        items: List[KBItem] = []
        # Filter for the links that the AI classified as relevant posts
        post_links = [
            link.link for link in self.crawled_links.values()
            if link.link_type == "post" and link.matches_what_the_user_wants
        ]

        print(f"[INFO] Found {len(post_links)} posts to extract.")

        for url in post_links:
            print(f"[INFO] Extracting content from {url}...")
            item = self._extract_post(url)
            if item:
                items.append(item)
        
        print(f"\n[INFO] Successfully extracted {len(items)} items.")
        return items

    # ---------- single post extraction -----------------------------------
    def _extract_post(self, url: str) -> KBItem | None:
        """
        Extracts content from a single URL using a fresh, isolated browser page.
        """
        page = None
        try:
            # Create a new page for each extraction to guarantee a clean slate.
            page = self._context.new_page()
            page.goto(url, timeout=45000, wait_until="networkidle")

            soup = BeautifulSoup(page.content(), "html.parser")
            
            author = soup.find("meta", property="article:author")
            author = author.get("content") if author else None
            title_tag = soup.find("h1") or soup.find("title")
            title = title_tag.get_text(strip=True) if title_tag else "Untitled"
            container = soup.find("article") or soup.find("main") or soup.find("body") or soup
            parts: List[str] = []
            for elem in container.descendants:
                if isinstance(elem, NavigableString):
                    continue
                if elem.name in {"p", "h2", "h3", "pre", "ul", "ol", "div"}:
                    parts.append(str(elem))
            markdown = MD_CONVERTER.handle("\n".join(parts))
            return KBItem(title=title, content=markdown.strip(), content_type="blog", source_url=url, author=author)
        except (PWError, PWTimeout) as e:
            print(f"[warn] could not process page {url}: {e}")
            return None
        finally:
            if page:
                page.close()

# --- CLI ---
def main():
    parser = argparse.ArgumentParser(
        description="An AI-powered web scraper using the OpenAI API.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--link",
        required=True,
        help="The starting URL for the crawl."
    )
    parser.add_argument(
        "--instructions",
        required=True,
        help="Natural language instructions for what to extract from 'post' pages."
    )
    parser.add_argument(
        "--out",
        default="an_bs_scraper_output.json",
        help="Path to the output JSON file."
    )
    args = parser.parse_args()
    
    scraper = None
    try:
        scraper = AiScraper(start_url=args.link, special_instructions=args.instructions)
        results = scraper.run()
        
        # Save results to file
        with open(args.out, 'w', encoding='utf-8') as f:
            # Convert the list of KBItem objects to a list of dictionaries
            output_data = [item.to_dict() for item in results]
            json.dump(output_data, f, indent=2, ensure_ascii=False)
            
        print(f"\n✅ Success! Results saved to {args.out}")
        
    except (ValueError, Exception) as e:
        print(f"\n❌ An error occurred: {e}")
    finally:
        if scraper:
            scraper.close()

if __name__ == "__main__":
    main() 