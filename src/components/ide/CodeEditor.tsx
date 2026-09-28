'use client';

import { useIDEStore } from '@/store/ide-store';
import * as monaco from 'monaco-editor';
import Editor, { OnMount, BeforeMount, loader } from '@monaco-editor/react';
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { editor, languages } from 'monaco-editor';

// Configure Monaco to load from bundled package (100% offline, zero CDN, zero AMD script injection)
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorker: function() {
      return new Worker(
        URL.createObjectURL(
          new Blob([
            'self.onmessage = function() { self.postMessage({ id: 0, result: null }); };'
          ], { type: 'application/javascript' })
        )
      );
    }
  };
  loader.config({ monaco });
}

// SystemVerilog and Verilog language configuration
const hdlLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  brackets: [
    ['[', ']'],
    ['(', ')'],
    ['{', '}']
  ],
  autoClosingPairs: [
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '{', close: '}' },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '"', close: '"', notIn: ['string'] }
  ],
  surroundingPairs: [
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '{', close: '}' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ]
};

const BASE_KEYWORDS = [
  'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
  'always', 'initial', 'begin', 'end', 'if', 'else', 'case', 'endcase',
  'default', 'for', 'while', 'repeat', 'forever', 'fork', 'join',
  'function', 'endfunction', 'task', 'endtask', 'parameter', 'localparam',
  'assign', 'deassign', 'force', 'release', 'posedge', 'negedge', 'or',
  'defparam', 'generate', 'endgenerate', 'genvar', 'integer', 'real', 'time',
  'specify', 'endspecify',
  // SystemVerilog keywords
  'logic', 'bit', 'byte', 'int', 'longint', 'shortint', 'void', 'const',
  'always_comb', 'always_ff', 'always_latch', 'unique', 'priority', 'inside',
  'interface', 'endinterface', 'modport', 'package', 'endpackage', 'import', 'export',
  'struct', 'union', 'enum', 'typedef', 'assert', 'cover', 'property', 'sequence',
  'endproperty', 'endsequence', 'return', 'break', 'continue', 'virtual', 'null',
  'chandle', 'string', 'final', 'program', 'endprogram', 'class', 'endclass'
];

const GATE_PRIMITIVES = [
  'and', 'nand', 'or', 'nor', 'xor', 'xnor', 'buf', 'not',
  'bufif0', 'bufif1', 'notif0', 'notif1', 'pulldown', 'pullup',
  'nmos', 'pmos', 'cmos', 'rnmos', 'rpmos', 'rcmos',
  'tran', 'rtran', 'tranif0', 'tranif1', 'rtranif0', 'rtranif1',
  'primitive', 'endprimitive', 'table', 'endtable'
];

const SYSTEM_TASKS = [
  '$display', '$write', '$strobe', '$monitor', '$monitoron', '$monitoroff',
  '$time', '$realtime', '$stime', '$finish', '$stop',
  '$dumpfile', '$dumpvars', '$dumpall', '$dumpoff', '$dumpon',
  '$readmemh', '$readmemb', '$writememh', '$writememb',
  '$random', '$urandom', '$urandom_range', 'timescale',
  '$fatal', '$error', '$warning', '$info', '$size', '$bits',
  '$signed', '$unsigned', '$clog2', '$test$plusargs', '$value$plusargs'
];

function createHDLTokensProvider(highlightPrimitives: boolean, highlightSystemTasks: boolean): languages.IMonarchLanguage {
  return {
    defaultToken: '',
    tokenPostfix: '.verilog',
    
    keywords: BASE_KEYWORDS,
    primitives: GATE_PRIMITIVES,
    builtins: SYSTEM_TASKS,
    
    operators: [
      '=', '<', '<=', '>', '>=', '==', '!=', '===', '!==', '==?', '!=?',
      '+', '-', '*', '/', '%', '**',
      '!', '&&', '||', '~', '&', '|', '^', '~^', '^~',
      '<<', '>>', '<<<', '>>>',
      '?', ':', '{', '}', '`', '->', '|->', '|=>', '##'
    ],
    
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    
    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@primitives': highlightPrimitives ? 'type.primitive' : 'identifier',
            '@builtins': highlightSystemTasks ? 'type.identifier' : 'identifier',
            '@default': 'identifier'
          }
        }],
        [/\$[a-zA-Z_]\w*/, {
          cases: {
            '@builtins': highlightSystemTasks ? 'type.identifier' : 'identifier',
            '@default': highlightSystemTasks ? 'type.identifier' : 'identifier'
          }
        }],
        { include: '@whitespace' },
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+'[bBoOdDhH][0-9a-fA-F_xXzZ]+/, 'number.hex'],
        [/\d+/, 'number'],
        [/[;,.]/, 'delimiter'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        [/'[^']+'/, 'string'],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],
      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],
    }
  };
}

export function CodeEditor() {
  const { resolvedTheme } = useTheme();
  const { 
    activeFile, 
    openFiles, 
    closeFile, 
    updateFileContent, 
    setActiveFile,
    autoSuggestEnabled,
    toggleAutoSuggest,
    highlightPrimitives,
    highlightSystemTasks
  } = useIDEStore();
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  // Register languages and completion providers
  const handleEditorWillMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;

    // Register Verilog and SystemVerilog if not already registered
    const registerLang = (langId: string) => {
      try {
        if (!monaco.languages.getLanguages().some(lang => lang.id === langId)) {
          monaco.languages.register({ id: langId });
        }
        monaco.languages.setLanguageConfiguration(langId, hdlLanguageConfig);
        monaco.languages.setMonarchTokensProvider(
          langId, 
          createHDLTokensProvider(highlightPrimitives, highlightSystemTasks)
        );
      } catch (err) {
        console.warn(`Language registration for ${langId}:`, err);
      }
    };

    registerLang('verilog');
    registerLang('systemverilog');

    // Register custom theme tokens for primitives and builtins
    monaco.editor.defineTheme('verisim-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'type.primitive', foreground: highlightPrimitives ? '4ec9b0' : 'd4d4d4', fontStyle: highlightPrimitives ? 'italic' : 'normal' },
        { token: 'type.identifier', foreground: highlightSystemTasks ? 'dcdcaa' : 'd4d4d4' },
        { token: 'number.hex', foreground: 'b5cea8' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#10131c',
        'editor.lineHighlightBackground': '#181d2a',
        'editorLineNumber.foreground': '#4f5d75',
        'editorLineNumber.activeForeground': '#60a5fa',
      }
    });

    monaco.editor.defineTheme('verisim-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
        { token: 'type.primitive', foreground: highlightPrimitives ? '008080' : '267f99', fontStyle: highlightPrimitives ? 'italic' : 'normal' },
        { token: 'type.identifier', foreground: highlightSystemTasks ? '795e26' : '001080' },
        { token: 'number.hex', foreground: '098658' },
        { token: 'operator', foreground: '000000' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f3f4f6',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#2563eb',
      }
    });

    // Register dynamic CompletionItemProvider
    const completionProvider: languages.CompletionItemProvider = {
      triggerCharacters: ['.', '@', '$', ' '],
      provideCompletionItems: (model, position) => {
        // Check if auto-suggestions are enabled in store
        const isAutoSuggest = useIDEStore.getState().autoSuggestEnabled;
        if (!isAutoSuggest) {
          return { suggestions: [] };
        }

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: languages.CompletionItem[] = [
          {
            label: 'always_ff',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'SystemVerilog Sequential Block with Synchronous or Asynchronous Reset',
            insertText: [
              'always_ff @(posedge ${1:clk} or negedge ${2:rst_n}) begin',
              '\tif (!${2:rst_n}) begin',
              '\t\t${3:// reset state}',
              '\tend else begin',
              '\t\t${0}',
              '\tend',
              'end'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'always_comb',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'SystemVerilog Combinational Logic Block',
            insertText: [
              'always_comb begin',
              '\t${0}',
              'end'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'module',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'SystemVerilog / Verilog Module Declaration',
            insertText: [
              'module ${1:module_name} #(',
              '\tparameter int DATA_WIDTH = 8',
              ') (',
              '\tinput  logic                  ${2:clk},',
              '\tinput  logic                  ${3:rst_n},',
              '\tinput  logic [DATA_WIDTH-1:0] ${4:data_in},',
              '\toutput logic [DATA_WIDTH-1:0] ${5:data_out}',
              ');',
              '',
              '\t${0}',
              '',
              'endmodule'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'dumpfile',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'VCD Waveform Dump Block',
            insertText: [
              'initial begin',
              '\t$dumpfile("${1:waveform}.vcd");',
              '\t$dumpvars(0, ${2:uut});',
              'end'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'clock_generator',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Clock Generation Loop for Testbench',
            insertText: [
              'initial begin',
              '\t${1:clk} = 0;',
              '\tforever #5 ${1:clk} = ~${1:clk};',
              'end'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'typedef_enum',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'SystemVerilog FSM State Enumeration',
            insertText: [
              'typedef enum logic [${1:1}:0] {',
              '\t${2:STATE_IDLE} = 2\'b00,',
              '\t${3:STATE_RUN}  = 2\'b01,',
              '\t${4:STATE_DONE} = 2\'b10',
              '} ${5:state_t};',
              '',
              '${5:state_t} state, next_state;'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'assert_property',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'SystemVerilog Assertion (SVA)',
            insertText: [
              'assert property (@(posedge ${1:clk}) disable iff (!${2:rst_n}) ${3:req} |-> ##1 ${4:gnt})',
              '\telse $error("Assertion failed: %m at time %0t", $time);'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          }
        ];

        return { suggestions };
      }
    };

    monaco.languages.registerCompletionItemProvider('verilog', completionProvider);
    monaco.languages.registerCompletionItemProvider('systemverilog', completionProvider);
  };
  
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Re-apply tokens when highlight settings change
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.languages.setMonarchTokensProvider(
        'verilog', 
        createHDLTokensProvider(highlightPrimitives, highlightSystemTasks)
      );
      monacoRef.current.languages.setMonarchTokensProvider(
        'systemverilog', 
        createHDLTokensProvider(highlightPrimitives, highlightSystemTasks)
      );
    }
  }, [highlightPrimitives, highlightSystemTasks]);

  // Keyboard shortcut Alt+A for toggling Auto-Suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        toggleAutoSuggest();
        const newState = !autoSuggestEnabled;
        toast.info(newState ? '✦ Auto-Suggestions: ON' : 'Auto-Suggestions: OFF', {
          description: newState ? 'Monaco inline suggestions & snippets active' : 'Inline auto-suggestions paused'
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoSuggestEnabled, toggleAutoSuggest]);
  
  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile.id, value);
    }
  };

  const getLanguageForFile = (fileName: string): string => {
    if (fileName.endsWith('.sv') || fileName.endsWith('.svh')) return 'systemverilog';
    if (fileName.endsWith('.py')) return 'python';
    return 'verilog';
  };

  const getBadgeForFile = (fileName: string) => {
    if (fileName.endsWith('.sv') || fileName.endsWith('.svh')) {
      return <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded border border-purple-500/30">SV</span>;
    }
    if (fileName.endsWith('.py')) {
      return <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/30">PY</span>;
    }
    return <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/30">V</span>;
  };

  if (openFiles.length === 0 || !activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-lg font-medium mb-2 text-foreground">No File Open</h3>
          <p className="text-sm">Select a file from the explorer, create a new file, or load a demo</p>
        </div>
      </div>
    );
  }

  const activeLanguage = getLanguageForFile(activeFile.name);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab Bar */}
      <div className="flex items-center bg-muted/40 border-b border-border/60 overflow-x-auto select-none no-scrollbar">
        {openFiles.map((file) => {
          const isActive = activeFile.id === file.id;
          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 border-r border-border/40 cursor-pointer min-w-max text-xs transition-colors",
                isActive 
                  ? "bg-background text-foreground font-medium border-t-2 border-t-blue-500 shadow-sm" 
                  : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              onClick={() => setActiveFile(file)}
            >
              {getBadgeForFile(file.name)}
              <span>{file.name}</span>
              <button
                className="opacity-0 group-hover:opacity-100 hover:bg-accent/40 rounded p-0.5 text-muted-foreground hover:text-foreground transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
                title="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Suggestion Indicator badge in tab bar */}
        <div className="ml-auto pr-3 flex items-center gap-2">
          <button
            onClick={toggleAutoSuggest}
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors",
              autoSuggestEnabled 
                ? "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20" 
                : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
            )}
            title="Toggle Auto-Suggestions (Alt+A)"
          >
            <Sparkles className="h-3 w-3 text-blue-400" />
            <span>Auto-Suggest: {autoSuggestEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        <EditorErrorBoundary fallbackValue={activeFile.content} onChange={handleEditorChange}>
          <Editor
            height="100%"
            language={activeLanguage}
            value={activeFile.content}
            theme={resolvedTheme === "light" ? "verisim-light" : "verisim-dark"}
            loading={
              <div className="h-full flex items-center justify-center bg-background text-muted-foreground text-xs gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span>Loading Monaco Editor...</span>
              </div>
            }
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              renderWhitespace: 'selection',
              folding: true,
              foldingHighlight: true,
              bracketPairColorization: { enabled: true },
              suggestOnTriggerCharacters: autoSuggestEnabled,
              quickSuggestions: autoSuggestEnabled ? {
                other: true,
                comments: false,
                strings: true
              } : false,
              cursorBlinking: 'smooth',
              smoothScrolling: true,
            }}
          />
        </EditorErrorBoundary>
      </div>
    </div>
  );
}

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackValue: string; onChange: (v: string) => void },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'Editor error' };
  }

  componentDidCatch(error: any, info: any) {
    console.error('EditorErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col p-2 bg-background">
          <div className="p-2 mb-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center justify-between">
            <span>Editor fallback mode active</span>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 text-[10px]"
              onClick={() => this.setState({ hasError: false, error: '' })}
            >
              Retry
            </Button>
          </div>
          <textarea
            className="flex-1 w-full p-3 font-mono text-xs bg-background text-foreground border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={this.props.fallbackValue}
            onChange={(e) => this.props.onChange(e.target.value)}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
