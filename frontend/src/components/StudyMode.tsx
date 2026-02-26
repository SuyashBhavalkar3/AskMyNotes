import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle, XCircle, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MCQ {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  citation: string;
}

interface ShortAnswer {
  question: string;
  modelAnswer: string;
  citation: string;
}

interface StudyModeProps {
  subjectName: string;
}

const generateMockMCQs = (subject: string): MCQ[] => [
  {
    question: `What is the primary concept in ${subject} related to data organization?`,
    options: ["Linear processing", "Hierarchical structures", "Random access", "Sequential scanning"],
    correct: 1,
    explanation: "Hierarchical structures allow efficient data organization by creating parent-child relationships.",
    citation: "notes.pdf — Page 5, Section 1.2",
  },
  {
    question: `Which principle is most important in ${subject}?`,
    options: ["Redundancy", "Efficiency", "Abstraction", "Complexity"],
    correct: 2,
    explanation: "Abstraction helps manage complexity by hiding implementation details.",
    citation: "notes.pdf — Page 12, Section 3.1",
  },
  {
    question: `In ${subject}, what approach yields optimal results?`,
    options: ["Brute force", "Divide and conquer", "Trial and error", "Exhaustive search"],
    correct: 1,
    explanation: "Divide and conquer breaks problems into smaller subproblems for efficient solving.",
    citation: "notes.pdf — Page 8, Section 2.3",
  },
  {
    question: `What is a key characteristic studied in ${subject}?`,
    options: ["Immutability", "Scalability", "Volatility", "Opacity"],
    correct: 1,
    explanation: "Scalability ensures systems can handle increasing workloads effectively.",
    citation: "notes.pdf — Page 15, Section 4.1",
  },
  {
    question: `Which methodology is emphasized in ${subject}?`,
    options: ["Waterfall", "Iterative development", "Ad hoc", "Big bang"],
    correct: 1,
    explanation: "Iterative development allows continuous improvement through feedback cycles.",
    citation: "notes.pdf — Page 20, Section 5.2",
  },
];

const generateMockShortAnswers = (subject: string): ShortAnswer[] => [
  {
    question: `Explain the fundamental principle of ${subject} in your own words.`,
    modelAnswer: `The fundamental principle involves systematic analysis and application of core concepts to solve real-world problems. It emphasizes understanding the underlying theory before applying practical solutions.`,
    citation: "notes.pdf — Page 3, Introduction",
  },
  {
    question: `How does ${subject} apply to modern technology?`,
    modelAnswer: `Modern technology heavily relies on these principles for optimization, automation, and innovation. The concepts provide a framework for building efficient and scalable solutions.`,
    citation: "notes.pdf — Page 18, Section 4.5",
  },
  {
    question: `Compare and contrast two key approaches in ${subject}.`,
    modelAnswer: `The two main approaches differ in their methodology: one focuses on top-down analysis while the other uses bottom-up construction. Both have their strengths depending on the problem context.`,
    citation: "notes.pdf — Page 22, Section 6.1",
  },
];

const StudyMode = ({ subjectName }: StudyModeProps) => {
  const [mcqs] = useState<MCQ[]>(() => generateMockMCQs(subjectName));
  const [shortAnswers] = useState<ShortAnswer[]>(() => generateMockShortAnswers(subjectName));
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showModelAnswers, setShowModelAnswers] = useState<Record<number, boolean>>({});

  const handleSelect = (qIndex: number, oIndex: number) => {
    if (showResults) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: oIndex }));
  };

  const handleCheck = () => setShowResults(true);

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setShowModelAnswers({});
  };

  const score = Object.entries(selectedAnswers).filter(
    ([qi, ai]) => mcqs[Number(qi)]?.correct === ai
  ).length;

  return (
    <div className="space-y-8">
      {/* MCQ Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">Multiple Choice Questions</h2>
              <p className="text-sm text-muted-foreground">5 MCQs generated from your {subjectName} notes</p>
            </div>
          </div>
          {showResults && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Score: <span className="text-primary">{score}/5</span>
              </span>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-1" /> Retry
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {mcqs.map((mcq, qi) => (
            <motion.div
              key={qi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qi * 0.05 }}
              className="glass rounded-xl p-5 shadow-[var(--shadow-card)]"
            >
              <p className="font-medium mb-3 text-sm">
                <span className="text-primary mr-2">Q{qi + 1}.</span>
                {mcq.question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {mcq.options.map((opt, oi) => {
                  const isSelected = selectedAnswers[qi] === oi;
                  const isCorrect = mcq.correct === oi;
                  let style = "border-border hover:border-primary/50 text-foreground";
                  if (showResults && isSelected && isCorrect) style = "border-success bg-success/10 text-success";
                  else if (showResults && isSelected && !isCorrect) style = "border-destructive bg-destructive/10 text-destructive";
                  else if (showResults && isCorrect) style = "border-success/50 text-success/70";
                  else if (isSelected) style = "border-primary bg-primary/10 text-primary";

                  return (
                    <button
                      key={oi}
                      onClick={() => handleSelect(qi, oi)}
                      className={`text-left text-sm px-4 py-2.5 rounded-lg border transition-all ${style}`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                      {showResults && isCorrect && <CheckCircle className="inline w-3 h-3 ml-2" />}
                      {showResults && isSelected && !isCorrect && <XCircle className="inline w-3 h-3 ml-2" />}
                    </button>
                  );
                })}
              </div>
              {showResults && (
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                  <p><strong>Explanation:</strong> {mcq.explanation}</p>
                  <p className="flex items-center gap-1"><FileText className="w-3 h-3 text-primary" /> {mcq.citation}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {!showResults && Object.keys(selectedAnswers).length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleCheck} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Check Answers
            </Button>
          </div>
        )}
      </div>

      {/* Short Answer Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl">Short Answer Questions</h2>
            <p className="text-sm text-muted-foreground">3 questions with model answers</p>
          </div>
        </div>

        <div className="space-y-4">
          {shortAnswers.map((sa, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-5 shadow-[var(--shadow-card)]"
            >
              <p className="font-medium text-sm mb-3">
                <span className="text-accent mr-2">Q{i + 1}.</span>
                {sa.question}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModelAnswers((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="text-xs text-primary"
              >
                {showModelAnswers[i] ? "Hide" : "Show"} Model Answer
              </Button>
              {showModelAnswers[i] && (
                <div className="mt-3 text-xs text-muted-foreground space-y-2 bg-secondary/30 rounded-lg p-3">
                  <p>{sa.modelAnswer}</p>
                  <p className="flex items-center gap-1"><FileText className="w-3 h-3 text-primary" /> {sa.citation}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudyMode;
