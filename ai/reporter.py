import json
import datetime
import re
from ai.provider import generate_response
from ai.analyzer import RiskAnalyzer

def generate_report(crawl_data: list, total_time_seconds: float = 0.0):
    total_pages = len(crawl_data)
    total_tests = len([d for d in crawl_data if d.get('test_executed')])
    passed = len([d for d in crawl_data if "PASS" in str(d.get('test_result', ''))])
    failed = total_tests - passed
    pass_rate = round((passed / total_tests * 100), 1) if total_tests > 0 else 0

    try:
        analyzer = RiskAnalyzer()
        heatmap_data = analyzer.generate_heatmap()
        # Filter heatmap to only include URLs related to this specific crawl for relevance
        relevant_risk = [item for item in heatmap_data if any(c['url'] in item['url'] for c in crawl_data)]
    except:
        relevant_risk = []

    run_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    prompt = f"""
    You are a Principal SDET Architect. Generate a high-level Executive QA Audit.

    ### DATA SUMMARY
    - Target: {crawl_data[0]['url'] if crawl_data else 'N/A'}
    - Metrics: {total_pages} pages, {total_tests} tests, {pass_rate}% Pass Rate.
    - Duration: {total_time_seconds:.2f}s
    - Historical Risk Intelligence: {json.dumps(relevant_risk[:5])}
    - Execution Details: {json.dumps(crawl_data)}

    ### REQUIRED MARKDOWN STRUCTURE:
    1. # 🛡️ Executive QA Audit ({run_date})
    2. ## 📊 Key Metrics
       (Markdown Table: Pages, Tests, Pass Rate, Duration)
    3. ## 🌡️ Predictive Stability Heatmap
       (List the top risky URLs from Historical Intelligence. Explain WHY they are brittle based on failure/heal rates.)
    4. ## 🔍 Critical Findings
       (Bullet points: Identify blockers, bot-walls, or UI inconsistencies found in this specific run.)
    5. ## 🧪 Execution Log
       (Markdown Table: URL, Page Type, Test Case, Status)
    6. ## ⚠️ Final Risk Assessment
       (Principal-level insight: Is the build stable for Production? Be authoritative.)
    """

    report_content = generate_response(prompt)

    target_url = crawl_data[0]['url'] if crawl_data else "unknown"
    domain = re.sub(r'https?://(www\.)?', '', target_url).split('/')[0].replace('.', '_')
    filename = f"QA_REPORT_{domain}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    with open(filename, "w", encoding="utf-8") as f:
        f.write(report_content)

    return filename
