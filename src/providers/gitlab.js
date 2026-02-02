// GitLab provider: uses session cookies (host_permissions) to fetch data

function log(...args){
	console.log('[GL]', ...args);
}

export async function findGitLabUsers({ hosts, query }) {
	const results = [];
	for (const host of hosts) {
		const base = host.replace(/\/$/, '');
		try {
			const url = `${base}/api/v4/users?search=${encodeURIComponent(query)}&per_page=20`;
			//log('users search', { base, url });
			const res = await fetch(url, { credentials: 'include' });
			//log('users search status', base, res.status);
			if (!res.ok) continue;
			const users = await res.json();
			//log('users found', base, users.length);
			for (const u of users) {
				results.push({
					platform: 'gitlab',
					host,
					id: u.id,
					username: u.username,
					name: u.name,
					avatar_url: u.avatar_url
				});
			}
		} catch (e) {
			console.warn('[GL] users search failed', base, e);
		}
	}
	return results;
}

export async function getGitLabStats({ hosts, userId, username, from, to, fast = false, includeFilesChanged = false }) {
	const dateFrom = new Date(from);
	const dateTo = new Date(to);
	const acc = createEmptyStats();

	for (const host of hosts) {
		const base = host.replace(/\/$/, '');
		log('fetch projects', base);
		const projects = await fetchAllProjects(base, dateFrom);
		log('projects count', base, projects.length);

		await pMap(projects, async (project) => {
			try {
				const shas = await fetchProjectCommitShasAcrossBranches({ base, projectId: project.id, userId, username, dateFrom, dateTo });

				// 🚨 Skip projects with no commits from the target user
				if (shas.size === 0) {
					log('skip project - no commits by user', base, project.id);
					return;
				}

				acc.totalCommits += shas.size;
				//log('project shas', base, project.id, shas.size);

				if (!fast) {
					const results = await pMap(Array.from(shas), async (sha) => {
						const detail = await fetchCommitStats({ base, projectId: project.id, sha });
						let filesChanged = 0;
						if (includeFilesChanged) {
							filesChanged = await fetchCommitFilesChanged({ base, projectId: project.id, sha });
						}
						return {
							insertions: detail?.insertions || 0,
							deletions: detail?.deletions || 0,
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
				console.warn('[GL] project failed', base, project.id, e);
			}
		}, 3);
	}

	acc.totalLinesChanged = acc.totalInsertions + acc.totalDeletions;
	log('aggregate', acc);
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

async function fetchAllProjects(base, dateFrom) {
	const projects = [];
	let page = 1;
	const lastActivityAfter = encodeURIComponent(dateFrom.toISOString());
	while (true) {
		const url = `${base}/api/v4/projects?membership=true&min_access_level=10&simple=true&per_page=100&page=${page}&last_activity_after=${lastActivityAfter}`;
		//log('projects page', base, page, 'last_activity_after');
		const res = await fetch(url, { credentials: 'include' });
		if (!res.ok) { log('projects status', base, res.status); break; }
		const batch = await res.json();
		projects.push(...batch);
		if (batch.length < 100) break;
		page += 1;
	}
	return projects;
}

async function fetchProjectCommitShasAcrossBranches({ base, projectId, userId, username, dateFrom, dateTo }) {
	const branches = await fetchBranches(base, projectId);
	branches.sort((a, b) => new Date(b.commit?.committed_date || 0) - new Date(a.commit?.committed_date || 0));
	// filter branches where the head commit is older than the start date
	const filtered = branches.filter(br => new Date(br.commit?.committed_date || 0) >= dateFrom);
	const limited = (filtered.length ? filtered : branches).slice(0, 20);
	//log('branches', base, projectId, branches.length, 'filtered', filtered.length, 'limited', limited.length);

	const shas = new Set();
	await pMap(limited, async (br) => {
		const commits = await fetchCommitsForProject({ base, projectId, userId, username, dateFrom, dateTo, ref: br.name });
		for (const c of commits) shas.add(c.id);
	}, 5);

	// fallback with author=username if nothing found
	if (shas.size === 0 && username) {
		//log('fallback author filter', base, projectId, username);
		await pMap(limited, async (br) => {
			const commits = await fetchCommitsForProject({ base, projectId, username, dateFrom, dateTo, ref: br.name, useAuthorString: true });
			for (const c of commits) shas.add(c.id);
		}, 5);
	}
	return shas;
}

async function fetchBranches(base, projectId) {
	const branches = [];
	let page = 1;
	while (true) {
		const url = `${base}/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches?per_page=100&page=${page}`;
		log('branches page', base, projectId, page);
		const res = await fetch(url, { credentials: 'include' });
		if (!res.ok) { log('branches status', base, projectId, res.status); break; }
		const batch = await res.json();
		branches.push(...batch);
		if (batch.length < 100) break;
		page += 1;
	}
	return branches;
}

async function fetchCommitsForProject({ base, projectId, userId, username, dateFrom, dateTo, ref, useAuthorString = false }) {
	const params = new URLSearchParams();
	if (!useAuthorString && userId) params.set('author_id', String(userId));
	else if (username) params.set('author', username);
	
	// Format dates for GitLab API (YYYY-MM-DD format)
	const fromDate = dateFrom.toISOString().split('T')[0];
	const toDate = dateTo.toISOString().split('T')[0];
	params.set('since', fromDate);
	params.set('until', toDate);
	params.set('per_page', '100');
	if (ref) params.set('ref_name', ref);

	// log('commits filter', base, projectId, ref || '(default)', {
	// 	author: userId || username,
	// 	since: fromDate,
	// 	until: toDate,
	// 	dateFrom: dateFrom.toISOString(),
	// 	dateTo: dateTo.toISOString()
	// });

	let page = 1;
	const commits = [];
	while (true) {
		params.set('page', String(page));
		const url = `${base}/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits?${params.toString()}`;
		//log('commits page', base, projectId, ref || '(default)', page);
		const res = await fetch(url, { credentials: 'include' });
		if (!res.ok) { log('commits status', base, projectId, res.status); break; }
		const batch = await res.json();
		commits.push(...batch);
		// early break if oldest commit in this page is older than dateFrom (descending order assumed)
		if (batch.length > 0) {
			const oldest = new Date(batch[batch.length - 1].committed_date || 0);
			if (oldest < dateFrom) { 
				//log('early break commits pagination', base, projectId, 'page', page, 'oldest', oldest.toISOString(), 'dateFrom', dateFrom.toISOString()); 
				break; 
			}
		}
		if (batch.length < 100) break;
		page += 1;
	}
	// filter commits if message does not start with "Merge"
	const filtered = commits.filter(c => {
		const commitDate = new Date(c.committed_date || 0);
		const inRange = commitDate >= dateFrom && commitDate <= dateTo;

		let isUser = false;
		if (!useAuthorString && userId && c.author_id) {
			isUser = String(c.author_id) === String(userId);
		}
		if (!isUser && username) {
			isUser =
				c.author_name === username ||
				(c.author_email && c.author_email.includes(username));
		}

		const notMerge = !c.title?.startsWith("Merge");

		return inRange && isUser && notMerge;
	});


	// 🚨 Log final accepted commits
	for (const c of filtered) {
		log(
			'FINAL COMMIT',
			base,
			projectId,
			c.id.substring(0, 8),
			new Date(c.committed_date).toISOString(),
			'author:',
			c.author_name,
			c.author_email,
			'message:',
			(c.title || '').substring(0, 80) // limit to 80 chars
		);
	}

	// existing summary log
	//log('commits result', base, projectId, 'total', commits.length, 'filtered', filtered.length);
	return filtered;

}

async function fetchCommitStats({ base, projectId, sha }) {
	const url = `${base}/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits/${encodeURIComponent(sha)}`;
	//log('commit stats', base, projectId, sha);
	const res = await fetch(url, { credentials: 'include' });
	if (!res.ok) { log('commit stats status', base, projectId, res.status); return null; }
	const data = await res.json();
	const insertions = data.stats?.additions ?? 0;
	const deletions = data.stats?.deletions ?? 0;
	return {
		filesChanged: 0,
		insertions,
		deletions
	};
}

async function fetchCommitFilesChanged({ base, projectId, sha }) {
	const url = `${base}/api/v4/projects/${encodeURIComponent(projectId)}/repository/commits/${encodeURIComponent(sha)}/diff`;
	//log('commit diff', base, projectId, sha);
	const res = await fetch(url, { credentials: 'include' });
	if (!res.ok) { log('commit diff status', base, projectId, res.status); return 0; }
	const diffs = await res.json();
	return Array.isArray(diffs) ? diffs.length : 0;
}

async function pMap(list, mapper, concurrency = 5) {
	let index = 0;
	let active = 0;
	return new Promise((resolve, reject) => {
		const results = [];
		function next() {
			if (index >= list.length && active === 0) return resolve(results);
			while (active < concurrency && index < list.length) {
				const i = index++;
				active++;
				Promise.resolve(mapper(list[i], i))
					.then((r) => { results[i] = r; })
					.catch((e) => { console.warn('[GL] mapper error', e); })
					.finally(() => { active--; next(); });
			}
		}
		next();
	});
}
