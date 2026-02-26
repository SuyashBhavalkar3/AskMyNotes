import { motion } from "framer-motion";
import { FileText, ArrowRight } from "lucide-react";

interface SubjectCardProps {
  subject: { id: string; name: string; fileNames: string[] };
  index: number;
  onClick: () => void;
}

const colors = [
  "from-primary/20 to-primary/5",
  "from-accent/20 to-accent/5",
  "from-info/20 to-info/5",
];

const SubjectCard = ({ subject, index, onClick }: SubjectCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="glass rounded-xl p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all cursor-pointer group"
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[index % 3]} flex items-center justify-center mb-4`}>
        <span className="font-display font-bold text-2xl text-foreground">{subject.name.charAt(0).toUpperCase()}</span>
      </div>
      <h3 className="font-display font-semibold text-xl mb-2">{subject.name}</h3>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <FileText className="w-4 h-4" />
        <span>{subject.fileNames.length} file{subject.fileNames.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-1 mb-4">
        {subject.fileNames.slice(0, 3).map((name) => (
          <p key={name} className="text-xs text-muted-foreground truncate">• {name}</p>
        ))}
        {subject.fileNames.length > 3 && (
          <p className="text-xs text-muted-foreground">+{subject.fileNames.length - 3} more</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
        Open <ArrowRight className="w-3 h-3" />
      </div>
    </motion.div>
  );
};

export default SubjectCard;
