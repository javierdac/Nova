/**
 * Client-side CSV and print-to-PDF helpers (no external dependency).
 */

export function exportToCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Print-to-PDF: opens a print window scoped to the given HTML. Users can
 * "Save as PDF" from the browser print dialog — works without a PDF library.
 */
export function exportToPDF(title: string, html: string): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  const logo = `${window.location.origin}/octopus.png`;
  win.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;color:#0f172a;}
      h1{font-size:22px;margin-bottom:4px;} h2{font-size:15px;margin-top:24px;}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
      th,td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left;}
      th{background:#f1f5f9;} pre{white-space:pre-wrap;font-size:13px;line-height:1.6;}
      .muted{color:#64748b;font-size:12px;}
      .brand{display:flex;align-items:center;gap:12px;border-bottom:2px solid #1f2937;padding-bottom:14px;margin-bottom:20px;}
      .brand img{width:40px;height:40px;object-fit:contain;}
      .brand .name{font-size:20px;font-weight:700;line-height:1;color:#1f2937;}
      .brand .tag{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin-top:3px;}
    </style></head><body>
    <div class="brand"><img src="${logo}" alt="Nova"/><div><div class="name">Nova</div><div class="tag">Engineering Intelligence Platform</div></div></div>
    ${html}
    <script>
      (function(){
        var img=document.querySelector('.brand img');
        var done=false; var go=function(){ if(done) return; done=true; window.focus(); window.print(); };
        if(img && !img.complete){ img.addEventListener('load',go); img.addEventListener('error',go); }
        setTimeout(go,800);
      })();
    </script>
    </body></html>`);
  win.document.close();
}

export const formatUSD = (n?: number): string =>
  n === undefined || n === null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`;
