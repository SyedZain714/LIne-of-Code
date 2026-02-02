export async function loadSettings() {
	const defaults = {
		gitlabHosts: ['https://gitlab.com', 'https://git.rolustech.com'],
		githubHosts: ['https://github.com'],
		githubApiBase: 'https://api.github.com',
		githubToken: '',
		githubClientId: ''
	};
	return new Promise(resolve => {
		chrome.storage.sync.get(defaults, resolve);
	});
}

export async function saveSettings(settings) {
	return new Promise(resolve => {
		chrome.storage.sync.set(settings, resolve);
	});
} 