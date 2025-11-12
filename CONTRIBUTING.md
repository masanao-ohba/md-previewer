# Contributing to Markdown Preview Enhanced

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** (v18 or later)
- **npm** (v9 or later)
- **VS Code** (v1.85.0 or later)
- **Git**

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd md-preview
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Debug in VS Code**
   - Press `F5` to open Extension Development Host
   - Open a Markdown file
   - Use "Markdown Preview Enhanced: Open Preview" command

## Project Structure

```
md-preview/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── markdown/               # Markdown processing
│   │   └── MarkdownProcessor.ts
│   ├── renderers/              # Diagram renderers
│   │   ├── MermaidRenderer.ts
│   │   └── PlantUMLRenderer.ts
│   ├── preview/                # Preview panel
│   │   └── PreviewPanel.ts
│   ├── themes/                 # Theme management
│   │   └── ThemeManager.ts
│   ├── utils/                  # Utilities
│   │   └── JavaDetector.ts
│   └── __tests__/              # Test setup
├── resources/                  # Static resources
│   └── themes/                 # CSS theme files
├── test-samples/               # Sample Markdown files
└── out/                        # Compiled JavaScript
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow TypeScript best practices
   - Add/update tests
   - Update documentation

3. **Test your changes**
   ```bash
   npm test                # Run unit tests
   npm run lint            # Check code style
   npm run compile         # Verify compilation
   ```

4. **Test in VS Code**
   - Press F5 to launch Extension Development Host
   - Manually test your changes
   - Verify no regressions

### Code Quality Standards

#### TypeScript

- Use strict typing (no `any` without justification)
- Add JSDoc comments for public methods
- Follow naming conventions:
  - Classes: `PascalCase`
  - Functions/methods: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Private members: prefix with `_` or mark as `private`

#### Testing

- **Write tests for new features**
- **Maintain >70% test coverage**
- **Test structure**:
  ```typescript
  /**
   * Without this test, we would not be guaranteed that:
   * - Specific behavior is verified
   * - Edge case is handled
   */
  test('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = process(input);

    // Assert
    expect(result).toContain('expected');
  });
  ```

#### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- No console.log in production code (use proper logging if needed)
- Remove unused imports
- Keep functions small and focused (< 50 lines when possible)

### Commit Guidelines

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding/updating tests
- `refactor`: Code refactoring
- `style`: Code style changes
- `perf`: Performance improvements
- `chore`: Build/tooling changes

**Examples:**
```
feat(renderer): add support for custom PlantUML server

Allows users to configure a custom PlantUML server URL
for organizations with private installations.

Closes #42
```

```
fix(zoom): prevent zoom below 10%

Added minimum zoom validation to prevent UI issues
when zoom level is too low.
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- MarkdownProcessor.test.ts

# Watch mode for development
npm test -- --watch
```

### Writing Tests

Place tests in `__tests__` directories next to the code:

```
src/
├── markdown/
│   ├── MarkdownProcessor.ts
│   └── __tests__/
│       └── MarkdownProcessor.test.ts
```

Mock VS Code APIs when needed (globally mocked in `src/__tests__/setup.ts`).

## Building & Packaging

### Build for Development

```bash
npm run compile     # Compile TypeScript
npm run watch       # Watch mode for development
```

### Create VSIX Package

```bash
npm run package     # Creates .vsix file (includes automatic validation)
```

### Validate VSIX Package

```bash
npm run validate-vsix   # Verify runtime dependencies are included
```

### Install Locally

```bash
code --install-extension markdown-preview-enhanced-0.1.0.vsix
```

## ⚠️ CRITICAL: Packaging Configuration

### .vscodeignore and Runtime Dependencies

**Common Mistake**: Excluding `node_modules/**` when your extension has runtime dependencies.

#### Problem

If `.vscodeignore` contains `node_modules/**`, ALL node_modules will be excluded from the VSIX package, including runtime dependencies. This causes:

- **Complete extension failure**: Commands not found (e.g., `'markdownPreviewEnhanced.openPreview' not found`)
- **100% feature loss**: Extension cannot function at all
- **Silent failure**: No error during packaging, only after installation

#### How to Check

1. Open `package.json`
2. Look at the `"dependencies"` section (NOT `"devDependencies"`)
3. If dependencies exist, they MUST be included in the VSIX package

#### This Project's Runtime Dependencies

**CRITICAL**: These packages are required at runtime and MUST be in the VSIX:

- `markdown-it`: Required for Markdown parsing
- `mermaid`: Required for diagram rendering

**SAFE TO EXCLUDE**: These are development-only and can be excluded:

- `@types/*`: TypeScript type definitions (only needed during compilation)
- `typescript`: TypeScript compiler (only needed during development)
- `jest`, `eslint`, `prettier`: Development tools
- `vsce`: Packaging tool

#### Verification

```bash
# Package includes automatic validation
npm run package

# Manual check:
unzip -l *.vsix | grep "node_modules/markdown-it"
unzip -l *.vsix | grep "node_modules/mermaid"
# Both should show files (NOT empty output)
```

#### If Validation Fails

1. **Check `.vscodeignore`**:
   - Ensure runtime dependencies are NOT excluded
   - Use specific exclusions for devDependencies only
   - DO NOT use `node_modules/**` (excludes everything)

2. **Rebuild**:
   ```bash
   npm run package
   # Validation runs automatically
   ```

3. **Verify contents**:
   ```bash
   npm run validate-vsix
   # Should show: ✅ Found: markdown-it
   # Should show: ✅ Found: mermaid
   ```

4. **Test installation**:
   ```bash
   code --install-extension markdown-preview-enhanced-*.vsix
   # Open Markdown file
   # Verify "Open Preview" command works
   ```

#### .vscodeignore Best Practices

```gitignore
# ✅ CORRECT: Exclude devDependencies specifically
node_modules/@types/**
node_modules/typescript/**
node_modules/jest/**

# ❌ WRONG: Excludes ALL node_modules (including runtime deps)
node_modules/**

# ✅ CORRECT: Runtime dependencies automatically included
# (by NOT excluding them)
```

#### Debugging Package Contents

```bash
# List all files in VSIX
unzip -l markdown-preview-enhanced-*.vsix

# Check specific dependency
unzip -l markdown-preview-enhanced-*.vsix | grep "node_modules/markdown-it"

# Extract and inspect
unzip -q markdown-preview-enhanced-*.vsix -d vsix-contents
cd vsix-contents/extension/node_modules
ls -la
```

## Documentation

### Code Documentation

- Add JSDoc comments to public APIs
- Include parameter descriptions
- Document return values
- Explain complex logic with inline comments

### User Documentation

- Update README.md for user-facing features
- Add examples to test-samples/
- Update CHANGELOG.md for all changes
- Create TROUBLESHOOTING.md entries for common issues

## Architecture Guidelines

### SOLID Principles

- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Extend behavior without modifying existing code
- **Liskov Substitution**: Subtypes must be substitutable for base types
- **Interface Segregation**: Keep interfaces small and focused
- **Dependency Inversion**: Depend on abstractions, not concretions

### Design Patterns Used

- **Renderer Pattern**: MermaidRenderer, PlantUMLRenderer
- **Singleton Pattern**: Extension context, preview panels
- **Factory Pattern**: Theme creation, diagram rendering
- **Observer Pattern**: Document change watching

## Error Handling

### Best Practices

1. **Never swallow errors silently**
   ```typescript
   // ❌ Bad
   try {
     doSomething();
   } catch (e) {
     // Silent fail
   }

   // ✅ Good
   try {
     doSomething();
   } catch (error) {
     console.error('Failed to do something:', error);
     return renderError(error.message);
   }
   ```

2. **Provide user-friendly error messages**
   ```typescript
   // ❌ Bad
   throw new Error('ERR_JAVA_404');

   // ✅ Good
   return renderError(
     'Java is not installed. PlantUML local mode requires Java.',
     getInstallationInstructions()
   );
   ```

3. **Escape user input in error messages**
   ```typescript
   return `<div>${escapeHtml(errorMessage)}</div>`;
   ```

## Performance Considerations

- **Use debouncing** for frequent updates (e.g., document changes)
- **Avoid blocking operations** in the main thread
- **Cache expensive computations** when appropriate
- **Profile before optimizing** (measure, don't guess)
- **Test with large files** (1000+ lines) during development

## Security Guidelines

### Input Validation

- Validate all user input
- Escape HTML to prevent XSS
- Use parameterized queries (when applicable)
- Don't execute arbitrary code

### Code Review Checklist

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No arbitrary code execution
- [ ] Sensitive data is not logged
- [ ] User input is validated
- [ ] Error messages don't leak sensitive info

## Getting Help

- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check README.md and code comments

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing!** 🎉
