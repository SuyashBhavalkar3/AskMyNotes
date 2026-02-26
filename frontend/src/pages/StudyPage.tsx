import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import SubjectCard from "@/components/SubjectCard";
import ChatInterface from "@/components/ChatInterface";
import StudyMode from "@/components/StudyMode";
import { useToast } from "@/hooks/use-toast";
import { postForm } from "@/lib/api";
import { loadSubjects, saveSubjects } from "@/lib/subjects";

const StudyPage = () => {
  const navigate = useNavigate();
  const stored = loadSubjects();
  const [subjects, setSubjects] = useState<{ id: string; name: string; fileNames: string[] }[]>(stored || []);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "study">("chat");

  const selected = subjects.find((s) => s.id === selectedSubject);
  const { toast } = useToast();

  const refreshSubjects = (updated: typeof subjects) => {
    saveSubjects(updated);
    setSubjects(updated);
  };

  // allow first-time users to add a subject inline instead of forcing a redirect
  const [newSubjectName, setNewSubjectName] = useState("");
  const addSubject = (name?: string) => {
    const n = (name ?? newSubjectName).trim();
    if (!n) {
      toast({ title: "Please enter a subject name", variant: "destructive" });
      return;
    }
    const newSub = { id: Date.now().toString(), name: n, fileNames: [] };
    const updated = [...subjects, newSub];
    refreshSubjects(updated);
    setNewSubjectName("");
    setSelectedSubject(newSub.id);
  };

  const [busyIds, setBusyIds] = useState<string[]>([]);
  const setBusy = (id: string, value: boolean) => {
    setBusyIds((prev) => {
      if (value) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const handleFiles = async (subjectId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(subjectId, true);
    const token = localStorage.getItem("askynotes_token");
    if (!token) {
      toast({ title: "Please sign in to upload files", variant: "destructive" });
      setBusy(subjectId, false);
      return;
    }
    const subj = subjects.find((s) => s.id === subjectId);
    if (!subj) {
      setBusy(subjectId, false);
      return;
    }
    for (const f of Array.from(files)) {
      if (f.type !== "application/pdf" && f.type !== "text/plain") {
        toast({ title: `${f.name} is not a supported file type`, variant: "destructive" });
        continue;
      }
      const form = new FormData();
      form.append("subject", subj.name);
      form.append("file", f, f.name);
      try {
        await postForm("/doc/upload", form, token);
        // update localStorage fileNames
        const updated = subjects.map((s) =>
          s.id === subjectId ? { ...s, fileNames: [...s.fileNames, f.name] } : s
        );
        refreshSubjects(updated);
        toast({ title: `${f.name} uploaded` });
      } catch (err: any) {
        toast({ title: err.message || `Upload failed for ${f.name}`, variant: "destructive" });
      }
    }
    setBusy(subjectId, false);
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-lg text-primary">AskMyNotes</span>
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { localStorage.removeItem("askynotes_user"); localStorage.removeItem("askynotes_token"); localStorage.removeItem("askynotes_subjects"); navigate("/login"); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {selectedSubject ? (
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
        ) : subjects.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <h1 className="text-3xl font-display font-bold mb-2">Welcome — Add a Subject</h1>
            <p className="text-muted-foreground mb-6">It looks like you don't have any subjects yet. Add one to get started.</p>
            <div className="max-w-md mx-auto flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-md bg-secondary/50 border-border"
                placeholder="e.g. Biology"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
              />
              <Button onClick={() => addSubject()} disabled={!newSubjectName.trim()}>Add</Button>
            </div>
            <div className="mt-4">
              <Button variant="ghost" onClick={() => navigate('/subjects')}>Open full setup</Button>
            </div>
          </motion.div>
        ) : (
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
                  onUpload={handleFiles}
                  busy={busyIds.includes(subject.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StudyPage;
