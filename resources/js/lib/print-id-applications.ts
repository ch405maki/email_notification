type Application = {
  id: number
  id_no: string | null
  last_name: string
  first_name: string
  middle_initial: string
  date: string | null
}

function formattedName(app: Application) {
  return `${app.last_name}, ${app.first_name}${app.middle_initial ? ' ' + app.middle_initial + '.' : ''}`
}

function formatDateShort(date: string | null) {
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function printIdApplications(data: Application[], label: string) {
  const rows = data.map((app, i) => `
      <tr>
        <td style="border:1px solid #000;padding:4px 8px">${i + 1}</td>
        <td style="border:1px solid #000;padding:4px 8px">${formatDateShort(app.date)}</td>
        <td style="border:1px solid #000;padding:4px 8px">${app.id_no ?? '—'}</td>
        <td style="border:1px solid #000;padding:4px 8px">${formattedName(app)}</td>
      </tr>`).join('')

  const win = window.open('', '_blank')
  if (!win) return

  win.document.write(`
    <html>
    <head>
      <title>ID Application - ${label}</title>
      <style>
        @page { margin: 15mm 10mm }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; margin: 0; padding: 10px; color: #000; }
        h1 { text-align: center; font-size: 13pt; font-weight: normal; margin: 0 0 16px 0; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; }
        th { border:1px solid #000; padding: 5px 8px; font-weight: normal; background: #f0f0f0; text-align: left; font-size: 9pt; }
        td { border:1px solid #000; padding: 4px 8px; text-align: left; vertical-align: top; }
        .text-center { text-align: center; }
      </style>
    </head>
    <body>
      <h1>Academic Year 2026-2027</h1>
      <table>
        <thead>
          <tr>
            <th style="width:32px" class="text-center">#</th>
            <th style="width:100px">Date</th>
            <th style="width:140px">Student Number</th>
            <th>Full Name</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
