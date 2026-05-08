const $ = id => document.getElementById(id);
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const showKeywordTooltip = (kw) => {
    const tip = kw.getAttribute('data-tip');
    if(!tip) return;

    let tooltip = $('kw-tooltip');
    if(!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'kw-tooltip';
        document.body.appendChild(tooltip);
    }

    const rect = kw.getBoundingClientRect();
    tooltip.textContent = tip;
    tooltip.style.display = 'block';
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${Math.max(10, rect.top - 8)}px`;
};

const hideKeywordTooltip = () => {
    const tooltip = $('kw-tooltip');
    if(tooltip) tooltip.style.display = 'none';
};

const bindKeywordTooltips = (root) => {
    const keywords = Array.from(root.querySelectorAll('.kw'));
    keywords.forEach((kw) => {
        if (kw.dataset.kwTooltipBound) return;
        kw.dataset.kwTooltipBound = '1';
        kw.addEventListener('mouseenter', () => {
            showKeywordTooltip(kw);
        });
        kw.addEventListener('mouseleave', hideKeywordTooltip);
    });
};
