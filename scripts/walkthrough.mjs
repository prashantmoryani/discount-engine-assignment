// A repeatable acceptance test against the production page. The exported video
// removes long inference waits; every displayed checkout comes from the live UI.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'

const url = 'https://prashantmoryani.github.io/discount-engine-assignment/'
const directory = 'walkthrough-output'
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || undefined })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: directory, size: { width: 1280, height: 900 } },
})
const page = await context.newPage()
const start = Date.now()
const cuts = []
let segmentStart = 0
const time = () => (Date.now() - start) / 1000
const pause = () => new Promise((resolve) => setTimeout(resolve, 2200))
const total = () => page.locator('.receipt .total b').textContent()
async function expectTotal(value) {
  await page.waitForFunction(
    (v) => document.querySelector('.receipt .total b')?.textContent === v,
    value,
  )
  assert.equal(await total(), value)
}
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  console.log('Live page:', page.url())
  await page.getByRole('button', { name: 'Load sample cart & rules' }).click()
  await expectTotal('₹5,339')
  await pause()
  const description = page.getByLabel('Describe one discount rule')
  await description.fill(
    '20% off for Natura Casa brand, stackable with other offers',
  )
  await page.getByRole('button', { name: 'Parse rule' }).click()
  await pause()
  cuts.push([segmentStart, time()])
  await page
    .getByRole('button', { name: 'Confirm rule' })
    .waitFor({ timeout: 600000 })
  segmentStart = time()
  assert.equal(await total(), '₹5,339')
  assert.match(await page.locator('.review').innerText(), /Natura Casa/)
  await pause()
  await page.getByRole('button', { name: 'Confirm rule' }).click()
  await expectTotal('₹5,026')
  await page.locator('.receipt').scrollIntoViewIfNeeded()
  await pause()
  const cartInput = page.getByLabel('Upload cart CSV or PDF')
  const csv = await readFile('sample-data/cart.csv', 'utf8')
  await cartInput.setInputFiles({
    name: 'one-item.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv.split('\n').slice(0, 2).join('\n')),
  })
  await expectTotal('₹883')
  assert.equal(await page.locator('.receipt .saving').count(), 0)
  await pause()
  await cartInput.setInputFiles('sample-data/cart.pdf')
  await expectTotal('₹5,026')
  assert.equal(
    await page.locator('section[aria-label="Checkout"] tbody tr').count(),
    6,
  )
  await page.locator('.receipt').scrollIntoViewIfNeeded()
  await pause()
  await description.fill('Give a discount for big orders')
  await page.getByRole('button', { name: 'Parse rule' }).click()
  await page.getByText(/Specify a discount amount/).waitFor()
  await pause()
  cuts.push([segmentStart, time()])
  // Check two additional unseen variations and exercise the discard path.
  for (const [input, expected] of [
    [
      'Rs.125 flat discount on all Flipkart items',
      ['platform', 'Flipkart', 'flat', '₹125', 'No'],
    ],
    [
      '12% off if cart value is at least Rs.4,500',
      ['cart', 'percentage', '12%', '₹4500 or more'],
    ],
  ]) {
    await description.fill(input)
    await page.getByRole('button', { name: 'Parse rule' }).click()
    await page
      .getByRole('button', { name: 'Discard' })
      .waitFor({ timeout: 600000 })
    const fields = await page.locator('.review dd').allTextContents()
    for (const value of expected)
      assert.ok(fields.includes(value), JSON.stringify(fields))
    await page.getByRole('button', { name: 'Discard' }).click()
    await expectTotal('₹5,026')
  }
  console.log(
    'Verified live inference, confirm, discard, PDF replacement and ambiguity.',
  )
} finally {
  await context.close()
  await browser.close()
}
const raw = await page.video().path()
const filters = cuts.map(
  ([from, to], i) =>
    '[0:v]trim=start=' +
    from +
    ':end=' +
    to +
    ',setpts=PTS-STARTPTS[s' +
    i +
    ']',
)
filters.push('[s0][s1]concat=n=2:v=1:a=0[out]')
execFileSync('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-i',
  raw,
  '-filter_complex',
  filters.join(';'),
  '-map',
  '[out]',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  directory + '/live-checkout.mp4',
])
