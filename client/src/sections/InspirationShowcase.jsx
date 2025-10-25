import { useEffect, useMemo, useRef, useState } from "react";

// Small typewriter that loops over phrases
function Typewriter({ phrases, typingSpeed = 80, pause = 1200 }) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const blinkInterval = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    const current = phrases[index % phrases.length];

    if (!deleting && subIndex === current.length) {
      const id = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(id);
    }
    if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((i) => i + (deleting ? -1 : 1));
    }, deleting ? typingSpeed / 2 : typingSpeed);

    return () => clearTimeout(timeout);
  }, [subIndex, deleting, index, phrases, typingSpeed, pause]);

  const text = phrases[index % phrases.length].substring(0, subIndex);

  return (
    <span>
      {text}
      <span style={{ opacity: blink ? 1 : 0 }}>|</span>
    </span>
  );
}

function ConfettiBurst({ onDone }) {
  const [active, setActive] = useState(false);
  const pieces = useMemo(() => {
    const emojis = ["🎉", "💸", "✨", "🎯", "🏆", "💫"]; 
    return new Array(14).fill(0).map((_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      dx: (Math.random() * 160 - 80) | 0,
      dy: (Math.random() * 120 - 20) | 0,
      rot: (Math.random() * 360) | 0,
      delay: Math.random() * 70,
    }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 20);
    const end = setTimeout(() => onDone && onDone(), 900);
    return () => { clearTimeout(t); clearTimeout(end); };
  }, [onDone]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: active
              ? `translate(${p.dx}px, ${p.dy}px) rotate(${p.rot}deg) scale(1)`
              : "translate(0, 0) scale(0.6)",
            transition: `transform 700ms cubic-bezier(0.2,0.8,0.2,1) ${p.delay}ms, opacity 800ms ease ${p.delay}ms`,
            opacity: active ? 0 : 1,
            fontSize: 18,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

export default function InspirationShowcase() {
  const ALL_IDEAS = [
    { emoji: "🎓", title: "Upskill Course", tip: "Invest in yourself with a new certification." },
    { emoji: "🏡", title: "Home Makeover", tip: "Refresh a room with simple upgrades." },
    { emoji: "✈️", title: "Dream Trip", tip: "Plan that bucket-list destination." },
    { emoji: "📷", title: "Creator Kit", tip: "Start content creation with a camera upgrade." },
    { emoji: "🚴", title: "E-Bike", tip: "Slash commute costs the fun way." },
    { emoji: "💍", title: "Big Day", tip: "Save for a memorable celebration." },
    { emoji: "🛟", title: "Emergency Fund", tip: "Build 3–6 months of peace of mind." },
    { emoji: "💻", title: "New Laptop", tip: "Boost productivity with faster tools." },
    { emoji: "🤝", title: "Give Back", tip: "Fund a cause that matters to you." },
  ];

  const [ideas, setIdeas] = useState(ALL_IDEAS);
  const [burstAt, setBurstAt] = useState(null);

  const shuffleIdeas = () => {
    setIdeas((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  };

  const handleCardClick = (idx) => {
    setBurstAt(idx);
    setTimeout(() => setBurstAt(null), 950);
  };

  return (
    <div className="inspiration">
      <div className="inspiration-header" style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Get inspired</div>
        <h2 style={{ margin: "6px 0 10px", fontSize: 28 }}>
          Save for <span className="highlight"><Typewriter phrases={[
            "your dream trip",
            "a powerful laptop",
            "a cozy home",
            "learning something new",
            "a healthier you",
          ]} /></span>
        </h2>
        <p style={{ opacity: 0.85, margin: 0 }}>Tap a card to celebrate a goal idea. Shuffle for more variety.</p>
        <button onClick={shuffleIdeas} className="btn btn-outline" style={{ marginTop: 12 }}>Shuffle Ideas</button>
      </div>

      <div className="inspiration-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}>
        {ideas.map((idea, idx) => (
          <div
            key={idea.title}
            className="inspiration-card"
            onClick={() => handleCardClick(idx)}
            style={{
              position: "relative",
              background: "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.75))",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 14,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              backdropFilter: "blur(2px)",
              cursor: "pointer",
              transition: "transform 200ms ease, box-shadow 200ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 34px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.06)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28 }}>{idea.emoji}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{idea.title}</div>
                <div style={{ opacity: 0.8, fontSize: 13 }}>{idea.tip}</div>
              </div>
            </div>
            {burstAt === idx && <ConfettiBurst onDone={() => {}} />}
          </div>
        ))}
      </div>
    </div>
  );
}