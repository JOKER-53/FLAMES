export type ContentVendor = "fortigate" | "paloalto";
export type ContentLevel = "Foundation" | "Intermediate" | "Advanced";
export interface AuthoredTask {
  id: string;
  type: "choice" | "answer";
  prompt: string;
  choices: string[];
  correctIndex: number;
  acceptedAnswers: string[];
}
export interface AuthoredLesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: ContentLevel;
  body: string;
  tasks: AuthoredTask[];
}
export interface AuthoredModule {
  id: string;
  vendor: ContentVendor;
  title: string;
  summary: string;
  lessons: AuthoredLesson[];
}
export interface ContentDraft {
  module: AuthoredModule;
  revision: number;
  publishedAt: number | null;
  updatedAt: number;
  hasUnpublishedChanges: boolean;
}
export interface ContentSummary {
  id: string;
  vendor: ContentVendor;
  title: string;
  lessonCount: number;
  revision: number;
  publishedAt: number | null;
  hasUnpublishedChanges: boolean;
}
export type PublicTask = Pick<AuthoredTask, "id" | "type" | "prompt" | "choices">;
export type PublicLesson = Omit<AuthoredLesson, "tasks"> & { vendor: ContentVendor; moduleId: string; tasks: PublicTask[] };
export interface CatalogModule {
  id: string;
  vendor: ContentVendor;
  title: string;
  summary: string;
  lessons: Omit<AuthoredLesson, "body" | "tasks">[];
}
