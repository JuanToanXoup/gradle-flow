import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  ChevronDown,
  ChevronRight,
  Settings,
  X,
  FileUp,
  CheckCircle,
  Info,
} from 'lucide-react';
import type { GradleTaskNode, GradleEdge, Variable } from '../types/gradle';
import {
  generateGradleKts,
  validateGradleExport,
  copyToClipboard,
  downloadAsFile,
  type GradleExportOptions,
} from '../utils/gradleExport';
import { importGradleFile, parseGradleKts, type GradleParseResult } from '../utils/gradleImport';

type TabType = 'import' | 'export';

interface ImportExportPanelProps {
  nodes: GradleTaskNode[];
  edges: GradleEdge[];
  variables: Variable[];
  isOpen: boolean;
  onClose: () => void;
  onImport: (nodes: GradleTaskNode[], edges: GradleEdge[]) => void;
}

export function ImportExportPanel({
  nodes,
  edges,
  variables,
  isOpen,
  onClose,
  onImport,
}: ImportExportPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('export');
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

  // Import state
  const [importResult, setImportResult] = useState<GradleParseResult | null>(null);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [pasteContent, setPasteContent] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await importGradleFile(file);
      setImportResult(result);
    } catch (err) {
      setImportResult({
        nodes: [],
        edges: [],
        errors: [`Failed to read file: ${err}`],
        warnings: [],
      });
    } finally {
      setImporting(false);
    }
  }, []);

  // Handle paste content parsing
  const handleParsePaste = useCallback(() => {
    if (!pasteContent.trim()) return;

    setImporting(true);
    try {
      const result = parseGradleKts(pasteContent);
      setImportResult(result);
    } catch (err) {
      setImportResult({
        nodes: [],
        edges: [],
        errors: [`Failed to parse content: ${err}`],
        warnings: [],
      });
    } finally {
      setImporting(false);
    }
  }, [pasteContent]);

  // Handle import confirmation
  const handleConfirmImport = useCallback(() => {
    if (importResult && importResult.nodes.length > 0) {
      onImport(importResult.nodes, importResult.edges);
      setImportResult(null);
      setPasteContent('');
      onClose();
    }
  }, [importResult, onImport, onClose]);

  // Reset import state
  const handleResetImport = useCallback(() => {
    setImportResult(null);
    setPasteContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="export-panel-overlay" onClick={onClose}>
      <div className="export-panel import-export-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-panel-header">
          <div className="export-panel-title">
            <FileCode size={20} />
            <span>Gradle File</span>
          </div>
          <button className="export-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="import-export-tabs">
          <button
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={16} />
            Import
          </button>
          <button
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <Download size={16} />
            Export
          </button>
        </div>

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="import-content">
            {!importResult ? (
              <>
                {/* Import mode selector */}
                <div className="import-mode-selector">
                  <button
                    className={`mode-btn ${importMode === 'file' ? 'active' : ''}`}
                    onClick={() => setImportMode('file')}
                  >
                    <FileUp size={16} />
                    Upload File
                  </button>
                  <button
                    className={`mode-btn ${importMode === 'paste' ? 'active' : ''}`}
                    onClick={() => setImportMode('paste')}
                  >
                    <Copy size={16} />
                    Paste Code
                  </button>
                </div>

                {importMode === 'file' ? (
                  <div className="import-file-area">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".gradle.kts,.kts,.gradle"
                      onChange={handleFileSelect}
                      className="file-input"
                      id="gradle-file-input"
                    />
                    <label htmlFor="gradle-file-input" className="file-drop-zone">
                      <FileUp size={32} />
                      <span className="drop-text">
                        Click to select or drag & drop
                      </span>
                      <span className="drop-hint">
                        build.gradle.kts or .gradle files
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="import-paste-area">
                    <textarea
                      value={pasteContent}
                      onChange={(e) => setPasteContent(e.target.value)}
                      placeholder="Paste your build.gradle.kts content here..."
                      className="paste-textarea"
                    />
                    <button
                      className="parse-btn"
                      onClick={handleParsePaste}
                      disabled={!pasteContent.trim() || importing}
                    >
                      Parse Content
                    </button>
                  </div>
                )}

                <div className="import-help">
                  <Info size={14} />
                  <p>
                    Import tasks from an existing <code>build.gradle.kts</code> file.
                    Supports standard task registration patterns including{' '}
                    <code>tasks.register</code> and <code>tasks.create</code>.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Import results */}
                <div className="import-results">
                  {importResult.errors.length > 0 && (
                    <div className="import-errors">
                      <div className="result-header error">
                        <AlertTriangle size={16} />
                        <span>Errors</span>
                      </div>
                      <ul>
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.warnings.length > 0 && (
                    <div className="import-warnings">
                      <div className="result-header warning">
                        <AlertTriangle size={16} />
                        <span>Warnings</span>
                      </div>
                      <ul>
                        {importResult.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.nodes.length > 0 && (
                    <div className="import-success">
                      <div className="result-header success">
                        <CheckCircle size={16} />
                        <span>Found {importResult.nodes.length} tasks</span>
                      </div>
                      <ul className="task-list">
                        {importResult.nodes.map((node) => (
                          <li key={node.id}>
                            <span className="task-name">{node.data.taskName}</span>
                            <span className="task-type">{node.data.taskType}</span>
                          </li>
                        ))}
                      </ul>
                      {importResult.edges.length > 0 && (
                        <p className="edge-count">
                          {importResult.edges.length} dependencies detected
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="import-actions">
                  <button className="action-btn secondary" onClick={handleResetImport}>
                    Try Again
                  </button>
                  <button
                    className="action-btn primary"
                    onClick={handleConfirmImport}
                    disabled={importResult.nodes.length === 0}
                  >
                    <Check size={16} />
                    Import {importResult.nodes.length} Tasks
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
