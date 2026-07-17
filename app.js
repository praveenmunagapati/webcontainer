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
  network: null,
  savedValue: "",
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
  btnSave:        $("#btn-save"),
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
  statusLang:     $("#status-lang"),
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
    logToConsole("[Compiler] Fetching compressed local clang.webc.gz archive (32MB)...", "info");
    const fetchStart = performance.now();
    const response = await fetch("clang.webc.gz", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch clang.webc.gz: ${response.statusText}`);
    }
    
    logToConsole("[Compiler] Decompressing archive in memory...", "info");
    const decompressStart = performance.now();
    const decompressedStream = response.body.pipeThrough(new DecompressionStream("gzip"));
    const decompressedResponse = new Response(decompressedStream);
    const arrayBuffer = await decompressedResponse.arrayBuffer();
    
    logToConsole(`[Compiler] Download and decompression completed: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB in ${(performance.now() - fetchStart).toFixed(1)}ms (decompression took ${(performance.now() - decompressStart).toFixed(1)}ms)`, "success");

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
    // Remove the old file first — Wasmer SDK's writeFile does not truncate,
    // so a shorter file would retain leftover bytes from the previous write.
    try { await state.projectDir.removeFile(filename); } catch (_) { /* first run */ }
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

    // Inspect module imports to build the right import object
    const moduleImports = WebAssembly.Module.imports(module);
    const needsEnvMemory = moduleImports.some(i => i.module === "env" && i.name === "memory");
    const needsWasix = moduleImports.some(i => i.module === "wasix_32v1");

    logToConsole(`[WASI] Setting up lightweight WASI runtime shim...`, "info");

    // Stdout / stderr capture buffers
    const stdoutChunks = [];
    const stderrChunks = [];
    let wasmInstance = null;

    // Helper: get the memory DataView (from export or imported env.memory)
    let envMemory = null;
    const getMem = () => new DataView(
      (wasmInstance.exports.memory || envMemory).buffer
    );

    // Helper: safely decode bytes from possibly-shared memory
    const decodeBytes = (buffer, ptr, len) => {
      const slice = new Uint8Array(buffer, ptr, len);
      // SharedArrayBuffer can't be decoded directly; copy first
      if (buffer instanceof SharedArrayBuffer) {
        const copy = new Uint8Array(len);
        copy.set(slice);
        return new TextDecoder().decode(copy);
      }
      return new TextDecoder().decode(slice);
    };

    // Minimal WASI snapshot preview1 implementation
    const wasi_snapshot_preview1 = {
      fd_write(fd, iovs_ptr, iovs_len, nwritten_ptr) {
        const mem = getMem();
        let totalWritten = 0;
        const target = fd === 2 ? stderrChunks : stdoutChunks;
        for (let i = 0; i < iovs_len; i++) {
          const ptr = mem.getUint32(iovs_ptr + i * 8, true);
          const len = mem.getUint32(iovs_ptr + i * 8 + 4, true);
          target.push(decodeBytes(mem.buffer, ptr, len));
          totalWritten += len;
        }
        mem.setUint32(nwritten_ptr, totalWritten, true);
        return 0; // ESUCCESS
      },
      fd_read() { return 0; },
      fd_close() { return 0; },
      fd_seek()  { return 0; },
      fd_fdstat_get(fd, stat_ptr) {
        const mem = getMem();
        // Set filetype = CHARACTER_DEVICE, flags = 0
        mem.setUint8(stat_ptr, 2);      // fs_filetype
        mem.setUint16(stat_ptr + 2, 0, true); // fs_flags
        // rights_base & rights_inheriting — grant all
        mem.setBigUint64(stat_ptr + 8, 0xFFFFFFFFFFFFFFFFn, true);
        mem.setBigUint64(stat_ptr + 16, 0xFFFFFFFFFFFFFFFFn, true);
        return 0;
      },
      fd_prestat_get()      { return 8; }, // EBADF — no preopened dirs
      fd_prestat_dir_name() { return 8; },
      path_open()           { return 44; }, // ENOSYS
      environ_sizes_get(count_ptr, size_ptr) {
        const mem = getMem();
        mem.setUint32(count_ptr, 0, true);
        mem.setUint32(size_ptr, 0, true);
        return 0;
      },
      environ_get() { return 0; },
      args_sizes_get(count_ptr, size_ptr) {
        const mem = getMem();
        mem.setUint32(count_ptr, 0, true);
        mem.setUint32(size_ptr, 0, true);
        return 0;
      },
      args_get() { return 0; },
      clock_time_get(id, precision, out_ptr) {
        const mem = getMem();
        mem.setBigUint64(out_ptr, BigInt(Date.now()) * 1000000n, true);
        return 0;
      },
      random_get(buf_ptr, buf_len) {
        const buf = (wasmInstance.exports.memory || envMemory).buffer;
        crypto.getRandomValues(new Uint8Array(buf, buf_ptr, buf_len));
        return 0;
      },
      proc_exit(code) {
        throw { __wasi_exit: true, code };
      },
    };

    // Build the import object
    const importObject = { wasi_snapshot_preview1 };

    // Add WASIX stubs if needed (thread/futex syscalls — no-op for single-threaded)
    if (needsWasix) {
      importObject.wasix_32v1 = {
        callback_signal: () => 0,
        futex_wait:      () => 0,
        futex_wake:      () => 0,
        futex_wake_all:  () => 0,
      };
    }

    // Provide env.memory if the module imports it
    if (needsEnvMemory) {
      // Clang/WASIX compiles require shared memory
      try {
        envMemory = new WebAssembly.Memory({ initial: 256, maximum: 256, shared: true });
      } catch (_) {
        envMemory = new WebAssembly.Memory({ initial: 256, maximum: 65536 });
      }
      importObject.env = { memory: envMemory };
    }

    // Add any remaining missing import stubs so instantiation doesn't fail
    for (const imp of moduleImports) {
      if (!importObject[imp.module]) importObject[imp.module] = {};
      if (!(imp.name in importObject[imp.module])) {
        if (imp.kind === "function") {
          importObject[imp.module][imp.name] = () => 0;
        }
      }
    }

    logToConsole(`[WASI] Instantiating WebAssembly module...`, "info");
    const instStart = performance.now();
    wasmInstance = await WebAssembly.instantiate(module, importObject);
    logToConsole(`[WASI] Instance created in ${(performance.now() - instStart).toFixed(1)}ms`, "info");

    logToConsole(`[WASI] Executing _start entrypoint...`, "info");
    const execStart = performance.now();
    let exitCode = 0;

    try {
      if (wasmInstance.exports._start) {
        wasmInstance.exports._start();
      } else if (wasmInstance.exports.main) {
        wasmInstance.exports.main();
      } else {
        throw new Error("No _start or main export found in WASM binary");
      }
    } catch (e) {
      if (e && e.__wasi_exit) {
        exitCode = e.code;
      } else {
        throw e; // re-throw real errors
      }
    }

    logToConsole(`[WASI] Execution completed in ${(performance.now() - execStart).toFixed(1)}ms with exit code ${exitCode}`, "info");

    // Display captured stdout
    const stdoutText = stdoutChunks.join("");
    if (stdoutText.trim()) {
      logToConsole(`[WASI] Captured stdout output:`, "info");
      stdoutText.split("\n").forEach((line) => {
        if (line) {
          logToProgram(line, "stdout");
          logToConsole(`  [stdout] ${line}`, "info");
        }
      });
    }

    // Display captured stderr
    const stderrText = stderrChunks.join("");
    if (stderrText.trim()) {
      logToConsole(`[WASI] Captured stderr output:`, "warning");
      stderrText.split("\n").forEach((line) => {
        if (line) {
          logToProgram(line, "error");
          logToConsole(`  [stderr] ${line}`, "warning");
        }
      });
    }

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
  
  if (tab === "flowchart" && state.network) {
    setTimeout(() => {
      state.network.setSize("100%", "100%");
      state.network.redraw();
      state.network.fit();
    }, 50);
  }
}

function setupEditor(callback) {
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    const savedCode = localStorage.getItem('cforge_code_c');
    state.editor = monaco.editor.create(dom.editorContainer, {
      value: savedCode || EXAMPLES[0].code,
      language: 'c',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontLigatures: false,
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
    state.savedValue = state.editor.getValue();
    let renderTimeout;
    state.editor.onDidChangeModelContent(() => {
      const changed = state.editor.getValue() !== state.savedValue;
      dom.unsavedDot.style.display = changed ? "inline-block" : "none";
      
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        renderFlowchartAndAlgorithm();
      }, 800);
    });

    // Keyboard shortcuts
    state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveCode());
    state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => compile());
    state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runWasm());
    state.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => compileAndRun());

    // Remeasure fonts once web fonts (JetBrains Mono) have finished loading.
    // Monaco measures character widths at init using the fallback font;
    // this corrects the measurement so cursor clicks land accurately.
    document.fonts.ready.then(() => {
      monaco.editor.remeasureFonts();
    });

    if (callback) callback();
  });
}

// ---- Resize Handle ----
function setupResize() {
  const handle = $("#resize-handle");
  const editorPanel = $(".editor-panel");
  const outputPanel = $(".output-panel");
  const mainContent = $(".main-content");
  let isResizing = false;

  function isVerticalLayout() {
    return window.getComputedStyle(mainContent).flexDirection === "column";
  }

  function startResize(e) {
    isResizing = true;
    handle.classList.add("active");
    document.body.style.userSelect = "none";
    document.body.style.cursor = isVerticalLayout() ? "row-resize" : "col-resize";
    e.preventDefault();
  }

  function doResize(clientX, clientY) {
    if (!isResizing) return;
    const rect = mainContent.getBoundingClientRect();

    if (isVerticalLayout()) {
      const ratio = ((clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(Math.max(ratio, 20), 80);
      editorPanel.style.flex = `0 0 ${clamped}%`;
      outputPanel.style.flex = `1 1 0%`;
    } else {
      const ratio = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(ratio, 25), 80);
      editorPanel.style.flex = `0 0 ${clamped}%`;
    }

    state.editor.layout();
    if (state.network) {
      state.network.setSize("100%", "100%");
      state.network.redraw();
    }
  }

  function endResize() {
    if (isResizing) {
      isResizing = false;
      handle.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      state.editor.layout();
      if (state.network) {
        state.network.setSize("100%", "100%");
        state.network.redraw();
        state.network.fit();
      }
    }
  }

  // Mouse events
  handle.addEventListener("mousedown", startResize);
  document.addEventListener("mousemove", (e) => doResize(e.clientX, e.clientY));
  document.addEventListener("mouseup", endResize);

  // Touch events for mobile
  handle.addEventListener("touchstart", (e) => {
    startResize(e);
  }, { passive: false });

  document.addEventListener("touchmove", (e) => {
    if (!isResizing) return;
    const touch = e.touches[0];
    doResize(touch.clientX, touch.clientY);
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("touchend", endResize);

  // Re-layout editor on window resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Reset flex properties to defaults on layout change
      editorPanel.style.flex = "";
      outputPanel.style.flex = "";
      if (state.editor) state.editor.layout();
      if (state.network) {
        state.network.setSize("100%", "100%");
        state.network.redraw();
        state.network.fit();
      }
    }, 150);
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

function saveCode() {
  const code = state.editor.getValue();
  state.savedValue = code;
  localStorage.setItem('cforge_code_' + state.language, code);
  dom.unsavedDot.style.display = "none";
  logToConsole("File saved to browser local storage.", "success");
}

function setupExamples() {
  dom.examplesList.addEventListener("click", (e) => {
    const card = e.target.closest(".example-card");
    if (!card) return;
    const idx = parseInt(card.dataset.index);
    state.editor.setValue(EXAMPLES[idx].code);
    state.savedValue = EXAMPLES[idx].code;
    dom.unsavedDot.style.display = "none";
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
  dom.btnSave.addEventListener("click", saveCode);

  dom.btnNew.addEventListener("click", () => {
    const defaultCode = state.language === 'cpp'
      ? `#include <iostream>\n\nint main() {\n    \n    return 0;\n}\n`
      : `#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n`;
    state.editor.setValue(defaultCode);
    state.savedValue = defaultCode;
    dom.unsavedDot.style.display = "none";
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
    dom.statusLang.textContent = newLang === 'cpp' ? 'C++ (ISO C++17)' : 'C (ISO C17)';
    
    state.compiledBinary = null;
    setButtonStates(false, false);
    dom.statusWasm.style.display = "none";
    setStatus("Ready", "idle");
    
    const savedCode = localStorage.getItem('cforge_code_' + newLang);
    const defaultCode = savedCode || (newLang === 'cpp'
      ? `#include <cstdio>\n\nint main() {\n    std::printf("Hello, C++!\\n");\n    return 0;\n}\n`
      : `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`);
    state.editor.setValue(defaultCode);
    state.savedValue = defaultCode;
    dom.unsavedDot.style.display = "none";
    
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
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveCode();
    }
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

  // 1. Render Flowchart using Vis Network
  try {
    const analysis = parseCodeToFlow(sourceCode, state.language);
    renderVisFlowchart(analysis.nodes, analysis.links);
  } catch (err) {
    console.error("Flowchart generation error:", err);
  }

  // 2. Render Algorithm using pseudocode.js
  try {
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
  } catch (err) {
    console.error("Algorithm generation error:", err);
    dom.algorithmOutput.innerHTML = `
      <div class="error-container" style="padding:16px; color:var(--text-danger);">
        Failed to render algorithm pseudocode: ${escapeHtml(err.message || err)}
      </div>
    `;
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

  const nodes = [];
  const links = [];
  const steps = [];
  let nodeCounter = 0;

  function nextId() { return `n${nodeCounter++}`; }
  function addNode(type, text) {
    const id = nextId();
    nodes.push({ id, type, text });
    return id;
  }

  // ---- Low-level helpers ----
  function findMatchingBrace(str, startIdx) {
    let depth = 0;
    for (let i = startIdx; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') { depth--; if (depth === 0) return i; }
    }
    return str.length - 1;
  }

  function findMatchingParen(str, startIdx) {
    let depth = 0;
    for (let i = startIdx; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') { depth--; if (depth === 0) return i; }
    }
    return str.length - 1;
  }

  function findSemicolon(str, start) {
    let inStr = false, strCh = '', depth = 0;
    for (let j = start; j < str.length; j++) {
      if (!inStr && (str[j] === '"' || str[j] === "'")) { inStr = true; strCh = str[j]; }
      else if (inStr && str[j] === strCh && str[j - 1] !== '\\') { inStr = false; }
      else if (!inStr) {
        if (str[j] === '{' || str[j] === '(') depth++;
        else if (str[j] === '}' || str[j] === ')') depth--;
        else if (str[j] === ';' && depth === 0) return j;
      }
    }
    return -1;
  }

  // ---- Extract main() body ----
  function extractMainBody(src) {
    const m = src.match(/(int|void)\s+main\s*\(/);
    if (!m) return null;
    let idx = m.index + m[0].length - 1; // at the '('
    const pEnd = findMatchingParen(src, idx);
    idx = pEnd + 1;
    while (idx < src.length && /\s/.test(src[idx])) idx++;
    if (src[idx] !== '{') return null;
    const bEnd = findMatchingBrace(src, idx);
    return src.substring(idx + 1, bEnd).trim();
  }

  // ---- Tokenize block into structured statements ----
  function parseBlock(s) {
    const stmts = [];
    let i = 0;
    while (i < s.length) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (i >= s.length) break;
      const rest = s.substring(i);

      // Skip preprocessor and includes
      if (rest.startsWith('#')) {
        const nl = s.indexOf('\n', i);
        i = nl === -1 ? s.length : nl + 1;
        continue;
      }

      // if
      if (rest.match(/^if\s*\(/)) {
        const r = parseIfChain(s, i);
        stmts.push(r.stmt);
        i = r.end;
        continue;
      }

      // for
      if (rest.match(/^for\s*\(/)) {
        const pStart = s.indexOf('(', i);
        const pEnd = findMatchingParen(s, pStart);
        const forExpr = s.substring(pStart + 1, pEnd).trim();
        i = pEnd + 1;
        const bodyResult = parseBodyAfterControl(s, i);
        i = bodyResult.end;
        const parts = forExpr.split(';');
        stmts.push({
          type: 'for',
          init: (parts[0] || '').trim(),
          condition: (parts[1] || '').trim(),
          update: (parts[2] || '').trim(),
          body: bodyResult.stmts
        });
        continue;
      }

      // while
      if (rest.match(/^while\s*\(/)) {
        const pStart = s.indexOf('(', i);
        const pEnd = findMatchingParen(s, pStart);
        const cond = s.substring(pStart + 1, pEnd).trim();
        i = pEnd + 1;
        const bodyResult = parseBodyAfterControl(s, i);
        i = bodyResult.end;
        stmts.push({ type: 'while', condition: cond, body: bodyResult.stmts });
        continue;
      }

      // Bare block
      if (s[i] === '{') {
        const bEnd = findMatchingBrace(s, i);
        const inner = parseBlock(s.substring(i + 1, bEnd));
        stmts.push(...inner);
        i = bEnd + 1;
        continue;
      }

      // Regular statement
      const semi = findSemicolon(s, i);
      if (semi === -1) break;
      const txt = s.substring(i, semi + 1).trim();
      if (txt && txt !== ';') stmts.push({ type: 'statement', text: txt });
      i = semi + 1;
    }
    return stmts;
  }

  // Parse body after a control keyword (could be { block } or single statement)
  function parseBodyAfterControl(s, idx) {
    while (idx < s.length && /\s/.test(s[idx])) idx++;
    if (s[idx] === '{') {
      const bEnd = findMatchingBrace(s, idx);
      return { stmts: parseBlock(s.substring(idx + 1, bEnd)), end: bEnd + 1 };
    }
    // single statement
    const semi = findSemicolon(s, idx);
    if (semi === -1) return { stmts: [], end: s.length };
    const txt = s.substring(idx, semi + 1).trim();
    return { stmts: txt && txt !== ';' ? [{ type: 'statement', text: txt }] : [], end: semi + 1 };
  }

  // Parse if / else-if / else chain
  function parseIfChain(s, startIdx) {
    let i = startIdx;
    // skip "if"
    i += 2;
    while (i < s.length && /\s/.test(s[i])) i++;
    const pEnd = findMatchingParen(s, i);
    const cond = s.substring(i + 1, pEnd).trim();
    i = pEnd + 1;
    const bodyResult = parseBodyAfterControl(s, i);
    i = bodyResult.end;

    // Check for else
    let savedI = i;
    while (i < s.length && /\s/.test(s[i])) i++;
    let elseBody = null;
    if (s.substring(i).startsWith('else')) {
      i += 4; // skip 'else'
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s.substring(i).match(/^if\s*\(/)) {
        // else if → wrap nested if in the else body
        const nested = parseIfChain(s, i);
        elseBody = [nested.stmt];
        i = nested.end;
      } else {
        const elseResult = parseBodyAfterControl(s, i);
        elseBody = elseResult.stmts;
        i = elseResult.end;
      }
    } else {
      i = savedI; // no else, revert
    }

    return {
      stmt: { type: 'if', condition: cond, body: bodyResult.stmts, elseBody },
      end: i
    };
  }

  // ---- Classify a simple statement ----
  function classifyStmt(text) {
    if (/printf|scanf|cout|cin|puts|gets/.test(text)) return 'io';
    if (/^return\b/.test(text.trim()) || /^exit\s*\(/.test(text.trim())) return 'end';
    return 'process';
  }

  // ---- Build flowchart nodes/links from parsed statements ----
  // Returns the last node id in this chain
  function buildFlow(stmts, prevId) {
    let lastId = prevId;

    for (const stmt of stmts) {
      if (stmt.type === 'statement') {
        const cls = classifyStmt(stmt.text);
        const label = toNaturalLanguage(stmt.text);
        const id = addNode(cls, label);
        links.push({ from: lastId, to: id });
        lastId = id;

      } else if (stmt.type === 'if') {
        // Decision diamond
        const condText = `Is ${conditionToNaturalLanguage(stmt.condition)}?`;
        const condId = addNode('decision', condText);
        links.push({ from: lastId, to: condId });

        // Yes branch
        if (stmt.body.length > 0) {
          const yesEnd = buildFlow(stmt.body, condId);
          // Label the first link from condId (the Yes path)
          for (const l of links) {
            if (l.from === condId && !l.label) { l.label = 'Yes'; break; }
          }
          // Merge point
          const mergeId = addNode('process', 'Merge Path');
          links.push({ from: yesEnd, to: mergeId });

          if (stmt.elseBody && stmt.elseBody.length > 0) {
            const noEnd = buildFlow(stmt.elseBody, condId);
            for (const l of links) {
              if (l.from === condId && !l.label) { l.label = 'No'; break; }
            }
            links.push({ from: noEnd, to: mergeId });
          } else {
            links.push({ from: condId, to: mergeId, label: 'No' });
          }
          lastId = mergeId;
        } else {
          // Empty if body – unlikely but handle gracefully
          const mergeId = addNode('process', 'Merge Path');
          links.push({ from: condId, to: mergeId, label: 'Yes' });
          links.push({ from: condId, to: mergeId, label: 'No' });
          lastId = mergeId;
        }

      } else if (stmt.type === 'for') {
        // Init statement
        if (stmt.init) {
          const initLabel = toNaturalLanguage(stmt.init + ';');
          const initId = addNode('process', initLabel);
          links.push({ from: lastId, to: initId });
          lastId = initId;
        }

        // Condition diamond
        const condText = stmt.condition
          ? `Is ${conditionToNaturalLanguage(stmt.condition)}?`
          : 'Loop condition?';
        const condId = addNode('decision', condText);
        links.push({ from: lastId, to: condId });

        // Body (Yes branch)
        if (stmt.body.length > 0) {
          const bodyEnd = buildFlow(stmt.body, condId);
          for (const l of links) {
            if (l.from === condId && !l.label) { l.label = 'Yes'; break; }
          }

          // Update step
          if (stmt.update) {
            const updateLabel = toNaturalLanguage(stmt.update + ';');
            const updateId = addNode('process', updateLabel);
            links.push({ from: bodyEnd, to: updateId });
            links.push({ from: updateId, to: condId });
          } else {
            links.push({ from: bodyEnd, to: condId });
          }
        } else {
          links.push({ from: condId, to: condId, label: 'Yes' });
        }

        // No exit
        const exitId = addNode('process', 'Merge Path');
        links.push({ from: condId, to: exitId, label: 'No' });
        lastId = exitId;

      } else if (stmt.type === 'while') {
        const condText = `Is ${conditionToNaturalLanguage(stmt.condition)}?`;
        const condId = addNode('decision', condText);
        links.push({ from: lastId, to: condId });

        if (stmt.body.length > 0) {
          const bodyEnd = buildFlow(stmt.body, condId);
          for (const l of links) {
            if (l.from === condId && !l.label) { l.label = 'Yes'; break; }
          }
          links.push({ from: bodyEnd, to: condId });
        } else {
          links.push({ from: condId, to: condId, label: 'Yes' });
        }

        const exitId = addNode('process', 'Merge Path');
        links.push({ from: condId, to: exitId, label: 'No' });
        lastId = exitId;
      }
    }
    return lastId;
  }

  // ---- Drive ----
  const startId = addNode('start', 'Start');

  const mainBody = extractMainBody(cleanCode);
  if (mainBody) {
    const stmts = parseBlock(mainBody);
    const lastId = buildFlow(stmts, startId);

    // End node (if the code didn't already end with return)
    const hasEnd = nodes.some(n => n.type === 'end');
    if (!hasEnd) {
      const endId = addNode('end', 'End');
      links.push({ from: lastId, to: endId });
    }
  } else {
    addNode('end', 'End');
    links.push({ from: startId, to: 'n1' });
  }

  return { nodes, links, steps };
}

function wrapText(text, maxChars = 20) {
  const words = text.split(" ");
  let lines = [];
  let currentLine = "";
  for (let word of words) {
    if ((currentLine + " " + word).trim().length <= maxChars) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}

function createSvgNodeUrl(type, text, colorBorder, colorBg) {
  const lines = wrapText(text, 22).split("\n");
  const lineCount = lines.length;
  const maxLineLength = Math.max(...lines.map(l => l.length));
  
  const charWidth = 7.5;
  const lineHeight = 18;
  
  const textWidth = maxLineLength * charWidth;
  const textHeight = lineCount * lineHeight;
  
  let width, height;
  let shapeMarkup = "";
  
  if (type === 'start' || type === 'end') {
    // capsule / rounded oval shape
    width = Math.max(110, textWidth + 50);
    height = Math.max(46, textHeight + 24);
    const rx = height / 2;
    shapeMarkup = `<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="${rx}" ry="${rx}" fill="${colorBg}" stroke="${colorBorder}" stroke-width="2"/>`;
  } else if (type === 'decision') {
    // diamond shape
    const pad = Math.max(120, textWidth + textHeight + 40);
    width = pad;
    height = pad;
    const halfW = width / 2;
    const halfH = height / 2;
    shapeMarkup = `<polygon points="${halfW},2 ${width-2},${halfH} ${halfW},${height-2} 2,${halfH}" fill="${colorBg}" stroke="${colorBorder}" stroke-width="2"/>`;
  } else if (type === 'io') {
    // parallelogram shape (skewed rectangle)
    width = Math.max(140, textWidth + 60);
    height = Math.max(50, textHeight + 24);
    const skew = 18;
    shapeMarkup = `<polygon points="${skew},2 ${width-2},2 ${width-skew-2},${height-2} 2,${height-2}" fill="${colorBg}" stroke="${colorBorder}" stroke-width="2"/>`;
  } else if (type === 'process') {
    // process rectangle
    width = Math.max(120, textWidth + 36);
    height = Math.max(50, textHeight + 24);
    shapeMarkup = `<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="6" ry="6" fill="${colorBg}" stroke="${colorBorder}" stroke-width="2"/>`;
  } else {
    // fallback process rectangle
    width = Math.max(120, textWidth + 36);
    height = Math.max(50, textHeight + 24);
    shapeMarkup = `<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="6" ry="6" fill="${colorBg}" stroke="${colorBorder}" stroke-width="2"/>`;
  }

  let textMarkup = "";
  const startY = (height - textHeight) / 2 + 13;
  lines.forEach((line, idx) => {
    const y = startY + idx * lineHeight;
    textMarkup += `<text x="50%" y="${y}" text-anchor="middle" fill="#e4e8f1" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="12" font-weight="500">${escapeHtml(line)}</text>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapeMarkup}${textMarkup}</svg>`;
  
  return {
    url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    width,
    height
  };
}

function renderVisFlowchart(nodes, links) {
  if (typeof vis === 'undefined') {
    dom.flowchartOutput.innerHTML = `
      <div class="tab-placeholder" style="color:var(--accent-danger);">Vis.js library failed to load. Please check your internet connection.</div>
    `;
    return;
  }

  let container = document.getElementById("flowchart-network");
  if (!container) {
    dom.flowchartOutput.innerHTML = `
      <div id="flowchart-network" style="width:100%; height:100%; min-height:350px;"></div>
    `;
    container = document.getElementById("flowchart-network");
  }

  const visNodes = nodes.map(node => {
    let colorBorder = '#74B9FF'; // Default blue (process)
    let colorBg = '#111827';
    let label = node.text;

    if (node.type === 'start') {
      colorBorder = '#00CEC9'; // Teal
      colorBg = '#0c1a24';
    } else if (node.type === 'end') {
      colorBorder = '#FF6B6B'; // Red
      colorBg = '#1c121c';
    } else if (node.type === 'decision') {
      colorBorder = '#6C5CE7'; // Purple
      colorBg = '#17142b';
    } else if (node.type === 'io') {
      colorBorder = '#00B894'; // Green
      colorBg = '#0b1c18';
    } else if (node.type === 'process') {
      colorBorder = '#74B9FF'; // Blue
      colorBg = '#111827';
    }

    if (node.text === 'Merge Path') {
      return {
        id: node.id,
        label: '',
        shape: 'circle',
        size: 8,
        color: {
          background: '#5a6380',
          border: '#5a6380',
          highlight: { background: '#5a6380', border: '#5a6380' },
          hover: { background: '#5a6380', border: '#5a6380' }
        },
        borderWidth: 1,
        shadow: { enabled: false }
      };
    }

    const svgData = createSvgNodeUrl(node.type, label, colorBorder, colorBg);

    return {
      id: node.id,
      shape: 'image',
      image: svgData.url,
      color: {
        background: colorBg,
        border: colorBorder,
        highlight: { background: colorBg, border: colorBorder },
        hover: { background: colorBg, border: colorBorder }
      },
      shapeProperties: {
        useImageSize: true
      },
      size: Math.max(svgData.width, svgData.height) / 2,
      shadow: {
        enabled: true,
        color: 'rgba(0, 0, 0, 0.4)',
        size: 5,
        x: 0,
        y: 3
      }
    };
  });

  const visEdges = links.map((link, idx) => {
    return {
      id: `edge_${idx}`,
      from: link.from,
      to: link.to,
      label: link.label || '',
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.8
        }
      },
      color: {
        color: '#5a6380',
        highlight: '#6C5CE7',
        hover: '#a29bfe'
      },
      font: {
        color: '#8892a8',
        size: 11,
        face: 'Inter, system-ui, -apple-system, sans-serif',
        background: '#0f1420',
        strokeWidth: 0
      },
      smooth: {
        type: 'cubicBezier',
        forceDirection: 'vertical',
        roundness: 0.5
      }
    };
  });

  const data = {
    nodes: new vis.DataSet(visNodes),
    edges: new vis.DataSet(visEdges)
  };

  const options = {
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'UD',
        sortMethod: 'directed',
        nodeSpacing: 180,
        levelSeparation: 140,
        parentCentralization: true,
        edgeMinimization: true,
        blockShifting: true
      }
    },
    physics: {
      hierarchicalRepulsion: {
        nodeDistance: 180,
        avoidOverlap: 1
      }
    },
    interaction: {
      hover: true,
      zoomView: true,
      dragView: true,
      dragNodes: true
    }
  };

  if (state.network) {
    state.network.destroy();
  }

  state.network = new vis.Network(container, data, options);

  setTimeout(() => {
    if (state.network) {
      state.network.setSize("100%", "100%");
      state.network.redraw();
      state.network.fit();
    }
  }, 100);
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
      latex += `\\FOR{$${escapeLatexMath(loopRange)}$}\n`;
      blockStack.push("for");
      continue;
    }
    
    if (whileMatch) {
      let cond = whileMatch[1].trim();
      latex += `\\WHILE{$${escapeLatexMath(cond)}$}\n`;
      blockStack.push("while");
      continue;
    }
    
    const ifMatch = line.match(/^if\s*\((.*)\)/);
    if (ifMatch) {
      let cond = ifMatch[1].trim();
      latex += `\\IF{$${escapeLatexMath(cond)}$}\n`;
      blockStack.push("if");
      continue;
    }
    
    if (line.startsWith("else if")) {
      const cond = line.match(/if\s*\((.*)\)/)?.[1]?.trim() || "condition";
      latex += `\\ELSIF{$${escapeLatexMath(cond)}$}\n`;
      continue;
    }
    
    if (line.startsWith("else")) {
      latex += "\\ELSE\n";
      continue;
    }
    
    if (line.startsWith("return") || line.startsWith("exit")) {
      let val = line.replace(/^(return|exit)/, "").replace(";", "").trim();
      if (val) {
        latex += `\\RETURN $${escapeLatexMath(val)}$\n`;
      } else {
        latex += `\\RETURN\n`;
      }
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
        latex += `\\READ{$${escapeLatexMath(content)}$}\n`;
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
  let clean = str
    .replace(/&&/g, " \\text{ and } ")
    .replace(/\|\|/g, " \\text{ or } ")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/!=/g, " \\ne ")
    .replace(/<=/g, " \\le ")
    .replace(/>=/g, " \\ge ")
    .replace(/==/g, " = ")
    .replace(/</g, " < ")
    .replace(/>/g, " > ");
  
  clean = clean.replace(/\bto\b/g, " \\text{ to } ");
  return clean;
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
