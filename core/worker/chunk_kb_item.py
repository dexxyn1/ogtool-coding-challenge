from typing import List
import sys
import os

# Add project root to path to allow sibling imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from core.scraper.ai_bs_scraper import KBItem
from langchain.text_splitter import RecursiveCharacterTextSplitter

DEFAULT_CHUNK_SIZE = 2000
DEFAULT_CHUNK_OVERLAP = 200

def chunk_kb_item(kb_item: KBItem, chunk_size: int = DEFAULT_CHUNK_SIZE, chunk_overlap: int = DEFAULT_CHUNK_OVERLAP) -> List[KBItem]:
    """
    Splits a KBItem's content into smaller chunks if it exceeds the specified size.

    Args:
        kb_item: The KBItem to process.
        chunk_size: The maximum size of each content chunk.
        chunk_overlap: The number of characters to overlap between chunks.

    Returns:
        A list of KBItems. If the content was chunked, this list will contain
        multiple KBItems, each with a part of the original content. If not,
        it will contain the single, original KBItem.
    """
    if len(kb_item.content) <= chunk_size:
        return [kb_item]

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    
    chunks = text_splitter.split_text(kb_item.content)
    
    chunked_items: List[KBItem] = []
    for i, chunk in enumerate(chunks):
        new_item = KBItem(
            title=f"{kb_item.title} (Part {i + 1})",
            content=chunk,
            content_type=kb_item.content_type,
            source_url=kb_item.source_url,
            author=kb_item.author
        )
        chunked_items.append(new_item)
        
    return chunked_items 