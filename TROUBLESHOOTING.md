# Troubleshooting Guide

This guide helps you resolve common issues with Markdown Preview Enhanced.

## Table of Contents

- [Preview Issues](#preview-issues)
- [Diagram Issues](#diagram-issues)
- [Zoom & Theme Issues](#zoom--theme-issues)
- [Performance Issues](#performance-issues)
- [Installation Issues](#installation-issues)

---

## Preview Issues

### Preview not opening

**Symptoms:**
- Command palette shows no preview command
- Preview command doesn't work
- No button in editor title bar

**Solutions:**

1. **Check file type**
   - Preview only works with `.md` or `.markdown` files
   - Verify file extension in status bar

2. **Restart VS Code**
   ```bash
   # Close VS Code completely and reopen
   ```

3. **Reinstall extension**
   - Uninstall from Extensions panel
   - Restart VS Code
   - Reinstall from Marketplace

4. **Check extension activation**
   - Open Command Palette (Ctrl/Cmd+Shift+P)
   - Run "Developer: Show Running Extensions"
   - Verify "Markdown Preview Enhanced" is active

### Preview not updating

**Symptoms:**
- Changes to Markdown file don't appear in preview
- Preview shows old content

**Solutions:**

1. **Check debounce delay**
   - Default is 300ms
   - Wait a moment after typing
   - Adjust in settings: `markdownPreviewEnhanced.preview.debounceDelay`

2. **Manually refresh**
   - Close and reopen preview
   - Run command: "Markdown Preview Enhanced: Open Preview"

3. **Check for errors**
   - Open Developer Tools: `Help > Toggle Developer Tools`
   - Check Console for errors
   - Report errors as issues

### Preview shows HTML source instead of rendered content

**Symptoms:**
- Preview displays raw HTML tags
- Content not formatted

**Solutions:**

1. **This is expected behavior**
   - Extension processes Markdown, not HTML
   - HTML tags in Markdown are preserved (markdown-it default)

2. **For pure HTML files**
   - Use a dedicated HTML preview extension
   - This extension is for Markdown files only

---

## Diagram Issues

### Mermaid diagrams not rendering

**Symptoms:**
- Mermaid code block shows as plain text
- Diagram not displayed

**Solutions:**

1. **Check syntax**
   ```markdown
   # ✅ Correct
   ```mermaid
   graph TD
     A --> B
   ```

   # ❌ Wrong (no language identifier)
   ```
   graph TD
     A --> B
   ```
   ```

2. **Verify Mermaid syntax**
   - Test diagram at [Mermaid Live Editor](https://mermaid.live/)
   - Fix any syntax errors
   - Check Mermaid documentation

3. **Check for JavaScript errors**
   - Open Developer Tools (Help > Toggle Developer Tools)
   - Look for Mermaid-related errors
   - Clear browser cache if needed

### PlantUML diagrams showing as code

**Symptoms:**
- PlantUML blocks render as `plantuml-pending` divs
- No diagram image displayed

**Solutions:**

1. **Check internet connection** (online mode)
   - PlantUML online mode requires internet
   - Verify connection to plantuml.com
   - Check firewall/proxy settings

2. **Verify PlantUML syntax**
   ```markdown
   # ✅ Correct
   ```plantuml
   @startuml
   Alice -> Bob: Hello
   @enduml
   ```

   # ❌ Wrong (missing @startuml/@enduml)
   ```plantuml
   Alice -> Bob: Hello
   ```
   ```

3. **Try custom server** (if plantuml.com is blocked)
   - Settings: `markdownPreviewEnhanced.plantuml.server`
   - Use your organization's PlantUML server

### PlantUML local mode not working

**Symptoms:**
- Error: "Java is not installed"
- Error: "PlantUML JAR file is invalid"
- Diagrams don't render in local mode

**Solutions:**

1. **Install Java**

   **macOS:**
   ```bash
   brew install openjdk
   ```

   **Windows:**
   - Download from [Adoptium](https://adoptium.net/)
   - Run installer
   - Add to PATH

   **Linux:**
   ```bash
   sudo apt install default-jdk
   ```

2. **Verify Java installation**
   ```bash
   java -version
   ```
   Should output Java version (11 or later recommended)

3. **Download PlantUML JAR**
   - Visit [plantuml.com/download](https://plantuml.com/download)
   - Download `plantuml.jar`
   - Save to permanent location (e.g., `~/plantuml.jar` or `C:\tools\plantuml.jar`)

4. **Configure JAR path**
   - Open VS Code Settings
   - Search: "Markdown Preview Enhanced PlantUML"
   - Set "Jar Path" to absolute path:
     - macOS/Linux: `/Users/username/plantuml.jar`
     - Windows: `C:\Users\username\plantuml.jar`

5. **Set mode to local**
   - Settings: `markdownPreviewEnhanced.plantuml.mode`
   - Select "local"

6. **Verify configuration**
   ```json
   {
     "markdownPreviewEnhanced.plantuml.mode": "local",
     "markdownPreviewEnhanced.plantuml.jarPath": "/absolute/path/to/plantuml.jar"
   }
   ```

7. **Check JAR file permissions**
   ```bash
   # macOS/Linux
   ls -l /path/to/plantuml.jar
   chmod 644 /path/to/plantuml.jar  # If needed
   ```

---

## Zoom & Theme Issues

### Zoom not working

**Symptoms:**
- Zoom buttons do nothing
- Keyboard shortcuts don't work
- Zoom level not changing

**Solutions:**

1. **Check zoom controls are visible**
   - Look for zoom toolbar in preview (top-right)
   - If missing, reopen preview

2. **Try keyboard shortcuts**
   - Zoom in: `Ctrl/Cmd` + `+` or `=`
   - Zoom out: `Ctrl/Cmd` + `-`
   - Reset: `Ctrl/Cmd` + `0`

3. **Check zoom limits**
   - Minimum: 10%
   - Maximum: 1000%
   - Zoom won't go beyond these limits

4. **Reset zoom in settings**
   - Settings: `markdownPreviewEnhanced.preview.defaultZoom`
   - Set to `100`
   - Reopen preview

### Theme not applying

**Symptoms:**
- Selected theme doesn't show
- Preview has no styling
- Wrong theme displayed

**Solutions:**

1. **Check theme setting**
   - Settings: `markdownPreviewEnhanced.preview.theme`
   - Available themes:
     - github-light
     - github-dark
     - vscode-light
     - vscode-dark
     - high-contrast

2. **Reload preview**
   - Close preview panel
   - Reopen with "Open Preview" command
   - Themes are applied on panel creation

3. **Check for CSS errors**
   - Open Developer Tools
   - Check for CSS loading errors
   - Verify theme files exist in `resources/themes/`

4. **Try default theme**
   - Set theme to `github-light`
   - Reopen preview
   - If this works, other theme may have issues

---

## Performance Issues

### Slow preview rendering

**Symptoms:**
- Preview takes long time to update
- Lag when typing
- UI freezes

**Solutions:**

1. **Increase debounce delay**
   - Settings: `markdownPreviewEnhanced.preview.debounceDelay`
   - Try `500` or `1000` milliseconds
   - Higher value = less frequent updates

2. **Check file size**
   - Large files (>5000 lines) may be slow
   - Consider splitting into smaller files
   - Use `---` to section large documents

3. **Reduce diagram count**
   - Each diagram adds processing time
   - Consider:
     - Linking to external diagrams
     - Using simpler diagram syntax
     - Caching diagrams externally

4. **Check system resources**
   - Open Task Manager/Activity Monitor
   - Check CPU/memory usage
   - Close unnecessary applications

5. **Disable other extensions temporarily**
   - Other Markdown extensions may conflict
   - Test with minimal extensions enabled

### High memory usage

**Symptoms:**
- VS Code uses excessive RAM
- System becomes slow
- Out of memory errors

**Solutions:**

1. **Close unused preview panels**
   - Only keep one preview open
   - Close panel when not needed

2. **Restart VS Code**
   - Memory leaks may accumulate
   - Regular restarts help

3. **Reduce file complexity**
   - Fewer large images
   - Fewer complex diagrams
   - Split large files

4. **Update VS Code**
   - Latest version has better memory management
   - Check for updates: `Help > Check for Updates`

---

## Installation Issues

### Extension not installing

**Symptoms:**
- Installation fails
- Extension not in Extensions panel
- Error during installation

**Solutions:**

1. **Check VS Code version**
   - Required: VS Code 1.85.0 or later
   - Check: `Help > About`
   - Update if needed

2. **Check internet connection**
   - Extension Marketplace requires internet
   - Verify connection
   - Try again after network is stable

3. **Clear VS Code cache**
   ```bash
   # Close VS Code first

   # macOS/Linux
   rm -rf ~/.vscode/extensions/cache

   # Windows
   # Delete: %USERPROFILE%\.vscode\extensions\cache
   ```

4. **Install from VSIX**
   - Download .vsix file
   - Extensions panel > "..." > "Install from VSIX"

### Extension not activating

**Symptoms:**
- Extension installed but not working
- No commands in palette
- No activation

**Solutions:**

1. **Check activation events**
   - Extension activates on Markdown file open
   - Open a `.md` file
   - Check status bar for Markdown indicator

2. **View extension log**
   - Command Palette: "Developer: Show Logs"
   - Select "Extension Host"
   - Look for errors

3. **Reload window**
   - Command Palette: "Developer: Reload Window"

---

## Advanced Troubleshooting

### Enable debug logging

1. Open VS Code settings
2. Add:
   ```json
   {
     "markdown-preview-enhanced.trace": "verbose"
   }
   ```
3. View output: `View > Output > Markdown Preview Enhanced`

### Developer Tools

Access Chrome DevTools for the preview panel:

1. Focus preview panel
2. `Help > Toggle Developer Tools`
3. Check Console, Network, Sources tabs
4. Look for JavaScript errors

### Report an Issue

When reporting issues, please include:

1. **Environment**
   - VS Code version
   - Extension version
   - Operating system

2. **Reproduction steps**
   - Minimal Markdown example
   - Steps to reproduce
   - Expected vs actual behavior

3. **Logs**
   - Extension logs
   - Developer Tools console output
   - Screenshots/videos if applicable

4. **Configuration**
   - Relevant settings
   - Other Markdown extensions installed

---

## Common Error Messages

### "PlantUML JAR not found"

**Solution**: Configure JAR path in settings (see [PlantUML local mode](#plantuml-local-mode-not-working))

### "Java not found on system"

**Solution**: Install Java (see [Install Java](#plantuml-local-mode-not-working))

### "Failed to load diagram from PlantUML server"

**Causes**:
- No internet connection
- plantuml.com is down
- Firewall blocking request

**Solutions**:
- Check internet connection
- Try again later
- Configure custom PlantUML server
- Switch to local mode

### "Empty diagram content"

**Cause**: Code block is empty or whitespace-only

**Solution**:
```markdown
# ❌ Empty
```mermaid
```

# ✅ With content
```mermaid
graph TD
  A --> B
```
```

---

## Still Need Help?

If these solutions don't help:

1. **Search existing issues** on GitHub
2. **Create a new issue** with:
   - Detailed description
   - Reproduction steps
   - Environment information
   - Screenshots/logs
3. **Check documentation** in README.md

**Response time**: Issues are typically reviewed within 1-2 business days.
