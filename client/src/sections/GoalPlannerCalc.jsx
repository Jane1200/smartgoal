import { useMemo, useState } from "react";

export default function GoalPlannerCalc() {
  const [target, setTarget] = useState(50000);        // ₹
  const [months, setMonths] = useState(10);
  const [savedNow, setSavedNow] = useState(10000);
  const [resalePerMonth, setResalePerMonth] = useState(2000);
  const [itemsAvgPrice, setItemsAvgPrice] = useState(2500); // avg price per listed item

  const result = useMemo(() => {
    const remaining = Math.max(0, target - savedNow - resalePerMonth * months);
    const perMonth = months > 0 ? Math.ceil(remaining / months) : remaining;
    const itemsPerMonth = itemsAvgPrice > 0 ? Math.ceil(perMonth / itemsAvgPrice) : 0;
    const reachDate = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + Number(months || 0));
      return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    })();
    return { remaining, perMonth, itemsPerMonth, reachDate };
  }, [target, months, savedNow, resalePerMonth, itemsAvgPrice]);

  return (
    <div className="goal-planner-card">
      <div className="card-header">
        <h3 className="card-title">Goal Planner</h3>
        <p className="card-subtitle">Calculate your path to success</p>
      </div>
      
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Goal amount (₹)</label>
          <input 
            className="form-control"
            type="number"
            value={target}
            onChange={e => setTarget(Number(e.target.value))}
            min={0}
            placeholder="50000"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Time to achieve (months)</label>
          <input 
            className="form-control"
            type="number"
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            min={1}
            placeholder="10"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Saved now (₹)</label>
          <input 
            className="form-control"
            type="number"
            value={savedNow}
            onChange={e => setSavedNow(Number(e.target.value))}
            min={0}
            placeholder="10000"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Expected resale / month (₹)</label>
          <input 
            className="form-control"
            type="number"
            value={resalePerMonth}
            onChange={e => setResalePerMonth(Number(e.target.value))}
            min={0}
            placeholder="2000"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Avg price per item (₹)</label>
          <input 
            className="form-control"
            type="number"
            value={itemsAvgPrice}
            onChange={e => setItemsAvgPrice(Number(e.target.value))}
            min={1}
            placeholder="2500"
          />
        </div>
      </div>

      <div className="results-card">
        <h4 className="results-title">Your Plan</h4>
        <div className="results-grid">
          <div className="result-item">
            <span className="result-label">Remaining</span>
            <span className="result-value">₹{result.remaining.toLocaleString()}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Save per month</span>
            <span className="result-value">₹{result.perMonth.toLocaleString()}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Or resell per month</span>
            <span className="result-value">{result.itemsPerMonth} item(s)</span>
          </div>
        </div>
        <div className="completion-date">
          <span className="date-label">Projected completion:</span>
          <span className="date-value">{result.reachDate}</span>
        </div>
        <a href="/wishlist" className="btn btn-primary w-100">Add to Wishlist</a>
      </div>
    </div>
  );
}
