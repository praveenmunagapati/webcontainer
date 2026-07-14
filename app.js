// =============================================
// CForge — Browser C IDE
// Application Logic
// =============================================

import { init, Wasmer, Directory } from "./node_modules/@wasmer/sdk/dist/index.mjs";

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
  dom.btnCompile.disabled    = compiling;
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
async function compile() {
  if (!state.sdkReady || state.isCompiling) return;

  state.isCompiling = true;
  state.compiledBinary = null;
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

    const compileTimeout = state.language === 'cpp' ? 90000 : 30000;
    logToConsole(`[Clang] Compiler process instantiated. Waiting for compilation to finish (${compileTimeout / 1000}s timeout)...`, "info");
    const output = await promiseWithTimeout(
      instance.wait(),
      compileTimeout,
      "Compilation timed out. The compiler process may have crashed internally or exceeded browser resource limits."
    );
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
      logToConsole(`[VFS] Read completed in ${(performance.now() - vfsReadStart).toFixed(1)}ms`, "info");
      state.compiledBinary = wasmBinary;

      completeProgressBar(true);
      setStatus("Compiled", "success");
      logToConsole(`Success: Program compiled to WebAssembly (${wasmBinary.byteLength.toLocaleString()} bytes) in ${(performance.now() - compileStart).toFixed(1)}ms!`, "success");
      
      dom.statusWasm.textContent = `WASM: ${wasmBinary.byteLength.toLocaleString()} bytes`;
      dom.statusWasm.style.display = "inline-flex";
      setButtonStates(false, true);

      // --- GENERATE FLOWCHART & ALGORITHM ---
      try {
        logToConsole("[Analysis] Generating flowchart and step-by-step algorithm...", "info");
        const analysisStart = performance.now();
        const analysis = parseCodeToFlow(sourceCode, state.language);
        
        // Render Algorithm
        dom.algorithmOutput.innerHTML = `
          <div class="algorithm-container">
            <h3 style="margin-bottom:16px; font-size:15px; font-weight:600; color:var(--text-primary);">Algorithm Steps for main.${state.language === 'cpp' ? 'cpp' : 'c'}</h3>
            <ol class="algorithm-list">
              ${analysis.steps.map(step => `<li class="algorithm-step">${escapeHtml(step)}</li>`).join("")}
            </ol>
          </div>
        `;
        
        // Render Flowchart
        const svgHtml = renderFlowchartToSvg(analysis);
        dom.flowchartOutput.innerHTML = `
          <div class="flowchart-container">
            ${svgHtml}
          </div>
        `;
        logToConsole(`[Analysis] Flowchart and algorithm generated in ${(performance.now() - analysisStart).toFixed(1)}ms`, "success");
      } catch (analErr) {
        console.error("Analysis generation error:", analErr);
        logToConsole(`[Analysis] Failed to generate: ${analErr.message}`, "warning");
      }

      completeProgressBar(true);
      setStatus("Compiled", "success");
      logToConsole(`Error: Compilation process returned exit status code ${output.code}`, "error");
      setButtonStates(false, false);
    }
  } catch (err) {
    completeProgressBar(false);
    setStatus("Error", "error");
    logToConsole(`Compilation failed with exception: ${err.message}`, "error");
    console.error("Compile error:", err);
    setButtonStates(false, false);
  } finally {
    state.isCompiling = false;
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
    
    logToConsole(`[Wasmer] Process spawned. Awaiting output (20s timeout)...`, "info");
    const result = await promiseWithTimeout(
      instance.wait(),
      20000,
      "Program execution timed out."
    );
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
  require.config({ paths: { vs: './node_modules/monaco-editor/min/vs' } });
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
    state.editor.onDidChangeModelContent(() => {
      const changed = state.editor.getValue() !== savedValue;
      dom.unsavedDot.style.display = changed ? "inline-block" : "none";
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
    dom.algorithmOutput.innerHTML = `<div class="tab-placeholder">Compile your code to generate a step-by-step algorithm.</div>`;
    dom.flowchartOutput.innerHTML = `<div class="tab-placeholder">Compile your code to render a control flow diagram.</div>`;
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
      const text = line.replace(";", "").trim();
      const id = addNode("end", text, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`Terminate program execution and exit (${text}).`);
      lastNodeId = id;
      continue;
    }

    const ifMatch = line.match(/^if\s*\((.*)\)/);
    if (ifMatch) {
      const cond = ifMatch[1].trim();
      const id = addNode("decision", `Is ${cond}?`, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`Evaluate branch condition: Is "${cond}"?`);
      
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
      const id = addNode("decision", `Loop: ${cond}`, line);
      links.push({ from: lastNodeId, to: id });
      steps.push(`Check loop condition: ${cond}`);
      
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
      const text = line.replace(";", "").replace("std::", "").trim();
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
      const text = line.replace(";", "").replace("std::", "").trim();
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

function computeLayout(nodes, links) {
  let currentY = 40;
  const positions = {};
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let x = 200;
    let y = currentY;
    
    positions[node.id] = { x, y };
    
    if (node.type === "decision") {
      currentY += 100;
    } else {
      currentY += 80;
    }
  }
  
  links.forEach(link => {
    const fromNode = nodes.find(n => n.id === link.from);
    if (fromNode) {
      if (fromNode.type === "decision") {
        if (link.label === "yes" || !link.label) {
          positions[link.to].x = 100;
        } else if (link.label === "no") {
          positions[link.to].x = 300;
        }
      }
    }
  });
  
  nodes.forEach(node => {
    if (node.text === "Merge Path") {
      positions[node.id].x = 200;
    }
  });
  
  return positions;
}

function renderFlowchartToSvg(analysis) {
  const { nodes, links } = analysis;
  const positions = computeLayout(nodes, links);
  
  let maxY = 100;
  Object.values(positions).forEach(pos => {
    if (pos.y > maxY) maxY = pos.y;
  });
  const svgHeight = maxY + 80;
  
  let html = `<svg class="flowchart-svg" width="400" height="${svgHeight}" viewBox="0 0 400 ${svgHeight}">`;
  
  html += `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" class="flow-arrow-marker" />
      </marker>
    </defs>
  `;
  
  links.forEach(link => {
    const fromPos = positions[link.from];
    const toPos = positions[link.to];
    
    if (fromPos && toPos) {
      let startX = fromPos.x;
      let startY = fromPos.y;
      let endX = toPos.x;
      let endY = toPos.y;
      
      let d = "";
      if (startX === endX) {
        d = `M ${startX} ${startY + 20} L ${endX} ${endY - 20}`;
      } else {
        const midY = (startY + endY) / 2;
        d = `M ${startX} ${startY + 20} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 20}`;
      }
      
      html += `<path d="${d}" class="flow-line" />`;
      
      if (link.label) {
        const labelX = (startX + endX) / 2;
        const labelY = (startY + endY) / 2 - 8;
        html += `<text class="flow-line-label" x="${labelX}" y="${labelY}">${link.label}</text>`;
      }
    }
  });
  
  nodes.forEach(node => {
    const pos = positions[node.id];
    if (!pos) return;
    
    const x = pos.x;
    const y = pos.y;
    
    if (node.type === "start" || node.type === "end") {
      html += `<ellipse cx="${x}" cy="${y}" rx="40" ry="20" class="flow-node flow-${node.type}" />`;
    } else if (node.type === "decision") {
      const points = `${x},${y-30} ${x+65},${y} ${x},${y+30} ${x-65},${y}`;
      html += `<polygon points="${points}" class="flow-node flow-decision" />`;
    } else if (node.type === "io") {
      const points = `${x-45},${y-20} ${x+55},${y-20} ${x+45},${y+20} ${x-55},${y+20}`;
      html += `<polygon points="${points}" class="flow-node flow-io" />`;
    } else {
      if (node.text === "Merge Path") {
        html += `<circle cx="${x}" cy="${y}" r="6" class="flow-node flow-process" style="fill:var(--text-muted); stroke:none;" />`;
        return;
      }
      html += `<rect x="${x-60}" y="${y-20}" width="120" height="40" rx="6" ry="6" class="flow-node flow-process" />`;
    }
    
    if (node.text !== "Merge Path") {
      let displayTxt = node.text;
      if (displayTxt.length > 15) {
        displayTxt = displayTxt.substring(0, 13) + "...";
      }
      html += `<text x="${x}" y="${y}" class="flow-node-text">${displayTxt}</text>`;
    }
  });
  
  html += `</svg>`;
  return html;
}
