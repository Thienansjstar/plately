# Computer-Vision Output Parsing

How Plately turns a **photo of a meal or a nutrition label** into a structured,
editable food entry. This documents the "vision layer" — from the raw image to
the numbers that land in your diary.

> TL;DR: the image is sent to Claude (a vision-capable LLM) with a strict prompt
> that asks for **JSON only**. Because LLM text output can't be fully trusted to
> be clean JSON, we run it through a defensive extractor (`extractJSON`) and then
> coerce every field to a safe type before showing it. Nothing the model returns
> is used raw.

---

## 1. Where the code lives

| Concern | File | Symbol |
| --- | --- | --- |
| Read the picked file → base64 | `Plately.jsx` | `onPickImage` |
| Build the prompt, call the model, parse | `Plately.jsx` | `runScan` |
| Talk to the Anthropic API (via proxy) | `src/lib/api.js` | `callClaude` |
| Pull JSON out of the model's text | `src/lib/helpers.js` | `extractJSON` |
| Scale by servings → write to diary | `Plately.jsx` | `commitScan` |
| Dev/prod key-safe proxy | `vite.config.js`, `functions/api/claude.js` | `/api/claude` |

The same `extractJSON` + coerce pattern is reused by the **text** AI logger
(`runAILog`), which expects a JSON *array* instead of an object — see §8.

---

## 2. The pipeline at a glance

```
 ┌──────────────┐   data URL    ┌───────────┐  base64 image   ┌─────────────────┐
 │ <input file> │ ────────────▶ │ onPickImage│ ──────────────▶ │ runScan()       │
 │  camera/upload│               │ (FileReader)│                │                 │
 └──────────────┘               └───────────┘                  │ 1. strip prefix │
                                                                │ 2. pick prompt  │
                                                                │ 3. callClaude   │
                                                                └────────┬────────┘
                                                                         │ POST /api/claude
                                                                         ▼
                                                       ┌──────────────────────────────┐
                                                       │ proxy injects x-api-key,       │
                                                       │ forwards to api.anthropic.com  │
                                                       └───────────────┬────────────────┘
                                                                       │ Claude vision
                                                                       ▼
                                                    content: [{type:"text", text:"...JSON..."}]
                                                                       │
                                          callClaude joins text blocks │
                                                                       ▼
                                                   extractJSON(text)  →  parsed object | null
                                                                       │
                                              coerce + clamp each field │ (String / +num / Math.max)
                                                                       ▼
                                                    setScanResult({...})  → editable card
                                                                       │ user adjusts, picks servings
                                                                       ▼
                                                   commitScan() → base × servings → addEntry()
```

---

## 3. Image capture → base64

`onPickImage` (triggered by the camera/upload `<input type="file">`) reads the
file with a `FileReader` as a **data URL**:

```js
reader.onload = () => setScanImg({ dataUrl: reader.result, media: file.type || "image/jpeg" });
```

A data URL looks like `data:image/jpeg;base64,/9j/4AAQ...`. The Anthropic API
wants the **base64 payload only**, so `runScan` strips the prefix:

```js
const b64 = scanImg.dataUrl.split(",")[1];   // drop "data:image/jpeg;base64,"
```

`media` (the MIME type) is kept and passed through as `media_type` so the model
knows how to decode the bytes.

---

## 4. Two modes, two prompts, two schemas

`runScan` branches on `scanMode`. `isLabel = scanMode === "product"`.

### Label mode (`product`) — read the Nutrition Facts panel
System prompt asks the model to **read** (not estimate) the printed values and
return:

```json
{ "name": string, "qty": string, "kcal": number, "protein": number, "carbs": number, "fat": number }
```
`qty` is the serving size *printed on the label* (e.g. "2/3 cup (55g)").

### Meal mode (default) — estimate from a plate photo
System prompt asks the model to identify the dish, estimate **one** serving, and
estimate how many servings are visible:

```json
{
  "name": string,
  "serving_size": string,        // e.g. "1 cup cooked (~200 g)"
  "servings_in_photo": number,   // e.g. 1, 1.5, 2
  "kcal": number, "protein": number, "carbs": number, "fat": number
}
```
Crucially, the prompt says **macros are per ONE serving**, not the whole plate.
The plate total is reconstructed later as `per-serving × servings_in_photo`.

Both prompts end with "Return ONLY JSON (no markdown)". We still assume the model
might disobey (add prose, wrap in ```code fences```), so parsing is defensive.

---

## 5. The API call (`callClaude`)

`runScan` sends a **multimodal user message** — an image block followed by a text
instruction — plus the mode-specific system prompt:

```js
await callClaude(
  [
    { type: "image", source: { type: "base64", media_type: scanImg.media, data: b64 } },
    { type: "text",  text: isLabel ? "Read this product label..." : "Identify this meal..." },
  ],
  sys,   // system prompt from §4
  700,   // max_tokens — responses are tiny JSON objects, so this is plenty
);
```

`callClaude` (`src/lib/api.js`) POSTs to the **`/api/claude` proxy** (never the
Anthropic API directly — that keeps the API key server-side and avoids browser
CORS). The request body:

```js
{ model: "claude-sonnet-4-6", max_tokens, system, messages: [{ role: "user", content: userContent }] }
```

The Anthropic response is a list of content blocks. `callClaude` keeps only the
text blocks and concatenates them into one string:

```js
return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
```

So by the time `runScan` sees it, the model output is a single **string** that
*should* contain JSON but isn't guaranteed to.

---

## 6. Pulling JSON out of the text (`extractJSON`)

This is the heart of the parsing layer. LLMs frequently wrap JSON in markdown
fences or add a sentence before/after it. `extractJSON` (`src/lib/helpers.js`)
extracts the first complete JSON value robustly:

1. **Strip code fences** — remove ` ```json ` and ` ``` ` markers, then `trim()`.
2. **Find the start** — locate the first `{` or `[`, whichever comes first. This
   lets the same function handle both objects (photo scan) and arrays (text AI
   logging) and ignores any leading prose.
3. **Brace/bracket matching** — walk forward counting nesting depth of the
   chosen delimiter (`{}` or `[]`) until depth returns to zero. That index is the
   matching close, so trailing prose after the JSON is ignored too.
4. **Parse** — `JSON.parse` the substring inside `try/catch`.
5. **Fail safe** — return `null` on any problem (no start char, no balanced
   close, or `JSON.parse` throws). Callers treat `null` as "couldn't read it."

```js
const p = extractJSON(txt);
if (!p || typeof p !== "object") throw new Error("parse");   // → friendly error in UI
```

Why a hand-rolled matcher instead of a regex? A regex can't reliably balance
nested braces, and naive `JSON.parse(txt)` breaks the moment the model adds a
single stray word. Depth-matching tolerates fences, prose, and extra trailing
text while still rejecting genuinely malformed output.

---

## 7. Coercion & clamping (never trust the values)

Even valid JSON can have the wrong *types* (a number sent as a string, a missing
field, a negative). Every field is normalized before use:

```js
const servingsInPhoto = isLabel ? 1 : Math.max(0.5, Math.round((+p.servings_in_photo || 1) * 2) / 2);
setScanResult({
  id: uid(),
  name: String(p.name || "Scanned item"),
  qty:  String((isLabel ? p.qty : p.serving_size) || "1 serving"),
  kcal:    Math.max(0, Math.round(+p.kcal    || 0)),
  protein: Math.max(0, Math.round(+p.protein || 0)),
  carbs:   Math.max(0, Math.round(+p.carbs   || 0)),
  fat:     Math.max(0, Math.round(+p.fat     || 0)),
});
```

The rules applied to each field:

- **`String(x || fallback)`** — guarantees a string, with a sensible default if
  the model omitted `name`/`qty`/`serving_size`.
- **`+x || 0`** — coerces "42" or 42 → 42, and `undefined`/`NaN`/`null` → 0.
- **`Math.max(0, Math.round(...))`** — no negatives, whole numbers only.
- **`servings_in_photo`** — clamped to a **minimum of 0.5** and **snapped to the
  nearest half** (`Math.round(x*2)/2`) so it matches the 0.5-step servings
  stepper in the UI. Label mode forces `1` (a label is always one serving).

The result is stored in `scanResult` and rendered as an **editable card** — the
user can correct the name or any macro before it's logged. The model's output is
a starting point, never the final word.

---

## 8. From parsed result → diary entry (`commitScan`)

The card shows **per-serving** macros plus a servings stepper (pre-filled with
`servings_in_photo`). On confirm, `commitScan` scales:

```js
const s = Math.max(0.5, scanServings || 1);
const base  = { kcal, protein, carbs, fat };          // per serving (from the model/edits)
const entry = {
  name: scanResult.name,
  qty:  s === 1 ? scanResult.qty : `${fmtServ(s)} × ${scanResult.qty}`,
  kcal: Math.round(base.kcal * s), /* ...protein/carbs/fat × s... */
  base, unit: scanResult.qty, servings: s,            // base kept so edits re-scale cleanly
};
addEntry(date, meal, entry);
```

Storing `base` + `servings` (not just the totals) is what lets the **Edit entry**
sheet re-scale an entry later without compounding rounding errors.

---

## 9. The text variant (`runAILog`)

"Describe what you ate" uses the **same** `callClaude` + `extractJSON` machinery,
but the prompt asks for a JSON **array** of items:

```json
[ { "name": "...", "qty": "...", "kcal": 0, "protein": 0, "carbs": 0, "fat": 0 }, ... ]
```

`extractJSON` returns the array (it detects `[` as the start char in step 2), and
each element is coerced with the same `String(...)` / `+x||0` / `Math.max` rules.
If Claude is unavailable, it falls back to Nutritionix (`parseNutritionix`).

---

## 10. Error handling

`runScan` distinguishes two failure classes for a useful message:

```js
catch (e) {
  if (/api[_ ]?key/i.test(e?.message || ""))
    setScanError("AI photo scan needs an Anthropic API key...");   // config problem
  else
    setScanError("Couldn't read that image. Try a clearer, closer photo...");
}
```

- **Config errors** bubble up from `callClaude` (the proxy returns 500 with a
  "Missing ANTHROPIC_API_KEY" message when the key isn't set).
- **Parse failures** (`extractJSON` → `null`, or non-object) throw
  `new Error("parse")` and surface the generic "couldn't read it" message —
  prompting the user to retake the photo or add the item manually.

Every path ends in `finally { setScanBusy(false); }` so the spinner always clears.

---

## 11. Design principles (why it's built this way)

- **Strict prompt, loose parser.** Ask for JSON-only, but assume the model may
  still add fences/prose — so the extractor tolerates it.
- **Coerce everything.** Valid JSON ≠ valid data. Type/clamp every field so a bad
  value can't crash the app or write garbage to the diary.
- **Human-in-the-loop.** The parsed result is always editable before it's saved;
  the vision layer proposes, the user disposes.
- **Per-serving as the canonical unit.** The model returns one serving; the app
  owns the multiplication. This keeps scaling, editing, and the servings stepper
  consistent across photo, label, barcode, and manual entries.
- **Keys stay server-side.** All model calls go through `/api/claude`; the browser
  never holds the Anthropic key.

---

## 12. Extending it

- **New fields** (e.g. fiber, sodium): add to the prompt schema *and* add a
  coercion line in `setScanResult` — don't read `p.<field>` raw anywhere.
- **Swap/upgrade the model**: change `model` in `callClaude`. The parsing layer is
  model-agnostic because it only depends on getting text back.
- **Stricter validation**: if you adopt a schema validator (e.g. Zod), run it on
  the `extractJSON` output before coercion; keep the coercion as a fallback for
  partial results.
