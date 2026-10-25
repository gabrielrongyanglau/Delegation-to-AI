"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTONOMOUS_SKIPS_REVIEW,
  CHATBOT_NAME,
  DELEGATION_CHOICES,
  INTRO,
  LAPTOPS,
  PROGRESS_PANELS,
  RECOMMENDATION_CHOICES,
  RECOMMENDATION_PANELS,
  RECOMMENDED_FIRST,
  RECOMMENDED_REVISED,
  RECONSIDER_CHOICES,
  REQUIREMENTS,
  TASK_LEAD,
  TASK_TITLE,
  fmtWeight,
  laptopById,
  meetsRequirements,
} from "../lib/study";

// Pause after a reply arrives, before it is shown, so the Decision Agent does not
// answer instantly. Purely presentational; 0 removes it.
const THINKING_DELAY_MS = 1500;

const POST_TYPE = "ai-delegation-task";

// ─── Shared pieces ───────────────────────────────────────────────────────────

function RequirementsList() {
  return (
    <ul className="requirements">
      {REQUIREMENTS.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}

function LaptopTable({ highlight }) {
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
            <th scope="col">HDMI</th>
          </tr>
        </thead>
        <tbody>
          {LAPTOPS.map((l) => (
            <tr key={l.id} className={l.id === highlight ? "highlight" : undefined}>
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

function LaptopDetails({ id }) {
  const l = laptopById(id);
  return (
    <dl className="details">
      <dt>Price</dt>
      <dd>£{l.price}</dd>
      <dt>Operating system</dt>
      <dd>{l.os}</dd>
      <dt>Memory</dt>
      <dd>{l.memoryGb} GB</dd>
      <dt>Storage</dt>
      <dd>{l.storage}</dd>
      <dt>Battery</dt>
      <dd>{l.batteryH} hours</dd>
      <dt>Weight</dt>
      <dd>{fmtWeight(l.weightKg)}</dd>
      <dt>HDMI port</dt>
      <dd>{l.hdmi ? "Yes" : "No"}</dd>
    </dl>
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

// One-of-n choice shown as cards: the option, then what will happen.
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

function ChatbotMessage({ children, thinking }) {
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

// Plain-language agent status shown in the header, by screen.
const STATUS = {
  delegate: { text: "Waiting for your choice", tone: "idle" },
  working: { text: "Comparing laptops", tone: "busy" },
  recommendation: { text: "Recommendation ready", tone: "ready" },
  reconsidered: { text: "Revised recommendation ready", tone: "ready" },
  review_revised: { text: "Waiting for your review", tone: "idle" },
  choose: { text: "Waiting for your choice", tone: "idle" },
  done: { text: "Task complete", tone: "done" },
};

function ContinueButton({ disabled, onClick, children = "Continue" }) {
  return (
    <div className="actions">
      <button type="button" className="primary" disabled={disabled} onClick={onClick}>
        {children}
      </button>
    </div>
  );
}

// ─── The task ────────────────────────────────────────────────────────────────

export default function Task() {
  const [screen, setScreen] = useState("delegate");
  const [choice, setChoice] = useState(""); // radio value on the current screen
  const [data, setData] = useState({
    delegation: "",
    rec_action: "",
    reconsider_action: "",
    final_laptop: "",
    selected_by: "", // self | chatbot
    panels: {}, // screen -> [panel codes, in order first opened]
    outputs: [], // chatbot replies actually shown, with their source
    events: [],
    complete: false,
  });
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

  // Fetch a chatbot reply. Requests are de-duplicated, so prefetching on one
  // screen and asking again on the next costs a single call.
  const fetchOutput = useCallback(
    async (step) => {
      const key = step;
      if (outputs[key]) return outputs[key];
      if (!inflight.current[key]) {
        inflight.current[key] = (async () => {
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
        const json = await inflight.current[key];
        const out = { reply: json.reply, source: json.source };
        setOutputs((o) => ({ ...o, [key]: out }));
        setData((d) =>
          d.outputs.some((x) => x.step === key)
            ? d
            : { ...d, outputs: [...d.outputs, { step: key, source: json.source, model: json.model }] },
        );
        return out;
      } catch (err) {
        delete inflight.current[key];
        throw err;
      }
    },
    [outputs],
  );

  // Ask for a reply and show a retry message if it fails.
  const load = useCallback(
    async (step) => {
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
    window.parent.postMessage(
      {
        type: POST_TYPE,
        delegation: data.delegation,
        recAction: data.rec_action,
        reconsiderAction: data.reconsider_action,
        finalLaptop: final ? final.name : "",
        finalValid: final ? (meetsRequirements(final) ? 1 : 0) : "",
        selectedBy: data.selected_by,
        panels: data.panels,
        outputs: data.outputs,
        events: data.events,
        complete: data.complete,
      },
      "*",
    );
  }, [data]);

  // Selecting a laptop, by the participant or the Decision Agent, ends the task.
  const select = (laptop, by) => {
    log("select", `${laptop}:${by}`);
    setData((d) => ({ ...d, final_laptop: laptop, selected_by: by, complete: true }));
    go("done");
  };

  // ── Screen handlers ──

  const submitDelegation = () => {
    log("choice", `delegation:${choice}`);
    setData((d) => ({ ...d, delegation: choice }));
    if (choice === "self") return go("choose");
    go("working");
    fetchOutput("recommend").catch(() => {}); // prefetch while they read
  };

  const submitWorking = async () => {
    go("recommendation");
    await load("recommend");
  };

  const submitRecommendation = async () => {
    log("choice", `rec:${choice}`);
    setData((d) => ({ ...d, rec_action: choice }));
    if (choice === "accept") return select(RECOMMENDED_FIRST, "chatbot");
    if (choice === "take_control") return go("choose");
    go("reconsidered");
    await load("reconsider");
  };

  const submitAutonomous = () => select(RECOMMENDED_FIRST, "chatbot");

  const submitReconsidered = () => {
    log("choice", `reconsider:${choice}`);
    setData((d) => ({ ...d, reconsider_action: choice }));
    if (choice === "allow") return select(RECOMMENDED_REVISED, "chatbot");
    if (choice === "take_over") return go("choose");
    go("review_revised");
  };

  const submitChoose = () => select(choice, "self");

  const retry = () => {
    if (screen === "recommendation") load("recommend");
    else if (screen === "reconsidered") load("reconsider");
  };

  const recOut = outputs.recommend;
  const revOut = outputs.reconsider;
  const autonomousSkip = AUTONOMOUS_SKIPS_REVIEW && data.delegation === "autonomous";
  const errorBox = error && (
    <div className="error" role="alert">
      {error}{" "}
      <button type="button" className="link" onClick={retry}>
        Try again
      </button>
    </div>
  );

  const status = loading ? { text: "Working", tone: "busy" } : (STATUS[screen] ?? STATUS.delegate);

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
            <p>{TASK_LEAD}</p>
            <h3>Requirements</h3>
            <RequirementsList />
            <h3>Available laptops</h3>
            <LaptopTable />
            <h2>Choose Who Will Compare the Laptops</h2>
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
            <h2>The Decision Agent Is Comparing the Laptops</h2>
            <p>
              The Decision Agent is comparing the laptops against your cost, software, performance,
              portability, and monitor requirements. You may open any information panel, or
              continue without opening one.
            </p>
            <WorkingLine label="In progress" />
            <Panels panels={PROGRESS_PANELS} screen="working" onOpen={openPanel} />
            <p className="hint">Select “Continue” when you are ready.</p>
            <ContinueButton onClick={submitWorking} />
          </section>
        )}

        {screen === "recommendation" && (
          <section>
            <h2>The Decision Agent’s Recommendation</h2>
            <ChatbotMessage thinking={loading || !recOut}>{recOut?.reply}</ChatbotMessage>
            {errorBox}
            {recOut && autonomousSkip && (
              <>
                <p>The Decision Agent has finalised the laptop selection: Granite 14.</p>
                <Panels panels={RECOMMENDATION_PANELS} screen="recommendation" onOpen={openPanel} />
                <ContinueButton onClick={submitAutonomous} />
              </>
            )}
            {recOut && !autonomousSkip && (
              <>
                <p>You may open any information panel before deciding what to do.</p>
                <Panels panels={RECOMMENDATION_PANELS} screen="recommendation" onOpen={openPanel} />
                <ChoiceGroup
                  name="rec"
                  legend="Choose what to do with the Decision Agent’s recommendation."
                  choices={RECOMMENDATION_CHOICES}
                  value={choice}
                  onChange={setChoice}
                />
                <ContinueButton disabled={!choice} onClick={submitRecommendation} />
              </>
            )}
          </section>
        )}

        {screen === "reconsidered" && (
          <section>
            <h2>The Decision Agent’s Revised Recommendation</h2>
            <p>The Decision Agent has reviewed the requirements again.</p>
            <ChatbotMessage thinking={loading || !revOut}>{revOut?.reply}</ChatbotMessage>
            {errorBox}
            {revOut && (
              <>
                <ChoiceGroup
                  name="reconsider"
                  legend="Choose what to do next."
                  choices={RECONSIDER_CHOICES}
                  value={choice}
                  onChange={setChoice}
                />
                <ContinueButton disabled={!choice} onClick={submitReconsidered} />
              </>
            )}
          </section>
        )}

        {screen === "review_revised" && (
          <section>
            <h2>Review the Revised Recommendation: Atlas 14</h2>
            <LaptopDetails id={RECOMMENDED_REVISED} />
            <Panels
              panels={[{ code: "requirements", label: "View your requirements", content: "requirements" }]}
              screen="review_revised"
              onOpen={openPanel}
            />
            <ContinueButton onClick={() => select(RECOMMENDED_REVISED, "chatbot")}>
              Confirm Atlas 14
            </ContinueButton>
          </section>
        )}

        {screen === "choose" && (
          <section>
            <h2>Choose the Laptop Yourself</h2>
            <h3>Requirements</h3>
            <RequirementsList />
            <h3>Available laptops</h3>
            <LaptopTable />
            <ChoiceGroup
              name="laptop"
              legend="Select one laptop."
              choices={LAPTOPS.map((l) => ({ code: l.id, label: `Select ${l.name}.` }))}
              value={choice}
              onChange={setChoice}
            />
            <ContinueButton disabled={!choice} onClick={submitChoose} />
          </section>
        )}

        {screen === "done" && (
          <section>
            <div className="done-note" role="status">
              <strong>Your laptop selection has been recorded and the task is complete.</strong>{" "}
              Please continue with the survey.
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
