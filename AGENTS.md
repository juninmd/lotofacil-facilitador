# AGENTS.md - AI Coding Agent Guidelines

These guidelines outline the principles and expectations for all AI coding agent development within this repository. Adherence to these principles is mandatory to ensure code quality, maintainability, and stability.

## 1. DRY (Don't Repeat Yourself)

- All code should be encapsulated within individual files and functions.
- Duplicate code should be refactored into reusable components or functions.
- Avoid creating redundant logic or data structures.
- Prioritize creating new functionality instead of modifying existing code.

## 2. KISS (Keep It Simple, Stupid)

- Code should be as concise and easy to understand as possible.
- Simplify complex logic whenever feasible.
- Avoid unnecessary abstraction.
- Focus on the essential requirements of a feature.

## 3. SOLID Principles

- **Single Responsibility Principle:** Each class or function should have one, and only one, well-defined responsibility.
- **Open/Closed Principle:**  The system should be extensible through public interfaces, without modifying the internal code.
- **Liskov Substitution Principle:**  Subclasses should be substitutable for their base classes without altering the correctness of the program.
- **Interface Segregation Principle:** Each client should be required to participate in only one interface.
- **Dependency Inversion Principle:** Interfaces should be replaced by their concrete implementations.

## 4. YAGNI (You Aren't Gonna Need It)

- Only implement functionality that is explicitly required at a given point in time.
- Avoid implementing features or dependencies that are not currently needed.
- Refactor code to remove unnecessary complexity and unused components.

## 5. Code Structure & File Layout

- Each file should have a descriptive name that clearly identifies its purpose.
- Files should follow a logical organizational structure.
- Comments should explain the *why* behind the code, not just the *what*.
- Use consistent indentation and formatting throughout the codebase.
- Use meaningful variable and function names.
- Focus on well-defined data structures.

## 6. File Length & Code Coverage

- Each file must have a maximum of 180 lines of code.
- Achieve at least 80% test coverage for all functions and classes.
- Utilize unit tests to verify expected behavior.

## 7. Testing & Verification

- All code must be thoroughly tested with unit tests.
- Unit tests should cover all critical functionality.
- Test cases should be designed to cover edge cases and potential error conditions.
- Test cases should be written before code is implemented.
-  Use mock objects to isolate the AI agent's logic during testing.

## 8.  Development Process

- Commit frequently with small, focused changes.
- Conduct code reviews to ensure adherence to guidelines.
- Utilize version control (Git) for collaborative development.
- Embrace continuous integration and continuous deployment (CI/CD).

## 9.  Specific Requirements (Adapt as needed based on project)**

-  [Include specific algorithm or data structure requirements here]
-  [Include any specific constraint requirements (e.g., maximum performance, memory usage)]

## 10.  Documentation

-  Provide clear and concise documentation for all functions and classes.
-  Document any assumptions or dependencies.
-  Include a README file explaining the project's purpose, setup instructions, and usage.


These guidelines are intended to serve as a foundation for the AGENTS.md project.  Continuous refinement and adaptation are encouraged based on feedback and evolving project requirements.  All development efforts must prioritize quality, maintainability, and the successful implementation of the AI agent's core functionality.