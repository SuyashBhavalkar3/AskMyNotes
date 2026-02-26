import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Upload, MessageSquare, Brain, ArrowRight, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { postForm } from "@/lib/api";
import { loadSubjects, saveSubjects } from "@/lib/subjects";

const features = [
  {
    icon: Upload,
    title: "Upload Notes",
    description: "Upload PDF/TXT notes for up to 3 subjects. Organize your study materials in one place.",
  },
  {
    icon: MessageSquare,
    title: "Ask Questions",
    description: "Chat with your notes! Get answers with citations, confidence levels, and evidence snippets.",
  },
  {
    icon: Brain,
    title: "Study Mode",
    description: "Auto-generate MCQs and short-answer questions from your notes for active recall practice.",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("askynotes_user") || "{}");
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<{ id: string; name: string; fileNames: string[] }[]>(() => {
    const stored = loadSubjects();
    return stored || [];
  });

  const refreshSubjects = (updated: typeof subjects) => {
    saveSubjects(updated);
    setSubjects(updated);
  };

  const handleFiles = async (subjectId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = localStorage.getItem("askynotes_token");
    if (!token) {
      toast({ title: "Please sign in to upload files", variant: "destructive" });
      return;
    }
    const subj = subjects.find((s) => s.id === subjectId);
    if (!subj) return;
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
  };

  const handleLogout = () => {
    localStorage.removeItem("askynotes_user");
    localStorage.removeItem("askynotes_token");
    localStorage.removeItem("askynotes_subjects");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-lg text-primary">AskMyNotes</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email || "user@demo.com"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Your <span className="text-primary">AI Study Copilot</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
            Upload your notes, ask questions, and get grounded answers with citations. Study smarter with AI-generated quizzes — all scoped to your subjects.
          </p>
          <Button
            onClick={() => navigate("/subjects")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-6 py-2 h-auto"
          >
            Get Started <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (i + 1) }}
              className="glass rounded-xl p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick upload area per subject */}
        {subjects.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-display font-bold mb-4">Your Subjects — Upload Notes</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <div key={subject.id} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-display font-semibold">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground">{subject.fileNames.length} file{subject.fileNames.length !== 1 ? "s" : ""}</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Upload className="w-5 h-5 text-primary" />
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(subject.id, e.target.files)}
                      />
                    </label>
                  </div>
                  {subject.fileNames.length > 0 && (
                    <ul className="text-sm mt-2 space-y-1">
                      {subject.fileNames.map((fn, i) => (
                        <li key={i} className="truncate">{fn}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
