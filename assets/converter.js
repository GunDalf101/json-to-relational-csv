(() => {
  const topNav = document.querySelector(".top-nav");
  const mobileToggle = document.querySelector(".mobile-toggle");
  const navLinksContainer = document.querySelector(".nav-links");
  const navDropdowns = document.querySelectorAll(".dropdown");

  navLinksContainer?.addEventListener("click", (e) => e.stopPropagation());

  if (mobileToggle && topNav) {
    mobileToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = topNav.classList.toggle("open");
      mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  navDropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".nav-button");
    const menu = dropdown.querySelector(".dropdown-menu");
    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("open");
      navDropdowns.forEach((d) => d.classList.remove("open"));
      if (!isOpen) dropdown.classList.add("open");
    });
    menu?.addEventListener("click", (e) => e.stopPropagation());
    dropdown.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        dropdown.classList.remove("open");
        topNav?.classList.remove("open");
        mobileToggle?.setAttribute("aria-expanded", "false");
      })
    );
  });

  document.querySelectorAll(".nav-link").forEach((link) =>
    link.addEventListener("click", () => {
      topNav?.classList.remove("open");
      mobileToggle?.setAttribute("aria-expanded", "false");
    })
  );

  document.addEventListener("click", () => {
    navDropdowns.forEach((d) => d.classList.remove("open"));
    topNav?.classList.remove("open");
    mobileToggle?.setAttribute("aria-expanded", "false");
  });

  const converterHost = document.getElementById("converter-placeholder");
  if (!converterHost) return;

  fetch("partials/converter.html")
    .then((res) => res.text())
    .then((html) => {
      converterHost.innerHTML = html;
      initConverter(converterHost);
    })
    .catch(() => {
      converterHost.innerHTML =
        '<div class="status show error">Failed to load converter. Please refresh.</div>';
    });

  function initConverter(scope) {
    const state = {
      mode: "json2csv",
      lastResult: null,
      explodePrimitives: false,
      replaceDots: false,
      childPrefix: "",
      unflattenCsv: false,
      delimiter: ",",
      showAdvanced: false,
    };

    const els = {
      tabs: scope.querySelectorAll(".tab"),
      inputArea: scope.querySelector("#input-area"),
      outputArea: scope.querySelector("#output-area"),
      convertBtn: scope.querySelector("#convert-btn"),
      exampleBtn: scope.querySelector("#example-btn"),
      clearBtn: scope.querySelector("#clear-btn"),
      downloadBtn: scope.querySelector("#download-btn"),
      copyBtn: scope.querySelector("#copy-btn"),
      downloadAllBtn: scope.querySelector("#download-all-btn"),
      fileInput: scope.querySelector("#file-input"),
      delimiterSelect: scope.querySelector("#delimiter-select"),
      inputLabel: scope.querySelector("#input-label"),
      outputLabel: scope.querySelector("#output-label"),
      status: scope.querySelector("#status"),
      extras: scope.querySelector("#extras"),
      explodeToggle: scope.querySelector("#explode-toggle"),
      childPrefix: scope.querySelector("#child-prefix"),
      replaceDots: scope.querySelector("#replace-dots"),
      unflattenToggle: scope.querySelector("#unflatten-toggle"),
      schemaBtn: scope.querySelector("#schema-btn"),
      sqlBtn: scope.querySelector("#sql-btn"),
      advancedToggle: scope.querySelector("#advanced-toggle"),
      advancedItems: scope.querySelectorAll(".advanced-item"),
    };

    const placeholders = {
      json2csv: {
        input:
          "Paste JSON array of objects. Nested objects flatten; arrays of objects become child tables.",
        output: "CSV output (main table) will appear here...",
        inputLabel: "JSON input",
        outputLabel: "CSV output",
        downloadName: "data.csv",
      },
      csv2json: {
        input: "Paste CSV data with headers as the first row...",
        output: "JSON output will appear here...",
        inputLabel: "CSV input",
        outputLabel: "JSON output",
        downloadName: "data.json",
      },
    };

    loadSettings();
    applySettingsToUI();

    els.tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        const mode = tab.dataset.mode;
        if (mode === state.mode) return;
        state.mode = mode;
        els.tabs.forEach((t) => t.classList.toggle("active", t === tab));
        els.tabs.forEach((t) =>
          t.setAttribute("aria-selected", t === tab ? "true" : "false")
        );
        updateModeUI();
        resetStatus();
        els.outputArea.value = "";
        els.downloadBtn.disabled = true;
      })
    );

    els.convertBtn.addEventListener("click", () => {
      resetStatus();
      const raw = els.inputArea.value.trim();
      if (!raw) {
        return showStatus("Please paste input or upload a file first.", "error");
      }
      try {
        const result =
          state.mode === "json2csv"
            ? jsonToCsvEnhanced(raw, {
                explodePrimitives: state.explodePrimitives,
                replaceDots: state.replaceDots,
                childPrefix: state.childPrefix,
                delimiter: state.delimiter,
              })
            : csvToJson(raw, {
                unflatten: state.unflattenCsv,
                delimiter: state.delimiter,
              });

        if (state.mode === "json2csv") {
          state.lastResult = result;
          els.outputArea.value = result.main.csv;
          els.downloadBtn.disabled = !result.main.csv.length;
          els.copyBtn.disabled = !result.main.csv.length;
          const hasMain = !!result.main?.csv?.length;
          const hasTables =
            Array.isArray(result.tables) && result.tables.length > 0;
          els.downloadAllBtn.disabled = !(hasMain && hasTables);
          setSchemaButtons(hasMain && hasTables);
          renderExtras(result);
          showStatus(
            `Conversion successful. Produced ${result.tables.length} table${
              result.tables.length > 1 ? "s" : ""
            }.`,
            "success"
          );
        } else {
          state.lastResult = null;
          els.outputArea.value = result.json;
          els.downloadBtn.disabled = !result.json.length;
          els.copyBtn.disabled = !result.json.length;
          els.downloadAllBtn.disabled = true;
          setSchemaButtons(false);
          renderExtras(null);
          if (result.warning) {
            showStatus(
              "Conversion completed with warnings: mixed array/object paths were coerced to object style.",
              "warning"
            );
          } else {
            showStatus("Conversion successful.", "success");
          }
        }
      } catch (err) {
        showStatus(err.message || "Conversion failed.", "error");
        els.downloadBtn.disabled = true;
        els.copyBtn.disabled = true;
        els.downloadAllBtn.disabled = true;
        setSchemaButtons(false);
        renderExtras(null);
      }
    });

    els.clearBtn.addEventListener("click", () => {
      els.inputArea.value = "";
      els.outputArea.value = "";
      els.downloadBtn.disabled = true;
      els.copyBtn.disabled = true;
      els.downloadAllBtn.disabled = true;
      resetStatus();
      els.fileInput.value = "";
      state.lastResult = null;
      renderExtras(null);
      els.explodeToggle.checked = false;
      state.explodePrimitives = false;
      els.replaceDots.checked = false;
      state.replaceDots = false;
      els.childPrefix.value = "";
      state.childPrefix = "";
      els.unflattenToggle.checked = false;
      state.unflattenCsv = false;
      setSchemaButtons(false);
      persistSettings();
    });

    els.fileInput.addEventListener("change", (event) => {
      resetStatus();
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      readFileIntoInput(file);
    });

    ["dragover", "drop"].forEach((evt) => {
      window.addEventListener(evt, (e) => e.preventDefault());
    });

    window.addEventListener("drop", (event) => {
      resetStatus();
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      readFileIntoInput(file);
    });

    els.downloadBtn.addEventListener("click", () => {
      if (state.mode === "json2csv") {
        if (!state.lastResult || !state.lastResult.main.csv) {
          return showStatus("Nothing to download yet.", "error");
        }
        const isTab = state.delimiter === "\t";
        const filename = isTab ? "data.tsv" : placeholders.json2csv.downloadName;
        downloadTable("main", state.lastResult.main.csv, "csv", filename);
        showStatus("Main table download started.", "success");
        return;
      }

      const content = els.outputArea.value;
      if (!content) {
        return showStatus("Nothing to download yet.", "error");
      }
      const blob = new Blob([content], {
        type: "application/json;charset=utf-8",
      });
      triggerDownload(blob, placeholders.csv2json.downloadName);
      showStatus("Download started.", "success");
    });

    els.exampleBtn.addEventListener("click", () => {
      resetStatus();
      if (state.mode === "json2csv") {
        els.inputArea.value = JSON.stringify(
          [
            {
              id: "proj-1001",
              name: "Demo project",
              metadata: { version: "1.2.0", tags: ["demo", "beta"] },
              owners: [
                { name: "Ada", role: "lead" },
                { name: "Lin", role: "dev" },
              ],
              events: [{ type: "deploy", at: "2024-01-02" }],
            },
            {
              id: "proj-1002",
              name: "Analytics",
              metadata: { version: "2.0.0", tags: ["analytics"] },
              owners: [{ name: "Mina", role: "data" }],
              events: [{ type: "ingest", at: "2024-02-10" }],
            },
          ],
          null,
          2
        );
        showStatus("Loaded JSON example. Click Convert to see child tables.", "success");
      } else {
        els.inputArea.value =
          "id,name,team.0,team.1,metrics.total,metrics.daily.0\n" +
          "10,Example,a,b,42,7\n" +
          "11,Sample,c,,13,3";
        showStatus(
          "Loaded CSV example. Use Unflatten to rebuild nested objects.",
          "success"
        );
      }
    });

    els.copyBtn.addEventListener("click", async () => {
      const content = els.outputArea.value;
      if (!content) {
        return showStatus("Nothing to copy yet.", "error");
      }
      try {
        await navigator.clipboard.writeText(content);
        showStatus("Copied to clipboard.", "success");
      } catch (err) {
        showStatus("Clipboard copy failed. Check permissions.", "error");
      }
    });

    els.downloadAllBtn.addEventListener("click", () => {
      if (state.mode !== "json2csv" || !state.lastResult) {
        return showStatus("Run a JSON → CSV conversion first.", "error");
      }
      const files = [];
      state.lastResult.tables.forEach((table) => {
        files.push({ name: `${table.name}.csv`, content: table.csv });
      });
      files.push({
        name: "schema-readme.md",
        content: buildReadme(state.lastResult),
      });
      files.push({
        name: "schema.sql",
        content: buildSql(state.lastResult),
      });
      const total = files.reduce((sum, f) => sum + f.content.length, 0);
      if (total > 20_000_000) {
        return showStatus(
          "ZIP may be too large for in-browser packaging (>20MB).",
          "error"
        );
      }
      const zipBlob = buildZip(files);
      triggerDownload(zipBlob, "tables.zip");
      showStatus("ZIP download started.", "success");
    });

    els.advancedToggle.addEventListener("click", () => {
      state.showAdvanced = !state.showAdvanced;
      updateAdvancedUI();
      persistSettings();
    });

    els.schemaBtn.addEventListener("click", () => {
      if (!state.lastResult) {
        return showStatus("Run a JSON → CSV conversion first.", "error");
      }
      const readme = buildReadme(state.lastResult);
      const blob = new Blob([readme], { type: "text/markdown;charset=utf-8" });
      triggerDownload(blob, "schema-readme.md");
      showStatus("Schema README download started.", "success");
    });

    els.sqlBtn.addEventListener("click", () => {
      if (!state.lastResult) {
        return showStatus("Run a JSON → CSV conversion first.", "error");
      }
      const sql = buildSql(state.lastResult);
      const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
      triggerDownload(blob, "schema.sql");
      showStatus("SQL schema download started.", "success");
    });

    function updateModeUI() {
      const meta = placeholders[state.mode];
      els.inputArea.placeholder = meta.input;
      els.outputArea.placeholder = meta.output;
      els.inputLabel.textContent = meta.inputLabel;
      els.outputLabel.textContent = meta.outputLabel;
      els.inputArea.focus();
      renderExtras(null);
      state.lastResult = null;
      els.explodeToggle.disabled = state.mode !== "json2csv";
      els.replaceDots.disabled = state.mode !== "json2csv";
      els.childPrefix.disabled = state.mode !== "json2csv";
      els.unflattenToggle.disabled = state.mode !== "csv2json";
      setSchemaButtons(false);
      els.downloadAllBtn.disabled = true;
      els.copyBtn.disabled = true;
      els.downloadBtn.disabled = true;
      persistSettings();
    }

    function updateAdvancedUI() {
      const hidden = !state.showAdvanced;
      els.advancedItems.forEach((el) => {
        if (hidden) {
          el.classList.add("advanced-hidden");
        } else {
          el.classList.remove("advanced-hidden");
        }
      });
      els.advancedToggle.textContent = hidden
        ? "Show advanced options"
        : "Hide advanced options";
    }

    els.explodeToggle.addEventListener("change", (e) => {
      state.explodePrimitives = e.target.checked;
      persistSettings();
    });

    els.replaceDots.addEventListener("change", (e) => {
      state.replaceDots = e.target.checked;
      persistSettings();
    });

    els.delimiterSelect.addEventListener("change", (e) => {
      const v = e.target.value;
      state.delimiter = v === "\\t" ? "\t" : v;
      persistSettings();
    });

    els.childPrefix.addEventListener("input", (e) => {
      state.childPrefix = e.target.value || "";
      persistSettings();
    });

    els.unflattenToggle.addEventListener("change", (e) => {
      state.unflattenCsv = e.target.checked;
      persistSettings();
    });

    function resetStatus() {
      els.status.className = "status";
      els.status.textContent = "";
    }

    function showStatus(message, type) {
      els.status.textContent = message;
      els.status.className = `status show ${type || ""}`;
    }

    function renderExtras(result) {
      if (state.mode !== "json2csv") {
        els.extras.innerHTML = "";
        els.extras.style.display = "none";
        return;
      }
      els.extras.style.display = "flex";
      if (!result) {
        els.extras.innerHTML = "";
        return;
      }

      const frag = document.createDocumentFragment();

      if (result.notes.length) {
        const note = document.createElement("div");
        note.className = "note";
        const title = document.createElement("strong");
        title.textContent = "Notes:";
        note.appendChild(title);

        const listEl = document.createElement("div");
        listEl.className = "pill-list";
        result.notes.forEach((n) => {
          const pill = document.createElement("div");
          pill.className = "pill";
          pill.textContent = n;
          listEl.appendChild(pill);
        });
        note.appendChild(listEl);
        frag.appendChild(note);
      }

      const extraTables = result.tables.filter((t) => t.name !== "main");
      const wrap = document.createElement("div");
      wrap.className = "extras-list";
      if (extraTables.length === 0) {
        wrap.innerHTML = '<div class="muted">No nested array tables produced.</div>';
      } else {
        extraTables.forEach((t) => {
          const item = document.createElement("div");
          item.className = "extra-table";
          const origin = t.rawPath ? ` (from ${t.rawPath})` : "";
          item.innerHTML = `<div><strong>${t.name}</strong>${origin}<div class="muted">${t.rows} rows, ${t.columns} cols</div></div>`;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "secondary small";
          btn.textContent = "Download CSV";
          btn.addEventListener("click", () => downloadTable(t.name, t.csv, "csv"));
          item.appendChild(btn);
          wrap.appendChild(item);
        });
      }

      frag.appendChild(wrap);
      els.extras.innerHTML = "";
      els.extras.appendChild(frag);
    }

    function downloadTable(name, content, ext, filenameOverride) {
      if (!content) {
        return showStatus(`Table "${name}" is empty.`, "error");
      }
      const blob = new Blob([content], {
        type:
          ext === "csv"
            ? "text/csv;charset=utf-8"
            : "application/json;charset=utf-8",
      });
      const filename = filenameOverride || `${name}.${ext}`;
      triggerDownload(blob, filename);
    }

    function triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function readFileIntoInput(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        els.inputArea.value = e.target?.result || "";
        showStatus(`Loaded "${file.name}" (${file.size} bytes).`, "success");
      };
      reader.onerror = () => {
        showStatus("Could not read file. Please try again.", "error");
      };
      reader.readAsText(file);
    }

    function setSchemaButtons(enabled) {
      const on = enabled && state.mode === "json2csv";
      els.schemaBtn.disabled = !on;
      els.sqlBtn.disabled = !on;
    }

    function persistSettings() {
      const payload = {
        mode: state.mode,
        explodePrimitives: state.explodePrimitives,
        replaceDots: state.replaceDots,
        childPrefix: state.childPrefix,
        unflattenCsv: state.unflattenCsv,
        delimiter: state.delimiter,
        showAdvanced: state.showAdvanced,
      };
      localStorage.setItem("converter-settings", JSON.stringify(payload));
    }

    function loadSettings() {
      try {
        const raw = localStorage.getItem("converter-settings");
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.mode) state.mode = saved.mode;
        state.explodePrimitives = !!saved.explodePrimitives;
        state.replaceDots = !!saved.replaceDots;
        state.childPrefix = saved.childPrefix || "";
        state.unflattenCsv = !!saved.unflattenCsv;
        state.delimiter = saved.delimiter || ",";
        if (state.delimiter === "\\t") state.delimiter = "\t";
        if (state.delimiter === "tab") state.delimiter = "\t";
        state.showAdvanced = !!saved.showAdvanced;
      } catch (err) {
        console.warn("Could not load saved settings", err);
      }
    }

    function applySettingsToUI() {
      els.explodeToggle.checked = state.explodePrimitives;
      els.replaceDots.checked = state.replaceDots;
      els.childPrefix.value = state.childPrefix;
      els.unflattenToggle.checked = state.unflattenCsv;
      els.delimiterSelect.value = state.delimiter;
      updateAdvancedUI();
      els.tabs.forEach((t) => {
        const active = t.dataset.mode === state.mode;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      updateModeUI();
    }

    function jsonToCsvEnhanced(text, options = {}) {
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Invalid JSON. Please check your input.");
      }

      if (!Array.isArray(data)) {
        data = [data];
      }
      if (data.length === 0) {
        throw new Error("JSON array is empty.");
      }
      if (!data.every((item) => typeof item === "object" && item !== null)) {
        throw new Error("JSON array must contain objects.");
      }

      const notes = new Set();
      const childTables = new Map();
      const tableNameCache = new Map();
      const mainRows = [];
      const usedNames = new Set(["main"]);

      const getId = (row, idx) => {
        const candidate = row.id ?? row._id ?? row.uuid;
        if (
          typeof candidate === "string" ||
          typeof candidate === "number" ||
          typeof candidate === "boolean"
        ) {
          return String(candidate);
        }
        return String(idx + 1);
      };

      const tableNameForPath = (path) => {
        const base = options.childPrefix ? `${options.childPrefix}${path}` : path;
        const transformed = options.replaceDots ? base.replace(/\./g, "_") : base;
        const safe = transformed || "child";
        let candidate = safe;
        let counter = 2;
        while (usedNames.has(candidate)) {
          candidate = `${safe}_${counter}`;
          counter += 1;
        }
        usedNames.add(candidate);
        return candidate;
      };

      const ensureChildTable = (rawPath) => {
        let finalName = tableNameCache.get(rawPath);
        if (!finalName) {
          finalName = tableNameForPath(rawPath);
          tableNameCache.set(rawPath, finalName);
        }
        if (!childTables.has(finalName)) {
          childTables.set(finalName, { rows: [], rawPath });
        }
        return childTables.get(finalName);
      };

      const flattenObject = (obj, row, prefix, parentRowId) => {
        Object.entries(obj).forEach(([key, val]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          if (Array.isArray(val)) {
            handleArray(val, path, parentRowId, row);
          } else if (isPlainObject(val)) {
            notes.add(`Flattened nested object at "${path}".`);
            flattenObject(val, row, path, parentRowId);
          } else {
            row[path] = val;
          }
        });
      };

      const isPlainObject = (val) =>
        val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date);

      const handleArray = (arr, path, parentRowId, targetRow) => {
        if (arr.every((item) => isPlainObject(item))) {
          const table = ensureChildTable(path);
          notes.add(
            `Split array at "${path}" into child table with _parent_row_id.`
          );
          arr.forEach((item, idx) => {
            const childRow = { _parent_row_id: parentRowId, _index: idx };
            flattenObject(item, childRow, "", parentRowId);
            table.rows.push(childRow);
          });
          return;
        }

        if (
          options.explodePrimitives &&
          arr.every(
            (item) =>
              !isPlainObject(item) &&
              !Array.isArray(item) &&
              !(item instanceof Date)
          )
        ) {
          const table = ensureChildTable(path);
          notes.add(
            `Exploded primitive array at "${path}" into child table with value column.`
          );
          arr.forEach((item, idx) =>
            table.rows.push({
              _parent_row_id: parentRowId,
              _index: idx,
              value: item,
            })
          );
          return;
        }

        targetRow[path] = JSON.stringify(arr);
        notes.add(
          `Array at "${path}" stringified (non-object, mixed, or nested arrays).`
        );
      };

      data.forEach((item, idx) => {
        const row = {};
        row._row_id = getId(item, idx);
        flattenObject(item, row, "", row._row_id);
        mainRows.push(row);
      });

      const tables = [];

      const createTable = (name, rows, opts = {}) => {
        const { csv, headers } = toCsv(rows, options.delimiter);
        const types = inferTypes(rows, headers);
        return {
          name,
          csv,
          headers,
          rows: rows.length,
          columns: headers.length,
          types,
          foreignKeys: opts.foreignKeys || [],
          rawPath: opts.rawPath,
        };
      };

      tables.push(createTable("main", mainRows, { rawPath: "root" }));

      for (const [finalName, tableData] of childTables.entries()) {
        tables.push(
          createTable(finalName, tableData.rows, {
            foreignKeys: [
              {
                column: "_parent_row_id",
                references: "main._row_id",
                note: `From array at "${tableData.rawPath}".`,
              },
            ],
            rawPath: tableData.rawPath,
          })
        );
      }

      if (tables.length === 1) {
        notes.add("No nested arrays detected; single table produced.");
      } else {
        notes.add("Nested arrays normalized into separate CSV tables.");
        notes.add("ZIP export is best for datasets under ~10–20MB in-browser.");
      }

      return {
        main: tables[0],
        tables,
        notes: Array.from(notes),
      };
    }

    function toCsv(rows, delimiter = ",") {
      if (!rows.length) return { csv: "", headers: [] };
      const headers = Array.from(
        rows.reduce((set, row) => {
          Object.keys(row).forEach((key) => set.add(key));
          return set;
        }, new Set())
      );

      const escapeCell = (value) => {
        const isTab = delimiter === "\t";
        const str =
          value === null || value === undefined
            ? ""
            : value instanceof Date
            ? value.toISOString()
            : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
        const needsQuotes =
          str.includes('"') ||
          str.includes("\n") ||
          str.includes("\r") ||
          (!isTab && str.includes(delimiter));
        const escaped = str.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      const rowsOut = rows.map((row) =>
        headers.map((h) => escapeCell(row[h])).join(delimiter)
      );

      return { csv: [headers.join(delimiter), ...rowsOut].join("\n"), headers };
    }

    function inferTypes(rows, headers) {
      const types = {};
      const priority = {
        null: 1,
        boolean: 2,
        integer: 3,
        number: 4,
        text: 5,
        string: 7,
      };

      const detect = (val) => {
        if (val === null || val === undefined) return "null";
        if (typeof val === "boolean") return "boolean";
        if (typeof val === "number" && Number.isFinite(val)) {
          return Number.isInteger(val) ? "integer" : "number";
        }
        if (Array.isArray(val)) return "text";
        if (typeof val === "object") return "text";
        return "string";
      };

      headers.forEach((h) => {
        let bestType = "null";
        let bestScore = priority[bestType];
        for (const row of rows) {
          const t = detect(row[h]);
          const score = priority[t] ?? priority.string;
          if (score > bestScore) {
            bestType = t;
            bestScore = score;
            if (bestType === "string") break;
          }
        }
        types[h] = bestType === "null" ? "string" : bestType;
      });
      return types;
    }

    function buildReadme(schema) {
      const lines = [];
      lines.push("# JSON → Relational CSV schema");
      lines.push("");
      lines.push(
        "Differentiators: child tables for arrays, `_parent_row_id` links, and notes capturing transformations."
      );
      lines.push("");
      if (schema.notes && schema.notes.length) {
        lines.push("## Notes");
        schema.notes.forEach((n) => lines.push(`- ${n}`));
        lines.push("");
      }
      lines.push("## Tables");
      lines.push("");
      schema.tables.forEach((table) => {
        lines.push(`### ${table.name}`);
        if (table.rawPath && table.rawPath !== "root") {
          lines.push(`Origin: ${table.rawPath}`);
        }
        lines.push(
          `Rows: ${table.rows}, Columns: ${table.columns}${
            table.foreignKeys.length
              ? `, Foreign keys: ${table.foreignKeys
                  .map((fk) => `${fk.column} → ${fk.references}`)
                  .join("; ")}`
              : ""
          }`
        );
        lines.push("Columns:");
        table.headers.forEach((h) => {
          const type = table.types?.[h] || "string";
          lines.push(`- ${h} (${type})`);
        });
        if (table.foreignKeys.length) {
          lines.push("Foreign keys:");
          table.foreignKeys.forEach((fk) =>
            lines.push(
              `- ${fk.column} → ${fk.references}${
                fk.note ? ` (${fk.note})` : ""
              }`
            )
          );
        }
        lines.push("");
      });
      return lines.join("\n");
    }

    function buildSql(schema) {
      const quote = (id) => `"${String(id).replace(/"/g, '""')}"`;
      const sqlType = (t) => {
        switch (t) {
          case "integer":
            return "INTEGER";
          case "number":
            return "REAL";
          case "boolean":
            return "BOOLEAN";
          default:
            return "TEXT";
        }
      };

      const statements = schema.tables.map((table) => {
        const cols = table.headers.map(
          (h) => `${quote(h)} ${sqlType(table.types?.[h])}`
        );
        const constraints = [];

        if (table.name === "main" && table.headers.includes("_row_id")) {
          constraints.push(`PRIMARY KEY (${quote("_row_id")})`);
        } else if (
          table.headers.includes("_parent_row_id") &&
          table.headers.includes("_index")
        ) {
          constraints.push(
            `PRIMARY KEY (${quote("_parent_row_id")}, ${quote("_index")})`
          );
        }

        if (table.foreignKeys.length) {
          table.foreignKeys.forEach((fk) => {
            const [refTable, refCol] = fk.references.split(".");
            constraints.push(
              `FOREIGN KEY (${quote(fk.column)}) REFERENCES ${quote(
                refTable
              )}(${quote(refCol)})`
            );
          });
        }

        const body = [...cols, ...constraints].join(",\n  ");
        return `CREATE TABLE ${quote(table.name)} (\n  ${body}\n);`;
      });

      return statements.join("\n\n");
    }

    function buildZip(files) {
      const encoder = new TextEncoder();
      let offset = 0;
      const fileParts = [];
      const centralParts = [];

      const crcTable = (() => {
        let c;
        const table = [];
        for (let n = 0; n < 256; n++) {
          c = n;
          for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
          }
          table[n] = c >>> 0;
        }
        return table;
      })();

      const crc32 = (data) => {
        let crc = ~0;
        for (let i = 0; i < data.length; i++) {
          crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
        }
        return (~crc) >>> 0;
      };

      const writeUInt32 = (view, offset, value) =>
        view.setUint32(offset, value, true);
      const writeUInt16 = (view, offset, value) =>
        view.setUint16(offset, value, true);

      files.forEach((file) => {
        const nameBytes = encoder.encode(file.name);
        const data = encoder.encode(file.content);
        const crc = crc32(data);
        const localHeader = new DataView(new ArrayBuffer(30));
        writeUInt32(localHeader, 0, 0x04034b50);
        writeUInt16(localHeader, 4, 20);
        writeUInt16(localHeader, 6, 0);
        writeUInt16(localHeader, 8, 0);
        writeUInt16(localHeader, 10, 0);
        writeUInt16(localHeader, 12, 0);
        writeUInt32(localHeader, 14, crc);
        writeUInt32(localHeader, 18, data.length);
        writeUInt32(localHeader, 22, data.length);
        writeUInt16(localHeader, 26, nameBytes.length);
        writeUInt16(localHeader, 28, 0);

        const localPart = new Uint8Array(30 + nameBytes.length + data.length);
        localPart.set(new Uint8Array(localHeader.buffer), 0);
        localPart.set(nameBytes, 30);
        localPart.set(data, 30 + nameBytes.length);
        fileParts.push(localPart);

        const centralHeader = new DataView(new ArrayBuffer(46));
        writeUInt32(centralHeader, 0, 0x02014b50);
        writeUInt16(centralHeader, 4, 20);
        writeUInt16(centralHeader, 6, 20);
        writeUInt16(centralHeader, 8, 0);
        writeUInt16(centralHeader, 10, 0);
        writeUInt16(centralHeader, 12, 0);
        writeUInt16(centralHeader, 14, 0);
        writeUInt32(centralHeader, 16, crc);
        writeUInt32(centralHeader, 20, data.length);
        writeUInt32(centralHeader, 24, data.length);
        writeUInt16(centralHeader, 28, nameBytes.length);
        writeUInt16(centralHeader, 30, 0);
        writeUInt16(centralHeader, 32, 0);
        writeUInt16(centralHeader, 34, 0);
        writeUInt16(centralHeader, 36, 0);
        writeUInt32(centralHeader, 38, 0);
        writeUInt32(centralHeader, 42, offset);

        const centralPart = new Uint8Array(46 + nameBytes.length);
        centralPart.set(new Uint8Array(centralHeader.buffer), 0);
        centralPart.set(nameBytes, 46);
        centralParts.push(centralPart);

        offset += localPart.length;
      });

      const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
      const centralOffset = offset;
      const endRecord = new DataView(new ArrayBuffer(22));
      writeUInt32(endRecord, 0, 0x06054b50);
      writeUInt16(endRecord, 4, 0);
      writeUInt16(endRecord, 6, 0);
      writeUInt16(endRecord, 8, files.length);
      writeUInt16(endRecord, 10, files.length);
      writeUInt32(endRecord, 12, centralSize);
      writeUInt32(endRecord, 16, centralOffset);
      writeUInt16(endRecord, 20, 0);

      const blobParts = [...fileParts, ...centralParts, new Uint8Array(endRecord.buffer)];
      return new Blob(blobParts, { type: "application/zip" });
    }

    function csvToJson(text, options = {}) {
      const rows = parseCsv(text, options.delimiter || ",");
      if (rows.length === 0) {
        throw new Error("CSV is empty.");
      }
      const headers = rows[0];
      if (!headers.length) {
        throw new Error("Header row is empty.");
      }
      let inconsistent = false;
      const records = rows.slice(1).map((cells, idx) => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = cells[i] ?? "";
        });
        const res = options?.unflatten
          ? unflattenObject(obj, () => {
              inconsistent = true;
            })
          : obj;
        return res;
      });
      return {
        json: JSON.stringify(records, null, 2),
        warning: inconsistent,
      };
    }

    function unflattenObject(flat, onInconsistent) {
      const result = {};

      for (const [key, value] of Object.entries(flat)) {
        const parts = key.split(".");
        let cur = result;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;

          const nextPart = parts[i + 1];
          const nextIsIndex = /^\d+$/.test(nextPart || "");
          const isIndex = /^\d+$/.test(part);
          const idx = isIndex ? Number(part) : null;

          if (isLast) {
            if (isIndex) {
              if (!Array.isArray(cur)) {
                cur[part] = value;
                onInconsistent?.();
              } else {
                cur[idx] = value;
              }
            } else {
              cur[part] = value;
            }
            break;
          }

          if (isIndex) {
            if (!Array.isArray(cur)) {
              if (!cur[part] || typeof cur[part] !== "object") {
                cur[part] = nextIsIndex ? [] : {};
                onInconsistent?.();
              }
              cur = cur[part];
            } else {
              if (!cur[idx] || typeof cur[idx] !== "object") {
                cur[idx] = nextIsIndex ? [] : {};
              }
              cur = cur[idx];
            }
          } else {
            if (!cur[part] || typeof cur[part] !== "object") {
              cur[part] = nextIsIndex ? [] : {};
            }
            cur = cur[part];
          }
        }
      }

      return result;
    }

    function parseCsv(text, delimiter = ",") {
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
      }
      const rows = [];
      let current = [];
      let cell = "";
      let inQuotes = false;
      const pushCell = () => {
        current.push(cell);
        cell = "";
      };
      const pushRow = () => {
        rows.push(current);
        current = [];
      };

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            cell += '"';
            i += 1;
            continue;
          }
          inQuotes = !inQuotes;
          continue;
        }

        if (
          !inQuotes &&
          (char === delimiter || char === "\n" || char === "\r")
        ) {
          pushCell();
          if (char === "\n" || char === "\r") {
            if (char === "\r" && next === "\n") {
              i += 1;
            }
            pushRow();
          }
          continue;
        }

        cell += char;
      }

      pushCell();
      pushRow();

      if (
        rows.length &&
        rows[rows.length - 1].every((c) => c === "") &&
        (rows.length === 1 || rows[rows.length - 1].length === rows[0].length)
      ) {
        rows.pop();
      }
      return rows;
    }

    updateModeUI();
  }
})();

