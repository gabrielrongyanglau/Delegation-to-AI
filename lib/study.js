// ─── Study 6 configuration ───────────────────────────────────────────────────
// AI Delegation Task (Laptop Purchase), Appendix D of the AI Delegation Scale
// IRB application. Everything a researcher is likely to change lives here: the
// task text, the laptops, the choice wording on each screen, and the Decision Agent's
// scripted outputs. The page (to render the task) and the API route (to brief
// the model and check its replies) both read this file, so they cannot drift.
//
// Wording below is copied from Appendix D. If the IRB-approved wording changes,
// change it here and nowhere else.

export const CHATBOT_NAME = "Decision Agent";

export const INTRO =
  "You will complete a laptop-purchase comparison task. You will decide which parts of the work to assign to an actual AI agent, the Decision Agent. The Decision Agent will generate responses during the task, but it cannot access external systems or make a purchase. The products and purchase are fictional, and your decisions will not affect your payment. Please make the decisions you would normally make in this situation.";

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

// Display order matches the Appendix D table. storageGb is used only for the
// requirement check; `storage` is what participants see.
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

// True only if the laptop meets all five requirements. With the Appendix D
// table, Atlas 14 and Breeze 13 (£755 + £35 adapter = £790) both qualify.
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

// ─── Screen choices (Appendix D wording) ─────────────────────────────────────
// `code` is what is written to Qualtrics. Do not reuse codes across screens.

export const DELEGATION_CHOICES = [
  { code: "self", label: "I will compare the laptop specifications and choose one myself.", outcome: "You will select the laptop yourself." },
  { code: "recommend", label: "The Decision Agent may compare the laptops and recommend one. I will make the final choice.", outcome: "The Decision Agent will provide a recommendation for you to consider." },
  { code: "approve", label: "The Decision Agent may compare the laptops and choose one. I will approve its choice before it is final.", outcome: "The Decision Agent will choose a laptop for your approval." },
  { code: "autonomous", label: "The Decision Agent may compare the laptops, choose one, and finalise the selection without my approval.", outcome: "The Decision Agent will finalise the laptop selection automatically." },
];

// Appendix D shows every delegating participant the same recommendation screen,
// including those who chose "autonomous". Set this to true to finalise Granite
// 14 automatically for that group instead (they then skip the accept/reconsider
// /take-control screen). Check with the IRB-approved flow before changing it.
export const AUTONOMOUS_SKIPS_REVIEW = false;

export const RECOMMENDATION_CHOICES = [
  { code: "accept", label: "Accept the recommendation and select Granite 14.", outcome: "Granite 14 will be selected." },
  { code: "reconsider", label: "Ask the Decision Agent to reconsider the recommendation.", outcome: "The Decision Agent will compare the requirements again and provide a revised recommendation." },
  { code: "take_control", label: "Take control and choose the laptop myself.", outcome: "You will choose the laptop yourself." },
];

export const RECONSIDER_CHOICES = [
  { code: "review", label: "Review the revised recommendation before confirming it.", outcome: "You will review Atlas 14 before it is selected." },
  { code: "allow", label: "Allow the Decision Agent to confirm Atlas 14 without my review.", outcome: "Atlas 14 will be selected." },
  { code: "take_over", label: "Take control and choose the laptop myself.", outcome: "You will choose the laptop yourself." },
];

export const SUMMARY_CHOICES = [
  { code: "self", label: "I will prepare the purchase summary myself.", outcome: "You will prepare the summary." },
  { code: "chatbot", label: "The Decision Agent will prepare the purchase summary.", outcome: "The Decision Agent will prepare the summary." },
  { code: "chatbot_review", label: "The Decision Agent will prepare the purchase summary, and I will review it before saving it.", outcome: "The Decision Agent will prepare the summary for your review." },
];

// ─── Information panels (Appendix D wording) ─────────────────────────────────

export const PROGRESS_PANELS = [
  { code: "progress", label: "View the Decision Agent’s progress", text: "The Decision Agent has started checking the laptop specifications, including the cost of an HDMI adapter when needed." },
  { code: "laptops", label: "View the laptop comparison", content: "laptops" },
  { code: "requirements", label: "View your requirements", content: "requirements" },
];

export const RECOMMENDATION_PANELS = [
  { code: "reasoning", label: "View the Decision Agent’s reasoning", text: "The Decision Agent recommended Granite 14 because of its memory, storage, battery life, and weight. It did not include the £35 HDMI adapter needed because Granite 14 has no HDMI port." },
  { code: "selected", label: "View the recommended laptop", text: "Granite 14 costs £885, runs Windows, has 32 GB of memory, 1 TB of storage, 11 hours of battery life, weighs 1.55 kg, and has no HDMI port. The required adapter brings the total cost to £920." },
  { code: "requirements", label: "View your requirements", content: "requirements" },
];

// ─── Chatbot outputs ─────────────────────────────────────────────────────────
// Appendix D states that every participant sees the same chatbot text. These
// are the exact strings. The API route asks the model for them under fixed
// settings and checks the reply against them (see README, "Chatbot outputs").

export const OUTPUTS = {
  // Contains the intended error: the £35 adapter is left out, so Granite 14
  // actually costs £920 and breaks the £900 limit.
  recommend:
    "Choose Granite 14. It has the strongest memory and storage, meets the Windows, battery, and weight requirements, and costs £885.",
  // Appendix D words this in the third person ("It now recommends Atlas 14...").
  // Here the screen keeps "The Decision Agent has reviewed the requirements
  // again." as narration, and the reply takes the same form as the agent's
  // first recommendation ("Choose ...").
  reconsider:
    "Choose Atlas 14. It meets all five requirements without an adapter, and the total cost is £790.",
};

export const RECOMMENDED_FIRST = "granite";
export const RECOMMENDED_REVISED = "atlas";

// The purchase summary the Decision Agent prepares. It is accurate for whichever laptop
// was selected (it includes the adapter where needed), so the summary itself
// carries no second planted error. Appendix D does not give this text; check
// the wording with the team before data collection.
export function summaryFor(id) {
  const l = laptopById(id);
  if (!l) return "";
  const cost = l.hdmi
    ? `£${l.price} (no adapter needed; it has an HDMI port)`
    : `£${totalCost(l)} (£${l.price} for the laptop plus £${ADAPTER_COST} for the required HDMI adapter)`;
  return `Purchase summary: ${l.name} for remote work and an online course. Total cost: ${cost}. Specifications: ${l.os}, ${l.memoryGb} GB memory, ${l.storage} storage, ${l.batteryH} hours battery life, ${fmtWeight(l.weightKg)}.`;
}

// Minimum length of a summary the participant writes themselves.
export const MIN_SUMMARY_CHARS = 20;
