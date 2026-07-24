export interface QuestionMap {
  name: string;
  email: string;
  session: string;
  combination: string;
  language: string;
}

export interface ParsedResponse {
  name: string;
  email: string;
  session: string;
  combinationId: string | null;
  language: 'Kannada' | 'Hindi' | 'Sanskrit' | null;
  submittedAt: Date;
}
