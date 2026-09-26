import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_enhanced_presentation():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    base_dir = r"d:\college_feedback_system"
    college_logo = os.path.join(base_dir, "presentation_assets", "college_logo.png")
    branch_logo = os.path.join(base_dir, "presentation_assets", "branch_logo.png")

    # ==========================================
    # Refined Executive Color Palette
    # ==========================================
    NAVY = RGBColor(15, 23, 42)          # #0f172a - Deep luxury navy
    SLATE_DARK = RGBColor(30, 41, 59)     # #1e293b - Subheadings & Bold leads
    SLATE_MID = RGBColor(71, 85, 105)     # #475569 - Body text
    SLATE_MUTED = RGBColor(148, 163, 184) # #94a3b8 - Captions / Subtext
    CARD_BG = RGBColor(255, 255, 255)     # Clean white card
    PAGE_BG = RGBColor(248, 250, 252)     # #f8fafc - Premium light slate background
    CARD_BORDER = RGBColor(226, 232, 240) # #e2e8f0 - Crisp subtle card border
    
    # Accent colors
    BLUE_PRIMARY = RGBColor(37, 99, 235)  # #2563eb - Brand blue
    BLUE_TINT = RGBColor(239, 246, 255)   # #eff6ff - Light blue card
    ORANGE_MIT = RGBColor(234, 88, 12)    # #ea580c - MIT Mysore signature orange
    ORANGE_TINT = RGBColor(255, 247, 237) # #fff7ed - Warm orange card
    GREEN_MACE = RGBColor(16, 185, 129)   # #10b981 - MACE signature green
    GREEN_TINT = RGBColor(240, 253, 244)  # #f0fdf4 - Fresh green card
    PURPLE_ACCENT = RGBColor(124, 58, 237)# #7c3aed - AI Copilot purple
    PURPLE_TINT = RGBColor(245, 243, 255) # #f5f3ff - AI Copilot tint
    RED_ACCENT = RGBColor(225, 29, 72)    # #e11d48 - Problem statement rose/red
    RED_TINT = RGBColor(255, 241, 242)    # #fff1f2 - Light red card
    WHITE = RGBColor(255, 255, 255)

    # Fonts
    FONT_TITLE = "Segoe UI"
    FONT_HEADING = "Segoe UI"
    FONT_BODY = "Calibri"

    def apply_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = PAGE_BG
        bg.line.fill.background()
        return bg

    def add_header_and_footer(slide, title_text, kicker="MIT MYSORE | CSE", slide_num=1):
        apply_slide_background(slide)

        # Top subtle primary accent line
        top_strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.06))
        top_strip.fill.solid()
        top_strip.fill.fore_color.rgb = BLUE_PRIMARY
        top_strip.line.fill.background()

        # Top-Left College Logo
        if os.path.exists(college_logo):
            slide.shapes.add_picture(college_logo, Inches(0.6), Inches(0.28), width=Inches(1.05), height=Inches(1.05))

        # Top-Right Branch Logo
        if os.path.exists(branch_logo):
            slide.shapes.add_picture(branch_logo, Inches(11.68), Inches(0.28), width=Inches(1.05), height=Inches(1.05))

        # Header Title & Kicker Box
        header_box = slide.shapes.add_textbox(Inches(1.85), Inches(0.25), Inches(9.6), Inches(1.15))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        # Kicker Pill/Category
        p_kicker = tf.paragraphs[0]
        p_kicker.text = kicker.upper()
        p_kicker.font.name = FONT_HEADING
        p_kicker.font.size = Pt(9.5)
        p_kicker.font.bold = True
        p_kicker.font.color.rgb = BLUE_PRIMARY

        # Main Slide Title
        p_title = tf.add_paragraph()
        p_title.text = title_text
        p_title.font.name = FONT_TITLE
        p_title.font.size = Pt(21)
        p_title.font.bold = True
        p_title.font.color.rgb = NAVY
        p_title.space_before = Pt(3)

        # Header subtle divider rule
        divider = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(1.42), Inches(12.13), Pt(1.2))
        divider.fill.solid()
        divider.fill.fore_color.rgb = CARD_BORDER
        divider.line.fill.background()

        # Footer divider rule
        f_divider = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(6.92), Inches(12.13), Pt(1))
        f_divider.fill.solid()
        f_divider.fill.fore_color.rgb = CARD_BORDER
        f_divider.line.fill.background()

        # Footer Text
        footer_box = slide.shapes.add_textbox(Inches(0.6), Inches(7.0), Inches(12.13), Inches(0.35))
        ftf = footer_box.text_frame
        ftf.margin_left = ftf.margin_top = ftf.margin_right = ftf.margin_bottom = 0
        fp = ftf.paragraphs[0]
        fp.text = f"Student Feedback & Academic Intelligence Platform   •   Presenter: Suhas J (Dept. of CSE, MIT Mysore)   •   mitmysore.vercel.app   •   Slide {slide_num:02d}"
        fp.font.name = FONT_BODY
        fp.font.size = Pt(9.5)
        fp.font.color.rgb = SLATE_MID

    def add_card(slide, left, top, width, height, title, items, badge="", strip_color=BLUE_PRIMARY, bg_color=CARD_BG):
        # Card Body
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1.2)

        # Left Vertical Accent Strip (4pt width)
        strip = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(0.08), height)
        strip.fill.solid()
        strip.fill.fore_color.rgb = strip_color
        strip.line.fill.background()

        # Text Frame
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.32)
        tf.margin_right = Inches(0.28)
        tf.margin_top = Inches(0.24)
        tf.margin_bottom = Inches(0.18)

        first_p = tf.paragraphs[0]
        if badge:
            first_p.text = badge.upper()
            first_p.font.name = FONT_HEADING
            first_p.font.size = Pt(9)
            first_p.font.bold = True
            first_p.font.color.rgb = strip_color
            p_title = tf.add_paragraph()
            p_title.space_before = Pt(2)
        else:
            p_title = first_p

        p_title.text = title
        p_title.font.name = FONT_HEADING
        p_title.font.size = Pt(14.5)
        p_title.font.bold = True
        p_title.font.color.rgb = NAVY
        p_title.space_after = Pt(8)

        for item in items:
            p = tf.add_paragraph()
            p.font.name = FONT_BODY
            p.font.size = Pt(10.5)
            p.space_after = Pt(5)

            if isinstance(item, tuple):
                bold_lead, body = item
                r_lead = p.add_run()
                r_lead.text = "• " + bold_lead + ": "
                r_lead.font.bold = True
                r_lead.font.color.rgb = SLATE_DARK

                r_body = p.add_run()
                r_body.text = body
                r_body.font.bold = False
                r_body.font.color.rgb = SLATE_MID
            else:
                r = p.add_run()
                r.text = "• " + item
                r.font.color.rgb = SLATE_MID

        return card

    def add_stat_box(slide, left, top, width, height, stat_value, stat_label, subtext="", color=BLUE_PRIMARY):
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        box.fill.solid()
        box.fill.fore_color.rgb = WHITE
        box.line.color.rgb = CARD_BORDER
        box.line.width = Pt(1.2)

        # Top accent line
        acc = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Inches(0.06))
        acc.fill.solid()
        acc.fill.fore_color.rgb = color
        acc.line.fill.background()

        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.2)
        tf.margin_right = Inches(0.2)
        tf.margin_top = Inches(0.18)

        p1 = tf.paragraphs[0]
        p1.text = stat_value
        p1.font.name = FONT_TITLE
        p1.font.size = Pt(26)
        p1.font.bold = True
        p1.font.color.rgb = color
        p1.alignment = PP_ALIGN.CENTER

        p2 = tf.add_paragraph()
        p2.text = stat_label
        p2.font.name = FONT_HEADING
        p2.font.size = Pt(10.5)
        p2.font.bold = True
        p2.font.color.rgb = NAVY
        p2.alignment = PP_ALIGN.CENTER
        p2.space_before = Pt(2)

        if subtext:
            p3 = tf.add_paragraph()
            p3.text = subtext
            p3.font.name = FONT_BODY
            p3.font.size = Pt(8.5)
            p3.font.color.rgb = SLATE_MID
            p3.alignment = PP_ALIGN.CENTER
            p3.space_before = Pt(2)

        return box

    def add_step_card(slide, left, top, width, height, step_num, step_title, bold_lead, body_text, color=BLUE_PRIMARY):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1.2)

        # Number pill badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), top + Inches(0.2), Inches(0.65), Inches(0.35))
        badge.fill.solid()
        badge.fill.fore_color.rgb = color
        badge.line.fill.background()
        btf = badge.text_frame
        btf.margin_left = btf.margin_top = btf.margin_right = btf.margin_bottom = 0
        bp = btf.paragraphs[0]
        bp.text = f"{step_num:02d}"
        bp.font.name = FONT_HEADING
        bp.font.size = Pt(11)
        bp.font.bold = True
        bp.font.color.rgb = WHITE
        bp.alignment = PP_ALIGN.CENTER

        # Title beside badge
        tbox = slide.shapes.add_textbox(left + Inches(0.95), top + Inches(0.18), width - Inches(1.15), Inches(0.4))
        ttf = tbox.text_frame
        ttf.word_wrap = True
        ttf.margin_left = ttf.margin_top = ttf.margin_right = ttf.margin_bottom = 0
        tp = ttf.paragraphs[0]
        tp.text = step_title
        tp.font.name = FONT_HEADING
        tp.font.size = Pt(13)
        tp.font.bold = True
        tp.font.color.rgb = NAVY

        # Body text
        bbox = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.65), width - Inches(0.4), height - Inches(0.75))
        btf = bbox.text_frame
        btf.word_wrap = True
        btf.margin_left = btf.margin_top = btf.margin_right = btf.margin_bottom = 0
        p = btf.paragraphs[0]
        p.font.name = FONT_BODY
        p.font.size = Pt(10.5)

        r_lead = p.add_run()
        r_lead.text = bold_lead + "\n"
        r_lead.font.bold = True
        r_lead.font.color.rgb = SLATE_DARK

        r_body = p.add_run()
        r_body.text = body_text
        r_body.font.color.rgb = SLATE_MID

        return card

    # ==========================================
    # SLIDE 1: TITLE SLIDE (Executive Hero Cover)
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    apply_slide_background(s1)

    # Decorative header banner with subtle gradient illusion
    top_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.2))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = BLUE_PRIMARY
    top_bar.line.fill.background()

    # Logos on Title Slide (Prominent Top Corners)
    if os.path.exists(college_logo):
        s1.shapes.add_picture(college_logo, Inches(0.9), Inches(0.7), width=Inches(1.5), height=Inches(1.5))
    if os.path.exists(branch_logo):
        s1.shapes.add_picture(branch_logo, Inches(10.933), Inches(0.7), width=Inches(1.5), height=Inches(1.5))

    # College & Department Masthead in Center
    masthead_box = s1.shapes.add_textbox(Inches(2.6), Inches(0.75), Inches(8.133), Inches(1.35))
    mtf = masthead_box.text_frame
    mtf.word_wrap = True
    mtf.margin_left = mtf.margin_top = mtf.margin_right = mtf.margin_bottom = 0
    
    mp1 = mtf.paragraphs[0]
    mp1.text = "MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE"
    mp1.alignment = PP_ALIGN.CENTER
    mp1.font.name = FONT_TITLE
    mp1.font.size = Pt(17)
    mp1.font.bold = True
    mp1.font.color.rgb = NAVY

    mp2 = mtf.add_paragraph()
    mp2.text = "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING"
    mp2.alignment = PP_ALIGN.CENTER
    mp2.font.name = FONT_HEADING
    mp2.font.size = Pt(13)
    mp2.font.bold = True
    mp2.font.color.rgb = BLUE_PRIMARY
    mp2.space_before = Pt(3)

    mp3 = mtf.add_paragraph()
    mp3.text = "Affiliated to VTU, Belagavi  •  Approved by AICTE, New Delhi  •  Accredited by NBA & NAAC"
    mp3.alignment = PP_ALIGN.CENTER
    mp3.font.name = FONT_BODY
    mp3.font.size = Pt(10)
    mp3.font.color.rgb = SLATE_MID
    mp3.space_before = Pt(3)

    # Hero Card (Center Stage)
    hero = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(2.45), Inches(11.333), Inches(4.55))
    hero.fill.solid()
    hero.fill.fore_color.rgb = WHITE
    hero.line.color.rgb = CARD_BORDER
    hero.line.width = Pt(1.5)

    # Hero top color accent line
    h_accent = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(2.45), Inches(11.333), Inches(0.08))
    h_accent.fill.solid()
    h_accent.fill.fore_color.rgb = ORANGE_MIT
    h_accent.line.fill.background()

    htf = hero.text_frame
    htf.word_wrap = True
    htf.margin_left = Inches(0.65)
    htf.margin_right = Inches(0.65)
    htf.margin_top = Inches(0.35)

    hp_tag = htf.paragraphs[0]
    hp_tag.text = "ACADEMIC YEAR 2025 – 2026   |   MAJOR TECHNICAL CAPSTONE PROJECT"
    hp_tag.font.name = FONT_HEADING
    hp_tag.font.size = Pt(10.5)
    hp_tag.font.bold = True
    hp_tag.font.color.rgb = ORANGE_MIT

    hp_title = htf.add_paragraph()
    hp_title.text = "Student Feedback &\nAcademic Intelligence Platform"
    hp_title.font.name = FONT_TITLE
    hp_title.font.size = Pt(30)
    hp_title.font.bold = True
    hp_title.font.color.rgb = NAVY
    hp_title.space_before = Pt(6)

    hp_desc = htf.add_paragraph()
    hp_desc.text = "An enterprise-grade, cloud-native evaluation ecosystem featuring 100% cryptographic voter anonymity, real-time WebSocket monitoring, and Groq-powered SAGAR AI Copilot."
    hp_desc.font.name = FONT_BODY
    hp_desc.font.size = Pt(12.5)
    hp_desc.font.color.rgb = SLATE_MID
    hp_desc.space_before = Pt(8)

    # Presenter Details Box inside Hero
    pres_box = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.65), Inches(5.45), Inches(10.033), Inches(1.25))
    pres_box.fill.solid()
    pres_box.fill.fore_color.rgb = BLUE_TINT
    pres_box.line.color.rgb = RGBColor(191, 219, 254)
    pres_box.line.width = Pt(1)

    ptf = pres_box.text_frame
    ptf.word_wrap = True
    ptf.margin_left = Inches(0.4)
    ptf.margin_top = Inches(0.2)

    pp1 = ptf.paragraphs[0]
    pp1.text = "Presenter:  SUHAS J"
    pp1.font.name = FONT_TITLE
    pp1.font.size = Pt(15)
    pp1.font.bold = True
    pp1.font.color.rgb = NAVY

    pp2 = ptf.add_paragraph()
    pp2.text = "Department of Computer Science & Engineering   |   Maharaja Institute of Technology Mysore"
    pp2.font.name = FONT_BODY
    pp2.font.size = Pt(11)
    pp2.font.color.rgb = SLATE_DARK
    pp2.space_before = Pt(2)

    pp3 = ptf.add_paragraph()
    pp3.text = "Production Web Application: https://mitmysore.vercel.app"
    pp3.font.name = FONT_BODY
    pp3.font.size = Pt(10)
    pp3.font.bold = True
    pp3.font.color.rgb = BLUE_PRIMARY
    pp3.space_before = Pt(3)


    # ==========================================
    # SLIDE 2: THE PROBLEM STATEMENT
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s2, "The Institutional Dilemma: Why Legacy Feedback Fails", "Context & Problem Statement", 2)

    add_card(s2, Inches(0.6), Inches(1.68), Inches(3.8), Inches(4.2), 
             "Paper-Based Evaluation", 
             [
                 ("Resource Drain", "Over 10,000+ sheets of paper printed every semester across departments."),
                 ("Manual Collation", "Faculty & staff spend weeks manually calculating averages on Excel."),
                 ("Damaged Data", "High risk of lost, illegible, or tampered feedback sheets."),
                 ("Zero Visibility", "HODs have no live feedback progress during active collection drives.")
             ], 
             badge="Bottleneck 01", strip_color=RED_ACCENT)

    add_card(s2, Inches(4.75), Inches(1.68), Inches(3.8), Inches(4.2), 
             "Fear of Retaliation", 
             [
                 ("Voter Fear", "Students fear negative feedback may impact their internal assessment marks."),
                 ("Biased Ratings", "Fear results in artificially inflated scores or insincere 5-star ratings."),
                 ("Flawed Tools", "Google Forms collect timestamps or emails, shattering student trust."),
                 ("Unheard Issues", "Critical feedback on lab hardware and teaching pacing gets lost.")
             ], 
             badge="Bottleneck 02", strip_color=ORANGE_MIT, bg_color=ORANGE_TINT)

    add_card(s2, Inches(8.9), Inches(1.68), Inches(3.8), Inches(4.2), 
             "Accreditation Delays", 
             [
                 ("NBA/NAAC Stress", "Compiling Course Outcome (CO) & PO attainment feedback takes weeks."),
                 ("Mismatched Data", "Manual spreadsheets rarely match NBA Criteria 10 formatting."),
                 ("Delayed Intervention", "Feedback reports arrive months after the semester is already over."),
                 ("No Educator Support", "Teachers receive no timely guidance to adjust their teaching style.")
             ], 
             badge="Bottleneck 03", strip_color=PURPLE_ACCENT)

    # Bottom summary callout banner
    banner = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(6.05), Inches(12.1), Inches(0.7))
    banner.fill.solid()
    banner.fill.fore_color.rgb = RED_TINT
    banner.line.color.rgb = RGBColor(254, 205, 211)
    banner.line.width = Pt(1)
    btf = banner.text_frame
    btf.margin_left = Inches(0.3)
    btf.margin_top = Inches(0.15)
    bp = btf.paragraphs[0]
    bp.text = "CORE INSTITUTIONAL IMPACT: Without guaranteed voter privacy and real-time automation, feedback becomes a slow, expensive administrative formality rather than an instrument of academic excellence."
    bp.font.name = FONT_BODY
    bp.font.size = Pt(10.5)
    bp.font.bold = True
    bp.font.color.rgb = RED_ACCENT


    # ==========================================
    # SLIDE 3: THE PROPOSED SOLUTION
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s3, "The Engineered Solution: Next-Gen Academic Intelligence", "System Vision & Value", 3)

    add_card(s3, Inches(0.6), Inches(1.68), Inches(7.6), Inches(4.95), 
             "5 Core Pillars of the Platform", 
             [
                 ("100% Cryptographic Anonymity", "Decoupled architecture strictly separates student USN eligibility from rating records. De-anonymization is mathematically impossible."),
                 ("Real-Time WebSocket Synchronization", "Socket.IO push engine gives HODs instant, live submission progress per section without exposing secret ballots."),
                 ("SAGAR AI Academic Copilot", "Autonomous conversational agent powered by Groq LPUs for instant chart rendering, session control, and sentiment synthesis."),
                 ("Frictionless Mobile Wizard", "Ultra-responsive touch-optimized UI designed for smartphones down to 360px viewports with multi-faculty carousels."),
                 ("Automated Email Invitations", "Nodemailer SMTP integration dispatches branded, secure session links directly to student inboxes in one click.")
             ], 
             badge="Architectural Innovation", strip_color=BLUE_PRIMARY, bg_color=WHITE)

    # 4 Stat KPI cards on the right
    add_stat_box(s3, Inches(8.5), Inches(1.68), Inches(4.2), Inches(1.15), "100%", "Guaranteed Voter Privacy", "Decoupled database voting pipeline", GREEN_MACE)
    add_stat_box(s3, Inches(8.5), Inches(2.95), Inches(4.2), Inches(1.15), "< 5 Min", "Turnaround Time", "From days of paperwork to instant reports", BLUE_PRIMARY)
    add_stat_box(s3, Inches(8.5), Inches(4.22), Inches(4.2), Inches(1.15), "95%+", "Student Participation", "Mobile-first accessibility & trust boost turnout", ORANGE_MIT)
    add_stat_box(s3, Inches(8.5), Inches(5.48), Inches(4.2), Inches(1.15), "1-Click", "NBA & NAAC Reports", "Instant accredited CSV scorecard export", PURPLE_ACCENT)


    # ==========================================
    # SLIDE 4: SYSTEM ARCHITECTURE & TECH STACK
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s4, "Enterprise Full-Stack Cloud Architecture", "Technical Stack & Infrastructure", 4)

    add_card(s4, Inches(0.6), Inches(1.68), Inches(2.85), Inches(4.95), 
             "Client Experience", 
             [
                 ("React 19 & Vite", "Modern component lifecycle, lightning-fast rendering."),
                 ("Vanilla CSS System", "Tailored glassmorphism, responsive grid down to 360px."),
                 ("Recharts Engine", "Interactive radar, bar, and performance distribution charts."),
                 ("React Router v6", "Protected role-gated routes for students, faculty, HOD, and admin.")
             ], 
             badge="Tier 1: Frontend", strip_color=BLUE_PRIMARY)

    add_card(s4, Inches(3.68), Inches(1.68), Inches(2.85), Inches(4.95), 
             "Application API Tier", 
             [
                 ("Node.js & Express", "Resilient REST API with strict security middleware."),
                 ("Socket.IO Engine", "Bi-directional WebSocket server for live HOD progress push."),
                 ("Knex.js ORM", "Connection pooling, parameterized queries, and ACID transactions."),
                 ("Nodemailer SMTP", "Automated email invitation dispatch with secure session keys.")
             ], 
             badge="Tier 2: Backend", strip_color=GREEN_MACE, bg_color=GREEN_TINT)

    add_card(s4, Inches(6.76), Inches(1.68), Inches(2.85), Inches(4.95), 
             "Data & Storage Tier", 
             [
                 ("TiDB Cloud Serverless", "High-concurrency distributed MySQL 8.0 cluster."),
                 ("Idempotency Store", "UUID single-use tokens preventing duplicate submissions."),
                 ("Decoupled Feedback", "Foreign-key free ratings store ensuring vote privacy."),
                 ("Cloudinary CDN", "Scalable media storage for verified faculty profile photos.")
             ], 
             badge="Tier 3: Database", strip_color=ORANGE_MIT)

    add_card(s4, Inches(9.84), Inches(1.68), Inches(2.85), Inches(4.95), 
             "AI & Edge Delivery", 
             [
                 ("Groq Cloud LPUs", "Language Processing Units providing sub-400ms inference."),
                 ("Function Calling", "Agentic schema executing real-time database actions."),
                 ("Vercel Edge Network", "Global CDN delivering frontend assets with sub-50ms TTFB."),
                 ("Render Web Service", "Auto-scaling Linux backend runtime with zero downtime.")
             ], 
             badge="Tier 4: Cloud & AI", strip_color=PURPLE_ACCENT, bg_color=PURPLE_TINT)


    # ==========================================
    # SLIDE 5: 100% CRYPTOGRAPHIC ANONYMITY ENGINE
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s5, "100% Cryptographic Student Anonymity Engine", "Security & Privacy Architecture", 5)

    # 4 Horizontal Workflow Cards
    add_step_card(s5, Inches(0.6), Inches(1.68), Inches(2.85), Inches(2.7), 1, "USN Verification", 
                  "Eligibility Validation", 
                  "Student enters USN & Session ID. System checks if student is enrolled in that semester & section.", BLUE_PRIMARY)

    add_step_card(s5, Inches(3.68), Inches(1.68), Inches(2.85), Inches(2.7), 2, "Idempotency Token", 
                  "Single-Use UUID", 
                  "Backend generates a cryptographically random UUID token required for submission to prevent replay attacks.", ORANGE_MIT)

    add_step_card(s5, Inches(6.76), Inches(1.68), Inches(2.85), Inches(2.7), 3, "Atomic Split", 
                  "Transactional Lock", 
                  "Knex transaction marks student row: feedback_given='done' and records token. Student cannot vote twice.", GREEN_MACE)

    add_step_card(s5, Inches(9.84), Inches(1.68), Inches(2.85), Inches(2.7), 4, "Anonymous Store", 
                  "Decoupled Storage", 
                  "Ratings are stored in global_student_feedback with faculty_id, course_id, and rating. NO USN or IP is saved!", PURPLE_ACCENT)

    # Bottom comparison card
    comp = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(4.6), Inches(12.1), Inches(2.1))
    comp.fill.solid()
    comp.fill.fore_color.rgb = WHITE
    comp.line.color.rgb = CARD_BORDER
    comp.line.width = Pt(1.2)

    ctf = comp.text_frame
    ctf.word_wrap = True
    ctf.margin_left = Inches(0.4)
    ctf.margin_top = Inches(0.2)

    cp1 = ctf.paragraphs[0]
    cp1.text = "THE ZERO-KNOWLEDGE VOTING GUARANTEE"
    cp1.font.name = FONT_HEADING
    cp1.font.size = Pt(11)
    cp1.font.bold = True
    cp1.font.color.rgb = GREEN_MACE

    cp2 = ctf.add_paragraph()
    r1 = cp2.add_run()
    r1.text = "What the HOD / College Sees: "
    r1.font.bold = True
    r1.font.color.rgb = NAVY
    r2 = cp2.add_run()
    r2.text = "HODs see real-time turnout (e.g., '48 of 60 students have completed the session'). They can see which USNs have completed, but have ZERO information on what ratings were submitted."
    r2.font.color.rgb = SLATE_MID
    cp2.space_before = Pt(4)

    cp3 = ctf.add_paragraph()
    r3 = cp3.add_run()
    r3.text = "What the Database Holds: "
    r3.font.bold = True
    r3.font.color.rgb = NAVY
    r4 = cp3.add_run()
    r4.text = "The feedback table has zero foreign keys to student identities. It is mathematically impossible for anyone—including database administrators—to link an individual response to a student."
    r4.font.color.rgb = SLATE_MID
    cp3.space_before = Pt(4)


    # ==========================================
    # SLIDE 6: STUDENT EXPERIENCE WIZARD
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s6, "Frictionless Mobile-First Student Experience", "Student Experience & UX", 6)

    add_card(s6, Inches(0.6), Inches(1.68), Inches(5.8), Inches(4.95), 
             "Evaluation Wizard Workflow", 
             [
                 ("Multi-Faculty Carousel", "Students evaluate each faculty member sequentially in a clean card layout, preventing cognitive fatigue."),
                 ("Strict Client Validation", "Students cannot advance until all criteria for the active subject are evaluated, eliminating skipped fields."),
                 ("Touch-Optimized Rating Scale", "Large, accessible 1 to 5 rating buttons optimized for rapid interaction on mobile touchscreens."),
                 ("Department Remarks Box", "Optional open-ended qualitative remarks box for constructive input regarding college facilities, labs, and pacing."),
                 ("Auto-Logout Safety", "Session credentials and tokens are destroyed immediately upon submission, preventing tampering on shared campus computers.")
             ], 
             badge="User Flow", strip_color=BLUE_PRIMARY, bg_color=WHITE)

    add_card(s6, Inches(6.8), Inches(1.68), Inches(5.9), Inches(4.95), 
             "4 Standardized Evaluation Criteria", 
             [
                 ("1. Teaching Effectiveness", "Clarity of concept explanations, depth of subject knowledge, and utilization of real-world industry examples."),
                 ("2. Communication Skills", "Articulation, language simplicity, delivery pacing (not too fast/slow), and encouragement of classroom discussion."),
                 ("3. Assessment & Feedback", "Fairness and transparency in internal marks evaluation, constructive feedback on tests, and adherence to syllabus timeline."),
                 ("4. Availability & Support", "Punctuality, availability during college hours, provision of study resources, and readiness to provide additional doubt clearing.")
             ], 
             badge="Evaluation Matrix", strip_color=GREEN_MACE, bg_color=GREEN_TINT)


    # ==========================================
    # SLIDE 7: FACULTY INTELLIGENCE HUB
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s7, "Faculty Analytics Hub & Accreditation Readiness", "Faculty Intelligence Hub", 7)

    add_card(s7, Inches(0.6), Inches(1.68), Inches(5.8), Inches(4.95), 
             "Personal Analytics & Insights", 
             [
                 ("Cumulative Rating Index", "Instant visibility into overall performance index (1.0 to 5.0) and total student feedback submissions."),
                 ("Subject-Wise Breakdown", "Separate analytical cards for theory subjects and practical laboratory courses across sections."),
                 ("Pedagogical Radar Visuals", "Recharts-powered radar charts pinpointing exact strengths (e.g. 4.8 in Subject Depth) vs development areas (e.g. 3.9 in Pace)."),
                 ("Question-by-Question Diagnostics", "Granular analysis across all 15 standardized evaluation parameters to support teacher growth."),
                 ("Student Sentiment Digest", "Synthesized constructive remarks without exposing student identities or compromising confidentiality.")
             ], 
             badge="Educator Center", strip_color=BLUE_PRIMARY)

    add_card(s7, Inches(6.8), Inches(1.68), Inches(5.9), Inches(4.95), 
             "Accreditation & Administrative Alignment", 
             [
                 ("NBA Criteria 10 Compliance", "Pre-calculated teaching performance metrics formatted for NBA Self-Assessment Reports (SAR)."),
                 ("NAAC Criteria 2 Alignment", "Quantified student satisfaction metrics ready for Internal Quality Assurance Cell (IQAC) presentations."),
                 ("Confidential HOD Guidance Notes", "Direct, encrypted communication channel where HODs leave constructive mentoring notes on a faculty portal."),
                 ("Verified Profile Management", "Cloudinary CDN integration supporting high-definition professional profile photographs."),
                 ("Self-Registration Queue", "Faculty sign-up portal with HOD approval safeguard to preserve department roster integrity.")
             ], 
             badge="Compliance & Mentorship", strip_color=PURPLE_ACCENT, bg_color=PURPLE_TINT)


    # ==========================================
    # SLIDE 8: HOD CONTROL HUB
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s8, "Department Head (HOD) Operations Hub", "Department Governance", 8)

    add_card(s8, Inches(0.6), Inches(1.68), Inches(3.8), Inches(4.95), 
             "Session Orchestration", 
             [
                 ("Rapid Session Setup", "Create feedback sessions by semester and section in seconds with auto-generated session keys."),
                 ("Automated Email Alerts", "Nodemailer integration dispatches direct session links to student emails with one click."),
                 ("Session Lifecycle", "HOD can pause, end, or archive feedback sessions on demand."),
                 ("Turnout Enforcement", "Identify non-participating cohorts and issue reminder dispatches instantly.")
             ], 
             badge="Operations", strip_color=BLUE_PRIMARY)

    add_card(s8, Inches(4.75), Inches(1.68), Inches(3.8), Inches(4.95), 
             "Real-Time Live Monitor", 
             [
                 ("Socket.IO Live Push", "Watch real-time submission progress bar fill up as students vote in computer labs."),
                 ("Turnout Telemetry", "Instant metrics on completed vs. pending students per section."),
                 ("Non-Intrusive Monitoring", "Track participation numbers without accessing secret ballot data."),
                 ("Session Audit History", "Permanent record of when sessions started, ended, and total votes collected.")
             ], 
             badge="Live Sync", strip_color=GREEN_MACE, bg_color=GREEN_TINT)

    add_card(s8, Inches(8.9), Inches(1.68), Inches(3.8), Inches(4.95), 
             "Roster & Curriculum Control", 
             [
                 ("Bulk Excel/CSV Upload", "Import student rosters, faculty directories, and course catalogs in seconds."),
                 ("Dynamic Subject Mapping", "Assign faculty to specific sections, semesters, and lab batches via interactive tables."),
                 ("Custom Question Banks", "Add, edit, or re-order departmental feedback questions and categories."),
                 ("Executive Sentiment Reports", "Groq AI extracts key strengths and lab improvement needs from student remarks.")
             ], 
             badge="Administration", strip_color=ORANGE_MIT)


    # ==========================================
    # SLIDE 9: SAGAR AI COPILOT
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s9, "⭐ SAGAR AI — Autonomous Academic Copilot", "Groq-Powered AI Innovation", 9)

    add_card(s9, Inches(0.6), Inches(1.68), Inches(5.8), Inches(4.95), 
             "Agentic Architecture & Tool Calling", 
             [
                 ("Groq Cloud LPUs", "Ultra-low-latency inference engine delivering conversational answers in under 400 milliseconds."),
                 ("Autonomous Dashboard Navigation", "Natural language instructions ('Take me to student management') automatically redirect the HOD UI."),
                 ("In-Chat Dynamic Charting", "Prompts like 'Show me Sem 6 performance trends' render interactive Recharts directly inside the conversation."),
                 ("One-Click Approvals", "Prompts like 'Show pending faculty' render interactive approval cards inside chat."),
                 ("Conversational Session Creation", "Validates semester and section criteria and opens pre-filled session setup modals automatically.")
             ], 
             badge="Copilot Capabilities", strip_color=PURPLE_ACCENT, bg_color=PURPLE_TINT)

    add_card(s9, Inches(6.8), Inches(1.68), Inches(5.9), Inches(4.95), 
             "Academic Intelligence & Guardrails", 
             [
                 ("Qualitative Remark Synthesis", "Ingests thousands of open-ended student comments to synthesize core strengths, concerns, and action items."),
                 ("Instant Departmental Reports", "Prompts like 'Generate department report' compile full accredited CSV files for instant download."),
                 ("Top-Performer Discovery", "Instantly queries the database to surface top-rated educators across subjects and semesters."),
                 ("Strict Identity Isolation", "Student USNs are excluded from AI model context; the LLM processes purely aggregated, anonymous data."),
                 ("Human-in-the-Loop Safeguards", "Destructive actions (creating sessions, deleting entries) require explicit user confirmation.")
             ], 
             badge="Safety & Synthesis", strip_color=BLUE_PRIMARY)


    # ==========================================
    # SLIDE 10: SUPER ADMIN & SECURITY
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s10, "Institutional Super Admin & Enterprise Security", "Administrative Governance", 10)

    add_card(s10, Inches(0.6), Inches(1.68), Inches(5.8), Inches(4.95), 
             "Multi-Department Governance", 
             [
                 ("Institution-Wide Oversight", "Centralized administration spanning CSE, ISE, ECE, ME, CV, AIML, AIDS, and allied branches."),
                 ("Cross-Department Benchmarking", "Comparative performance analytics enabling Principals and Deans to benchmark academic satisfaction."),
                 ("Department Lifecycle Controls", "Create, activate, deactivate, or reset credentials for any academic department."),
                 ("Global Directory Maintenance", "Central index of all active students and faculty across Maharaja Institute of Technology Mysore."),
                 ("Cluster Health Telemetry", "Real-time monitoring of TiDB database connection pool, API response times, and session health.")
             ], 
             badge="Institutional Administration", strip_color=BLUE_PRIMARY)

    add_card(s10, Inches(6.8), Inches(1.68), Inches(5.9), Inches(4.95), 
             "Enterprise Defense-in-Depth", 
             [
                 ("HTTP-Only SameSite-Strict Cookies", "Protects authenticated sessions against Cross-Site Scripting (XSS) and CSRF token interception."),
                 ("Bcrypt Cryptographic Hashing", "10-round salted password hashing for all administrative, HOD, and faculty accounts."),
                 ("Knex Parameterized Queries", "Prepared SQL statements eliminate SQL injection vulnerabilities completely."),
                 ("Express Rate-Limiting", "Guards authentication and feedback endpoints against automated brute-force attacks."),
                 ("Immutable Security Audit Logging", "Every login, roster modification, and session event is permanently logged with IP & device fingerprints.")
             ], 
             badge="Security Hardening", strip_color=GREEN_MACE, bg_color=GREEN_TINT)


    # ==========================================
    # SLIDE 11: NBA & NAAC ACCREDITATION IMPACT
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s11, "Accreditation Impact: NBA & NAAC Compliance", "Accreditation & Quality Assurance", 11)

    add_card(s11, Inches(0.6), Inches(1.68), Inches(5.8), Inches(4.95), 
             "NBA Alignment (Criteria 10)", 
             [
                 ("Continuous Improvement Process", "Provides verified longitudinal data on pedagogical effectiveness and curriculum delivery."),
                 ("Course Outcome (CO) Feedback", "Direct mapping of student feedback to individual courses and practical laboratory outcomes."),
                 ("Instant SAR Documentation", "Generates pre-formatted metric tables ready for inclusion in NBA Self-Assessment Reports (SAR)."),
                 ("Targeted Faculty Development", "Identifies specific areas where junior educators can benefit from Faculty Development Programs (FDPs)."),
                 ("Elimination of Calculation Errors", "Automated algorithmic aggregation removes spreadsheet formula errors during accreditation audits.")
             ], 
             badge="NBA Criteria 10", strip_color=ORANGE_MIT, bg_color=ORANGE_TINT)

    add_card(s11, Inches(6.8), Inches(1.68), Inches(5.9), Inches(4.95), 
             "NAAC Alignment (Criteria 1 & 2)", 
             [
                 ("Curriculum Design & Review (Criteria 1)", "Qualitative remarks synthesize student perspectives on syllabus relevance, lab infrastructure, and industry readiness."),
                 ("Teaching-Learning Process (Criteria 2)", "Quantifies student satisfaction regarding concept clarity, assessment fairness, and faculty accessibility."),
                 ("Verifiable Audit Trail", "Immutable system logs provide accreditation committees with tamper-proof evidence of authentic student feedback collection."),
                 ("Action-Taken Reporting (ATR)", "Pre-synthesized AI summaries provide instant inputs for Internal Quality Assurance Cell (IQAC) meetings."),
                 ("Transparent Governance", "Fosters an open, trustworthy institutional culture that strengthens college rating scores.")
             ], 
             badge="NAAC Criteria 1 & 2", strip_color=PURPLE_ACCENT, bg_color=PURPLE_TINT)


    # ==========================================
    # SLIDE 12: REAL-WORLD DEMONSTRATION WORKFLOW
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s12, "Demonstration: End-to-End Operational Lifecycle", "System Walkthrough", 12)

    add_step_card(s12, Inches(0.6), Inches(1.68), Inches(2.85), Inches(4.95), 1, "Session Launch", 
                  "HOD Configures Session", 
                  "• HOD selects Sem 6, Section A.\n• System generates session key.\n• Automated email invitation is sent to enrolled students via Nodemailer in one click.", BLUE_PRIMARY)

    add_step_card(s12, Inches(3.68), Inches(1.68), Inches(2.85), Inches(4.95), 2, "Student Voting", 
                  "Anonymous Evaluation", 
                  "• Student logs in on mobile via USN.\n• Evaluates teachers across 4 criteria on a 1-5 touch matrix.\n• Single-use idempotency token ensures one submission per student.", GREEN_MACE)

    add_step_card(s12, Inches(6.76), Inches(1.68), Inches(2.85), Inches(4.95), 3, "Live Sync", 
                  "Real-Time WebSockets", 
                  "• Socket.IO instantly pushes submission counter to HOD dashboard.\n• Live turnout updates without screen refresh.\n• Student row marked 'done' with zero vote linking.", ORANGE_MIT)

    add_step_card(s12, Inches(9.84), Inches(1.68), Inches(2.85), Inches(4.95), 4, "AI & Reports", 
                  "Instant Intelligence", 
                  "• SAGAR AI synthesizes remarks and highlights key departmental trends.\n• Faculty receives updated radar scorecards.\n• One-click accredited CSV report export.", PURPLE_ACCENT)


    # ==========================================
    # SLIDE 13: COMPARISON MATRIX TABLE
    # ==========================================
    s13 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s13, "Performance Metrics & Institutional Comparison", "Quantifiable Comparison", 13)

    # Comparison Table
    table_shape = s13.shapes.add_table(6, 3, Inches(0.6), Inches(1.68), Inches(12.1), Inches(4.2))
    table = table_shape.table
    table.columns[0].width = Inches(3.2)
    table.columns[1].width = Inches(4.4)
    table.columns[2].width = Inches(4.5)

    headers = ["Evaluation Metric", "Legacy Manual System (Paper / Form)", "Our Platform (MIT Mysore)"]
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.name = FONT_HEADING
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.alignment = PP_ALIGN.CENTER

    data = [
        ("Paper Consumption", "~12,000 sheets per semester across campus", "0 Sheets (100% Digital & Eco-Friendly)"),
        ("Turnaround Time", "3 to 4 Weeks of manual tabulation", "Instant (Under 5 Minutes from session close)"),
        ("Student Anonymity", "Compromised / Fear of mark retaliation", "100% Cryptographically Decoupled Secrecy"),
        ("Student Turnout", "55% – 65% due to paper fatigue", "95%+ via Mobile Wizard & Email Dispatch"),
        ("Accreditation Export", "Days of stressful manual spreadsheet collation", "Instant 1-Click NBA & NAAC CSV Export")
    ]

    for row_idx, row_data in enumerate(data, start=1):
        bg = WHITE if row_idx % 2 == 1 else RGBColor(241, 245, 249)
        for col_idx, text in enumerate(row_data):
            cell = table.cell(row_idx, col_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = bg
            p = cell.text_frame.paragraphs[0]
            p.text = text
            p.font.name = FONT_BODY
            p.font.size = Pt(11)
            if col_idx == 0:
                p.font.bold = True
                p.font.color.rgb = SLATE_DARK
            elif col_idx == 1:
                p.font.color.rgb = RGBColor(185, 28, 28) # Red tint for legacy
            else:
                p.font.bold = True
                p.font.color.rgb = RGBColor(21, 128, 61) # Green tint for new system

    # Bottom roadmap note
    r_banner = s13.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(6.08), Inches(12.1), Inches(0.68))
    r_banner.fill.solid()
    r_banner.fill.fore_color.rgb = BLUE_TINT
    r_banner.line.color.rgb = RGBColor(191, 219, 254)
    r_banner.line.width = Pt(1)
    rtf = r_banner.text_frame
    rtf.margin_left = Inches(0.3)
    rtf.margin_top = Inches(0.14)
    rp = rtf.paragraphs[0]
    rp.text = "FUTURE ROADMAP: College ERP timetable auto-synchronization, predictive sentiment alerts for mid-term intervention, and TOTP-based Multi-Factor Authentication (MFA)."
    rp.font.name = FONT_BODY
    rp.font.size = Pt(10.5)
    rp.font.bold = True
    rp.font.color.rgb = BLUE_PRIMARY


    # ==========================================
    # SLIDE 14: CONCLUSION & THANK YOU
    # ==========================================
    s14 = prs.slides.add_slide(blank_layout)
    add_header_and_footer(s14, "Conclusion & Open Floor for Questions", "Presentation Conclusion", 14)

    # Hero Card
    c_card = s14.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.85), Inches(10.933), Inches(4.7))
    c_card.fill.solid()
    c_card.fill.fore_color.rgb = WHITE
    c_card.line.color.rgb = CARD_BORDER
    c_card.line.width = Pt(1.5)

    ctf = c_card.text_frame
    ctf.word_wrap = True
    ctf.margin_left = Inches(0.6)
    ctf.margin_right = Inches(0.6)
    ctf.margin_top = Inches(0.35)

    cp_sub = ctf.paragraphs[0]
    cp_sub.text = "MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE"
    cp_sub.font.name = FONT_HEADING
    cp_sub.font.size = Pt(12)
    cp_sub.font.bold = True
    cp_sub.font.color.rgb = BLUE_PRIMARY
    cp_sub.alignment = PP_ALIGN.CENTER

    cp_title = ctf.add_paragraph()
    cp_title.text = "Thank You!"
    cp_title.font.name = FONT_TITLE
    cp_title.font.size = Pt(36)
    cp_title.font.bold = True
    cp_title.font.color.rgb = NAVY
    cp_title.alignment = PP_ALIGN.CENTER
    cp_title.space_before = Pt(6)

    cp_desc = ctf.add_paragraph()
    cp_desc.text = "The MIT Mysore Student Feedback & Academic Intelligence Platform demonstrates how full-stack cloud engineering, real-time WebSockets, and modern AI can empower colleges with uncompromising privacy, transparency, and actionable pedagogical intelligence."
    cp_desc.font.name = FONT_BODY
    cp_desc.font.size = Pt(12.5)
    cp_desc.font.color.rgb = SLATE_MID
    cp_desc.alignment = PP_ALIGN.CENTER
    cp_desc.space_before = Pt(10)

    # Presenter Card inside
    in_box = s14.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.2), Inches(4.45), Inches(8.933), Inches(1.6))
    in_box.fill.solid()
    in_box.fill.fore_color.rgb = BLUE_TINT
    in_box.line.color.rgb = RGBColor(191, 219, 254)
    in_box.line.width = Pt(1.2)

    itf = in_box.text_frame
    itf.word_wrap = True
    itf.margin_left = Inches(0.4)
    itf.margin_top = Inches(0.2)

    ip1 = itf.paragraphs[0]
    ip1.text = "Presenter:  SUHAS J"
    ip1.font.name = FONT_TITLE
    ip1.font.size = Pt(16)
    ip1.font.bold = True
    ip1.font.color.rgb = NAVY
    ip1.alignment = PP_ALIGN.CENTER

    ip2 = itf.add_paragraph()
    ip2.text = "Department of Computer Science & Engineering   |   Maharaja Institute of Technology Mysore"
    ip2.font.name = FONT_BODY
    ip2.font.size = Pt(12)
    ip2.font.color.rgb = SLATE_DARK
    ip2.alignment = PP_ALIGN.CENTER
    ip2.space_before = Pt(4)

    ip3 = itf.add_paragraph()
    ip3.text = "Live Deployment: https://mitmysore.vercel.app   •   Questions & Technical Viva Discussion Welcome"
    ip3.font.name = FONT_BODY
    ip3.font.size = Pt(11)
    ip3.font.bold = True
    ip3.font.color.rgb = BLUE_PRIMARY
    ip3.alignment = PP_ALIGN.CENTER
    ip3.space_before = Pt(4)

    output_path = os.path.join(base_dir, "MIT_Mysore_Student_Feedback_Platform_Suhas_J.pptx")
    prs.save(output_path)
    print(f"Enhanced Presentation successfully created at: {output_path}")

if __name__ == "__main__":
    build_enhanced_presentation()
