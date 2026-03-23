import ExcelJS from 'exceljs';
import type { Bug, TestCase, Project } from '../types';
import { format } from 'date-fns';

// ── Helpers ──────────────────────────────────────────────────────────────────

type ImgExt = 'png' | 'jpeg' | 'gif';

/** Strip the data-URI prefix and return { base64, extension } */
function parseDataUri(dataUri: string): { base64: string; extension: ImgExt } {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!match) return { base64: dataUri, extension: 'png' };
  const ext = match[1].toLowerCase();
  const extension: ImgExt =
    ext === 'jpeg' || ext === 'jpg' ? 'jpeg'
    : ext === 'gif'                 ? 'gif'
    :                                 'png';
  return { base64: match[2], extension };
}

/** Apply a consistent header style to every cell in the first row of a sheet */
function styleHeader(sheet: ExcelJS.Worksheet, colCount: number) {
  const row = sheet.getRow(1);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  }
  row.height = 22;
}

// ── Bug Export ────────────────────────────────────────────────────────────────

export async function exportBugsToExcel(bugs: Bug[], project: Project) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'DrBuddy QA Tool';
  wb.created  = new Date();

  // ── Track screenshot rows so Bug List can hyperlink to them ──────────────
  // Map: bugId → 1-based row number in the Screenshots sheet where that bug starts
  const screenshotRowMap = new Map<string, number>();
  const bugsWithScreenshots = bugs.filter((b) => b.screenshots?.length > 0);

  // ── Sheet 1: Bug List ────────────────────────────────────────────────────
  const bugSheet = wb.addWorksheet('Bug List');
  const BUG_COLS = [
    { header: 'Bug ID',            key: 'id',          width: 16 },
    { header: 'Title',             key: 'title',        width: 42 },
    { header: 'Module',            key: 'module',       width: 22 },
    { header: 'Bug Type',          key: 'bugType',      width: 22 },
    { header: 'Severity',          key: 'severity',     width: 14 },
    { header: 'Priority',          key: 'priority',     width: 16 },
    { header: 'Status',            key: 'status',       width: 22 },
    { header: 'Reproducibility',   key: 'repro',        width: 18 },
    { header: 'Reporter',          key: 'reporter',     width: 18 },
    { header: 'Assignee',          key: 'assignee',     width: 18 },
    { header: 'Expected Behavior', key: 'expected',     width: 44 },
    { header: 'Actual Behavior',   key: 'actual',       width: 44 },
    { header: 'Steps to Reproduce',key: 'steps',        width: 52 },
    { header: 'Browser',           key: 'browser',      width: 18 },
    { header: 'OS',                key: 'os',           width: 20 },
    { header: 'Device Type',       key: 'device',       width: 16 },
    { header: 'Resolution',        key: 'resolution',   width: 16 },
    { header: 'User Role',         key: 'userRole',     width: 18 },
    { header: 'Workaround',        key: 'workaround',   width: 36 },
    { header: 'Additional Notes',  key: 'notes',        width: 36 },
    { header: 'Screenshots',       key: 'screenshots',  width: 26 },
    { header: 'Created At',        key: 'createdAt',    width: 20 },
    { header: 'Updated At',        key: 'updatedAt',    width: 20 },
  ];
  bugSheet.columns = BUG_COLS;
  styleHeader(bugSheet, BUG_COLS.length);

  bugs.forEach((b, idx) => {
    const severity = project.severityLevels.find((s) => s.id === b.severity)?.name || b.severity;
    const priority = project.priorityLevels.find((p) => p.id === b.priority)?.name || b.priority;
    const status   = project.lifecycleStages.find((s) => s.id === b.status)?.name   || b.status;

    const dataRow = bugSheet.addRow({
      id:          b.id,
      title:       b.title,
      module:      b.module,
      bugType:     b.bugType,
      severity,
      priority,
      status,
      repro:       b.reproducibility,
      reporter:    b.reporter,
      assignee:    b.assignee,
      expected:    b.expectedBehavior,
      actual:      b.actualBehavior,
      steps:       (b.stepsToReproduce || []).join('\n'),
      browser:     b.environment?.browser,
      os:          b.environment?.os,
      device:      b.environment?.deviceType,
      resolution:  b.environment?.screenResolution,
      userRole:    b.environment?.userRole,
      workaround:  b.workaround,
      notes:       b.additionalNotes,
      screenshots: '',          // filled below as hyperlink or plain text
      createdAt:   format(new Date(b.createdAt), 'yyyy-MM-dd HH:mm'),
      updatedAt:   format(new Date(b.updatedAt), 'yyyy-MM-dd HH:mm'),
    });

    // Alternate row shading
    if (idx % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
    dataRow.alignment = { wrapText: true, vertical: 'top' };

    // Screenshots cell — will be updated with hyperlink after Screenshots sheet is built
    const screenshotCell = dataRow.getCell('screenshots');
    if (b.screenshots?.length > 0) {
      // Placeholder — updated below once screenshotRowMap is populated
      screenshotCell.value = `${b.screenshots.length} screenshot(s)`;
      screenshotCell.font  = { color: { argb: 'FF2563EB' }, underline: true };
    } else {
      screenshotCell.value = '—';
      screenshotCell.font  = { color: { argb: 'FF94A3B8' } };
    }
  });

  // Freeze the header row and enable auto-filter
  bugSheet.views = [{ state: 'frozen', ySplit: 1 }];
  bugSheet.autoFilter = { from: 'A1', to: `W1` };

  // ── Sheet 2: Status History ───────────────────────────────────────────────
  const histSheet = wb.addWorksheet('Status History');
  const HIST_COLS = [
    { header: 'Bug ID',      key: 'bugId',     width: 16 },
    { header: 'Bug Title',   key: 'bugTitle',  width: 42 },
    { header: 'From Status', key: 'from',      width: 24 },
    { header: 'To Status',   key: 'to',        width: 24 },
    { header: 'Changed By',  key: 'changedBy', width: 20 },
    { header: 'Changed At',  key: 'changedAt', width: 20 },
    { header: 'Note',        key: 'note',      width: 44 },
  ];
  histSheet.columns = HIST_COLS;
  styleHeader(histSheet, HIST_COLS.length);

  bugs.forEach((b) => {
    b.statusHistory?.forEach((h) => {
      histSheet.addRow({
        bugId:     b.id,
        bugTitle:  b.title,
        from:      h.from || '(New)',
        to:        h.to,
        changedBy: h.changedBy,
        changedAt: format(new Date(h.changedAt), 'yyyy-MM-dd HH:mm'),
        note:      h.note || '',
      });
    });
  });
  histSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ── Sheet 3: Screenshots ─────────────────────────────────────────────────
  if (bugsWithScreenshots.length > 0) {
    const ssSheet = wb.addWorksheet('Screenshots');

    // Fixed column widths
    ssSheet.columns = [
      { key: 'bugId',    width: 16 },
      { key: 'title',    width: 36 },
      { key: 'idx',      width: 14 },
      { key: 'filename', width: 28 },
      { key: 'img',      width: 50 }, // image column
      { key: 'spacer',   width: 8 },
    ];

    // Header row
    const ssHeader = ssSheet.getRow(1);
    ssHeader.values = ['Bug ID', 'Bug Title', 'Screenshot #', 'Filename', 'Image'];
    styleHeader(ssSheet, 5);
    ssHeader.height = 22;

    let currentRow = 2; // 1-based; row 1 = header

    for (const bug of bugsWithScreenshots) {
      screenshotRowMap.set(bug.id, currentRow);

      for (let i = 0; i < bug.screenshots.length; i++) {
        const sc  = bug.screenshots[i];
        const IMG_HEIGHT_PX = 200;
        const IMG_WIDTH_PX  = 320;
        // Excel row height is in points; ~0.75pt per px
        const ROW_HEIGHT_PT = Math.ceil(IMG_HEIGHT_PX * 0.75) + 8;

        const dataRow = ssSheet.getRow(currentRow);
        dataRow.values = [
          bug.id,
          bug.title,
          `${i + 1} / ${bug.screenshots.length}`,
          sc.name,
          '',           // image column — image overlaid via addImage
        ];
        dataRow.height = ROW_HEIGHT_PT;
        dataRow.alignment = { vertical: 'top', wrapText: true };

        // Bug-ID cell: bold + tinted
        const idCell = dataRow.getCell(1);
        idCell.font = { bold: true, color: { argb: 'FF1E3A5F' } };
        idCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };

        // Alternate shade on title + meta cells
        if (i % 2 === 0) {
          for (let c = 2; c <= 4; c++) {
            dataRow.getCell(c).fill = {
              type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' },
            };
          }
        }

        // Embed the image if we have valid base64 data
        if (sc.data && sc.data.startsWith('data:image')) {
          try {
            const { base64, extension } = parseDataUri(sc.data);
            const imageId = wb.addImage({ base64, extension });
            // Image placed in column E (index 4, 0-based) at currentRow (0-based = currentRow - 1)
            ssSheet.addImage(imageId, {
              tl: { col: 4, row: currentRow - 1 },
              ext: { width: IMG_WIDTH_PX, height: IMG_HEIGHT_PX },
              editAs: 'oneCell',
            });
          } catch (_) {
            // If image fails, just show the filename — no crash
            dataRow.getCell(5).value = '[Image could not be embedded]';
          }
        }

        currentRow++;
      }

      // Separator row between bugs
      const sepRow = ssSheet.getRow(currentRow);
      sepRow.height = 6;
      sepRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      });
      currentRow++;
    }

    ssSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // ── Back-fill hyperlinks in Bug List sheet now that row positions are known
    bugs.forEach((b, idx) => {
      const targetRow = screenshotRowMap.get(b.id);
      if (!targetRow || !b.screenshots?.length) return;

      // Row index in Bug List: header = row 1, first data = row 2, so bug idx → row idx+2
      const bugListRow = bugSheet.getRow(idx + 2);
      const cell = bugListRow.getCell('screenshots');
      cell.value = {
        text: `${b.screenshots.length} screenshot(s) — View`,
        hyperlink: `#Screenshots!A${targetRow}`,
      };
      cell.font  = { color: { argb: 'FF2563EB' }, underline: true };
      cell.alignment = { vertical: 'top' };
    });
  }

  // ── Write file via browser download ──────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer();
  const blob     = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url      = URL.createObjectURL(blob);
  const link     = document.createElement('a');
  link.href      = url;
  link.download  = `DrBuddy_Bugs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Test Case Export ──────────────────────────────────────────────────────────

export async function exportTestCasesToExcel(testCases: TestCase[], project: Project) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DrBuddy QA Tool';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Test Cases');
  const TC_COLS = [
    { header: 'TC ID',             key: 'id',          width: 16 },
    { header: 'Title',             key: 'title',        width: 42 },
    { header: 'Module',            key: 'module',       width: 22 },
    { header: 'Test Type',         key: 'testType',     width: 18 },
    { header: 'Test Scenario',     key: 'scenario',     width: 44 },
    { header: 'Preconditions',     key: 'precon',       width: 36 },
    { header: 'Test Steps',        key: 'steps',        width: 52 },
    { header: 'Expected / Step',   key: 'stepsExp',     width: 52 },
    { header: 'Test Data',         key: 'testData',     width: 30 },
    { header: 'Expected Result',   key: 'expected',     width: 44 },
    { header: 'Actual Result',     key: 'actual',       width: 44 },
    { header: 'Priority',          key: 'priority',     width: 16 },
    { header: 'Status',            key: 'status',       width: 16 },
    { header: 'Remarks',           key: 'remarks',      width: 36 },
    { header: 'Linked Bug IDs',    key: 'bugIds',       width: 24 },
    { header: 'Created At',        key: 'createdAt',    width: 20 },
  ];
  sheet.columns = TC_COLS;
  styleHeader(sheet, TC_COLS.length);

  testCases.forEach((tc, idx) => {
    const priority = project.priorityLevels.find((p) => p.id === tc.priority)?.name || tc.priority;
    const dataRow = sheet.addRow({
      id:        tc.id,
      title:     tc.title,
      module:    tc.module,
      testType:  tc.testType,
      scenario:  tc.testScenario,
      precon:    tc.preconditions,
      steps:     tc.testSteps.map((s, i) => `${i + 1}. ${s.action}`).join('\n'),
      stepsExp:  tc.testSteps.map((s, i) => `${i + 1}. ${s.expectedOutcome}`).join('\n'),
      testData:  tc.testData,
      expected:  tc.expectedResult,
      actual:    tc.actualResult,
      priority,
      status:    tc.status,
      remarks:   tc.remarks,
      bugIds:    tc.linkedBugIds?.join(', ') || '',
      createdAt: format(new Date(tc.createdAt), 'yyyy-MM-dd HH:mm'),
    });

    if (idx % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
    dataRow.alignment = { wrapText: true, vertical: 'top' };

    // Colour-code the status cell
    const statusColors: Record<string, string> = {
      'Pass':        'FFD1FAE5',
      'Fail':        'FFFEE2E2',
      'Blocked':     'FFFEF3C7',
      'In Progress': 'FFDBEAFE',
      'Not Tested':  'FFF1F5F9',
      'Skipped':     'FFEDE9FE',
    };
    const statusCell = dataRow.getCell('status');
    const bg = statusColors[tc.status];
    if (bg) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      statusCell.font = { bold: true };
    }
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: 'P1' };

  const buffer  = await wb.xlsx.writeBuffer();
  const blob    = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href     = url;
  link.download = `DrBuddy_TestCases_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
