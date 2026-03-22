'use client';

import { useIDEStore } from '@/store/ide-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface VCDSignal {
  name: string;
  symbol: string;
  width: number;
  values: { time: number; value: string }[];
}

interface VCDData {
  timescale: string;
  signals: VCDSignal[];
  maxTime: number;
}

function parseVCD(content: string): VCDData | null {
  if (!content) return null;
  
  try {
    const lines = content.split('\n');
    const signals: VCDSignal[] = [];
    let timescale = '1ns';
    let maxTime = 0;
    const symbolMap: Record<string, VCDSignal> = {};
    let currentTime = 0;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Parse timescale
      if (trimmed.startsWith('$timescale')) {
        const match = trimmed.match(/\$timescale\s+([^$]+)/);
        if (match) timescale = match[1].trim();
      }
      
      // Parse signal declarations
      if (trimmed.startsWith('$var')) {
        const parts = trimmed.split(/\s+/);
        // Format: $var type width symbol name [range] $end
        if (parts.length >= 5) {
          const width = parseInt(parts[2]) || 1;
          const symbol = parts[3];
          const name = parts[4];
          
          const signal: VCDSignal = {
            name,
            symbol,
            width,
            values: [{ time: 0, value: width > 1 ? '0'.repeat(width) : '0' }]
          };
          signals.push(signal);
          symbolMap[symbol] = signal;
        }
      }
      
      // Parse time
      if (trimmed.startsWith('#')) {
        const timeVal = parseInt(trimmed.slice(1));
        if (!isNaN(timeVal)) {
          currentTime = timeVal;
          if (currentTime > maxTime) maxTime = currentTime;
        }
      }
      
      // Parse value changes
      if (!trimmed.startsWith('$') && !trimmed.startsWith('#')) {
        const firstChar = trimmed[0].toLowerCase();
        if (firstChar === '0' || firstChar === '1' || firstChar === 'x' || firstChar === 'z') {
          // Binary value for 1-bit signal: [value][symbol]
          const value = firstChar;
          const symbol = trimmed.slice(1).trim();
          const signal = symbolMap[symbol];
          if (signal) {
            // Update last value or add new one
            const lastVal = signal.values[signal.values.length - 1];
            if (lastVal && lastVal.time === currentTime) {
              lastVal.value = value;
            } else if (!lastVal || lastVal.value !== value) {
              signal.values.push({ time: currentTime, value });
            }
          }
        } else if (firstChar === 'b') {
          // Binary value for multi-bit signal: b[value] [symbol]
          const parts = trimmed.slice(1).split(/\s+/);
          if (parts.length >= 2) {
            const value = parts[0].toLowerCase();
            const symbol = parts[1];
            const signal = symbolMap[symbol];
            if (signal) {
              const lastVal = signal.values[signal.values.length - 1];
              if (lastVal && lastVal.time === currentTime) {
                lastVal.value = value;
              } else if (!lastVal || lastVal.value !== value) {
                signal.values.push({ time: currentTime, value });
              }
            }
          }
        }
      }
    }

    // Ensure all signals have at least one value and extended to maxTime
    return { timescale, signals, maxTime: Math.max(maxTime, 1) };
  } catch (e) {
    console.error('Failed to parse VCD:', e);
    return null;
  }
}

export function WaveformViewer() {
  const { simulationResult, showWaveform, setShowWaveform } = useIDEStore();
  const [zoom, setZoom] = useState(1);
  const [radix, setRadix] = useState<'bin' | 'dec' | 'hex'>('hex');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformAreaRef = useRef<HTMLDivElement>(null);

  const handlePip = async () => {
    // @ts-ignore
    if (!('documentPictureInPicture' in window)) {
      alert("Picture-in-Picture is not supported in this environment.");
      return;
    }
    
    // @ts-ignore
    if (window.documentPictureInPicture.window) {
      return;
    }

    try {
      // @ts-ignore
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 800,
        height: 600,
      });
      
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...(styleSheet.cssRules as any)].map((rule: any) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch (e) {
          if (styleSheet.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pip.document.head.appendChild(link);
          }
        }
      });
      
      pip.document.documentElement.className = document.documentElement.className;
      pip.document.body.className = document.body.className;
      pip.document.body.classList.add('bg-background');
      
      pip.addEventListener("pagehide", () => {
        setPipWindow(null);
      });
      
      setPipWindow(pip);
    } catch (e) {
      console.error(e);
      alert("Failed to detach waveform window.");
    }
  };

  const formatSignalValue = (val: string, width: number, currentRadix: string) => {
    if (width === 1) return val;
    const cleanVal = val.startsWith('b') ? val.slice(1) : val;
    if (cleanVal.includes('x')) return 'X';
    if (cleanVal.includes('z')) return 'Z';

    try {
      const num = parseInt(cleanVal, 2);
      if (isNaN(num)) return cleanVal;
      switch (currentRadix) {
        case 'dec': return num.toString(10);
        case 'hex': return num.toString(16).toUpperCase();
        case 'bin': return cleanVal;
        default: return cleanVal;
      }
    } catch {
      return cleanVal;
    }
  };

  const getSignalValueAtTime = (signal: VCDSignal, time: number) => {
    if (signal.values.length === 0) return '';
    let latestVal = signal.values[0].value;
    for (const v of signal.values) {
      if (v.time <= time) {
        latestVal = v.value;
      } else {
        break;
      }
    }
    return formatSignalValue(latestVal, signal.width, radix);
  };

  const vcdData = useMemo(() => {
    if (simulationResult?.vcdContent) {
      return parseVCD(simulationResult.vcdContent);
    }
    return null;
  }, [simulationResult]);

  useEffect(() => {
    if (simulationResult?.vcdContent && !showWaveform) {
      setShowWaveform(true);
    }
  }, [simulationResult?.vcdContent, showWaveform, setShowWaveform]);

  if (!showWaveform) return null;

  if (!vcdData || vcdData.signals.length === 0) {
    return (
      <div className="h-full flex flex-col bg-muted/30 border-t border-border">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Waveform Viewer</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center p-8">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No waveform data available</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Run a simulation with $dumpfile to generate waveforms</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/30 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Waveform Viewer</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {vcdData.signals.length} signals
          </span>
          {pipWindow && (
            <span className="text-[10px] text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Detached
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Select value={radix} onValueChange={(v: any) => setRadix(v)}>
            <SelectTrigger className="h-7 w-[80px] text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bin" className="text-[10px]">BIN</SelectItem>
              <SelectItem value="dec" className="text-[10px]">DEC</SelectItem>
              <SelectItem value="hex" className="text-[10px]">HEX</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
            className="h-7 w-7 p-0"
            title="Zoom Out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs px-2 min-w-[40px] text-center">{zoom.toFixed(1)}x</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(10, zoom + 0.5))}
            className="h-7 w-7 p-0"
            title="Zoom In"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(1)}
            className="h-7 w-7 p-0"
            title="Reset Zoom"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          {!pipWindow && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePip}
              className="h-7 w-7 p-0 ml-1 text-blue-500 hover:text-blue-600"
              title="Detach to PIP Window"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {pipWindow ? createPortal(
      <div className="flex-1 flex overflow-hidden w-full h-full" ref={containerRef}>
        {/* Signal Names */}
        <div className="w-48 flex-shrink-0 border-r border-border bg-background flex flex-col z-20">
          <div className="h-8 border-b border-border bg-muted/50 px-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Signal</span>
            <span className="text-[10px] text-muted-foreground">{hoverTime !== null ? `${hoverTime}ns` : ''}</span>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)]">
            {vcdData.signals.map((signal, index) => {
              const currentValue = hoverTime !== null ? getSignalValueAtTime(signal, hoverTime) : null;
              return (
                <div
                  key={`${signal.symbol}-${index}`}
                  className="h-8 border-b border-border/50 px-3 flex items-center hover:bg-muted/50"
                >
                  <span className="text-xs font-mono truncate" title={signal.name}>
                    {signal.name}
                  </span>
                  <span className="ml-1 text-[9px] text-muted-foreground opacity-50">
                    {signal.width > 1 ? `[${signal.width}]` : ''}
                  </span>
                  {currentValue !== null && (
                    <span className="ml-auto text-xs font-mono font-medium text-blue-500">
                      {currentValue}
                    </span>
                  )}
                </div>
              );
            })}
          </ScrollArea>
        </div>

        {/* Waveforms */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {/* Time Ruler */}
          <div className="h-8 border-b border-border bg-muted/50 flex items-end sticky top-0 z-10">
            <div className="flex text-xs text-muted-foreground" style={{ minWidth: `${100 * zoom}%` }}>
              {Array.from({ length: Math.max(5, Math.ceil(10 * zoom)) }, (_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-l border-border pl-1"
                  style={{ width: `${100 / zoom}%` }}
                >
                  {Math.round((i * vcdData.maxTime) / (10 * zoom))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Signal Waveforms */}
          <div 
            style={{ minWidth: `${100 * zoom}%` }}
            ref={waveformAreaRef}
            className="relative cursor-crosshair pb-4"
            onMouseMove={(e) => {
              if (!vcdData || !waveformAreaRef.current) return;
              const rect = waveformAreaRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const width = rect.width;
              let t = Math.round((x / width) * vcdData.maxTime);
              t = Math.max(0, Math.min(t, vcdData.maxTime));
              setHoverTime(t);
            }}
            onMouseLeave={() => setHoverTime(null)}
          >
            {vcdData.signals.map((signal, index) => (
              <div
                key={`${signal.symbol}-${index}`}
                className="h-8 border-b border-border/50 relative"
              >
                <WaveformSignal signal={signal} maxTime={vcdData.maxTime} zoom={zoom} radix={radix} />
              </div>
            ))}

            {/* Tracking Cursor Line */}
            {hoverTime !== null && (
              <div 
                className="absolute top-0 bottom-0 border-l border-red-500 z-30 pointer-events-none"
                style={{ left: `${(hoverTime / vcdData.maxTime) * 100}%` }}
              >
                <div className="absolute top-0 -translate-x-1/2 -mt-4 bg-red-500 text-white text-[9px] px-1 rounded shadow pointer-events-none whitespace-nowrap">
                  {hoverTime} {vcdData.timescale}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>, pipWindow.document.body) : (
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Signal Names */}
        <div className="w-48 flex-shrink-0 border-r border-border bg-background flex flex-col z-20">
          <div className="h-8 border-b border-border bg-muted/50 px-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Signal</span>
            <span className="text-[10px] text-muted-foreground">{hoverTime !== null ? `${hoverTime}ns` : ''}</span>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)]">
            {vcdData.signals.map((signal, index) => {
              const currentValue = hoverTime !== null ? getSignalValueAtTime(signal, hoverTime) : null;
              return (
                <div
                  key={`${signal.symbol}-${index}`}
                  className="h-8 border-b border-border/50 px-3 flex items-center hover:bg-muted/50"
                >
                  <span className="text-xs font-mono truncate" title={signal.name}>
                    {signal.name}
                  </span>
                  <span className="ml-1 text-[9px] text-muted-foreground opacity-50">
                    {signal.width > 1 ? `[${signal.width}]` : ''}
                  </span>
                  {currentValue !== null && (
                    <span className="ml-auto text-xs font-mono font-medium text-blue-500">
                      {currentValue}
                    </span>
                  )}
                </div>
              );
            })}
          </ScrollArea>
        </div>

        {/* Waveforms */}
        <div className="flex-1 overflow-x-auto overflow-y-auto w-full">
          {/* Time Ruler */}
          <div className="h-8 border-b border-border bg-muted/50 flex items-end sticky top-0 z-10 w-full min-w-max">
            <div className="flex text-xs text-muted-foreground" style={{ width: `${Math.max(100, 100 * zoom)}%` }}>
              {Array.from({ length: Math.max(5, Math.ceil(10 * zoom)) }, (_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-l border-border pl-1"
                  style={{ width: `${100 / zoom}%` }}
                >
                  {Math.round((i * vcdData.maxTime) / (10 * zoom))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Signal Waveforms */}
          <div 
            style={{ width: `${Math.max(100, 100 * zoom)}%` }}
            ref={waveformAreaRef}
            className="relative cursor-crosshair pb-4 w-full h-full"
            onMouseMove={(e) => {
              if (!vcdData || !waveformAreaRef.current) return;
              const rect = waveformAreaRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const width = rect.width;
              let t = Math.round((x / width) * vcdData.maxTime);
              t = Math.max(0, Math.min(t, vcdData.maxTime));
              setHoverTime(t);
            }}
            onMouseLeave={() => setHoverTime(null)}
          >
            {vcdData.signals.map((signal, index) => (
              <div
                key={`${signal.symbol}-${index}`}
                className="h-8 border-b border-border/50 relative w-full"
              >
                <WaveformSignal signal={signal} maxTime={vcdData.maxTime} zoom={zoom} radix={radix} />
              </div>
            ))}

            {/* Tracking Cursor Line */}
            {hoverTime !== null && (
              <div 
                className="absolute top-0 bottom-0 border-l border-red-500 z-30 pointer-events-none"
                style={{ left: `${(hoverTime / vcdData.maxTime) * 100}%` }}
              >
                <div className="absolute top-0 -translate-x-1/2 -mt-4 bg-red-500 text-white text-[9px] px-1 rounded shadow pointer-events-none whitespace-nowrap">
                  {hoverTime} {vcdData.timescale}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

interface WaveformSignalProps {
  signal: VCDSignal;
  maxTime: number;
  zoom: number;
  radix?: 'bin' | 'dec' | 'hex';
}

function WaveformSignal({ signal, maxTime, zoom, radix = 'hex' }: WaveformSignalProps) {
  const width = 100 * zoom;
  
  const formatValue = (val: string) => {
    if (signal.width === 1) return val;
    const cleanVal = val.startsWith('b') ? val.slice(1) : val;
    if (cleanVal.includes('x')) return 'X';
    if (cleanVal.includes('z')) return 'Z';

    try {
      const num = parseInt(cleanVal, 2);
      if (isNaN(num)) return cleanVal;
      switch (radix) {
        case 'dec': return num.toString(10);
        case 'hex': return num.toString(16).toUpperCase();
        case 'bin': return cleanVal;
        default: return cleanVal;
      }
    } catch {
      return cleanVal;
    }
  };

  const { pathData, multiBitRegions } = useMemo(() => {
    if (signal.values.length === 0) return { pathData: '', multiBitRegions: [] };
    
    const points: string[] = [];
    const multiBitRegions: { x1: number, x2: number, value: string }[] = [];
    const height = 32;
    const margin = 6;
    
    let lastY = height - margin;
    let lastX = 0;
    
    for (let i = 0; i < signal.values.length; i++) {
      const { time, value } = signal.values[i];
      const x = (time / maxTime) * width;
      
      if (signal.width === 1) {
        const y = value === '1' ? margin : height - margin;
        if (i === 0) {
          points.push(`M 0 ${y}`);
        } else {
          points.push(`L ${x} ${lastY}`);
          points.push(`L ${x} ${y}`);
        }
        lastY = y;
      } else {
        // Multi-bit bus visualization (hexagonal segments)
        if (i > 0) {
          multiBitRegions.push({ x1: lastX, x2: x, value: formatValue(signal.values[i-1].value) });
        }
      }
      lastX = x;
    }
    
    // Add final region
    if (signal.width > 1) {
      multiBitRegions.push({ x1: lastX, x2: width, value: formatValue(signal.values[signal.values.length - 1].value) });
    } else {
      points.push(`L ${width} ${lastY}`);
    }
    
    return { pathData: points.join(' '), multiBitRegions };
  }, [signal, maxTime, width, radix]);

  return (
    <svg className="w-full h-full" viewBox={`0 0 ${width} 32`} preserveAspectRatio="none">
      {/* Background grid */}
      {zoom >= 1 && Array.from({ length: Math.max(5, Math.ceil(10 * zoom)) }, (_, i) => (
        <line
          key={i}
          x1={(i * width) / (10 * zoom)}
          y1="0"
          x2={(i * width) / (10 * zoom)}
          y2="32"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-border/30"
        />
      ))}
      
      {/* Single bit signal waveform */}
      {signal.width === 1 ? (
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-green-500"
        />
      ) : (
        /* Multi-bit bus visualization */
        multiBitRegions.map((region, i) => {
          const { x1, x2, value } = region;
          if (x1 >= x2) return null;
          
          const h = 20;
          const y1 = (32 - h) / 2;
          const y2 = y1 + h;
          const taper = 4;
          
          const d = `M ${x1} ${y1+h/2} 
                     L ${Math.min(x1 + taper, x2)} ${y1} 
                     L ${Math.max(x1, x2 - taper)} ${y1} 
                     L ${x2} ${y1+h/2} 
                     L ${Math.max(x1, x2 - taper)} ${y2} 
                     L ${Math.min(x1 + taper, x2)} ${y2} Z`;
          
          return (
            <g key={i}>
              <path
                d={d}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
                className="text-blue-500/20 stroke-blue-500"
              />
              {x2 - x1 > 20 && (
                <text
                  x={(x1 + x2) / 2}
                  y="20"
                  textAnchor="middle"
                  className="text-[10px] fill-foreground font-mono select-none"
                >
                  {value}
                </text>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}
