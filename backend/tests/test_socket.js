const { io } = require("socket.io-client");

const socket = io("http://localhost:8081", {
  withCredentials: true
});

socket.on("connect", () => {
  console.log("Connected! ID:", socket.id);
  
  socket.emit("register_dashboard", { dept_id: "cse" });
  socket.emit("init_copilot", { dept_id: "cse" });
  console.log("Emitted init_copilot");
});

socket.on("copilot_stream", (data) => {
  process.stdout.write(data.text);
});

socket.on("copilot_stream_end", () => {
  console.log("\n--- END OF STREAM ---");
  
  console.log("\nSending prompt: 'Create a session for Sem 5 section A'");
  socket.emit("copilot_message", { message: "Create a session for Sem 5 section A" });
});

socket.on("copilot_ui_command", (data) => {
  console.log("\n>>> RECEIVED UI COMMAND:", JSON.stringify(data, null, 2));
  setTimeout(() => process.exit(0), 1000);
});

socket.on("connect_error", (err) => {
  console.error("Connection Error:", err.message);
  process.exit(1);
});
