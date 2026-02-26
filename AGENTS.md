# AGENTS.md

## Important Instructions

### Architecture & Design
- **Component-Driven Architecture:** Build highly reusable, modular UI components in the frontend. Treat components as isolated building blocks.

### Performance & Security
- **Security-First Mindset:** Provide secure authentication (e.g., HTTP-only cookies, robust JWT validation). Validate and sanitize all inputs on both the frontend and backend.
- **Graceful Error Handling:** Handle asynchronous errors elegantly. Provide meaningful, user-friendly error messages on the frontend and log detailed error traces securely on the backend.

### Architecture & Design
- **Do Not Write Monolithic Components:** Avoid writing React components that span hundreds of lines with mixed concerns. Break them down into smaller sub-components.
- **Do Not Mix UI and Business Logic:** Keep API calls, complex data transformations, and heavy business logic out of presentational UI components. Extract them into custom hooks or dedicated service files.
- **Do Not Apply Unnecessary Changes:** Keep code modifications strictly limited to what is explicitly requested. Change *only* the specific lines or files strictly required to implement the requested feature or fix. Do not apply refactors or modifications to files that are unrelated to the current task.

### Performance & Security
- **Do Not Hardcode Secrets:** Never write plain-text passwords, API keys, or database connection strings in the code. Always use environment variables (referencing `.env.example`).
- **Do Not Skip Error Handling:** Never write empty `try/catch` or `except` blocks. Silent failures lead to impossible-to-debug states.
- **Avoid Blocking the Main Thread:** In Node.js or asynchronous Python workloads, do not use synchronous read/write methods (`readSync`) if asynchronous methods are available. Avoid heavy computations that block the event loop.

---
