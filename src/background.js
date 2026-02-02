// Background service worker (MV3)
// Orchestrates provider calls and aggregates results.

import { getGitLabStats, findGitLabUsers } from './providers/gitlab.js';
import { getGitHubStats, findGitHubUsers } from './providers/github.js';
import { loadSettings, saveSettings } from './storage.js';

function log(...args){
	console.log('[BG]', ...args);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		const t0 = performance.now();
		try {
			log('message <-', message);
			const settings = await loadSettings();
			switch (message.type) {
				case 'getSettings': {
					sendResponse(settings);
					break;
				}
				case 'saveSettingsPartial': {
					const next = { ...settings, ...message.payload };
					await saveSettings(next);
					sendResponse({ ok: true });
					break;
				}
				case 'content-open-popup': {
					// legacy no-op
					sendResponse({ ok: true });
					break;
				}
				case 'searchUsers': {
					if (message.platform === 'gitlab') {
						const hosts = message.baseUrl ? [message.baseUrl] : settings.gitlabHosts;
						log('searchUsers gitlab', { hosts, query: message.query });
						const users = await findGitLabUsers({ hosts, query: message.query });
						sendResponse({ ok: true, users });
					} else if (message.platform === 'github') {
						const apiBase = settings.githubApiBase || 'https://api.github.com';
						const token = settings.githubToken || '';
						const users = await findGitHubUsers({ apiBase, query: message.query, token, credentialsInclude: !token });
						sendResponse({ ok: true, users });
					} else {
						sendResponse({ ok: false, error: 'Unknown platform' });
					}
					break;
				}
				case 'getStats': {
					if (message.platform === 'gitlab') {
						const hosts = message.baseUrl ? [message.baseUrl] : settings.gitlabHosts;
						const fast = message.fast !== undefined ? !!message.fast : true;
						const includeFilesChanged = !!message.includeFilesChanged;
						log('getStats gitlab start', { hosts, userId: message.userId, username: message.username, from: message.from, to: message.to, fast, includeFilesChanged });
						const stats = await getGitLabStats({ hosts, userId: message.userId, username: message.username, from: message.from, to: message.to, fast, includeFilesChanged });
						log('getStats gitlab done', stats);
						sendResponse({ ok: true, stats });
					} else if (message.platform === 'github') {
						const apiBase = settings.githubApiBase || 'https://api.github.com';
						const token = settings.githubToken || '';
						const includeFilesChanged = !!message.includeFilesChanged;
						log('getStats github start', { apiBase, username: message.username, from: message.from, to: message.to, includeFilesChanged });
						const stats = await getGitHubStats({ apiBase, username: message.username, from: message.from, to: message.to, token, includeFilesChanged, credentialsInclude: !token });
						log('getStats github done', stats);
						sendResponse({ ok: true, stats });
					} else {
						sendResponse({ ok: false, error: 'Unknown platform' });
					}
					break;
				}
				default:
					sendResponse({ ok: false, error: 'Unknown message type' });
			}
		} catch (error) {
			console.error('[BG] error', error);
			sendResponse({ ok: false, error: String(error) });
		} finally {
			const t1 = performance.now();
			log('message -> responded in', Math.round(t1 - t0), 'ms');
		}
	})();

	return true;
}); 