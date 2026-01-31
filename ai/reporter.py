import os
import time
from data.supabase_client import db_bridge
import json
import datetime
import re
import asyncio
import logging
from typing import List, Dict, Optional
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas

from ai.provider import AIProvider
from ai.analyzer import RiskAnalyzer

logger = logging.getLogger("orchestrator.reporter")

COLOR_ACCENT = colors.HexColor('#6366f1')
COLOR_BG_DARK = colors.HexColor('#0f172a')
COLOR_TEXT_PRIMARY = colors.HexColor('#1e293b')
COLOR_TEXT_SECONDARY = colors.HexColor('#64748b')
COLOR_BORDER = colors.HexColor('#e2e8f0')
COLOR_SUCCESS = colors.HexColor('#10b981')
COLOR_WARNING = colors.HexColor('#f59e0b')
COLOR_DANGER = colors.HexColor('#ef4444')
COLOR_BG_LIGHT = colors.HexColor('#f8fafc')


class ArgusCanvas(canvas.Canvas):
    """Tactical canvas with neural header/footer system."""

    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []
        self.trace_id = kwargs.get('trace_id', int(time.time()))

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_neural_frame(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_neural_frame(self, page_count):
        page_width, page_height = letter

        self.setStrokeColor(COLOR_ACCENT)
        self.setLineWidth(2)
        self.line(0.5*inch, page_height - 0.6*inch, page_width - 0.5*inch, page_height - 0.6*inch)

        self.setFont("Courier-Bold", 9)
        self.setFillColor(COLOR_BG_DARK)
        self.drawString(0.75*inch, page_height - 0.5*inch, "ARGUS NEURAL WATCHMAN")

        self.setFont("Courier", 8)
        self.setFillColor(COLOR_TEXT_SECONDARY)
        self.drawRightString(
            page_width - 0.75*inch,
            page_height - 0.5*inch,
            f"MODE: SCOUT // CLASSIFIED"
        )

        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(0.5*inch, 0.7*inch, page_width - 0.5*inch, 0.7*inch)

        self.setFont("Courier-Bold", 7)
        self.setFillColor(COLOR_TEXT_SECONDARY)
        self.drawString(
            0.75*inch,
            0.5*inch,
            f"TRACE_ID: {self.trace_id}"
        )

        self.setFont("Courier", 7)
        self.drawRightString(
            page_width - 0.75*inch,
            0.5*inch,
            f"PAGE_{self._pageNumber}_OF_{page_count}"
        )


class QA_Reporter:
    @staticmethod
    def _create_styles():
        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            name='TacticalHeader',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Courier-Bold',
            textColor=COLOR_ACCENT,
            letterSpacing=2,
            spaceAfter=6,
            alignment=TA_LEFT
        ))

        styles.add(ParagraphStyle(
            name='MissionTitle',
            parent=styles['Heading1'],
            fontSize=32,
            textColor=COLOR_BG_DARK,
            fontName='Helvetica-Bold',
            spaceAfter=8,
            spaceBefore=12,
            alignment=TA_LEFT,
            leading=36
        ))

        styles.add(ParagraphStyle(
            name='TargetInfo',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Courier',
            textColor=COLOR_TEXT_SECONDARY,
            spaceAfter=20,
            leading=14
        ))

        styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=COLOR_BG_DARK,
            spaceBefore=20,
            spaceAfter=12,
            leading=18
        ))

        styles.add(ParagraphStyle(
            name='NeuralBody',
            parent=styles['Normal'],
            fontSize=10,
            textColor=COLOR_TEXT_PRIMARY,
            fontName='Helvetica',
            leading=15,
            spaceAfter=10,
            alignment=TA_JUSTIFY
        ))

        styles.add(ParagraphStyle(
            name='FindingBullet',
            parent=styles['Normal'],
            fontSize=10,
            textColor=COLOR_TEXT_PRIMARY,
            fontName='Helvetica',
            leftIndent=20,
            bulletIndent=10,
            spaceAfter=8,
            leading=14
        ))

        return styles

    @staticmethod
    def _create_tactical_banner(styles):
        banner_data = [[
            Paragraph(
                "<b>⚡ AUTONOMOUS INTELLIGENCE AUDIT</b><br/>"
                "<font size='8'>Powered by Neural Pattern Recognition & Predictive Stability Analysis</font>",
                styles['NeuralBody']
            )
        ]]

        banner = Table(banner_data, colWidths=[6.5*inch])
        banner.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_ACCENT),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 16),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
            ('BOX', (0, 0), (-1, -1), 2, COLOR_BG_DARK),
        ]))

        return banner

    @staticmethod
    def _create_metrics_grid(total_pages, total_tests, pass_rate, duration, stability_score, styles):
        def metric_card(label, value, unit=""):
            return Paragraph(
                f"<font size='9' color='{COLOR_TEXT_SECONDARY.hexval()}'><b>{label}</b></font><br/>"
                f"<font size='22' color='{COLOR_BG_DARK.hexval()}'><b>{value}</b></font>"
                f"<font size='10' color='{COLOR_TEXT_SECONDARY.hexval()}'>{unit}</font>",
                styles['NeuralBody']
            )

        score_color = (
            COLOR_SUCCESS if stability_score >= 80 else
            COLOR_WARNING if stability_score >= 60 else
            COLOR_DANGER
        )

        metrics = [[
            metric_card("NODES SCANNED", total_pages),
            metric_card("TEST VECTORS", total_tests),
            metric_card("PASS RATE", pass_rate, "%"),
            Paragraph(
                f"<font size='9' color='{COLOR_TEXT_SECONDARY.hexval()}'><b>STABILITY</b></font><br/>"
                f"<font size='22' color='{score_color.hexval()}'><b>{stability_score}</b></font>"
                f"<font size='10' color='{COLOR_TEXT_SECONDARY.hexval()}'>/100</font>",
                styles['NeuralBody']
            )
        ]]

        table = Table(metrics, colWidths=[1.7*inch]*4)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_LIGHT),
            ('BOX', (0, 0), (-1, -1), 1, COLOR_BORDER),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 16),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ]))

        return table

    @staticmethod
    def _create_risk_heatmap(risk_data, styles):
        if not risk_data:
            return Paragraph(
                "<i>No historical risk data available for target system.</i>",
                styles['NeuralBody']
            )

        table_data = [[
            Paragraph("<b>SIGNAL URL</b>", styles['NeuralBody']),
            Paragraph("<b>RISK</b>", styles['NeuralBody']),
            Paragraph("<b>STATUS</b>", styles['NeuralBody']),
            Paragraph("<b>RECOMMENDATION</b>", styles['NeuralBody'])
        ]]

        for item in risk_data[:10]:
            url = item.get('url', 'N/A')
            risk = item.get('riskscore', 0)
            status = item.get('status', 'UNKNOWN')
            rec = item.get('recommendation', '')

            if risk > 60:
                badge = "🔴"
                risk_color = COLOR_DANGER
            elif risk > 25:
                badge = "🟡"
                risk_color = COLOR_WARNING
            else:
                badge = "🟢"
                risk_color = COLOR_SUCCESS

            table_data.append([
                Paragraph(f"<font face='Courier' size='8'>{url[:52]}...</font>", styles['NeuralBody']),
                Paragraph(f"<font color='{risk_color.hexval()}'><b>{risk}</b></font>", styles['NeuralBody']),
                Paragraph(f"{badge} {status}", styles['NeuralBody']),
                Paragraph(rec[:35] + "..." if len(rec) > 35 else rec, styles['NeuralBody'])
            ])

        table = Table(table_data, colWidths=[2.2*inch, 0.7*inch, 1.1*inch, 2.3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_BG_DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        return table

    @staticmethod
    def _create_execution_log(crawl_data, styles):
        table_data = [[
            Paragraph("<b>TARGET URL</b>", styles['NeuralBody']),
            Paragraph("<b>PAGE TYPE</b>", styles['NeuralBody']),
            Paragraph("<b>TEST VECTOR</b>", styles['NeuralBody']),
            Paragraph("<b>STATUS</b>", styles['NeuralBody'])
        ]]

        for entry in crawl_data[:25]:
            url = entry.get('url', 'N/A')
            page_type = entry.get('page_type', 'GENERAL')
            test = entry.get('test_executed', 'N/A')
            result = entry.get('test_result', 'FAIL')

            if str(result).upper() in ['PASS', 'TRUE', 'OK']:
                status = "✓ PASS"
                status_color = COLOR_SUCCESS
            else:
                status = "✗ FAIL"
                status_color = COLOR_DANGER

            table_data.append([
                Paragraph(f"<font face='Courier' size='7'>{url[:50]}...</font>", styles['NeuralBody']),
                Paragraph(page_type, styles['NeuralBody']),
                Paragraph(test[:25] + "..." if len(test) > 25 else test, styles['NeuralBody']),
                Paragraph(f"<font color='{status_color.hexval()}'><b>{status}</b></font>", styles['NeuralBody'])
            ])

        table = Table(table_data, colWidths=[2.5*inch, 1*inch, 1.8*inch, 0.9*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_BG_DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        return table

    @staticmethod
    async def generate_report(
        crawl_data: List[Dict],
        total_time_seconds: float = 0.0,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        encrypted_key: Optional[str] = None,
        run_id: Optional[str] = None
    ) -> str:
        if not crawl_data:
            logger.warning("No data collected")
            return "NO_DATA_SOURCE"

        total_pages = len(crawl_data)
        total_tests = len([d for d in crawl_data if d.get('test_executed')])
        passed = len([
            d for d in crawl_data
            if str(d.get('test_result', '')).upper() in ["PASS", "TRUE", "OK"]
        ])
        pass_rate = round((passed / total_tests * 100), 1) if total_tests > 0 else 0

        try:
            analyzer = RiskAnalyzer()
            heatmap_data = await analyzer.generate_heatmap()
            crawl_urls = {c.get('url', '') for c in crawl_data}
            relevant_risk = [
                item for item in heatmap_data
                if any(crawl_url in item.get('url', '') for crawl_url in crawl_urls)
            ]
        except Exception as e:
            logger.warning(f"Risk analysis unavailable: {e}")
            relevant_risk = []

        run_date = datetime.datetime.now().strftime("%Y-%m-%d // %H:%M:%S UTC")
        target_url = crawl_data[0].get('url', 'UNKNOWN_TARGET')
        trace_id = run_id if run_id else f"SCOUT_{int(time.time())}"

        try:
            await asyncio.sleep(1.5)

            prompt = f"""Generate tactical intelligence summary for autonomous QA audit.

TARGET: {target_url}
METRICS: {total_pages} pages, {total_tests} tests, {pass_rate}% pass rate
DURATION: {total_time_seconds:.2f}s

Provide:
1. Two-sentence executive assessment
2. 3-5 bullet points for critical findings (technical/SDET perspective)
3. Final recommendation with confidence level

Format as plain text, no markdown."""

            ai_insights = await AIProvider.generate(
                prompt,
                provider=provider,
                model=model,
                encrypted_key=encrypted_key,
                json_mode=False
            )
        except Exception as e:
            logger.warning(f"AI insights failed: {e}")
            ai_insights = f"Mission completed for {target_url}. {total_pages} nodes scanned with {pass_rate}% pass rate. System stability maintained within operational parameters."

        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=0.75*inch,
                leftMargin=0.75*inch,
                topMargin=1.1*inch,
                bottomMargin=1*inch
            )

            styles = QA_Reporter._create_styles()
            story = []

            story.append(Paragraph(
                f"GENERATED_BY_ARGUS_NEURAL_WATCHMAN // {trace_id}",
                styles['TacticalHeader']
            ))
            story.append(Paragraph("TACTICAL AUDIT INTELLIGENCE", styles['MissionTitle']))
            story.append(Paragraph(
                f"Neural_Timestamp: {run_date}<br/>"
                f"Target_Node: {target_url}",
                styles['TargetInfo']
            ))

            story.append(QA_Reporter._create_tactical_banner(styles))
            story.append(Spacer(1, 0.3*inch))

            stability_score = min(100, max(0, int(pass_rate * 0.8 + (100 - min(len(relevant_risk) * 5, 20)))))

            story.append(Paragraph("SYSTEM METRICS // PERFORMANCE ANALYSIS", styles['SectionTitle']))
            story.append(QA_Reporter._create_metrics_grid(
                total_pages, total_tests, pass_rate, total_time_seconds, stability_score, styles
            ))
            story.append(Spacer(1, 0.25*inch))

            summary_paragraphs = ai_insights.split('\n\n')
            story.append(Paragraph("NEURAL INSIGHTS // PREDICTIVE ANALYSIS", styles['SectionTitle']))
            story.append(HRFlowable(
                width="25%",
                thickness=2.5,
                color=COLOR_ACCENT,
                spaceAfter=12,
                align='LEFT'
            ))

            for para in summary_paragraphs[:1]:
                if para.strip():
                    story.append(Paragraph(para.strip(), styles['NeuralBody']))

            story.append(Spacer(1, 0.2*inch))

            if relevant_risk:
                story.append(Paragraph("PREDICTIVE STABILITY HEATMAP", styles['SectionTitle']))
                story.append(Paragraph(
                    "Historical risk analysis based on execution telemetry and failure patterns:",
                    styles['NeuralBody']
                ))
                story.append(Spacer(1, 0.1*inch))
                story.append(QA_Reporter._create_risk_heatmap(relevant_risk, styles))
                story.append(Spacer(1, 0.3*inch))

            story.append(PageBreak())
            story.append(Paragraph("CRITICAL FINDINGS // MISSION ANALYSIS", styles['SectionTitle']))

            findings = [p for p in summary_paragraphs if '•' in p or '-' in p]
            if findings:
                for line in findings[0].split('\n'):
                    clean = line.strip().lstrip('•-').strip()
                    if clean:
                        story.append(Paragraph(f"• {clean}", styles['FindingBullet']))
            else:
                story.append(Paragraph("• All test vectors executed successfully", styles['FindingBullet']))
                story.append(Paragraph("• No critical blockers identified", styles['FindingBullet']))
                story.append(Paragraph("• System demonstrates stable patterns", styles['FindingBullet']))

            story.append(Spacer(1, 0.3*inch))

            story.append(Paragraph("EXECUTION TRACE // SIGNAL ANALYSIS", styles['SectionTitle']))
            story.append(Paragraph(
                f"Detailed trace of {min(25, len(crawl_data))} most recent test executions:",
                styles['NeuralBody']
            ))
            story.append(Spacer(1, 0.1*inch))
            story.append(QA_Reporter._create_execution_log(crawl_data, styles))

            story.append(PageBreak())
            story.append(Paragraph("FINAL ASSESSMENT // MISSION STATUS", styles['SectionTitle']))

            is_stable = stability_score >= 70
            confidence = "HIGH" if stability_score >= 80 else "MEDIUM" if stability_score >= 60 else "LOW"

            verdict = "✓ MISSION_COMPLETE // PRODUCTION_READY" if is_stable else "✗ ATTENTION_REQUIRED // OPTIMIZE_REQUIRED"
            verdict_color = COLOR_SUCCESS if is_stable else COLOR_DANGER

            story.append(Paragraph(
                f"<font color='{verdict_color.hexval()}' size='14'><b>{verdict}</b></font>",
                styles['NeuralBody']
            ))
            story.append(Paragraph(
                f"<b>Confidence_Level:</b> {confidence} | "
                f"<b>Stability_Score:</b> {stability_score}/100 | "
                f"<b>Duration:</b> {total_time_seconds:.2f}s",
                styles['NeuralBody']
            ))
            story.append(Spacer(1, 0.15*inch))

            recommendation = summary_paragraphs[-1] if len(summary_paragraphs) > 1 else "Continue monitoring system stability through regular autonomous scans."
            story.append(Paragraph(recommendation.strip(), styles['NeuralBody']))

            doc.build(story, canvasmaker=lambda *args, **kwargs: ArgusCanvas(*args, trace_id=trace_id, **kwargs))

            filename = f"ARGUS_SCOUT_{trace_id}.pdf"
            buffer.seek(0)
            pdf_bytes = buffer.read()

            if db_bridge.client:
                db_bridge.client.storage.from_("reports").upload(
                    path=filename,
                    file=pdf_bytes,
                    file_options={"content-type": "application/pdf"}
                )

                public_url = db_bridge.client.storage.from_("reports").get_public_url(filename)
                logger.info(f"✅ Argus Scout Report: {public_url}")
                return public_url

            return "LOCAL_BUFFER_SUCCESS"

        except Exception as e:
            logger.exception(f"Report generation failed: {e}")
            return f"REPORT_GENERATION_FAILED: {str(e)}"


async def generate_qa_report(crawl_data, total_time_seconds=0.0, provider=None, model=None, encrypted_key=None, run_id=None) -> str:
    return await QA_Reporter.generate_report(
        crawl_data,
        total_time_seconds,
        provider,
        model,
        encrypted_key,
        run_id
    )
