import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extractCart } from './pdfRows.js'
GlobalWorkerOptions.workerSrc = worker
export async function readCartPDF(file) {
  const task = getDocument({
    data: await file.arrayBuffer(),
    isEvalSupported: false,
  })
  try {
    const doc = await task.promise
    if (doc.numPages > 100)
      throw Error('Please use a PDF of 100 pages or fewer.')
    const pages = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      pages.push(
        (await page.getTextContent()).items.filter(
          (t) => typeof t.str === 'string',
        ),
      )
    }
    return extractCart(pages)
  } finally {
    await task.destroy()
  }
}
