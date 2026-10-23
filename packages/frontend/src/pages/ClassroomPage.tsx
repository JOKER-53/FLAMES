import { useCourseCatalog } from "../course/CourseCatalog";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accountRequest, useAccount, type AccountUser } from "../hooks/useAccount";
import { SiteLayout } from "../components/shell/SiteLayout";
import { Callout, PageHeader, ProgressBar } from "../components/ui/primitives";
import { allLessons, type Vendor } from "../course/curriculum";

type Student = AccountUser & { fortigate: string[]; paloalto: string[] };


function CourseCell({ vendor, done }: { vendor: Vendor; done: number }) {
  const { courses: COURSES } = useCourseCatalog();
  const TOTALS = { fortigate: allLessons(COURSES.fortigate).length, paloalto: allLessons(COURSES.paloalto).length };
  return (
    <div data-vendor={vendor} className="min-w-[140px]">
      <div className="flex justify-between text-xs text-muted mb-1"><span className="tabular-nums">{done}/{TOTALS[vendor]}</span><span className="tabular-nums">{Math.round((done / TOTALS[vendor]) * 100)}%</span></div>
      <ProgressBar value={(done / TOTALS[vendor]) * 100} label={`${COURSES[vendor].product} progress`} />
    </div>
  );
}

export function ClassroomPage() {
  const { courses: COURSES } = useCourseCatalog();
  const { user, loading } = useAccount();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (user?.role === "instructor") accountRequest<{ students: Student[] }>("classroom")
      .then(data => { if (!cancelled) setStudents(data.students); }).catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [user]);
  const shown = students?.filter(student => `${student.name} ${student.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <SiteLayout wide>
      <PageHeader eyebrow="Instructor" title="Classroom" description="Lesson completion for every registered student. Completion is reported by each student's browser: it shows practice progress, not a certified exam score." />
      {loading ? <p className="text-muted" role="status">Checking instructor access…</p>
        : user?.role !== "instructor" ? <Callout tone="info" title="Instructor access required">Sign in with an instructor account to see the classroom. <Link to="/account" className="link">Sign in</Link></Callout>
        : <>
          {error && <Callout tone="danger" className="mb-4">{error}</Callout>}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-line">
              <label className="w-full max-w-xs"><span className="sr-only">Find a student</span>
                <input className="input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or email" />
              </label>
              {shown && <span className="text-sm text-muted">{shown.length} student{shown.length === 1 ? "" : "s"}</span>}
            </div>
            {!students && !error && <p className="px-5 py-6 text-muted" role="status">Loading roster…</p>}
            {students?.length === 0 && <p className="px-5 py-6 text-muted">No students have registered yet. Share the course URL with your class to get started.</p>}
            {students && students.length > 0 && (
              <div className="overflow-x-auto">
                <table className="classroom-table w-full text-sm text-left">
                  <thead className="bg-sunken text-xs text-muted">
                    <tr><th scope="col" className="px-5 py-2.5 font-medium">Student</th><th scope="col" className="px-5 py-2.5 font-medium">{COURSES.fortigate.product}</th><th scope="col" className="px-5 py-2.5 font-medium">{COURSES.paloalto.product}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shown?.map(student => (
                      <tr key={student.id}>
                        <th scope="row" className="px-5 py-3 font-normal"><div className="font-medium text-ink">{student.name}</div><div className="text-xs text-muted">{student.email}</div></th>
                        <td className="px-5 py-3"><CourseCell vendor="fortigate" done={student.fortigate.length} /></td>
                        <td className="px-5 py-3"><CourseCell vendor="paloalto" done={student.paloalto.length} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {shown?.length === 0 && <p className="px-5 py-6 text-muted">No students match your search.</p>}
              </div>
            )}
          </div>
        </>}
    </SiteLayout>
  );
}
