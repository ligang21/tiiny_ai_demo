import { useState, useRef, useEffect } from "react";
import './assets/css/App.css'
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

const STORAGE_KEY = 'smallthinker-conversations';

function newConversation() {
  return {
    id: crypto.randomUUID(),
    title: "New Chat",
    messages: [],
  };
}

function loadConversationsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Add a new conversation at the beginning on startup
        const newConv = newConversation();
        return [newConv, ...parsed];
      }
    }
  } catch (error) {
    console.error('Failed to load conversations from localStorage:', error);
  }
  return [newConversation()];
}

export default function App() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState(() => loadConversationsFromStorage());
  const [currentId, setCurrentId] = useState(() => conversations[0]?.id);

  const assistantBufferRef = useRef("");
  const updateTimerRef = useRef(null);
  const currentConv = conversations.find((c) => c.id === currentId);

  // Auto-save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      // Only save conversations that have messages (exclude empty ones)
      const conversationsToSave = conversations.filter(c => c.messages.length > 0);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationsToSave));
    } catch (error) {
      console.error('Failed to save conversations to localStorage:', error);
    }
  }, [conversations]);

  function buildPrompt(messages) {
    return (
      "You are a helpful assistant.\n\n" +
      messages
        .map((m) =>
          m.role === "user"
            ? `User: ${m.content}`
            : `Assistant: ${m.content}`
        )
        .join("\n") +
      "\nAssistant:"
    );
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input
    };
    const emptyAssistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: ""
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentId
          ? {
              ...c,
              title:
                c.messages.length === 0
                  ? input.slice(0, 20)
                  : c.title,
              messages: [...c.messages, userMessage, emptyAssistantMessage],
            }
          : c
      )
    );

    setInput("");
    setLoading(true);
    assistantBufferRef.current = "";

    // construct prompt
    const prompt = buildPrompt(
      [...currentConv.messages, userMessage]
    );

    try {
      const res = await fetch("http://192.168.100.2:11434/api/generate", { //192.168.100.2 is the ip addr of AI box
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "smallthinker",
          prompt,
          stream: true,
        }),
      });

      // support streaming output
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          // if (!line.startsWith("data:")) continue;
          // every line looks like "data: {}", need to remove "data: " otherwise JSON.parse will fail
          // const payload = line.replace(/^data:\s*/, "");

          try {
            const json = JSON.parse(line);
            if (json.response) {
              assistantBufferRef.current += json.response; // use useRef to avoid disordered tokens

              // Throttle with requestAnimationFrame: update at ~60fps for smooth streaming
              if (updateTimerRef.current) {
                cancelAnimationFrame(updateTimerRef.current);
              }

              updateTimerRef.current = requestAnimationFrame(() => {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === currentId
                      ? {
                          ...c,
                          messages: c.messages.map((m, i) =>
                            i === c.messages.length - 1
                              ? { ...m, content: assistantBufferRef.current }
                              : m
                          ),
                        }
                      : c
                  )
                );
              });
            }
          } catch(error) {
            console.log("error: ", error);
          }
        }
      }

      // Final update: ensure last chunk is displayed
      if (updateTimerRef.current) {
        cancelAnimationFrame(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentId
            ? {
                ...c,
                messages: c.messages.map((m, i) =>
                  i === c.messages.length - 1
                    ? { ...m, content: assistantBufferRef.current }
                    : m
                ),
              }
            : c
        )
      );
    } catch (err) {
      // setMessages((m) => [
      //   ...m,
      //   {
      //     role: "assistant",
      //     content: "❌ Error: " + err.message,
      //   },
      // ]);
    } finally {
      setLoading(false);
    }
  }

  function createNewChat() {
    const conv = newConversation();
    setConversations((prev) => [conv, ...prev]);
    setCurrentId(conv.id);
  }

  return (
    <div className="app-container">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        createNewChat={() => createNewChat()}
        setCurrentId={(id) => setCurrentId(id)}
        conversations={conversations}
        currentId={currentId}
      />

      <div className="main-content">
        <Header />

        <div className="chat-area">
          {currentConv.messages.length === 0 ? (
            <div className="welcome-screen">
              <h1 className="welcome-title">Anything I can help?</h1>
            </div>
          ) : (
            <div className="chat">
              {currentConv.messages.map((m) => (
                <div
                  key={m.id}
                  className={`${m.role === "user" ? "message-user" : "message-assistant"}`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="message-loading">
                  Generating…
                </div>
              )}
            </div>
          )}

          <div className="input-container">
            <div className="input-wrapper">
              <input
                className="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask anything"
              />
              <button
                className="send-button"
                onClick={sendMessage}
                title="Send"
                disabled={!input.trim() || loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M2 3l20 9-20 9 4-9-4-9z M6 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}