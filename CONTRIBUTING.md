# Contributing to SKYCOIN4444-Production-Optimized

We welcome contributions to this project. To ensure a smooth and collaborative development process, please follow these guidelines:

## How to Contribute

1.  **Fork the Repository:** Start by forking the `skycoin4444-production-optimized` repository to your GitHub account.
2.  **Clone Your Fork:** Clone your forked repository to your local machine:
    ```bash
    git clone https://github.com/YOUR_USERNAME/skycoin4444-production-optimized.git
    cd skycoin4444-production-optimized
    ```
3.  **Create a New Branch:** Create a new branch for your feature or bug fix. Use a descriptive name (e.g., `feature/add-auth-module`, `bugfix/fix-login-issue`).
    ```bash
    git checkout -b feature/your-feature-name
    ```
4.  **Make Your Changes:** Implement your changes, ensuring they adhere to the project's coding standards and best practices.
5.  **Test Your Changes:** Run existing tests and add new ones if necessary to cover your changes. Ensure all tests pass.
    ```bash
    pnpm test
    ```
6.  **Commit Your Changes:** Write clear and concise commit messages. Follow the Conventional Commits specification (e.g., `feat: add new user authentication module`, `fix: resolve database connection error`).
    ```bash
    git commit -m "feat: your commit message"
    ```
7.  **Push to Your Fork:** Push your changes to your forked repository.
    ```bash
    git push origin feature/your-feature-name
    ```
8.  **Create a Pull Request:** Open a pull request from your branch to the `main` branch of the original `skycoin4444-production-optimized` repository. Provide a detailed description of your changes, including why they are necessary and how they were tested.

## Pull Request Guidelines

*   **Descriptive Title:** Your pull request title should clearly summarize the changes.
*   **Detailed Description:** Explain the purpose of your changes, any relevant context, and how you tested them.
*   **Code Quality:** Ensure your code is clean, well-commented, and follows the project's coding style.
*   **Tests:** Include unit, integration, and/or E2E tests for new features or bug fixes.
*   **Documentation:** Update any relevant documentation (e.g., README.md, API documentation) to reflect your changes.

## Coding Standards

*   **TypeScript First:** All new code should be written in TypeScript.
*   **Consistent Formatting:** Use Prettier to format your code. A pre-commit hook might be configured to enforce this.
*   **Modular Design:** Aim for modular, reusable components and functions.
*   **Performance:** Consider performance implications of your changes.
*   **Security:** Follow secure coding practices to prevent vulnerabilities.

## Branching Strategy

We use a Gitflow-like branching strategy:

*   `main`: Production-ready code.
*   `staging`: Release candidate for testing and validation.
*   `develop`: Integration branch for new features.
*   `feature/*`: Feature development branches.
*   `bugfix/*`: Bug fix branches.
*   `hotfix/*`: Critical production bug fixes.

## Code of Conduct

We expect all contributors to adhere to our Code of Conduct. Please be respectful and considerate in all interactions.

Thank you for your contributions!
