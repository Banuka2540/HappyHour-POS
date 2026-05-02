import { useState } from "react";
import { G } from "../utils/constants";
import { fmt, todayKey } from "../utils/helpers";

export function AdminDashboard({ incomeEntries, expenseEntries, pendingOrderAmount, onAddExpense, onBack }) {
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const today = todayKey();
  const todaysIncome = incomeEntries.filter(entry => entry.date === today);
  const todaysExpenses = expenseEntries.filter(entry => entry.date === today);
  const incomeTotal = todaysIncome.reduce((sum, entry) => sum + entry.amount, 0);
  const liveSalesTotal = incomeTotal + pendingOrderAmount;
  const expenseTotal = todaysExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  const grossProfit = liveSalesTotal;
  const netProfit = grossProfit - expenseTotal;

  const submitExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (!expenseLabel.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onAddExpense({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: expenseLabel.trim(),
      amount,
      date: today,
      createdAt: new Date().toISOString(),
    });
    setExpenseLabel("");
    setExpenseAmount("");
  };

  return (
    <div style={{ padding:24, height:"calc(100vh - 58px)", overflowY:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:G.gold }}>Admin Dashboard</div>
          <div style={{ color:G.muted, fontSize:13 }}>Track today's income, expenses, and net profit in one place.</div>
        </div>
        <button onClick={onBack} style={{
          padding:"10px 14px", borderRadius:10, border:`1px solid ${G.border}`,
          background:G.dark3, color:G.text, cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
        }}>
          Back to POS
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:14, marginBottom:18 }}>
        {[
          { label:"POS Sales (Live)", value: liveSalesTotal, accent: G.success },
          { label:"Today's Expenses", value: expenseTotal, accent: G.danger },
          { label:"Gross Profit", value: grossProfit, accent: G.gold },
        ].map(card => (
          <div key={card.label} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ color:G.muted, fontSize:12, marginBottom:8 }}>{card.label}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:card.accent }}>{fmt(card.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1.15fr) minmax(320px, 0.85fr)", gap:16 }}>
        <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:G.text }}>POS orders revenue</div>
              <div style={{ color:G.muted, fontSize:12 }}>
                {todaysIncome.length} payment{todaysIncome.length === 1 ? "" : "s"} recorded today
                {pendingOrderAmount > 0 ? " + in-progress order" : ""}
              </div>
            </div>
            <div style={{ color:G.gold, fontWeight:700 }}>{fmt(liveSalesTotal)}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {todaysIncome.length === 0 ? (
              <div style={{ color:G.muted, fontSize:13, padding:"16px 0" }}>No income recorded for today yet.</div>
            ) : todaysIncome.map(entry => (
              <div key={entry.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:"12px 14px" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{entry.method}</div>
                  <div style={{ fontSize:11, color:G.muted }}>{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })}</div>
                </div>
                <div style={{ color:G.success, fontWeight:700 }}>{fmt(entry.amount)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Add expense</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input value={expenseLabel} onChange={e => setExpenseLabel(e.target.value)} placeholder="Expense label"
                style={{ width:"100%", padding:"11px 12px", background:G.card, border:`1px solid ${G.border}`, color:G.text, borderRadius:10, outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
              <input value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Amount"
                style={{ width:"100%", padding:"11px 12px", background:G.card, border:`1px solid ${G.border}`, color:G.text, borderRadius:10, outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
              <button onClick={submitExpense} style={{
                width:"100%", padding:"12px 14px", border:"none", borderRadius:10,
                background:"linear-gradient(135deg,#E05050,#B83A3A)", color:"#fff",
                fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
              }}>
                Record expense
              </button>
            </div>
          </div>

          <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Profit after expenses</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:10 }}>
              <span>Gross profit from POS</span>
              <span>{fmt(grossProfit)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:G.muted, marginBottom:10 }}>
              <span>Total expenses</span>
              <span>-{fmt(expenseTotal)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:700, color:G.text, paddingTop:10, borderTop:`1px solid ${G.border}` }}>
              <span>Net profit</span>
              <span style={{ color:G.gold }}>{fmt(netProfit)}</span>
            </div>
            <div style={{ fontSize:12, color:G.muted, marginTop:10 }}>Adding expenses updates the profit automatically.</div>
          </div>

          <div style={{ background:G.dark2, border:`1px solid ${G.border}`, borderRadius:16, padding:18 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Today's expenses</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {todaysExpenses.length === 0 ? (
                <div style={{ color:G.muted, fontSize:13 }}>No expenses recorded for today yet.</div>
              ) : todaysExpenses.map(entry => (
                <div key={entry.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:"12px 14px" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{entry.label}</div>
                    <div style={{ fontSize:11, color:G.muted }}>{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })}</div>
                  </div>
                  <div style={{ color:G.danger, fontWeight:700 }}>-{fmt(entry.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
