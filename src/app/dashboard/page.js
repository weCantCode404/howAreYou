"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Send,
  LogOut,
  ChevronDown,
  Square,
  Plus,
  X,
  MessageSquare,
  Clock,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AppSidebar from "@/components/AppSidebar";
import AIAnimation from "@/components/AIAnimation";
import WaveAnimation from "@/components/WaveAnimation";
import TypingIndicator from "@/components/TypingIndicator";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tw", label: "Twi" },
  { code: "ee", label: "Ewe" },
  { code: "ga", label: "Ga" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const VIEW_IDLE = "idle";
const VIEW_CHAT = "chat";
const VIEW_LISTENING = "listening";
const VIEW_PROCESSING = "processing";
const VIEW_RESPONSE = "response";

export default function Dashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [language, setLanguage] = useState("en");
  const [message, setMessage] = useState("");
  const [view, setView] = useState(VIEW_IDLE);
  const [aiResponse, setAiResponse] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [conversationDone, setConversationDone] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const audioPlayerRef = useRef(null);
  const inputRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const sidebarRef = useRef(null);
  const { isRecording, error: micError, startRecording, stopRecording } = useAudioRecorder();

  useEffect(() => {
    const token = localStorage.getItem("wc_token");
    if (!token) {
      router.replace("/");
      return;
    }
    setUsername(localStorage.getItem("wc_username") || "");
    setUserId(localStorage.getItem("wc_user_id") || "");
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAiTyping]);

  useEffect(() => {
    if (view === VIEW_CHAT && !isAiTyping && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [view, isAiTyping, chatMessages]);

  const resetToIdle = useCallback(() => {
    setView(VIEW_IDLE);
    setAiResponse(null);
    setAudioSrc(null);
    setError(null);
    setChatMessages([]);
    setConversationHistory([]);
    setIsAiTyping(false);
    setConversationDone(false);
    setShowSummary(false);
  }, []);

  const handleCloseSummary = useCallback(() => {
    resetToIdle();
    sidebarRef.current?.refresh();
  }, [resetToIdle]);

  const handleEndChat = useCallback(() => {
    setShowSummary(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("wc_token");
    localStorage.removeItem("wc_username");
    localStorage.removeItem("wc_user_id");
    router.replace("/");
  };

  const sendTextToBackend = useCallback(async (text, history) => {
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message: text,
        username,
        language,
        conversation_history: history,
      }),
    });

    if (!res.ok) throw new Error(`Server error (${res.status})`);

    const data = await res.json();

    let responseText;
    if (typeof data === "string") {
      responseText = data;
    } else if (data.result) {
      if (typeof data.result === "string") {
        responseText = data.result;
      } else {
        const skip = new Set(["type", "crisis_flag"]);
        for (const [key, val] of Object.entries(data.result)) {
          if (!skip.has(key) && typeof val === "string" && val.trim()) {
            responseText = val;
            break;
          }
        }
      }
    }
    if (!responseText) {
      responseText = data.response || data.message || data.detail || "";
    }

    const resultType = data.result?.type;
    const done =
      resultType === "done" ||
      resultType === "complete" ||
      data.done === true ||
      data.conversation_complete === true;

    const serverHistory = data.conversation_history;

    return { responseText, done, serverHistory };
  }, [userId, username, language]);

  // ── Text check-in (first message) ─────────────────────────────
  const handleSendText = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const userMsg = { role: "user", content: trimmed };
    setChatMessages([userMsg]);
    setMessage("");
    setError(null);
    setView(VIEW_CHAT);
    setIsAiTyping(true);
    setConversationDone(false);

    try {
      const { responseText, done, serverHistory } = await sendTextToBackend(trimmed, conversationHistory);

      const assistantMsg = { role: "assistant", content: responseText };

      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        setConversationHistory(serverHistory);
      } else {
        setConversationHistory((prev) => [...prev, userMsg, assistantMsg]);
      }

      setChatMessages((prev) => [...prev, assistantMsg]);
      setConversationDone(done);
      if (done) setShowSummary(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAiTyping(false);
    }
  }, [message, conversationHistory, sendTextToBackend]);

  // ── Chat follow-up messages ────────────────────────────────────
  const handleSendReply = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isAiTyping) return;

    const userMsg = { role: "user", content: trimmed };
    setChatMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setError(null);
    setIsAiTyping(true);

    try {
      const { responseText, done, serverHistory } = await sendTextToBackend(trimmed, conversationHistory);

      const assistantMsg = { role: "assistant", content: responseText };

      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        setConversationHistory(serverHistory);
      } else {
        setConversationHistory((prev) => [...prev, userMsg, assistantMsg]);
      }

      setChatMessages((prev) => [...prev, assistantMsg]);
      setConversationDone(done);
      if (done) setShowSummary(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAiTyping(false);
    }
  }, [message, isAiTyping, conversationHistory, sendTextToBackend]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (view === VIEW_CHAT) {
        handleSendReply();
      } else {
        handleSendText();
      }
    }
  };

  // ── Voice check-in ─────────────────────────────────────────────
  const handleMicClick = useCallback(async () => {
    if (view === VIEW_LISTENING) {
      const blob = await stopRecording();
      if (!blob) return;

      setView(VIEW_PROCESSING);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("user_id", userId);
        formData.append("language", language);
        formData.append("audio", blob, "recording.webm");
        formData.append("username", username);
        formData.append("conversation_history", JSON.stringify(conversationHistory));

        const res = await fetch("/api/checkin-voice", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`Server error (${res.status})`);

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("audio")) {
          const audioBlob = await res.blob();
          const url = URL.createObjectURL(audioBlob);
          setAudioSrc(url);
          setView(VIEW_RESPONSE);
        } else {
          const data = await res.json();
          const responseText = typeof data === "string" ? data : data.response || data.message || JSON.stringify(data);
          setAiResponse(responseText);
          setView(VIEW_RESPONSE);
        }
      } catch (err) {
        setError(err.message);
        setView(VIEW_IDLE);
      }
      return;
    }

    try {
      await startRecording();
      setView(VIEW_LISTENING);
      setError(null);
    } catch {
      /* error is set by the hook */
    }
  }, [view, userId, language, username, conversationHistory, startRecording, stopRecording]);

  useEffect(() => {
    if (audioSrc && audioPlayerRef.current) {
      audioPlayerRef.current.play().catch(() => {});
    }
  }, [audioSrc]);

  const handleAudioEnded = () => {
    if (audioSrc) URL.revokeObjectURL(audioSrc);
    resetToIdle();
  };

  if (!ready) return null;

  const selectedLang = LANGUAGES.find((l) => l.code === language);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar ref={sidebarRef} userId={userId} />

      <SidebarInset className="flex flex-col h-svh overflow-hidden">
        {/* ── Top Bar ──────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-elevated shrink-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger />

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-default bg-surface-elevated hover:bg-background transition-colors text-sm font-medium text-dark">
                <span>{selectedLang?.label}</span>
                <ChevronDown size={14} className="text-text-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? "font-semibold text-primary" : ""}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            {view === VIEW_CHAT && !showSummary && (
              <button
                onClick={handleEndChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus size={14} />
                New check-in
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-background transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {username?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <span className="text-sm font-medium text-dark hidden sm:inline">{username}</span>
                <ChevronDown size={14} className="text-text-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} className="text-urgency-high focus:text-urgency-high">
                  <LogOut size={14} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Main Content ────────────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
          {/* Error banner */}
          {(error || micError) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-urgency-high-bg border border-urgency-high/20 text-urgency-high text-sm rounded-xl px-4 py-2.5 max-w-md text-center animate-in fade-in slide-in-from-top-2 duration-200">
              {error || micError}
            </div>
          )}

          {/* ── IDLE VIEW ──────────────────────────────────────── */}
          <div
            className={`flex flex-col items-center gap-6 w-full max-w-2xl transition-all duration-200 ease-out ${
              view === VIEW_IDLE ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute"
            }`}
          >
            <AIAnimation isAnimating={false} className="w-24 h-24" />

            <div className="text-center space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-dark tracking-tight">
                {getGreeting()}, {username || "there"}
              </h1>
              <p className="text-lg sm:text-xl text-text-secondary">
                How Can I{" "}
                <span className="text-primary font-semibold">Assist You Today?</span>
              </p>
            </div>

            {/* Text input bar */}
            <div className="w-full relative mt-4">
              <div className="relative bg-surface-elevated border border-border-default rounded-2xl shadow-card overflow-hidden transition-shadow focus-within:shadow-lift focus-within:border-primary/30">
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Initiate a query or send a command to the AI..."
                  rows={3}
                  className="w-full resize-none bg-transparent px-5 pt-4 pb-14 text-sm text-dark placeholder:text-text-muted focus:outline-none"
                />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div />
                  <div className="flex items-center gap-2">
                    {message.trim() && (
                      <button
                        onClick={handleSendText}
                        className="p-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
                        aria-label="Send message"
                      >
                        <Send size={16} />
                      </button>
                    )}
                    <button
                      onClick={handleMicClick}
                      className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      aria-label="Start voice recording"
                    >
                      <Mic size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CHAT VIEW ──────────────────────────────────────── */}
          <div
            className={`flex flex-col w-full h-full max-w-2xl transition-all duration-200 ease-out ${
              view === VIEW_CHAT ? "opacity-100" : "opacity-0 pointer-events-none absolute"
            }`}
          >
            {/* Messages thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-2xl rounded-br-sm"
                        : "bg-surface-elevated border border-border-default text-dark rounded-2xl rounded-bl-sm shadow-card"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isAiTyping && (
                <div className="flex justify-start">
                  <TypingIndicator />
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            {!conversationDone && !showSummary && (
              <div className="shrink-0 pb-4 pt-2">
                <div className="relative bg-surface-elevated border border-border-default rounded-2xl shadow-card overflow-hidden transition-shadow focus-within:shadow-lift focus-within:border-primary/30">
                  <textarea
                    ref={chatInputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reply..."
                    rows={2}
                    disabled={isAiTyping}
                    className="w-full resize-none bg-transparent px-5 pt-3 pb-12 text-sm text-dark placeholder:text-text-muted focus:outline-none disabled:opacity-50"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {message.trim() && !isAiTyping && (
                      <button
                        onClick={handleSendReply}
                        className="p-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
                        aria-label="Send reply"
                      >
                        <Send size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Summary overlay card ───────────────────────── */}
            {showSummary && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-dark/30 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-sm mx-4 bg-surface-elevated border border-border-default rounded-2xl shadow-lift p-6 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-primary-muted flex items-center justify-center">
                        <MessageSquare size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-dark">Check-in Complete</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock size={12} className="text-text-muted" />
                          <span className="text-xs text-text-muted">Just now</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCloseSummary}
                      className="p-1.5 rounded-lg text-text-muted hover:text-dark hover:bg-background transition-colors"
                      aria-label="Close summary"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="bg-background rounded-xl p-3.5 space-y-2">
                    <p className="text-sm font-medium text-dark leading-snug line-clamp-2">
                      {chatMessages.find((m) => m.role === "user")?.content || "Conversation"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {chatMessages.length} message{chatMessages.length !== 1 ? "s" : ""} exchanged
                    </p>
                  </div>

                  <button
                    onClick={handleCloseSummary}
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── LISTENING VIEW ─────────────────────────────────── */}
          <div
            className={`flex flex-col items-center gap-8 w-full max-w-md transition-all duration-200 ease-out ${
              view === VIEW_LISTENING ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute"
            }`}
          >
            <AIAnimation isAnimating={true} className="w-40 h-40" />

            <p className="text-text-secondary text-sm animate-pulse">
              Listening...
            </p>

            <button
              onClick={handleMicClick}
              className="p-4 rounded-full bg-urgency-high text-white hover:bg-urgency-high/90 transition-all shadow-lg hover:shadow-xl"
              aria-label="Stop recording"
            >
              <Square size={20} fill="currentColor" />
            </button>
          </div>

          {/* ── PROCESSING VIEW (voice only) ───────────────────── */}
          <div
            className={`flex flex-col items-center gap-6 w-full max-w-md transition-all duration-200 ease-out ${
              view === VIEW_PROCESSING ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute"
            }`}
          >
            <WaveAnimation className="w-48 h-48" />

            <p className="text-text-secondary text-sm">
              Processing your message...
            </p>
          </div>

          {/* ── RESPONSE VIEW (voice only) ─────────────────────── */}
          <div
            className={`flex flex-col items-center gap-6 w-full max-w-2xl transition-all duration-200 ease-out ${
              view === VIEW_RESPONSE ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute"
            }`}
          >
            {audioSrc ? (
              <>
                <WaveAnimation className="w-40 h-40" />
                <p className="text-text-secondary text-sm">Speaking...</p>
                <audio
                  ref={audioPlayerRef}
                  src={audioSrc}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />
              </>
            ) : aiResponse ? (
              <>
                <AIAnimation isAnimating={false} className="w-20 h-20" />
                <div className="w-full bg-surface-elevated border border-border-default rounded-2xl p-6 shadow-card">
                  <p className="text-dark text-sm leading-relaxed whitespace-pre-wrap">
                    {aiResponse}
                  </p>
                </div>
              </>
            ) : null}

            <button
              onClick={resetToIdle}
              className="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Start a new check-in
            </button>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
