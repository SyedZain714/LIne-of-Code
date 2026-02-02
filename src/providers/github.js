// GitHub provider: uses a personal access token for API requests

function log(...args){
	console.log('[GH]', ...args);
}

export async function findGitHubUsers({ apiBase, query, token, credentialsInclude = false }) {
	const headers = makeHeaders(token);
	const url = `${apiBase}/search/users?q=${encodeURIComponent(query)}&per_page=20`;
	log('users search', url);
	const res = await fetch(url, { headers, credentials: credentialsInclude ? 'include' : 'same-origin' });
	if (!res.ok) return [];
	const data = await res.json();
	const items = data.items || [];
	return items.map(u => ({
		platform: 'github',
		host: apiBase,
		id: u.id,
		username: u.login,
		name: u.login,
		avatar_url: u.avatar_url
	}));
}

export async function getGitHubStats({ apiBase, username, from, to, token, includeFilesChanged = false, credentialsInclude = false }) {
	const dateFrom = new Date(from);
	const dateTo = new Date(to);
	const headers = makeHeaders(token);
	const acc = createEmptyStats();

	// Choose repo source based on auth mode
	const repos = token
		? await fetchAllRepos({ apiBase, headers, dateFrom, credentialsInclude }) // private + org via token
		: await fetchUserPublicRepos({ apiBase, headers, username, dateFrom }); // public only, no auth
	log('repos count', repos.length, token ? '(token mode)' : '(public mode)');

	await pMap(repos, async (repo) => {
		try {
			const shas = await fetchRepoCommitShas({ apiBase, headers, owner: repo.owner.login, repo: repo.name, author: username, dateFrom, dateTo, credentialsInclude });
			acc.totalCommits += shas.size;
			if (shas.size > 0) {
				const results = await pMap(Array.from(shas), async (sha) => {
					const detail = await fetchCommitDetail({ apiBase, headers, owner: repo.owner.login, repo: repo.name, sha, credentialsInclude });
					let filesChanged = 0;
					if (includeFilesChanged) {
						filesChanged = Array.isArray(detail?.files) ? detail.files.length : 0;
					}
					return {
						insertions: detail?.stats?.additions || 0,
						deletions: detail?.stats?.deletions || 0,
						filesChanged
					};
				}, 6);
				for (const r of results) {
					acc.totalInsertions += r.insertions;
					acc.totalDeletions += r.deletions;
					acc.totalFilesChanged += r.filesChanged;
				}
			}
		} catch (e) {
			console.warn('[GH] repo failed', repo.full_name, e);
		}
	}, 3);

	acc.totalLinesChanged = acc.totalInsertions + acc.totalDeletions;
	return acc;
}

function createEmptyStats() {
	return {
		totalCommits: 0,
		totalFilesChanged: 0,
		totalInsertions: 0,
		totalDeletions: 0,
		totalLinesChanged: 0
	};
}

function makeHeaders(token){
	const h = { 'Accept': 'application/vnd.github+json' };
	if (token) h['Authorization'] = `Bearer ${token}`;
	return h;
}

async function fetchAllRepos({ apiBase, headers, dateFrom, credentialsInclude }) {
	const repos = [];
	let page = 1;
	while (true) {
		const url = `${apiBase}/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member&sort=updated`;
		log('repos page', url);
		const res = await fetch(url, { headers, credentials: credentialsInclude ? 'include' : 'same-origin' });
		if (!res.ok) break;
		const batch = await res.json();
		const filtered = batch.filter(r => new Date(r.pushed_at || r.updated_at || 0) >= dateFrom);
		repos.push(...filtered);
		if (batch.length < 100) break;
		page += 1;
	}
	return repos;
}

async function fetchUserPublicRepos({ apiBase, headers, username, dateFrom }) {
	const repos = [];
	let page = 1;
	while (true) {
		const url = `${apiBase}/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=all&sort=updated`;
		log('public repos page', url);
		const res = await fetch(url, { headers });
		if (!res.ok) break;
		const batch = await res.json();
		const filtered = batch.filter(r => new Date(r.pushed_at || r.updated_at || 0) >= dateFrom);
		repos.push(...filtered);
		if (batch.length < 100) break;
		page += 1;
	}
	return repos;
}

async function fetchRepoCommitShas({ apiBase, headers, owner, repo, author, dateFrom, dateTo, credentialsInclude }) {
	const shas = new Set();
	let page = 1;
	while (true) {
		const url = `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?author=${encodeURIComponent(author)}&since=${encodeURIComponent(dateFrom.toISOString())}&until=${encodeURIComponent(dateTo.toISOString())}&per_page=100&page=${page}`;
		log('commits page', owner + '/' + repo, page);
		const res = await fetch(url, { headers, credentials: credentialsInclude ? 'include' : 'same-origin' });
		if (!res.ok) break;
		const batch = await res.json();
		for (const c of batch) {
			if (c && c.sha) shas.add(c.sha);
		}
		if (batch.length < 100) break;
		page += 1;
	}
	return shas;
}

async function fetchCommitDetail({ apiBase, headers, owner, repo, sha, credentialsInclude }) {
	const url = `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`;
	const res = await fetch(url, { headers, credentials: credentialsInclude ? 'include' : 'same-origin' });
	if (!res.ok) return null;
	return await res.json();
}

async function pMap(list, mapper, concurrency = 5) {
	let index = 0;
	let active = 0;
	return new Promise((resolve) => {
		const results = [];
		function next() {
			if (index >= list.length && active === 0) return resolve(results);
			while (active < concurrency && index < list.length) {
				const i = index++;
				active++;
				Promise.resolve(mapper(list[i], i))
					.then((r) => { results[i] = r; })
					.catch(() => {})
					.finally(() => { active--; next(); });
			}
		}
		next();
	});
} 