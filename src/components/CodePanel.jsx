import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useStore } from "../store/useStore.js";

export default function CodePanel() {
  const code = useStore((s) => s.activeCode());
  const step = useStore((s) => s.currentStepObj());
  const setStep = useStore((s) => s.setStep);
  const pause = useStore((s) => s.pause);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const currentLine = step && step.codeLine ? step.codeLine : 0;

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("algoflow-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#141417",
        "editor.lineHighlightBackground": "#1a1a1f",
        "editorLineNumber.foreground": "#3f3f46",
        "editorLineNumber.activeForeground": "#a78bfa",
        "editorGutter.background": "#141417",
        "editor.selectionBackground": "#8b5cf633",
      },
    });
    monaco.editor.setTheme("algoflow-dark");

    // Click a line → jump to the first step on that line.
    editor.onMouseDown((e) => {
      const pos = e.target && e.target.position;
      if (!pos) return;
      const line = pos.lineNumber;
      const steps = useStore.getState().activeSteps();
      const idx = steps.findIndex((s) => s.codeLine === line);
      if (idx >= 0) {
        pause();
        setStep(idx);
      }
    });

    applyDecoration(currentLine);
  };

  const applyDecoration = (line) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    if (!line || line < 1) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "algoflow-active-line",
          glyphMarginClassName: "algoflow-active-glyph",
        },
      },
    ]);
    editor.revealLineInCenterIfOutsideViewport(line);
  };

  useEffect(() => {
    applyDecoration(currentLine);
  }, [currentLine, code]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-slate-300">Source</span>
        <span className="mono text-[10px] text-slate-500">
          {currentLine ? `line ${currentLine}` : "read-only"}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="javascript"
          theme="algoflow-dark"
          value={code}
          onMount={handleMount}
          loading={
            <div className="mono whitespace-pre overflow-auto p-3 text-xs text-slate-300">
              {code}
            </div>
          }
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 12.5,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            glyphMargin: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
            folding: false,
            wordWrap: "on",
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            overviewRulerLanes: 0,
            contextmenu: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
