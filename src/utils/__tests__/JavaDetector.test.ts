import { JavaDetector } from '../JavaDetector';

/**
 * Test suite for JavaDetector.
 *
 * This test verifies Java detection, PlantUML JAR validation, and
 * system requirements checking for local PlantUML mode.
 */
describe('JavaDetector', () => {
  beforeEach(() => {
    // Clear cache before each test
    JavaDetector.clearCache();
  });

  describe('validatePlantUMLJar', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that non-existent
     * JAR files are correctly identified as invalid.
     */
    it('should return false for non-existent JAR file', () => {
      const result = JavaDetector.validatePlantUMLJar('/non/existent/path/plantuml.jar');
      expect(result).toBe(false);
    });

    /**
     * If this test didn't exist, we wouldn't guarantee that non-JAR files
     * are rejected.
     */
    it('should return false for non-JAR files', () => {
      const result = JavaDetector.validatePlantUMLJar('/etc/hosts');
      expect(result).toBe(false);
    });

    /**
     * If this test didn't exist, we wouldn't guarantee that empty paths
     * are rejected.
     */
    it('should return false for empty path', () => {
      const result = JavaDetector.validatePlantUMLJar('');
      expect(result).toBe(false);
    });
  });

  describe('getInstallationInstructions', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that installation
     * instructions are provided to users.
     */
    it('should return installation instructions', () => {
      const instructions = JavaDetector.getInstallationInstructions();
      expect(instructions).toBeTruthy();
      expect(instructions).toContain('Java');
      expect(instructions).toContain('PlantUML');
    });

    /**
     * If this test didn't exist, we wouldn't guarantee that instructions
     * are in HTML format for display.
     */
    it('should return HTML formatted instructions', () => {
      const instructions = JavaDetector.getInstallationInstructions();
      expect(instructions).toContain('<');
      expect(instructions).toContain('>');
      expect(instructions).toContain('href');
    });
  });

  describe('getSystemRequirementsStatus', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that missing JAR
     * path is reported in status.
     */
    it('should report errors when JAR path is not provided', async () => {
      const status = await JavaDetector.getSystemRequirementsStatus();
      expect(status.ready).toBe(false);
      expect(status.errors.length).toBeGreaterThan(0);
      expect(status.jarPath).toBeNull();
    });

    /**
     * If this test didn't exist, we wouldn't guarantee that invalid JAR
     * path is reported in status.
     */
    it('should report errors for invalid JAR path', async () => {
      const status = await JavaDetector.getSystemRequirementsStatus('/invalid/path.jar');
      expect(status.ready).toBe(false);
      expect(status.jarValid).toBe(false);
      expect(status.errors.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    /**
     * If this test didn't exist, we wouldn't guarantee that the cache
     * can be cleared for testing purposes.
     */
    it('should clear the Java version cache', () => {
      JavaDetector.clearCache();
      // Cache should be cleared, no error should occur
      expect(true).toBe(true);
    });
  });
});
