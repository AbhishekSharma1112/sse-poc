import { useEffect, useState } from "react";

const servers = ["Server 1", "Server 2", "Server 3"];

function App() {
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  // Login handler
  const login = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Login failed");
    }
  };

  // Subscribe to updates via SSE
  useEffect(() => {
    if (!token) return;

    // Add the token as a query parameter
    const eventSource = new EventSource(
      `http://localhost:4000/api/updates?token=${token}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress((prev) => ({ ...prev, [data.name]: data.percentage }));
    };

    eventSource.onerror = () => {
      console.error("Error receiving updates.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [token]);

  // Start update handler
  const startUpdate = async (serverName: string) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/update/${serverName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const data = await response.json();
        alert(data.message);
      }
    } catch (err) {
      console.error("Error starting update:", err);
    }
  };

  // Show login form if not logged in
  if (!token) {
    return (
      <div>
        <h1>Login</h1>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={login}>Login</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1>Server Update Table</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Update</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server) => (
            <tr key={server}>
              <td>{server}</td>
              <td>
                <button
                  onClick={() => startUpdate(server)}
                  disabled={progress[server] >= 100 || progress[server] > 0}
                >
                  Update
                </button>
              </td>
              <td>{progress[server] ?? 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
