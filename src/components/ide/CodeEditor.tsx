'use client';

import { useIDEStore } from '@/store/ide-store';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { editor } from 'monaco-editor';

// Verilog language definition for Monaco
const verilogLanguageConfig = {
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
  ]
};

const verilogTokensProvider = {
  defaultToken: '',
  tokenPostfix: '.verilog',
  
  keywords: [
    'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
    'always', 'initial', 'begin', 'end', 'if', 'else', 'case', 'endcase',
    'default', 'for', 'while', 'repeat', 'forever', 'fork', 'join',
    'function', 'endfunction', 'task', 'endtask', 'parameter', 'localparam',
    'assign', 'deassign', 'force', 'release', 'posedge', 'negedge', 'or',
    'and', 'not', 'buf', 'nand', 'nor', 'xor', 'xnor', 'defparam',
    'generate', 'endgenerate', 'genvar', 'integer', 'real', 'time',
    'specify', 'endspecify', 'primitive', 'endprimitive', 'table', 'endtable'
  ],
  
  builtins: [
    '$display', '$write', '$monitor', '$monitoron', '$monitoroff',
    '$time', '$realtime', '$stime', '$finish', '$stop',
    '$dumpfile', '$dumpvars', '$dumpall', '$dumpoff', '$dumpon',
    '$readmemh', '$readmemb', '$writememh', '$writememb',
    '$random', '$urandom', 'timescale'
  ],
  
  operators: [
    '=', '<', '<=', '>', '>=', '==', '!=', '===', '!==',
    '+', '-', '*', '/', '%', '**',
    '!', '&&', '||', '~', '&', '|', '^', '~^', '^~',
    '<<', '>>', '<<<', '>>>',
    '?', ':', '{', '}', '`'
  ],
  
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@builtins': 'type.identifier',
          '@default': 'identifier'
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

export function CodeEditor() {
  const { activeFile, openFiles, closeFile, updateFileContent, setActiveFile } = useIDEStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  const handleEditorWillMount: BeforeMount = (monaco) => {
    // Register Verilog language
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'verilog')) {
      monaco.languages.register({ id: 'verilog' });
      monaco.languages.setLanguageConfiguration('verilog', verilogLanguageConfig as Parameters<typeof monaco.languages.setLanguageConfiguration>[1]);
      monaco.languages.setMonarchTokensProvider('verilog', verilogTokensProvider as Parameters<typeof monaco.languages.setMonarchTokensProvider>[1]);
    }
  };
  
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };
  
  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile.id, value);
    }
  };

  if (openFiles.length === 0 || !activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium mb-2">No File Open</h3>
          <p className="text-sm">Select a file from the explorer or create a new project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex items-center bg-muted/50 border-b border-border overflow-x-auto">
        {openFiles.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer min-w-max",
              "hover:bg-muted transition-colors",
              activeFile.id === file.id ? "bg-background" : "bg-transparent"
            )}
            onClick={() => setActiveFile(file)}
          >
            <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
            <span className="text-sm">{file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      
      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="verilog"
          value={activeFile.content}
          theme="vs-dark"
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            folding: true,
            foldingHighlight: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
