
"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

interface Task {
  _id: string;
  title: string;
  completed: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Filter = "all" | "active" | "completed";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(Boolean(API_URL));
  const [error, setError] = useState(
    API_URL ? "" : "API URL is not configured.",
  );

  useEffect(() => {
    if (!API_URL) {
      return;
    }

    const loadTasks = async () => {
      try {
        const response = await fetch(`${API_URL}/api/tasks`);
        if (!response.ok) throw new Error("Could not load tasks");
        setTasks(await response.json());
      } catch {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    loadTasks();

    const socket = io(API_URL);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("taskCreated", (task: Task) => {
      setTasks((prev) =>
        [task, ...prev.filter((item) => item._id !== task._id)]
      );
    });

    socket.on("taskUpdated", (updated: Task) => {
      setTasks((prev) =>
        prev.map((task) => task._id === updated._id ? updated : task)
      );
    });

    socket.on("taskDeleted", (deleted: Task) => {
      if (deleted) {
        setTasks((prev) =>
          prev.filter((task) => task._id !== deleted._id)
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addTask = async () => {
    if (!title.trim() || !API_URL) return;

    try {
      setError("");
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) throw new Error("Failed to add task");

      const newTask: Task = await response.json();
      setTasks((prev) =>
        [newTask, ...prev.filter((task) => task._id !== newTask._id)]
      );
      setTitle("");
    } catch {
      setError("Could not add task. Please try again.");
    }
  };

  const toggleTask = async (task: Task) => {
    if (!API_URL) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: !task.completed,
        }),
      });

      if (!response.ok) throw new Error("Update failed");

      const updated: Task = await response.json();
      setTasks((prev) =>
        prev.map((item) => item._id === updated._id ? updated : item)
      );
    } catch {
      setError("Could not update task.");
    }
  };

  const deleteTask = async (id: string) => {
    if (!API_URL) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      setTasks((prev) => prev.filter((task) => task._id !== id));
    } catch {
      setError("Could not delete task.");
    }
  };

  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((task) => !task.completed);
    if (filter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
  }, [tasks, filter]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✓</div>
          <span>TaskFlow</span>
        </div>

        <div className="side-label">WORKSPACE</div>

        <button className="nav-item active">
          <span>▦</span> Overview
        </button>
        <button className="nav-item" onClick={() => setFilter("active")}>
          <span>◷</span> My Tasks
        </button>
        <button className="nav-item" onClick={() => setFilter("completed")}>
          <span>✓</span> Completed
        </button>

        <div className="sidebar-bottom">
          <div className="profile-avatar">T</div>
          <div>
            <strong>My Workspace</strong>
            <small>Personal account</small>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>Overview</strong>
          </div>
          <div className="connection">
            <span className={`connection-dot ${connected ? "online" : ""}`} />
            {connected ? "Live connection" : "Connecting..."}
          </div>
        </header>

        <div className="dashboard">
          <div className="welcome">
            <div>
              <span className="eyebrow">YOUR PRODUCTIVITY SPACE</span>
              <h1>Good things start with a plan.</h1>
              <p>Organize your work, stay focused and get things done.</p>
            </div>
            <div className="welcome-icon">✦</div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                <span>Total Tasks</span>
                <span className="stat-icon blue">▤</span>
              </div>
              <h2>{tasks.length}</h2>
              <small>All your tasks</small>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Completed</span>
                <span className="stat-icon green">✓</span>
              </div>
              <h2>{completed}</h2>
              <small>Tasks finished</small>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Pending</span>
                <span className="stat-icon orange">◷</span>
              </div>
              <h2>{pending}</h2>
              <small>Still in progress</small>
            </div>
          </div>

          <section className="tasks-section">
            <div className="section-heading">
              <div>
                <h2>My Tasks</h2>
                <p>Your personal task list, all in one place.</p>
              </div>
              <span className="task-count">{tasks.length} tasks</span>
            </div>

            <div className="add-task-box">
              <span className="plus-icon">＋</span>
              <input
                type="text"
                placeholder="What needs to be done today?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
              />
              <button className="add-button" onClick={addTask}>
                Add task <span>＋</span>
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="filter-row">
              {(["all", "active", "completed"] as Filter[]).map((item) => (
                <button
                  key={item}
                  className={`filter-button ${filter === item ? "selected" : ""}`}
                  onClick={() => setFilter(item)}
                >
                  {item === "all" ? "All tasks" : item === "active" ? "In progress" : "Completed"}
                </button>
              ))}
            </div>

            <div className="task-list">
              {loading ? (
                <div className="empty-state">Loading your tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✦</div>
                  <strong>No tasks here yet</strong>
                  <p>Add a task above and make today productive!</p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div className="task-card" key={task._id}>
                    <div className="task-details">
                      <button
                        className={`check-button ${task.completed ? "checked" : ""}`}
                        onClick={() => toggleTask(task)}
                        aria-label="Toggle task completion"
                      >
                        {task.completed ? "✓" : ""}
                      </button>
                      <span className={task.completed ? "task-completed" : ""}>
                        {task.title}
                      </span>
                    </div>

                    <div className="task-actions">
                      <span className={`task-status ${task.completed ? "done" : "pending"}`}>
                        {task.completed ? "Completed" : "In progress"}
                      </span>
                      <button
                        className="delete-button"
                        onClick={() => deleteTask(task._id)}
                        aria-label="Delete task"
                        title="Delete task"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="list-footer">
              <span>{completed} of {tasks.length} tasks completed</span>
              <span>Powered by MongoDB + Socket.IO</span>
            </div>
          </section>

          <footer className="footer">
            Built with Next.js · Node.js · MongoDB
          </footer>
        </div>
      </section>
    </main>
  );
}
