const mainTablesEl = document.getElementById('mainTables');
const lookupTablesEl = document.getElementById('lookupTables');
const contentEl = document.getElementById('content');

let currentTable = null;
let currentType = null;

function setupCollapsibleSections() {
    document.querySelectorAll('[data-section-toggle]').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.closest('.nav-section');
            section.classList.toggle('collapsed');
            button.setAttribute('aria-expanded', String(!section.classList.contains('collapsed')));
        });

        button.setAttribute('aria-expanded', 'true');
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
}

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

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

        if (type === 'main') {
            loadMainTable(tableName);
        } else {
            loadLookupTable(tableName);
        }
    });

    return button;
}

function renderNavigation(data) {
    mainTablesEl.replaceChildren();
    lookupTablesEl.replaceChildren();

    if (!data.mainTables.length) {
        mainTablesEl.innerHTML = '<div class="empty-state">No main tables.</div>';
    } else {
        data.mainTables.forEach(tableName => {
            mainTablesEl.appendChild(createTableLink(tableName, 'main'));
        });
    }

    if (!data.lookupTables.length) {
        lookupTablesEl.innerHTML = '<div class="empty-state">No lookup tables.</div>';
    } else {
        data.lookupTables.forEach(tableName => {
            lookupTablesEl.appendChild(createTableLink(tableName, 'lookup'));
        });
    }
}

function setActiveLink(tableName, type) {
    document.querySelectorAll('.table-link').forEach(link => {
        link.classList.toggle(
            'active',
            link.dataset.tableName === tableName && link.dataset.type === type
        );
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
        return `
            <div class="card">
                <div class="card-title">${escapeHtml(title)}</div>
                <div class="empty-state">No records.</div>
            </div>
        `;
    }

    return `
        <div class="card">
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderMainTable(data) {
    const columnRows = data.columns.map(column => [
        column.cid,
        column.name,
        column.type || '—',
        column.notnull ? 'Yes' : 'No',
        column.dflt_value === null ? '—' : column.dflt_value,
        column.pk ? 'Yes' : 'No'
    ]);

    const foreignKeyRows = data.foreignKeys.map(fk => [
        fk.from,
        fk.table,
        fk.to,
        fk.onUpdate || 'NO ACTION',
        fk.onDelete || 'NO ACTION',
        fk.match || 'NONE'
    ]);

    const referencedByRows = data.referencedBy.map(fk => [
        fk.table,
        fk.from,
        fk.to,
        fk.onUpdate || 'NO ACTION',
        fk.onDelete || 'NO ACTION'
    ]);

    contentEl.innerHTML = `
        <div class="content-header">
            <h1>${escapeHtml(data.tableName)}</h1>
            <span class="type-label">Main table</span>
        </div>

        ${renderTable(
            'Columns',
            ['#', 'Column', 'Data Type', 'Not Null', 'Default', 'Primary Key'],
            columnRows
        )}

        ${renderTable(
            'Foreign Keys',
            ['Column', 'References Table', 'References Column', 'On Update', 'On Delete', 'Match'],
            foreignKeyRows
        )}

        ${renderTable(
            'Referenced By',
            ['Source Table', 'Source Column', 'This Table Column', 'On Update', 'On Delete'],
            referencedByRows
        )}
    `;
}

function renderLookupTable(data) {
    const rows = data.rows.map(row => [row.Code, row.Description]);

    contentEl.innerHTML = `
        <div class="content-header">
            <h1>${escapeHtml(data.tableName)}</h1>
            <span class="type-label">Generic lookup table</span>
        </div>

        ${renderTable('Data', ['Code', 'Description'], rows)}
    `;
}

async function loadMainTable(tableName) {
    currentTable = tableName;
    currentType = 'main';
    setActiveLink(tableName, 'main');
    contentEl.innerHTML = '<div class="loading">Loading table structure...</div>';

    try {
        const data = await fetchJson(`/api/v1/tables/schema/${encodeURIComponent(tableName)}`);
        renderMainTable(data);
    } catch (error) {
        contentEl.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    }
}

async function loadLookupTable(tableName) {
    currentTable = tableName;
    currentType = 'lookup';
    setActiveLink(tableName, 'lookup');
    contentEl.innerHTML = '<div class="loading">Loading lookup data...</div>';

    try {
        const data = await fetchJson(`/api/v1/tables/lookup/${encodeURIComponent(tableName)}`);
        renderLookupTable(data);
    } catch (error) {
        contentEl.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    }
}

async function initialize() {
    setupCollapsibleSections();
    contentEl.innerHTML = '<div class="loading">Loading tables...</div>';

    try {
        const data = await fetchJson('/api/v1/tables');
        renderNavigation(data);

        if (data.mainTables.length) {
            await loadMainTable(data.mainTables[0]);
        } else if (data.lookupTables.length) {
            await loadLookupTable(data.lookupTables[0]);
        } else {
            contentEl.innerHTML = '<div class="empty-state"><h2>No tables found</h2><p>The database does not contain any user tables.</p></div>';
        }
    } catch (error) {
        contentEl.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
    }
}

initialize();
