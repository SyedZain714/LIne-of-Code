import { loadSettings, saveSettings } from './storage.js';

const gitlabHostsEl = document.getElementById('gitlabHosts');
const githubHostsEl = document.getElementById('githubHosts');
const githubApiBaseEl = document.getElementById('githubApiBase');
const githubTokenEl = document.getElementById('githubToken');
const githubClientIdEl = document.getElementById('githubClientId');
const githubConnectEl = document.getElementById('githubConnect');
const githubOauthStatusEl = document.getElementById('githubOauthStatus');
const saveEl = document.getElementById('save');
const statusEl = document.getElementById('status');

(async function init(){
	const settings = await loadSettings();
	gitlabHostsEl.value = settings.gitlabHosts.join('\n');
	githubHostsEl.value = settings.githubHosts.join('\n');
	githubApiBaseEl.value = settings.githubApiBase || '';
	githubTokenEl.value = settings.githubToken || '';
	githubClientIdEl.value = settings.githubClientId || '';
})();

saveEl.addEventListener('click', async () => {
	const gitlabHosts = linesToHosts(gitlabHostsEl.value);
	const githubHosts = linesToHosts(githubHostsEl.value);
	const githubApiBase = githubApiBaseEl.value.trim() || 'https://api.github.com';
	const githubToken = githubTokenEl.value.trim();
	const githubClientId = githubClientIdEl.value.trim();

	await saveSettings({ gitlabHosts, githubHosts, githubApiBase, githubToken, githubClientId });
	statusEl.textContent = 'Saved';
	setTimeout(() => statusEl.textContent = '', 1500);
});

githubConnectEl.addEventListener('click', async () => {
	const clientId = githubClientIdEl.value.trim();
	if (!clientId) {
		githubOauthStatusEl.textContent = 'Enter a GitHub OAuth Client ID first.';
		return;
	}
	try {
		githubOauthStatusEl.textContent = 'Starting device flow...';
		const device = await startDeviceFlow(clientId);
		githubOauthStatusEl.innerHTML = `
			Code: <span class="code">${device.user_code}</span> · <a href="${device.verification_uri}" target="_blank">Open verification URL</a>
		`;
		const token = await pollForToken(clientId, device);
		githubOauthStatusEl.textContent = 'Connected! Token saved.';
		await saveSettings({ githubToken: token });
		githubTokenEl.value = token;
	} catch (e) {
		githubOauthStatusEl.textContent = 'OAuth failed: ' + String(e.message || e);
	}
});

function linesToHosts(text){
	return text.split('\n').map(s => s.trim()).filter(Boolean);
}

async function startDeviceFlow(clientId){
	const params = new URLSearchParams();
	params.set('client_id', clientId);
	params.set('scope', 'repo read:org');
	const res = await fetch('https://github.com/login/device/code', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params.toString()
	});
	if (!res.ok) throw new Error('Failed to start device flow');
	return res.json();
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
		const data = await res.json();
		if (data.error === 'authorization_pending') continue;
		if (data.error) throw new Error(data.error_description || data.error);
		if (data.access_token) return data.access_token;
	}
} 