// Inject a floating button and inline panel UI into the page
(function(){
	// Inject styles once
	if (!document.getElementById('ga-styles')) {
		const style = document.createElement('style');
		style.id = 'ga-styles';
		style.textContent = `
			.ga-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid #d1d5db;background:#0ea5e9;color:#fff;padding:8px 10px;border-radius:8px;cursor:pointer;font:600 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;box-shadow:0 1px 2px rgba(0,0,0,.05)}
			.ga-btn.secondary{background:#fff;color:#111827;border-color:#d1d5db}
			.ga-btn:hover{filter:brightness(1.05)}
			.ga-panel{position:fixed;top:50px;right:12px;width:400px;max-height:72vh;overflow:auto;z-index:2147483647;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 24px rgba(0,0,0,.18);padding:12px}
			.ga-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
			.ga-title h4{margin:0;font:600 14px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111827}
			.ga-row{margin-top:10px}
			.ga-label{display:block;margin:0 0 6px 0;font:600 12px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#374151}
			.ga-input,.ga-select,.ga-date{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font:500 13px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#111827;background:#fff}
			.ga-input:focus,.ga-select:focus,.ga-date:focus{outline:none;box-shadow:0 0 0 3px rgba(14,165,233,.25);border-color:#0ea5e9}
			.ga-presets{display:flex;gap:8px}
			.ga-presets .ga-btn{flex:1}
			.ga-list{list-style:none;padding:0;margin:6px 0;max-height:160px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px}
			.ga-item{display:flex;gap:8px;align-items:center;padding:8px;cursor:pointer}
			.ga-item:hover{background:#f9fafb}
			.ga-avatar{width:20px;height:20px;border-radius:999px;flex:0 0 20px;background:#e5e7eb}
			.ga-options{display:grid;grid-template-columns:1fr;gap:6px}
			.ga-check{display:flex;align-items:center;gap:8px;font:500 12px system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#374151}
			.ga-results{margin-top:10px;border-top:1px solid #f3f4f6;padding-top:10px}
			.ga-stat{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #f3f4f6}
			.ga-stat:last-child{border-bottom:none}
		`;
		document.head.appendChild(style);
	}

	const btn = document.createElement('button');
	btn.textContent = 'Git Activity';
	btn.className = 'ga-btn';
	Object.assign(btn.style, {
		position: 'fixed',
		right: '12px',
		top: '12px',
		zIndex: '2147483647'
	});
	document.documentElement.appendChild(btn);

	let panel = null;
	btn.addEventListener('click', () => {
		if (panel) { panel.remove(); panel = null; return; }
		panel = createPanel();
		document.documentElement.appendChild(panel);
	});

	function createPanel(){
		const wrapper = document.createElement('div');
		wrapper.className = 'ga-panel';

		const title = document.createElement('div');
		title.className = 'ga-title';
		const h = document.createElement('h4'); h.textContent = 'Git Activity';
		const close = document.createElement('button'); close.textContent = 'Close'; close.className = 'ga-btn secondary';
		close.addEventListener('click', () => { wrapper.remove(); panel = null; });
		title.appendChild(h); title.appendChild(close);
		wrapper.appendChild(title);

		const platformRow = row('Platform');
		const platform = document.createElement('select');
		platform.className = 'ga-select';
		platform.innerHTML = '<option value="gitlab">GitLab</option><option value="github">GitHub</option>';
		platformRow.appendChild(platform);
		wrapper.appendChild(platformRow);

		const userRow = row('User');
		const userSearch = document.createElement('input');
		userSearch.placeholder = 'Search user (name or username)';
		userSearch.className = 'ga-input';
		const userList = document.createElement('ul');
		userList.className = 'ga-list';
		userRow.appendChild(userSearch);
		userRow.appendChild(userList);
		wrapper.appendChild(userRow);

		const rangeRow = row('Date range');
		const presetSelect = document.createElement('select');
		presetSelect.className = 'ga-select';
		presetSelect.innerHTML = `
			<option value="thisWeek">This week</option>
			<option value="lastWeek">Last week</option>
			<option value="thisMonth">This month</option>
			<option value="lastMonth">Last month</option>
			<option value="custom">Custom</option>
		`;
		rangeRow.appendChild(presetSelect);
		const customWrap = document.createElement('div');
		customWrap.style.display = 'none';
		const from = document.createElement('input'); from.type = 'date'; from.className = 'ga-date';
		const to = document.createElement('input'); to.type = 'date'; to.className = 'ga-date';
		customWrap.appendChild(from); customWrap.appendChild(to);
		rangeRow.appendChild(customWrap);
		wrapper.appendChild(rangeRow);

		const optsRow = row('Options');
		const optsWrap = document.createElement('div'); optsWrap.className = 'ga-options';
		const includeStats = document.createElement('label'); includeStats.className = 'ga-check';
		const includeStatsCb = document.createElement('input'); includeStatsCb.type = 'checkbox'; includeStats.appendChild(includeStatsCb);
		includeStats.appendChild(document.createTextNode(' Include line stats (additions/deletions)'));
		const includeFiles = document.createElement('label'); includeFiles.className = 'ga-check';
		const includeFilesCb = document.createElement('input'); includeFilesCb.type = 'checkbox'; includeFiles.appendChild(includeFilesCb);
		includeFiles.appendChild(document.createTextNode(' Include files changed (slower)'));
		optsWrap.appendChild(includeStats); optsWrap.appendChild(includeFiles);
		optsRow.appendChild(optsWrap);
		wrapper.appendChild(optsRow);

		const oauthRow = row('GitHub OAuth');
		const clientIdInput = document.createElement('input'); clientIdInput.className = 'ga-input'; clientIdInput.placeholder = 'GitHub OAuth Client ID';
		const connectBtn = document.createElement('button'); connectBtn.textContent = 'Connect GitHub'; connectBtn.className = 'ga-btn secondary';
		const oauthStatus = document.createElement('div'); oauthStatus.className = 'ga-label'; oauthStatus.style.fontWeight = '400';
		oauthRow.appendChild(clientIdInput);
		oauthRow.appendChild(connectBtn);
		oauthRow.appendChild(oauthStatus);
		wrapper.appendChild(oauthRow);

		// Pre-fill clientId from settings if available
		chrome.runtime.sendMessage({ type: 'getSettings' }, (s) => {
			if (s && s.githubClientId) clientIdInput.value = s.githubClientId;
		});

		connectBtn.addEventListener('click', async () => {
			const clientId = (clientIdInput.value || '').trim();
			if (!clientId) { oauthStatus.textContent = 'Enter Client ID'; return; }
			try {
				oauthStatus.textContent = 'Starting device flow...';
				const device = await startDeviceFlow(clientId);
				oauthStatus.innerHTML = `Code: <span class="code">${device.user_code}</span> · <a href="${device.verification_uri}" target="_blank">Open link</a>`;
				const token = await pollForToken(clientId, device);
				oauthStatus.textContent = 'Connected!';
				await chrome.runtime.sendMessage({ type: 'saveSettingsPartial', payload: { githubToken: token, githubClientId: clientId } });
			} catch (e) {
				oauthStatus.textContent = 'OAuth failed: ' + String(e.message || e);
			}
		});

		async function startDeviceFlow(clientId){
			const params = new URLSearchParams();
			params.set('client_id', clientId);
			params.set('scope', 'repo read:org');
			const res = await fetch('https://github.com/login/device/code', { 
				method: 'POST', 
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, 
				body: params.toString() 
			});
			if (!res.ok) throw new Error('Failed to start device flow');
			const ct = res.headers.get('content-type') || '';
			if (ct.includes('application/json')) return res.json();
			const text = await res.text();
			const parsed = Object.fromEntries(new URLSearchParams(text));
			return parsed;
		}
		async function pollForToken(clientId, device){
			const params = new URLSearchParams();
			params.set('client_id', clientId);
			params.set('device_code', device.device_code);
			params.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
			const intervalMs = Math.max((device.interval || 5) * 1000, 5000);
			while (true) {
				await new Promise(r => setTimeout(r, intervalMs));
				const res = await fetch('https://github.com/login/oauth/access_token', { 
					method: 'POST', 
					headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, 
					body: params.toString() 
				});
				if (!res.ok) throw new Error('Token exchange failed');
				const ct = res.headers.get('content-type') || '';
				let data;
				if (ct.includes('application/json')) data = await res.json();
				else {
					const text = await res.text();
					data = Object.fromEntries(new URLSearchParams(text));
				}
				if (data.error === 'authorization_pending') continue;
				if (data.error) throw new Error(data.error_description || data.error);
				if (data.access_token) return data.access_token;
			}
		}

		const run = document.createElement('button');
		run.textContent = 'Generate report';
		run.className = 'ga-btn';
		run.style.width = '100%';
		wrapper.appendChild(run);

		const results = document.createElement('div'); results.className = 'ga-results'; wrapper.appendChild(results);

		const optionsLink = document.createElement('button');
		optionsLink.textContent = 'Open Options';
		optionsLink.className = 'ga-btn secondary';
		optionsLink.style.marginTop = '6px';
		optionsLink.addEventListener('click', () => {
			if (chrome.runtime.openOptionsPage) {
				chrome.runtime.openOptionsPage();
			} else {
				const url = chrome.runtime.getURL('src/options.html');
				window.open(url, '_blank', 'noopener,noreferrer');
			}
		});
		wrapper.appendChild(optionsLink);

		let selectedUser = null;
		let preset = 'thisWeek';
		presetSelect.value = preset;
		const baseUrl = `${location.protocol}//${location.host}`;
		console.info('[Content] baseUrl', baseUrl);

		presetSelect.addEventListener('change', () => {
			preset = presetSelect.value;
			customWrap.style.display = preset === 'custom' ? '' : 'none';
		});

		userSearch.addEventListener('input', async () => {
			const q = userSearch.value.trim();
			if (q.length < 2) { userList.innerHTML = ''; return; }
			userList.textContent = 'Searching...';
			const { ok, users, error } = await sendMessage({ type: 'searchUsers', platform: platform.value, query: q, baseUrl });
			if (!ok) { userList.textContent = error || 'Search failed'; return; }
			userList.innerHTML = '';
			users.forEach(u => {
				const li = document.createElement('li'); li.className = 'ga-item';
				const avatar = document.createElement('img'); avatar.className = 'ga-avatar'; avatar.src = u.avatar_url || ''; avatar.alt = '';
				const txt = document.createElement('div'); txt.textContent = `${u.name || u.username} (@${u.username}) — ${new URL(u.host).host}`;
				li.appendChild(avatar); li.appendChild(txt);
				li.addEventListener('click', () => { selectedUser = u; userSearch.value = `${u.name || u.username} (@${u.username})`; userList.innerHTML = ''; });
				userList.appendChild(li);
			});
		});

		run.addEventListener('click', async () => {
			if (!selectedUser) { results.textContent = 'Please select a user first.'; return; }
			const { fromISO, toISO } = computeRange(preset, from.value, to.value);
			results.textContent = 'Fetching…';
			const resp = await sendMessage({
				type: 'getStats', platform: selectedUser.platform, userId: selectedUser.id, username: selectedUser.username, from: fromISO, to: toISO, baseUrl,
				fast: !includeStatsCb.checked && !includeFilesCb.checked,
				includeFilesChanged: includeFilesCb.checked
			});
			const { ok, stats, error } = resp || {};
			if (!ok) {
				if (selectedUser.platform === 'github') {
					results.innerHTML = `GitHub requires a token for API calls. Please add a PAT in Options.`;
					return;
				}
				results.textContent = error || 'Failed to fetch stats';
				return;
			}
			results.innerHTML = renderStats(stats);
		});

		return wrapper;
	}

	function row(label){
		const wrap = document.createElement('div'); wrap.className = 'ga-row';
		const l = document.createElement('label'); l.textContent = label; l.className = 'ga-label';
		wrap.appendChild(l);
		return wrap;
	}

	function startOfWeek(d){
		const date = new Date(d);
		const day = date.getDay(); // 0 Sun .. 6 Sat
		const diff = (day === 0 ? -6 : 1) - day; // Monday as start
		date.setDate(date.getDate() + diff);
		date.setHours(0,0,0,0);
		return date;
	}
	function endOfWeek(d){
		const s = startOfWeek(d);
		const e = new Date(s);
		e.setDate(e.getDate() + 6);
		e.setHours(23,59,59,999);
		return e;
	}

	function computeRange(preset, fromStr, toStr){
		const now = new Date();
		let from, to;
		switch (preset) {
			case 'thisWeek':
				from = startOfWeek(now);
				to = endOfWeek(now);
				break;
			case 'lastWeek':
				const lastWeekRef = new Date(now);
				lastWeekRef.setDate(lastWeekRef.getDate() - 7);
				from = startOfWeek(lastWeekRef);
				to = endOfWeek(lastWeekRef);
				break;
			case 'thisMonth':
				from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
				to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
				break;
			case 'lastMonth':
				from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
				to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
				break;
			case 'custom':
				from = new Date(fromStr + 'T00:00:00.000Z');
				to = new Date(toStr + 'T23:59:59.999Z');
				break;
			default:
				from = startOfWeek(now);
				to = endOfWeek(now);
		}
		console.log('[Content] Date range:', preset, { from: from.toISOString(), to: to.toISOString() });
		return { fromISO: from.toISOString(), toISO: to.toISOString() };
	}

	function renderStats(s){
		return `
			<div class="ga-stat"><span>Total commits</span><span>${s.totalCommits}</span></div>
			<div class="ga-stat"><span>Total files changed</span><span>${s.totalFilesChanged}</span></div>
			<div class="ga-stat"><span>Total insertions</span><span>${s.totalInsertions}</span></div>
			<div class="ga-stat"><span>Total deletions</span><span>${s.totalDeletions}</span></div>
			<div class="ga-stat"><span>Total lines changed</span><span>${s.totalLinesChanged}</span></div>
		`;
	}

	function sendMessage(payload){
		return new Promise((resolve) => chrome.runtime.sendMessage(payload, resolve));
	}
})();

// Provide base URL to extension when asked
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'getBaseUrl') {
		const url = new URL(location.href);
		const base = `${url.protocol}//${url.host}`;
		sendResponse({ base });
	}
}); 