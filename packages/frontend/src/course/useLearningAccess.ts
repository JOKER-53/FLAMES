import { useAccount } from "../hooks/useAccount";
import { useCourseCatalog } from "./CourseCatalog";
export function useLearningAccess() {
  const { user, integration } = useAccount();
  const { learningGuideVisible, loading } = useCourseCatalog();
  const administrator = integration?.mode === "academy" ? !!user?.canManageContent : user?.role === "instructor";
  return { canView: administrator || learningGuideVisible, loading, administrator };
}
