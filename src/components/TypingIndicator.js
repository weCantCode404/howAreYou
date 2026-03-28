export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 w-fit rounded-2xl rounded-bl-sm bg-surface-elevated border border-border-default shadow-card">
      <span className="typing-dot w-2 h-2 rounded-full bg-text-muted" style={{ animationDelay: "0ms" }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-text-muted" style={{ animationDelay: "150ms" }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-text-muted" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
