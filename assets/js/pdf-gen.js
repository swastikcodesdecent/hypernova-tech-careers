/**
 * HyperNova Technology - PDF Application Generator & Preview Renderer
 */

class ApplicationPDFGenerator {
  generatePDF(appData) {
    // Check if jsPDF library is loaded from CDN
    const { jsPDF } = window.jspdf || {};

    if (jsPDF) {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2); // 180mm
      const maxContentY = 262; // Leave room for multi-page signature footer

      // Retrieve full Terms & Conditions text
      const tncText = window.HYPERNOVA_TNC_TEXT || `HYPERNOVA TECHNOLOGY — TERMS & CONDITIONS
Effective Date: 10.08.2026

These Terms & Conditions govern participation in HyperNova Technology.`;

      // Header drawing helper for Page 1
      const drawFirstPageHeader = () => {
        doc.setFillColor(17, 24, 39);
        doc.rect(0, 0, pageWidth, 36, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('HYPERNOVA TECHNOLOGY', margin, 15);

        doc.setFontSize(9);
        doc.setTextColor(56, 189, 248);
        doc.text('OFFICIAL CAREERS & COLLABORATION AGREEMENT & APPLICATION', margin, 23);

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, 26, contentWidth, 8, 'F');
        doc.setFontSize(8.5);
        doc.setTextColor(226, 232, 240);
        doc.text(`Application ID: ${appData.appId || 'HN-2026-0000'}`, margin + 3, 31.5);
        doc.text(`Role: ${(appData.applicantType || 'Collaborator').replace('_', ' ').toUpperCase()}`, margin + 100, 31.5);
      };

      // Header drawing helper for subsequent pages
      const drawSubsequentPageHeader = () => {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`HYPERNOVA TECHNOLOGY — TERMS & CONDITIONS (App ID: ${appData.appId || 'HN-2026-0000'})`, margin, 12);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, 14, pageWidth - margin, 14);
      };

      drawFirstPageHeader();
      let y = 42;

      const checkPageBreak = (neededSpace = 8) => {
        if (y + neededSpace > maxContentY) {
          doc.addPage();
          drawSubsequentPageHeader();
          y = 20;
        }
      };

      // ====================================================
      // 1. OFFICIAL TERMS & CONDITIONS (ALL 21 SECTIONS)
      // ====================================================
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('1. TERMS & CONDITIONS OF HYPERNOVA TECHNOLOGY', margin, y);
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.4);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 8;

      const tncLines = tncText.split('\n');

      for (let i = 0; i < tncLines.length; i++) {
        const rawLine = tncLines[i].trim();
        if (!rawLine) {
          y += 2;
          continue;
        }

        const isHeader = /^\d+\.\s+/.test(rawLine) || rawLine.startsWith('HYPERNOVA TECHNOLOGY') || rawLine.startsWith('Effective Date:');
        
        if (isHeader) {
          checkPageBreak(12);
          y += 2;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(9.5);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(8.5);
        }

        const wrapped = doc.splitTextToSize(rawLine, contentWidth);
        for (let j = 0; j < wrapped.length; j++) {
          checkPageBreak(5);
          doc.text(wrapped[j], margin, y);
          y += 4.2;
        }
      }

      // ====================================================
      // 2. LEGAL VERIFICATION & E-SIGNATURE ACCEPTANCE
      // ====================================================
      checkPageBreak(45);
      y += 6;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('2. LEGAL VERIFICATION & E-SIGNATURE ACCEPTANCE', margin, y);
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.4);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 8;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const declText = "By signing below, the applicant confirms full reading, understanding, and unreserved agreement to all 21 sections of the HyperNova Technology Terms & Conditions (v1.0), and certifies under penalty of misrepresentation that all details provided in this application are accurate and authentic.";
      const wrappedDecl = doc.splitTextToSize(declText, contentWidth);
      doc.text(wrappedDecl, margin, y);
      y += (wrappedDecl.length * 4.2) + 6;

      checkPageBreak(34);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, contentWidth, 30, 'DF');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Terms Accepted v1.0: ${new Date(appData.termsAcceptedAt || Date.now()).toLocaleString()}`, margin + 4, y + 7);
      doc.text(`Applicant Legal Name: ${appData.fullName || appData.applicantEmail}`, margin + 4, y + 14);
      doc.text(`Applicant Email: ${appData.applicantEmail || appData.email}`, margin + 4, y + 21);

      if (appData.signatureDataUrl) {
        try {
          doc.text('Applicant Signature:', margin + 110, y + 7);
          doc.addImage(appData.signatureDataUrl, 'PNG', margin + 110, y + 9, 52, 17);
        } catch (e) {
          doc.text(`[E-Signed: ${appData.fullName || 'Verified'}]`, margin + 110, y + 16);
        }
      } else {
        doc.text(`[E-Signed: ${appData.fullName || 'Verified'}]`, margin + 110, y + 16);
      }

      y += 36;

      // ====================================================
      // 3. APPLICANT SUBMISSION & FILLED APPLICATION DETAILS
      // ====================================================
      checkPageBreak(35);
      y += 6;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('3. APPLICANT SUBMISSION & FILLED APPLICATION DETAILS', margin, y);
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.4);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 10;

      const renderDetailRow = (label, val) => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(label, margin, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const wrappedVal = doc.splitTextToSize(val || 'N/A', 125);
        doc.text(wrappedVal, margin + 55, y);
        y += (wrappedVal.length * 4.5) + 3;
      };

      renderDetailRow('Full Legal Name:', appData.fullName || appData.applicantEmail);
      renderDetailRow('Email Address:', appData.email || appData.applicantEmail);
      renderDetailRow('Phone Number:', appData.phone);
      renderDetailRow('Location / City:', appData.location);
      renderDetailRow('GitHub Profile:', appData.github);
      renderDetailRow('LinkedIn Profile:', appData.linkedin);
      renderDetailRow('Resume / CV URL:', appData.resume);
      const techStackStr = (appData.selectedTechStack && appData.selectedTechStack.length > 0)
        ? appData.selectedTechStack.join(', ')
        : (appData.skills || 'N/A');
      renderDetailRow('Tech Stacks & Skills:', techStackStr);
      renderDetailRow('Relevant Projects / Exp:', appData.projects);

      if (appData.applicantType === 'volunteer_collaborator') {
        const deptStr = appData.primaryDepartmentName || (appData.departmentNames ? appData.departmentNames.join(', ') : 'None Specified');
        renderDetailRow('Primary Department Preference:', deptStr);
        if (appData.secondaryDepartmentNames && appData.secondaryDepartmentNames.length > 0) {
          renderDetailRow('Additional Preferences:', appData.secondaryDepartmentNames.join(', '));
        }
        if (appData.departmentReason) {
          renderDetailRow('Department Opting Rationale:', appData.departmentReason);
        }
      }

      checkPageBreak(32);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, contentWidth, 30, 'DF');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Applicant Name: ${appData.fullName || 'Applicant'}`, margin + 5, y + 7);
      doc.text(`Terms Accepted At: ${appData.termsAcceptedAt ? new Date(appData.termsAcceptedAt).toLocaleString() : new Date().toLocaleString()}`, margin + 5, y + 15);
      doc.text(`Agreement Record ID: ${appData.appId || 'HN-2026-0000'}`, margin + 5, y + 23);

      doc.setFont('helvetica', 'bold');
      doc.text('Applicant Signature:', margin + 110, y + 7);

      if (appData.signatureDataUrl) {
        try {
          doc.addImage(appData.signatureDataUrl, 'PNG', margin + 110, y + 9, 55, 17);
        } catch (e) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(37, 99, 235);
          doc.text(`[Verified E-Signature: ${appData.fullName || 'Accepted'}]`, margin + 110, y + 17);
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(37, 99, 235);
        doc.text(`[Verified E-Signature: ${appData.fullName || 'Accepted'}]`, margin + 110, y + 17);
      }

      y += 36;

      // ====================================================
      // 4. EXECUTIVE CEO APPROVAL & E-SIGNATURE VERIFICATION
      // ====================================================
      if (appData.status === 'approved' || appData.ceoSignatureDataUrl) {
        checkPageBreak(42);
        y += 6;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('4. EXECUTIVE CEO APPROVAL & E-SIGNATURE VERIFICATION', margin, y);
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.4);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 8;

        checkPageBreak(36);
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.rect(margin, y, contentWidth, 32, 'DF');

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52);
        doc.text(`Executive Approver: ${appData.ceoName || 'Ishan Pandit'} (Founder & CEO)`, margin + 4, y + 7);
        doc.text(`Executive Decision: APPROVED & VALIDATED`, margin + 4, y + 14);
        doc.text(`Approval Timestamp: ${appData.ceoApprovedAt ? new Date(appData.ceoApprovedAt).toLocaleString() : new Date().toLocaleString()}`, margin + 4, y + 21);
        if (appData.assignedDepartmentName) {
          doc.text(`Assigned Department: ${appData.assignedDepartmentName}`, margin + 4, y + 27);
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52);
        doc.text('CEO Executive Signature:', margin + 110, y + 7);

        if (appData.ceoSignatureDataUrl) {
          try {
            doc.addImage(appData.ceoSignatureDataUrl, 'PNG', margin + 110, y + 9, 52, 18);
          } catch (e) {
            doc.setFont('helvetica', 'italic');
            doc.text('[CEO E-Signed & Approved]', margin + 110, y + 16);
          }
        } else {
          doc.setFont('helvetica', 'italic');
          doc.text('[CEO E-Signed & Approved]', margin + 110, y + 16);
        }

        y += 40;
      }

      // ====================================================
      // 5. STAMP APPLICANT & CEO SIGNATURES ON ALL PAGES
      // ====================================================
      const totalPages = doc.getNumberOfPages();

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);

        // Footer Separator
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(margin, 274, pageWidth - margin, 274);

        // Footer Metadata Text
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`HyperNova Technology — Official Recruitment Document | App ID: ${appData.appId || 'HN-2026-0000'}`, margin, 279);
        doc.text(`Terms & Conditions v1.0 | Page ${pageNum} of ${totalPages}`, margin, 283);

        // Footer Signature Stamps
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Applicant Signature:', 105, 279);

        if (appData.signatureDataUrl) {
          try {
            doc.addImage(appData.signatureDataUrl, 'PNG', 105, 280, 20, 6);
          } catch (e) {
            doc.setFontSize(6);
            doc.text(`[${appData.fullName || 'Signed'}]`, 105, 284);
          }
        } else {
          doc.setFontSize(6);
          doc.text(`[${appData.fullName || 'Signed'}]`, 105, 284);
        }

        if (appData.ceoSignatureDataUrl) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(22, 101, 52);
          doc.text('CEO Signature:', 150, 279);
          try {
            doc.addImage(appData.ceoSignatureDataUrl, 'PNG', 150, 280, 20, 6);
          } catch (e) {
            doc.setFontSize(6);
            doc.text('[CEO Approved]', 150, 284);
          }
        }
      }

      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const dataUrl = doc.output('datauristring');
      return { doc, blob, blobUrl, dataUrl };
    }

    // HTML / SVG Fallback Generator (If jsPDF library CDN is delayed)
    const tncHtmlText = (window.HYPERNOVA_TNC_TEXT || 'Terms & Conditions').replace(/\n/g, '<br>');
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 25px; background: #0f172a; color: #f8fafc;">
        <div style="background: #1e293b; padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
          <h2 style="color: #38bdf8; margin: 0 0 5px 0;">HYPERNOVA TECHNOLOGY</h2>
          <div style="font-size: 14px; color: #94a3b8;">Application ID: ${appData.appId || 'HN-2026-0000'} | Role: ${appData.applicantType}</div>
        </div>

        <h3 style="color: #6366f1;">1. TERMS & CONDITIONS OF HYPERNOVA TECHNOLOGY</h3>
        <div style="font-size: 13px; line-height: 1.6; color: #cbd5e1; background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          ${tncHtmlText}
        </div>

        <h3 style="color: #6366f1;">2. LEGAL E-SIGNATURE VERIFICATION</h3>
        <p>Terms Accepted v1.0 on ${new Date(appData.termsAcceptedAt || Date.now()).toLocaleString()}</p>
        ${appData.signatureDataUrl ? `<div><p>Applicant Signature:</p><img src="${appData.signatureDataUrl}" style="max-height:60px; background:#fff; padding:5px; border-radius:4px;"/></div>` : ''}

        <h3 style="color: #6366f1; margin-top:20px;">3. APPLICANT PROFILE & SUBMITTED DETAILS</h3>
        <p><strong>Full Name:</strong> ${appData.fullName}</p>
        <p><strong>Email:</strong> ${appData.email}</p>
        <p><strong>Phone:</strong> ${appData.phone}</p>
        <p><strong>Location:</strong> ${appData.location || 'N/A'}</p>
        <p><strong>GitHub:</strong> ${appData.github}</p>
        <p><strong>LinkedIn:</strong> ${appData.linkedin || 'N/A'}</p>
        <p><strong>Resume Link:</strong> ${appData.resume}</p>
        <p><strong>Tech Skills:</strong> ${(appData.selectedTechStack && appData.selectedTechStack.length > 0) ? appData.selectedTechStack.join(', ') : (appData.skills || 'N/A')}</p>
        <p><strong>Experience:</strong> ${appData.projects || 'N/A'}</p>
        ${appData.primaryDepartmentName ? `<p><strong>Primary Department Preference:</strong> ${appData.primaryDepartmentName}</p>` : ''}
        ${appData.departmentReason ? `<p><strong>Department Opting Rationale:</strong> ${appData.departmentReason}</p>` : ''}

        ${(appData.status === 'approved' || appData.ceoSignatureDataUrl) ? `
          <h3 style="color: #22c55e; margin-top:20px;">4. EXECUTIVE CEO APPROVAL & E-SIGNATURE VERIFICATION</h3>
          <div style="background: rgba(34,197,94,0.1); border: 1px solid #22c55e; padding: 15px; border-radius: 8px;">
            <p style="color:#22c55e; margin:0 0 5px 0;"><strong>Executive Approver:</strong> Ishan Pandit (Founder & CEO)</p>
            <p style="margin:0 0 5px 0;"><strong>Executive Decision:</strong> APPROVED & VALIDATED</p>
            <p style="margin:0 0 5px 0;"><strong>Approval Date:</strong> ${appData.ceoApprovedAt ? new Date(appData.ceoApprovedAt).toLocaleString() : new Date().toLocaleString()}</p>
            ${appData.assignedDepartmentName ? `<p style="margin:0 0 5px 0;"><strong>Assigned Department:</strong> ${appData.assignedDepartmentName}</p>` : ''}
            ${appData.ceoSignatureDataUrl ? `<div style="margin-top:10px;"><p style="margin:0 0 5px 0;"><strong>CEO Executive E-Signature:</strong></p><img src="${appData.ceoSignatureDataUrl}" style="max-height:50px; background:#fff; padding:4px; border-radius:4px;"/></div>` : ''}
          </div>
        ` : ''}
      </div>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    return { doc: null, blob, blobUrl, dataUrl: blobUrl };
  }

  downloadPDF(appData) {
    const fileName = `HyperNova_Application_${appData.appId || 'HN-2026-0001'}.pdf`;
    const res = this.generatePDF(appData);

    if (res) {
      if (res.doc && typeof res.doc.save === 'function') {
        res.doc.save(fileName);
        return true;
      }

      if (res.blob) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
        return true;
      }
    }
    return false;
  }

  generateApplicationPDF(appData) {
    const res = this.generatePDF(appData);
    if (res && res.blob) {
      return res.blob;
    }
    return new Blob(['HyperNova Application PDF'], { type: 'application/pdf' });
  }
}

const pdfGenInstance = new ApplicationPDFGenerator();
window.HyperNovaPDF = pdfGenInstance;
window.HyperNovaPDFGen = pdfGenInstance;
