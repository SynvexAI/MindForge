let md;

function initializeMarkdownIt() {
    if (window.markdownit) {
        md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
        });

        // Интеграция с KaTeX
        if (window.katex) {
            const originalRender = md.render.bind(md);
            md.render = function (str, env) {
                let html = originalRender(str, env);
                try {
                    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (m, expr) =>
                        katex.renderToString(expr, { displayMode: true, throwOnError: false })
                    );
                    html = html.replace(/\$([^\$\n]+?)\$/g, (m, expr) =>
                        katex.renderToString(expr, { displayMode: false, throwOnError: false })
                    );
                } catch (e) {
                    console.warn('KaTeX render failed', e);
                }
                return html;
            };
        }
    } else {
        console.error("markdown-it library is not loaded!");
    }
}


const Utils = {
    escapeHtml: (str) => {
        if (typeof str !== 'string') return '';
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML.replace(/"/g, '&quot;'); // Дополнительно экранируем кавычки для data-атрибутов
    },
    addTempAnimation: (element, className, durationMs = 1000) => {
        if (!(element instanceof HTMLElement) || !className) return;
        element.classList.add(className);
        const remove = () => element.classList.remove(className);
        element.addEventListener('animationend', remove, {
            once: true
        });
        setTimeout(remove, durationMs);
    },

    formatText: (text) => {
        if (typeof text !== 'string' || !text) return '';
        if (!md) initializeMarkdownIt(); // Инициализируем, если еще не сделано

        const defaultFenceRenderer = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
            return self.renderToken(tokens, idx, options);
        };

        md.renderer.rules.fence = function(tokens, idx) {
            const token = tokens[idx];
            const codeContent = token.content;
            const languageHint = token.info ? md.utils.unescapeAll(token.info).trim() : '';
            let actualLanguage = 'plaintext';
            let filename = '';

            if (languageHint.includes(':')) {
                const parts = languageHint.split(':', 2);
                actualLanguage = parts[0].trim() || 'plaintext';
                filename = parts[1].trim();
            } else {
                actualLanguage = languageHint.trim() || 'plaintext';
            }

            if (actualLanguage.toLowerCase() === 'mermaid') {
                const escapedContent = Utils.escapeHtml(codeContent);
                return `<div class="mermaid">${escapedContent}</div>`;
            }

            if (actualLanguage.toLowerCase() === 'chartjs') {
                const chartId = `chart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                return `<div class="chart-container" data-chart-id="${chartId}" data-chart-data="${Utils.escapeHtml(codeContent)}"><canvas id="${chartId}" width="400" height="300"></canvas><div class="chart-loading">Загрузка графика...</div></div>`;
            }

            if (actualLanguage.toLowerCase() === 'd3js') {
                const d3Id = `d3_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                 return `<div class="d3-container" data-d3-id="${d3Id}" data-d3-data="${Utils.escapeHtml(codeContent)}"><div id="${d3Id}" class="d3-visualization"></div><div class="d3-loading">Загрузка визуализации...</div></div>`;
            }

            if (!filename) {
                filename = actualLanguage === 'plaintext' ? "Code Snippet" : (actualLanguage.charAt(0).toUpperCase() + actualLanguage.slice(1));
            }

            const escapedContent = Utils.escapeHtml(codeContent);
            const commonButtonsHtml = `
                <button class="download-code-btn" title="Скачать файл"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
                <button class="copy-code-btn" title="Скопировать код"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;
            const expandCollapseButtonHtml = `
                <button class="toggle-code-btn" title="Развернуть">
                    <svg class="icon-expand" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px" style="display: block;"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                    <svg class="icon-collapse" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px" style="display: none;"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
                </button>`;

            if (actualLanguage.toLowerCase() === 'html') {
                const iframeStyles = `<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;margin:15px;color:#333;background-color:#fff}h1,h2,h3,h4,h5,h6{margin-top:1em;margin-bottom:.5em;font-weight:600}p{margin-bottom:1em}a{color:#007bff;text-decoration:none}a:hover{text-decoration:underline}pre{background-color:#f8f9fa;border:1px solid #dee2e6;padding:10px;border-radius:4px;overflow:auto;white-space:pre-wrap;word-wrap:break-word;font-family:monospace}code{font-family:'JetBrains Mono',SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:.9em}table{border-collapse:collapse;width:100%;margin-bottom:1rem}th,td{padding:.75rem;vertical-align:top;border-top:1px solid #dee2e6;text-align:left}thead th{vertical-align:bottom;border-bottom:2px solid #dee2e6;background-color:#f8f9fa}img{max-width:100%;height:auto;border-radius:4px}ul,ol{padding-left:20px;margin-bottom:1em}li{margin-bottom:.5em}blockquote{border-left:4px solid #dee2e6;padding-left:1rem;margin-left:0;font-style:italic;color:#555}</style>`;
                const iframeSrcDoc = Utils.escapeHtml(`${iframeStyles}${codeContent}`);
                return `<div class="code-block with-preview"><div class="code-block-header"><span class="code-block-icon">&lt;/&gt;</span><span class="code-block-filename">${filename}</span><div class="code-block-header-actions">${commonButtonsHtml}${expandCollapseButtonHtml}</div></div><div class="code-preview-content-wrapper"><div class="code-preview-tabs"><button class="tab active" data-tab="preview">Предпросмотр</button><button class="tab" data-tab="code">Код</button></div><div class="tab-pane active preview-pane" data-pane="preview"><iframe srcdoc="${iframeSrcDoc}" sandbox="allow-scripts allow-same-origin" title="HTML Preview"></iframe></div><div class="tab-pane code-pane" data-pane="code"><div class="code-block-content"><pre class="line-numbers language-html"><code class="language-html">${escapedContent}</code></pre></div></div></div></div>`;
            }

            return `<div class="code-block"><div class="code-block-header"><span class="code-block-icon">&lt;/&gt;</span><span class="code-block-filename">${filename}</span><div class="code-block-header-actions">${commonButtonsHtml}${expandCollapseButtonHtml}</div></div><div class="code-block-scroll-wrapper"><div class="code-block-content"><pre class="line-numbers language-${actualLanguage}"><code class="language-${actualLanguage}">${escapedContent}</code></pre></div></div></div>`;
        };

        let renderedHtml = md.render(text);
        md.renderer.rules.fence = defaultFenceRenderer;

        renderedHtml = renderedHtml.replace(/<li>\[ \] /g, '<li class="task-list-item"><input type="checkbox" disabled> ').replace(/<li>\[x\] /g, '<li class="task-list-item"><input type="checkbox" checked disabled> ');

        return DOMPurify.sanitize(renderedHtml, { ADD_TAGS: ['svg', 'path', 'iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'button', 'img', 'input', 'canvas', 'polyline', 'line', 'rect'], ADD_ATTR: ['class', 'title', 'alt', 'viewBox', 'fill', 'width', 'height', 'd', 'style', 'data-tab', 'data-pane', 'srcdoc', 'sandbox', 'scope', 'colspan', 'rowspan', 'type', 'checked', 'disabled', 'data-chart-id', 'data-chart-data', 'data-d3-id', 'data-d3-data', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'points', 'x1', 'y1', 'x2', 'y2', 'x', 'y', 'rx', 'ry'] });
    },

    copyToClipboard: async (text, buttonElement) => {
        if (!navigator.clipboard) {
            alert('Копирование не поддерживается вашим браузером.');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            if (buttonElement) {
                const originalTitle = buttonElement.title;
                buttonElement.title = 'Скопировано!';
                Utils.addTempAnimation(buttonElement, 'pulse-once', 600);
                setTimeout(() => {
                    buttonElement.title = originalTitle;
                }, 2000);
            }
        } catch (err) {
            console.error('Ошибка копирования:', err);
            alert('Не удалось скопировать текст.');
        }
    },

    initMermaid: (theme) => {
        if (window.mermaid) {
            try {
                mermaid.initialize({ startOnLoad: false, theme });
            } catch (e) { console.warn('Mermaid initialization failed:', e); }
        }
    },

    runMermaid: (nodes, theme) => {
        if (window.mermaid && nodes && nodes.length > 0) {
            try {
                Utils.initMermaid(theme);
                mermaid.run({ nodes });
            } catch (e) { console.warn('Mermaid render failed:', e); }
        }
    },

    renderCharts: () => {
        if (!window.Chart) return;
        document.querySelectorAll('.chart-container').forEach(container => {
            const canvas = container.querySelector('canvas');
            const loadingEl = container.querySelector('.chart-loading');
            const chartDataString = container.dataset.chartData;
            if (!canvas || !loadingEl || !chartDataString) return;

            try {
                const chartData = JSON.parse(chartDataString);
                loadingEl.style.display = 'none';
                new window.Chart(canvas, {
                    type: chartData.type || 'bar',
                    data: chartData.data || {},
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: true, text: chartData.title || 'График' } } }
                });
            } catch (e) {
                console.warn('Chart.js rendering error:', e);
                loadingEl.textContent = 'Ошибка загрузки графика';
            }
        });
    },

    renderD3Visualizations: () => {
        if (!window.d3) return;
        document.querySelectorAll('.d3-container').forEach(container => {
            const vizEl = container.querySelector('.d3-visualization');
            const loadingEl = container.querySelector('.d3-loading');
            const d3DataString = container.dataset.d3Data;
            if (!vizEl || !loadingEl || !d3DataString) return;
            try {
                const d3Data = JSON.parse(d3DataString);
                loadingEl.style.display = 'none';
                vizEl.innerHTML = ''; // Очищаем перед рендерингом
                const width = 400, height = 300;
                const svg = d3.select(vizEl).append('svg').attr('width', width).attr('height', height);
                if (d3Data.type === 'bar') {
                    const barWidth = width / d3Data.data.length;
                    svg.selectAll('rect').data(d3Data.data).enter().append('rect')
                        .attr('x', (d, i) => i * barWidth).attr('y', d => height - d.value)
                        .attr('width', barWidth - 2).attr('height', d => d.value).attr('fill', 'steelblue');
                } else if (d3Data.type === 'pie') {
                    const radius = Math.min(width, height) / 2;
                    const arc = d3.arc().innerRadius(0).outerRadius(radius);
                    const pie = d3.pie().value(d => d.value);
                    const g = svg.append('g').attr('transform', `translate(${width/2},${height/2})`);
                    g.selectAll('path').data(pie(d3Data.data)).enter().append('path').attr('d', arc).attr('fill', (d, i) => d3.schemeCategory10[i % 10]);
                }
            } catch (e) {
                console.warn('D3.js rendering error:', e);
                loadingEl.textContent = 'Ошибка загрузки визуализации';
            }
        });
    },
};

document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const renderBtn = document.getElementById('render-btn');
    const outputContainer = document.getElementById('output');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    const iconSun = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    const iconMoon = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;

    function updateThemeIcon(theme) {
        themeIcon.innerHTML = theme === 'dark' ? iconSun : iconMoon;
    }

    const exampleText = `
# Демонстрация форматирования

Это пример текста, чтобы показать все возможности форматирования, которые поддерживает движок ReMind.

## Стили текста

- **Жирный текст**
- *Курсив*
- ~~Зачеркнутый текст~~
- \`Инлайн-код\`
- [Это ссылка на Prism.js](https://prismjs.com)
- Формулы: $E=mc^2$ и $$ \\int_a^b f(x) dx = F(b) - F(a) $$

> Это цитата. Она используется для выделения важной информации или чьих-либо слов.

---

## Таблицы

| Заголовок 1 | Заголовок 2 | Заголовок 3 |
| :---------- | :---------: | ----------: |
| Слева      | По центру   |      Справа |
| Ячейка 2.1  | Ячейка 2.2  |  Ячейка 2.3 |

## Списки задач

- [x] Завершить рендеринг Markdown
- [ ] Добавить подсветку синтаксиса
- [ ] Реализовать диаграммы Mermaid

## Блоки кода

### JavaScript
\`\`\`javascript:script.js
function greet(name) {
  // Выводим приветствие в консоль
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

### HTML с предпросмотром
\`\`\`html:preview.html
<!DOCTYPE html>
<html>
<head>
    <title>Пример</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding-top: 50px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Привет, мир!</h1>
    <p>Это iframe с предпросмотром.</p>
    <button onclick="alert('Клик!')">Нажми меня</button>
</body>
</html>
\`\`\`

## Диаграммы и графики

### Mermaid Диаграмма
\`\`\`mermaid
graph TD
    A[Начало] --> B{Условие?};
    B -- Да --> C[Действие 1];
    B -- Нет --> D[Действие 2];
    C --> E[Конец];
    D --> E[Конец];
\`\`\`

### Chart.js График
\`\`\`chartjs
{
  "type": "bar",
  "title": "Продажи по месяцам",
  "data": {
    "labels": ["Январь", "Февраль", "Март", "Апрель"],
    "datasets": [{
      "label": "Выручка, тыс. $",
      "data": [65, 59, 80, 81],
      "backgroundColor": [
        "rgba(255, 99, 132, 0.5)", "rgba(54, 162, 235, 0.5)",
        "rgba(255, 206, 86, 0.5)", "rgba(75, 192, 192, 0.5)"
      ],
      "borderColor": [
        "rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)",
        "rgba(255, 206, 86, 1)", "rgba(75, 192, 192, 1)"
      ],
      "borderWidth": 1
    }]
  }
}
\`\`\`

### D3.js Визуализация
\`\`\`d3js
{
    "type": "pie",
    "data": [
        {"label": "A", "value": 30},
        {"label": "B", "value": 20},
        {"label": "C", "value": 50}
    ]
}
\`\`\`
`;
    inputArea.value = exampleText.trim();

    function renderContent() {
        const rawText = inputArea.value;
        const messageTextDiv = outputContainer.querySelector('.message-text');

        if (messageTextDiv) {
            messageTextDiv.innerHTML = Utils.formatText(rawText);

            if (window.Prism) {
                Prism.highlightAllUnder(messageTextDiv);
            }
            const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
            Utils.runMermaid(messageTextDiv.querySelectorAll('.mermaid'), theme);
            Utils.renderCharts();
            Utils.renderD3Visualizations();
        }
    }

    renderBtn.addEventListener('click', renderContent);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);

        const mermaidTheme = newTheme === 'light' ? 'default' : 'dark';
        Utils.runMermaid(outputContainer.querySelectorAll('.mermaid'), mermaidTheme);
    });

    outputContainer.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-code-btn');
        if (copyBtn) {
            const codeBlock = copyBtn.closest('.code-block');
            if (codeBlock) {
                const codeElement = codeBlock.querySelector('pre code');
                if (codeElement) {
                    Utils.copyToClipboard(codeElement.textContent, copyBtn);
                }
            }
        }

        const tabButton = e.target.closest('.code-preview-tabs .tab');
        if (tabButton) {
            const previewWrapper = tabButton.closest('.code-block.with-preview');
            if (previewWrapper) {
                previewWrapper.querySelector('.tab.active')?.classList.remove('active');
                previewWrapper.querySelector('.tab-pane.active')?.classList.remove('active');
                tabButton.classList.add('active');
                const tabName = tabButton.dataset.tab;
                const targetPane = previewWrapper.querySelector(`.tab-pane[data-pane="${tabName}"]`);
                targetPane?.classList.add('active');
                if (tabName === 'code' && window.Prism) {
                    Prism.highlightAllUnder(targetPane);
                }
            }
        }
    });

    // Инициализация
    const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateThemeIcon(initialTheme);
    initializeMarkdownIt();
    renderContent();
});