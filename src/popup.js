const platformEl = document.getElementById('platform');
const userSearchEl = document.getElementById('userSearch');
const userResultsEl = document.getElementById('userResults');
const presetsEl = document.getElementById('presets');
const customRangeEl = document.getElementById('customRange');
const fromEl = document.getElementById('from');
const toEl = document.getElementById('to');
const runEl = document.getElementById('run');
const resultsEl = document.getElementById('results');

let selectedUser = null;
let rangeMode = 'last30';
let baseUrl = null;

init();

async function init(){
	try {
		const url = new URL(location.href);
		const injectedBase = url.searchParams.get('base');
		if (injectedBase) {
			baseUrl = injectedBase;
			console.info('[Popup] baseUrl from query:', baseUrl);
		} else {
			baseUrl = await detectBaseUrlFromActiveTab();
			console.info('[Popup] baseUrl from active tab:', baseUrl);
		}
	} catch (e) {
		console.error('[Popup] init error:', e);
	}
}

async function detectBaseUrlFromActiveTab(){
	return new Promise((resolve) => {
		try {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				const tab = tabs && tabs[0];
				if (!tab || !tab.id) {
					console.warn('[Popup] No active tab');
					return resolve(null);
				}
				chrome.tabs.sendMessage(tab.id, { type: 'getBaseUrl' }, (resp) => {
					const detected = resp && resp.base ? resp.base : (tab.url ? new URL(tab.url).origin : null);
					resolve(detected);
				});
			});
		} catch (err) {
			console.error('[Popup] detectBaseUrl error:', err);
			resolve(null);
		}
	});
}

presetsEl.addEventListener('click', (e) => {
	const btn = e.target.closest('button');
	if (!btn) return;
	rangeMode = btn.dataset.range;
	console.debug('[Popup] Range preset selected:', rangeMode);
	customRangeEl.style.display = rangeMode === 'custom' ? '' : 'none';
});

userSearchEl.addEventListener('input', async () => {
	const q = userSearchEl.value.trim();
	if (q.length < 2) {
		userResultsEl.innerHTML = '';
		return;
	}
	const platform = platformEl.value;
	userResultsEl.textContent = 'Searching...';
	const t0 = performance.now();
	const { ok, users, error } = await sendMessage({ type: 'searchUsers', platform, query: q, baseUrl });
	const t1 = performance.now();
	console.info('[Popup] searchUsers response in', Math.round(t1 - t0), 'ms', { ok, count: users?.length, error });
	if (!ok) {
		userResultsEl.textContent = error || 'Search failed';
		return;
	}
	userResultsEl.innerHTML = '';
	users.forEach(u => {
		const li = document.createElement('li');
		li.textContent = `${u.name || u.username} (@${u.username}) — ${new URL(u.host).host}`;
		li.addEventListener('click', () => {
			selectedUser = u;
			console.debug('[Popup] Selected user:', selectedUser);
			userSearchEl.value = `${u.name || u.username} (@${u.username})`;
			userResultsEl.innerHTML = '';
		});
		userResultsEl.appendChild(li);
	});
});

runEl.addEventListener('click', async () => {
	if (!selectedUser) {
		resultsEl.textContent = 'Please select a user first.';
		console.warn('[Popup] Run clicked without user');
		return;
	}
	const { from, to } = computeRange(rangeMode, fromEl.value, toEl.value);
	console.info('[Popup] getStats start', { userId: selectedUser.id, username: selectedUser.username, from, to, baseUrl });
	resultsEl.textContent = 'Fetching…';
	const t0 = performance.now();
	const { ok, stats, error } = await sendMessage({
		type: 'getStats',
		platform: selectedUser.platform,
		userId: selectedUser.id,
		username: selectedUser.username,
		from,
		to,
		baseUrl
	});
	const t1 = performance.now();
	console.info('[Popup] getStats response in', Math.round(t1 - t0), 'ms', { ok, stats, error });
	if (!ok) {
		resultsEl.textContent = error || 'Failed to fetch stats';
		return;
	}
	displayStats(stats);
});

function computeRange(mode, fromStr, toStr) {
	const now = new Date();
	let from, to;
	if (mode === 'last30') {
		to = new Date(now);
		from = new Date(now);
		from.setDate(from.getDate() - 30);
	} else if (mode === 'thisMonth') {
		to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
		from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
	} else {
		from = new Date(fromStr);
		to = new Date(toStr);
	}
	return { from: from.toISOString(), to: to.toISOString() };
}

function displayStats(s) {
	resultsEl.innerHTML = `
		<div>
			<div><strong>Total commits:</strong> ${s.totalCommits}</div>
			<div><strong>Total files changed:</strong> ${s.totalFilesChanged}</div>
			<div><strong>Total insertions:</strong> ${s.totalInsertions}</div>
			<div><strong>Total deletions:</strong> ${s.totalDeletions}</div>
			<div><strong>Total lines changed:</strong> ${s.totalLinesChanged}</div>
		</div>
	`;
}

function sendMessage(payload) {
	console.debug('[Popup] sendMessage ->', payload);
	return new Promise((resolve) => chrome.runtime.sendMessage(payload, (resp) => {
		console.debug('[Popup] sendMessage <-', resp);
		resolve(resp);
	}));
} 