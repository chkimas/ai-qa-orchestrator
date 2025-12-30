import json
import datetime
import re
from ai.provider import generate_response

def generate_report(crawl_data: list, total_time_seconds: float = 0.0):
    # 1. Calculate Metrics
    total_pages = len(crawl_data)
    total_tests = len([d for d in crawl_data if d.get('test_executed')])
    passed = len([d for d in crawl_data if "PASS" in str(d.get('test_result', ''))])
    failed = total_tests - passed
    pass_rate = round((passed / total_tests * 100), 1) if total_tests > 0 else 0

    # 2. Build Principal SDET Prompt
    run_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    prompt = f"""
    You are a Principal SDET. Generate a high-level Executive QA Report.

    ### DATA SUMMARY
    - Target: {crawl_data[0]['url'] if crawl_data else 'N/A'}
    - Metrics: {total_pages} pages, {total_tests} tests, {pass_rate}% Pass Rate.
    - Duration: {total_time_seconds:.2f}s
    - Details: {json.dumps(crawl_data)}

    ### REQUIRED MARKDOWN STRUCTURE:
    1. # 🛡️ Executive QA Audit (Include Run Date: {run_date})
    2. ## 📊 Key Metrics (Table format: Pages, Tests, Pass Rate, Duration)
    3. ## 🔍 Critical Findings (Bullet points: What are the main blockers? Mention page types.)
    4. ## 🧪 Test Execution Log (Table: URL, Page Type, Test Case, Status)
    5. ## ⚠️ Risk Assessment (Principal-level insight: Is this site stable for production?)
    """

    # 3. Generate and Save
    report_content = generate_response(prompt)

    # Clean filename logic
    target_url = crawl_data[0]['url'] if crawl_data else "unknown"
    domain = re.sub(r'https?://(www\.)?', '', target_url).split('/')[0].replace('.', '_')
    filename = f"QA_REPORT_{domain}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    with open(filename, "w", encoding="utf-8") as f:
        f.write(report_content)

    return filename
