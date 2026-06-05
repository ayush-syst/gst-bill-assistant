    "use strict";

    // Pure domain logic lives in core.mjs (also covered by tests/core.test.mjs).
    import {
      AMOUNT_TOLERANCE,
      normalizeNumber, normalizeInvoiceNo, normalizeInvoiceLoose,
      gstinCheckDigit, gstinChecksumOk, isValidGstin, gstinStateCode,
      billGst, rowStatus, statusBadgeClass,
      parseCsv, normalizeHeader, getByHeader,
      parseInvoiceMonth, invoicePeriodMismatch,
      reconcile, parseBillsCsv
    } from "./core.mjs";

    // =============================================================
    // CONFIG — app-level constants (domain tunables are in core.mjs)
    // =============================================================
    const APP_VERSION = "3.3.0";
    const AI_MODEL = "claude-sonnet-4-6";       // Anthropic model id used for AI features

    // =============================================================
    // DOM REFERENCES
    // =============================================================
    const els = {
      text:           document.getElementById("invoiceText"),
      file:           document.getElementById("invoiceFile"),
      parse:          document.getElementById("parseBtn"),
      sample:         document.getElementById("sampleBtn"),
      clear:          document.getElementById("clearBtn"),
      csv:            document.getElementById("csvBtn"),
      zoho:           document.getElementById("zohoBtn"),
      gstrFile:       document.getElementById("gstrFile"),
      sample2b:       document.getElementById("sample2bBtn"),
      reconcile:      document.getElementById("reconcileBtn"),
      reconCsv:       document.getElementById("reconCsvBtn"),
      smartFix:       document.getElementById("smartFixBtn"),
      message:        document.getElementById("messageBtn"),
      reviewPack:     document.getElementById("reviewPackBtn"),
      reviewedCsv:    document.getElementById("reviewedCsvBtn"),
      save:           document.getElementById("saveBtn"),
      loadSaved:      document.getElementById("loadSavedBtn"),
      exportWorkFile: document.getElementById("exportWorkFileBtn"),
      importWorkFile: document.getElementById("importWorkFile"),
      statusLine:     document.getElementById("statusLine"),
      reviewerName:   document.getElementById("reviewerName"),
      checkSource:    document.getElementById("checkSource"),
      checkExceptions:document.getElementById("checkExceptions"),
      checkEligibility:document.getElementById("checkEligibility"),
      checkNoAutoFile:document.getElementById("checkNoAutoFile"),
      approve:        document.getElementById("approveBtn"),
      clearAudit:     document.getElementById("clearAuditBtn"),
      auditLog:       document.getElementById("auditLog"),
      clientName:     document.getElementById("clientName"),
      clientGstin:    document.getElementById("clientGstin"),
      returnPeriod:   document.getElementById("returnPeriod"),
      preparedBy:     document.getElementById("preparedBy"),
      staffRate:      document.getElementById("staffRate"),
      rows:           document.getElementById("billRows"),
      actions:        document.getElementById("actionList"),
      clientMessage:  document.getElementById("clientMessage"),
      empty:          document.getElementById("emptyState"),
      count:          document.getElementById("billCount"),
      taxable:        document.getElementById("taxableTotal"),
      gst:            document.getElementById("gstTotal"),
      issues:         document.getElementById("issueCount"),
      itcReady:       document.getElementById("itcReady"),
      itcRisk:        document.getElementById("itcRisk"),
      missingBooks:   document.getElementById("missingBooks"),
      priorityActions:document.getElementById("priorityActions"),
      qualityScore:   document.getElementById("qualityScore"),
      firmClients:    document.getElementById("firmClients"),
      hoursSaved:     document.getElementById("hoursSaved"),
      moneySaved:     document.getElementById("moneySaved"),
      suggestedPlan:  document.getElementById("suggestedPlan"),
      toast:          document.getElementById("toast"),
      searchInput:    document.getElementById("searchInput"),
      filterStatus:   document.getElementById("filterStatus"),
      filterReco:     document.getElementById("filterReco"),
      matchCount:     document.getElementById("matchCount"),
      hsnContent:     document.getElementById("hsnContent"),
      vendorContent:  document.getElementById("vendorContent"),
      clientListContainer: document.getElementById("clientListContainer"),
      pilotPlan:      document.getElementById("pilotPlanBtn"),
      pilotCopy:      document.getElementById("pilotCopyBtn"),
      pilotDownload:  document.getElementById("pilotDownloadBtn"),
      pilotPlanBox:   document.getElementById("pilotPlanBox"),
      validationRun:  document.getElementById("validationRunBtn"),
      validationCsv:  document.getElementById("validationCsvBtn"),
      template2b:     document.getElementById("template2bBtn"),
      validationBox:  document.getElementById("validationBox"),
      validationScore:document.getElementById("validationScore"),
      criticalIssues: document.getElementById("criticalIssues"),
      warningIssues:  document.getElementById("warningIssues"),
      aiApiKey:       document.getElementById("aiApiKey"),
      aiStatus:       document.getElementById("aiStatus"),
      aiExplainPanel: document.getElementById("aiExplainPanel"),
      aiExplainBtn:   document.getElementById("aiExplainBtn"),
      aiExtractBtn:   document.getElementById("aiExtractBtn"),
      tallyXmlBtn:    document.getElementById("tallyXmlBtn"),
      whatsappBtn:    document.getElementById("whatsappBtn"),
      feeCalcBtn:     document.getElementById("feeCalcBtn"),
      feeResults:     document.getElementById("feeResults"),
      feeSuggestedCharge: document.getElementById("feeSuggestedCharge"),
      feeYourMargin:  document.getElementById("feeYourMargin"),
      feeClientRoi:   document.getElementById("feeClientRoi"),
      feePitch:       document.getElementById("feePitch"),
      saveTrendBtn:   document.getElementById("saveTrendBtn"),
      trendContent:   document.getElementById("trendContent"),
      darkModeBtn:    document.getElementById("darkModeBtn"),
      shortcutsBtn:   document.getElementById("shortcutsBtn"),
      printReportBtn: document.getElementById("printReportBtn")
    };

    // =============================================================
    // APPLICATION STATE
    // =============================================================
    let bills = [];
    let gstr2bRows = [];
    let unmatched2bRows = [];
    let auditEvents = [];
    let approvedAt = "";
    let toastTimer = null;
    let validationIssues = [];

    // =============================================================
    // SAMPLE DATA
    // =============================================================
    const sampleText = `TAX INVOICE
Vendor: Shree Balaji Office Supplies
GSTIN: 27ABCDE1234F1Z0
Invoice No: INV-2026-1042
Date: 12/05/2026
HSN: 4820
Taxable Value: 12500.00
CGST 9%: 1125.00
SGST 9%: 1125.00
Grand Total: 14750.00
---
Tax Invoice
ABC Cloud Services Pvt Ltd
GSTIN 29AAICA3918J1ZE
Bill No: BLR/2451/26
Invoice Date: 18-05-2026
SAC Code: 998313
Taxable Amount Rs. 42000
IGST @18% Rs. 7560
Total Invoice Value Rs. 49560
---
PURCHASE BILL
Vendor Name: Patel Packaging Co
GSTIN: 24AABCP1234K1ZP
Invoice Number: PP/0891
Date: 21 May 2026
HSN Code 3923
Taxable 8600
CGST 774
SGST 774
Invoice Total 10148
---
TAX INVOICE
Vendor: Hotel Royal Stay
GSTIN: 27AABCH1234L1ZP
Invoice No: HRS/5581
Date: 24/05/2026
SAC: 996311
Taxable Value: 5000
CGST 9%: 450
SGST 9%: 450
Grand Total: 5900`;

    const sample2bCsv = `GSTIN,Invoice No,Taxable,CGST,SGST,IGST,Total
27ABCDE1234F1Z0,INV-2026-1042,12500,1125,1125,0,14750
29AAICA3918J1ZE,BLR/2451/26,42000,0,0,7560,49560
24AABCP1234K1ZP,PP/0891,8600,774,774,0,10148
07ABCDE1234F1Z2,DEL/7782,5500,495,495,0,6490`;

    // =============================================================
    // UTILITY FUNCTIONS
    // =============================================================

    /** Format a number as Rs. with Indian grouping */
    function money(value) {
      return "Rs." + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);
    }

    // normalizeNumber, normalizeInvoiceNo, normalizeInvoiceLoose → imported from core.mjs

    /** Escape HTML entities to prevent XSS */
    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    /** Show a toast notification */
    function showToast(message, type) {
      clearTimeout(toastTimer);
      els.toast.textContent = message;
      els.toast.className = "toast visible" + (type === "error" ? " toast-error" : type === "success" ? " toast-success" : "");
      toastTimer = setTimeout(() => { els.toast.className = "toast"; }, 3000);
    }

    /** Update the status bar text */
    function setStatus(message) {
      els.statusLine.textContent = message;
    }

    /** Add an entry to the audit log */
    function addAudit(message) {
      const ws = workspace();
      const time = new Date().toLocaleString("en-IN");
      auditEvents.unshift(`${time} | ${ws.clientName || "Client"} | ${message}`);
      auditEvents = auditEvents.slice(0, 100);
      renderAudit();
    }

    function renderAudit() {
      els.auditLog.textContent = auditEvents.length ? auditEvents.join("\n") : "No audit events yet.";
    }

    // =============================================================
    // REGEX EXTRACTION HELPERS
    // =============================================================

    /** Try multiple regex patterns, return first match group 1 */
    function find(text, patterns) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) return match[1].trim().replace(/[|]+$/g, "").trim();
      }
      return "";
    }

    /** find() but normalize the result as a number */
    function findNumber(text, patterns) {
      return normalizeNumber(find(text, patterns));
    }

    /** Guess vendor name from invoice text */
    function guessVendor(text) {
      const direct = find(text, [
        /vendor(?:\s+name)?\s*[:\-]\s*([^\n]+)/i,
        /supplier(?:\s+name)?\s*[:\-]\s*([^\n]+)/i,
        /seller(?:\s+name)?\s*[:\-]\s*([^\n]+)/i
      ]);
      if (direct) return direct;

      // Fallback: first line that isn't a heading/field label
      const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
      const skip = /tax invoice|purchase bill|gstin|invoice|date|hsn|sac|total|amount/i;
      return (lines.find(l => l.length > 4 && !skip.test(l)) || "").slice(0, 80);
    }

    /** Guess the expense ledger category */
    function guessLedger(text) {
      if (/software|cloud|hosting|subscription|saas/i.test(text)) return "Software Expenses";
      if (/office|stationery|paper|printer/i.test(text)) return "Office Expenses";
      if (/packaging|carton|box/i.test(text)) return "Packing Material";
      if (/freight|courier|transport|shipping/i.test(text)) return "Freight & Courier";
      if (/hotel|stay|lodging|accommodation/i.test(text)) return "Hotel & Travel";
      if (/food|restaurant|catering|canteen/i.test(text)) return "Food & Beverages";
      return "Purchase Account";
    }

    /** Guess ITC eligibility type */
    function guessItcType(text) {
      if (/food|restaurant|catering|hotel|club|health\s*club|cab|taxi|motor\s*car|personal/i.test(text)) return "Blocked / review";
      if (/capital|machinery|laptop|computer|equipment|asset/i.test(text)) return "Capital goods";
      if (/freight|courier|transport|shipping/i.test(text)) return "Input service";
      if (/software|cloud|hosting|subscription|saas|consulting|professional/i.test(text)) return "Input service";
      return "Input goods";
    }

    // =============================================================
    // GSTIN VALIDATION
    // =============================================================

    // gstinCheckDigit, gstinChecksumOk, isValidGstin, gstinStateCode → imported from core.mjs

    // =============================================================
    // INVOICE PARSING
    // =============================================================

    /** Split raw text into individual invoice blocks */
    function splitInvoices(text) {
      return text
        .split(/\n\s*(?:---+|={3,}|_{3,})\s*\n|\n\s*\n\s*\n/g)
        .map(part => part.trim())
        .filter(part => part.length > 25);
    }

    /** Parse a single invoice text block into a structured bill object */
    function parseBill(block, index) {
      const compact = block.replace(/\r/g, "").trim();

      const gstin = find(compact, [/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i]).toUpperCase();
      const invoiceNo = find(compact, [
        /invoice\s*(?:no|number|#)\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
        /bill\s*(?:no|number|#)\s*[:\-]?\s*([A-Z0-9\/\-]+)/i
      ]);
      const date = find(compact, [
        /invoice\s*date\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
        /date\s*[:\-]?\s*([0-9]{1,2}\s+[A-Z][a-z]+\s+[0-9]{4})/i,
        /date\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i
      ]);
      const hsn = find(compact, [
        /\bhsn(?:\s+code)?\s*[:\-]?\s*([0-9]{4,8})/i,
        /\bsac(?:\s+code)?\s*[:\-]?\s*([0-9]{4,8})/i
      ]);
      const taxable = findNumber(compact, [
        /taxable\s*(?:value|amount)?\s*(?:rs\.?|inr|₹)?\s*[:\-]?\s*([₹,\d.]+)/i,
        /assessable\s*value\s*(?:rs\.?|inr|₹)?\s*[:\-]?\s*([₹,\d.]+)/i
      ]);
      const cgst = findNumber(compact, [/\bcgst\b[^\n\d]*(?:\d+%|@\d+%)?\s*(?:rs\.?|inr|₹)?\s*[:\-]?\s*([₹,\d.]+)/i]);
      const sgst = findNumber(compact, [/\bsgst\b[^\n\d]*(?:\d+%|@\d+%)?\s*(?:rs\.?|inr|₹)?\s*[:\-]?\s*([₹,\d.]+)/i]);
      const igst = findNumber(compact, [/\bigst\b[^\n\d]*(?:\d+%|@\d+%)?\s*(?:rs\.?|inr|₹)?\s*[:\-]?\s*([₹,\d.]+)/i]);
      const total = findNumber(compact, [
        /(?:grand\s+total|invoice\s+total|total\s+invoice\s+value|total\s+amount|net\s+payable)\s*(?:rs\.?|inr|₹)?\s*[:\-]?\s*([₹,\d.]+)/i
      ]);

      return {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + index),
        vendor: guessVendor(compact),
        gstin,
        invoiceNo,
        date,
        hsn,
        taxable,
        cgst,
        sgst,
        igst,
        total,
        ledger: guessLedger(compact),
        itcType: guessItcType(compact),
        risk: "",
        reco: "",
        recoNote: "",
        raw: compact
      };
    }

    // =============================================================
    // BILL GST CALCULATION
    // =============================================================

    // billGst → imported from core.mjs

    // =============================================================
    // STATUS DETERMINATION
    // BUG FIX #3: blocked ITC bills no longer show "Ready"
    // =============================================================

    // rowStatus, statusBadgeClass → imported from core.mjs

    // =============================================================
    // DUPLICATE DETECTION
    // BUG FIX #1: Clear all duplicate flags before re-detection
    // =============================================================

    /** Detect and flag duplicate invoices by GSTIN + Invoice No + Total */
    function detectDuplicateRisk() {
      // FIX: Clear all existing duplicate flags first to avoid stale flags
      bills.forEach(bill => {
        if (bill.risk === "Duplicate") bill.risk = "";
      });

      const seen = new Map();
      bills.forEach((bill, idx) => {
        if (!bill.gstin || !bill.invoiceNo) return;
        const key = `${String(bill.gstin).toUpperCase()}|${normalizeInvoiceNo(bill.invoiceNo)}|${Math.round(Number(bill.total || 0))}`;

        if (seen.has(key)) {
          bill.risk = "Duplicate";
          const firstIdx = seen.get(key);
          bills[firstIdx].risk = "Duplicate";
        } else {
          seen.set(key, idx);
        }
      });
    }

    // =============================================================
    // APPROVAL STATE MANAGEMENT
    // BUG FIX #4: Invalidate approval on any data change
    // =============================================================

    /** Clear approval state after any data modification */
    function invalidateApproval() {
      if (approvedAt) {
        approvedAt = "";
        addAudit("Approval invalidated due to data change.");
      }
    }

    // =============================================================
    // RENDERING
    // =============================================================

    /** Render a single table cell with an editable input */
    function cell(index, key, type) {
      const value = bills[index][key] ?? "";
      const inputType = type || "text";
      return `<td><input data-index="${index}" data-key="${key}" type="${inputType}" value="${escapeHtml(value)}"></td>`;
    }

    /** Render the GSTIN cell, flagging an invalid (format/checksum) vendor GSTIN. */
    function gstinCell(index) {
      const value = bills[index].gstin ?? "";
      const invalid = value && !isValidGstin(value);
      const cls = invalid ? ' class="gstin-invalid"' : "";
      const title = invalid ? ' title="Invalid GSTIN — fails format or checksum"' : "";
      return `<td><input data-index="${index}" data-key="gstin" type="text" value="${escapeHtml(value)}"${cls}${title}></td>`;
    }

    /** Render the 2B reconciliation badge for a bill */
    function recoBadge(bill) {
      const reco = bill.reco || "Not checked";
      let cls = "badge-neutral";
      if (reco === "Matched") cls = "badge-ok";
      else if (reco === "Mismatch") cls = "badge-warn";
      else if (reco === "Missing in 2B") cls = "badge-bad";

      const note = bill.recoNote ? `<br><span style="font-size:11px;color:var(--ink-muted)">${escapeHtml(bill.recoNote)}</span>` : "";
      return `<span class="badge ${cls}">${escapeHtml(reco)}</span>${note}`;
    }

    /** Full render: table rows, stats, actions, summaries, client list */
    function render() {
      const searchTerm = (els.searchInput.value || "").toLowerCase().trim();
      const statusFilter = els.filterStatus.value;
      const recoFilter = els.filterReco.value;

      els.rows.innerHTML = "";
      els.empty.style.display = bills.length ? "none" : "block";
      document.getElementById("billTable").style.display = bills.length ? "table" : "none";

      let visibleCount = 0;

      bills.forEach((bill, index) => {
        const status = rowStatus(bill);
        const reco = bill.reco || "Not checked";

        // Apply search filter
        if (searchTerm) {
          const hay = `${bill.vendor} ${bill.gstin} ${bill.invoiceNo} ${bill.date} ${bill.hsn} ${bill.ledger}`.toLowerCase();
          if (!hay.includes(searchTerm)) return;
        }

        // Apply status filter
        if (statusFilter && status !== statusFilter) return;

        // Apply reco filter
        if (recoFilter && reco !== recoFilter) return;

        visibleCount++;

        const tr = document.createElement("tr");
        // Row color class
        let rowClass = "row-ready";
        if (bill.manuallyReviewed) rowClass += " row-reviewed";
        else if (bill.reco === "Missing in 2B") rowClass = "row-missing";
        else if (bill.reco === "Mismatch") rowClass = "row-mismatch";
        else if (bill.reco === "Matched") rowClass = "row-matched";
        else if (bill.itcType === "Blocked / review") rowClass = "row-blocked";
        else if (bill.risk === "Duplicate") rowClass = "row-duplicate";
        tr.className = rowClass;
        tr.dataset.billId = bill.id;

        const isReviewed = bill.manuallyReviewed;
        // Confidence: high if all key fields present, medium if some, low if many missing
        const confFields = [bill.vendor, bill.gstin, bill.invoiceNo, bill.taxable, bill.total];
        const confScore = confFields.filter(Boolean).length;
        const confClass = confScore >= 4 ? "conf-high" : confScore >= 2 ? "conf-medium" : "conf-low";
        const confTitle = confScore >= 4 ? "High confidence" : confScore >= 2 ? "Medium confidence" : "Low confidence — check manually";

        const isChecked = selectedBillIds.has(bill.id);
        tr.innerHTML = `
          <td><input type="checkbox" class="row-checkbox bill-checkbox" data-bill-id="${bill.id}" ${isChecked?"checked":""}></td>
          <td><span class="badge ${statusBadgeClass(status)}">${escapeHtml(status)}</span> <span class="conf-dot ${confClass}" title="${confTitle}"></span></td>
          ${cell(index, "vendor")}
          ${gstinCell(index)}
          ${cell(index, "invoiceNo")}
          ${cell(index, "date")}
          ${cell(index, "hsn")}
          ${cell(index, "taxable", "text")}
          ${cell(index, "cgst", "text")}
          ${cell(index, "sgst", "text")}
          ${cell(index, "igst", "text")}
          ${cell(index, "total", "text")}
          ${cell(index, "ledger")}
          ${cell(index, "itcType")}
          ${cell(index, "risk")}
          <td>${recoBadge(bill)}</td>
          <td><div class="row-actions">
            <button class="row-reviewed-btn ${isReviewed ? "checked" : ""}" data-bill-index="${index}" title="Mark as manually reviewed">${isReviewed ? "✓ Done" : "Review"}</button>
            <button class="row-del-btn" data-bill-index="${index}" title="Delete this bill">✕</button>
          </div></td>
        `;
        els.rows.appendChild(tr);
      });

      // Show match count when filtering
      if (bills.length && (searchTerm || statusFilter || recoFilter)) {
        els.matchCount.textContent = `${visibleCount} of ${bills.length} bills`;
      } else {
        els.matchCount.textContent = bills.length ? `${bills.length} bills` : "";
      }

      // Attach inline-edit listeners
      els.rows.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", event => {
          const idx = Number(event.target.dataset.index);
          const key = event.target.dataset.key;
          bills[idx][key] = event.target.value;
          invalidateApproval();
          updateStats();
          const statusEl = event.target.closest("tr").querySelector(".badge");
          const newStatus = rowStatus(bills[idx]);
          statusEl.textContent = newStatus;
          statusEl.className = "badge " + statusBadgeClass(newStatus);
          if (key === "gstin") {
            const bad = event.target.value && !isValidGstin(event.target.value);
            event.target.classList.toggle("gstin-invalid", !!bad);
            event.target.title = bad ? "Invalid GSTIN — fails format or checksum" : "";
          }
          scheduleAutoSave();
        });
      });

      // Bill checkboxes
      els.rows.querySelectorAll(".bill-checkbox").forEach(cb => {
        cb.addEventListener("change", e => {
          const id = e.target.dataset.billId;
          if (e.target.checked) selectedBillIds.add(id);
          else selectedBillIds.delete(id);
          updateBulkBar();
        });
      });

      // Delete row buttons
      els.rows.querySelectorAll(".row-del-btn").forEach(btn => {
        btn.addEventListener("click", event => {
          const idx = Number(event.currentTarget.dataset.billIndex);
          const bill = bills[idx];
          if (!bill) return;
          // Save for undo
          undoStack.push({ action: "delete", bill: JSON.parse(JSON.stringify(bill)), index: idx });
          bills.splice(idx, 1);
          invalidateApproval();
          showToastWithUndo("Bill deleted.", () => {
            const entry = undoStack.pop();
            if (entry && entry.action === "delete") {
              bills.splice(entry.index, 0, entry.bill);
              render(); updateStats(); updateWorkflow();
              showToast("Bill restored.", "success");
            }
          });
          render(); updateStats(); updateWorkflow(); scheduleAutoSave();
        });
      });

      // Manually reviewed toggle buttons
      els.rows.querySelectorAll(".row-reviewed-btn").forEach(btn => {
        btn.addEventListener("click", event => {
          const idx = Number(event.currentTarget.dataset.billIndex);
          if (!bills[idx]) return;
          bills[idx].manuallyReviewed = !bills[idx].manuallyReviewed;
          addAudit(bills[idx].manuallyReviewed
            ? "Marked bill " + (bills[idx].invoiceNo || idx) + " as reviewed."
            : "Unmarked review on bill " + (bills[idx].invoiceNo || idx) + ".");
          render(); scheduleAutoSave();
        });
      });

      updateStats();
      renderActions();
      renderRecoBar();
      renderHsnSummary();
      renderVendorSummary();
      renderClientList();
      updateExceptionBadge();
      updateTabBillCount();
      updateStickySummary();
      attachCopyOnClick();
    }

    // =============================================================
    // STATS CALCULATION
    // =============================================================

    function updateStats() {
      const taxable = bills.reduce((sum, b) => sum + Number(b.taxable || 0), 0);
      const gst = bills.reduce((sum, b) => sum + billGst(b), 0);
      const issues = bills.filter(b => rowStatus(b) !== "Ready").length;

      // ITC ready: matched, not blocked, not duplicate
      const itcReady = bills
        .filter(b => b.reco === "Matched" && b.itcType !== "Blocked / review" && b.risk !== "Duplicate")
        .reduce((sum, b) => sum + billGst(b), 0);

      // ITC at risk: any exception (not matched, blocked, or duplicate)
      const itcRisk = bills
        .filter(b => b.reco && (b.reco !== "Matched" || b.itcType === "Blocked / review" || b.risk === "Duplicate"))
        .reduce((sum, b) => sum + billGst(b), 0);

      // Review confidence score
      const possibleChecks = bills.length ? bills.length * 4 : 0;
      const passedChecks = bills.reduce((sum, b) => {
        return sum
          + (rowStatus(b) === "Ready" ? 1 : 0)
          + (b.reco === "Matched" ? 1 : 0)
          + (b.itcType !== "Blocked / review" ? 1 : 0)
          + (b.risk !== "Duplicate" ? 1 : 0);
      }, 0);
      const qualityScore = possibleChecks ? Math.round((passedChecks / possibleChecks) * 100) : 0;

      els.count.textContent = bills.length;
      els.taxable.textContent = money(taxable);
      els.gst.textContent = money(gst);
      els.issues.textContent = issues;
      els.itcReady.textContent = money(itcReady);
      els.itcRisk.textContent = money(itcRisk);
      els.missingBooks.textContent = unmatched2bRows.length;
      els.priorityActions.textContent = buildActions().length;
      els.qualityScore.textContent = `${qualityScore}%`;

      updateRoiMetrics();
    }

    function updateRoiMetrics() {
      const invoiceMinutesSaved = bills.length * 4;
      const exceptionMinutesSaved = buildActions().length * 6;
      const recoMinutesSaved = gstr2bRows.length * 1.5;
      const hours = Math.max(0, (invoiceMinutesSaved + exceptionMinutesSaved + recoMinutesSaved) / 60);
      const rate = Number(els.staffRate.value || 300);

      els.hoursSaved.textContent = `${hours.toFixed(1)}h`;
      els.moneySaved.textContent = money(hours * rate);
      els.firmClients.textContent = localStorage.getItem("gstBillAssistantClientCount") || "1";

      const bc = bills.length;
      els.suggestedPlan.textContent = bc > 200 ? "Growth" : bc > 50 ? "Pro" : "Starter";
    }

    // =============================================================
    // INVOICE EXTRACTION
    // =============================================================

    function parseCurrentText() {
      const raw = els.text.value.trim();
      if (!raw) {
        showToast("No invoice text to extract. Paste text or upload files first.", "error");
        return;
      }
      const blocks = splitInvoices(raw);
      bills = blocks.map(parseBill);
      detectDuplicateRisk();
      invalidateApproval();
      setStatus(`Extracted ${bills.length} bill${bills.length === 1 ? "" : "s"}.`);
      updateWorkflow();
        addAudit(`Extracted ${bills.length} bill(s) from pasted/uploaded text.`);
      showToast(`Extracted ${bills.length} bill${bills.length === 1 ? "" : "s"}.`, "success");
      render();
    }

    // =============================================================
    // CSV UTILITIES
    // =============================================================

    /** Convert an array of arrays to CSV text */
    function toCsv(rows) {
      return rows.map(row => row.map(value => {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      }).join(",")).join("\n");
    }

    // parseCsv, normalizeHeader, getByHeader → imported from core.mjs

    // =============================================================
    // GSTR-2B LOADING
    // =============================================================

    function loadGstr2bCsv(text) {
      const rows = parseCsv(text);
      if (rows.length < 2) {
        gstr2bRows = [];
        showToast("Could not parse 2B CSV. Check format.", "error");
        return;
      }
      const headers = rows[0].map(h => h.trim());
      gstr2bRows = rows.slice(1).map(row => {
        const record = {};
        headers.forEach((h, i) => { record[h] = row[i] || ""; });
        return {
          gstin:   String(getByHeader(record, ["GSTIN", "Supplier GSTIN", "GSTIN of supplier"])).trim().toUpperCase(),
          invoiceNo: String(getByHeader(record, ["Invoice No", "Invoice Number", "Invoice Number/Note Number", "Bill Number"])).trim().toUpperCase(),
          taxable: normalizeNumber(getByHeader(record, ["Taxable", "Taxable Value", "Taxable Amount"])),
          cgst:    normalizeNumber(getByHeader(record, ["CGST", "Central Tax"])),
          sgst:    normalizeNumber(getByHeader(record, ["SGST", "State Tax"])),
          igst:    normalizeNumber(getByHeader(record, ["IGST", "Integrated Tax"])),
          total:   normalizeNumber(getByHeader(record, ["Total", "Invoice Value", "Total Invoice Value"]))
        };
      }).filter(r => r.gstin || r.invoiceNo);

      invalidateApproval();
      addAudit(`Loaded ${gstr2bRows.length} GSTR-2B row(s).`);
      updateWorkflow();
      showToast(`Loaded ${gstr2bRows.length} GSTR-2B row(s).`, "success");
    }

    // =============================================================
    // RECONCILIATION
    // =============================================================

    function reconcileBills() {
      if (!bills.length) {
        showToast("No bills to reconcile. Extract bills first.", "error");
        return;
      }
      if (!gstr2bRows.length) {
        showToast("No 2B data loaded. Upload or load sample 2B first.", "error");
        return;
      }

      // Pure matching lives in core.mjs (covered by tests); app supplies the money formatter.
      const result = reconcile(bills, gstr2bRows, { tolerance: AMOUNT_TOLERANCE, money });
      bills = result.bills;
      unmatched2bRows = result.unmatched;
      detectDuplicateRisk();
      invalidateApproval();

      const matched = bills.filter(b => b.reco === "Matched").length;
      setStatus(`Reconciled ${bills.length} bills against ${gstr2bRows.length} 2B rows. ${matched} matched.`);
      addAudit(`Reconciled books vs 2B. Matched: ${matched}, exceptions: ${buildActions().length}.`);
      updateWorkflow();
      showToast(`Reconciliation complete. ${matched} matched.`, "success");
      render();
    }

    // =============================================================
    // IMPORT BILLS FROM CSV (existing register)
    // =============================================================

    function importBillsCsv(text) {
      const imported = parseBillsCsv(text).map((b, i) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + i),
        ...b, risk: "", reco: "", recoNote: "", raw: ""
      }));
      if (!imported.length) { showToast("No usable rows found in CSV.", "error"); return; }
      bills = bills.concat(imported);
      detectDuplicateRisk();
      invalidateApproval();
      setStatus(`Imported ${imported.length} bill(s) from CSV.`);
      addAudit(`Imported ${imported.length} bill(s) from a CSV register.`);
      showToast(`Imported ${imported.length} bill(s) from CSV.`, "success");
      render();
      updateWorkflow();
    }

    function downloadBillsTemplate() {
      const headers = ["Vendor", "GSTIN", "Invoice No", "Date", "HSN", "Taxable", "CGST", "SGST", "IGST", "Total", "Ledger", "ITC Type"];
      const example = ["Shree Balaji Office Supplies", "27ABCDE1234F1Z0", "INV-2026-1042", "12/05/2026", "4820", "12500", "1125", "1125", "0", "14750", "Office Expenses", "Input goods"];
      downloadText("bills-template.csv", toCsv([headers, example]));
      showToast("Bills CSV template downloaded.", "success");
    }

    // =============================================================
    // ADD 2B-ONLY INVOICES TO BOOKS (reverse reconciliation)
    // =============================================================

    function addUnmatched2bToBooks() {
      if (!unmatched2bRows.length) { showToast("No 2B-only invoices. Reconcile first.", "error"); return; }
      const added = unmatched2bRows.map((r, i) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + i),
        vendor: "", gstin: r.gstin || "", invoiceNo: r.invoiceNo || "", date: "",
        hsn: "", taxable: String(r.taxable || ""), cgst: String(r.cgst || ""),
        sgst: String(r.sgst || ""), igst: String(r.igst || ""), total: String(r.total || ""),
        ledger: "Purchase Account", itcType: "Input goods",
        risk: "", reco: "", recoNote: "", raw: ""
      }));
      const n = added.length;
      bills = bills.concat(added);
      reconcileBills(); // re-match so the new rows pair with their 2B entries and exceptions refresh
      setStatus(`Added ${n} 2B-only invoice(s) to books for review.`);
      addAudit(`Added ${n} 2B-only invoice(s) to the book register for review.`);
      showToast(`Added ${n} invoice(s) from 2B. Fill in vendor & date, then verify.`, "success");
    }

    // =============================================================
    // ACTION CENTER
    // =============================================================

    function buildActions() {
      const actions = [];
      const returnPeriod = (els.returnPeriod && els.returnPeriod.value) || "";

      bills.forEach(bill => {
        if (invoicePeriodMismatch(bill, returnPeriod)) {
          actions.push({
            type: "Wrong period",
            title: `${bill.vendor || "Unknown"} — ${bill.invoiceNo || "No inv #"}`,
            detail: `Invoice dated ${bill.date} (${parseInvoiceMonth(bill.date)}) is outside the return period ${returnPeriod}. Confirm the period or exclude this bill.`
          });
        }
        if (bill.risk === "Duplicate") {
          actions.push({
            type: "Duplicate",
            title: `${bill.vendor || "Unknown"} — ${bill.invoiceNo || "No inv #"}`,
            detail: "Possible duplicate. Confirm before claiming ITC or exporting."
          });
        }
        if (bill.itcType === "Blocked / review") {
          actions.push({
            type: "ITC review",
            title: `${bill.vendor || "Unknown"} — ${bill.invoiceNo || "No inv #"}`,
            detail: `Potential blocked/personal ITC. Review eligibility before claiming ${money(billGst(bill))}.`
          });
        }
        if (rowStatus(bill) === "Review") {
          actions.push({
            type: "Fix extraction",
            title: `${bill.vendor || "Unknown"} — ${bill.invoiceNo || "No inv #"}`,
            detail: "Missing or inconsistent invoice fields. Review before export."
          });
        }
        if (bill.reco === "Missing in 2B") {
          actions.push({
            type: "Not in 2B",
            title: `${bill.vendor || "Unknown"} — ${bill.invoiceNo || "No inv #"}`,
            detail: `ITC of ${money(billGst(bill))} in books but not in 2B. Verify with vendor.`
          });
        }
        if (bill.reco === "Mismatch") {
          actions.push({
            type: "Mismatch",
            title: `${bill.vendor || "Unknown"} — ${bill.invoiceNo || "No inv #"}`,
            detail: `${bill.recoNote}. Compare with original invoice.`
          });
        }
      });

      unmatched2bRows.forEach(r => {
        actions.push({
          type: "Missing in books",
          title: `${r.gstin || "Unknown"} — ${r.invoiceNo || "No inv #"}`,
          detail: `In 2B but not in books. Potential missed ITC of ${money(Number(r.cgst || 0) + Number(r.sgst || 0) + Number(r.igst || 0))}.`
        });
      });

      return actions;
    }

    function renderActions() {
      const actions = buildActions();
      if (!actions.length) {
        els.actions.innerHTML = `
          <div class="action-item">
            <div class="action-item-content">
              <div class="action-item-title">All clear</div>
              <div class="action-item-detail">No exceptions. Load bills and reconcile with 2B to generate action items.</div>
            </div>
            <span class="badge badge-ok">OK</span>
          </div>`;
        return;
      }

      els.actions.innerHTML = actions.map(a => {
        const cls = (a.type === "Missing in books" || a.type === "ITC review") ? "badge-warn" : "badge-bad";
        return `
          <div class="action-item">
            <div class="action-item-content">
              <div class="action-item-title">${escapeHtml(a.title)}</div>
              <div class="action-item-detail">${escapeHtml(a.detail)}</div>
            </div>
            <span class="badge ${cls}">${escapeHtml(a.type)}</span>
          </div>`;
      }).join("");
    }

    // =============================================================
    // WORKSPACE HELPERS
    // =============================================================

    function workspace() {
      return {
        clientName:   els.clientName.value || "Client",
        clientGstin:  els.clientGstin.value || "",
        returnPeriod: els.returnPeriod.value || "",
        preparedBy:   els.preparedBy.value || "CA Team",
        staffRate:    els.staffRate.value || "300"
      };
    }

    // =============================================================
    // CLIENT MESSAGE GENERATION
    // =============================================================

    function generateClientMessage() {
      if (!bills.length) {
        showToast("No bills to generate message for.", "error");
        return;
      }

      const ws = workspace();
      const actions = buildActions();
      const missing2b = bills.filter(b => b.reco === "Missing in 2B");
      const mismatches = bills.filter(b => b.reco === "Mismatch");
      const matched = bills.filter(b => b.reco === "Matched");

      const message = [
        `Dear ${ws.clientName},`,
        ``,
        `We have reviewed your purchase bills for ${ws.returnPeriod || "the selected period"} against GSTR-2B.`,
        ``,
        `Summary:`,
        `- Bills uploaded: ${bills.length}`,
        `- Matched with 2B: ${matched.length}`,
        `- Missing/mismatched in 2B: ${missing2b.length + mismatches.length}`,
        `- 2B invoices missing in books: ${unmatched2bRows.length}`,
        `- ITC ready to claim: ${els.itcReady.textContent}`,
        `- ITC needing review: ${els.itcRisk.textContent}`,
        `- Review confidence: ${els.qualityScore.textContent}`,
        ``,
        actions.length ? `Please provide clarification on these items:` : `No major exceptions are pending.`,
        ...actions.slice(0, 10).map((a, i) => `${i + 1}. ${a.title}: ${a.detail}`),
        actions.length > 10 ? `...and ${actions.length - 10} more items in the review report.` : ``,
        ``,
        `Regards,`,
        ws.preparedBy
      ].filter(l => l !== null).join("\n");

      els.clientMessage.value = message;
      setStatus("Client follow-up message generated.");
      addAudit("Generated client follow-up message.");
      showToast("Client message generated.", "success");
      return message;
    }

    // =============================================================
    // SMART FIXES
    // BUG FIX #2: Detect intra/inter-state and split GST correctly
    // =============================================================

    function applySmartFixes() {
      if (!bills.length) {
        showToast("No bills to fix. Extract bills first.", "error");
        return;
      }

      const clientGstin = els.clientGstin.value.trim().toUpperCase();
      const clientState = gstinStateCode(clientGstin);

      bills = bills.map(bill => {
        const fixed = { ...bill };

        // Normalize GSTIN and invoice number
        fixed.gstin = String(fixed.gstin || "").trim().toUpperCase();
        fixed.invoiceNo = String(fixed.invoiceNo || "").trim().toUpperCase();

        // Guess missing ledger and ITC type
        if (!fixed.itcType) fixed.itcType = guessItcType(`${fixed.vendor} ${fixed.ledger} ${fixed.raw || ""}`);
        if (!fixed.ledger || fixed.ledger === "Purchase Account") {
          fixed.ledger = guessLedger(`${fixed.vendor} ${fixed.raw || ""}`);
        }

        // Infer total if taxable + GST exist but total is missing
        const gst = billGst(fixed);
        if (!fixed.total && fixed.taxable) {
          fixed.total = String(Number(fixed.taxable || 0) + gst);
        }

        // BUG FIX #2: Infer GST split based on intra/inter-state
        if ((!fixed.cgst && !fixed.sgst && !fixed.igst) && fixed.taxable && fixed.total) {
          const inferredGst = Number(fixed.total || 0) - Number(fixed.taxable || 0);
          if (inferredGst > 0) {
            const supplierState = gstinStateCode(fixed.gstin);
            const isInterState = supplierState && clientState && supplierState !== clientState;

            if (isInterState) {
              // Inter-state: full amount goes to IGST
              fixed.igst = String(Math.round(inferredGst * 100) / 100);
            } else {
              // Intra-state (or unknown): split equally into CGST + SGST
              const half = Math.round((inferredGst / 2) * 100) / 100;
              fixed.cgst = String(half);
              fixed.sgst = String(half);
            }
          }
        }

        return fixed;
      });

      detectDuplicateRisk();
      invalidateApproval();
      setStatus("Smart fixes applied. Review exceptions before filing.");
      addAudit("Applied smart fixes (GSTIN normalization, GST split inference, ledger/ITC guessing, duplicate re-check).");
      showToast("Smart fixes applied.", "success");
      render();
    }

    // =============================================================
    // DOWNLOAD HELPERS
    // =============================================================

    function downloadBlob(filename, blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function downloadText(filename, text) {
      downloadBlob(filename, new Blob([text], { type: "text/plain;charset=utf-8" }));
    }

    const gstStateNames = {
      "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
      "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
      "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
      "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
      "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
      "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka",
      "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
      "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
      "97": "Other Territory"
    };

    function gstinChecksumValid(gstin) {
      const value = String(gstin || "").trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value)) return false;
      const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let factor = 2;
      let sum = 0;
      for (let i = value.length - 2; i >= 0; i -= 1) {
        const codePoint = chars.indexOf(value[i]);
        if (codePoint < 0) return false;
        const product = codePoint * factor;
        sum += Math.floor(product / 36) + (product % 36);
        factor = factor === 2 ? 1 : 2;
      }
      const checkCodePoint = (36 - (sum % 36)) % 36;
      return chars[checkCodePoint] === value[value.length - 1];
    }

    function parseInvoiceDate(value) {
      const text = String(value || "").trim();
      if (!text) return null;
      const numeric = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (numeric) {
        const year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
        return new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
      }
      const named = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
      if (named) {
        const date = new Date(`${named[2]} ${named[1]}, ${named[3]}`);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      return null;
    }

    function issue(severity, type, title, detail, billIndex = "") {
      return { severity, type, title, detail, billIndex };
    }

    function buildValidationIssues() {
      const issues = [];
      const clientState = String(els.clientGstin.value || "").slice(0, 2);
      const returnPeriod = String(els.returnPeriod.value || "");

      bills.forEach((bill, index) => {
        const label = `${bill.vendor || "Unknown supplier"} / ${bill.invoiceNo || "No invoice no"}`;
        const supplierState = String(bill.gstin || "").slice(0, 2);
        const gst = billGst(bill);
        const expectedTotal = Number(bill.taxable || 0) + gst;

        if (!isValidGstin(bill.gstin)) {
          issues.push(issue("critical", "GSTIN format", label, "Supplier GSTIN format is invalid or missing.", index + 1));
        } else if (!gstinChecksumValid(bill.gstin)) {
          issues.push(issue("warning", "GSTIN checksum", label, "GSTIN format is valid but checksum did not verify. Confirm against invoice/GST portal.", index + 1));
        }

        if (supplierState && !gstStateNames[supplierState]) {
          issues.push(issue("warning", "State code", label, `Supplier GSTIN state code ${supplierState} is not recognized.`, index + 1));
        }

        const invoiceDate = parseInvoiceDate(bill.date);
        if (returnPeriod && invoiceDate) {
          const billPeriod = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;
          if (billPeriod !== returnPeriod) {
            issues.push(issue("warning", "Return period", label, `Invoice date falls in ${billPeriod}, not selected return period ${returnPeriod}.`, index + 1));
          }
        } else if (!invoiceDate) {
          issues.push(issue("warning", "Date review", label, "Invoice date could not be parsed confidently.", index + 1));
        }

        if (clientState && supplierState && gstStateNames[clientState] && gstStateNames[supplierState]) {
          const hasIgst = Number(bill.igst || 0) > 0;
          const hasCgstSgst = Number(bill.cgst || 0) > 0 || Number(bill.sgst || 0) > 0;
          if (clientState === supplierState && hasIgst) {
            issues.push(issue("critical", "Tax mode", label, `Client and supplier are both ${gstStateNames[clientState]}, but IGST is present. Review tax mode.`, index + 1));
          }
          if (clientState !== supplierState && hasCgstSgst) {
            issues.push(issue("critical", "Tax mode", label, `Supplier is ${gstStateNames[supplierState]} and client is ${gstStateNames[clientState]}, but CGST/SGST is present. Review tax mode.`, index + 1));
          }
        }

        if (Math.abs(expectedTotal - Number(bill.total || 0)) > 2) {
          issues.push(issue("critical", "Total mismatch", label, `Taxable + GST is ${money(expectedTotal)}, but invoice total is ${money(Number(bill.total || 0))}.`, index + 1));
        }

        if (!bill.hsn) {
          issues.push(issue("warning", "HSN/SAC missing", label, "HSN/SAC is missing. This may be acceptable in some cases, but should be checked.", index + 1));
        }

        if (bill.risk === "Duplicate") {
          issues.push(issue("critical", "Duplicate", label, "Possible duplicate purchase entry. Confirm before claiming ITC.", index + 1));
        }

        if (bill.itcType === "Blocked / review") {
          issues.push(issue("warning", "ITC eligibility", label, "Potential blocked/personal ITC category. Qualified reviewer should decide eligibility.", index + 1));
        }

        if (!bill.reco) {
          issues.push(issue("warning", "2B not checked", label, "Bill has not yet been reconciled with GSTR-2B.", index + 1));
        }
      });

      unmatched2bRows.forEach(row => {
        issues.push(issue("warning", "2B only", `${row.gstin || "Unknown GSTIN"} / ${row.invoiceNo || "No invoice no"}`, "Invoice appears in 2B but is missing from uploaded books.", ""));
      });

      return issues;
    }

    function runValidationLab() {
      validationIssues = buildValidationIssues();
      const critical = validationIssues.filter(item => item.severity === "critical").length;
      const warnings = validationIssues.filter(item => item.severity === "warning").length;
      const possible = Math.max(1, bills.length * 7 + unmatched2bRows.length);
      const score = Math.max(0, Math.round(100 - ((critical * 10 + warnings * 4) / possible) * 100));

      els.validationScore.textContent = `${score}%`;
      els.criticalIssues.textContent = critical;
      els.warningIssues.textContent = warnings;
      els.validationBox.textContent = validationIssues.length
        ? validationIssues.map((item, index) => `${index + 1}. [${item.severity.toUpperCase()}] ${item.type} - ${item.title}\n${item.detail}`).join("\n\n")
        : "No validation issues found from the current rules. A qualified reviewer still needs to approve before filing.";

      setStatus(`Validation complete: ${critical} critical issue(s), ${warnings} warning(s).`);
      addAudit(`Ran validation lab. Critical: ${critical}, warnings: ${warnings}.`);
      showToast("Validation checks complete.", critical ? "error" : warnings ? "warning" : "success");
    }

    function downloadValidationCsv() {
      if (!validationIssues.length) runValidationLab();
      const rows = validationIssues.map(item => [item.severity, item.type, item.billIndex, item.title, item.detail]);
      downloadCsvBlob("gst-validation-exceptions.csv", toCsv([["Severity", "Type", "Bill Row", "Title", "Detail"], ...rows]));
      addAudit("Downloaded validation exception CSV.");
    }

    function download2bTemplate() {
      const template = "GSTIN,Invoice No,Taxable,CGST,SGST,IGST,Total\n27ABCDE1234F1Z5,INV-001,10000,900,900,0,11800";
      downloadCsvBlob("gstr-2b-template.csv", template);
      addAudit("Downloaded GSTR-2B CSV template.");
    }

    function suggestedPilotPrice() {
      const billCount = bills.length;
      const actionCount = buildActions().length;
      if (billCount >= 150 || actionCount >= 20) return "Rs.4,999/month after pilot";
      if (billCount >= 50 || actionCount >= 8) return "Rs.2,999/month after pilot";
      return "Rs.999/month after pilot";
    }

    function generatePilotPlan() {
      const ws = workspace();
      const actions = buildActions();
      const matched = bills.filter(b => b.reco === "Matched").length;
      const missing2b = bills.filter(b => b.reco === "Missing in 2B").length;
      const mismatch = bills.filter(b => b.reco === "Mismatch").length;
      const duplicate = bills.filter(b => b.risk === "Duplicate").length;
      const blocked = bills.filter(b => b.itcType === "Blocked / review").length;
      const plan = [
        `14-DAY PILOT PLAN`,
        ``,
        `Target customer: Small CA firm handling GST purchase review in Excel/Tally.`,
        `Pilot client file: ${ws.clientName || "One GST client"}`,
        `Return period: ${ws.returnPeriod || "Current month"}`,
        ``,
        `What we will prove in the pilot:`,
        `1. Extract purchase bill fields faster than manual Excel entry.`,
        `2. Match books against GSTR-2B and produce a clear exception list.`,
        `3. Identify missing 2B invoices, mismatches, possible duplicates, and blocked/review ITC.`,
        `4. Produce a client follow-up message and CA review pack.`,
        `5. Keep a human approval gate before any filing use.`,
        ``,
        `Current file metrics:`,
        `- Bills processed: ${bills.length}`,
        `- Matched with 2B: ${matched}`,
        `- Missing in 2B: ${missing2b}`,
        `- Mismatches: ${mismatch}`,
        `- Possible duplicates: ${duplicate}`,
        `- Blocked/review ITC cases: ${blocked}`,
        `- 2B invoices missing in books: ${unmatched2bRows.length}`,
        `- ITC ready: ${els.itcReady.textContent}`,
        `- ITC needing review: ${els.itcRisk.textContent}`,
        `- Review confidence: ${els.qualityScore.textContent}`,
        `- Estimated time saved: ${els.hoursSaved.textContent}`,
        `- Estimated staff cost saved: ${els.moneySaved.textContent}`,
        ``,
        `Pilot offer:`,
        `- Free 14-day pilot for 1-3 GST clients.`,
        `- We do not file returns and do not replace CA judgement.`,
        `- Your team verifies outputs before filing.`,
        `- If it saves at least 5 staff hours or catches material exceptions, continue at ${suggestedPilotPrice()}.`,
        ``,
        `Outreach message:`,
        `Hi, I am building a GST purchase review assistant for small CA firms. It helps extract purchase bills, match them with GSTR-2B, flag ITC issues, and prepare client follow-up messages. It does not file returns; it is a review tool for your staff. Can I run a free 14-day pilot on 1 client file and show you the time saved?`,
        ``,
        `Safety boundary:`,
        `This product should remain a review and reconciliation assistant until production security, OCR, user accounts, encryption, and legal review are complete.`
      ].join("\n");
      els.pilotPlanBox.value = plan;
      setStatus("Pilot plan generated.");
      addAudit("Generated pilot and sales plan.");
      showToast("Pilot plan generated.", "success");
      return plan;
    }

    function downloadCsvBlob(filename, csvText) {
      downloadBlob(filename, new Blob([csvText], { type: "text/csv;charset=utf-8" }));
    }

    // =============================================================
    // EXPORT: TALLY / ZOHO CSV
    // =============================================================

    function downloadCsv(filename, mode) {
      if (!bills.length) {
        showToast("No bills to export.", "error");
        return;
      }
      const header = mode === "zoho"
        ? ["Vendor Name", "GSTIN", "Bill Number", "Bill Date", "HSN/SAC", "Taxable Amount", "CGST", "SGST", "IGST", "Total", "Expense Account"]
        : ["Ledger", "Supplier", "GSTIN", "Invoice No", "Invoice Date", "HSN/SAC", "Taxable Value", "CGST", "SGST", "IGST", "Invoice Total", "Narration"];

      const rows = bills.map(b => mode === "zoho"
        ? [b.vendor, b.gstin, b.invoiceNo, b.date, b.hsn, b.taxable, b.cgst, b.sgst, b.igst, b.total, b.ledger]
        : [b.ledger, b.vendor, b.gstin, b.invoiceNo, b.date, b.hsn, b.taxable, b.cgst, b.sgst, b.igst, b.total, `Purchase bill ${b.invoiceNo || ""} from ${b.vendor || "supplier"}`]);

      downloadCsvBlob(filename, toCsv([header, ...rows]));
      addAudit(`Exported ${mode} CSV (${bills.length} bills).`);
      showToast(`${mode === "zoho" ? "Zoho" : "Tally"} CSV downloaded.`, "success");
    }

    // =============================================================
    // EXPORT: RECO REPORT
    // =============================================================

    function downloadRecoReport() {
      if (!bills.length) {
        showToast("No bills to export.", "error");
        return;
      }
      const header = ["Reco Status", "Reco Note", "Vendor", "GSTIN", "Invoice No", "Date", "Taxable", "CGST", "SGST", "IGST", "Total"];
      const rows = bills.map(b => [b.reco || "Not checked", b.recoNote || "", b.vendor, b.gstin, b.invoiceNo, b.date, b.taxable, b.cgst, b.sgst, b.igst, b.total]);
      downloadCsvBlob("gst-2b-reconciliation-report.csv", toCsv([header, ...rows]));
      addAudit("Downloaded reconciliation report CSV.");
      showToast("Reconciliation report downloaded.", "success");
    }

    // =============================================================
    // EXPORT: CA REVIEW PACK
    // =============================================================

    function downloadReviewPack() {
      if (!bills.length) {
        showToast("No bills to generate review pack for.", "error");
        return;
      }

      const ws = workspace();
      const actions = buildActions();
      const lines = [
        `GST Review Pack`,
        `${"=".repeat(40)}`,
        `Client: ${ws.clientName}`,
        `Client GSTIN: ${ws.clientGstin}`,
        `Return Period: ${ws.returnPeriod}`,
        `Prepared By: ${ws.preparedBy}`,
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        ``,
        `SUMMARY`,
        `${"-".repeat(40)}`,
        `Bills extracted: ${bills.length}`,
        `Taxable value: ${els.taxable.textContent}`,
        `Total GST: ${els.gst.textContent}`,
        `ITC ready: ${els.itcReady.textContent}`,
        `ITC at risk: ${els.itcRisk.textContent}`,
        `Review confidence: ${els.qualityScore.textContent}`,
        `2B invoices missing in books: ${unmatched2bRows.length}`,
        `Priority actions: ${actions.length}`,
        ``,
        `ACTION ITEMS`,
        `${"-".repeat(40)}`,
        ...(actions.length ? actions.map((a, i) => `${i + 1}. [${a.type}] ${a.title} — ${a.detail}`) : ["No action items."]),
        ``,
        `BILL DETAILS`,
        `${"-".repeat(40)}`,
        ...bills.map(b => `${b.reco || "Not checked"} | ${b.vendor} | ${b.gstin} | ${b.invoiceNo} | Taxable ${b.taxable} | GST ${billGst(b)} | Total ${b.total} | ITC: ${b.itcType} | Risk: ${b.risk || "None"}`),
        ``,
        `2B-ONLY INVOICES (missing in books)`,
        `${"-".repeat(40)}`,
        ...(unmatched2bRows.length ? unmatched2bRows.map(r => `${r.gstin} | ${r.invoiceNo} | Taxable ${r.taxable} | GST ${Number(r.cgst || 0) + Number(r.sgst || 0) + Number(r.igst || 0)} | Total ${r.total}`) : ["None"]),
        ``,
        `DISCLAIMER`,
        `${"-".repeat(40)}`,
        `This review pack is generated by GST Bill Assistant (prototype). It does not constitute tax advice.`,
        `A qualified reviewer must verify all data before filing.`
      ];

      downloadText("gst-ca-review-pack.txt", lines.join("\n"));
      setStatus("CA review pack downloaded.");
      addAudit("Downloaded CA review pack.");
      showToast("CA review pack downloaded.", "success");
    }

    // =============================================================
    // EXPORT: REVIEWED APPROVED CSV
    // =============================================================

    function downloadReviewedCsv() {
      if (!bills.length) {
        showToast("No bills to export.", "error");
        return;
      }
      if (!approvedAt || !approvalChecklistComplete()) {
        showToast("Complete the approval checklist before exporting reviewed data.", "error");
        return;
      }

      const ws = workspace();
      const header = ["Client", "Client GSTIN", "Return Period", "Reviewer", "Approval Time", "Reco Status", "Risk", "ITC Type", "Vendor", "GSTIN", "Invoice No", "Date", "Taxable", "CGST", "SGST", "IGST", "Total", "Ledger"];
      const rows = bills.map(b => [
        ws.clientName, ws.clientGstin, ws.returnPeriod,
        els.reviewerName.value.trim(), approvedAt,
        b.reco || "Not checked", b.risk || "", b.itcType || "",
        b.vendor, b.gstin, b.invoiceNo, b.date,
        b.taxable, b.cgst, b.sgst, b.igst, b.total, b.ledger
      ]);

      downloadCsvBlob("gst-reviewed-approved-export.csv", toCsv([header, ...rows]));
      setStatus("Reviewed approved export downloaded.");
      addAudit("Downloaded reviewed approved export.");
      showToast("Reviewed export downloaded.", "success");
    }

    // =============================================================
    // APPROVAL WORKFLOW
    // =============================================================

    function approvalChecklistComplete() {
      return Boolean(
        els.reviewerName.value.trim()
        && els.checkSource.checked
        && els.checkExceptions.checked
        && els.checkEligibility.checked
        && els.checkNoAutoFile.checked
      );
    }

    function approveReview() {
      if (!bills.length) {
        showToast("No bills to approve.", "error");
        return;
      }
      if (!approvalChecklistComplete()) {
        showToast("Complete all safety checks and enter reviewer name.", "error");
        addAudit("Approval blocked: safety checklist incomplete.");
        return;
      }
      approvedAt = new Date().toISOString();
      const reviewer = els.reviewerName.value.trim();
      setStatus(`Review approved by ${reviewer}.`);
      addAudit(`Review approved by ${reviewer}.`);
      showToast(`Review approved by ${reviewer}.`, "success");
      updateWorkflow();
      render();
    }

    // =============================================================
    // SAVE / LOAD / EXPORT / IMPORT WORK FILES
    // =============================================================

    function saveWorkspace() {
      if (!bills.length) {
        showToast("Nothing to save. Extract bills first.", "error");
        return;
      }

      const data = {
        workspace: workspace(),
        invoiceText: els.text.value,
        bills, gstr2bRows, unmatched2bRows,
        clientMessage: els.clientMessage.value,
        auditEvents, approvedAt
      };

      localStorage.setItem("gstBillAssistantWorkspace", JSON.stringify(data));

      // Track saved clients for dashboard count
      const savedClients = JSON.parse(localStorage.getItem("gstBillAssistantClients") || "{}");
      const key = `${data.workspace.clientGstin || data.workspace.clientName || "client"}-${data.workspace.returnPeriod || "period"}`;
      savedClients[key] = {
        clientName: data.workspace.clientName,
        clientGstin: data.workspace.clientGstin,
        returnPeriod: data.workspace.returnPeriod,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem("gstBillAssistantClients", JSON.stringify(savedClients));
      localStorage.setItem("gstBillAssistantClientCount", String(Object.keys(savedClients).length || 1));

      setStatus(`Saved ${data.workspace.clientName || "client"} to browser storage.`);
      addAudit("Saved client work file to browser storage.");
      showToast("Client saved to browser.", "success");
      updateRoiMetrics();
    }

    function loadWorkspace() {
      const raw = localStorage.getItem("gstBillAssistantWorkspace");
      if (!raw) {
        showToast("No saved client found in this browser.", "error");
        return;
      }

      // Confirmation dialog to prevent accidental data loss
      if (bills.length && !confirm("Loading will replace your current work. Continue?")) return;

      const data = JSON.parse(raw);
      applyWorkspaceData(data);
      setStatus(`Loaded ${data.workspace?.clientName || "saved client"}.`);
      addAudit("Loaded saved client from browser storage.");
      showToast("Client loaded.", "success");
    }

    function applyWorkspaceData(data) {
      els.clientName.value = data.workspace?.clientName || "";
      els.clientGstin.value = data.workspace?.clientGstin || "";
      els.returnPeriod.value = data.workspace?.returnPeriod || "";
      els.preparedBy.value = data.workspace?.preparedBy || "";
      els.staffRate.value = data.workspace?.staffRate || "300";
      els.text.value = data.invoiceText || "";

      // Structural validation: ensure bills have expected shape
      bills = Array.isArray(data.bills) ? data.bills.map(b => ({
        id: b.id || String(Date.now()),
        vendor: String(b.vendor || ""),
        gstin: String(b.gstin || ""),
        invoiceNo: String(b.invoiceNo || ""),
        date: String(b.date || ""),
        hsn: String(b.hsn || ""),
        taxable: String(b.taxable || ""),
        cgst: String(b.cgst || ""),
        sgst: String(b.sgst || ""),
        igst: String(b.igst || ""),
        total: String(b.total || ""),
        ledger: String(b.ledger || ""),
        itcType: String(b.itcType || ""),
        risk: String(b.risk || ""),
        reco: String(b.reco || ""),
        recoNote: String(b.recoNote || ""),
        raw: String(b.raw || "")
      })) : [];

      gstr2bRows = Array.isArray(data.gstr2bRows) ? data.gstr2bRows : [];
      unmatched2bRows = Array.isArray(data.unmatched2bRows) ? data.unmatched2bRows : [];
      auditEvents = Array.isArray(data.auditEvents) ? data.auditEvents : [];
      approvedAt = data.approvedAt || "";
      els.clientMessage.value = data.clientMessage || "";

      detectDuplicateRisk();
      render();
    }

    function currentWorkFile() {
      return {
        version: "gst-bill-assistant-v1",
        exportedAt: new Date().toISOString(),
        workspace: workspace(),
        invoiceText: els.text.value,
        bills, gstr2bRows, unmatched2bRows,
        clientMessage: els.clientMessage.value,
        auditEvents, approvedAt
      };
    }

    function exportWorkFile() {
      if (!bills.length) {
        showToast("Nothing to export. Extract bills first.", "error");
        return;
      }
      const data = currentWorkFile();
      const safeName = `${data.workspace.clientName || "client"}-${data.workspace.returnPeriod || "period"}`.replace(/[^a-z0-9\-]+/gi, "-").toLowerCase();
      downloadBlob(`${safeName}-gst-work-file.json`, new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }));
      setStatus("Work file exported as JSON.");
      addAudit("Exported local JSON work file.");
      showToast("Work file exported.", "success");
    }

    function importWorkFileText(text) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        showToast("Invalid JSON file.", "error");
        return;
      }

      if (data.version !== "gst-bill-assistant-v1") {
        showToast("Unsupported work file version.", "error");
        return;
      }

      if (bills.length && !confirm("Importing will replace your current work. Continue?")) return;

      applyWorkspaceData(data);
      addAudit("Imported local JSON work file.");
      setStatus("Work file imported.");
      showToast("Work file imported.", "success");
    }

    // =============================================================
    // HSN-WISE SUMMARY (for GSTR-1 / GSTR-9)
    // =============================================================

    function renderHsnSummary() {
      if (!bills.length) {
        els.hsnContent.innerHTML = '<div class="summary-empty">Extract bills to see HSN-wise summary.</div>';
        return;
      }

      const groups = {};
      bills.forEach(b => {
        const hsn = b.hsn || "Not specified";
        if (!groups[hsn]) groups[hsn] = { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
        groups[hsn].count++;
        groups[hsn].taxable += Number(b.taxable || 0);
        groups[hsn].cgst += Number(b.cgst || 0);
        groups[hsn].sgst += Number(b.sgst || 0);
        groups[hsn].igst += Number(b.igst || 0);
        groups[hsn].total += Number(b.total || 0);
      });

      const sorted = Object.entries(groups).sort((a, b) => b[1].taxable - a[1].taxable);
      const totals = { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      sorted.forEach(([, g]) => {
        totals.count += g.count;
        totals.taxable += g.taxable;
        totals.cgst += g.cgst;
        totals.sgst += g.sgst;
        totals.igst += g.igst;
        totals.total += g.total;
      });

      els.hsnContent.innerHTML = `
        <table class="summary-table">
          <thead>
            <tr>
              <th>HSN/SAC</th>
              <th class="num">Invoices</th>
              <th class="num">Taxable</th>
              <th class="num">CGST</th>
              <th class="num">SGST</th>
              <th class="num">IGST</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([hsn, g]) => `
              <tr>
                <td><strong>${escapeHtml(hsn)}</strong></td>
                <td class="num">${g.count}</td>
                <td class="num">${money(g.taxable)}</td>
                <td class="num">${money(g.cgst)}</td>
                <td class="num">${money(g.sgst)}</td>
                <td class="num">${money(g.igst)}</td>
                <td class="num">${money(g.total)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td class="num">${totals.count}</td>
              <td class="num">${money(totals.taxable)}</td>
              <td class="num">${money(totals.cgst)}</td>
              <td class="num">${money(totals.sgst)}</td>
              <td class="num">${money(totals.igst)}</td>
              <td class="num">${money(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    // =============================================================
    // VENDOR-WISE SUMMARY
    // =============================================================

    function renderVendorSummary() {
      if (!bills.length) {
        els.vendorContent.innerHTML = '<div class="summary-empty">Extract bills to see vendor-wise summary.</div>';
        return;
      }

      const groups = {};
      bills.forEach(b => {
        const vendor = b.vendor || "Unknown";
        if (!groups[vendor]) groups[vendor] = { gstin: b.gstin, count: 0, taxable: 0, gst: 0, total: 0, itcReady: 0, itcRisk: 0 };
        groups[vendor].count++;
        groups[vendor].taxable += Number(b.taxable || 0);
        const gst = billGst(b);
        groups[vendor].gst += gst;
        groups[vendor].total += Number(b.total || 0);
        if (b.reco === "Matched" && b.itcType !== "Blocked / review" && b.risk !== "Duplicate") {
          groups[vendor].itcReady += gst;
        } else if (b.reco) {
          groups[vendor].itcRisk += gst;
        }
      });

      const sorted = Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
      const totals = { count: 0, taxable: 0, gst: 0, total: 0, itcReady: 0, itcRisk: 0 };
      sorted.forEach(([, g]) => {
        totals.count += g.count;
        totals.taxable += g.taxable;
        totals.gst += g.gst;
        totals.total += g.total;
        totals.itcReady += g.itcReady;
        totals.itcRisk += g.itcRisk;
      });

      els.vendorContent.innerHTML = `
        <table class="summary-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>GSTIN</th>
              <th class="num">Bills</th>
              <th class="num">Taxable</th>
              <th class="num">GST</th>
              <th class="num">Total</th>
              <th class="num">ITC Ready</th>
              <th class="num">ITC Risk</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([vendor, g]) => `
              <tr>
                <td><strong>${escapeHtml(vendor)}</strong></td>
                <td style="font-size:12px;color:var(--ink-secondary)">${escapeHtml(g.gstin || "—")}</td>
                <td class="num">${g.count}</td>
                <td class="num">${money(g.taxable)}</td>
                <td class="num">${money(g.gst)}</td>
                <td class="num">${money(g.total)}</td>
                <td class="num" style="color:var(--success)">${money(g.itcReady)}</td>
                <td class="num" style="color:var(--warning)">${money(g.itcRisk)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num">${totals.count}</td>
              <td class="num">${money(totals.taxable)}</td>
              <td class="num">${money(totals.gst)}</td>
              <td class="num">${money(totals.total)}</td>
              <td class="num" style="color:var(--success)">${money(totals.itcReady)}</td>
              <td class="num" style="color:var(--warning)">${money(totals.itcRisk)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    // =============================================================
    // TAB SWITCHING
    // =============================================================

    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const panel = document.getElementById("tab-" + tab.dataset.tab);
        if (panel) panel.classList.add("active");
      });
    });

    // =============================================================
    // MULTI-CLIENT LIST
    // =============================================================

    function getSavedClients() {
      try {
        return JSON.parse(localStorage.getItem("gstBillAssistantClients") || "{}");
      } catch (e) {
        return {};
      }
    }

    function renderClientList() {
      const clients = getSavedClients();
      const keys = Object.keys(clients);

      if (!keys.length) {
        els.clientListContainer.innerHTML = '<p class="section-hint" style="margin:0">No saved clients yet.</p>';
        return;
      }

      els.clientListContainer.innerHTML = keys.map(key => {
        const c = clients[key];
        return `
          <div class="client-item" data-client-key="${escapeHtml(key)}">
            <div class="client-item-info">
              <div class="client-item-name">${escapeHtml(c.clientName || "Unnamed")}</div>
              <div class="client-item-period">${escapeHtml(c.returnPeriod || "No period")} · ${escapeHtml(c.clientGstin || "")}</div>
            </div>
            <button class="client-item-delete" data-delete-key="${escapeHtml(key)}" title="Delete">&times;</button>
          </div>
        `;
      }).join("");

      // Click to load
      els.clientListContainer.querySelectorAll(".client-item-info").forEach(el => {
        el.addEventListener("click", () => {
          const key = el.closest(".client-item").dataset.clientKey;
          loadClientByKey(key);
        });
      });

      // Click to delete
      els.clientListContainer.querySelectorAll(".client-item-delete").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const key = btn.dataset.deleteKey;
          if (!confirm("Delete this saved client?")) return;
          const clients = getSavedClients();
          delete clients[key];
          localStorage.setItem("gstBillAssistantClients", JSON.stringify(clients));
          localStorage.setItem("gstBillAssistantClientCount", String(Object.keys(clients).length || 1));
          renderClientList();
          updateRoiMetrics();
          showToast("Client deleted.", "success");
        });
      });
    }

    function loadClientByKey(key) {
      const raw = localStorage.getItem("gstBillAssistantWorkspace");
      if (!raw) {
        showToast("No saved workspace found.", "error");
        return;
      }
      // For now, the single-workspace save/load still applies.
      // In a production version, each client key would have its own workspace.
      if (bills.length && !confirm("Loading will replace your current work. Continue?")) return;
      const data = JSON.parse(raw);
      applyWorkspaceData(data);
      setStatus(`Loaded ${data.workspace?.clientName || "saved client"}.`);
      addAudit("Loaded saved client from browser storage.");
      showToast("Client loaded.", "success");
    }


    // =============================================================
    // WORKFLOW PROGRESS TRACKER
    // =============================================================

    function updateWorkflow() {
      const hasText = (els.text.value || "").trim().length > 10;
      const hasBills = bills.length > 0;
      const has2b = gstr2bRows.length > 0;
      const hasReco = bills.some(b => b.reco && b.reco !== "");
      const hasApproval = !!approvedAt;
      document.getElementById("wf1").dataset.done = hasText;
      document.getElementById("wf2").dataset.done = hasBills;
      document.getElementById("wf3").dataset.done = has2b;
      document.getElementById("wf4").dataset.done = hasReco;
      document.getElementById("wf5").dataset.done = hasApproval;
    }

    // =============================================================
    // AI EXTRACTION
    // =============================================================

    async function extractWithAI() {
      const raw = (els.text.value || "").trim();
      if (!raw) { showToast("Paste invoice text first.", "error"); return; }
      const apiKey = (els.aiApiKey.value || "").trim();
      if (!apiKey.startsWith("sk-ant-")) { showToast("Enter a valid Anthropic API key (sk-ant-...).", "error"); return; }
      els.aiExtractBtn.disabled = true;
      els.aiExtractBtn.textContent = "Extracting...";
      els.aiStatus.textContent = "Sending to Claude...";
      const systemPrompt = "You are a GST invoice data extraction expert for Indian CA firms. Extract ALL invoices from the text. Return ONLY a valid JSON array, no markdown, no explanation. Each invoice: { vendor, gstin, invoiceNo, date, hsn, taxable, cgst, sgst, igst, total, ledger, itcType } Amounts are number strings without symbols. gstin: uppercase 15-char else empty string. ledger: one of [Office Expenses, Software Expenses, Packing Material, Freight & Courier, Hotel & Travel, Food & Beverages, Capital Goods, Purchase Account]. itcType: one of [Input goods, Input service, Capital goods, Blocked / review]. Blocked: hotel/food/restaurant/club/cab/personal. Capital: machinery/laptop/computer/equipment. Service: cloud/SaaS/freight/consulting. Missing fields use empty string.";
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: AI_MODEL, max_tokens: 4000, system: systemPrompt, messages: [{ role: "user", content: raw }] })
        });
        if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message || "API " + resp.status); }
        const data = await resp.json();
        const txt = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
        const parsed = JSON.parse(txt.replace(/```json|```/gi,"").trim());
        if (!Array.isArray(parsed)||!parsed.length) throw new Error("No invoices found.");
        bills = parsed.map((item,i) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+i),
          vendor: String(item.vendor||""), gstin: String(item.gstin||"").toUpperCase(),
          invoiceNo: String(item.invoiceNo||""), date: String(item.date||""),
          hsn: String(item.hsn||""), taxable: String(item.taxable||""),
          cgst: String(item.cgst||""), sgst: String(item.sgst||""),
          igst: String(item.igst||""), total: String(item.total||""),
          ledger: String(item.ledger||"Purchase Account"),
          itcType: String(item.itcType||"Input goods"),
          risk:"", reco:"", recoNote:"", raw: raw
        }));
        detectDuplicateRisk(); invalidateApproval();
        const n = bills.length;
        setStatus("AI extracted " + n + " bill" + (n===1?"":"s") + ".");
        addAudit("AI (Claude) extracted " + n + " bill(s).");
        showToast("AI extracted " + n + " bill" + (n===1?"":"s") + ".", "success");
        els.aiStatus.textContent = n + " bill" + (n===1?"":"s") + " extracted";
        render(); updateWorkflow();
      } catch(err) {
        showToast("AI error: " + err.message, "error");
        els.aiStatus.textContent = "Error: " + err.message;
      } finally {
        els.aiExtractBtn.disabled = false;
        els.aiExtractBtn.textContent = "AI Extract";
      }
    }

    // =============================================================
    // AI EXPLAIN EXCEPTIONS
    // =============================================================

    async function aiExplainExceptions() {
      const apiKey = (els.aiApiKey.value || "").trim();
      if (!apiKey.startsWith("sk-ant-")) { showToast("Enter your Anthropic API key first.", "error"); return; }
      if (!bills.length) { showToast("Extract bills first.", "error"); return; }
      els.aiExplainBtn.disabled = true;
      els.aiExplainBtn.textContent = "Analysing...";
      els.aiExplainPanel.textContent = "Claude is reviewing your exceptions...";
      const ws = workspace();
      const actions = buildActions();
      const missing2b = bills.filter(b=>b.reco==="Missing in 2B").length;
      const mismatch = bills.filter(b=>b.reco==="Mismatch").length;
      const blocked = bills.filter(b=>b.itcType==="Blocked / review").length;
      const dupes = bills.filter(b=>b.risk==="Duplicate").length;
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({
            model: AI_MODEL, max_tokens: 1200,
            system: "You are a senior GST consultant in India. Explain GST exceptions to CA firm staff in clear plain English. Be practical and actionable. Use short bullet points. No markdown headers.",
            messages: [{ role: "user", content: "Client: " + ws.clientName + " | Period: " + ws.returnPeriod + " | Total bills: " + bills.length + "\n\nExceptions:\n- " + missing2b + " bills missing in GSTR-2B\n- " + mismatch + " value mismatches\n- " + blocked + " blocked ITC items\n- " + dupes + " possible duplicates\n\nTop actions:\n" + actions.slice(0,15).join("\n") + "\n\nExplain each exception type, the GST risk, and what to do next. Keep it under 300 words." }]
          })
        });
        if (!resp.ok) throw new Error("API " + resp.status);
        const data = await resp.json();
        const txt = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
        els.aiExplainPanel.textContent = txt;
        addAudit("AI explained exceptions.");
      } catch(err) {
        els.aiExplainPanel.textContent = "Error: " + err.message;
        showToast("AI error: " + err.message, "error");
      } finally {
        els.aiExplainBtn.disabled = false;
        els.aiExplainBtn.textContent = "Explain Now";
      }
    }

    // =============================================================
    // TALLY XML EXPORT
    // =============================================================

    function downloadTallyXml() {
      if (!bills.length) { showToast("No bills to export.", "error"); return; }
      const ws = workspace();
      const entries = bills.map(b => {
        const dt = (b.date||"").replace(/[^0-9]/g,"").padEnd(8,"0");
        return "<VOUCHER VCHTYPE=\"Purchase\" ACTION=\"Create\"><DATE>" + dt + "</DATE><NARRATION>Invoice " + escapeHtml(b.invoiceNo||"") + " from " + escapeHtml(b.vendor||"") + "</NARRATION><ALLLEDGERENTRIES.LIST><LEDGERNAME>" + escapeHtml(b.ledger||"Purchase Account") + "</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-" + (b.taxable||0) + "</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>CGST</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-" + (b.cgst||0) + "</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>SGST</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-" + (b.sgst||0) + "</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>IGST</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-" + (b.igst||0) + "</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>" + escapeHtml(b.vendor||"Sundry Creditors") + "</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>" + (b.total||0) + "</AMOUNT><GSTIN>" + escapeHtml(b.gstin||"") + "</GSTIN></ALLLEDGERENTRIES.LIST></VOUCHER>";
      }).join("\n");
      const xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>" + escapeHtml(ws.clientName||"") + "</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA>" + entries + "</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>";
      downloadText("gst-bills-tally.xml", xml);
      addAudit("Downloaded Tally XML export.");
      showToast("Tally XML downloaded.", "success");
    }

    // =============================================================
    // WHATSAPP MESSAGE
    // =============================================================

    function generateWhatsAppMessage() {
      if (!bills.length) { showToast("Extract bills first.", "error"); return; }
      const ws = workspace();
      const actions = buildActions();
      const missing = bills.filter(b=>b.reco==="Missing in 2B").length;
      const blocked = bills.filter(b=>b.itcType==="Blocked / review").length;
      const dupes = bills.filter(b=>b.risk==="Duplicate").length;
      const itcRiskAmt = bills.filter(b=>(b.reco&&b.reco!=="Matched")||b.itcType==="Blocked / review").reduce((s,b)=>s+billGst(b),0);
      let msg = "*GST Purchase Review - " + ws.returnPeriod + "*\nClient: " + ws.clientName + "\n\n";
      msg += "Summary:\n- Bills: " + bills.length + "\n- Total GST: " + money(bills.reduce((s,b)=>s+billGst(b),0)) + "\n- ITC at risk: " + money(itcRiskAmt) + "\n\n";
      if (missing) msg += missing + " bill(s) missing in GSTR-2B - ITC cannot be claimed until vendor files.\n\n";
      if (blocked) msg += blocked + " blocked ITC item(s) - Hotel/food not eligible under Sec 17(5).\n\n";
      if (dupes) msg += dupes + " possible duplicate invoice(s) - Please verify.\n\n";
      if (actions.length) { msg += "Action required:\n"; actions.slice(0,5).forEach(a=>{ msg += "- " + a + "\n"; }); }
      msg += "\n_Reviewed using GST Bill Assistant. CA review pending._";
      window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
      addAudit("Generated WhatsApp message.");
    }

    // =============================================================
    // FEE CALCULATOR
    // =============================================================

    function calculateFee() {
      const rate = Number((document.getElementById("feeHourlyRate").value||"").replace(/,/g,"")) || 1500;
      const budget = Number((document.getElementById("feeClientBudget").value||"").replace(/,/g,"")) || 3000;
      const manualH = Number(document.getElementById("feeManualHours").value) || 8;
      const toolH = Number(document.getElementById("feeToolHours").value) || 1.5;
      const yourCost = toolH * rate;
      const clientSaves = (manualH - toolH) * rate;
      const suggested = Math.min(budget, Math.max(yourCost * 2, clientSaves * 0.3));
      const margin = suggested > 0 ? Math.round(((suggested - yourCost) / suggested) * 100) : 0;
      const roi = yourCost > 0 ? (clientSaves / yourCost).toFixed(1) : "INF";
      els.feeSuggestedCharge.textContent = money(Math.round(suggested));
      els.feeYourMargin.textContent = margin + "%";
      els.feeClientRoi.textContent = roi + "x";
      els.feeResults.style.display = "block";
      const ws = workspace();
      const clientName = ws.clientName || "this client";
      els.feePitch.innerHTML = "<strong>Sales pitch:</strong><br><br>Our GST purchase review used to take " + manualH + " hours of staff time monthly. With our tool, we complete the same review in " + toolH + " hours - catching missing 2B entries, blocked ITC, duplicates and mismatches automatically. Your monthly fee of Rs." + Math.round(suggested).toLocaleString("en-IN") + " gives you a full reviewed purchase register, reconciliation report and action checklist. That is " + money(Math.round(clientSaves)) + " in staff cost savings every month.";
    }

    // =============================================================
    // MONTH-ON-MONTH TREND
    // =============================================================

    function saveTrend() {
      if (!bills.length) { showToast("Extract bills first.", "error"); return; }
      const ws = workspace();
      const period = ws.returnPeriod || new Date().toISOString().slice(0,7);
      const key = "gstTrend_" + period;
      const entry = {
        period, client: ws.clientName,
        bills: bills.length,
        taxable: bills.reduce((s,b)=>s+Number(b.taxable||0),0),
        gst: bills.reduce((s,b)=>s+billGst(b),0),
        issues: bills.filter(b=>rowStatus(b)!=="Ready").length,
        itcRisk: bills.filter(b=>(b.reco&&b.reco!=="Matched")||b.itcType==="Blocked / review").reduce((s,b)=>s+billGst(b),0)
      };
      try {
        const all = JSON.parse(localStorage.getItem("gstTrendData")||"{}");
        all[key] = entry;
        localStorage.setItem("gstTrendData", JSON.stringify(all));
        showToast("Month saved to trend.", "success");
        addAudit("Saved trend for " + period + ".");
        renderTrend();
      } catch(e) { showToast("Could not save trend.", "error"); }
    }

    function renderTrend() {
      try {
        const all = JSON.parse(localStorage.getItem("gstTrendData")||"{}");
        const entries = Object.values(all).sort((a,b)=>a.period.localeCompare(b.period)).slice(-6);
        if (!entries.length) { els.trendContent.innerHTML = "<div style=\"color:var(--ink-muted);font-size:13px;\">Save at least one month to see trends.</div>"; return; }
        const maxT = Math.max(...entries.map(e=>e.taxable),1);
        const maxG = Math.max(...entries.map(e=>e.gst),1);
        let h = "<div style=\"margin-bottom:14px;\"><div style=\"font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:6px;\">TAXABLE VALUE</div><div class=\"trend-bar-wrap\">";
        entries.forEach(e => { const p=Math.round((e.taxable/maxT)*100); h+="<div class=\"trend-bar-row\"><span class=\"trend-bar-label\">" + e.period + "</span><div class=\"trend-bar-track\"><div class=\"trend-bar-fill\" style=\"width:" + p + "%\"></div></div><span class=\"trend-bar-value\">" + money(e.taxable) + "</span></div>"; });
        h += "</div></div><div><div style=\"font-size:12px;font-weight:600;color:var(--ink-muted);margin-bottom:6px;\">TOTAL GST</div><div class=\"trend-bar-wrap\">";
        entries.forEach(e => { const p=Math.round((e.gst/maxG)*100); h+="<div class=\"trend-bar-row\"><span class=\"trend-bar-label\">" + e.period + "</span><div class=\"trend-bar-track\"><div class=\"trend-bar-fill\" style=\"width:" + p + "%;background:var(--success)\"></div></div><span class=\"trend-bar-value\">" + money(e.gst) + "</span></div>"; });
        h += "</div></div>";
        els.trendContent.innerHTML = h;
      } catch(e) { els.trendContent.innerHTML = "<div style=\"color:var(--ink-muted);\">Could not load trend.</div>"; }
    }

    // =============================================================
    // DARK MODE
    // =============================================================

    function toggleDarkMode() {
      document.body.classList.toggle("dark-mode");
      const dark = document.body.classList.contains("dark-mode");
      els.darkModeBtn.textContent = dark ? "Light" : "Dark";
      localStorage.setItem("gstDarkMode", dark ? "1" : "0");
    }


    // =============================================================
    // PDF & IMAGE EXTRACTION
    // =============================================================

    async function extractTextFromPDF(file) {
      return new Promise(async (resolve, reject) => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n---\n';
          }
          resolve(fullText.trim());
        } catch (err) {
          reject(err);
        }
      });
    }

    async function extractTextFromImage(file) {
      return new Promise(async (resolve, reject) => {
        try {
          const result = await Tesseract.recognize(file, 'eng+hin', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const prog = Math.round(m.progress * 100);
                const el = document.getElementById('pdfUploadProgress');
                if (el) { el.textContent = 'OCR: ' + prog + '%'; el.className = 'upload-progress processing'; }
              }
            }
          });
          resolve(result.data.text);
        } catch (err) {
          reject(err);
        }
      });
    }

    async function handlePdfImageUpload(files) {
      if (!files || !files.length) return;
      const progressEl = document.getElementById('pdfUploadProgress');
      const dropZoneIcon = document.querySelector('#pdfDropZone .upload-drop-zone-icon');

      const isPdfJsLoaded = typeof pdfjsLib !== 'undefined';
      const isTesseractLoaded = typeof Tesseract !== 'undefined';

      let allText = (els.text.value || '').trim();
      let processed = 0;
      const total = files.length;

      for (const file of files) {
        const name = file.name.toLowerCase();
        progressEl.className = 'upload-progress processing';
        progressEl.textContent = 'Processing ' + file.name + ' (' + (processed + 1) + '/' + total + ')...';
        if (dropZoneIcon) dropZoneIcon.textContent = '⏳';

        try {
          let extracted = '';
          if (name.endsWith('.pdf')) {
            if (!isPdfJsLoaded) throw new Error('PDF.js not loaded. Check your internet connection.');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';
            extracted = await extractTextFromPDF(file);
          } else if (/\.(jpg|jpeg|png|webp|bmp|tiff?)$/.test(name)) {
            if (!isTesseractLoaded) throw new Error('Tesseract OCR not loaded. Check your internet connection.');
            extracted = await extractTextFromImage(file);
          } else {
            const text = await file.text();
            extracted = text;
          }

          if (extracted && extracted.trim()) {
            allText = allText ? allText + '\n---\n' + extracted.trim() : extracted.trim();
          }
          processed++;
        } catch (err) {
          progressEl.textContent = 'Error on ' + file.name + ': ' + err.message;
          progressEl.className = 'upload-progress error';
          showToast('Error processing ' + file.name + ': ' + err.message, 'error');
        }
      }

      els.text.value = allText;
      if (dropZoneIcon) dropZoneIcon.textContent = '✓';
      progressEl.textContent = processed + ' file' + (processed === 1 ? '' : 's') + ' extracted. Review text and click Extract.';
      progressEl.className = 'upload-progress done';
      updateWorkflow();
      addAudit('Extracted text from ' + processed + ' file(s) via PDF/image upload.');
      showToast(processed + ' file' + (processed === 1 ? '' : 's') + ' processed. Click AI Extract or Regex.', 'success');

      setTimeout(() => {
        if (dropZoneIcon) dropZoneIcon.textContent = '📄';
      }, 3000);
    }

    // =============================================================
    // CLIENT TABS MANAGEMENT
    // =============================================================

    // Each tab: { id, label, bills, gstr2bRows, auditEvents, approvedAt, workspaceSnapshot }
    let clientTabs = [];
    let activeTabId = null;

    function createTab(label) {
      const id = 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
      return {
        id,
        label: label || 'New Client',
        bills: [],
        gstr2bRows: [],
        auditEvents: [],
        approvedAt: '',
        invoiceText: '',
        workspace: {
          clientName: '', clientGstin: '', returnPeriod: '2026-05',
          preparedBy: 'CA Team', staffRate: '300'
        }
      };
    }

    function saveActiveTabState() {
      if (!activeTabId) return;
      const tab = clientTabs.find(t => t.id === activeTabId);
      if (!tab) return;
      tab.bills = bills.slice();
      tab.gstr2bRows = gstr2bRows.slice();
      tab.auditEvents = auditEvents.slice();
      tab.approvedAt = approvedAt;
      tab.invoiceText = els.text.value || '';
      tab.workspace = {
        clientName: (document.getElementById('clientName') || {}).value || '',
        clientGstin: (document.getElementById('clientGstin') || {}).value || '',
        returnPeriod: (document.getElementById('returnPeriod') || {}).value || '',
        preparedBy: (document.getElementById('preparedBy') || {}).value || '',
        staffRate: (document.getElementById('staffRate') || {}).value || ''
      };
      tab.label = tab.workspace.clientName || tab.label || 'New Client';
    }

    function loadTabState(tab) {
      bills = (tab.bills || []).slice();
      gstr2bRows = (tab.gstr2bRows || []).slice();
      auditEvents = (tab.auditEvents || []).slice();
      approvedAt = tab.approvedAt || '';
      els.text.value = tab.invoiceText || '';
      const ws = tab.workspace || {};
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      set('clientName', ws.clientName);
      set('clientGstin', ws.clientGstin);
      set('returnPeriod', ws.returnPeriod || '2026-05');
      set('preparedBy', ws.preparedBy || 'CA Team');
      set('staffRate', ws.staffRate || '300');
    }

    function switchTab(id) {
      saveActiveTabState();
      activeTabId = id;
      const tab = clientTabs.find(t => t.id === id);
      if (tab) loadTabState(tab);
      renderTabs();
      render();
      renderAudit();
      updateWorkflow();
    }

    function addClientTab(label) {
      saveActiveTabState();
      const tab = createTab(label || 'New Client');
      clientTabs.push(tab);
      activeTabId = tab.id;
      loadTabState(tab);
      renderTabs();
      render();
      renderAudit();
      updateWorkflow();
      // Focus client name
      setTimeout(() => { const el = document.getElementById('clientName'); if (el) { el.focus(); el.select(); } }, 100);
    }

    function closeTab(id) {
      if (clientTabs.length <= 1) { showToast('Cannot close the last tab.', 'error'); return; }
      const idx = clientTabs.findIndex(t => t.id === id);
      clientTabs.splice(idx, 1);
      if (activeTabId === id) {
        const newTab = clientTabs[Math.min(idx, clientTabs.length - 1)];
        activeTabId = newTab.id;
        loadTabState(newTab);
      }
      renderTabs();
      render();
      renderAudit();
      updateWorkflow();
    }

    function duplicateTab() {
      saveActiveTabState();
      const src = clientTabs.find(t => t.id === activeTabId);
      if (!src) return;
      const tab = createTab(src.label + ' (copy)');
      tab.bills = JSON.parse(JSON.stringify(src.bills));
      tab.gstr2bRows = JSON.parse(JSON.stringify(src.gstr2bRows));
      tab.auditEvents = [];
      tab.approvedAt = '';
      tab.invoiceText = src.invoiceText;
      tab.workspace = Object.assign({}, src.workspace, { clientName: src.workspace.clientName + ' (copy)' });
      clientTabs.push(tab);
      activeTabId = tab.id;
      loadTabState(tab);
      renderTabs();
      render();
      renderAudit();
      updateWorkflow();
      showToast('Client duplicated to new tab.', 'success');
    }

    function renderTabs() {
      const bar = document.getElementById('clientTabsBar');
      if (!bar) return;
      const addBtn = document.getElementById('addClientTabBtn');
      // Remove old tabs (keep the add button)
      Array.from(bar.querySelectorAll('.client-tab')).forEach(el => el.remove());
      clientTabs.forEach(tab => {
        const el = document.createElement('button');
        el.className = 'client-tab' + (tab.id === activeTabId ? ' active' : '');
        el.dataset.tabId = tab.id;
        const labelSpan = document.createElement('span');
        labelSpan.textContent = (tab.workspace && tab.workspace.clientName) ? tab.workspace.clientName : tab.label;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'client-tab-close';
        closeBtn.textContent = '×';
        closeBtn.title = 'Close tab';
        closeBtn.addEventListener('click', ev => { ev.stopPropagation(); closeTab(tab.id); });
        el.appendChild(labelSpan);
        el.appendChild(closeBtn);
        el.addEventListener('click', () => switchTab(tab.id));
        bar.insertBefore(el, addBtn);
      });
    }

    // Persist client name → tab label live
    function syncTabLabel() {
      if (!activeTabId) return;
      const tab = clientTabs.find(t => t.id === activeTabId);
      if (!tab) return;
      const nameEl = document.getElementById('clientName');
      if (nameEl) tab.label = nameEl.value || 'New Client';
      renderTabs();
    }

    // =============================================================
    // ONBOARDING
    // =============================================================

    function showOnboarding() {
      const overlay = document.getElementById('onboardOverlay');
      if (overlay) overlay.style.display = 'flex';
    }

    function closeOnboarding(loadSample) {
      const overlay = document.getElementById('onboardOverlay');
      if (overlay) overlay.style.display = 'none';
      const dontShow = document.getElementById('onboardDontShow');
      if (dontShow && dontShow.checked) {
        localStorage.setItem('gstOnboardDone', '1');
      }
      if (loadSample) {
        els.sample.click();
        showToast('Sample data loaded. Click AI Extract or Regex to begin.', 'success');
      }
    }

    // =============================================================
    // MOBILE SIDEBAR TOGGLE
    // =============================================================

    function openSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (sidebar) sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
    }


    // =============================================================
    // UNDO STACK
    // =============================================================
    let undoStack = [];

    function showToastWithUndo(msg, undoFn) {
      const toastEl = document.getElementById("toast");
      if (!toastEl) { showToast(msg, "success"); return; }
      toastEl.className = "toast show success";
      toastEl.innerHTML = escapeHtml(msg) + '<button class="toast-undo" id="toastUndoBtn">Undo</button>';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.className = "toast"; }, 4000);
      const undoBtn = document.getElementById("toastUndoBtn");
      if (undoBtn) undoBtn.addEventListener("click", () => {
        undoFn();
        toastEl.className = "toast";
        if (toastTimer) clearTimeout(toastTimer);
      });
    }

    // =============================================================
    // AUTO-SAVE TO LOCALSTORAGE
    // =============================================================
    let autoSaveTimer = null;

    function scheduleAutoSave() {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(doAutoSave, 30000); // 30s debounce
    }

    function doAutoSave() {
      try {
        saveActiveTabState();
        const data = { clientTabs, activeTabId, savedAt: new Date().toISOString() };
        localStorage.setItem("gstAutoSave", JSON.stringify(data));
        const indicator = document.getElementById("autoSaveIndicator");
        if (indicator) {
          indicator.classList.add("show");
          setTimeout(() => indicator.classList.remove("show"), 2000);
        }
        updateLastSaved();
      } catch(e) { /* silent fail */ }
    }

    function loadAutoSave() {
      try {
        const raw = localStorage.getItem("gstAutoSave");
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.clientTabs || !data.clientTabs.length) return false;
        return data;
      } catch(e) { return false; }
    }

    /** Update the "last saved" label shown in the sidebar. */
    function updateLastSaved() {
      const el = document.getElementById("lastSaved");
      if (el) el.textContent = "Saved " + new Date().toLocaleTimeString("en-IN");
    }

    // =============================================================
    // FULL BACKUP / RESTORE (all clients in one file)
    // =============================================================

    function downloadFullBackup() {
      saveActiveTabState();
      const data = { type: "gst-bill-assistant-backup", version: APP_VERSION, savedAt: new Date().toISOString(), clientTabs, activeTabId };
      downloadText(`gst-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      addAudit(`Downloaded full backup (${clientTabs.length} client(s)).`);
      showToast(`Backup of ${clientTabs.length} client(s) downloaded.`, "success");
    }

    function restoreFullBackup(text) {
      let data;
      try { data = JSON.parse(text); } catch(e) { showToast("Invalid backup file.", "error"); return; }
      if (!data || !Array.isArray(data.clientTabs) || !data.clientTabs.length) {
        showToast("Backup file has no clients.", "error"); return;
      }
      if (!confirm(`Restore ${data.clientTabs.length} client(s) from this backup? It replaces your current tabs.`)) return;
      clientTabs = data.clientTabs;
      activeTabId = (data.activeTabId && clientTabs.find(t => t.id === data.activeTabId)) ? data.activeTabId : clientTabs[0].id;
      const tab = clientTabs.find(t => t.id === activeTabId) || clientTabs[0];
      loadTabState(tab);
      bills = tab.bills || [];
      gstr2bRows = tab.gstr2bRows || [];
      unmatched2bRows = [];
      auditEvents = tab.auditEvents || [];
      approvedAt = tab.approvedAt || "";
      renderTabs(); render(); renderAudit(); updateWorkflow(); updateStickySummary();
      doAutoSave(); updateLastSaved();
      addAudit("Restored from full backup.");
      showToast(`Restored ${clientTabs.length} client(s).`, "success");
    }

    // =============================================================
    // RECONCILIATION STATUS BAR (visual)
    // =============================================================

    function renderRecoBar() {
      const el = document.getElementById("recoBar");
      if (!el) return;
      if (!bills.length) { el.innerHTML = ""; return; }
      const counts = { "Matched": 0, "Mismatch": 0, "Missing in 2B": 0, "Not checked": 0 };
      bills.forEach(b => { const r = b.reco || "Not checked"; counts[r] = (counts[r] || 0) + 1; });
      const total = bills.length;
      const defs = [
        { key: "Matched", cls: "seg-ok" },
        { key: "Mismatch", cls: "seg-warn" },
        { key: "Missing in 2B", cls: "seg-bad" },
        { key: "Not checked", cls: "seg-neutral" },
      ].filter(s => counts[s.key] > 0);
      el.innerHTML = `
        <div class="reco-bar" role="img" aria-label="Reconciliation status breakdown">
          ${defs.map(s => `<div class="reco-seg ${s.cls}" data-reco="${s.key}" style="width:${(counts[s.key] / total * 100).toFixed(1)}%" title="${s.key}: ${counts[s.key]} — click to filter"></div>`).join("")}
        </div>
        <div class="reco-legend">
          ${defs.map(s => `<span class="reco-legend-item" data-reco="${s.key}"><span class="reco-dot ${s.cls}"></span>${s.key} <b>${counts[s.key]}</b></span>`).join("")}
        </div>`;
      el.querySelectorAll("[data-reco]").forEach(node => {
        node.addEventListener("click", () => {
          els.filterReco.value = node.dataset.reco;
          render();
          document.getElementById("billTable").scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    // =============================================================
    // COLUMN SORT
    // =============================================================
    let sortKey = null;
    let sortDir = "asc";

    function sortBillsBy(key) {
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      // Update header classes
      document.querySelectorAll("#billTable thead th[data-sort]").forEach(th => {
        th.classList.remove("sort-asc", "sort-desc");
        if (th.dataset.sort === key) th.classList.add("sort-" + sortDir);
      });
      bills.sort((a, b) => {
        let va = a[key] || "";
        let vb = b[key] || "";
        // Numeric sort for amount columns
        if (["taxable","total","cgst","sgst","igst"].includes(key)) {
          va = Number(va) || 0;
          vb = Number(vb) || 0;
          return sortDir === "asc" ? va - vb : vb - va;
        }
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
      render();
    }

    // =============================================================
    // EXCEPTION BADGE UPDATE
    // =============================================================
    function updateExceptionBadge() {
      const badge = document.getElementById("exceptionBadge");
      if (!badge) return;
      const count = bills.filter(b => {
        const s = rowStatus(b);
        return s !== "Ready" || (b.reco && b.reco !== "Matched" && b.reco !== "");
      }).length;
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-flex";
      } else {
        badge.style.display = "none";
      }
    }

    // =============================================================
    // TAB LABEL WITH BILL COUNT
    // =============================================================
    function updateTabBillCount() {
      if (!activeTabId) return;
      const tab = clientTabs.find(t => t.id === activeTabId);
      if (!tab) return;
      // Store bill count on tab for display
      tab.billCount = bills.length;
      tab.issueCount = bills.filter(b => rowStatus(b) !== "Ready").length;
      // Update tab label in DOM
      const tabEl = document.querySelector(`.client-tab[data-tab-id="${activeTabId}"] span:first-child`);
      if (tabEl) {
        const name = (tab.workspace && tab.workspace.clientName) ? tab.workspace.clientName : tab.label;
        tabEl.textContent = bills.length > 0 ? name + " (" + bills.length + ")" : name;
      }
    }


    // =============================================================
    // GSTIN VALIDATOR
    // =============================================================
    const GST_STATE_CODES = {
      "01":"J&K","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh",
      "05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan",
      "09":"Uttar Pradesh","10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh",
      "13":"Nagaland","14":"Manipur","15":"Mizoram","16":"Tripura",
      "17":"Meghalaya","18":"Assam","19":"West Bengal","20":"Jharkhand",
      "21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat",
      "26":"Dadra & NH","27":"Maharashtra","28":"Andhra Pradesh","29":"Karnataka",
      "30":"Goa","31":"Lakshadweep","32":"Kerala","33":"Tamil Nadu",
      "34":"Puducherry","35":"Andaman & Nicobar","36":"Telangana","37":"Andhra Pradesh (new)",
      "38":"Ladakh","97":"Other Territory","99":"Centre Jurisdiction"
    };

    function validateGstin(gstin) {
      if (!gstin) return { ok: null, msg: "" };
      const g = gstin.trim().toUpperCase();
      if (g.length !== 15) return { ok: false, msg: "GSTIN must be exactly 15 characters" };
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) {
        return { ok: false, msg: "Invalid GSTIN format" };
      }
      const stateCode = g.slice(0, 2);
      const stateName = GST_STATE_CODES[stateCode];
      if (!stateName) return { ok: false, msg: "Unknown state code: " + stateCode };
      if (!gstinChecksumOk(g)) return { ok: false, msg: "Checksum failed — likely a typo (state: " + stateName + ")" };
      return { ok: true, msg: "Valid — " + stateName };
    }

    function attachGstinValidator(inputEl, hintEl) {
      if (!inputEl || !hintEl) return;
      inputEl.addEventListener("input", () => {
        const val = inputEl.value.trim().toUpperCase();
        inputEl.value = val;
        const result = validateGstin(val);
        if (result.ok === null) { hintEl.textContent = ""; hintEl.className = "gstin-hint"; return; }
        hintEl.textContent = result.msg;
        hintEl.className = "gstin-hint " + (result.ok ? "ok" : "error");
      });
    }

    // =============================================================
    // STICKY SUMMARY BAR
    // =============================================================
    function updateStickySummary() {
      if (!bills.length) {
        document.getElementById("stickySummary").classList.remove("visible");
        return;
      }
      document.getElementById("stickySummary").classList.add("visible");
      const taxable = bills.reduce((s,b) => s + Number(b.taxable||0), 0);
      const gst = bills.reduce((s,b) => s + billGst(b), 0);
      const itcReady = bills.filter(b => b.reco==="Matched" && b.itcType!=="Blocked / review" && b.risk!=="Duplicate").reduce((s,b)=>s+billGst(b),0);
      const itcRisk = bills.filter(b => b.reco&&(b.reco!=="Matched"||b.itcType==="Blocked / review"||b.risk==="Duplicate")).reduce((s,b)=>s+billGst(b),0);
      const exceptions = bills.filter(b => rowStatus(b) !== "Ready").length;
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set("ssBills", bills.length);
      set("ssTaxable", money(taxable));
      set("ssGst", money(gst));
      set("ssItcReady", money(itcReady));
      set("ssItcRisk", money(itcRisk));
      set("ssExceptions", exceptions);
    }

    // =============================================================
    // BULK ACTIONS
    // =============================================================
    let selectedBillIds = new Set();

    function getSelectedIndices() {
      return bills.reduce((arr, b, i) => { if (selectedBillIds.has(b.id)) arr.push(i); return arr; }, []);
    }

    function updateBulkBar() {
      const bar = document.getElementById("bulkBar");
      const countEl = document.getElementById("bulkCount");
      if (!bar || !countEl) return;
      if (selectedBillIds.size > 0) {
        bar.classList.add("visible");
        countEl.textContent = selectedBillIds.size + " selected";
      } else {
        bar.classList.remove("visible");
      }
    }

    function bulkMarkReviewed() {
      getSelectedIndices().forEach(i => { bills[i].manuallyReviewed = true; });
      addAudit("Bulk marked " + selectedBillIds.size + " bills as reviewed.");
      selectedBillIds.clear();
      render(); updateBulkBar(); scheduleAutoSave();
    }

    function bulkSetItcType(type) {
      if (!type) return;
      getSelectedIndices().forEach(i => { bills[i].itcType = type; });
      addAudit("Bulk set ITC type to '" + type + "' on " + selectedBillIds.size + " bills.");
      selectedBillIds.clear();
      render(); updateBulkBar(); invalidateApproval(); scheduleAutoSave();
    }

    function bulkDelete() {
      const indices = getSelectedIndices().sort((a,b)=>b-a);
      const deleted = indices.map(i => ({bill: JSON.parse(JSON.stringify(bills[i])), index: i}));
      indices.forEach(i => bills.splice(i, 1));
      addAudit("Bulk deleted " + deleted.length + " bills.");
      selectedBillIds.clear();
      showToastWithUndo("Deleted " + deleted.length + " bills.", () => {
        deleted.reverse().forEach(({bill, index}) => bills.splice(index, 0, bill));
        render(); updateStats(); updateWorkflow(); scheduleAutoSave();
        showToast("Bills restored.", "success");
      });
      render(); updateStats(); updateWorkflow(); updateBulkBar(); scheduleAutoSave();
    }

    // Add checkbox to first column of each row
    const _origRender = render;
    // We'll patch render inline instead - handled in render directly

    // =============================================================
    // EXCEL (.xlsx) EXPORT — pure JS, no library needed
    // =============================================================
    function downloadExcel() {
      if (!bills.length) { showToast("No bills to export.", "error"); return; }
      const ws = workspace();

      // Build a simple XML-based .xlsx (SpreadsheetML)
      const headers = ["Status","Vendor","GSTIN","Invoice No","Date","HSN/SAC","Taxable","CGST","SGST","IGST","Total","Ledger","ITC Type","Risk","2B Reco","Manually Reviewed"];
      const rows = bills.map(b => [
        rowStatus(b), b.vendor, b.gstin, b.invoiceNo, b.date, b.hsn,
        b.taxable, b.cgst, b.sgst, b.igst, b.total,
        b.ledger, b.itcType, b.risk||"", b.reco||"Not checked",
        b.manuallyReviewed ? "Yes" : "No"
      ]);

      const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const numCols = [6,7,8,9,10]; // taxable, cgst, sgst, igst, total

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<?mso-application progid="Excel.Sheet"?>\n';
      xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
      xml += '<Worksheet ss:Name="GST Bills">\n<Table>\n';

      // Summary rows
      xml += '<Row><Cell><Data ss:Type="String">Client</Data></Cell><Cell><Data ss:Type="String">' + esc(ws.clientName) + '</Data></Cell></Row>\n';
      xml += '<Row><Cell><Data ss:Type="String">GSTIN</Data></Cell><Cell><Data ss:Type="String">' + esc(ws.clientGstin) + '</Data></Cell></Row>\n';
      xml += '<Row><Cell><Data ss:Type="String">Return Period</Data></Cell><Cell><Data ss:Type="String">' + esc(ws.returnPeriod) + '</Data></Cell></Row>\n';
      xml += '<Row><Cell><Data ss:Type="String">Prepared By</Data></Cell><Cell><Data ss:Type="String">' + esc(ws.preparedBy) + '</Data></Cell></Row>\n';
      xml += '<Row></Row>\n';

      // Header row
      xml += '<Row ss:StyleID="header">\n';
      headers.forEach(h => { xml += '<Cell><Data ss:Type="String">' + esc(h) + '</Data></Cell>\n'; });
      xml += '</Row>\n';

      // Data rows
      rows.forEach(row => {
        xml += '<Row>\n';
        row.forEach((val, i) => {
          const type = numCols.includes(i) && !isNaN(Number(val)) && val !== "" ? "Number" : "String";
          const v = type === "Number" ? Number(val) : esc(val);
          xml += '<Cell><Data ss:Type="' + type + '">' + v + '</Data></Cell>\n';
        });
        xml += '</Row>\n';
      });

      xml += '</Table>\n</Worksheet>\n</Workbook>';

      const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gst-bills-" + (ws.returnPeriod||"export") + ".xls";
      a.click();
      URL.revokeObjectURL(url);
      addAudit("Downloaded Excel export.");
      showToast("Excel file downloaded.", "success");
    }

    // =============================================================
    // COPY ON CLICK (GSTIN, INVOICE NO)
    // =============================================================
    function attachCopyOnClick() {
      document.querySelectorAll(".copyable").forEach(el => {
        el.removeEventListener("click", handleCopyClick);
        el.addEventListener("click", handleCopyClick);
      });
    }

    async function handleCopyClick(e) {
      const val = e.currentTarget.dataset.copy || e.currentTarget.textContent;
      try {
        await navigator.clipboard.writeText(val.trim());
        showToast("Copied: " + val.trim(), "success");
      } catch(_) {
        showToast("Copy failed.", "error");
      }
    }

    // =============================================================
    // SETTINGS PANEL
    // =============================================================
    function openSettings() {
      const overlay = document.getElementById("settingsOverlay");
      if (!overlay) return;
      // Load saved settings into form
      const saved = JSON.parse(localStorage.getItem("gstSettings")||"{}");
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      set("settingFirmName", saved.firmName);
      set("settingFirmGstin", saved.firmGstin);
      set("settingApiKey", saved.apiKey || (els.aiApiKey ? els.aiApiKey.value : ""));
      set("settingDefaultLedger", saved.defaultLedger);
      set("settingDefaultItc", saved.defaultItc);
      overlay.style.display = "flex";
    }

    function closeSettings() {
      const overlay = document.getElementById("settingsOverlay");
      if (overlay) overlay.style.display = "none";
    }

    function saveSettings() {
      const get = id => { const el = document.getElementById(id); return el ? el.value : ""; };
      const settings = {
        firmName:      get("settingFirmName"),
        firmGstin:     get("settingFirmGstin"),
        apiKey:        get("settingApiKey"),
        defaultLedger: get("settingDefaultLedger"),
        defaultItc:    get("settingDefaultItc")
      };
      localStorage.setItem("gstSettings", JSON.stringify(settings));
      // Apply API key immediately
      if (settings.apiKey && els.aiApiKey) els.aiApiKey.value = settings.apiKey;
      closeSettings();
      showToast("Settings saved.", "success");
      addAudit("Saved firm settings.");
    }

    function loadSavedSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem("gstSettings")||"{}");
        if (saved.apiKey && els.aiApiKey) els.aiApiKey.value = saved.apiKey;
      } catch(_) {}
    }

    // =============================================================
    // EVENT HANDLERS
    // =============================================================

    // File upload: append text content to textarea
    els.file.addEventListener("change", async event => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      const contents = await Promise.all(files.map(f => f.text()));
      els.text.value = [els.text.value.trim(), ...contents].filter(Boolean).join("\n---\n");
      showToast(`${files.length} file(s) loaded.`, "success");
    });

    // GSTR-2B file upload
    els.gstrFile.addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      loadGstr2bCsv(await file.text());
    });

    // Import existing bill register from CSV
    document.getElementById("billsCsvFile").addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      importBillsCsv(await file.text());
      event.target.value = ""; // allow re-importing the same file
    });
    document.getElementById("billsCsvTemplateBtn").addEventListener("click", downloadBillsTemplate);

    // Add 2B-only invoices to the book register
    document.getElementById("add2bToBooksBtn").addEventListener("click", addUnmatched2bToBooks);

    // Full backup / restore (all clients)
    document.getElementById("backupAllBtn").addEventListener("click", downloadFullBackup);
    document.getElementById("restoreAllFile").addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      restoreFullBackup(await file.text());
      event.target.value = "";
    });

    // Compact / comfortable density toggle (persisted)
    const densityBtn = document.getElementById("densityBtn");
    function applyDensity(compact) {
      document.body.classList.toggle("compact", compact);
      if (densityBtn) densityBtn.textContent = compact ? "⊞ Comfort" : "⊟ Compact";
    }
    if (densityBtn) densityBtn.addEventListener("click", () => {
      const compact = !document.body.classList.contains("compact");
      applyDensity(compact);
      localStorage.setItem("gstDensity", compact ? "1" : "0");
    });
    applyDensity(localStorage.getItem("gstDensity") === "1");

    // Clickable metric cards → filter the register
    function wireMetricFilter(valueId, apply, tip) {
      const card = document.getElementById(valueId) && document.getElementById(valueId).closest(".metric");
      if (!card) return;
      card.classList.add("metric-clickable");
      card.title = tip;
      card.addEventListener("click", () => {
        els.searchInput.value = "";
        els.filterStatus.value = "";
        els.filterReco.value = "";
        apply();
        render();
        document.getElementById("billTable").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    wireMetricFilter("issueCount", () => { els.filterStatus.value = "Review"; }, "Show bills that need review");
    wireMetricFilter("billCount", () => {}, "Show all bills (clear filters)");

    // Main actions
    els.parse.addEventListener("click", parseCurrentText);

    els.sample.addEventListener("click", () => {
      els.text.value = sampleText;
      parseCurrentText();
    });

    els.clear.addEventListener("click", () => {
      if (bills.length && !confirm("Clear all extracted bills?")) return;
      els.text.value = "";
      bills = [];
      gstr2bRows = [];
      unmatched2bRows = [];
      invalidateApproval();
      setStatus("Ready for review.");
      showToast("Cleared.", "success");
      render();
    });

    els.csv.addEventListener("click", () => downloadCsv("gst-bills-tally.csv", "tally"));
    els.zoho.addEventListener("click", () => downloadCsv("gst-bills-zoho.csv", "zoho"));

    els.sample2b.addEventListener("click", () => {
      loadGstr2bCsv(sample2bCsv);
      if (!bills.length) {
        els.text.value = sampleText;
        parseCurrentText();
      }
    });

    els.reconcile.addEventListener("click", reconcileBills);
    els.reconCsv.addEventListener("click", downloadRecoReport);
    els.message.addEventListener("click", generateClientMessage);
    els.reviewPack.addEventListener("click", downloadReviewPack);
    els.reviewedCsv.addEventListener("click", downloadReviewedCsv);
    els.smartFix.addEventListener("click", applySmartFixes);
    els.save.addEventListener("click", saveWorkspace);
    els.loadSaved.addEventListener("click", loadWorkspace);
    els.exportWorkFile.addEventListener("click", exportWorkFile);

    els.importWorkFile.addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        importWorkFileText(await file.text());
      } catch (error) {
        showToast("Import failed: invalid file.", "error");
      }
    });

    els.staffRate.addEventListener("input", updateRoiMetrics);
    els.pilotPlan.addEventListener("click", generatePilotPlan);
    els.pilotCopy.addEventListener("click", async () => {
      const text = els.pilotPlanBox.value || generatePilotPlan();
      try {
        await navigator.clipboard.writeText(text);
        showToast("Pilot outreach copied.", "success");
        addAudit("Copied pilot outreach text.");
      } catch (error) {
        showToast("Copy failed. Select and copy the text manually.", "error");
      }
    });
    els.pilotDownload.addEventListener("click", () => {
      const text = els.pilotPlanBox.value || generatePilotPlan();
      downloadText("gst-assistant-pilot-pack.txt", text);
      addAudit("Downloaded pilot pack.");
    });
    els.validationRun.addEventListener("click", runValidationLab);
    els.validationCsv.addEventListener("click", downloadValidationCsv);
    els.template2b.addEventListener("click", download2bTemplate);
    els.approve.addEventListener("click", approveReview);

    // Column sort on table headers
    document.querySelectorAll("#billTable thead th[data-sort]").forEach(th => {
      th.addEventListener("click", () => sortBillsBy(th.dataset.sort));
    });

    // Select-all checkbox
    const selectAllCb = document.getElementById("selectAllCheckbox");
    if (selectAllCb) {
      selectAllCb.addEventListener("change", e => {
        if (e.target.checked) bills.forEach(b => selectedBillIds.add(b.id));
        else selectedBillIds.clear();
        render(); updateBulkBar();
      });
    }

    // Bulk action buttons
    const bulkMarkReviewedBtn = document.getElementById("bulkMarkReviewed");
    if (bulkMarkReviewedBtn) bulkMarkReviewedBtn.addEventListener("click", bulkMarkReviewed);
    const bulkDeleteBtn = document.getElementById("bulkDelete");
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener("click", bulkDelete);
    const bulkClearBtn = document.getElementById("bulkClear");
    if (bulkClearBtn) bulkClearBtn.addEventListener("click", () => { selectedBillIds.clear(); render(); updateBulkBar(); });
    const bulkItcSelect = document.getElementById("bulkItcChange");
    if (bulkItcSelect) bulkItcSelect.addEventListener("change", e => { bulkSetItcType(e.target.value); e.target.value = ""; });
    const bulkSelectAllBtn = document.getElementById("bulkSelectAll");
    if (bulkSelectAllBtn) bulkSelectAllBtn.addEventListener("click", () => { bills.forEach(b => selectedBillIds.add(b.id)); render(); updateBulkBar(); });

    // Excel export
    const xlsxBtn = document.getElementById("xlsxBtn");
    if (xlsxBtn) xlsxBtn.addEventListener("click", downloadExcel);

    // Settings
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");
    if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", saveSettings);
    const clearAllDataBtn = document.getElementById("clearAllDataBtn");
    if (clearAllDataBtn) clearAllDataBtn.addEventListener("click", () => {
      if (!confirm("Clear ALL saved data? This cannot be undone.")) return;
      ["gstAutoSave","gstTrendData","gstSettings","gstOnboardDone","gstDarkMode"].forEach(k => localStorage.removeItem(k));
      showToast("All data cleared.", "success");
      closeSettings();
    });

    // GSTIN validator on client workspace
    attachGstinValidator(
      document.getElementById("clientGstin"),
      document.getElementById("gstinHint")
    );

    // Settings: close on Escape (already handled above)


    // New v3.0 buttons
    els.aiExtractBtn.addEventListener("click", extractWithAI);
    els.aiExplainBtn.addEventListener("click", aiExplainExceptions);
    els.tallyXmlBtn.addEventListener("click", downloadTallyXml);
    els.whatsappBtn.addEventListener("click", generateWhatsAppMessage);
    els.feeCalcBtn.addEventListener("click", calculateFee);
    els.saveTrendBtn.addEventListener("click", saveTrend);
    els.darkModeBtn.addEventListener("click", toggleDarkMode);
    els.shortcutsBtn.addEventListener("click", () => { document.getElementById("shortcutsModal").style.display = "flex"; });
    els.printReportBtn.addEventListener("click", () => { window.print(); addAudit("Printed review report."); });

    // Update workflow on text input
    els.text.addEventListener("input", () => updateWorkflow());

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (!e.altKey) return;
      switch(e.key.toLowerCase()) {
        case "e": e.preventDefault(); parseCurrentText(); break;
        case "a": e.preventDefault(); extractWithAI(); break;
        case "r": e.preventDefault(); reconcileBills(); break;
        case "f": e.preventDefault(); applySmartFixes(); break;
        case "s": e.preventDefault(); saveWorkspace(); break;
        case "l": e.preventDefault(); els.sample.click(); break;
        case "d": e.preventDefault(); toggleDarkMode(); break;
      }
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        document.getElementById("shortcutsModal").style.display = "none";
        closeOnboarding(false);
        closeSidebar();
        closeSettings();
      }
    });

    els.clearAudit.addEventListener("click", () => {
      if (auditEvents.length && !confirm("Clear the audit log?")) return;
      auditEvents = [];
      approvedAt = "";
      renderAudit();
      setStatus("Audit log cleared.");
    });

    // =============================================================
    // NEW EVENT LISTENERS (v4.0)
    // =============================================================

    // PDF / Image upload
    const pdfImageFileInput = document.getElementById('pdfImageFile');
    if (pdfImageFileInput) {
      pdfImageFileInput.addEventListener('change', e => {
        handlePdfImageUpload(Array.from(e.target.files || []));
        e.target.value = '';
      });
    }

    // Drag and drop on PDF zone
    const dropZone = document.getElementById('pdfDropZone');
    if (dropZone) {
      dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handlePdfImageUpload(Array.from(e.dataTransfer.files || []));
      });
    }

    // Client tabs
    const addTabBtn = document.getElementById('addClientTabBtn');
    if (addTabBtn) addTabBtn.addEventListener('click', () => addClientTab());
    const dupTabBtn = document.getElementById('dupClientTabBtn');
    if (dupTabBtn) dupTabBtn.addEventListener('click', duplicateTab);

    // Sync tab label when client name changes
    const clientNameEl = document.getElementById('clientName');
    if (clientNameEl) clientNameEl.addEventListener('input', syncTabLabel);

    // Onboarding
    const onboardStartBtn = document.getElementById('onboardStartBtn');
    if (onboardStartBtn) onboardStartBtn.addEventListener('click', () => closeOnboarding(false));
    const onboardSampleBtn = document.getElementById('onboardSampleBtn');
    if (onboardSampleBtn) onboardSampleBtn.addEventListener('click', () => closeOnboarding(true));

    // Mobile sidebar
    const hamburger = document.getElementById('hamburgerBtn');
    if (hamburger) hamburger.addEventListener('click', openSidebar);
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    // Close sidebar when any sidebar button is clicked on mobile
    document.querySelector('.sidebar').addEventListener('click', e => {
      if (window.innerWidth <= 960 && e.target.classList.contains('btn')) {
        setTimeout(closeSidebar, 150);
      }
    });

    // Close shortcuts modal on Escape (extend existing listener)
    // Already handled above

    // =============================================================
    // INITIALIZATION
    // =============================================================

    // Initialize: try to restore auto-saved session first
    const savedSession = loadAutoSave();
    if (savedSession && savedSession.clientTabs && savedSession.clientTabs.length) {
      clientTabs = savedSession.clientTabs;
      activeTabId = savedSession.activeTabId || clientTabs[0].id;
      const activeTab = clientTabs.find(t => t.id === activeTabId) || clientTabs[0];
      activeTabId = activeTab.id;
      loadTabState(activeTab);
      bills = activeTab.bills || [];
      gstr2bRows = activeTab.gstr2bRows || [];
      auditEvents = activeTab.auditEvents || [];
      approvedAt = activeTab.approvedAt || "";
    } else {
      // Fresh start
      const firstTab = createTab('Aarav Retail Pvt Ltd');
      firstTab.workspace = {
        clientName: 'Aarav Retail Pvt Ltd',
        clientGstin: '27AAHCA1234M1ZO',
        returnPeriod: '2026-05',
        preparedBy: 'CA Team',
        staffRate: '300'
      };
      clientTabs.push(firstTab);
      activeTabId = firstTab.id;
    }
    renderTabs();

    render();
    renderAudit();
    updateWorkflow();
    renderTrend();
    updateStickySummary();
    loadSavedSettings();
    // Single source of truth for the version label shown in the UI
    document.querySelectorAll(".js-version").forEach(el => { el.textContent = "v" + APP_VERSION; });
    // app.js is an ES module now, so expose the one function used by an inline onclick handler
    window.closeSettings = closeSettings;
    // Persist immediately so the "last saved" time shows right away, then every 30s.
    doAutoSave();
    setInterval(doAutoSave, 30000);

    // Restore dark mode preference
    if (localStorage.getItem("gstDarkMode") === "1") {
      document.body.classList.add("dark-mode");
      if (els.darkModeBtn) els.darkModeBtn.textContent = "Light";
    }

    // Show onboarding on first visit
    if (!localStorage.getItem("gstOnboardDone")) {
      setTimeout(showOnboarding, 400);
    }
