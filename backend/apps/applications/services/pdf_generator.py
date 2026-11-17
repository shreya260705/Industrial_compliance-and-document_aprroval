"""
PDF Acknowledgement Generator Service.
Generates a BizPermit Submission Acknowledgement using ReportLab.
Includes document integrity checksum (SHA-256) and prominent SIH26130 prototype disclaimer.
"""

import io
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

DEEP_SAGE = colors.HexColor("#344B3F")
SAGE_GREEN = colors.HexColor("#87A96B")
WALNUT = colors.HexColor("#5A3E2B")
AMBER_GLOW = colors.HexColor("#D5851F")
CHARCOAL = colors.HexColor("#303A34")
PALE_SAGE = colors.HexColor("#E7EDE2")
WARM_CREAM = colors.HexColor("#F5F1E8")


class ApplicationPdfService:
    @staticmethod
    def generate_acknowledgement_pdf(
        application: Dict[str, Any],
        business: Dict[str, Any],
        location: Dict[str, Any]
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom Brand Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=15,
            textColor=DEEP_SAGE,
            alignment=TA_CENTER,
            spaceAfter=2
        )
        subtitle_style = ParagraphStyle(
            'DocSub',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            textColor=WALNUT,
            alignment=TA_CENTER,
            spaceAfter=6
        )
        prototype_banner_style = ParagraphStyle(
            'ProtoBanner',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7.5,
            textColor=colors.HexColor("#991B1B"),
            alignment=TA_CENTER,
            spaceAfter=8
        )
        section_heading = ParagraphStyle(
            'SectionHead',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=DEEP_SAGE,
            spaceBefore=6,
            spaceAfter=3
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=9.5,
            textColor=CHARCOAL
        )
        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=6.5,
            leading=8.5,
            textColor=colors.HexColor("#4A5568")
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("BIZPERMIT", title_style))
        story.append(Paragraph("ONE NATION. ONE INDUSTRIAL COMPLIANCE WORKSPACE (SIH26130 PROTOTYPE)", subtitle_style))
        story.append(Paragraph(
            "<b>[ PROTOTYPE SUBMISSION ACKNOWLEDGEMENT — NOT AN OFFICIAL GOVERNMENT RECEIPT, LICENCE OR APPROVAL ]</b>",
            prototype_banner_style
        ))
        story.append(HRFlowable(width="100%", thickness=1.5, color=DEEP_SAGE, spaceBefore=0, spaceAfter=6))

        # 2. Document Title & Reference
        story.append(Paragraph(
            "<b>BIZPERMIT SUBMISSION ACKNOWLEDGEMENT</b>",
            ParagraphStyle('AckTitle', parent=title_style, fontSize=11, textColor=CHARCOAL, spaceAfter=4)
        ))

        app_num = application.get("application_number", "BP-PENDING")
        sub_time = application.get("submitted_at")
        sub_time_str = sub_time.strftime("%d-%b-%Y %H:%M:%S UTC") if isinstance(sub_time, datetime) else "DRAFT STAGE"

        ref_table_data = [
            [
                Paragraph("<b>Acknowledgement Ref No:</b>", body_style),
                Paragraph(f"<font color='#344B3F'><b>{app_num}</b></font>", body_bold),
                Paragraph("<b>Internal Workflow Status:</b>", body_style),
                Paragraph(f"<b>{application.get('status', 'DRAFT')} (Prototype Workflow)</b>", body_bold),
            ],
            [
                Paragraph("<b>Submission Timestamp:</b>", body_style),
                Paragraph(sub_time_str, body_style),
                Paragraph("<b>Indicative Charter SLA:</b>", body_style),
                Paragraph(f"{application.get('standard_sla_days', 30)} Business Days (Citizen Charter)", body_style),
            ]
        ]
        ref_table = Table(ref_table_data, colWidths=[130, 150, 110, 132])
        ref_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PALE_SAGE),
            ('BOX', (0, 0), (-1, -1), 0.5, SAGE_GREEN),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(ref_table)
        story.append(Spacer(1, 6))

        # 3. Enterprise & Location Details
        story.append(Paragraph("1. Enterprise & Manufacturing Facility Details", section_heading))
        addr = location.get("address", {})
        addr_str = f"{addr.get('line1', '')}, {addr.get('city', '')}, {addr.get('district', '')}, {addr.get('state_code', '')} - {addr.get('pincode', '')}"

        ent_table_data = [
            [
                Paragraph("<b>Enterprise Legal Name:</b>", body_style),
                Paragraph(business.get("legal_name", "N/A"), body_bold),
                Paragraph("<b>Permanent Account No (PAN):</b>", body_style),
                Paragraph(business.get("pan", "N/A"), body_bold),
            ],
            [
                Paragraph("<b>Entity Structure:</b>", body_style),
                Paragraph(business.get("entity_type", "N/A"), body_style),
                Paragraph("<b>GSTIN / CIN:</b>", body_style),
                Paragraph(business.get("gstin") or business.get("cin") or "N/A", body_style),
            ],
            [
                Paragraph("<b>Manufacturing Unit / Plant:</b>", body_style),
                Paragraph(location.get("location_name", "N/A"), body_bold),
                Paragraph("<b>Pollution Category:</b>", body_style),
                Paragraph(location.get("industrial_profile", {}).get("pollution_category", "N/A"), body_style),
            ],
            [
                Paragraph("<b>Facility Siting Address:</b>", body_style),
                Paragraph(addr_str, body_style),
                Paragraph("<b>Jurisdiction Hierarchy:</b>", body_style),
                Paragraph(f"{application.get('state_code', 'IN')} / {application.get('department_code', 'DEPT')}", body_style),
            ],
        ]
        ent_table = Table(ent_table_data, colWidths=[130, 150, 120, 122])
        ent_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#F1F5F9")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(ent_table)
        story.append(Spacer(1, 6))

        # 4. Approval Clearance Scope
        story.append(Paragraph("2. Clearance Scope & Indicative Department Reference", section_heading))
        clearance_data = [
            [
                Paragraph("<b>Clearance Title (Catalogue):</b>", body_style),
                Paragraph(application.get("approval_title", "N/A"), body_bold),
                Paragraph("<b>Catalogue Code:</b>", body_style),
                Paragraph(application.get("approval_code", "N/A"), body_bold),
            ],
            [
                Paragraph("<b>Regulatory Authority:</b>", body_style),
                Paragraph(application.get("department_code", "N/A"), body_style),
                Paragraph("<b>Government Tier:</b>", body_style),
                Paragraph(application.get("tier", "STATE"), body_style),
            ],
            [
                Paragraph("<b>Governing Statutory Act:</b>", body_style),
                Paragraph(application.get("statutory_act", "State Industrial Regulations"), body_style),
                Paragraph("<b>Industrial Project Stage:</b>", body_style),
                Paragraph(application.get("stage", "PRE_ESTABLISHMENT"), body_style),
            ]
        ]
        clearance_table = Table(clearance_data, colWidths=[130, 150, 120, 122])
        clearance_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#F1F5F9")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(clearance_table)
        story.append(Spacer(1, 6))

        # 5. Attached Vault Documents
        story.append(Paragraph("3. Attached Vault Dossiers & Integrity Checksums", section_heading))
        attachments = application.get("attached_documents", [])
        if attachments:
            att_headers = [
                Paragraph("<b>Document Title / Category</b>", body_bold),
                Paragraph("<b>Original Filename</b>", body_bold),
                Paragraph("<b>SHA-256 Integrity Checksum</b>", body_bold)
            ]
            att_rows = [att_headers]
            for att in attachments:
                sha_disp = (att.get("sha256_checksum") or "N/A")[:24] + "..."
                att_rows.append([
                    Paragraph(f"{att.get('document_name', 'Doc')}<br/><font color='#5A3E2B'>{att.get('document_category', '')}</font>", body_style),
                    Paragraph(att.get("original_filename", "file.pdf"), body_style),
                    Paragraph(f"<font face='Courier' size='6.5'>{sha_disp}</font>", body_style),
                ])
            att_table = Table(att_rows, colWidths=[180, 150, 192])
            att_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(att_table)
        else:
            story.append(Paragraph("<i>No vault documents attached to this dossier yet.</i>", body_style))

        story.append(Spacer(1, 8))

        # 6. Verification Hash Digest (Document Integrity Checksum)
        content_for_hash = f"{app_num}|{business.get('pan')}|{location.get('location_name')}|{application.get('approval_code')}|{sub_time_str}"
        doc_digest = hashlib.sha256(content_for_hash.encode('utf-8')).hexdigest()

        hash_box_data = [
            [
                Paragraph("<b>Document Integrity Verification Hash (SHA-256):</b>", body_bold),
                Paragraph(f"<font face='Courier' size='6.5'>{doc_digest}</font><br/><font size='6' color='#64748B'>* Integrity checksum verifying dossier immutability; not a digital signature or government attestation.</font>", body_style)
            ]
        ]
        hash_table = Table(hash_box_data, colWidths=[170, 352])
        hash_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(hash_table)
        story.append(Spacer(1, 8))

        # 7. Regulatory Disclaimer (Mandatory)
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceBefore=0, spaceAfter=4))
        disclaimer_text = (
            "<b>IMPORTANT REGULATORY NOTICE & SIH26130 PROTOTYPE DISCLAIMER:</b> "
            "This document is an electronic acknowledgement generated by the BizPermit Prototype Compliance Platform "
            "(Smart India Hackathon Problem Statement SIH26130). "
            "It confirms the recording of an application filing within the BizPermit prototype workflow. "
            "This document is strictly an academic/hackathon prototype demonstration and is NOT an official government receipt, licence, consent, NOC, or legal approval. "
            "BizPermit is not a government agency and does not issue legally binding government approvals. "
            "All statutory clearances must be formally sought and obtained directly from the respective State or Central regulatory departments via their official portals. "
            "The SHA-256 verification hash serves exclusively as an application data integrity checksum and is not a digital signature or government attestation."
        )
        story.append(Paragraph(disclaimer_text, disclaimer_style))

        # Build PDF
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
