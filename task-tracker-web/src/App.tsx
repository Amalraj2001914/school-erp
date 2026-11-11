import { useEffect, useState, type FormEvent } from "react";
import {
  Calendar,
  Check,
  ClipboardList,
  FileText,
  Inbox,
  ListChecks,
  LogOut,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from "./api";
import Report from "./Report";

type User = { id: number; name: string; email: string; role: string };
type Student = { id: number; name: string; email: string };
type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
};
type Filter = "all" | "pending" | "done";
type RecipientMode = "selected" | "all";
type View = "tasks" | "report";

// UI hints only. The server enforces the real permissions.
const canWrite = (role: string) => role === "admin" || role === "teacher";
const canDelete = (role: string) => role === "admin";

const subtitles: Record<string, string> = {
  student: "Tasks your teachers have assigned to you.",
  teacher: "Create tasks and assign them to students.",
  admin: "Manage every task across the platform.",
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const today = () => new Date().toLocaleDateString("en-CA");

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("selected");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("tasks");

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }

  // Restore the session on page load
  useEffect(() => {
    if (!getAccessToken()) {
      setChecking(false);
      return;
    }
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setChecking(false));
  }, []);

  async function loadTasks() {
    try {
      setTasks(await api<Task[]>("/tasks"));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadTasks();
    if (canWrite(user.role)) {
      api<Student[]>("/users/students")
        .then(setStudents)
        .catch((err) => setError((err as Error).message));
    }
  }, [user]);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "register") {
        await api("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      }
      const data = await api<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => {});
    }
    clearTokens();
    setUser(null);
    setTasks([]);
    setStudents([]);
    setSelectedIds([]);
    setError("");
    setView("tasks");
  }

  function toggleStudent(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function addTask(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (recipientMode === "selected" && selectedIds.length === 0) {
      setError("Select at least one student, or choose All students.");
      return;
    }
    try {
      const created = await api<Task[]>("/tasks/bulk", {
        method: "POST",
        body: JSON.stringify({
          title,
          priority,
          dueDate: dueDate || undefined,
          ...(recipientMode === "all" ? { allStudents: true } : { studentIds: selectedIds }),
        }),
      });
      setTitle("");
      setDueDate("");
      setSelectedIds([]);
      flash(`Task assigned to ${created.length} student${created.length === 1 ? "" : "s"}`);
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggleStatus(t: Task) {
    setError("");
    try {
      await api(`/tasks/${t.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: t.status === "done" ? "pending" : "done" }),
      });
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeTask(id: number) {
    setError("");
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      flash("Task deleted");
      await loadTasks();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (checking) return <div className="center-screen">Loading...</div>;

  if (!user) {
    return (
      <div className="auth">
        <aside className="auth-brand">
          <div className="logo">
            <ClipboardList size={24} /> TaskFlow
          </div>
          <h2>Assign work. Track progress.</h2>
          <p>A simple way for teachers to hand out tasks and for students to stay on top of them.</p>
          <ul>
            <li>
              <ListChecks size={20} /> Assign tasks to one, several or all students
            </li>
            <li>
              <Users size={20} /> Students see only their own tasks
            </li>
            <li>
              <ShieldCheck size={20} /> Role-based access for admins, teachers and students
            </li>
          </ul>
        </aside>

        <main className="auth-form">
          <div className="auth-card">
            <div>
              <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
              <p className="muted">
                {mode === "login" ? "Log in to see your tasks." : "Register to get started."}
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={submitAuth}>
              {mode === "register" && (
                <label className="field">
                  <span>Full name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </label>
              )}
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
              <button className="btn btn-primary" type="submit">
                {mode === "login" ? "Log in" : "Create account"}
              </button>
            </form>

            <p className="auth-switch">
              {mode === "login" ? "New here? " : "Already registered? "}
              <button
                className="btn-link"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
              >
                {mode === "login" ? "Create an account" : "Log in"}
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  const writer = canWrite(user.role);
  const isAdmin = user.role === "admin";
  const q = search.toLowerCase();
  const visible = tasks.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (t.title + " " + (t.assigneeName ?? "")).toLowerCase().includes(q)
  );
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <>
      <header className="topbar">
        <div className="logo">
          <ClipboardList size={22} /> TaskFlow
        </div>

        {isAdmin && (
          <nav className="nav">
            <button className={`nav-link ${view === "tasks" ? "active" : ""}`} onClick={() => setView("tasks")}>
              <ListChecks size={16} /> Tasks
            </button>
            <button className={`nav-link ${view === "report" ? "active" : ""}`} onClick={() => setView("report")}>
              <FileText size={16} /> Reports
            </button>
          </nav>
        )}

        <div className="user">
          <div className="user-meta">
            <strong>{user.name}</strong>
            <span className={`role role-${user.role}`}>{user.role}</span>
          </div>
          <div className="avatar">{initials(user.name)}</div>
          <button className="btn btn-ghost" onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <main className="container">
        {isAdmin && view === "report" ? (
          <Report adminName={user.name} />
        ) : (
          <>
            <div className="page-head">
              <h1>{user.role === "student" ? "My tasks" : "Tasks"}</h1>
              <p className="muted">{subtitles[user.role]}</p>
            </div>

            <div className="stats">
              <div className="stat">
                <span>Total tasks</span>
                <strong>{tasks.length}</strong>
              </div>
              <div className="stat">
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
              <div className="stat">
                <span>Completed</span>
                <strong>{doneCount}</strong>
              </div>
            </div>

            {writer && (
              <section className="panel">
                <h2>New task</h2>
                <form className="assign-form" onSubmit={addTask}>
                  <label className="field">
                    <span>Title</span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Read chapter 5"
                    />
                  </label>
                  <label className="field">
                    <span>Priority</span>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Due date</span>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </label>

                  <div className="full recipients-head">
                    <span className="label-text">Assign to</span>
                    <div className="mode">
                      <button
                        type="button"
                        className={recipientMode === "selected" ? "active" : ""}
                        onClick={() => setRecipientMode("selected")}
                      >
                        Selected students
                      </button>
                      <button
                        type="button"
                        className={recipientMode === "all" ? "active" : ""}
                        onClick={() => setRecipientMode("all")}
                      >
                        All students ({students.length})
                      </button>
                    </div>
                  </div>

                  <div className="full">
                    {recipientMode === "all" ? (
                      <div className="all-note">
                        This task will be assigned to all {students.length} students. Each student gets their own copy
                        to complete.
                      </div>
                    ) : students.length === 0 ? (
                      <span className="muted">No students registered yet.</span>
                    ) : (
                      <>
                        <div className="chips">
                          {students.map((s) => (
                            <label key={s.id} className={`chip ${selectedIds.includes(s.id) ? "selected" : ""}`}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(s.id)}
                                onChange={() => toggleStudent(s.id)}
                              />
                              <span className="avatar sm">{initials(s.name)}</span>
                              {s.name}
                            </label>
                          ))}
                        </div>
                        <div className="chip-tools">
                          <span className="muted">{selectedIds.length} selected</span>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => setSelectedIds(students.map((s) => s.id))}
                          >
                            Select all
                          </button>
                          <button type="button" className="btn-link" onClick={() => setSelectedIds([])}>
                            Clear
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="full">
                    <button className="btn btn-primary" type="submit">
                      <Plus size={16} /> Assign task
                    </button>
                  </div>
                </form>
              </section>
            )}

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
                <button onClick={() => setError("")} aria-label="Dismiss">
                  &times;
                </button>
              </div>
            )}
            {notice && <div className="alert alert-ok">{notice}</div>}

            <section className="panel table-panel">
              <div className="toolbar">
                <div className="tabs">
                  {(["all", "pending", "done"] as Filter[]).map((f) => (
                    <button key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                      {f === "all" ? "All" : f === "pending" ? "Pending" : "Done"}
                    </button>
                  ))}
                </div>
                <div className="search">
                  <Search size={16} />
                  <input
                    placeholder="Search tasks or students"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrap">
                {visible.length === 0 ? (
                  <div className="empty">
                    <Inbox size={36} />
                    <strong>No tasks to show</strong>
                    <span>
                      {user.role === "student"
                        ? "When a teacher assigns you a task, it will appear here."
                        : "Create a task above to get started."}
                    </span>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Assigned to</th>
                        <th>Priority</th>
                        <th>Status</th>
                        {writer && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((t) => {
                        const overdue = !!t.dueDate && t.dueDate < today() && t.status !== "done";
                        return (
                          <tr key={t.id}>
                            <td>
                              <div className={`task-title ${t.status === "done" ? "is-done" : ""}`}>{t.title}</div>
                              {t.dueDate && (
                                <div className={`due ${overdue ? "overdue" : ""}`}>
                                  <Calendar size={13} /> {formatDate(t.dueDate)}
                                  {overdue && " · Overdue"}
                                </div>
                              )}
                            </td>
                            <td>
                              {t.assigneeName ? (
                                <div className="person">
                                  <span className="avatar sm">{initials(t.assigneeName)}</span>
                                  {t.assigneeName}
                                </div>
                              ) : (
                                <span className="muted">Unassigned</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge priority-${t.priority}`}>{t.priority}</span>
                            </td>
                            <td>
                              <span className={`badge status-${t.status}`}>{t.status}</span>
                            </td>
                            {writer && (
                              <td>
                                <div className="actions">
                                  <button
                                    className="btn btn-icon"
                                    title={t.status === "done" ? "Reopen" : "Mark as done"}
                                    onClick={() => toggleStatus(t)}
                                  >
                                    {t.status === "done" ? <RotateCcw size={16} /> : <Check size={16} />}
                                  </button>
                                  {canDelete(user.role) && (
                                    <button
                                      className="btn btn-icon danger"
                                      title="Delete"
                                      onClick={() => removeTask(t.id)}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}