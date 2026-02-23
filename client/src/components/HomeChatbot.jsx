import { useEffect, useMemo, useRef, useState } from "react";

const QUICK_PROMPTS = [
  "Help me set a goal",
  "How can I resell items?",
  "Show me budgeting tips",
  "What can I do here?",
];

const BASE_MESSAGES = [
  {
    id: "welcome",
    sender: "bot",
    text: "Hi! I am SmartGoal Assistant. Ask me about goals, budgeting, or the marketplace.",
  },
];

function buildBotResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes("goal")) {
    return {
      text: "Great! You can plan a goal with milestones and savings targets.",
      links: [
        { label: "Start a Goal", href: "/register" },
        { label: "Explore Goals", href: "/goals" },
      ],
    };
  }

  if (lower.includes("budget") || lower.includes("save")) {
    return {
      text: "Try splitting your goal into monthly targets and tracking expenses to stay on pace.",
      links: [{ label: "View Finances", href: "/finances" }],
    };
  }

  if (lower.includes("resell") || lower.includes("marketplace")) {
    return {
      text: "You can list unused items and fund your goals faster through the marketplace.",
      links: [{ label: "Browse Marketplace", href: "/marketplace" }],
    };
  }

  if (lower.includes("login") || lower.includes("sign in")) {
    return {
      text: "You can sign in to access your dashboard and track progress.",
      links: [{ label: "Sign In", href: "/login" }],
    };
  }

  if (lower.includes("register") || lower.includes("sign up")) {
    return {
      text: "Create a free account to start saving toward your goals.",
      links: [{ label: "Create Account", href: "/register" }],
    };
  }

  return {
    text: "I can help with goal planning, budgeting, and marketplace tips. What would you like to try?",
    links: [{ label: "Get Started", href: "/register" }],
  };
}

export default function HomeChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(BASE_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    chatBodyRef.current?.scrollTo({
      top: chatBodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, sender: "user", text: trimmed },
    ]);
    setInput("");
    setIsTyping(true);

    typingTimerRef.current = setTimeout(() => {
      const response = buildBotResponse(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-bot`, sender: "bot", ...response },
      ]);
      setIsTyping(false);
    }, 650);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className={`home-chatbot ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="chatbot-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Toggle SmartGoal Assistant"
      >
        <span className="chatbot-toggle-icon">💬</span>
        <span className="chatbot-toggle-text">
          {isOpen ? "Close Assistant" : "Chat with us"}
        </span>
      </button>

      {isOpen && (
        <div className="chatbot-panel" role="dialog" aria-label="SmartGoal Assistant">
          <div className="chatbot-header">
            <div>
              <h5>SmartGoal Assistant</h5>
              <p>Ask anything about goals, savings, or resale.</p>
            </div>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="chatbot-body" ref={chatBodyRef}>
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.sender}`}>
                <div className="chat-bubble">
                  <p>{message.text}</p>
                  {message.links?.length ? (
                    <div className="chat-links">
                      {message.links.map((link) => (
                        <a key={link.href} href={link.href} className="chat-link">
                          {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-message bot">
                <div className="chat-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question..."
              aria-label="Chat message"
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
              Send
            </button>
          </form>

          <div className="chatbot-prompts">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="chatbot-prompt"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
