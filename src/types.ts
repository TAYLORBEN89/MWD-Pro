export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface CurriculumSection {
  id: string;
  title: string;
  content: string;
  quizQuestions: QuizQuestion[];
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  earnedAt: number;
}

export interface UserProgress {
  completedSections: string[];
  quizScores: Record<string, number>;
  badges: Badge[];
}
