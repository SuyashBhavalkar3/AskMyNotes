import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Upload, FileText, X, ArrowRight, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export interface Subject {
  id: string;
  name: string;
  files: File[];
}

const SubjectSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // if subjects already stored, skip setup
  useEffect(() => {
    const stored = localStorage.getItem("askynotes_subjects");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 3 && parsed.every((s: any) => s.name)) {
          navigate("/study");
        }
      } catch {}
    }
  }, [navigate]);

  const [subjects, setSubjects] = useState<Subject[]>([
    { id: "1", name: "", files: [] },
    { id: "2", name: "", files: [] },
    { id: "3", name: "", files: [] },
  ]);

  const updateSubjectName = (id: string, name: string) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const addFiles = (id: string, newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.type === "text/plain"
    );
    if (validFiles.length !== newFiles.length) {
      toast({ title: "Only PDF and TXT files are allowed", variant: "destructive" });
    }
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, files: [...s.files, ...validFiles] } : s))
    );
  };

  const removeFile = (subjectId: string, fileIndex: number) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, files: s.files.filter((_, i) => i !== fileIndex) } : s
      )
    );
  };

  const handleProceed = () => {
    const allValid = subjects.every((s) => s.name.trim());
    if (!allValid) {
      toast({ title: "Each subject needs a name", variant: "destructive" });
      return;
    }
    // Save subjects metadata to localStorage (files stay in memory for demo)
    const metadata = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      fileNames: s.files.map((f) => f.name),
    }));
    localStorage.setItem("askynotes_subjects", JSON.stringify(metadata));
    navigate("/study");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
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
            onClick={() => { localStorage.removeItem("askynotes_user"); navigate("/login"); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2">Set Up Your Subjects</h1>
          <p className="text-muted-foreground mb-10">
            Create exactly 3 subjects. Uploading notes is optional — you can add documents later from the dashboard.
          </p>
        </motion.div>

        <div className="space-y-6">
          {subjects.map((subject, idx) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass rounded-xl p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm">
                  {idx + 1}
                </div>
                <h3 className="font-display font-semibold text-lg">Subject {idx + 1}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor={`name-${subject.id}`}>Subject Name</Label>
                  <Input
                    id={`name-${subject.id}`}
                    placeholder="e.g. Machine Learning, Data Structures"
                    value={subject.name}
                    onChange={(e) => updateSubjectName(subject.id, e.target.value)}
                    className="bg-secondary/50 border-border mt-1"
                  />
                </div>

                <div>
                  <Label>Upload Notes (PDF/TXT)</Label>
                  <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload or drag files</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt"
                      className="hidden"
                      onChange={(e) => addFiles(subject.id, e.target.files)}
                    />
                  </label>
                </div>

                {subject.files.length > 0 && (
                  <div className="space-y-2">
                    {subject.files.map((file, fi) => (
                      <div
                        key={fi}
                        className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-2"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <span className="text-muted-foreground">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(subject.id, fi)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex justify-end"
        >
          <Button
            onClick={handleProceed}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 py-3 h-auto glow-primary"
          >
            Continue to Study <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SubjectSetup;