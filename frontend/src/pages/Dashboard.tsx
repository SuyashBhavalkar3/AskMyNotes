import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Upload, MessageSquare, Brain, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const user = JSON.parse(localStorage.getItem("askmynotes_user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("askynotes_user");
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
            <span className="font-display font-bold text-lg gradient-text">AskMyNotes</span>
          </div>
          <div className="flex items-center gap-4">
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

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Your <span className="gradient-text">AI Study Copilot</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Upload your notes, ask questions, and get grounded answers with citations.
            Study smarter with AI-generated quizzes — all scoped to your subjects.
          </p>
          <Button
            onClick={() => navigate("/subjects")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-8 py-3 h-auto glow-primary"
          >
            Get Started <ArrowRight className="w-4 h-4 ml-2" />
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
      </div>
    </div>
  );
};

export default Dashboard;
