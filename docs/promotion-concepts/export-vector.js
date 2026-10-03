// Static vector interpretation of a rendered mock, for review illustrations.
// This is not a browser screenshot: shadows and font metrics are approximate.
export function createVector(doc) {
	const win = doc.defaultView;
	if (!win) throw new Error('A rendered document is required');
	const escape = function (value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); };
	const rectMarkup = function (rect, fill, stroke, width, radius, offset = 0) {
		return `<rect x="${rect.x - offset}" y="${rect.y - offset}" width="${rect.width + offset * 2}" height="${rect.height + offset * 2}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
	};
	const renderText = function (node) {
		const parent = node.parentElement;
		if (!parent || !node.textContent?.trim()) return '';
		const style = win.getComputedStyle(parent);
		const range = doc.createRange();
		const chars = [...node.textContent].map(function (char, index) {
			range.setStart(node, index);
			range.setEnd(node, index + 1);
			const rect = range.getBoundingClientRect();
			const text = style.textTransform === 'uppercase' ? char.toUpperCase() : char;
			return { text, x: rect.x, top: rect.top, width: rect.width, height: rect.height };
		}).filter(function (char) { return char.width > 0 && char.height > 0; });
		const lines = chars.reduce(function (acc, char) {
			const last = acc.at(-1);
			if (!last || Math.abs(last.top - char.top) > 1) return [...acc, { ...char }];
			return [...acc.slice(0, -1), { ...last, text: last.text + char.text }];
		}, []);
		return lines.map(function (line) {
			return `<text xml:space="preserve" x="${line.x}" y="${line.top + parseFloat(style.fontSize) * .92}" fill="${escape(style.color)}" font-family="Roboto, Arial, sans-serif" font-size="${style.fontSize}" font-weight="${style.fontWeight}" font-style="${style.fontStyle}" letter-spacing="${style.letterSpacing === 'normal' ? '0' : style.letterSpacing}">${escape(line.text)}</text>`;
		}).join('');
	};
	const render = function (node) {
		if (node.nodeType === 3) return renderText(node);
		if (!(node instanceof win.Element)) return '';
		const style = win.getComputedStyle(node);
		const rect = node.getBoundingClientRect();
		if (style.display === 'none' || style.visibility === 'hidden' || !rect.width || !rect.height) return '';
		if (node.tagName.toLowerCase() === 'svg') {
			const clone = node.cloneNode(true);
			[node, ...node.querySelectorAll('*')].forEach(function (original, index) {
				const target = [clone, ...clone.querySelectorAll('*')][index];
				const computed = win.getComputedStyle(original);
				target.removeAttribute('style');
				target.setAttribute('fill', computed.fill);
				target.setAttribute('stroke', computed.stroke);
				target.setAttribute('stroke-width', computed.strokeWidth);
			});
			clone.setAttribute('x', rect.x);
			clone.setAttribute('y', rect.y);
			clone.setAttribute('width', rect.width);
			clone.setAttribute('height', rect.height);
			return clone.outerHTML;
		}
		const background = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'none' : style.backgroundColor;
		const border = parseFloat(style.borderTopWidth);
		const radius = parseFloat(style.borderTopLeftRadius) || 0;
		const box = background !== 'none' || border ? rectMarkup(rect, background, style.borderTopColor, border, radius) : '';
		const outline = parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== 'none' ? rectMarkup(rect, 'none', style.outlineColor, parseFloat(style.outlineWidth), radius + 5, 5) : '';
		return box + outline + [...node.childNodes].map(render).join('');
	};
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${win.innerWidth}" height="${win.innerHeight}" viewBox="0 0 ${win.innerWidth} ${win.innerHeight}"><defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8d8d8"/><stop offset="1" stop-color="#c0c0c0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#body)"/>${render(doc.getElementById('screen'))}</svg>`;
}
