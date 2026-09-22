const mainTablesEl = document.getElementById('mainTables');
const lookupTablesEl = document.getElementById('lookupTables');
const mainSearchEl = document.getElementById('mainTableSearch');
const lookupSearchEl = document.getElementById('lookupTableSearch');
const clearMainSearchButton = document.getElementById('clearMainSearch');
const clearLookupSearchButton = document.getElementById('clearLookupSearch');
const contentEl = document.getElementById('content');
let currentTable = null;
let currentType = null;
let navigationData = { mainTables: [], lookupTables: [] };

function setupCollapsibleSections() {
    document.querySelectorAll('[data-section-toggle]').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.closest('.nav-section');
            section.classList.toggle('collapsed');
            button.setAttribute('aria-expanded', String(!section.classList.contains('collapsed')));
        });
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
}

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
}

function createTableLink(tableName, type) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'table-link';
    button.textContent = tableName;
    button.dataset.tableName = tableName;
    button.dataset.type = type;
    button.addEventListener('click', () => {
        scrollToTop();
        if (type === 'main') loadMainTable(tableName);
        else loadLookupTable(tableName);
    });
    return button;
}

function getFilteredTables(tables, searchText) {
    const query = searchText.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter(name => name.toLowerCase().includes(query));
}

function renderNavigationLists() {
    const filteredMain = getFilteredTables(navigationData.mainTables, mainSearchEl.value);
    const filteredLookup = getFilteredTables(navigationData.lookupTables, lookupSearchEl.value);

    mainTablesEl.replaceChildren();
    lookupTablesEl.replaceChildren();

    if (!filteredMain.length) {
        mainTablesEl.innerHTML = `<div class="nav-empty">${mainSearchEl.value.trim() ? 'No matching tables.' : 'No main tables.'}</div>`;
    } else {
        filteredMain.forEach(name => mainTablesEl.appendChild(createTableLink(name, 'main')));
    }

    if (!filteredLookup.length) {
        lookupTablesEl.innerHTML = `<div class="nav-empty">${lookupSearchEl.value.trim() ? 'No matching tables.' : 'No lookup tables.'}</div>`;
    } else {
        filteredLookup.forEach(name => lookupTablesEl.appendChild(createTableLink(name, 'lookup')));
    }

    if (currentTable) setActiveLink(currentTable, currentType);
}

function setupSearch(input, clearButton) {
    input.addEventListener('input', () => {
        clearButton.classList.toggle('visible', Boolean(input.value));
        renderNavigationLists();
    });
    clearButton.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    });
}

function setActiveLink(tableName, type) {
    document.querySelectorAll('.table-link').forEach(link => {
        link.classList.toggle('active', link.dataset.tableName === tableName && link.dataset.type === type);
    });
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderTable(title, headers, rows) {
    if (!rows.length) {
        return `<div class="card"><div class="card-title">${escapeHtml(title)}</div><div class="empty-state compact">No records.</div></div>`;
    }
    return `
        <div class="card">
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="table-wrapper">
                <table><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>
            </div>
        </div>`;
}

function createSchemaCopyText(data) {
    const lines = [`TABLE: ${data.tableName}`, '', 'COLUMNS', '-------'];
    for (const column of data.columns) {
        lines.push(`${column.cid}. ${column.name} | ${column.type || '—'} | NOT NULL: ${column.notnull ? 'YES' : 'NO'} | DEFAULT: ${column.dflt_value === null ? '—' : column.dflt_value} | PK: ${column.pk ? 'YES' : 'NO'}`);
    }

    lines.push('', 'FOREIGN KEYS', '------------');
    if (data.foreignKeys.length) {
        for (const fk of data.foreignKeys) {
            lines.push(`${fk.from} -> ${fk.table}.${fk.to} | ON UPDATE: ${fk.onUpdate || 'NO ACTION'} | ON DELETE: ${fk.onDelete || 'NO ACTION'} | MATCH: ${fk.match || 'NONE'}`);
        }
    } else {
        lines.push('None');
    }

    lines.push('', 'REFERENCED BY', '-------------');
    if (data.referencedBy.length) {
        for (const fk of data.referencedBy) {
            lines.push(`${fk.table}.${fk.from} -> ${data.tableName}.${fk.to} | ON UPDATE: ${fk.onUpdate || 'NO ACTION'} | ON DELETE: ${fk.onDelete || 'NO ACTION'}`);
        }
    } else {
        lines.push('None');
    }

    return lines.join('\n');
}

async function copyText(text, successMessage = 'Copied to clipboard.') {
    try {
        await navigator.clipboard.writeText(text);
        const button = document.activeElement;
        if (button?.classList.contains('copy-button')) {
            const original = button.textContent;
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = original; }, 1200);
        }
    } catch (error) {
        console.error('Copy failed:', error);
        alert('Unable to copy to clipboard. Please copy the text manually.');
    }
}

function renderMainTable(data) {
    const columnRows = data.columns.map(column => [column.cid, column.name, column.type || '—', column.notnull ? 'Yes' : 'No', column.dflt_value === null ? '—' : column.dflt_value, column.pk ? 'Yes' : 'No']);
    const foreignKeyRows = data.foreignKeys.map(fk => [fk.from, fk.table, fk.to, fk.onUpdate || 'NO ACTION', fk.onDelete || 'NO ACTION', fk.match || 'NONE']);
    const referencedByRows = data.referencedBy.map(fk => [fk.table, fk.from, fk.to, fk.onUpdate || 'NO ACTION', fk.onDelete || 'NO ACTION']);

    contentEl.innerHTML = `
        <div class="content-header">
            <div><h1>${escapeHtml(data.tableName)}</h1><span class="type-label">Main table</span></div>
            <button type="button" class="copy-button">Copy Table Info</button>
        </div>
        ${renderTable('Columns', ['#', 'Column', 'Data Type', 'Not Null', 'Default', 'Primary Key'], columnRows)}
        ${renderTable('Foreign Keys', ['Column', 'References Table', 'References Column', 'On Update', 'On Delete', 'Match'], foreignKeyRows)}
        ${renderTable('Referenced By', ['Source Table', 'Source Column', 'This Table Column', 'On Update', 'On Delete'], referencedByRows)}
    `;

    contentEl.querySelector('.copy-button').addEventListener('click', event => copyText(createSchemaCopyText(data)));
}

function renderLookupTable(data) {
    const rows = data.rows.map(row => [row.Code, row.Description]);
    contentEl.innerHTML = `
        <div class="content-header">
            <div><h1>${escapeHtml(data.tableName)}</h1><span class="type-label">Generic lookup table</span></div>
        </div>
        ${renderTable('Data', ['Code', 'Description'], rows)}
    `;
}

async function loadMainTable(tableName) {
    currentTable = tableName; currentType = 'main'; setActiveLink(tableName, 'main');
    contentEl.innerHTML = '<div class="loading">Loading table structure...</div>';
    try { renderMainTable(await fetchJson(`/api/v1/tables/schema/${encodeURIComponent(tableName)}`)); }
    catch (error) { contentEl.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`; }
}

async function loadLookupTable(tableName) {
    currentTable = tableName; currentType = 'lookup'; setActiveLink(tableName, 'lookup');
    contentEl.innerHTML = '<div class="loading">Loading lookup data...</div>';
    try { renderLookupTable(await fetchJson(`/api/v1/tables/lookup/${encodeURIComponent(tableName)}`)); }
    catch (error) { contentEl.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`; }
}

async function initialize() {
    setupCollapsibleSections();
    setupSearch(mainSearchEl, clearMainSearchButton);
    setupSearch(lookupSearchEl, clearLookupSearchButton);
    contentEl.innerHTML = '<div class="loading">Loading tables...</div>';

    try {
        navigationData = await fetchJson('/api/v1/tables');
        renderNavigationLists();
        if (navigationData.mainTables.length) await loadMainTable(navigationData.mainTables[0]);
        else if (navigationData.lookupTables.length) await loadLookupTable(navigationData.lookupTables[0]);
        else contentEl.innerHTML = '<div class="empty-state"><h2>No tables found</h2><p>The database does not contain any user tables.</p></div>';
    } catch (error) {
        contentEl.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    }
}

initialize();
