import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isCompletionTask, type CatalogModule } from "@fortisim/engine";
import { apiFetch } from "../api/http";
import { COURSES, type Course, type Vendor } from "./curriculum";

export function mergeCatalog(modules: CatalogModule[]): Record<Vendor, Course> {
  return Object.fromEntries((["fortigate", "paloalto"] as const).map(vendor => [vendor, {
    ...COURSES[vendor], modules: [...COURSES[vendor].modules, ...modules.filter(module => module.vendor === vendor).map(module => ({
      id: module.id, title: module.title, summary: module.summary, icon: "book" as const,
      lessons: module.lessons.map(lesson => ({ ...lesson, route: `/${vendor}/lessons/${lesson.id}` })),
    }))],
  }])) as Record<Vendor, Course>;
}
interface CatalogContext {
  courses: Record<Vendor, Course>;
  loading: boolean;
  error: string | null;
  validTask: (platform: Vendor, id: unknown) => id is string;
  refresh: () => Promise<void>;
}
const Context = createContext<CatalogContext>({ courses: COURSES, loading: false, error: null, validTask: isCompletionTask, refresh: async () => {} });
export const useCourseCatalog = () => useContext(Context);
export function CourseCatalogProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch("/api/content/catalog");
      if (!response.ok) throw new Error("Custom lesson library could not be loaded.");
      const data = await response.json();
      if (!Array.isArray(data.modules)) throw new Error("Invalid lesson library response.");
      setModules(data.modules); setError(null);
    } catch (error) { setError(error instanceof Error ? error.message : "Lesson library unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const courses = useMemo(() => mergeCatalog(modules), [modules]);
  const validTask = useCallback((vendor: Vendor, id: unknown): id is string => typeof id === "string" &&
    courses[vendor].modules.some(module => module.lessons.some(lesson => lesson.id === id)), [courses]);
  return <Context.Provider value={{ courses, loading, error, validTask, refresh }}>{children}</Context.Provider>;
}
