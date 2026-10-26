import type { ExerciseTopology } from "./topology";
import type { ConfigurationExercise, ConfigurationFamily } from "./configurationExercises";
import type { AddressObject, ServiceObject, FirewallPolicy, TestPacket, ExpectedOutcome, WebFilterProfile } from "../policy/types";

export interface PolicyExercise {
  schemaVersion: 1;
  starterAddresses: AddressObject[];
  starterServices: ServiceObject[];
  starterWebFilterProfiles: WebFilterProfile[];
  starterPolicies: FirewallPolicy[];
  testPackets: TestPacket[];
  expectedOutcomes: ExpectedOutcome[];
  referencePolicies: FirewallPolicy[];
}
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
  topology?: ExerciseTopology;
  kind?: "reading" | "policy" | "configuration";
  configurationExercise?: ConfigurationExercise;
  simulatorFamily?: ConfigurationFamily;
  scenarioVersion?: string;
  policyExercise?: PolicyExercise;
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
  summary?: string;
  lessonTitles?: string[];
  id: string;
  vendor: ContentVendor;
  title: string;
  lessonCount: number;
  revision: number;
  publishedAt: number | null;
  hasUnpublishedChanges: boolean;
}
export type PublicTask = Pick<AuthoredTask, "id" | "type" | "prompt" | "choices">;
export type PublicLesson = Omit<AuthoredLesson, "tasks" | "policyExercise" | "configurationExercise"> & { vendor: ContentVendor; moduleId: string; tasks: PublicTask[] };
export interface CatalogModule {
  id: string;
  vendor: ContentVendor;
  title: string;
  summary: string;
  lessons: Omit<AuthoredLesson, "body" | "tasks" | "policyExercise" | "configurationExercise">[];
}
