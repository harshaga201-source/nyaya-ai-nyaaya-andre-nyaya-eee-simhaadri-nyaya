import json
import logging
import sys
from pathlib import Path
from backend.services.rag_service import rag_service
from backend.models.database import init_db

# Configure minimal stdout logging
logging.basicConfig(level=logging.ERROR)

def run_evaluation():
    init_db()
    test_file = Path(__file__).resolve().parent / "eval_questions.json"
    if not test_file.exists():
        print(f"Error: Eval file not found at {test_file}")
        sys.exit(1)
        
    with open(test_file, "r", encoding="utf-8") as f:
        questions = json.load(f)
        
    print("=" * 80)
    print("       NYAYASATHI LEGAL RETRIEVAL & CITATION ACCURACY EVALUATION")
    print(f"       Total Benchmark Questions: {len(questions)}")
    print("=" * 80)
    print(f"{'ID':<12} | {'Category':<15} | {'Status':<8} | {'Expected':<12} | {'Found in Sources'}")
    print("-" * 80)
    
    passed_count = 0
    results_by_cat = {}
    
    for item in questions:
        qid = item["id"]
        cat = item["category"]
        q = item["question"]
        expected = item["expected_sections"]
        
        # Retrieve top 5 chunks
        chunks = rag_service.retrieve_top_chunks(q, top_k=5)
        retrieved_text = " ".join([f"{c['act_name']} {c['section_number']} {c['title']} {c['content']}" for c in chunks])
        
        # Check if any expected section exists in retrieved text
        matched_expected = [exp for exp in expected if exp.lower() in retrieved_text.lower()]
        is_pass = len(matched_expected) > 0
        
        if is_pass:
            passed_count += 1
            status = "PASS"
        else:
            status = "FAIL"
            
        results_by_cat.setdefault(cat, {"total": 0, "passed": 0})
        results_by_cat[cat]["total"] += 1
        if is_pass:
            results_by_cat[cat]["passed"] += 1
            
        found_repr = ", ".join(matched_expected) if matched_expected else "None"
        exp_repr = ", ".join(expected)
        print(f"{qid:<12} | {cat:<15} | {status:<8} | {exp_repr:<12} | {found_repr}")

    print("=" * 80)
    accuracy = (passed_count / len(questions)) * 100.0
    print(f"OVERALL EVALUATION SCORE: {passed_count}/{len(questions)} ({accuracy:.1f}%)")
    print("-" * 80)
    for cat, data in results_by_cat.items():
        cat_acc = (data["passed"] / data["total"]) * 100.0
        print(f"Category '{cat}': {data['passed']}/{data['total']} ({cat_acc:.1f}%)")
    print("=" * 80)
    
    return passed_count, len(questions)

if __name__ == "__main__":
    passed, total = run_evaluation()
    if passed < total * 0.9:
        sys.exit(1)
    sys.exit(0)
