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
  try {
    dom.loaderStatus.textContent = "Loading Wasmer runtime…";
    logToConsole("Initializing local Wasmer SDK…", "system");
    await init();

    state.projectDir = new Directory();

    dom.loaderStatus.textContent = "Loading local Clang compiler…";
    logToConsole("Loading local clang.webc (this might take a few seconds)…", "system");
    const response = await fetch("clang.webc", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch clang.webc: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    state.clang = await Wasmer.fromFile(new Uint8Array(arrayBuffer));

    state.sdkReady = true;
    dom.sdkBadge.classList.add("connected");
    logToConsole("Wasmer SDK initialized. Clang compiler ready.", "success");
    logToConsole("You can now write C code and compile it in your browser.", "info");

    // Reveal app
    dom.loadingOverlay.style.opacity = "0";
    dom.loadingOverlay.style.transition = "opacity 0.4s ease";
    setTimeout(() => {
      dom.loadingOverlay.classList.add("hidden");
      dom.app.classList.remove("hidden");
    }, 400);
  } catch (err) {
    dom.loaderStatus.textContent = "Failed to initialize SDK.";
    dom.loaderStatus.style.color = "#FF6B6B";
    logToConsole(`SDK initialization failed: ${err.message}`, "error");
    console.error("SDK init error:", err);

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
  logToConsole("Starting compilation…", "system");

  try {
    const ext = state.language === 'cpp' ? 'cpp' : 'c';
    const filename = `main.${ext}`;
    await state.projectDir.writeFile(filename, sourceCode);

    let compileArgs = ["-O1", "-fno-spell-checking"];
    if (state.language === 'cpp') {
      compileArgs.push("-x", "c++", `/project/${filename}`, "-o", "/project/main.wasm", "-lc++", "-lc++abi");
    } else {
      compileArgs.push(`/project/${filename}`, "-o", "/project/main.wasm");
    }

    const instance = await state.clang.entrypoint.run({
      args: compileArgs,
      mount: { "/project": state.projectDir },
    });

    const output = await instance.wait();

    // Capture stderr for errors/warnings
    if (output.stderr) {
      const errText = typeof output.stderr === "string"
        ? output.stderr
        : new TextDecoder().decode(output.stderr);
      if (errText.trim()) {
        errText.trim().split("\n").forEach((line) => {
          logToConsole(line, line.toLowerCase().includes("error") ? "error" : "warning");
        });
      }
    }

    if (output.ok) {
      const wasmBinary = await state.projectDir.readFile("main.wasm");
      state.compiledBinary = wasmBinary;

      completeProgressBar(true);
      setStatus("Compiled", "success");
      logToConsole(
        `Compilation successful! WASM binary: ${wasmBinary.byteLength.toLocaleString()} bytes`,
        "success"
      );

      dom.statusWasm.textContent = `WASM: ${wasmBinary.byteLength.toLocaleString()} bytes`;
      dom.statusWasm.style.display = "inline-flex";
      setButtonStates(false, true);
    } else {
      completeProgressBar(false);
      setStatus("Error", "error");
      logToConsole("Compilation failed. Check errors above.", "error");
      setButtonStates(false, false);
    }
  } catch (err) {
    completeProgressBar(false);
    setStatus("Error", "error");
    logToConsole(`Compilation error: ${err.message}`, "error");
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
  logToConsole("Running compiled program…", "system");

  try {
    const module = await WebAssembly.compile(state.compiledBinary);

    const pkg = await Wasmer.fromFile(state.compiledBinary);
    const instance = await pkg.entrypoint.run();
    const result = await instance.wait();

    if (result.stdout) {
      const stdoutText = typeof result.stdout === "string"
        ? result.stdout
        : new TextDecoder().decode(result.stdout);
      if (stdoutText.trim()) {
        stdoutText.split("\n").forEach((line) => {
          if (line) logToProgram(line, "stdout");
        });
      }
    }

    if (result.stderr) {
      const stderrText = typeof result.stderr === "string"
        ? result.stderr
        : new TextDecoder().decode(result.stderr);
      if (stderrText.trim()) {
        stderrText.split("\n").forEach((line) => {
          if (line) logToProgram(line, "error");
        });
      }
    }

    const exitCode = result.code ?? 0;
    logToConsole(`Program exited with code ${exitCode}`, exitCode === 0 ? "success" : "warning");
    setStatus("Ready", "idle");
  } catch (err) {
    logToConsole(`Runtime error: ${err.message}`, "error");
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
  dom.consoleOutput.classList.toggle("active", tab === "console");
  dom.programOutput.classList.toggle("active", tab === "output");
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
    logToConsole("Console cleared.", "info");
  });

  dom.tabConsole.addEventListener("click", () => switchTab("console"));
  dom.tabOutput.addEventListener("click",  () => switchTab("output"));

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
