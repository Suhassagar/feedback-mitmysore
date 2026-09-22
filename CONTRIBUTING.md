# Contributing to MIT Mysore Feedback System

Thank you for your interest in contributing to the **MIT Mysore Student Feedback Management System**! We welcome improvements, bug reports, and suggestions.

---

## 📌 Code of Conduct
Please ensure all communications and contributions remain respectful, collaborative, and professional.

---

## 🌿 Branching Strategy

The repository follows a clean branch workflow:
- **`main`**: Development branch. All active development, features, and bugfixes are merged here first.
- **`prod`**: Production branch. Code here is deployed directly to [mitmysore.vercel.app](https://mitmysore.vercel.app) and Render.
- **`feature/<name>`** or **`fix/<issue>`**: Dedicated branches for major enhancements or bug fixes.

---

## 🛠️ Contribution Workflow

1. **Fork or Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Install Dependencies & Test Locally**:
   - Backend:
     ```bash
     cd backend && npm install && npm run dev
     ```
   - Frontend:
     ```bash
     cd ../frontend && npm install && npm run dev
     ```
3. **Verify Build**:
   Ensure that the frontend builds with zero errors:
   ```bash
   cd frontend && npm run build
   ```
4. **Commit Your Changes**:
   Write clear, meaningful commit messages:
   ```bash
   git commit -m "feat(analytics): add export to excel for department radar score"
   ```
5. **Open a Pull Request**:
   Submit your pull request against the `main` branch with a clear description of what changed and any testing steps.

---

## 🔒 Security Reminders
- **Never commit `.env` files, API keys, or database credentials.**
- Ensure input sanitization and parameterized SQL queries for any new endpoints.
