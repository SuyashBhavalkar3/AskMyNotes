import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { file: string; section: string }[];
  confidence?: "High" | "Medium" | "Low";
  evidence?: string[];
}

interface ChatInterfaceProps {
  subjectName: string;
  fileNames: string[];
}

const confidenceColors = {
  High: "text-success",
  Medium: "text-warning",
  Low: "text-destructive",
};

const ChatInterface = ({ subjectName, fileNames }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const simulateResponse = (question: string): Message => {
    // Demo response - in production this would call the AI backend
    const hasInfo = Math.random() > 0.2;
    if (!hasInfo) {
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: `Not found in your notes for ${subjectName}.`,
      };
    }
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: `Based on your ${subjectName} notes, here's what I found about "${question}":\n\nThis topic is covered in your uploaded materials. The key concepts include the fundamental principles and their applications in practical scenarios. The notes explain the theoretical framework and provide examples for better understanding.`,
      citations: [
        { file: fileNames[0] || "notes.pdf", section: "Page 3, Section 2.1" },
        { file: fileNames[Math.min(1, fileNames.length - 1)] || "notes.pdf", section: "Page 7, Paragraph 4" },
      ],
      confidence: (["High", "Medium", "Low"] as const)[Math.floor(Math.random() * 3)],
      evidence: [
        `"The fundamental concept of this topic relates to..." — ${fileNames[0] || "notes.pdf"}`,
        `"In practical applications, we observe that..." — ${fileNames[Math.min(1, fileNames.length - 1)] || "notes.pdf"}`,
      ],
    };
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const response = simulateResponse(input);
      setMessages((prev) => [...prev, response]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full glass rounded-xl overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-primary/30 mb-4" />
            <h3 className="font-display font-semibold text-lg text-muted-foreground mb-1">Ask about {subjectName}</h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              Ask any question and get answers grounded in your uploaded notes with citations.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {msg.confidence && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>Confidence: <span className={confidenceColors[msg.confidence]}>{msg.confidence}</span></span>
                  </div>

                  {msg.citations && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Citations:</span>
                      {msg.citations.map((c, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3 text-primary" />
                          <span>{c.file} — {c.section}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.evidence && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Evidence:</span>
                      {msg.evidence.map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground italic">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-accent" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary/50 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${subjectName}...`}
            className="bg-secondary/50 border-border"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
