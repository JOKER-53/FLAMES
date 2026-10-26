import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isCompletionTask, type CatalogModule } from "@fortisim/engine";
import { apiFetch } from "../api/http";
import { COURSES, type Course, type Vendor } from "./curriculum";

export function mergeCatalog(modules: CatalogModule[]): Record<Vendor, Course> {
  return Object.fromEntries((["fortigate", "paloalto"] as const).map(vendor => [vendor, {
    ...COURSES[vendor], modules: [...COURSES[vendor].modules, ...modules.filter(module => module.vendor === vendor).map(module => ({
      id: module.id, title: module.title, summary: module.summary, icon: "book" as const,
      lessons: module.lessons.map(lesson => ({ ...lesson, route: lesson.kind === "policy" ? `/fortigate/policy/firewall-policy?scenario=${lesson.id}` : `/${vendor}/lessons/${lesson.id}` })),
    }))],
  }])) as Record<Vendor, Course>;
}
interface CatalogContext {
  courses: Record<Vendor, Course>;
  learningGuideVisible: boolean;
  loading: boolean;
  error: string | null;
  validTask: (platform: Vendor, id: unknown) => id is string;
  refresh: () => Promise<void>;
}
const Context = createContext<CatalogContext>({ courses: COURSES, learningGuideVisible: false, loading: false, error: null, validTask: isCompletionTask, refresh: async () => {} });
export const useCourseCatalog = () => useContext(Context);
export function CourseCatalogProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [learningGuideVisible, setLearningGuideVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const response = await apiFetch("/api/content/catalog");
      if (!response.ok) throw new Error("Custom lesson library could not be loaded.");
      const data = await response.json();
      if (!Array.isArray(data.modules)) throw new Error("Invalid lesson library response.");
      if (current !== generation.current) return;
      setModules(data.modules); setLearningGuideVisible(data.learningGuideVisible === true); setError(null);
    } catch (error) { if (current !== generation.current) return; setError(error instanceof Error ? error.message : "Lesson library unavailable."); }
    finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  useEffect(() => {
    const update = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", update);
    const timer = window.setInterval(update, 30000);
    return () => { window.removeEventListener("focus", update); window.clearInterval(timer); };
  }, [refresh]);
  const courses = useMemo(() => mergeCatalog(modules), [modules]);
  const validTask = useCallback((vendor: Vendor, id: unknown): id is string => typeof id === "string" &&
    courses[vendor].modules.some(module => module.lessons.some(lesson => lesson.id === id)), [courses]);
  return <Context.Provider value={{ courses, learningGuideVisible, loading, error, validTask, refresh }}>{children}</Context.Provider>;
}
