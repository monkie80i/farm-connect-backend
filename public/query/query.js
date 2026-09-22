const sqlInput = document.getElementById('sqlInput');
const runQueryButton = document.getElementById('runQuery');
const clearQueryButton = document.getElementById('clearQuery');
const queryStatus = document.getElementById('queryStatus');
const resultsEl = document.getElementById('results');
const rowCountEl = document.getElementById('rowCount');
const copyResultsButton = document.getElementById('copyResults');

let latestResult = null;

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setStatus(message = '', type = '') {
    queryStatus.textContent = message;
    queryStatus.className = `query-status${type ? ` ${type}` : ''}`;
}

function renderResults(data) {
    latestResult = data;
    rowCountEl.textContent = `${data.rowCount} row${data.rowCount === 1 ? '' : 's'}`;
    copyResultsButton.disabled = !data.columns.length;

    if (!data.columns.length) {
        resultsEl.innerHTML = '<div class="empty-results">Query returned no columns.</div>';
        return;
    }

    if (!data.rows.length) {
        resultsEl.innerHTML = `<div class="empty-results">No rows returned.<br><br><strong>${escapeHtml(data.columns.join(' • '))}</strong></div>`;
        return;
    }

    resultsEl.innerHTML = `
        <table>
            <thead><tr>${data.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
            <tbody>
                ${data.rows.map(row => `
                    <tr>${data.columns.map(column => `<td>${escapeHtml(row[column])}</td>`).join('')}</tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function runQuery() {
    const sql = sqlInput.value.trim();
    if (!sql) {
        setStatus('Enter a SQL query first.', 'error');
        sqlInput.focus();
        return;
    }

    runQueryButton.disabled = true;
    setStatus('Running query...');

    try {
        const response = await fetch('/api/v1/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
        renderResults(data);
        setStatus('Query completed.', 'success');
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (error) {
        latestResult = null;
        rowCountEl.textContent = '';
        copyResultsButton.disabled = true;
        resultsEl.innerHTML = `<div class="empty-results">${escapeHtml(error.message)}</div>`;
        setStatus(error.message, 'error');
    } finally {
        runQueryButton.disabled = false;
    }
}

function clearQuery() {
    sqlInput.value = '';
    latestResult = null;
    rowCountEl.textContent = '';
    copyResultsButton.disabled = true;
    resultsEl.innerHTML = '<div class="empty-results">Run a query to see results.</div>';
    setStatus('');
    sqlInput.focus();
}

async function copyResults() {
    if (!latestResult || !latestResult.columns.length) return;
    const lines = [latestResult.columns.join('\t')];
    for (const row of latestResult.rows) {
        lines.push(latestResult.columns.map(column => row[column] ?? '').join('\t'));
    }
    try {
        await navigator.clipboard.writeText(lines.join('\n'));
        setStatus('Results copied to clipboard.', 'success');
    } catch {
        setStatus('Unable to copy results.', 'error');
    }
}

runQueryButton.addEventListener('click', runQuery);
clearQueryButton.addEventListener('click', clearQuery);
copyResultsButton.addEventListener('click', copyResults);
sqlInput.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        runQuery();
    }
});

resultsEl.innerHTML = '<div class="empty-results">Run a query to see results.</div>';
