// =============================================
// CForge — Browser C IDE
// Application Logic
// =============================================

import { init, Wasmer, Directory } from "https://cdn.jsdelivr.net/npm/@wasmer/sdk@0.10.0/dist/index.mjs";

// Initialize Mermaid with dark theme variables matching our UI
if (typeof mermaid !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    themeVariables: {
      background: "#0f1420",
      primaryColor: "#1a2137",
      primaryTextColor: "#e4e8f1",
      primaryBorderColor: "#6C5CE7",
      lineColor: "#8892a8",
      secondaryColor: "#151b2b",
      tertiaryColor: "#1e2740"
    },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: "basis"
    }
  });
}

// ---- State ----
const state = {
  sdkReady: false,
  clang: null,
  editor: null,
  compiledBinary: null,
  isCompiling: false,
  isRunning: false,
  projectDir: null,
  language: "c",
  activeCompileInstance: null,
};

// ---- DOM refs ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  loadingOverlay: $("#loading-overlay"),
  loaderStatus:   $("#loader-status"),
  app:            $("#app"),
  sdkBadge:       $("#sdk-badge"),
  editorContainer:$("#editor-container"),
  consoleOutput:  $("#console-output"),
  programOutput:  $("#program-output"),
  statusState:    $("#status-state"),
  statusCursor:   $("#status-cursor"),
  statusWasm:     $("#status-wasm-size"),
  unsavedDot:     $("#unsaved-dot"),
  tabName:        $("#editor-tab-name"),
  titleFilename:  $("#titlebar-filename"),
  examplesModal:  $("#examples-modal"),
  examplesList:   $("#examples-list"),
  btnCompile:     $("#btn-compile"),
  btnRun:         $("#btn-run"),
  btnCompileRun:  $("#btn-compile-run"),
  btnNew:         $("#btn-new"),
  btnExamples:    $("#btn-examples"),
  btnClearConsole:$("#btn-clear-console"),
  modalClose:     $("#modal-close"),
  tabConsole:     $("#tab-console"),
  tabOutput:      $("#tab-output"),
  tabAlgorithm:   $("#tab-algorithm"),
  tabFlowchart:   $("#tab-flowchart"),
  algorithmOutput:$("#algorithm-output"),
  flowchartOutput:$("#flowchart-output"),
  selectLanguage: $("#select-language"),
};

// ---- Examples ----
const EXAMPLES = [
  {
    title: "Hello World",
    description: "Classic first C program — prints a greeting to stdout.",
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  {
    title: "Fibonacci Sequence",
    description: "Computes and prints the first 20 Fibonacci numbers.",
    code: `#include <stdio.h>

int main() {
    int n = 20;
    long long a = 0, b = 1;

    printf("Fibonacci Sequence (first %d terms):\\n", n);
    for (int i = 0; i < n; i++) {
        printf("  F(%2d) = %lld\\n", i, a);
        long long temp = a + b;
        a = b;
        b = temp;
    }
    return 0;
}
`,
  },
  {
    title: "Bubble Sort",
    description: "Sorts an array of integers using the bubble sort algorithm.",
    code: `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

void printArray(int arr[], int n) {
    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
    printf("\\n");
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);

    printf("Original array: ");
    printArray(arr, n);

    bubbleSort(arr, n);

    printf("Sorted array:   ");
    printArray(arr, n);
    return 0;
}
`,
  },
  {
    title: "String Manipulation",
    description: "Demonstrates string reversal, length, and character counting.",
    code: `#include <stdio.h>
#include <string.h>

void reverseString(char *str) {
    int len = strlen(str);
    for (int i = 0; i < len / 2; i++) {
        char temp = str[i];
        str[i] = str[len - 1 - i];
        str[len - 1 - i] = temp;
    }
}

int countVowels(const char *str) {
    int count = 0;
    for (int i = 0; str[i]; i++) {
        char c = str[i];
        if (c == 'a' || c == 'e' || c == 'i' ||
            c == 'o' || c == 'u' || c == 'A' ||
            c == 'E' || c == 'I' || c == 'O' || c == 'U')
            count++;
    }
    return count;
}

int main() {
    char text[] = "CForge Browser IDE";

    printf("Original:  \\"%s\\"\\n", text);
    printf("Length:    %lu\\n", (unsigned long)strlen(text));
    printf("Vowels:   %d\\n", countVowels(text));

    reverseString(text);
    printf("Reversed:  \\"%s\\"\\n", text);
    return 0;
}
`,
  },
  {
    title: "Pattern Printing",
    description: "Prints a diamond pattern using nested loops.",
    code: `#include <stdio.h>

int main() {
    int n = 7;

    // Upper half
    for (int i = 1; i <= n; i += 2) {
        for (int j = 0; j < (n - i) / 2; j++)
            printf(" ");
        for (int j = 0; j < i; j++)
            printf("*");
        printf("\\n");
    }

    // Lower half
    for (int i = n - 2; i >= 1; i -= 2) {
        for (int j = 0; j < (n - i) / 2; j++)
            printf(" ");
        for (int j = 0; j < i; j++)
            printf("*");
        printf("\\n");
    }

    return 0;
}
`,
  },
  {
    title: "Calculator",
    description: "A simple four-operation calculator with hardcoded test values.",
    code: `#include <stdio.h>

double calculate(double a, double b, char op) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
            if (b == 0) {
                printf("Error: Division by zero!\\n");
                return 0;
            }
            return a / b;
        default:
            printf("Error: Unknown operator '%c'\\n", op);
            return 0;
    }
}

int main() {
    double a = 42.5, b = 7.3;
    char ops[] = {'+', '-', '*', '/'};

    printf("=== Simple Calculator ===\\n\\n");
    for (int i = 0; i < 4; i++) {
        printf("  %.2f %c %.2f = %.4f\\n",
               a, ops[i], b, calculate(a, b, ops[i]));
    }
    return 0;
}
`,
  },
];

// Append C++ examples programmatically
EXAMPLES.push(
  {
    lang: "cpp",
    title: "Hello World (C++)",
    description: "Standard C++ greeting program optimized for compile speed.",
    code: `#include <cstdio>\n\nint main() {\n    std::printf("Hello, C++ World!\\n");\n    return 0;\n}\n`
  },
  {
    lang: "cpp",
    title: "Vector Sorting",
    description: "Demonstrates std::vector, range-based for loops, and std::sort.",
    code: `#include <cstdio>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> numbers = {42, 17, 93, 8, 55};\n    \n    std::printf("Unsorted elements:\\n");\n    for (int num : numbers) {\n        std::printf(" %d", num);\n    }\n    std::printf("\\n");\n    \n    std::sort(numbers.begin(), numbers.end());\n    \n    std::printf("Sorted elements:\\n");\n    for (int num : numbers) {\n        std::printf(" %d", num);\n    }\n    std::printf("\\n");\n    \n    return 0;\n}\n`
  },
  {
    lang: "cpp",
    title: "OOP & Polymorphism",
    description: "Simple class hierarchy demonstrating virtual inheritance.",
    code: `#include <cstdio>\n\nclass Shape {\nprotected:\n    const char* name;\npublic:\n    Shape(const char* n) : name(n) {}\n    virtual void draw() {\n        std::printf("Drawing shape: %s\\n", name);\n    }\n    virtual ~Shape() {}\n};\n\nclass Circle : public Shape {\nprivate:\n    double radius;\npublic:\n    Circle(const char* n, double r) : Shape(n), radius(r) {}\n    void draw() override {\n        std::printf("Drawing circle: %s with radius %.1f\\n", name, radius);\n    }\n};\n\nint main() {\n    Shape* s1 = new Shape("Generic Polygon");\n    Shape* s2 = new Circle("MyCircle", 5.5);\n    \n    s1->draw();\n    s2->draw();\n    \n    delete s1;\n    delete s2;\n    return 0;\n}\n`
  }
);

// Default to 'c' for examples missing a language tag
EXAMPLES.forEach(ex => {
  if (!ex.lang) ex.lang = "c";
});

// ---- Utility: Console Logging ----
function timestamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function logToConsole(msg, type = "info") {
  const line = document.createElement("div");
  line.className = `output-line ${type}`;
  line.innerHTML = `<span class="timestamp">[${timestamp()}]</span>${escapeHtml(msg)}`;
  dom.consoleOutput.appendChild(line);
  dom.consoleOutput.scrollTop = dom.consoleOutput.scrollHeight;
}

function logToProgram(msg, type = "stdout") {
  const line = document.createElement("div");
  line.className = `output-line ${type}`;
  line.textContent = msg;
  dom.programOutput.appendChild(line);
  dom.programOutput.scrollTop = dom.programOutput.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---- Promise Timeout Helper ----
function promiseWithTimeout(promise, ms, errorMsg = "Operation timed out") {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]);
}

// ---- Status Management ----
function setStatus(label, iconClass) {
  const iconEl = dom.statusState.querySelector(".status-icon");
  iconEl.className = `status-icon ${iconClass}`;
  dom.statusState.lastChild.textContent = ` ${label}`;
}

function setButtonStates(compiling, hasWasm) {
  if (compiling) {
    dom.btnCompile.classList.remove("btn-primary");
    dom.btnCompile.classList.add("btn-danger");
    dom.btnCompile.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      </svg>
      <span>Stop</span>
    `;
    dom.btnCompile.disabled = false;
    dom.btnCompile.title = "Stop Compilation";
  } else {
    dom.btnCompile.classList.add("btn-primary");
    dom.btnCompile.classList.remove("btn-danger");
    dom.btnCompile.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>Compile</span>
    `;
    dom.btnCompile.disabled = false;
    dom.btnCompile.title = "Compile (Ctrl+B)";
  }

  dom.btnRun.disabled        = compiling || !hasWasm;
  dom.btnCompileRun.disabled = compiling;
}

// ---- Progress Bar ----
function showProgressBar() {
  removeProgressBar();
  const bar = document.createElement("div");
  bar.className = "compiling-bar";
  bar.id = "compile-progress";
  dom.editorContainer.appendChild(bar);
}

function completeProgressBar(success) {
  const bar = $("#compile-progress");
  if (bar) {
    bar.classList.add("done");
    bar.style.background = success
      ? "var(--grad-success)"
      : "var(--grad-danger)";
    setTimeout(() => bar.remove(), 800);
  }
}

function removeProgressBar() {
  const existing = $("#compile-progress");
  if (existing) existing.remove();
}

// ---- SDK Initialization ----
async function initSDK() {
  logToConsole("--- System Initialization Started ---", "system");
  
  // Browser Features Check
  const coopEnabled = window.crossOriginIsolated;
  const sabSupported = typeof SharedArrayBuffer !== "undefined";
  logToConsole(`[Browser] Cross-Origin Isolation status: ${coopEnabled ? "ENABLED" : "DISABLED"}`, coopEnabled ? "success" : "error");
  logToConsole(`[Browser] SharedArrayBuffer support: ${sabSupported ? "SUPPORTED" : "UNSUPPORTED"}`, sabSupported ? "success" : "error");
  
  if (!coopEnabled || !sabSupported) {
    logToConsole("[Warning] Browser is not in a Secure Cross-Origin Isolated context. Wasmer multithreading may fail to spin up workers.", "warning");
  }

  const initStart = performance.now();

  try {
    dom.loaderStatus.textContent = "Loading Wasmer runtime…";
    logToConsole("[Wasmer] Loading runtime WebAssembly modules...", "info");
    const wasmInitStart = performance.now();
    await init();
    logToConsole(`[Wasmer] Runtime initialized in ${(performance.now() - wasmInitStart).toFixed(1)}ms`, "success");

    logToConsole("[VFS] Initializing persistent workspace directory...", "info");
    state.projectDir = new Directory();

    dom.loaderStatus.textContent = "Loading local Clang compiler…";
    logToConsole("[Compiler] Fetching local clang.webc archive (105MB)...", "info");
    const fetchStart = performance.now();
    const response = await fetch("clang.webc", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch clang.webc: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    logToConsole(`[Compiler] Download completed: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB in ${(performance.now() - fetchStart).toFixed(1)}ms`, "success");

    logToConsole("[Compiler] Instantiating Clang compiler package (parsing WebC container)...", "info");
    const parseStart = performance.now();
    state.clang = await Wasmer.fromFile(new Uint8Array(arrayBuffer));
    logToConsole(`[Compiler] Package loaded and compiled in ${(performance.now() - parseStart).toFixed(1)}ms`, "success");

    state.sdkReady = true;
    dom.sdkBadge.classList.add("connected");
    setStatus("Ready", "idle");
    logToConsole(`Success: System initialized successfully in ${(performance.now() - initStart).toFixed(1)}ms!`, "success");
    logToConsole("Ready for offline compilation of C and C++ programs.", "info");
    
    // Hide loading overlay with smooth transition
    setTimeout(() => {
      dom.loadingOverlay.style.opacity = "0";
      dom.loadingOverlay.style.transition = "opacity 0.4s ease";
      setTimeout(() => {
        dom.loadingOverlay.classList.add("hidden");
        dom.app.classList.remove("hidden");
      }, 400);
    }, 500);
  } catch (err) {
    dom.loaderStatus.textContent = "Failed to initialize SDK.";
    dom.loaderStatus.style.color = "#FF6B6B";
    logToConsole(`Error during system initialization: ${err.message}`, "error");
    console.error("Initialization error:", err);

    // Still reveal app so user can see console
    setTimeout(() => {
      dom.loadingOverlay.classList.add("hidden");
      dom.app.classList.remove("hidden");
    }, 2000);
  }
}

// ---- Compilation ----
function stopCompilation() {
  if (!state.isCompiling) return;
  
  logToConsole("--- Compilation Interrupted by User ---", "warning");
  if (state.activeCompileInstance) {
    try {
      state.activeCompileInstance.free();
    } catch (e) {
      console.warn("Error freeing compile instance:", e);
    }
    state.activeCompileInstance = null;
  }
  
  state.isCompiling = false;
  completeProgressBar(false);
  setStatus("Cancelled", "error");
  setButtonStates(false, false);
}

async function compile() {
  if (!state.sdkReady) return;
  
  if (state.isCompiling) {
    stopCompilation();
    return;
  }

  state.isCompiling = true;
  state.compiledBinary = null;
  state.activeCompileInstance = null;
  setStatus("Compiling…", "compiling");
  setButtonStates(true, false);
  showProgressBar();
  dom.statusWasm.style.display = "none";

  const sourceCode = state.editor.getValue();
  logToConsole("--- Compilation Process Started ---", "system");
  logToConsole(`Source Language: ${state.language.toUpperCase()}`, "info");
  logToConsole(`Source Length: ${sourceCode.length} characters`, "info");
  if (state.language === 'cpp') {
    logToConsole("[Tip] Including standard C++ headers like <iostream>, <vector>, or <algorithm> adds significant compilation overhead inside the browser's virtual filesystem. Consider using <cstdio> (std::printf) or custom implementations for faster builds.", "warning");
  }

  const compileStart = performance.now();

  try {
    const ext = state.language === 'cpp' ? 'cpp' : 'c';
    const filename = `main.${ext}`;
    
    logToConsole(`[VFS] Writing main code to virtual file "/project/${filename}"...`, "info");
    const vfsWriteStart = performance.now();
    await state.projectDir.writeFile(filename, sourceCode);
    if (!state.isCompiling) return;
    logToConsole(`[VFS] Write completed in ${(performance.now() - vfsWriteStart).toFixed(1)}ms`, "info");

    let compileArgs = [];
    if (state.language === 'cpp') {
      // Use -O0 and disable exceptions/RTTI to fit within browser/Wasmer WASM memory limits
      compileArgs.push("-O0", "-fno-spell-checking", "-fno-exceptions", "-fno-rtti", "-x", "c++", `/project/${filename}`, "-o", "/project/main.wasm", "-lc++", "-lc++abi");
    } else {
      compileArgs.push("-O1", "-fno-spell-checking", `/project/${filename}`, "-o", "/project/main.wasm");
    }

    logToConsole(`[Clang] Running compilation command: clang ${compileArgs.join(" ")}`, "system");
    const clangRunStart = performance.now();
    const instance = await state.clang.entrypoint.run({
      args: compileArgs,
      mount: { "/project": state.projectDir },
    });

    if (!state.isCompiling) return;
    state.activeCompileInstance = instance;

    logToConsole(`[Clang] Compiler process instantiated. Waiting for compilation to finish...`, "info");
    const output = await instance.wait();
    if (!state.isCompiling) return;
    state.activeCompileInstance = null;
    logToConsole(`[Clang] Process finished in ${(performance.now() - clangRunStart).toFixed(1)}ms with exit code ${output.code}`, "info");

    // Capture stderr for errors/warnings
    if (output.stderr) {
      const errText = typeof output.stderr === "string"
        ? output.stderr
        : new TextDecoder().decode(output.stderr);
      if (errText.trim()) {
        logToConsole(`[Clang] Diagnostics Output:`, "warning");
        errText.trim().split("\n").forEach((line) => {
          logToConsole(`  ${line}`, line.toLowerCase().includes("error") ? "error" : "warning");
        });
      }
    }

    if (output.ok) {
      logToConsole(`[VFS] Reading compiled executable "/project/main.wasm" from virtual filesystem...`, "info");
      const vfsReadStart = performance.now();
      const wasmBinary = await state.projectDir.readFile("main.wasm");
      if (!state.isCompiling) return;
      logToConsole(`[VFS] Read completed in ${(performance.now() - vfsReadStart).toFixed(1)}ms`, "info");
      state.compiledBinary = wasmBinary;

      completeProgressBar(true);
      setStatus("Compiled", "success");
      logToConsole(`Success: Program compiled to WebAssembly (${wasmBinary.byteLength.toLocaleString()} bytes) in ${(performance.now() - compileStart).toFixed(1)}ms!`, "success");
      
      dom.statusWasm.textContent = `WASM: ${wasmBinary.byteLength.toLocaleString()} bytes`;
      dom.statusWasm.style.display = "inline-flex";
      setButtonStates(false, true);
    } else {
      completeProgressBar(false);
      setStatus("Error", "error");
      logToConsole(`Error: Compilation process returned exit status code ${output.code}`, "error");
      setButtonStates(false, false);
    }
  } catch (err) {
    if (!state.isCompiling) return;
    completeProgressBar(false);
    setStatus("Error", "error");
    logToConsole(`Compilation failed with exception: ${err.message}`, "error");
    console.error("Compile error:", err);
    setButtonStates(false, false);
  } finally {
    if (state.isCompiling) {
      state.isCompiling = false;
      state.activeCompileInstance = null;
    }
  }
}

// ---- Run Compiled WASM ----
async function runWasm() {
  if (!state.compiledBinary || state.isRunning) return;

  state.isRunning = true;
  setStatus("Running…", "running");
  dom.programOutput.innerHTML = "";
  switchTab("output");
  
  logToConsole("--- Execution Process Started ---", "system");
  const runStart = performance.now();

  try {
    logToConsole(`[WebAssembly] Compiling ${state.compiledBinary.byteLength.toLocaleString()} byte binary...`, "info");
    const wasmCompStart = performance.now();
    const module = await WebAssembly.compile(state.compiledBinary);
    logToConsole(`[WebAssembly] Native compilation completed in ${(performance.now() - wasmCompStart).toFixed(1)}ms`, "info");

    logToConsole(`[Wasmer] Creating WASI worker package from compiled binary...`, "info");
    const pkgStart = performance.now();
    const pkg = await Wasmer.fromFile(state.compiledBinary);
    logToConsole(`[Wasmer] Package initialized in ${(performance.now() - pkgStart).toFixed(1)}ms`, "info");

    logToConsole(`[Wasmer] Spawning process and running entrypoint...`, "info");
    const execStart = performance.now();
    const instance = await pkg.entrypoint.run();
    
    logToConsole(`[Wasmer] Process spawned. Awaiting output...`, "info");
    const result = await instance.wait();
    logToConsole(`[Wasmer] Process execution completed in ${(performance.now() - execStart).toFixed(1)}ms with exit code ${result.code}`, "info");

    if (result.stdout) {
      const stdoutText = typeof result.stdout === "string"
        ? result.stdout
        : new TextDecoder().decode(result.stdout);
      if (stdoutText.trim()) {
        logToConsole(`[Wasmer] Captured stdout output:`, "info");
        stdoutText.split("\n").forEach((line) => {
          if (line) {
            logToProgram(line, "stdout");
            logToConsole(`  [stdout] ${line}`, "info");
          }
        });
      }
    }

    if (result.stderr) {
      const stderrText = typeof result.stderr === "string"
        ? result.stderr
        : new TextDecoder().decode(result.stderr);
      if (stderrText.trim()) {
        logToConsole(`[Wasmer] Captured stderr output:`, "warning");
        stderrText.split("\n").forEach((line) => {
          if (line) {
            logToProgram(line, "error");
            logToConsole(`  [stderr] ${line}`, "warning");
          }
        });
      }
    }

    const exitCode = result.code ?? 0;
    logToConsole(`Success: Program execution finished in ${(performance.now() - runStart).toFixed(1)}ms (exit code ${exitCode})`, exitCode === 0 ? "success" : "warning");
    setStatus("Ready", "idle");
  } catch (err) {
    logToConsole(`Runtime execution failed with exception: ${err.message}`, "error");
    logToProgram(`Runtime Error: ${err.message}`, "error");
    setStatus("Error", "error");
    console.error("Run error:", err);
  } finally {
    state.isRunning = false;
  }
}

// ---- Compile & Run ----
async function compileAndRun() {
  await compile();
  if (state.compiledBinary) {
    await runWasm();
  }
}

// ---- Tab Switching ----
function switchTab(tab) {
  dom.tabConsole.classList.toggle("active", tab === "console");
  dom.tabOutput.classList.toggle("active",  tab === "output");
  dom.tabAlgorithm.classList.toggle("active", tab === "algorithm");
  dom.tabFlowchart.classList.toggle("active", tab === "flowchart");
  
  dom.consoleOutput.classList.toggle("active", tab === "console");
  dom.programOutput.classList.toggle("active", tab === "output");
  dom.algorithmOutput.classList.toggle("active", tab === "algorithm");
  dom.flowchartOutput.classList.toggle("active", tab === "flowchart");
}

function setupEditor(callback) {
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    state.editor = monaco.editor.create(dom.editorContainer, {
      value: EXAMPLES[0].code,
      language: 'c',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      minimap: { enabled: true },
      lineNumbers: 'on',
      tabSize: 4,
      insertSpaces: true,
      wordWrap: 'off'
    });

    // Track cursor position
    state.editor.onDidChangeCursorPosition((e) => {
      const { lineNumber, column } = e.position;
      dom.statusCursor.textContent = `Ln ${lineNumber}, Col ${column}`;
    });

    // Track unsaved changes
    let savedValue = state.editor.getValue();
    let renderTimeout;
    state.editor.onDidChangeModelContent(() => {
      const changed = state.editor.getValue() !== savedValue;
      dom.unsavedDot.style.display = changed ? "inline-block" : "none";
      
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        renderFlowchartAndAlgorithm();
      }, 800);
    });

    // Keyboard shortcuts
    state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => compile());
    state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runWasm());
    state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => compileAndRun());

    if (callback) callback();
  });
}

// ---- Resize Handle ----
function setupResize() {
  const handle = $("#resize-handle");
  const editorPanel = $(".editor-panel");
  const mainContent = $(".main-content");
  let isResizing = false;

  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    handle.classList.add("active");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const rect = mainContent.getBoundingClientRect();
    const ratio = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(Math.max(ratio, 25), 80);
    editorPanel.style.flex = `0 0 ${clamped}%`;
    state.editor.layout();
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      handle.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      state.editor.layout();
    }
  });
}

// ---- Examples Modal ----
function renderExamples() {
  const filtered = EXAMPLES.map((ex, i) => ({ ex, originalIndex: i }))
    .filter(item => item.ex.lang === state.language);
  
  dom.examplesList.innerHTML = filtered.map(
    (item) => `
    <div class="example-card" data-index="${item.originalIndex}">
      <h4>${item.ex.title}</h4>
      <p>${item.ex.description}</p>
    </div>
  `
  ).join("");
}

function setupExamples() {
  dom.examplesList.addEventListener("click", (e) => {
    const card = e.target.closest(".example-card");
    if (!card) return;
    const idx = parseInt(card.dataset.index);
    state.editor.setValue(EXAMPLES[idx].code);
    dom.examplesModal.classList.add("hidden");
    state.compiledBinary = null;
    setButtonStates(false, false);
    dom.statusWasm.style.display = "none";
    setStatus("Ready", "idle");
    logToConsole(`Loaded example: ${EXAMPLES[idx].title}`, "info");
    renderFlowchartAndAlgorithm();
  });
}

// ---- Event Binding ----
function bindEvents() {
  dom.btnCompile.addEventListener("click", compile);
  dom.btnRun.addEventListener("click", runWasm);
  dom.btnCompileRun.addEventListener("click", compileAndRun);

  dom.btnNew.addEventListener("click", () => {
    const defaultCode = state.language === 'cpp'
      ? `#include <iostream>\n\nint main() {\n    \n    return 0;\n}\n`
      : `#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n`;
    state.editor.setValue(defaultCode);
    state.compiledBinary = null;
    setButtonStates(false, false);
    dom.statusWasm.style.display = "none";
    setStatus("Ready", "idle");
    logToConsole("Created new file.", "info");
    state.editor.setPosition({ lineNumber: 4, column: 5 });
    state.editor.focus();
    renderFlowchartAndAlgorithm();
  });

  dom.btnExamples.addEventListener("click", () => {
    renderExamples();
    dom.examplesModal.classList.remove("hidden");
  });

  // Language Select Event Listener
  dom.selectLanguage.addEventListener("change", (e) => {
    const newLang = e.target.value;
    if (newLang === state.language) return;

    state.language = newLang;
    monaco.editor.setModelLanguage(state.editor.getModel(), newLang === 'cpp' ? 'cpp' : 'c');
    
    const ext = newLang === 'cpp' ? 'cpp' : 'c';
    dom.tabName.textContent = `main.${ext}`;
    dom.titleFilename.textContent = `main.${ext}`;
    
    state.compiledBinary = null;
    setButtonStates(false, false);
    dom.statusWasm.style.display = "none";
    setStatus("Ready", "idle");
    
    const defaultCode = newLang === 'cpp'
      ? `#include <cstdio>\n\nint main() {\n    std::printf("Hello, C++!\\n");\n    return 0;\n}\n`
      : `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`;
    state.editor.setValue(defaultCode);
    
    logToConsole(`Switched language to ${newLang === 'cpp' ? 'C++' : 'C'}.`, "info");
    renderFlowchartAndAlgorithm();
  });

  dom.modalClose.addEventListener("click", () => {
    dom.examplesModal.classList.add("hidden");
  });

  dom.examplesModal.addEventListener("click", (e) => {
    if (e.target === dom.examplesModal) {
      dom.examplesModal.classList.add("hidden");
    }
  });

  dom.btnClearConsole.addEventListener("click", () => {
    dom.consoleOutput.innerHTML = "";
    dom.programOutput.innerHTML = "";
    logToConsole("Console cleared.", "info");
  });

  dom.tabConsole.addEventListener("click", () => switchTab("console"));
  dom.tabOutput.addEventListener("click",  () => switchTab("output"));
  dom.tabAlgorithm.addEventListener("click", () => switchTab("algorithm"));
  dom.tabFlowchart.addEventListener("click", () => switchTab("flowchart"));

  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      compile();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      compileAndRun();
    }
    if (e.key === "Escape") {
      dom.examplesModal.classList.add("hidden");
    }
  });
}

// ---- Bootstrap ----
function boot() {
  setupEditor(() => {
    setupResize();
    setupExamples();
    bindEvents();
    renderFlowchartAndAlgorithm();
    initSDK();
  });
}

// Wait for DOM + CodeMirror
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

// ---- Flowchart and Algorithm Helpers ----
function renderFlowchartAndAlgorithm() {
  if (!state.editor) return;
  const sourceCode = state.editor.getValue();
  if (!sourceCode) return;

  try {
    const analysis = parseCodeToFlow(sourceCode, state.language);
    
    // 1. Render Algorithm using pseudocode.js
    const latex = parseCodeToPseudocode(sourceCode, state.language);
    dom.algorithmOutput.innerHTML = `
      <div class="algorithm-container active" style="padding:16px;">
        <div id="latex-algorithm" class="pseudocode-pre" style="background:var(--bg-secondary); border:1px solid var(--border-default); padding:16px; border-radius:var(--radius-md); font-family:var(--font-ui);">
          ${escapeHtml(latex)}
        </div>
      </div>
    `;
    
    if (typeof pseudocode !== 'undefined') {
      pseudocode.renderElement(document.getElementById("latex-algorithm"), {
        lineNumber: true,
        lineNumberFrame: true,
        captionCount: 0
      });
    }
    
    // 2. Render Flowchart using Mermaid
    const mermaidCode = generateMermaidGraph(analysis.nodes, analysis.links);
    dom.flowchartOutput.innerHTML = `
      <div class="mermaid-container" style="display:flex; justify-content:center; align-items:center; min-height:300px; padding:16px; overflow:auto; background:var(--bg-secondary); border:1px solid var(--border-default); border-radius:var(--radius-md);">
        <pre class="mermaid" id="flowchart-mermaid" style="background:transparent; margin:0; overflow:visible;">
          ${escapeHtml(mermaidCode)}
        </pre>
      </div>
    `;
    
    if (typeof mermaid !== 'undefined') {
      mermaid.run({
        nodes: [document.getElementById("flowchart-mermaid")]
      });
    }
  } catch (err) {
    console.error("Analysis generation error:", err);
  }
}

function conditionToNaturalLanguage(cond) {
  if (!cond) return "";
  let clean = cond.trim();
  
  // Replace comparison operators
  clean = clean
    .replace(/\s*==\s*/g, " equal to ")
    .replace(/\s*!=\s*/g, " not equal to ")
    .replace(/\s*<=\s*/g, " less than or equal to ")
    .replace(/\s*>=\s*/g, " greater than or equal to ")
    .replace(/\s*<\s*/g, " less than ")
    .replace(/\s*>\s*/g, " greater than ");
    
  // Replace logical operators
  clean = clean
    .replace(/\s*&&\s*/g, " and ")
    .replace(/\s*\|\|\s*/g, " or ");
    
  return clean;
}

function toNaturalLanguage(stmt) {
  if (!stmt) return "";
  let clean = stmt.replace(";", "").replace("std::", "").trim();
  
  if (clean.startsWith("return ") || clean === "return" || clean.startsWith("exit")) {
    const val = clean.replace(/return|exit|\(|\)/g, "").trim();
    return val ? `Return ${val}` : "Exit";
  }
  
  if (clean.includes("printf") || clean.includes("cout")) {
    let printClean = cleanPrintStatement(clean);
    if (printClean.startsWith('"') && printClean.endsWith('"')) {
      printClean = printClean.substring(1, printClean.length - 1);
    }
    return `Print ${printClean}`;
  }
  
  if (clean.includes("scanf") || clean.includes("cin")) {
    let vars = clean.replace(/scanf|cin|>>|<<|&|\(|\)/g, "").trim();
    return `Read ${vars}`;
  }
  
  const arrDeclMatch = clean.match(/(?:int|float|double|char|long long)\s+(\w+)\[\]\s*=\s*\{(.*)\}/);
  if (arrDeclMatch) {
    const name = arrDeclMatch[1];
    const elements = arrDeclMatch[2].trim();
    return `Create array "${name}" with elements [${elements}]`;
  }
  
  if (clean.includes("sizeof") && clean.includes("/")) {
    const sizeMatch = clean.match(/(?:int|size_t)\s+(\w+)\s*=\s*sizeof\((\w+)\)\s*\/\s*sizeof/);
    if (sizeMatch) {
      return `Set ${sizeMatch[1]} to size of array "${sizeMatch[2]}"`;
    }
  }
  
  const varDeclMultiple = clean.match(/^(?:int|float|double|char|long long|auto)\s+(.*)/);
  if (varDeclMultiple && !clean.includes("(")) {
    const decls = varDeclMultiple[1].split(",");
    const translatedDecls = decls.map(decl => {
      const parts = decl.split("=");
      if (parts.length === 2) {
        return `"${parts[0].trim()}" to ${parts[1].trim()}`;
      }
      return `"${decl.trim()}"`;
    });
    return `Initialize ${translatedDecls.join(", ")}`;
  }
  
  const funcCallMatch = clean.match(/^(\w+)\s*\((.*)\)$/);
  if (funcCallMatch && !/^(if|for|while|switch)$/.test(funcCallMatch[1])) {
    return `Call function "${funcCallMatch[1]}" with (${funcCallMatch[2]})`;
  }
  
  const assignMatch = clean.match(/^(\w+)\s*(=|\+=|-=|\*=|\/=)\s*(.*)/);
  if (assignMatch) {
    const varName = assignMatch[1];
    const op = assignMatch[2];
    const val = assignMatch[3];
    if (op === "=") {
      return `Set ${varName} to ${val}`;
    } else if (op === "+=") {
      return `Increase ${varName} by ${val}`;
    } else if (op === "-=") {
      return `Decrease ${varName} by ${val}`;
    } else if (op === "*=") {
      return `Multiply ${varName} by ${val}`;
    } else if (op === "/=") {
      return `Divide ${varName} by ${val}`;
    }
  }
  
  if (clean.includes("++")) {
    const varName = clean.replace(/\+/g, "").trim();
    return `Increment ${varName}`;
  }
  if (clean.includes("--")) {
    const varName = clean.replace(/-/g, "").trim();
    return `Decrement ${varName}`;
  }
  
  return clean;
}

function parseCodeToFlow(code, language) {
  let cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");

  let lines = cleanCode.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const steps = [];
  const nodes = [];
  const links = [];

  nodes.push({ id: "start", type: "start", text: "Start" });
  steps.push("Start of program execution.");

  let lastNodeId = "start";
  let ifStack = [];
  let loopStack = [];
  let nodeIdCounter = 1;

  function addNode(type, text, rawLine = "") {
    const id = `node_${nodeIdCounter++}`;
    nodes.push({ id, type, text, rawLine });
    return id;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^(int|void|float|double|char)\s+main\s*\(/) || line === "{" || line === "}") {
      if (line === "}" && loopStack.length > 0) {
        const loop = loopStack.pop();
        links.push({ from: lastNodeId, to: loop.loopNodeId, label: "repeat" });
        lastNodeId = loop.loopNodeId;
        steps.push("Loop iterations completed. Return to check loop condition.");
      }
      continue;
    }

    if (line.startsWith("return") || line.startsWith("exit")) {
      const text = toNaturalLanguage(line);
      const id = addNode("end", text, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`Terminate program execution and exit (${text}).`);
      lastNodeId = id;
      continue;
    }

    const ifMatch = line.match(/^if\s*\((.*)\)/);
    if (ifMatch) {
      const cond = ifMatch[1].trim();
      const id = addNode("decision", `Is ${conditionToNaturalLanguage(cond)}?`, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`Evaluate branch condition: Is "${conditionToNaturalLanguage(cond)}"?`);
      
      ifStack.push({
        decisionNodeId: id,
        prevNodeId: lastNodeId,
        yesBranchNodes: [id],
        noBranchNodes: [],
        currentBranch: "yes"
      });
      lastNodeId = id;
      continue;
    }

    if (line.startsWith("else")) {
      if (ifStack.length > 0) {
        const top = ifStack[ifStack.length - 1];
        top.currentBranch = "no";
        lastNodeId = top.decisionNodeId;
      }
      continue;
    }

    const whileMatch = line.match(/^while\s*\((.*)\)/);
    const forMatch = line.match(/^for\s*\((.*)\)/);
    if (whileMatch || forMatch) {
      const cond = whileMatch ? whileMatch[1].trim() : forMatch[1].split(";")[1]?.trim() || "loop condition";
      const id = addNode("decision", `Loop: Is ${conditionToNaturalLanguage(cond)}?`, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`Check loop condition: Is ${conditionToNaturalLanguage(cond)}?`);
      
      loopStack.push({
        loopNodeId: id,
        entryNodeId: lastNodeId
      });
      lastNodeId = id;
      continue;
    }

    const isIO = line.includes("printf") || line.includes("scanf") || line.includes("cout") || line.includes("cin");
    if (isIO) {
      let desc = "";
      if (line.includes("printf") || line.includes("cout")) {
        desc = "Output: Print text";
      } else {
        desc = "Input: Read variable";
      }
      const text = toNaturalLanguage(line);
      const id = addNode("io", text, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`${desc} ("${text}").`);
      
      if (ifStack.length > 0) {
        const top = ifStack[ifStack.length - 1];
        if (top.currentBranch === "yes") top.yesBranchNodes.push(id);
        else top.noBranchNodes.push(id);
      }
      lastNodeId = id;
      continue;
    }

    if (line.includes("=") || line.match(/^(int|float|double|char|bool|auto|std::vector|vector)\s+\w+/)) {
      const text = toNaturalLanguage(line);
      const id = addNode("process", text, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`Process statement: "${text}".`);
      
      if (ifStack.length > 0) {
        const top = ifStack[ifStack.length - 1];
        if (top.currentBranch === "yes") top.yesBranchNodes.push(id);
        else top.noBranchNodes.push(id);
      }
      lastNodeId = id;
      continue;
    }
  }

  if (ifStack.length > 0) {
    const cond = ifStack.pop();
    const mergeId = addNode("process", "Merge Path");
    
    if (cond.yesBranchNodes.length > 0) {
      links.push({ from: cond.yesBranchNodes[cond.yesBranchNodes.length - 1], to: mergeId });
    } else {
      links.push({ from: cond.decisionNodeId, to: mergeId, label: "yes" });
    }
    
    if (cond.noBranchNodes.length > 0) {
      links.push({ from: cond.noBranchNodes[cond.noBranchNodes.length - 1], to: mergeId });
    } else {
      links.push({ from: cond.decisionNodeId, to: mergeId, label: "no" });
    }
    
    lastNodeId = mergeId;
    steps.push("Branch execution paths merge back to main line.");
  }

  if (lastNodeId !== "start" && !nodes.find(n => n.id === lastNodeId && n.type === "end")) {
    const endId = addNode("end", "End");
    links.push({ from: lastNodeId, to: endId });
    steps.push("End of program execution.");
  }

  return { nodes, links, steps };
}

function generateMermaidGraph(nodes, links) {
  let code = "graph TD\n";
  
  code += "  %% Node definitions\n";
  nodes.forEach(node => {
    let text = escapeMermaidText(node.text);
    if (node.type === "start") {
      code += `  ${node.id}([Start])\n`;
    } else if (node.type === "end") {
      code += `  ${node.id}([${text}])\n`;
    } else if (node.type === "decision") {
      code += `  ${node.id}{"${text}"}\n`;
    } else if (node.type === "io") {
      code += `  ${node.id}[/"${text}"/]\n`;
    } else if (node.type === "process") {
      if (node.text === "Merge Path") {
        code += `  ${node.id}((( )))\n`;
      } else {
        code += `  ${node.id}["${text}"]\n`;
      }
    }
  });

  code += "\n  %% Link definitions\n";
  links.forEach(link => {
    const labelText = link.label ? `|${link.label}|` : "";
    code += `  ${link.from} -->${labelText} ${link.to}\n`;
  });

  code += "\n  %% Styling classes\n";
  code += "  classDef startNode fill:#151b2b,stroke:#00CEC9,stroke-width:2px,color:#e4e8f1,font-weight:bold;\n";
  code += "  classDef endNode fill:#151b2b,stroke:#FF6B6B,stroke-width:2px,color:#e4e8f1,font-weight:bold;\n";
  code += "  classDef decisionNode fill:#1a2137,stroke:#6C5CE7,stroke-width:2px,color:#e4e8f1;\n";
  code += "  classDef ioNode fill:#151b2b,stroke:#00B894,stroke-width:2px,color:#e4e8f1;\n";
  code += "  classDef processNode fill:#151b2b,stroke:#74B9FF,stroke-width:1.5px,color:#e4e8f1;\n";
  code += "  classDef mergeNode fill:#5a6380,stroke:none,color:#e4e8f1;\n";
  
  nodes.forEach(node => {
    if (node.type === "start") {
      code += `  class ${node.id} startNode;\n`;
    } else if (node.type === "end") {
      code += `  class ${node.id} endNode;\n`;
    } else if (node.type === "decision") {
      code += `  class ${node.id} decisionNode;\n`;
    } else if (node.type === "io") {
      code += `  class ${node.id} ioNode;\n`;
    } else if (node.type === "process") {
      if (node.text === "Merge Path") {
        code += `  class ${node.id} mergeNode;\n`;
      } else {
        code += `  class ${node.id} processNode;\n`;
      }
    }
  });

  return code;
}

function escapeMermaidText(text) {
  if (!text) return "";
  return text
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cleanPrintStatement(line) {
  // Try to match printf(format, args...)
  const printfMatch = line.match(/printf\s*\(\s*"((?:\\.|[^"\\])*)"\s*(?:,\s*(.*))?\)/);
  if (printfMatch) {
    const formatStr = printfMatch[1];
    const argsStr = printfMatch[2] ? printfMatch[2].trim() : "";
    
    if (!argsStr) {
      return `"${formatStr}"`;
    }
    
    // Split arguments by comma, keeping track of parenthesis/bracket depth
    const args = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      if (char === '(' || char === '{' || char === '[') depth++;
      else if (char === ')' || char === '}' || char === ']') depth--;
      
      if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      args.push(current.trim());
    }
    
    // Replace C format specifiers: %d, %2d, %lld, %s, %lf, %f, etc.
    let result = "";
    const specifierRegex = /%[-+0 #]?\d*(?:\.\d+)?[hlL]*[diuoxXfFcsSpn]/g;
    
    let lastIndex = 0;
    let argIndex = 0;
    let match;
    
    while ((match = specifierRegex.exec(formatStr)) !== null) {
      // Add the text before the specifier
      result += formatStr.substring(lastIndex, match.index);
      // Replace specifier with the corresponding argument
      if (argIndex < args.length) {
        result += `" + ${args[argIndex]} + "`;
        argIndex++;
      } else {
        result += match[0];
      }
      lastIndex = specifierRegex.lastIndex;
    }
    result += formatStr.substring(lastIndex);
    
    // Wrap and clean up empty strings
    let output = `"${result}"`
      .replace(/^"" \+ /, "")
      .replace(/ \+ ""$/, "")
      .replace(/ \+ "" \+ /g, " + ");
      
    return output;
  }
  
  // Try to match std::cout << ...
  if (line.includes("cout")) {
    let clean = line.replace(/std::cout|cout|<<|;|\s*std::endl|endl/g, " ").trim();
    const parts = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (char === '"' && (i === 0 || clean[i-1] !== '\\')) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          parts.push(current.trim());
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts.join(" + ");
  }
  
  // Fallback: extract double-quoted string if any
  const literalMatch = line.match(/"((?:\\.|[^"\\])*)"/);
  if (literalMatch) {
    return `"${literalMatch[1]}"`;
  }
  
  return line;
}

function parseCodeToPseudocode(code, language) {
  let cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");

  let lines = cleanCode.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  let latex = "\\begin{algorithm}\n";
  latex += `\\caption{Algorithm for main.${language === 'cpp' ? 'cpp' : 'c'}}\n`;
  latex += "\\begin{algorithmic}\n";
  
  let blockStack = [];
  let inMain = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.startsWith("#include") || line.startsWith("using namespace")) {
      continue;
    }
    
    if (line.match(/^(int|void|float|double|char)\s+main\s*\(/)) {
      latex += "\\PROCEDURE{Main}{}\n";
      blockStack.push("procedure");
      inMain = true;
      continue;
    }
    
    if (line === "{") {
      continue;
    }
    
    const forMatch = line.match(/^for\s*\((.*)\)/);
    const whileMatch = line.match(/^while\s*\((.*)\)/);
    if (forMatch) {
      let cond = forMatch[1].trim();
      let loopRange = cond;
      const parts = cond.split(";");
      if (parts.length === 3) {
        const init = parts[0].replace(/^(int|long|size_t)\s+/, "").trim();
        const check = parts[1].trim();
        
        // Try to parse standard for-loop components to make it look like human pseudocode
        const initMatch = init.match(/(\w+)\s*=\s*(.*)/);
        const checkMatch = check.match(/(\w+)\s*(<|<=|>|>=)\s*(.*)/);
        
        if (initMatch && checkMatch && initMatch[1] === checkMatch[1]) {
          const varName = initMatch[1];
          const startVal = initMatch[2];
          const op = checkMatch[2];
          const limit = checkMatch[3];
          
          if (op === "<") {
            const limitMinusOne = isNaN(limit) ? `${limit} - 1` : (parseInt(limit) - 1).toString();
            loopRange = `${varName} = ${startVal} to ${limitMinusOne}`;
          } else if (op === "<=") {
            loopRange = `${varName} = ${startVal} to ${limit}`;
          } else {
            loopRange = `${init} to ${check}`;
          }
        } else {
          loopRange = `${init} to ${check}`;
        }
      }
      latex += `\\FOR{${escapeLatexMath(loopRange)}}\n`;
      blockStack.push("for");
      continue;
    }
    
    if (whileMatch) {
      let cond = whileMatch[1].trim();
      latex += `\\WHILE{${escapeLatexMath(cond)}}\n`;
      blockStack.push("while");
      continue;
    }
    
    const ifMatch = line.match(/^if\s*\((.*)\)/);
    if (ifMatch) {
      let cond = ifMatch[1].trim();
      latex += `\\IF{${escapeLatexMath(cond)}}\n`;
      blockStack.push("if");
      continue;
    }
    
    if (line.startsWith("else if")) {
      const cond = line.match(/if\s*\((.*)\)/)?.[1]?.trim() || "condition";
      latex += `\\ELSIF{${escapeLatexMath(cond)}}\n`;
      continue;
    }
    
    if (line.startsWith("else")) {
      latex += "\\ELSE\n";
      continue;
    }
    
    if (line.startsWith("return") || line.startsWith("exit")) {
      let val = line.replace(/^(return|exit)/, "").replace(";", "").trim();
      latex += `\\RETURN ${escapeLatexMath(val)}\n`;
      continue;
    }
    
    if (line === "}" || line.startsWith("}")) {
      if (blockStack.length > 0) {
        let blockType = blockStack.pop();
        if (blockType === "procedure") {
          latex += "\\ENDPROCEDURE\n";
          inMain = false;
        } else if (blockType === "if") {
          latex += "\\ENDIF\n";
        } else if (blockType === "for") {
          latex += "\\ENDFOR\n";
        } else if (blockType === "while") {
          latex += "\\ENDWHILE\n";
        }
      }
      continue;
    }
    
    if (inMain) {
      const isPrint = line.includes("printf") || line.includes("cout");
      const isScan = line.includes("scanf") || line.includes("cin");
      
      if (isPrint) {
        const content = cleanPrintStatement(line);
        latex += `\\PRINT{${escapeLatexText(content)}}\n`;
      } else if (isScan) {
        let content = line.replace(/scanf|std::cin|cin|<<|>>|;|\(|\)|&/g, "").trim();
        latex += `\\READ{${escapeLatexMath(content)}}\n`;
      } else {
        let stmt = line.replace(";", "").trim();
        stmt = stmt.replace(/\s*=\s*/, " \\gets ");
        stmt = stmt.replace(/^(int|long|float|double|char|bool|auto|std::vector|vector)\s+/, "");
        latex += `\\STATE $${escapeLatexMath(stmt)}$\n`;
      }
    }
  }
  
  while (blockStack.length > 0) {
    let blockType = blockStack.pop();
    if (blockType === "procedure") latex += "\\ENDPROCEDURE\n";
    else if (blockType === "if") latex += "\\ENDIF\n";
    else if (blockType === "for") latex += "\\ENDFOR\n";
    else if (blockType === "while") latex += "\\ENDWHILE\n";
  }
  
  latex += "\\end{algorithmic}\n";
  latex += "\\end{algorithm}";
  return latex;
}

function escapeLatexMath(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/&&/g, " \\text{ and } ")
    .replace(/\|\|/g, " \\text{ or } ")
    .replace(/!=/g, " \\ne ")
    .replace(/<=/g, " \\le ")
    .replace(/>=/g, " \\ge ")
    .replace(/==/g, " = ")
    .replace(/</g, " < ")
    .replace(/>/g, " > ");
}

function escapeLatexText(str) {
  if (!str) return "";
  let cleanStr = str
    .replace(/\\n/g, "")
    .replace(/\\t/g, "  ")
    .replace(/\\"/g, '"');
  
  return cleanStr
    .replace(/\\/g, "\\backslash ")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}");
}
