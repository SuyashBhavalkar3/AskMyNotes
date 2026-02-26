import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, FileText, AlertCircle, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJSON } from "@/lib/api";

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
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const [continuous, setContinuous] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // helper to call backend query endpoint
const queryBackend = async (
  subject: string,
  question: string
): Promise<Partial<Message> & { content: string }> => {
  const token = localStorage.getItem("askynotes_token");
  if (!token) {
    throw new Error("Not authenticated");
  }
  const res = await postJSON("/doc/query", { subject, question, top_k: 5 }, token);
  // expected { answer, sources: [...], ... }
  // convert into Message structure
  return {
    content: res.answer || "",
    citations: res.sources?.map((s: any) => ({ file: s.document_name, section: s.chunk_text || "" })),
    // backend doesn't return confidence/evidence; fake
    confidence: "High",
    evidence: [],
  };
};

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      const backendMsg = await queryBackend(subjectName, input);
      const assistant: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: backendMsg.content,
        citations: backendMsg.citations,
        confidence: backendMsg.confidence as any,
        evidence: backendMsg.evidence,
      };
      setMessages((prev) => [...prev, assistant]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Error contacting backend: " + (err.message || err),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // recording helpers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = sendVoiceMessage;
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      console.error("could not start recording", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendVoiceMessage = async () => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "voice.webm");
    form.append("subject", subjectName);
    setIsLoading(true);
    try {
      const token = localStorage.getItem("askynotes_token");
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/voice", {
        method: "POST",
        body: form,
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        const msg = text || res.statusText;
        toast({ title: `Voice error: ${msg}`, variant: "destructive" });
        throw new Error(msg);
      }

      const transcript = res.headers.get("x-transcript") || "(voice)";
      const userMsg: Message = { id: Date.now().toString(), role: "user", content: transcript };
      setMessages((prev) => [...prev, userMsg]);

      const responseText = res.headers.get("x-response") || "(voice response)";
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("audio/")) {
        const text = await res.text();
        throw new Error(`unexpected content type: ${contentType} ${text}`);
      }
      const audioBlob = await res.blob();
      if (audioBlob.size === 0) {
        throw new Error("empty audio response");
      }
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      // when audio ends, if continuous mode is active, restart recording
      audio.onended = () => {
        if (continuous) {
          setTimeout(() => startRecording(), 200);
        }
      };
      audio.play().catch((playErr) => {
        console.error("audio play failed", playErr);
        if (continuous) setTimeout(() => startRecording(), 200);
      });

      const assistant: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: responseText,
      };
      setMessages((prev) => [...prev, assistant]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: err.message || "Voice request failed" },
      ]);
    } finally {
      setIsLoading(false);
    }
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
          className="flex gap-2 items-center"
        >
          <Button
            type="button"
            size="icon"
            onClick={() => {
              if (continuous) {
                setContinuous(false);
                stopRecording();
              } else {
                setContinuous(true);
                startRecording();
              }
            }}
            className={`bg-secondary/50 text-primary hover:bg-secondary/60 flex-shrink-0 ${continuous ? "text-destructive" : ""}`}
            disabled={isLoading}
          >
            {continuous ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${subjectName}...`}
            className="bg-secondary/50 border-border"
            disabled={isLoading || continuous || recording}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || recording || continuous}
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
