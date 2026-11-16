import os
import re
import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from backend.config import DATA_LAWS_DIR, DB_PATH
from backend.models.database import get_db, init_db
from backend.services.gemini_service import gemini_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest")

def parse_txt_sections(file_path: Path) -> List[Dict[str, Any]]:
    """Parse structured sections from a text file in data/laws."""
    text = file_path.read_text(encoding="utf-8")
    chunks = []
    
    # Check if structured with [SECTION: ...] tags
    section_blocks = re.split(r"\[SECTION:\s*(.*?)\]", text)
    
    if len(section_blocks) > 1:
        # First element might be header
        header = section_blocks[0].strip()
        act_match = re.search(r"\[ACT:\s*(.*?)\]", header)
        default_act = act_match.group(1).strip() if act_match else file_path.stem.replace("_", " ").title()
        
        for i in range(1, len(section_blocks), 2):
            sec_header = section_blocks[i].strip()
            sec_content = section_blocks[i+1].strip() if i+1 < len(section_blocks) else ""
            
            # Extract Act, Section, Title, Text
            act_name = default_act
            section_number = sec_header
            title = ""
            
            act_line = re.search(r"^Act:\s*(.*?)$", sec_content, re.MULTILINE)
            if act_line:
                act_name = act_line.group(1).strip()
            sec_line = re.search(r"^Section:\s*(.*?)$", sec_content, re.MULTILINE)
            if sec_line:
                section_number = sec_line.group(1).strip()
            title_line = re.search(r"^Title:\s*(.*?)$", sec_content, re.MULTILINE)
            if title_line:
                title = title_line.group(1).strip()
                
            clean_content = f"Act: {act_name}\nSection: {section_number}\nTitle: {title}\n{sec_content}"
            chunks.append({
                "doc_name": file_path.name,
                "act_name": act_name,
                "section_number": section_number,
                "title": title,
                "content": clean_content.strip()
            })
    else:
        # Fallback split by double newlines or paragraph blocks
        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 50]
        for idx, p in enumerate(paragraphs):
            chunks.append({
                "doc_name": file_path.name,
                "act_name": file_path.stem.replace("_", " ").title(),
                "section_number": f"Item {idx+1}",
                "title": f"Clause {idx+1}",
                "content": p
            })
            
    return chunks

def parse_pdf_sections(file_path: Path) -> List[Dict[str, Any]]:
    """Parse text from PDF and chunk by section."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(file_path))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() or ""
        
        # Split into ~500 token segments with overlap
        chunks = []
        words = full_text.split()
        chunk_size = 300
        step = 250
        for i in range(0, len(words), step):
            segment = " ".join(words[i:i+chunk_size])
            if len(segment) > 100:
                chunks.append({
                    "doc_name": file_path.name,
                    "act_name": file_path.stem.replace("_", " ").title(),
                    "section_number": f"Page {i//step + 1}",
                    "title": f"Excerpt {i//step + 1}",
                    "content": segment
                })
        return chunks
    except Exception as e:
        logger.error(f"Error parsing PDF {file_path}: {e}")
        return []

def ingest_laws(force_reingest: bool = False):
    """Ingest all law documents from /data/laws into SQLite database."""
    init_db()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM legal_chunks")
        existing_count = cursor.fetchone()["count"]
        
        if existing_count > 0 and not force_reingest:
            logger.info(f"Database already contains {existing_count} legal chunks. Skipping ingestion.")
            return existing_count
            
        if force_reingest:
            logger.info("Force reingest requested: clearing existing legal_chunks...")
            cursor.execute("DELETE FROM legal_chunks")
            
        all_chunks = []
        if not DATA_LAWS_DIR.exists():
            logger.warning(f"Data laws directory {DATA_LAWS_DIR} not found.")
            return 0
            
        for file_path in DATA_LAWS_DIR.glob("*"):
            if file_path.suffix.lower() == ".txt":
                logger.info(f"Processing text law file: {file_path.name}")
                chunks = parse_txt_sections(file_path)
                all_chunks.extend(chunks)
            elif file_path.suffix.lower() == ".pdf":
                logger.info(f"Processing PDF law file: {file_path.name}")
                chunks = parse_pdf_sections(file_path)
                all_chunks.extend(chunks)
                
        logger.info(f"Total extracted chunks: {len(all_chunks)}. Computing embeddings...")
        
        for idx, chunk in enumerate(all_chunks):
            embed_text = f"{chunk['act_name']} {chunk['section_number']} {chunk['title']}\n{chunk['content']}"
            embedding = gemini_service.get_embedding(embed_text)
            
            cursor.execute("""
                INSERT INTO legal_chunks (doc_name, act_name, section_number, title, content, embedding)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                chunk["doc_name"],
                chunk["act_name"],
                chunk["section_number"],
                chunk["title"],
                chunk["content"],
                json.dumps(embedding)
            ))
            if (idx + 1) % 10 == 0 or idx == len(all_chunks) - 1:
                logger.info(f"Embedded and stored {idx + 1}/{len(all_chunks)} chunks.")
                
        conn.commit()
        logger.info("Ingestion completed successfully!")
        return len(all_chunks)

if __name__ == "__main__":
    count = ingest_laws(force_reingest=True)
    print(f"Ingested {count} legal chunks into SQLite.")
