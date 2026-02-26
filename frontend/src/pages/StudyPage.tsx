import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubjectCard from "@/components/SubjectCard";
import ChatInterface from "@/components/ChatInterface";
import StudyMode from "@/components/StudyMode";

const StudyPage = () => {
  const navigate = useNavigate();
  const stored = localStorage.getItem("askynotes_subjects");
  const subjects: { id: string; name: string; fileNames: string[] }[] = stored
    ? JSON.parse(stored)
    : [];

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "study">("chat");

  const selected = subjects.find((s) => s.id === selectedSubject);

  if (subjects.length === 0) {
    navigate("/subjects");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-lg gradient-text">AskMyNotes</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { localStorage.removeItem("askynotes_user"); navigate("/login"); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {!selectedSubject ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-3xl font-display font-bold mb-2">Your Subjects</h1>
            <p className="text-muted-foreground mb-8">Select a subject to start studying</p>
            <div className="grid md:grid-cols-3 gap-6">
              {subjects.map((subject, i) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  index={i}
                  onClick={() => setSelectedSubject(subject.id)}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Subject Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubject(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </Button>
                <h2 className="font-display font-bold text-xl">{selected?.name}</h2>
                <span className="text-sm text-muted-foreground">
                  ({selected?.fileNames.length} file{selected?.fileNames.length !== 1 ? "s" : ""})
                </span>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-secondary/50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === "chat"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab("study")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === "study"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Study Mode
                </button>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {activeTab === "chat" ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex-1 min-h-0"
                >
                  <ChatInterface subjectName={selected?.name || ""} fileNames={selected?.fileNames || []} />
                </motion.div>
              ) : (
                <motion.div
                  key="study"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex-1 overflow-auto"
                >
                  <StudyMode subjectName={selected?.name || ""} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPage;
