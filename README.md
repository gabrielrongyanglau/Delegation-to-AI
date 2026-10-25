# AI Delegation Task (Study 6)

The behavioural criterion task for Study 6 of the AI Delegation Scale (AIDS)
project: a laptop-purchase comparison in which participants decide how much of
the work to hand to a GPT-5.6 chatbot, whether to inspect its work, and whether
to accept, question or override its recommendation. The task follows
Appendix D of the IRB application screen by screen.

Participants never see the model name: on screen the system is called the
"Decision Agent", introduced as an AI agent (`CHATBOT_NAME` and the wording
in `lib/study.js`).
Data codes such as `chatbot` and `chatbot_review` are unchanged.

It is adapted from the CareerAdviceAI repository and keeps that repository's
architecture: Next.js on Vercel, embedded in Qualtrics via an `<iframe>`, the
prompt held on the server, and data relayed to Qualtrics embedded data with
`postMessage`.

## The task

Participants choose one laptop that meets five requirements (total cost at
most £900 including a £35 HDMI adapter where needed, Windows, at least 16 GB
memory and 512 GB storage, at least 10 h battery, at most 1.6 kg). Of the seven
laptops, Atlas 14 and Breeze 13 meet every requirement.

The chatbot's first recommendation contains the intended error from
Appendix D: it recommends Granite 14 at £885 and leaves out the adapter, so the
true total is £920.

## Screens and branches

| Screen | What the participant does | Next |
| --- | --- | --- |
| 1. Task and delegation | Reads the task, requirements and table; chooses one of four delegation levels | `self` → 5; otherwise → 2 |
| 2. Chatbot working | May open three information panels (progress, laptop table, requirements) | 3 |
| 3. Recommendation | Sees "Choose Granite 14..."; may open three panels (reasoning, recommended laptop, requirements); accepts, asks to reconsider, or takes control | accept → end (Granite 14); reconsider → 4; take control → 5 |
| 4. Reconsidered | Sees the Atlas 14 recommendation; reviews it first, lets the Decision Agent confirm it, or takes control | review → 4a; allow → end (Atlas 14); take control → 5 |
| 4a. Review Atlas 14 | Sees Atlas 14's details; confirms | End (Atlas 14) |
| 5. Choose yourself | Picks any of the seven laptops | End |

There is no back button; each choice is final, as in the Appendix D flow.
The task ends as soon as a laptop is selected. The purchase-summary stage in
Appendix D has been removed.

`AUTONOMOUS_SKIPS_REVIEW` in `lib/study.js` is `false`, so participants who
choose full delegation still see screen 3, as Appendix D shows. Set it to
`true` and that group instead has Granite 14 finalised for them.

## Chatbot outputs

Appendix D requires every participant to see identical chatbot text, so the
two outputs (the recommendation and the reconsidered recommendation) are fixed
strings in `lib/study.js`. The server asks
the model for them under a fixed prompt (`CHATBOT_PROMPT.txt`) and compares
its reply with the fixed string. `OUTPUT_MODE` sets what happens next:

| `OUTPUT_MODE` | Behaviour | `source` recorded |
| --- | --- | --- |
| `verified` (default) | Calls the model; shows its reply if it matches, otherwise shows the fixed string | `model`, `fallback_mismatch`, or `fallback_error` |
| `model` | Calls the model and shows whatever it returns | `model` or `model_unmatched` |
| `fixed` | Does not call the model; shows the fixed string | `fixed` |

Every output a participant saw is listed in `d6_outputs` with its source, so
any fallback is visible in the data. Pilot in `verified` mode and confirm the
model reproduces all three outputs before launch.

## Files

| File | Role |
| --- | --- |
| `lib/study.js` | All task content: intro, requirements, laptops, choice wording, panel text, chatbot outputs |
| `CHATBOT_PROMPT.txt` | The model's instructions: a `BASE` section plus one section per step. `#` lines are researcher notes and are stripped |
| `app/api/chat/route.js` | Validates the request, builds the prompt, calls OpenAI, checks the reply |
| `app/page.js` | The task screens, information panels, event log and relay to Qualtrics |
| `app/globals.css` | Styling |
| `Qualtrics iframe embed.txt` | Embedded data fields, iframe snippet, and the script that records data and unlocks Next |

## Data recorded in Qualtrics

| Field | Contents |
| --- | --- |
| `d6_delegation` | `self`, `recommend`, `approve`, or `autonomous` |
| `d6_rec_action` | `accept`, `reconsider`, `take_control`, or empty |
| `d6_reconsider_action` | `review`, `allow`, `take_over`, or empty |
| `d6_final_laptop` | Name of the laptop selected |
| `d6_final_valid` | 1 if it meets all five requirements, otherwise 0 |
| `d6_selected_by` | `chatbot` or `self` |
| `d6_panels` | JSON: panels opened on each screen, in order of first opening |
| `d6_outputs` | JSON: chatbot outputs shown and their source |
| `d6_events` | JSON: timestamped log (ms from load) of every screen, panel and choice |
| `d6_complete` | 1 once a laptop has been selected |

## Local development

Requires Node.js 18.18 or newer.

```bash
npm install
```

Create `.env.local` in the project root:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.6
```

```bash
npm run dev
```

Optional: `OPENAI_TEMPERATURE` and `OPENAI_SEED` (sent only when set; some
reasoning models reject a temperature), `OPENAI_MAX_TOKENS` (default 1000),
`OUTPUT_MODE` (see above). `OUTPUT_MODE=fixed` runs the whole flow without an
API key.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repo at <https://vercel.com/new>.
3. Settings → Environment Variables → add `OPENAI_API_KEY` and `OPENAI_MODEL`.
4. Deploy, then follow `Qualtrics iframe embed.txt`.

`next.config.mjs` lists `CHATBOT_PROMPT.txt` under `outputFileTracingIncludes`
so it ships with the serverless function, and sets
`Content-Security-Policy: frame-ancestors` to allow `https://*.qualtrics.com`.

## Known gaps

- The endpoint is unauthenticated. Anyone with the URL can spend API credit,
  though each request is a single short completion.
- The data comes from the browser, so a technically skilled participant could
  alter what is posted to Qualtrics.
