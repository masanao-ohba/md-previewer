# Markdown Preview Enhanced VSCode Extension

## Project Overview
VSCode extension for Markdown preview with advanced diagram support (Mermaid & PlantUML).

## Core Requirements

### 1. Markdown Features
- Syntax highlighting for Markdown files
- Live preview in separate tab
- Real-time updates with debouncing (300ms default)
- Command palette integration for preview activation

### 2. Diagram Support
#### Mermaid
- Native rendering without external dependencies
- Error isolation (diagram errors don't break document)
- Syntax: ` ```mermaid ... ``` `

#### PlantUML
- Dual mode support:
  - Online mode (default): Uses plantuml.com server
  - Local mode: Requires Java + PlantUML.jar
- Error isolation similar to Mermaid
- Syntax: ` ```plantuml ... ``` `

### 3. Zoom & Navigation
- Zoom range: 10% - 1000%
- Pan/drag support for zoomed content
- Zoom controls in preview toolbar
- Keyboard shortcuts (Ctrl/Cmd +/-)

### 4. Theming
- Minimum 5 themes:
  - GitHub Light/Dark
  - VS Code Light/Dark
  - Material Theme
  - High Contrast
  - Classic (Markdown default)

## Technical Architecture

### Components
1. **Extension Core** (`src/extension.ts`)
   - Command registration
   - Preview panel management
   - Configuration handling

2. **Markdown Processor** (`src/markdown/processor.ts`)
   - Markdown to HTML conversion
   - Code block detection
   - Diagram block extraction

3. **Diagram Renderers**
   - `src/renderers/mermaid.ts` - Mermaid rendering
   - `src/renderers/plantuml.ts` - PlantUML rendering (online/local)
   - Error boundary wrapper for fault isolation

4. **Preview Webview** (`src/webview/`)
   - HTML/CSS/JS for preview rendering
   - Zoom/pan controls
   - Theme application
   - Message passing with extension

5. **Theme Manager** (`src/themes/`)
   - Theme definitions
   - CSS injection
   - User preference persistence

## Testing Strategy

### Unit Tests
- Markdown processing logic
- Diagram detection and extraction
- Configuration management
- Error handling

### Integration Tests (if complexity allows)
- VSCode Extension Test API
- Preview panel lifecycle
- Command execution
- Message passing

### Manual Test Scenarios
- Large file performance (1000+ lines)
- Complex diagrams
- Error cases (invalid syntax)
- Theme switching
- Zoom interactions

## Performance Considerations
- Debounced updates (300ms)
- Virtual DOM diffing for preview updates
- Lazy loading for large diagrams
- Caching rendered diagrams
- Web Worker for heavy processing

## Error Handling
- Graceful degradation for diagram errors
- Clear error messages in preview
- Fallback to code block display
- Console logging for debugging

## Configuration
User settings via VS Code settings:
- Default render mode (online/local) for PlantUML
- Debounce delay
- Default theme
- Default zoom level
- Auto-open preview on file open

## Development Workflow

### Phase 1: Foundation (Week 1)
- Basic extension structure
- Markdown to HTML conversion
- Simple preview panel
- Command registration

### Phase 2: Diagram Support (Week 2)
- Mermaid integration
- PlantUML online mode
- Error isolation implementation
- Basic error display

### Phase 3: Advanced Features (Week 3)
- Zoom/pan implementation
- PlantUML local mode
- Theme system
- Performance optimization

### Phase 4: Polish & Testing (Week 4)
- Comprehensive testing
- Documentation
- Performance tuning
- Bug fixes

## Success Criteria
- ✅ All 6 requirements fully implemented
- ✅ Unit test coverage > 70%
- ✅ Manual test scenarios pass
- ✅ Performance benchmarks met (< 100ms render for typical files)
- ✅ No critical bugs in error scenarios
- ✅ Package (.vsix) builds successfully
- ✅ Works in VSCode 1.85.0+

## Dependencies
- `markdown-it` - Markdown parser
- `mermaid` - Mermaid diagrams
- `node-plantuml` - PlantUML support
- `vscode-test` - Testing framework

## Known Limitations
- PlantUML local mode requires Java installation
- Large files (10,000+ lines) may have performance impact
- Some advanced Markdown extensions not supported initially

## Future Enhancements (Out of Scope)
- Export to PDF/HTML
- Custom CSS injection
- Graph/chart libraries beyond Mermaid/PlantUML
- Collaborative editing
- Mobile preview