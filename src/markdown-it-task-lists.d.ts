/**
 * Type definitions for markdown-it-task-lists
 * This plugin adds GitHub-style task list checkbox rendering
 */

declare module 'markdown-it-task-lists' {
  import MarkdownIt from 'markdown-it';

  interface TaskListOptions {
    /**
     * Enable checkbox rendering
     * @default true
     */
    enabled?: boolean;

    /**
     * Wrap checkbox in label element
     * @default false
     */
    label?: boolean;

    /**
     * Place label after checkbox
     * @default false
     */
    labelAfter?: boolean;
  }

  /**
   * markdown-it plugin for GitHub-style task list checkboxes
   * @param md - markdown-it instance
   * @param options - Plugin options
   */
  function taskLists(md: MarkdownIt, options?: TaskListOptions): void;

  export = taskLists;
}
