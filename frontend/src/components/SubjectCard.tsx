import { motion } from "framer-motion";
import { FileText, ArrowRight } from "lucide-react";

interface SubjectCardProps {
  subject: { id: string; name: string; fileNames: string[] };
  index: number;
  onClick: () => void;
  onUpload?: (subjectId: string, files: FileList | null) => void;
  busy?: boolean;
}

const colors = [
  "bg-primary/10",
  "bg-accent/10",
  "bg-info/10",
];

const SubjectCard = ({ subject, index, onClick, onUpload, busy }: SubjectCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="glass rounded-xl p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all cursor-pointer group"
    >
      <div className={`w-14 h-14 rounded-xl ${colors[index % 3]} flex items-center justify-center mb-4`}>
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
      <div className="relative flex items-center justify-between">
        {busy && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
            <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          </div>
        )}
        <div className="flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
          Open <ArrowRight className="w-3 h-3" />
        </div>
         {onUpload && (
           <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground" onClick={(e) => e.stopPropagation()}>
             <input
               type="file"
               accept=".pdf,.txt"
               multiple
               className="hidden"
               onChange={(e) => onUpload(subject.id, e.target.files)}
             />
             <svg className="w-4 h-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4-4-4M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6" />
             </svg>
           </label>
         )}
       </div>
    </motion.div>
  );
};

export default SubjectCard;
