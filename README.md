# Opptra Discount Engine

[Live checkout](https://prashantmoryani.github.io/discount-engine-assignment/) · [Submission fork](https://github.com/prashantmoryani/discount-engine-assignment)

## Run locally

1. With Node.js 22 or 24 and Git installed, run `git clone https://github.com/prashantmoryani/discount-engine-assignment.git`, then `cd discount-engine-assignment`.
2. Run `npm ci`, then `npm run dev`. Open the local address printed by Vite.

Run `npm test` for regression tests. To test the production bundle, run `npm run build` followed by `npm run preview`. GitHub Actions runs the tests and build before deploying the main branch to GitHub Pages.

## Try the live checkout

1. Click **Load sample cart & rules**. Six final item prices should read ₹1,104, ₹629, ₹509, ₹2,499, ₹382 and ₹809. The subtotal is ₹5,932. The separate 10% cart offer saves ₹593, giving a final total of **₹5,339**. The ceramic vase has no offer.
2. Enter **20% off for Natura Casa brand, stackable with other offers** and select **Parse rule**. First use downloads a 491 MB quantized Qwen2.5 model from Hugging Face. Use a recent desktop browser, a stable connection, and keep the tab open. The language model runs on the CPU through WebAssembly. No API key is required. Review the target, type, value, stacking and threshold. Discard leaves the total at ₹5,339. Confirming that rule once changes it to **₹5,026**.
3. Load the sample again. Download the sample PDF. Upload a smaller CSV containing the header and first item from `sample-data/cart.csv`. The subtotal is ₹1,104 and the cart offer disappears. Now upload `sample-data/cart.pdf` into the same input. All six items replace the smaller cart, the four active rules remain, and ₹5,339 returns automatically. The two original CSV input paths are also available independently.
4. Try **Give a discount for big orders**. The form asks for a specific amount. Try a malformed PDF or CSV; the previous checkout remains available while the error identifies what needs attention.

## How the implementation works

- **Pricing.** The starter's pure item engine matches brand/platform case-insensitively, takes the greatest whole-rupee non-stackable saving (first rule wins a tie), then applies stackables in input order to the remaining price. Flat savings are capped at the remaining price. The checkout wrapper computes the subtotal, evaluates every cart threshold against that same subtotal, then applies the best eligible non-stackable cart offer followed by eligible stackables. A cart offer is displayed on a separate line.
- **Rounding and thresholds.** The engine retains the starter’s whole-rupee convention, rounding each percentage saving before subtracting it. Thresholds are inclusive. In particular, the brief's “more than Rs.5,000” example maps to “₹5,000 or more”; the confirmation explicitly displays this interpretation. Rules with smaller discounts can win on lower-price items.
- **Rule input.** A few-shot prompt includes the known brand and platform names. The model proposes JSON. The validator checks field types, ranges, scope, target and threshold; the proposed target and amounts must occur in the input. Errors and ambiguous requests never change the active rules. Human confirmation is the final semantic check. Prices are calculated exclusively by the engine. Cart and rule state lasts for the current page session.
- **PDF input.** PDF.js extracts text positions on each page. The four header positions define the column boundaries. Tokens on the same baseline form a row, preserving multiword names. A valid file replaces the entire cart. A malformed row rejects the entire import to prevent silent undercharging. Supported input is a selectable-text table with one product per line and consistent columns. Scans, wrapped rows and arbitrary invoice layouts require OCR or a different adapter.
- **Code map.** `src/engine/discountEngine.js` prices items and carts. `src/engine/csvParser.js` handles CSV. `src/inputs/` holds PDF extraction, LLM inference and shared validation. `src/components/RuleForm.jsx` controls preview/confirm/discard. `src/App.jsx` owns the current cart and rules. A new input adapter only needs to produce the same objects.
- **Tradeoff.** Local inference avoids a server, shared credentials and per-request charges. The first download and CPU inference can be slow, especially on phones. A production service could replace the inference adapter with a hosted model while retaining the validator, review step and calculator.

## Walkthrough recording

[Watch the narrated live walkthrough (MP4, 85 seconds)](https://prashantmoryani.github.io/discount-engine-assignment/live-checkout.mp4). Recorded against the public GitHub Pages deployment, with synthetic narration and inference waits shortened. The [production acceptance run](https://github.com/prashantmoryani/discount-engine-assignment/actions/runs/45223236440) verifies model inference for brand, platform and cart offers, confirmation, discard, PDF replacement and ambiguity handling.

Open the live checkout and follow the first three steps above. Show the stacked Bed Sheet Set, the full-price Ceramic Vase, the separate cart saving, the parsed rule before and after confirming, then the PDF replacing a different cart. The recording should capture the deployed URL.
