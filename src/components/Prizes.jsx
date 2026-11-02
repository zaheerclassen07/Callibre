import { useState } from "react";
import { Modal, Stat } from "./ui.jsx";
import { uid } from "../lib/helpers.js";

export default function Prizes({ db, user, agent, isAdmin, readOnly = false }) {
  const [editing, setEditing] = useState(null); // prize being edited, or "new"

  const avail = agent ? db.agentAvailPts(agent.id) : 0;

  const request = async (prize) => {
    if (readOnly) return alert("You're viewing this dashboard in read-only mode, so redeeming isn't available here.");
    if (!agent) return alert("Your login isn't linked to an agent profile.");
    if (avail < prize.cost) return alert("Not enough points yet. Keep going!");
    const already = db.requests.some(
      (r) => r.agent_id === agent.id && r.prize_id === prize.id && r.status === "pending"
    );
    if (already) return alert("You already have a pending request for this prize.");
    if (confirm(`Request "${prize.name}" for ${prize.cost} points?`)) {
      await db.requestRedeem(agent, prize);
      alert("Request sent! A team leader will review it.");
    }
  };

  const stockLeft = (p) =>
    p.stock_limit == null ? null : Math.max(0, p.stock_limit - db.prizeStockUsed(p));

  const myHistory = agent
    ? db.redemptions.filter((r) => r.agent_id === agent.id)
    : [];
  const myRequests = agent ? db.requests.filter((r) => r.agent_id === agent.id) : [];

  return (
    <>
      {agent && (
        <div className="card">
          <div className="grid grid-3">
            <Stat num={avail} label="Available points" />
            <Stat num={myRequests.filter((r) => r.status === "pending").length} label="Pending requests" />
            <Stat num={myHistory.length} label="Prizes redeemed" />
          </div>
        </div>
      )}

      <div className="card">
        <div className="spread">
          <div className="card-title" style={{ marginBottom: 0 }}>🎁 Prize catalogue</div>
          {isAdmin && (
            <button className="btn btn-sm" onClick={() => setEditing("new")}>+ Add prize</button>
          )}
        </div>
        <div className="grid grid-3 mt">
          {db.prizes
            .filter((p) => p.active || isAdmin)
            .map((p) => {
              const left = stockLeft(p);
              const out = left !== null && left <= 0;
              return (
                <div key={p.id} className="prize-tile" style={{ opacity: p.active ? 1 : 0.5 }}>
                  <div className="spread">
                    <span className="prize-icon">{p.icon}</span>
                    {left !== null && (
                      <span className={`tag ${out ? "bad" : left <= 2 ? "warn" : "ok"}`}>
                        {out ? "Out of stock" : `${left} left`}
                      </span>
                    )}
                  </div>
                  <div className="prize-name">{p.name}</div>
                  <div className="prize-cost">{p.cost} pts{Number(p.cost_rand) > 0 ? ` · R${p.cost_rand}` : ""}</div>
                  <div className="flex mt">
                    {!isAdmin && (
                      <button className="btn btn-sm" disabled={readOnly || out || !agent || avail < p.cost} onClick={() => request(p)}>
                        Request
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Edit</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => confirm(`Delete "${p.name}"?`) && db.removePrize(p.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {agent && (
        <div className="card">
          <div className="card-title">My requests & redemptions</div>
          <table className="tbl">
            <thead>
              <tr><th>Prize</th><th>Cost</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {myRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.prize_name}</td>
                  <td>{r.cost} pts</td>
                  <td className="muted">{r.date}</td>
                  <td>
                    <span className={`tag ${r.status === "approved" ? "ok" : r.status === "denied" ? "bad" : "warn"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!myRequests.length && (
                <tr><td colSpan={4} className="muted">Nothing yet. Earn points and treat yourself!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PrizeForm
          prize={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing === "new") await db.addPrize(data);
            else await db.updatePrize(editing.id, data);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function PrizeForm({ prize, onClose, onSave }) {
  const [form, setForm] = useState({
    name: prize?.name || "",
    icon: prize?.icon || "🎁",
    cost: prize?.cost ?? 100,
    cost_rand: prize?.cost_rand ?? 0,
    stock_limit: prize?.stock_limit ?? "",
    active: prize?.active ?? true
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal title={prize ? "Edit prize" : "Add prize"} onClose={onClose}>
      <label className="lbl">Name</label>
      <input className="input" value={form.name} onChange={set("name")} />
      <div className="form-row">
        <div>
          <label className="lbl">Icon (emoji)</label>
          <input className="input" value={form.icon} onChange={set("icon")} />
        </div>
        <div>
          <label className="lbl">Cost (points)</label>
          <input className="input" type="number" value={form.cost} onChange={set("cost")} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label className="lbl">Value (ZAR)</label>
          <input className="input" type="number" value={form.cost_rand} onChange={set("cost_rand")} />
        </div>
        <div>
          <label className="lbl">Stock limit (blank = unlimited)</label>
          <input className="input" type="number" value={form.stock_limit} onChange={set("stock_limit")} />
        </div>
      </div>
      <label className="lbl">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />{" "}
        Active (visible to agents)
      </label>
      <div className="flex mt">
        <button
          className="btn"
          disabled={!form.name.trim()}
          onClick={() =>
            onSave({
              name: form.name.trim(),
              icon: form.icon || "🎁",
              cost: Number(form.cost) || 0,
              cost_rand: Number(form.cost_rand) || 0,
              stock_limit: form.stock_limit === "" ? null : Number(form.stock_limit),
              active: form.active
            })
          }
        >
          Save
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
