# Change Log

All notable changes to the "Markdown Preview Enhanced" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.9] - 2025-11-15

### Changed
- PlanUML local mode: Improve performance of Java process

## [0.1.8] - 2025-11-12

### Changed
- Updated Icon

## [0.1.7] - 2025-11-12

### Changed
- Updated README documentation

## [0.1.5, 0.1.6] - 2025-11-12

### Changed
- Updated README documentation

## [0.1.4] - 2025-11-12

### Added
- Copy-to-clipboard button for code blocks
- Copy-to-clipboard button extended to diagram blocks (Mermaid and PlantUML)
- Refactored copy button implementation into reusable component

### Changed
- Updated plugin icon

## [0.1.3] - 2025-11-12

### Added
- Checkbox rendering support for Markdown task lists
- Syntax highlighting improvements for checkboxes

## [0.1.2] - 2025-11-12

### Performance
- Improved file size optimization

## [0.1.1] - 2025-11-12

### Added
- Checkbox support for task lists

## [0.1.0] - 2025-11-07

### Added - Phase 4: Testing & Polish ✅
- Comprehensive test suite (89 tests, 62% coverage)
- Global VSCode API mocking infrastructure
- Additional unit tests for:
  - PlantUMLRenderer (30 tests)
  - ThemeManager (4 tests)
  - JavaDetector (5 tests)
  - MermaidRenderer (13 tests)
  - MarkdownProcessor (37 tests)
- VSIX package build verification
- Updated documentation
- ESLint and TypeScript configuration improvements

### Added - Phase 3: Advanced Features ✅
- **Zoom Controls**
  - Range: 10% - 1000%
  - Keyboard shortcuts (Ctrl/Cmd +/-/0)
  - UI toolbar with zoom in, zoom out, reset
  - State persistence across sessions
- **Pan/Drag Navigation**
  - Mouse drag support when zoomed > 100%
  - Smooth scrolling performance
- **Theme System**
  - GitHub Light theme
  - GitHub Dark theme
  - VS Code Light theme
  - VS Code Dark theme
  - High Contrast theme
  - Auto-detection based on VS Code theme
  - Theme selection in settings
- **PlantUML Local Mode**
  - Dual mode support (online/local)
  - Java detection with installation instructions
  - JAR file validation
  - Local rendering via Java process spawning
  - Comprehensive error messages
- Configuration settings:
  - `plantuml.mode` - Rendering mode (online/local)
  - `plantuml.jarPath` - Path to PlantUML JAR file
  - `plantuml.server` - Custom PlantUML server URL

### Added - Phase 2: Diagram Support ✅
- **Mermaid Diagram Rendering**
  - Native Mermaid.js integration
  - Support for all Mermaid diagram types
  - Case-insensitive detection (mermaid, MERMAID, Mermaid)
  - Client-side rendering
- **PlantUML Diagram Rendering (Online)**
  - Online rendering via plantuml.com
  - Custom base64-like encoding
  - SVG output format
  - Image fallback mechanism
- **Error Isolation**
  - Diagram errors don't break document rendering
  - User-friendly error messages with styling
  - Collapsible diagram source in errors
  - Empty diagram detection
  - HTML escaping to prevent XSS
- Comprehensive unit tests for both renderers
- Multiple diagram support in single document
- Unicode character support in diagrams

### Added - Phase 1: Foundation ✅
- Basic Markdown preview functionality
- Real-time preview with debounced updates (300ms default)
- Command palette integration
  - "Markdown Preview Enhanced: Open Preview"
  - "Markdown Preview Enhanced: Open Preview to the Side"
- Editor title bar preview button
- Configuration settings:
  - `preview.debounceDelay` - Update delay in milliseconds
  - `preview.defaultZoom` - Default zoom level (placeholder for Phase 3)
  - `preview.theme` - Theme selection (placeholder for Phase 3)
  - `preview.autoOpen` - Auto-open preview on file open
- Markdown-it based processing with features:
  - Headings (h1-h6)
  - Text formatting (bold, italic, code)
  - Lists (ordered, unordered, nested)
  - Links with auto-linking
  - Images
  - Code blocks with language info
  - Blockquotes
  - Tables
  - Horizontal rules
- Clean GitHub-style preview styling
- Comprehensive unit tests for Markdown processing
- Project structure:
  - TypeScript configuration
  - ESLint and Prettier setup
  - Jest testing framework
  - Build and package scripts
- Documentation:
  - README with usage instructions
  - Test samples for verification
  - Code comments and JSDoc

### Technical Details
- Extension activates on Markdown file open
- Webview-based preview panel
- Document change watching with debouncing
- Proper resource cleanup on disposal
- Type-safe TypeScript implementation
- Extensible architecture for future phases

### Known Limitations
- Diagram blocks (Mermaid, PlantUML) render as code blocks - Phase 2
- Single basic theme - Phase 3 will add multiple themes
- No zoom controls - Phase 3 will add zoom/pan
- Limited test coverage - Phase 4 will add comprehensive tests

### Development
- Initial project setup
- TypeScript compilation pipeline
- Testing framework configuration
- Linting and formatting tools
- VSCode debugging configuration

---

## Development Phases

### Phase 1: Foundation ✅
**Timeline**: Completed
**Status**: Complete

Core extension functionality with basic Markdown preview.

### Phase 2: Diagram Support ✅
**Timeline**: Completed
**Status**: Complete

Mermaid and PlantUML integration with error isolation.

### Phase 3: Advanced Features ✅
**Timeline**: Completed
**Status**: Complete

Zoom, themes, and PlantUML local mode.

### Phase 4: Testing & Polish ✅
**Timeline**: Completed
**Status**: Complete

Comprehensive testing, VSIX packaging, and documentation.

---

**Legend:**
- ✅ Complete
- 🔄 In Progress
- ⏳ Planned
- 🐛 Bug Fix
- ⚡ Performance
- 🔒 Security
