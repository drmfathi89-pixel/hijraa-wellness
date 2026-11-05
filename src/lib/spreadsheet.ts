// Reads the first sheet of an .xlsx or .csv file in the browser, as rows of cells.
export function parseCSV(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out
}


export async function readSpreadsheet(f: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(f.name)) return parseCSV(await f.text())
  if (/\.xlsx$/i.test(f.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    return (await readSheet(f)) as unknown[][]
  }
  throw new Error('Please choose an .xlsx or .csv file (in Excel: File > Save As > Excel Workbook .xlsx)')
}
