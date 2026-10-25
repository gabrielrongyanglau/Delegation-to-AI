"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHATBOT_NAME,
  DELEGATION_CHOICES,
  INTRO,
  LAPTOPS,
  LEVELS,
  OUTPUT_PANELS,
  PROGRESS_PANELS,
  RECOMMENDED_FIRST,
  RECOMMENDED_REVISED,
  REQUIREMENTS,
  RESPONSIBILITY,
  TASK_GOAL,
  TASK_LEAD,
  TASK_TITLE,
  fmtWeight,
  laptopById,
  meetsRequirements,
} from "../lib/study";

// Pause after a reply arrives, before it is shown, so the Decision Agent does
// not answer instantly. Purely presentational; 0 removes it.
const THINKING_DELAY_MS = 1500;

const POST_TYPE = "ai-delegation-task";

// ─── Shared pieces ───────────────────────────────────────────────────────────

// The five requirements as a checklist: label on the left, rule on the right.
function RequirementsList() {
  return (
    <dl className="requirements">
      {REQUIREMENTS.map((r) => (
        <div key={r.label} className="requirement">
          <dt>
            <svg className="check" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4.8 8.2 7 10.3l4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {r.label}
          </dt>
          <dd>{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}

// The task itself, set apart so the goal is the first thing participants read.
function TaskBrief({ goal, lead, children }) {
  return (
    <div className="brief">
      <p className="brief-goal">{goal}</p>
      <p className="brief-lead">{lead}</p>
      {children}
    </div>
  );
}

function LaptopTable() {
  return (
    <div className="table-scroll">
      <table className="laptops">
        <thead>
          <tr>
            <th scope="col">Model</th>
            <th scope="col">Price</th>
            <th scope="col">Operating system</th>
            <th scope="col">Memory</th>
            <th scope="col">Storage</th>
            <th scope="col">Battery</th>
            <th scope="col">Weight</th>
            <th scope="col">HDMI port</th>
          </tr>
        </thead>
        <tbody>
          {LAPTOPS.map((l) => (
            <tr key={l.id}>
              <th scope="row">{l.name}</th>
              <td>£{l.price}</td>
              <td>{l.os}</td>
              <td>{l.memoryGb} GB</td>
              <td>{l.storage}</td>
              <td>{l.batteryH} h</td>
              <td>{fmtWeight(l.weightKg)}</td>
              <td>{l.hdmi ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Optional information panels. Opening one is recorded; nothing forces it.
function Panels({ panels, screen, onOpen }) {
  return (
    <div className="panels">
      {panels.map((p) => (
        <details
          key={p.code}
          className="panel"
          onToggle={(e) => e.currentTarget.open && onOpen(screen, p.code)}
        >
          <summary>{p.label}</summary>
          <div className="panel-body">
            {p.text && <p>{p.text}</p>}
            {p.content === "requirements" && <RequirementsList />}
            {p.content === "laptops" && <LaptopTable />}
          </div>
        </details>
      ))}
    </div>
  );
}

// One-of-n choice shown as a grouped list: the option, then what will happen.
function ChoiceGroup({ name, legend, choices, value, onChange }) {
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      {choices.map((c) => (
        <label key={c.code} className={`choice${value === c.code ? " selected" : ""}`}>
          <input
            type="radio"
            name={name}
            value={c.code}
            checked={value === c.code}
            onChange={() => onChange(c.code)}
          />
          <span className="choice-text">
            <span className="choice-label">{c.label}</span>
            {c.outcome && <span className="choice-outcome">{c.outcome}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

// A 1-to-7 rating with labelled ends (and an optional labelled midpoint).
function Scale({ name, question, low, mid, high, value, onChange }) {
  return (
    <fieldset className="scale">
      <legend>{question}</legend>
      <div className="scale-points">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <label key={n} className={`scale-point${value === n ? " selected" : ""}`}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <div className="scale-anchors" aria-hidden="true">
        <span>{low}</span>
        {mid && <span className="scale-mid">{mid}</span>}
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

// The agent's mark: a simple geometric glyph, no brand imagery.
function AgentMark({ size = 32 }) {
  return (
    <svg className="agent-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="16" cy="16" r="2.2" fill="#fff" />
    </svg>
  );
}

// The indeterminate line shown while the agent is working.
function WorkingLine({ label = "Working" }) {
  return (
    <div className="working" role="status">
      <span className="working-label">{label}</span>
      <span className="working-track" aria-hidden="true">
        <span className="working-bar" />
      </span>
    </div>
  );
}

function AgentOutput({ children, thinking }) {
  return (
    <div className="output" aria-live="polite">
      <div className="output-head">
        <AgentMark size={22} />
        <span className="output-name">{CHATBOT_NAME}</span>
      </div>
      <div className="output-body">{thinking ? <WorkingLine /> : <p>{children}</p>}</div>
    </div>
  );
}

function ContinueButton({ disabled, onClick, children = "Continue" }) {
  return (
    <div className="actions">
      <button type="button" className="primary" disabled={disabled} onClick={onClick}>
        {children}
      </button>
    </div>
  );
}

// Plain-language agent status shown in the header.
function statusFor(screen, delegation, loading) {
  if (loading) return { text: "Working", tone: "busy" };
  switch (screen) {
    case "working":
      return { text: "Comparing laptops", tone: "busy" };
    case "output":
      if (delegation === "approve") return { text: "Waiting for your approval", tone: "ready" };
      if (delegation === "autonomous") return { text: "Selection finalised", tone: "ready" };
      return { text: "Recommendation ready", tone: "ready" };
    case "end":
      return { text: "Laptop selected", tone: "done" };
    case "done":
      return { text: "Task complete", tone: "done" };
    default:
      return { text: "Waiting for your choice", tone: "idle" };
  }
}

// ─── The task ────────────────────────────────────────────────────────────────

const INITIAL_DATA = {
  delegation: "",
  action1: "", // first response to the agent's (flawed) output
  action2: "", // response to the revised output, if they asked it to reconsider
  final_laptop: "",
  final_source: "", // agent (went along with the agent) | own (chose from the list)
  responsibility: "", // 1-7, delegators only
  panels: {}, // screen -> [panel codes, in order first opened]
  outputs: [], // agent replies actually shown, with their source
  events: [],
  complete: false,
};

const GO_ALONG = ["accept", "approve", "keep"];

export default function Task() {
  const [screen, setScreen] = useState("delegate");
  const [choice, setChoice] = useState(""); // radio value on the current screen
  const [rating, setRating] = useState(null); // 1-7 rating on the current screen
  const [data, setData] = useState(INITIAL_DATA);
  const [outputs, setOutputs] = useState({}); // step -> {reply, source}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startRef = useRef(null);
  const topRef = useRef(null);
  const inflight = useRef({});

  // Set once the page is interactive; a choice clicked before hydration would
  // otherwise be silently cleared.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    startRef.current = performance.now();
    setReady(true);
  }, []);

  const log = useCallback((action, detail = "") => {
    const t = Math.round(performance.now() - (startRef.current ?? performance.now()));
    setData((d) => ({ ...d, events: [...d.events, { t, action, detail }] }));
  }, []);

  const go = useCallback(
    (next) => {
      setChoice("");
      setRating(null);
      setError(null);
      setScreen(next);
      log("screen", next);
      topRef.current?.scrollIntoView({ block: "start" });
    },
    [log],
  );

  const openPanel = useCallback(
    (scr, code) => {
      log("panel", `${scr}:${code}`);
      setData((d) => {
        const seen = d.panels[scr] ?? [];
        return seen.includes(code) ? d : { ...d, panels: { ...d.panels, [scr]: [...seen, code] } };
      });
    },
    [log],
  );

  // Fetch an agent reply. Requests are de-duplicated, so prefetching on one
  // screen and asking again on the next costs a single call.
  const fetchOutput = useCallback(
    async (step) => {
      if (outputs[step]) return outputs[step];
      if (!inflight.current[step]) {
        inflight.current[step] = (async () => {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          if (!json.reply) throw new Error("Empty reply");
          if (THINKING_DELAY_MS > 0) await new Promise((r) => setTimeout(r, THINKING_DELAY_MS));
          return json;
        })();
      }
      try {
        const json = await inflight.current[step];
        const out = { reply: json.reply, source: json.source };
        setOutputs((o) => ({ ...o, [step]: out }));
        setData((d) =>
          d.outputs.some((x) => x.step === step)
            ? d
            : { ...d, outputs: [...d.outputs, { step, source: json.source, model: json.model }] },
        );
        return out;
      } catch (err) {
        delete inflight.current[step];
        throw err;
      }
    },
    [outputs],
  );

  // Ask for a reply and show a retry message if it fails.
  const [lastStep, setLastStep] = useState("");
  const load = useCallback(
    async (step) => {
      setLastStep(step);
      setLoading(true);
      setError(null);
      try {
        return await fetchOutput(step);
      } catch (err) {
        console.error(err);
        setError("Something went wrong reaching the Decision Agent. Please try again.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchOutput],
  );

  // Relay everything to the Qualtrics page on every change. No-op when the
  // page is opened directly rather than inside the survey.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const final = data.final_laptop ? laptopById(data.final_laptop) : null;
    const delegated = data.delegation && data.delegation !== "self";
    window.parent.postMessage(
      {
        type: POST_TYPE,
        delegation: data.delegation,
        action1: data.action1,
        action2: data.action2,
        finalLaptop: final ? final.name : "",
        finalValid: final ? (meetsRequirements(final) ? 1 : 0) : "",
        finalSource: data.final_source,
        // Went along with the flawed Granite 14 without questioning it.
        acceptedFlaw: delegated && data.action1 ? (GO_ALONG.includes(data.action1) ? 1 : 0) : "",
        responsibility: data.responsibility,
        panels: data.panels,
        outputs: data.outputs,
        events: data.events,
        complete: data.complete,
      },
      "*",
    );
  }, [data]);

  const revised = data.action1 === "reconsider";
  const putForward = revised ? RECOMMENDED_REVISED : RECOMMENDED_FIRST;
  const outputStep = revised ? "reconsider" : "recommend";
  const level = LEVELS[data.delegation];

  // Selecting a laptop ends the task for self-choosers. Delegators first rate
  // responsibility on the end screen.
  const select = (laptop, source) => {
    log("select", `${laptop}:${source}`);
    const selfChooser = data.delegation === "self";
    setData((d) => ({ ...d, final_laptop: laptop, final_source: source, complete: selfChooser }));
    go(selfChooser ? "done" : "end");
  };

  const submitDelegation = () => {
    log("choice", `delegation:${choice}`);
    setData((d) => ({ ...d, delegation: choice }));
    if (choice === "self") return go("choose");
    go("working");
    fetchOutput("recommend").catch(() => {}); // prefetch while they read
  };

  const submitWorking = async () => {
    go("output");
    await load("recommend");
  };

  const submitOutput = async () => {
    const field = revised ? "action2" : "action1";
    log("choice", `${field}:${choice}`);
    setData((d) => ({ ...d, [field]: choice }));
    if (GO_ALONG.includes(choice)) return select(putForward, "agent");
    if (choice === "reconsider") {
      go("output");
      return load("reconsider");
    }
    go("choose");
  };

  const submitChoose = () => select(choice, "own");

  const submitEnd = () => {
    log("rating", `responsibility:${rating}`);
    setData((d) => ({ ...d, responsibility: rating, complete: true }));
    go("done");
  };

  const retry = () => lastStep && load(lastStep);

  const status = statusFor(screen, data.delegation, loading);
  const outputScreen = revised ? "output_revised" : "output_first";
  const out = outputs[outputStep];
  const errorBox = error && (
    <div className="error" role="alert">
      {error}{" "}
      <button type="button" className="link" onClick={retry}>
        Try again
      </button>
    </div>
  );

  return (
    <main className="task" ref={topRef} data-ready={ready ? "1" : undefined}>
      <header className="task-header">
        <div className="agent-id">
          <AgentMark size={34} />
          <div>
            <h1>{CHATBOT_NAME}</h1>
            <p className="agent-sub">AI agent for laptop purchase decisions</p>
          </div>
        </div>
        <div className={`agent-status tone-${status.tone}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {status.text}
        </div>
      </header>

      <div className="content">
        {screen === "delegate" && (
          <section>
            <p className="intro">{INTRO}</p>
            <h2>{TASK_TITLE}</h2>
            <TaskBrief goal={TASK_GOAL} lead={TASK_LEAD}>
              <RequirementsList />
            </TaskBrief>
            <h3>The seven laptops</h3>
            <LaptopTable />
            <h2>Who should compare the laptops and choose one?</h2>
            <ChoiceGroup
              name="delegation"
              legend="Select one option."
              choices={DELEGATION_CHOICES}
              value={choice}
              onChange={setChoice}
            />
            <ContinueButton disabled={!choice} onClick={submitDelegation} />
          </section>
        )}

        {screen === "working" && (
          <section>
            <h2>The Decision Agent is comparing the laptops</h2>
            <p>
              It is checking each laptop against your five requirements. You can open the panels
              below while it works, or select Continue when you are ready.
            </p>
            <WorkingLine label="In progress" />
            <Panels panels={PROGRESS_PANELS} screen="working" onOpen={openPanel} />
            <ContinueButton onClick={submitWorking} />
          </section>
        )}

        {screen === "output" && level && (
          <section key={outputScreen}>
            <h2>{level.heading(revised)}</h2>
            {out && <p>{level.lead(laptopById(putForward).name, revised)}</p>}
            <AgentOutput thinking={loading || !out}>{out?.reply}</AgentOutput>
            {errorBox}
            {out && (
              <>
                <p className="hint">Before you decide, you can open any of the panels below.</p>
                <Panels panels={OUTPUT_PANELS[putForward]} screen={outputScreen} onOpen={openPanel} />
                <ChoiceGroup
                  name={outputScreen}
                  legend="What would you like to do?"
                  choices={[
                    level.goAlong(laptopById(putForward).name),
                    ...(revised ? [] : [level.reconsider(laptopById(putForward).name)]),
                    level.override(laptopById(putForward).name),
                  ]}
                  value={choice}
                  onChange={setChoice}
                />
                <ContinueButton disabled={!choice} onClick={submitOutput} />
              </>
            )}
          </section>
        )}

        {screen === "choose" && (
          <section>
            <h2>Choose a laptop yourself</h2>
            <TaskBrief goal={TASK_GOAL} lead={TASK_LEAD}>
              <RequirementsList />
            </TaskBrief>
            <h3>The seven laptops</h3>
            <LaptopTable />
            <ChoiceGroup
              name="laptop"
              legend="Which laptop do you select?"
              choices={LAPTOPS.map((l) => ({ code: l.id, label: l.name }))}
              value={choice}
              onChange={setChoice}
            />
            <ContinueButton disabled={!choice} onClick={submitChoose} />
          </section>
        )}

        {screen === "end" && (
          <section>
            <h2>Your laptop selection has been recorded</h2>
            <Scale
              name="responsibility"
              question={RESPONSIBILITY.question}
              low={RESPONSIBILITY.low}
              mid={RESPONSIBILITY.mid}
              high={RESPONSIBILITY.high}
              value={rating}
              onChange={setRating}
            />
            <ContinueButton disabled={!rating} onClick={submitEnd}>
              Finish
            </ContinueButton>
          </section>
        )}

        {screen === "done" && (
          <section>
            <div className="done-note" role="status">
              <strong>The task is complete and your choices have been recorded.</strong> Please
              continue with the survey.
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
