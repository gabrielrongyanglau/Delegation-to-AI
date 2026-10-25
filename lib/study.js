// ─── Study 6 configuration ───────────────────────────────────────────────────
// Two-part AI delegation task for the AI Delegation Scale (AIDS) programme.
//
//   Part 1  Delegation (laptop). Participants decide how much of the laptop
//           choice to hand to the Decision Agent, then supervise (or not) a
//           flawed recommendation. Measures whether and how they delegate.
//   Part 2  Advice (monitor). Judge-advisor design: initial choice and
//           confidence, the agent recommends the other monitor, final choice
//           and confidence. Measures how far the agent's advice moves them.
//
// Everything a researcher is likely to change lives here. The page (to render
// the task) and the API route (to brief the model and check its replies) both
// read this file, so the two cannot drift apart. Part 1 wording is adapted from
// Appendix D; record any change here in the IRB amendment.

export const CHATBOT_NAME = "Decision Agent";

export const INTRO =
  "You will complete two short purchase tasks with an actual AI agent, the Decision Agent. In the first task, you will decide which parts of the work to assign to the Decision Agent. The Decision Agent will generate responses during the tasks, but it cannot access external systems or make a purchase. The products and purchases are fictional, and your decisions will not affect your payment. Please make the decisions you would normally make in this situation.";

// ═════════════════════════════════════════════════════════════════════════════
// PART 1: DELEGATION (LAPTOP)
// ═════════════════════════════════════════════════════════════════════════════

export const TASK_TITLE = "Choose a Laptop for Remote Work and Online Study";
export const TASK_LEAD =
  "You are buying a laptop for remote work and an online course. You need to select one laptop that meets every requirement below.";

export const BUDGET = 900;
export const ADAPTER_COST = 35;

export const REQUIREMENTS = [
  "The total cost must not exceed £900.",
  "The laptop must run Windows because your course software is Windows-only.",
  "It must have at least 16 GB of memory and at least 512 GB of storage.",
  "Battery life must be at least 10 hours and weight must not exceed 1.6 kg.",
  "It must support an external monitor. Laptops without an HDMI port require an HDMI adapter costing £35, which must be included in the total cost.",
];

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
  { code: "self", label: "I will compare the laptop specifications and choose one myself.", outcome: "You will select the laptop yourself." },
  { code: "recommend", label: "The Decision Agent may compare the laptops and recommend one. I will make the final choice.", outcome: "The Decision Agent will provide a recommendation for you to consider." },
  { code: "approve", label: "The Decision Agent may compare the laptops and choose one. I will approve its choice before it is final.", outcome: "The Decision Agent will choose a laptop for your approval." },
  { code: "autonomous", label: "The Decision Agent may compare the laptops, choose one, and finalise the selection without my approval.", outcome: "The Decision Agent will finalise the laptop selection automatically." },
];

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
    heading: (revised) => (revised ? "The Decision Agent’s Revised Recommendation" : "The Decision Agent’s Recommendation"),
    lead: (n) => `The Decision Agent recommends ${n}. You will make the final choice.`,
    goAlong: (n) => ({ code: "accept", label: `Select ${n}, as recommended.`, outcome: `${n} will be selected.` }),
    override: { code: "choose_own", label: "Choose a different laptop myself.", outcome: "You will choose from the seven laptops." },
    reconsider: { code: "reconsider", label: "Ask the Decision Agent to reconsider its recommendation.", outcome: "The Decision Agent will check the requirements again and give a revised recommendation." },
  },
  approve: {
    heading: (revised) => (revised ? "The Decision Agent’s Revised Choice" : "The Decision Agent’s Choice"),
    lead: (n) => `The Decision Agent has chosen ${n} and is waiting for your approval.`,
    goAlong: (n) => ({ code: "approve", label: `Approve ${n}.`, outcome: `${n} will be selected.` }),
    override: { code: "reject", label: "Reject it and choose the laptop myself.", outcome: "You will choose from the seven laptops." },
    reconsider: { code: "reconsider", label: "Ask the Decision Agent to reconsider its choice.", outcome: "The Decision Agent will check the requirements again and choose again." },
  },
  autonomous: {
    heading: (revised) => (revised ? "The Decision Agent’s Revised Selection" : "The Decision Agent’s Selection"),
    lead: (n) => `The Decision Agent has finalised your selection: ${n}. You can keep it or undo it.`,
    goAlong: (n) => ({ code: "keep", label: `Keep ${n}.`, outcome: `${n} stays selected.` }),
    override: { code: "undo", label: "Undo the selection and choose the laptop myself.", outcome: "You will choose from the seven laptops." },
    reconsider: { code: "reconsider", label: "Undo the selection and ask the Decision Agent to reconsider.", outcome: "The Decision Agent will check the requirements again and select again." },
  },
};

// Information panels. Opening one is recorded; nothing requires it.
export const PROGRESS_PANELS = [
  { code: "progress", label: "View the Decision Agent’s progress", text: "The Decision Agent has started checking the laptop specifications, including the cost of an HDMI adapter when needed." },
  { code: "laptops", label: "View the laptop comparison", content: "laptops" },
  { code: "requirements", label: "View your requirements", content: "requirements" },
];

// Panels beside the agent's first (flawed) and revised output. Opening the
// reasoning or details panel on the first output reveals the £920 total.
export const OUTPUT_PANELS = {
  granite: [
    { code: "reasoning", label: "View the Decision Agent’s reasoning", text: "The Decision Agent put forward Granite 14 because of its memory, storage, battery life, and weight. It did not include the £35 HDMI adapter needed because Granite 14 has no HDMI port." },
    { code: "details", label: "View Granite 14’s details", text: "Granite 14 costs £885, runs Windows, has 32 GB of memory, 1 TB of storage, 11 hours of battery life, weighs 1.55 kg, and has no HDMI port. The required adapter brings the total cost to £920." },
    { code: "laptops", label: "View the laptop comparison", content: "laptops" },
    { code: "requirements", label: "View your requirements", content: "requirements" },
  ],
  atlas: [
    { code: "reasoning", label: "View the Decision Agent’s reasoning", text: "The Decision Agent checked every requirement again, including the cost of an HDMI adapter where needed. Atlas 14 meets all five requirements without an adapter." },
    { code: "details", label: "View Atlas 14’s details", text: "Atlas 14 costs £790, runs Windows, has 16 GB of memory, 512 GB of storage, 11 hours of battery life, weighs 1.35 kg, and has an HDMI port, so no adapter is needed. The total cost is £790." },
    { code: "laptops", label: "View the laptop comparison", content: "laptops" },
    { code: "requirements", label: "View your requirements", content: "requirements" },
  ],
};

// Asked of everyone who delegated, once their laptop is selected.
export const RESPONSIBILITY = {
  question: "If the selected laptop turned out to be unsuitable, who would be responsible?",
  low: "Entirely me",
  mid: "Equally",
  high: "Entirely the Decision Agent",
};

// ═════════════════════════════════════════════════════════════════════════════
// PART 2: ADVICE (MONITOR)
// ═════════════════════════════════════════════════════════════════════════════

export const P2_TITLE = "Choose a Monitor for Your Home Office";
export const P2_LEAD =
  "You also need an external monitor to use with your new laptop at home. Both monitors below are within your £350 budget and work with your laptop. Choose the one you prefer.";

// Balanced on purpose: each monitor wins on two attributes, so neither is the
// correct answer and switching reflects the agent's influence, not an error.
export const MONITOR_ATTRIBUTES = [
  { key: "price", label: "Price" },
  { key: "screen", label: "Screen" },
  { key: "sharpness", label: "Sharpness" },
  { key: "connection", label: "Connection" },
  { key: "stand", label: "Stand" },
];

export const MONITORS = {
  A: {
    name: "Vista 27",
    price: "£279",
    screen: "27-inch",
    sharpness: "4K (3840 × 2160): very sharp text and images",
    connection: "HDMI cable for video; the laptop uses its own charger",
    stand: "Tilt only",
  },
  B: {
    name: "Horizon 27",
    price: "£329",
    screen: "27-inch",
    sharpness: "QHD (2560 × 1440): sharp text and images",
    connection: "One USB-C cable for video and charging the laptop",
    stand: "Adjustable height, tilt, and swivel",
  },
};

export const otherMonitor = (key) => (key === "A" ? "B" : "A");

// The agent always recommends the monitor the participant did not choose.
// Each recommendation uses only that monitor's two genuine advantages.
export const MONITOR_ADVICE = {
  A: "Vista 27 is the better fit. Its 4K screen shows noticeably sharper text and images, and at £279 it costs £50 less than Horizon 27.",
  B: "Horizon 27 is the better fit. One USB-C cable connects and charges your laptop, and its adjustable stand lets you set a comfortable height for long work sessions.",
};

export const CONFIDENCE = {
  question: "How confident are you in this choice?",
  low: "Not at all confident",
  high: "Completely confident",
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
  monitor_a: MONITOR_ADVICE.A,
  monitor_b: MONITOR_ADVICE.B,
};
