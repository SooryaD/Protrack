import PptxGenJS from 'pptxgenjs';

async function generate() {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    // Define a Master Slide for consistent headers/footers
    pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: 'F8FAFC' },
        objects: [
            { rect: { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: '1E293B' } } },
            { text: { text: 'Protrack Workflow Presentation', options: { x: 0.5, y: 0.1, w: 5, h: 0.6, fontSize: 18, color: 'FFFFFF', bold: true } } },
            { text: { text: 'Anna University CDE', options: { x: 7.5, y: 0.1, w: 2, h: 0.6, fontSize: 14, color: '94A3B8', align: 'right' } } },
            { rect: { x: 0, y: 5.3, w: '100%', h: 0.3, fill: { color: 'E2E8F0' } } },
            { text: { text: 'Auto-generated Workflow Outline', options: { x: 0.5, y: 5.3, w: 3, h: 0.3, fontSize: 10, color: '64748B' } } }
        ]
    });

    // Helper for colored boxes
    const addBox = (slide, text, x, y, bg, color) => {
        slide.addText(text, {
            x, y, w: 2.5, h: 1.2,
            fill: { color: bg },
            color: color,
            fontSize: 16,
            bold: true,
            align: 'center',
            valign: 'middle',
            shape: pptx.ShapeType.roundRect,
            line: { color: 'CBD5E1', width: 1 }
        });
    };

    const addArrow = (slide, x, y) => {
        slide.addShape(pptx.ShapeType.rightArrow, {
            x, y, w: 0.6, h: 0.3,
            fill: { color: '94A3B8' },
            line: { color: '64748B' }
        });
    };

    // ── Slide 1: Welcome ────────────────────────────────────────────────────────
    let slide1 = pptx.addSlide();
    slide1.background = { color: '0F172A' };
    slide1.addText('PROTRACK', { x: 0, y: 2, w: '100%', h: 1, align: 'center', fontSize: 64, bold: true, color: '38BDF8' });
    slide1.addText('End-to-End System Workflow Architecture', { x: 0, y: 3, w: '100%', h: 0.5, align: 'center', fontSize: 24, color: 'F8FAFC' });
    slide1.addText('Anna University CDE Project Portal', { x: 0, y: 3.5, w: '100%', h: 0.5, align: 'center', fontSize: 18, color: '94A3B8' });

    // ── Slide 2: Core Roles ──────────────────────────────────────────────────────
    let slide2 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide2.addText('System Roles & Responsibilities', { x: 0.5, y: 1.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '0F172A' });

    // Roles Flow
    addBox(slide2, 'STUDENT\nRegisters & Proposes', 1, 2.5, 'EFF6FF', '1D4ED8');
    addBox(slide2, 'STAFF GUIDE\nMentors & Grades', 4, 2.5, 'FEF2F2', 'B91C1C');
    addBox(slide2, 'ADMIN (CSC)\nReviews & Approves', 7, 2.5, 'F0FDF4', '15803D');

    slide2.addText('The platform seamlessly passes data states between these three core roles, enforcing strict capacity constraints and approval guardrails.', { x: 1, y: 4.2, w: 8, h: 1, fontSize: 16, color: '475569', align: 'center' });

    // ── Slide 3: Phase 1 & 2 ──────────────────────────────────────────────────────
    let slide3 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide3.addText('Phase 1 & 2: Project Initiation & Approvals', { x: 0.5, y: 1.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '0F172A' });

    // Flowchart row 1
    addBox(slide3, '1. Student Register', 0.5, 2.2, 'FFFFFF', '1E293B');
    addArrow(slide3, 3.1, 2.65);
    addBox(slide3, '2. Guide Request', 3.8, 2.2, 'EFF6FF', '1D4ED8');
    addArrow(slide3, 6.4, 2.65);
    addBox(slide3, '3. Staff Accepts', 7.1, 2.2, 'FEF2F2', 'B91C1C');

    // Flowchart row 2
    addBox(slide3, '4. Submit Proposal', 0.5, 3.8, 'FFFFFF', '1E293B');
    addArrow(slide3, 3.1, 4.25);
    addBox(slide3, '5. Staff Approves', 3.8, 3.8, 'FEF2F2', 'B91C1C');
    addArrow(slide3, 6.4, 4.25);
    addBox(slide3, '6. Admin CSC Review', 7.1, 3.8, 'F0FDF4', '15803D');

    // ── Slide 4: Phase 3 & 4 ──────────────────────────────────────────────────────
    let slide4 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide4.addText('Phase 3 & 4: Grading & Final Verification', { x: 0.5, y: 1.2, w: 9, h: 0.5, fontSize: 24, bold: true, color: '0F172A' });

    // Flowchart row 1
    addBox(slide4, '7. First Review (R1)', 0.5, 2.2, 'FEF2F2', 'B91C1C');
    addArrow(slide4, 3.1, 2.65);
    addBox(slide4, '8. Second Review (R2)', 3.8, 2.2, 'FEF2F2', 'B91C1C');
    addArrow(slide4, 6.4, 2.65);
    addBox(slide4, '9. Final Report Msg', 7.1, 2.2, 'EFF6FF', '1D4ED8');

    // Flowchart row 2
    addBox(slide4, '10. Doc Verification', 3.8, 3.8, 'FEF2F2', 'B91C1C');
    addArrow(slide4, 6.4, 4.25);
    addBox(slide4, '11. Project Complete!', 7.1, 3.8, 'F8FAFC', '0F172A');

    const filename = 'C:\\Users\\Soory\\.gemini\\antigravity\\brain\\a2fd051f-e912-4700-83dc-3b221054a766\\Protrack_Visual_Workflow.pptx';

    try {
        await pptx.writeFile({ fileName: filename });
        console.log(`Successfully created valid Visual PPTX at \${filename}`);
    } catch (err) {
        console.error("Error creating PPTX", err);
    }
}

generate();
