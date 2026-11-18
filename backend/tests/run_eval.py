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
    print("       NYAYASATHI LEGAL ACCURACY & GROUNDING EVALUATION")
    print(f"       Total Benchmark Questions: {len(questions)}")
    print("=" * 80)
    print(f"{'ID':<12} | {'Category':<15} | {'Retrieval':<9} | {'Answer':<8} | {'Expected in Answer / Verdict'}")
    print("-" * 80)

    retrieval_passed = 0
    answer_passed = 0
    results_by_cat = {}
    failures = []

    for item in questions:
        qid = item["id"]
        cat = item["category"]
        q = item["question"]
        expected = item["expected_sections"]
        mode = item.get("mode", "grounded")

        # --- Retrieval check
        chunks = rag_service.retrieve_top_chunks(q, top_k=5)
        retrieved_text = " ".join([f"{c['act_name']} {c['section_number']} {c['title']} {c['content']}" for c in chunks]).lower()

        # --- Answer check (the real thing the citizen sees)
        answer, citations = rag_service.answer_query(q, requested_language=item.get("language", "en"))
        answer_lower = answer.lower()

        if mode == "refuse":
            retrieval_ok = len(chunks) == 0
            answer_ok = len(citations) == 0 and len(answer.strip()) > 10
        else:
            matched_expected = [exp for exp in expected if exp.lower() in retrieved_text]
            retrieval_ok = len(matched_expected) > 0
            matched_in_answer = [exp for exp in expected if exp.lower() in answer_lower]
            answer_ok = len(citations) > 0 and len(matched_in_answer) > 0

        if retrieval_ok:
            retrieval_passed += 1
        if answer_ok:
            answer_passed += 1

        if not (retrieval_ok and answer_ok):
            failures.append(qid)

        results_by_cat.setdefault(cat, {"total": 0, "passed": 0})
        results_by_cat[cat]["total"] += 1
        if retrieval_ok and answer_ok:
            results_by_cat[cat]["passed"] += 1

        if mode == "refuse":
            detail = f"refused: {len(citations) == 0}"
        else:
            detail = f"found: {', '.join([e for e in expected if e.lower() in answer_lower]) or 'None'}"
        status_r = "PASS" if retrieval_ok else "FAIL"
        status_a = "PASS" if answer_ok else "FAIL"
        print(f"{qid:<12} | {cat:<15} | {status_r:<9} | {status_a:<8} | {detail}")

    total = len(questions)
    print("=" * 80)
    print(f"RETRIEVAL ACCURACY : {retrieval_passed}/{total} ({retrieval_passed / total * 100:.1f}%)")
    print(f"ANSWER ACCURACY    : {answer_passed}/{total} ({answer_passed / total * 100:.1f}%)")
    print("-" * 80)
    for cat, data in results_by_cat.items():
        cat_acc = (data["passed"] / data["total"]) * 100.0
        print(f"Category '{cat}': {data['passed']}/{data['total']} ({cat_acc:.1f}%)")
    print("=" * 80)

    if failures:
        print("Failures:", ", ".join(failures))

    passed = answer_passed
    if passed < total * 0.9:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    run_evaluation()
