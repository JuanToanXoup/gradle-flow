import { useState, useMemo, useCallback } from 'react';
import {
  Download,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  ChevronDown,
  ChevronRight,
  Settings,
  X,
} from 'lucide-react';
import type { GradleTaskNode, GradleEdge, Variable } from '../types/gradle';
import {
  generateGradleKts,
  validateGradleExport,
  copyToClipboard,
  downloadAsFile,
  type GradleExportOptions,
} from '../utils/gradleExport';

interface ExportPanelProps {
  nodes: GradleTaskNode[];
  edges: GradleEdge[];
  variables: Variable[];
  isOpen: boolean;
  onClose: () => void;
}

export function ExportPanel({
  nodes,
  edges,
  variables,
  isOpen,
  onClose,
}: ExportPanelProps) {
  const [options, setOptions] = useState<GradleExportOptions>({
    includeComments: true,
    includeDescriptions: true,
    includeDisabledTasks: true,
    variableFormat: 'properties',
    projectName: 'my-project',
  });

  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Validate the graph
  const validation = useMemo(() => {
    return validateGradleExport(nodes, edges);
  }, [nodes, edges]);

  // Generate the Gradle code
  const generatedCode = useMemo(() => {
    if (nodes.length === 0) {
      return '// No tasks defined yet. Add tasks to the canvas to generate Gradle code.';
    }
    return generateGradleKts(nodes, edges, variables, options);
  }, [nodes, edges, variables, options]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(generatedCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedCode]);

  // Handle download
  const handleDownload = useCallback(() => {
    setDownloading(true);
    const filename = options.projectName
      ? `${options.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}.gradle.kts`
      : 'build.gradle.kts';
    downloadAsFile(generatedCode, filename);
    setTimeout(() => setDownloading(false), 500);
  }, [generatedCode, options.projectName]);

  // Toggle option
  const toggleOption = useCallback(
    (key: keyof GradleExportOptions) => {
      setOptions((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    },
    []
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="export-panel-overlay" onClick={onClose}>
      <div className="export-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-panel-header">
          <div className="export-panel-title">
            <FileCode size={20} />
            <span>Export to Gradle</span>
          </div>
          <button className="export-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Validation warnings */}
        {!validation.valid && (
          <div className="export-validation-warnings">
            <div className="validation-header">
              <AlertTriangle size={16} />
              <span>Validation Issues</span>
            </div>
            <ul>
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Options toggle */}
        <button
          className="export-options-toggle"
          onClick={() => setShowOptions(!showOptions)}
        >
          {showOptions ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Settings size={16} />
          <span>Export Options</span>
        </button>

        {/* Options panel */}
        {showOptions && (
          <div className="export-options">
            <div className="export-option">
              <label>
                <input
                  type="text"
                  value={options.projectName || ''}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, projectName: e.target.value }))
                  }
                  placeholder="Project name"
                />
                <span>Project Name</span>
              </label>
            </div>
            <div className="export-option">
              <label>
                <input
                  type="checkbox"
                  checked={options.includeComments}
                  onChange={() => toggleOption('includeComments')}
                />
                <span>Include comments</span>
              </label>
            </div>
            <div className="export-option">
              <label>
                <input
                  type="checkbox"
                  checked={options.includeDescriptions}
                  onChange={() => toggleOption('includeDescriptions')}
                />
                <span>Include task descriptions</span>
              </label>
            </div>
            <div className="export-option">
              <label>
                <input
                  type="checkbox"
                  checked={options.includeDisabledTasks}
                  onChange={() => toggleOption('includeDisabledTasks')}
                />
                <span>Include disabled tasks (commented)</span>
              </label>
            </div>
          </div>
        )}

        {/* Code preview */}
        <div className="export-code-container">
          <div className="export-code-header">
            <span className="code-filename">build.gradle.kts</span>
            <span className="code-stats">
              {nodes.length} task{nodes.length !== 1 ? 's' : ''} · {edges.length} dependenc
              {edges.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          <pre className="export-code">
            <code>{generatedCode}</code>
          </pre>
        </div>

        {/* Actions */}
        <div className="export-actions">
          <button
            className="export-action-btn copy"
            onClick={handleCopy}
            disabled={nodes.length === 0}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>
          <button
            className="export-action-btn download"
            onClick={handleDownload}
            disabled={nodes.length === 0 || downloading}
          >
            <Download size={16} />
            <span>Download File</span>
          </button>
        </div>

        {/* Help text */}
        <div className="export-help">
          <p>
            This generates a <code>build.gradle.kts</code> file based on your visual task
            graph. The generated code uses Gradle Kotlin DSL syntax compatible with
            Gradle 8.0+.
          </p>
        </div>
      </div>
    </div>
  );
}
