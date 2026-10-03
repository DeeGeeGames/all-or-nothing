const params = new URLSearchParams(location.search);
const platform = ['web', 'electron', 'steam'].includes(params.get('platform')) ? params.get('platform') : 'web';
const concept = ['ribbon', 'postcard', 'shelf'].includes(params.get('concept')) ? params.get('concept') : 'ribbon';
const screen = document.getElementById('screen');
const catalog = [
	{ id: 'all-or-nothing', title: 'All or Nothing', headline: 'Also available on Steam', description: 'Enjoy All or Nothing on Steam.', tag: 'THIS GAME · STEAM EDITION', art: 'cards' },
	{ id: 'puzzle-placeholder', title: 'Your next puzzle game', headline: 'A little more to puzzle over', description: 'Another game from the same developer.', tag: 'MORE GAMES · PLACEHOLDER', art: 'puzzle' },
	{ id: 'arcade-placeholder', title: 'Your next arcade game', headline: 'Something different to play', description: 'Another game from the same developer.', tag: 'MORE GAMES · PLACEHOLDER', art: 'arcade' },
].filter(function (game) { return platform !== 'steam' || game.id !== 'all-or-nothing'; });

const icons = {
	play: '<path d="m8 5 11 7-11 7Z"/>',
	people: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20v-3a6 6 0 0 1 12 0v3m2 0v-3a7 7 0 0 0-1-4 5 5 0 0 1 7 4v3"/>',
	help: '<path d="M9 7a3 3 0 0 1 6 1c0 3-3 2-3 5m0 4v1"/>',
	extra: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
	quit: '<path d="M10 4H4v16h6m4-13 5 5-5 5m-6-5h11"/>',
	games: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M6 12h6m-3-3v6m7-4h1m1 3h1"/>',
};

function icon(name) {
	return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">${icons[name] || icons.games}</svg>`;
}

function card(color, shape, count, pattern) {
	const shapes = {
		circle: '<circle cx="30" cy="30" r="21"/>',
		triangle: '<path d="M30 5 55 53H5Z"/>',
		square: '<rect x="8" y="8" width="44" height="44"/>',
	};
	return `<div class="playing-card" style="--ink:${color}">${Array.from({ length: count }, function () {
		return `<svg viewBox="0 0 60 60" aria-hidden="true" style="fill:${pattern ? 'none' : 'var(--ink)'};stroke:var(--ink);stroke-width:4">${shapes[shape]}</svg>`;
	}).join('')}</div>`;
}

function art(game) {
	const artwork = {
		cards: `<div class="mini-cards">${card('#C92020', 'triangle', 1, false)}${card('#17B321', 'circle', 1, true)}${card('#8A00A6', 'square', 1, false)}</div>`,
		puzzle: '<svg viewBox="0 0 200 120" aria-hidden="true"><g fill="#faf8ff" stroke="#c8b9ef" stroke-width="2"><rect x="52" y="24" width="42" height="42" rx="8"/><rect x="103" y="24" width="42" height="42" rx="8"/><rect x="52" y="75" width="42" height="30" rx="8"/></g><path d="m115 85 9-9 9 9-9 9Z" fill="#eacb79"/><circle cx="73" cy="45" r="9" fill="#8972be"/><path d="m115 52 10-17 10 17Z" fill="#d79dba"/></svg>',
		arcade: '<svg viewBox="0 0 200 120" aria-hidden="true"><path d="M0 108 42 80 73 101 122 64 159 91 200 67V120H0" fill="#8dba9d"/><circle cx="153" cy="31" r="16" fill="#edce85"/><rect x="64" y="56" width="24" height="24" rx="7" fill="#fbfaf0"/><path d="m106 38 6-9 6 9-6 9Z" fill="#fff"/></svg>',
	};
	return `<div class="art art-${game.art}" role="img" aria-label="${game.id === 'all-or-nothing' ? 'All or Nothing card artwork' : 'Placeholder game artwork'}">${artwork[game.art]}</div>`;
}

function promotion(index) {
	const game = catalog[index];
	if (!game) return '';
	const cta = platform === 'steam' ? 'View in Steam' : 'View on Steam';
	return `<section class="promotion ${concept}" aria-label="Games from the developer">
		${art(game)}
		<div class="promo-copy"><span class="eyebrow">${game.tag}</span><h2>${game.id === 'all-or-nothing' ? game.headline : game.title}</h2><p>${game.description}</p>
			<button class="store-link" data-action="store" data-game="${game.id}">${cta} <span aria-hidden="true">↗</span></button>
		</div>
		<div class="promo-controls"><button class="dismiss" data-action="hide" aria-label="Hide game recommendations">×</button><div class="browse-controls"><button data-action="previous" aria-label="Previous recommendation">‹</button><span aria-label="Recommendation ${index + 1} of ${catalog.length}">${index + 1} / ${catalog.length}</span><button data-action="next" aria-label="Next recommendation">›</button></div></div>
	</section>`;
}

function menu() {
	const items = [
		{ text: 'Single Player', icon: 'play' },
		{ text: 'Local Multiplayer', icon: 'people' },
		{ text: 'How to Play', icon: 'help' },
		{ text: 'Extra', icon: 'extra' },
		...(platform !== 'web' ? [{ text: 'Quit to Desktop', icon: 'quit' }] : []),
	];
	return `<nav class="menu" aria-label="Main menu">${items.map(function (item, index) {
		return `<button class="menu-button ${index === 0 && params.get('focus') !== 'promotion' && platform === 'steam' ? 'controller-focus' : ''}" data-action="menu">${icon(item.icon)}${item.text}</button>`;
	}).join('')}${concept === 'shelf' ? `<button class="menu-button more-games" data-action="shelf">${icon('games')}More games <span class="new-label">DISCOVER</span></button>` : ''}</nav>`;
}

function render(index = 0, hidden = false, view = 'title') {
	if (!screen) return;
	screen.dataset.index = String(index);
	screen.dataset.hidden = String(hidden);
	screen.dataset.view = view;
	document.body.dataset.platform = platform;
	document.body.dataset.concept = concept;
	screen.innerHTML = view === 'shelf' ? shelf() : `<div class="game-screen">
		<div class="hero">
			<div class="identity"><div class="demo-cards">${card('#C92020', 'triangle', 1, false)}${card('#17B321', 'circle', 2, true)}${card('#8A00A6', 'square', 3, false)}</div><h1>All <em>or</em> Nothing</h1></div>
			${menu()}
		</div>
		${concept !== 'shelf' && !hidden ? promotion(index) : ''}
		${hidden ? '<button class="restore" data-action="restore">More games from the developer</button>' : ''}
		<footer class="game-footer"><div class="input-hints">${platform === 'steam' ? '<span class="glyph">A</span> Select <span class="key">D-pad</span> Navigate' : '<button class="utility" aria-label="Sound settings">♫</button>'}</div><span class="mock-label">DESIGN MOCK${platform === 'steam' ? ' · CONTROLLER' : ''}</span><button class="utility" aria-label="Fullscreen">⛶</button></footer>
	</div>`;
	if (params.get('focus') === 'promotion' && view === 'title') screen.querySelector('.promotion')?.classList.add('controller-focus');
}

function shelf() {
	return `<div class="shelf-screen"><header class="shelf-header"><button class="back" data-action="back">← Back to game</button><span class="mock-label">DESIGN MOCK · PLACEHOLDER CATALOG</span></header><div class="shelf-heading"><span class="eyebrow">FROM THE CREATOR OF ALL OR NOTHING</span><h1>More to play.</h1><p>A few other games you might enjoy.</p></div><div class="catalog">${catalog.map(function (game, index) {
		return `<article class="catalog-card ${index === 0 && platform === 'steam' ? 'controller-focus' : ''}">${art(game)}<div class="catalog-copy"><span class="eyebrow">${game.tag}</span><h2>${game.title}</h2><p>${game.id === 'all-or-nothing' ? 'Also available on Steam.' : game.headline + '.'}</p><button class="primary" data-action="store" data-game="${game.id}">${platform === 'steam' ? 'View in Steam' : 'View on Steam'} ↗</button></div></article>`;
	}).join('')}</div><footer class="shelf-footer">${platform === 'steam' ? '<span class="glyph">A</span> Open store <span class="glyph back-glyph">B</span> Back' : 'Browse at your own pace. Return to your game whenever you like.'}</footer></div>`;
}

function openDestination(gameId) {
	const game = catalog.find(function (entry) { return entry.id === gameId; });
	const dialog = document.getElementById('destination');
	const copy = document.getElementById('destination-copy');
	if (!game || !(dialog instanceof HTMLDialogElement) || !copy) return;
	copy.textContent = `${game.title}: ${platform === 'steam' ? 'open its store page in the Steam overlay' : platform === 'electron' ? 'open its Steam store page in the default browser' : 'open its Steam store page in a new browser tab'}.`;
	dialog.showModal();
}

function handleAction(action, gameId) {
	if (!screen) return;
	const index = Number(screen.dataset.index || 0);
	const actions = {
		next: function () { render((index + 1) % catalog.length); },
		previous: function () { render((index - 1 + catalog.length) % catalog.length); },
		hide: function () { render(index, true); },
		restore: function () { render(index); },
		shelf: function () { render(index, false, 'shelf'); },
		back: function () { render(index); },
		store: function () { openDestination(gameId); },
		menu: function () {},
	};
	actions[action]?.();
}

document.addEventListener('click', function (event) {
	if (!(event.target instanceof Element)) return;
	const button = event.target.closest('[data-action]');
	if (!(button instanceof HTMLElement)) return;
	handleAction(button.dataset.action, button.dataset.game);
});

document.addEventListener('keydown', function (event) {
	const dialog = document.getElementById('destination');
	if (dialog instanceof HTMLDialogElement && dialog.open) return;
	if (event.key === 'Escape') { handleAction('back'); return; }
	const direction = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
	if (!direction) return;
	event.preventDefault();
	const buttons = [...document.querySelectorAll('button')].filter(function (button) { return button.getClientRects().length > 0 && !button.closest('dialog'); });
	const current = buttons.indexOf(document.activeElement);
	const next = buttons[(current + direction + buttons.length) % buttons.length];
	next?.focus();
});

render(0, false, params.get('view') === 'shelf' ? 'shelf' : 'title');
