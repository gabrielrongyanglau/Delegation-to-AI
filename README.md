# AI Delegation Task (Study 6)

The behavioural criterion task for Study 6 of the AI Delegation Scale (AIDS)
project. Participants choose a laptop with an AI agent, the "Decision Agent",
deciding how much of the work to hand over to it. The task measures whether
and how much people delegate, how closely they check the agent's work, whether
they accept its flawed choice, and where they place responsibility.
Participants never see the model name; on screen the system is always the
Decision Agent.

The app keeps the architecture of the CareerAdviceAI repository: Next.js on
Vercel, embedded in Qualtrics via an `<iframe>`, the prompt held on the server,
and data relayed to Qualtrics embedded data with `postMessage`.

## The task

Seven laptops; Atlas 14 and Breeze 13 meet all five requirements. The agent
first puts forward Granite 14 at £885, leaving out the £35 HDMI adapter it
needs (true total £920, over the £900 limit). If asked to reconsider, it puts
forward Atlas 14.

| Screen | What happens |
| --- | --- |
| Task and delegation | Participant reads the task and chooses a delegation level |
| Agent working | Delegators only. Three optional panels (progress, laptop table, requirements) |
| Agent output | The agent puts forward Granite 14. What has already happened depends on the level (below). Four optional panels: reasoning and details (both reveal the £920 total), laptop table, requirements |
| Revised output | Only after "reconsider". The agent puts forward Atlas 14; same panels; reconsider is not offered again |
| Choose yourself | Self-choosers, and anyone who overrides the agent. Pick from the seven laptops |
| End | Every participant rates responsibility (1 Entirely me to 7 Entirely the Decision Agent) |

The three delegation levels differ in what the agent has already done, and so
in what it takes to override it:

| Level | Agent output framed as | Go along | Question | Override |
| --- | --- | --- | --- | --- |
| `recommend` | A recommendation; the participant decides | `accept` | `reconsider` | `choose_own` |
| `approve` | A choice awaiting approval | `approve` | `reconsider` | `reject` |
| `autonomous` | A finalised selection that can be undone | `keep` | `reconsider` (undoes it) | `undo` |

## Reloads and devices

Progress is saved in the browser after every change. If the page is refreshed
or the survey reopened, the participant resumes on the same screen with the
same agent text, instead of restarting the task. Qualtrics passes its response
ID in the iframe URL (`?rid=`), so each response has its own saved progress.
`d6_reloads` counts resumptions before the task was finished, and a `restored`
event marks every reload in `d6_events`. Consider excluding, or checking, rows where it is above 0.

On screens narrower than 640px the laptop table becomes one card per laptop,
so all eight specifications, including the HDMI port, are visible on phones
without sideways scrolling.

## Agent outputs

Every participant at a given point sees identical agent text. The two outputs
(the flawed laptop choice and the revised laptop choice) are fixed strings in
`lib/study.js`. The server asks the model for them
under a fixed prompt (`CHATBOT_PROMPT.txt`) and compares its reply with the fixed
string. `OUTPUT_MODE` sets what happens next:

| `OUTPUT_MODE` | Behaviour | `source` recorded |
| --- | --- | --- |
| `verified` (default) | Calls the model; shows its reply if it matches, otherwise shows the fixed string | `model`, `fallback_mismatch`, or `fallback_error` |
| `model` | Calls the model and shows whatever it returns | `model` or `model_unmatched` |
| `fixed` | Does not call the model; shows the fixed string | `fixed` |

Every output a participant saw is listed in `d6_outputs` with its source, so
any fallback is visible in the data. Pilot in `verified` mode and confirm the
model reproduces both outputs before launch.

## Data recorded in Qualtrics

| Field | Contents |
| --- | --- |
| `d6_delegation` | `self`, `recommend`, `approve`, or `autonomous` |
| `d6_action1` | Response to Granite 14: `accept`, `approve`, `keep`, `reconsider`, `choose_own`, `reject`, `undo`; empty for self |
| `d6_action2` | Response to Atlas 14 after reconsidering; otherwise empty |
| `d6_final_laptop` | Laptop selected |
| `d6_final_valid` | 1 if it meets all five requirements, otherwise 0 |
| `d6_final_source` | `agent` (went along with the agent) or `own` (chose from the list) |
| `d6_accepted_flaw` | Delegators: 1 if they went along with Granite 14 without questioning it, otherwise 0 |
| `d6_responsibility` | Every participant: 1 (Entirely me) to 7 (Entirely the Decision Agent) |
| `d6_panels` | JSON: panels opened on each screen (`working`, `output_first`, `output_revised`), in order |
| `d6_outputs` | JSON: agent outputs shown and their source |
| `d6_events` | JSON: timestamped log (ms from load) of every screen, panel, choice and rating |
| `d6_reloads` | Times the task was reloaded and resumed; normally 0 |
| `d6_complete` | 1 once the task is finished |

Useful derived measures: any delegation (`d6_delegation` is not `self`);
delegation level (1 to 4); verification (opened `reasoning` or `details` on
`output_first`); time on each screen from `d6_events`.

## Files

| File | Role |
| --- | --- |
| `lib/study.js` | All task content: intro, requirements, laptops, level wording, panels, agent outputs, rating anchors |
| `CHATBOT_PROMPT.txt` | The model's instructions: task briefing, shared style rules and one section per step. `#` lines are researcher notes and are stripped |
| `app/api/chat/route.js` | Validates the request, builds the prompt, calls OpenAI, checks the reply |
| `app/page.js` | The task screens, information panels, event log and relay to Qualtrics |
| `app/globals.css` | Styling |
| `Qualtrics iframe embed.txt` | Embedded data fields, iframe snippet, and the script that records data and unlocks Next |

## Local development

Requires Node.js 18.18 or newer.

```bash
npm install
```

Create `.env.local` in the project root:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.6-luna
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
