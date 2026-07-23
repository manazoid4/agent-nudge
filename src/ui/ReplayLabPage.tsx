import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  Github,
  PauseCircle,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import "./replay-lab.css";

type Decision = "CLEAR" | "REVIEW" | "HOLD";

type ReplayEvent = {
  id: string;
  title: string;
  rule: string;
  score: number;
  expected: Decision;
  evidence: string;
};

const events: ReplayEvent[] = [
  {
    id: "exact-path",
    title: "Two active agents target the same file",
    rule: "exact-path-active-claim",
    score: 140,
    expected: "HOLD",
    evidence: "active claim · exact path · same worktree",
  },
  {
    id: "interface-change",
    title: "A dependency changed an interface",
    rule: "changed-interface",
    score: 72,
    expected: "REVIEW",
    evidence: "decision receipt · dependent task",
  },
  {
    id: "failed-loop",
    title: "A failed approach is being repeated",
    rule: "doom-loop",
    score: 88,
    expected: "REVIEW",
    evidence: "same input · same failure · unchanged hypothesis",
  },
  {
    id: "shared-lockfile",
    title: "Separate worktrees both change the lockfile",
    rule: "shared-lockfile",
    score: 105,
    expected: "HOLD",
    evidence: "worktree state · shared generated dependency graph",
  },
  {
    id: "unrelated-docs",
    title: "Documentation work is unrelated",
    rule: "path-relevance",
    score: 12,
    expected: "CLEAR",
    evidence: "different path · different topic",
  },
];

function decisionFor(
  score: number,
  reviewAt: number,
  holdAt: number,
): Decision {
  if (score >= holdAt) return "HOLD";
  if (score >= reviewAt) return "REVIEW";
  return "CLEAR";
}

export function ReplayLabPage() {
  const [reviewAt, setReviewAt] = useState(45);
  const [holdAt, setHoldAt] = useState(100);
  const results = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        decision: decisionFor(event.score, reviewAt, holdAt),
      })),
    [reviewAt, holdAt],
  );
  const matched = results.filter(
    (event) => event.decision === event.expected,
  ).length;
  const warnings = results.filter((event) => event.decision !== "CLEAR").length;

  return (
    <main className="replay-page">
      <header className="replay-nav replay-shell">
        <a className="replay-brand" href="/assurance">
          <span>AN</span>
          <div>
            <strong>Agent Nudge</strong>
            <small>Replay Lab</small>
          </div>
        </a>
        <nav aria-label="Replay Lab navigation">
          <a href="#policy">Policy</a>
          <a href="#events">Events</a>
          <a href="#boundary">Boundary</a>
        </nav>
        <a
          className="replay-source"
          href="https://github.com/manazoid4/agent-nudge/blob/main/docs/fixtures/replay-conflicts.json"
        >
          <Github size={17} /> Fixture
        </a>
      </header>

      <section className="replay-hero replay-shell">
        <div>
          <p className="replay-kicker">
            <FlaskConical size={16} /> Deterministic policy evaluation
          </p>
          <h1>Tune warnings before they interrupt a real agent.</h1>
          <p>
            Replay public-safe coordination scenarios against candidate REVIEW
            and HOLD thresholds. The same fixture always produces the same
            ordered decisions and digest.
          </p>
        </div>
        <div className="replay-summary">
          <div>
            <strong>
              {matched}/{results.length}
            </strong>
            <span>labelled outcomes matched</span>
          </div>
          <div>
            <strong>{warnings}</strong>
            <span>candidate warnings</span>
          </div>
          <div>
            <strong>
              {results.filter((item) => item.decision === "HOLD").length}
            </strong>
            <span>candidate holds</span>
          </div>
        </div>
      </section>

      <section className="replay-controls" id="policy">
        <div className="replay-shell replay-control-grid">
          <div>
            <p className="replay-section-label">CANDIDATE POLICY</p>
            <h2>Move the thresholds. Watch every decision update.</h2>
            <p>
              REVIEW must remain below HOLD. This browser demonstration does not
              execute agents or write to a repository.
            </p>
          </div>
          <div className="slider-card">
            <label>
              <span>
                REVIEW threshold <strong>{reviewAt}</strong>
              </span>
              <input
                aria-label="Review threshold"
                type="range"
                min="1"
                max={Math.max(1, holdAt - 1)}
                value={reviewAt}
                onChange={(event) => setReviewAt(Number(event.target.value))}
              />
            </label>
            <label>
              <span>
                HOLD threshold <strong>{holdAt}</strong>
              </span>
              <input
                aria-label="Hold threshold"
                type="range"
                min={reviewAt + 1}
                max="180"
                value={holdAt}
                onChange={(event) => setHoldAt(Number(event.target.value))}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setReviewAt(45);
                setHoldAt(100);
              }}
            >
              Reset baseline
            </button>
          </div>
        </div>
      </section>

      <section className="replay-events replay-shell" id="events">
        <div className="replay-heading">
          <p className="replay-section-label">ORDERED FIXTURE</p>
          <h2>Every result remains explainable.</h2>
        </div>
        <div className="replay-table" role="table" aria-label="Replay results">
          <div className="replay-row header" role="row">
            <span role="columnheader">Scenario</span>
            <span role="columnheader">Score</span>
            <span role="columnheader">Expected</span>
            <span role="columnheader">Candidate</span>
          </div>
          {results.map((event) => {
            const matchedExpectation = event.decision === event.expected;
            const Icon =
              event.decision === "HOLD"
                ? ShieldAlert
                : event.decision === "REVIEW"
                  ? PauseCircle
                  : CheckCircle2;
            return (
              <article
                className={`replay-row ${matchedExpectation ? "matched" : "mismatched"}`}
                role="row"
                key={event.id}
              >
                <div role="cell">
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{event.title}</strong>
                    <small>
                      {event.rule} · {event.evidence}
                    </small>
                  </span>
                </div>
                <b role="cell">{event.score}</b>
                <span
                  className={`decision ${event.expected.toLowerCase()}`}
                  role="cell"
                >
                  {event.expected}
                </span>
                <span
                  className={`decision ${event.decision.toLowerCase()}`}
                  role="cell"
                >
                  {event.decision}
                  {!matchedExpectation && <em>changed</em>}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="replay-boundary" id="boundary">
        <div className="replay-shell replay-boundary-grid">
          <SlidersHorizontal size={36} />
          <div>
            <p className="replay-section-label">EVALUATION BOUNDARY</p>
            <h2>Scores and evidence references—not private work.</h2>
            <p>
              Replay fixtures contain rule IDs, scores, labels, expected
              decisions and evidence references. They do not need prompts,
              responses, source bodies, command logs or private repository
              names.
            </p>
          </div>
          <pre>
            <code>{`agent-nudge-assure replay \\
  docs/fixtures/replay-conflicts.json \\
  ${reviewAt} ${holdAt}`}</code>
          </pre>
        </div>
      </section>

      <footer className="replay-footer replay-shell">
        <a href="/assurance">
          <ArrowLeft size={15} /> Assurance core
        </a>
        <span>Recorded public-safe scenarios. No remote execution.</span>
        <a href="https://github.com/manazoid4/agent-nudge/issues/9">
          Shadow Mode roadmap
        </a>
      </footer>
    </main>
  );
}
