import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accountRequest, useAccount, type AccountUser } from "../hooks/useAccount";

type Student = AccountUser & { fortigate: string[]; paloalto: string[] };
export function ClassroomPage() {
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
  return <div className="platform-page"><main className="classroom-panel">
    <Link to="/" className="platform-back">Back to lab</Link><h1>Classroom progress</h1>
    <p className="platform-subtitle">Review your students’ practice across FortiGate and Palo Alto.</p>
    <p className="platform-hint">Completion is reported by the student’s browser. These counts describe practice progress, not certified exam scores.</p>
    {loading ? <p role="status">Checking instructor access…</p> : user?.role !== "instructor" ? <p>Instructor access is required. <Link to="/account">Sign in</Link></p> : <>
      {error && <p className="platform-error" role="alert">{error}</p>}
      <label className="classroom-search">Find a student<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or email" /></label>
      {!students && !error && <p role="status">Loading roster…</p>}
      {students?.length === 0 && <p>No students have registered yet. Share your lab URL to get started.</p>}
      {students && students.length > 0 && <div className="platform-table-scroll"><table className="classroom-table"><caption>{shown?.length} students</caption><thead><tr><th scope="col">Student</th><th scope="col">Email</th><th scope="col">FortiGate completed</th><th scope="col">Palo Alto completed</th></tr></thead><tbody>{shown?.map(student => <tr key={student.id}><th scope="row">{student.name}</th><td>{student.email}</td><td>{student.fortigate.length}</td><td>{student.paloalto.length}</td></tr>)}</tbody></table>{shown?.length === 0 && <p>No students match your search.</p>}</div>}
    </>}
  </main></div>;
}
