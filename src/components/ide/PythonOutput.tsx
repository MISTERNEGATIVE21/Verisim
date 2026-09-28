'use client';

import { useIDEStore } from '@/store/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Loader2, 
  FileCode,
  Sparkles
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { runPythonScript } from '@/lib/tauri-db';

interface PythonOutputProps {
  showHeader?: boolean;
}

export function PythonOutput({ showHeader = false }: PythonOutputProps) {
  const { 
    pythonResult, 
    isPythonRunning, 
    setPythonRunning, 
    setPythonResult,
    currentProject,
    activeFile
  } = useIDEStore();

  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [pythonResult]);

  const copyToClipboard = () => {
    if (pythonResult?.output) {
      navigator.clipboard.writeText(pythonResult.output);
      setCopied(true);
      toast.success('Python output copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRunScript = async (scriptName?: string) => {
    if (!currentProject || isPythonRunning) return;

    const targetScript = scriptName || (activeFile?.name.endsWith('.py') ? activeFile.name : null);
    if (!targetScript) {
      // Find first .py file in project
      const pyFile = currentProject.files.find(f => f.name.endsWith('.py'));
      if (!pyFile) {
        toast.error('No .py script found in this project to run');
        return;
      }
      return handleRunScript(pyFile.name);
    }

    setPythonRunning(true);
    setPythonResult(null);

    try {
      const result = await runPythonScript(targetScript, currentProject.files);
      setPythonResult(result);
      if (result.success) {
        toast.success(`Python script ${targetScript} completed successfully`);
      } else {
        toast.error(`Python script ${targetScript} exited with error`);
      }
    } catch (err) {
      setPythonResult({
        success: false,
        output: `Failed to execute python: ${err}`,
        exit_code: -1
      });
    } finally {
      setPythonRunning(false);
    }
  };

  const pyFiles = currentProject?.files.filter(f => f.name.endsWith('.py')) || [];

  return (
    <div className="h-full flex flex-col bg-[#090c14] text-foreground">
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-[#0d1017]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-400">Python Verification Hub</span>
            {isPythonRunning && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Executing...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              disabled={!pythonResult}
              className="h-6 text-xs px-2"
            >
              <Copy className="h-3 w-3 mr-1" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPythonResult(null)}
              disabled={!pythonResult}
              className="h-6 text-xs px-2"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Output Content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3">
          {!pythonResult && !isPythonRunning && (
            <div className="text-center py-8 text-muted-foreground">
              <Terminal className="h-8 w-8 mx-auto mb-2 text-amber-400/50" />
              <p className="text-xs font-medium text-foreground">Python Verification Hub</p>
              <p className="text-[11px] mt-1 text-muted-foreground">
                Run test vector generators, stimulus creators, or golden model verifiers
              </p>
              
              {pyFiles.length > 0 ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {pyFiles.map(file => (
                    <Button
                      key={file.id}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => handleRunScript(file.name)}
                    >
                      <Play className="h-3 w-3 mr-1 fill-amber-400" />
                      Run {file.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] mt-3 text-muted-foreground/60">
                  Tip: Add a .py file to your project to verify HDL outputs with Python 3.
                </p>
              )}
            </div>
          )}

          {isPythonRunning && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-md">
              <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
              <div>
                <p className="text-xs font-medium text-amber-400">Executing Python 3 Verification Environment...</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Simulating stimulus and golden checks</p>
              </div>
            </div>
          )}

          {pythonResult && !isPythonRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[#121622] px-3 py-1.5 rounded border border-border/40 text-xs">
                <div className="flex items-center gap-2">
                  {pythonResult.success ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Execution Passed (Exit 0)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
                      <XCircle className="h-3.5 w-3.5" />
                      Execution Failed (Exit {pythonResult.exit_code})
                    </span>
                  )}
                </div>

                {pyFiles.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] text-amber-400 hover:bg-amber-500/10"
                    onClick={() => handleRunScript()}
                  >
                    <Play className="h-3 w-3 mr-1 fill-amber-400" />
                    Re-run
                  </Button>
                )}
              </div>

              <pre className="p-3 rounded bg-black/60 border border-border/40 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed text-zinc-300">
                {pythonResult.output}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
