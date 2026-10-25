// ─── Study 6 configuration ───────────────────────────────────────────────────
// AI delegation task for the AI Delegation Scale (AIDS) programme.
//
// Participants decide how much of a laptop choice to hand to the Decision
// Agent, then supervise (or not) a flawed choice it puts forward. The task
// measures whether and how much people delegate, how closely they check the
// agent's work, whether they accept its flawed output, and where they place
// responsibility.
//
// Everything a researcher is likely to change lives here. The page (to render
// the task) and the API route (to brief the model and check its replies) both
// read this file, so the two cannot drift apart. Wording is adapted from
// Appendix D; record any change here in the IRB amendment.

export const CHATBOT_NAME = "Decision Agent";

export const INTRO =
  "You will complete a short purchase task with the Decision Agent, an actual AI agent. It writes its own responses during the task, but it cannot access other systems or buy anything. The products are fictional, and your choices will not affect your payment. Please decide as you normally would.";

export const TASK_TITLE = "Choose a laptop";
export const TASK_GOAL = "You are buying a laptop for remote work and an online course.";
export const TASK_LEAD = "You need to select one laptop that meets every requirement below.";

export const BUDGET = 900;
export const ADAPTER_COST = 35;

// Shown as a checklist: a short label, then the requirement itself.
export const REQUIREMENTS = [
  { label: "Total cost", text: "Must be no more than £900, including an HDMI adapter if one is needed." },
  { label: "Operating system", text: "Must run Windows, because your course software only works on Windows." },
  { label: "Memory and storage", text: "Must have at least 16 GB of memory and at least 512 GB of storage." },
  { label: "Battery and weight", text: "Must have at least 10 hours of battery life and weigh no more than 1.6 kg." },
  { label: "External monitor", text: "Must connect to an external monitor. A laptop without an HDMI port needs a £35 HDMI adapter, which counts towards the total cost." },
]

// storageGb is used only for the requirement check; `storage` is displayed.
export const LAPTOPS = [
  { id: "atlas", name: "Atlas 14", price: 790, os: "Windows", memoryGb: 16, storage: "512 GB", storageGb: 512, batteryH: 11, weightKg: 1.35, hdmi: true },
  { id: "breeze", name: "Breeze 13", price: 755, os: "Windows", memoryGb: 16, storage: "512 GB", storageGb: 512, batteryH: 10, weightKg: 1.55, hdmi: false },
  { id: "cedar", name: "Cedar 14", price: 865, os: "macOS", memoryGb: 16, storage: "512 GB", storageGb: 512, batteryH: 14, weightKg: 1.24, hdmi: true },
  { id: "dune", name: "Dune 14", price: 695, os: "Windows", memoryGb: 8, storage: "512 GB", storageGb: 512, batteryH: 12, weightKg: 1.3, hdmi: true },
  { id: "eclipse", name: "Eclipse 15", price: 820, os: "Windows", memoryGb: 16, storage: "1 TB", storageGb: 1024, batteryH: 8, weightKg: 1.45, hdmi: true },
  { id: "fjord", name: "Fjord 15", price: 840, os: "Windows", memoryGb: 16, storage: "512 GB", storageGb: 512, batteryH: 12, weightKg: 1.7, hdmi: true },
  { id: "granite", name: "Granite 14", price: 885, os: "Windows", memoryGb: 32, storage: "1 TB", storageGb: 1024, batteryH: 11, weightKg: 1.55, hdmi: false },
];

export const laptopById = (id) => LAPTOPS.find((l) => l.id === id) ?? null;
export const totalCost = (l) => l.price + (l.hdmi ? 0 : ADAPTER_COST);

// True only if the laptop meets all five requirements. Atlas 14 and Breeze 13
// (£755 + £35 adapter = £790) both qualify.
export function meetsRequirements(l) {
  return (
    totalCost(l) <= BUDGET &&
    l.os === "Windows" &&
    l.memoryGb >= 16 &&
    l.storageGb >= 512 &&
    l.batteryH >= 10 &&
    l.weightKg <= 1.6
  );
}

export const fmtWeight = (kg) => `${kg.toFixed(2)} kg`;

// `code` values are what is written to Qualtrics.
export const DELEGATION_CHOICES = [
  { code: "self", label: "I compare the laptops and choose one myself.", outcome: "You will choose from the seven laptops." },
  { code: "recommend", label: "The Decision Agent compares the laptops and recommends one. I make the final choice.", outcome: "You will see the Decision Agent’s recommendation, then choose." },
  { code: "approve", label: "The Decision Agent compares the laptops and chooses one. I approve its choice before it is final.", outcome: "The Decision Agent’s choice will not be final until you approve it." },
  { code: "autonomous", label: "The Decision Agent compares the laptops, chooses one, and finalises it without my approval.", outcome: "The Decision Agent’s choice will be finalised without asking you." },
]

// The laptop the agent puts forward first (flawed) and after reconsidering.
export const RECOMMENDED_FIRST = "granite";
export const RECOMMENDED_REVISED = "atlas";

// What each delegation level looks like once the agent has a laptop to put
// forward. The three levels differ in what has already happened (recommended,
// chosen pending approval, or finalised) and so in what the participant must do
// to override it. `n` is the laptop's name.
//
// Action codes written to Qualtrics:
//   go-along   accept (recommend) | approve (approve) | keep (autonomous)
//   override   choose_own (recommend) | reject (approve) | undo (autonomous)
//   question   reconsider (all levels; offered once)
export const LEVELS = {
  recommend: {
    heading: (revised) => (revised ? "The Decision Agent’s revised recommendation" : "The Decision Agent’s recommendation"),
    lead: (n, revised) =>
      revised
        ? `The Decision Agent checked the requirements again and now recommends ${n}. You make the final choice.`
        : `The Decision Agent recommends ${n}. You make the final choice.`,
    goAlong: (n) => ({ code: "accept", label: `Select ${n}, as recommended.`, outcome: `${n} will be selected.` }),
    reconsider: () => ({ code: "reconsider", label: "Ask the Decision Agent to reconsider its recommendation.", outcome: "It will check the requirements again and give a new recommendation." }),
    override: () => ({ code: "choose_own", label: "Choose a laptop myself.", outcome: "You will choose from the seven laptops." }),
  },
  approve: {
    heading: (revised) => (revised ? "The Decision Agent’s revised choice" : "The Decision Agent’s choice"),
    lead: (n, revised) =>
      revised
        ? `The Decision Agent checked the requirements again and has now chosen ${n}. It is not final until you approve it.`
        : `The Decision Agent has chosen ${n}. It is not final until you approve it.`,
    goAlong: (n) => ({ code: "approve", label: `Approve ${n}.`, outcome: `${n} will be selected.` }),
    reconsider: () => ({ code: "reconsider", label: "Ask the Decision Agent to reconsider its choice.", outcome: "It will check the requirements again and make a new choice." }),
    override: (n) => ({ code: "reject", label: `Reject ${n} and choose a laptop myself.`, outcome: "You will choose from the seven laptops." }),
  },
  autonomous: {
    heading: (revised) => (revised ? "The Decision Agent’s revised selection" : "The Decision Agent’s selection"),
    lead: (n, revised) =>
      revised
        ? `The Decision Agent checked the requirements again and has now selected and finalised ${n}. You can keep it or undo it.`
        : `The Decision Agent has selected and finalised ${n}. You can keep it or undo it.`,
    goAlong: (n) => ({ code: "keep", label: `Keep ${n}.`, outcome: `${n} stays selected.` }),
    reconsider: (n) => ({ code: "reconsider", label: `Undo ${n} and ask the Decision Agent to reconsider.`, outcome: "It will check the requirements again and make a new selection." }),
    override: (n) => ({ code: "undo", label: `Undo ${n} and choose a laptop myself.`, outcome: "You will choose from the seven laptops." }),
  },
};

// Information panels. Opening one is recorded; nothing requires it.
export const PROGRESS_PANELS = [
  { code: "progress", label: "View the Decision Agent’s progress", text: "The Decision Agent has started checking each laptop’s specifications, including the cost of an HDMI adapter where one is needed." },
  { code: "laptops", label: "View all seven laptops", content: "laptops" },
  { code: "requirements", label: "View your requirements", content: "requirements" },
];

// Panels beside the agent's first (flawed) and revised output. Opening the
// reasoning or details panel on the first output reveals the £920 total.
export const OUTPUT_PANELS = {
  granite: [
    { code: "reasoning", label: "View the Decision Agent’s reasoning", text: "The Decision Agent picked Granite 14 for its memory, storage, battery life, and weight. It did not add the cost of the £35 HDMI adapter, which Granite 14 needs because it has no HDMI port." },
    { code: "details", label: "View Granite 14’s details", text: "Granite 14 costs £885, runs Windows, has 32 GB of memory, 1 TB of storage, 11 hours of battery life, weighs 1.55 kg, and has no HDMI port. With the £35 HDMI adapter it needs, the total cost is £920." },
    { code: "laptops", label: "View all seven laptops", content: "laptops" },
    { code: "requirements", label: "View your requirements", content: "requirements" },
  ],
  atlas: [
    { code: "reasoning", label: "View the Decision Agent’s reasoning", text: "The Decision Agent checked every requirement again, including the cost of an HDMI adapter where one is needed. Atlas 14 meets all five requirements and needs no adapter." },
    { code: "details", label: "View Atlas 14’s details", text: "Atlas 14 costs £790, runs Windows, has 16 GB of memory, 512 GB of storage, 11 hours of battery life, weighs 1.35 kg, and has an HDMI port. It needs no adapter, so the total cost is £790." },
    { code: "laptops", label: "View all seven laptops", content: "laptops" },
    { code: "requirements", label: "View your requirements", content: "requirements" },
  ],
};

// Asked of every participant, once their laptop is selected.
export const RESPONSIBILITY = {
  question: "If the selected laptop turned out to be unsuitable, who would be responsible?",
  low: "Entirely me",
  mid: "Both equally",
  high: "Entirely the Decision Agent",
};

// ═════════════════════════════════════════════════════════════════════════════
// AGENT OUTPUTS
// ═════════════════════════════════════════════════════════════════════════════
// Every participant at a given point sees identical agent text. The API route
// asks the model for these exact strings under a fixed prompt and checks the
// reply (see README, "Agent outputs"). Step names are what the page requests.

export const OUTPUTS = {
  // Contains the intended error: the £35 adapter is left out, so Granite 14
  // actually costs £920 and breaks the £900 limit.
  recommend:
    "Granite 14 is the best fit. It has the strongest memory and storage, meets the Windows, battery, and weight requirements, and costs £885.",
  reconsider:
    "Atlas 14 is the best fit. It meets all five requirements without an adapter, and the total cost is £790.",
};
