# Git Activity Analytics Browser Extension

A browser extension for Chrome/Edge that provides consolidated Git commit activity analytics across **GitLab** and **GitHub** repositories. View productivity metrics for any user across all accessible projects without leaving the platform.

## Features

- 🔐 **Uses your logged-in session** - No need to enter credentials again (GitLab uses cookies, GitHub uses OAuth)
- 🔍 **Search users** - Pick users from organization/contributor lists instead of typing manually
- 📊 **Comprehensive analytics** - Total commits, files changed, insertions, deletions, and lines changed
- 📅 **Flexible date ranges** - This week, last week, this month, last month, or custom ranges
- 🎨 **Clean inline UI** - Beautiful panel that appears directly on GitLab/GitHub pages
- 🚀 **Multi-tenant support** - Works with any GitLab instance (gitlab.com, self-hosted, etc.)
- ⚡ **Fast mode** - Quick commit counts without detailed stats
- 📈 **Detailed stats** - Optional line-by-line statistics and file change counts

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the extension directory (`/var/www/html/loc`)

The extension will now appear in your browser toolbar.

## Usage

### Quick Start

1. Navigate to any GitLab or GitHub page where you're logged in
2. Click the **"Git Activity"** button in the top-right corner
3. Select **Platform** (GitLab or GitHub)
4. **Search for a user** by typing their name or username
5. Click on a user from the results
6. Choose a **date range** (This week, Last week, This month, Last month, or Custom)
7. Optionally enable:
   - **Include line stats** - Get additions/deletions (slower)
   - **Include files changed** - Count files modified (slowest)
8. Click **Generate report**

Results will appear inline showing:
- Total commits
- Total files changed
- Total insertions
- Total deletions
- Total lines changed

### GitLab Setup

No setup required! The extension automatically detects which GitLab instance you're on (gitlab.com, self-hosted, etc.) and uses your existing session cookies.

**Optional:** Add custom GitLab hosts in Options if you use multiple instances.

### GitHub Setup

GitHub requires OAuth authentication for API access (higher rate limits and access to private repos).

#### Option 1: OAuth (Recommended)

1. Create a GitHub OAuth App:
   - Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Set **Homepage URL** to any URL (e.g., `https://example.com`)
   - Set **Authorization callback URL** to any URL (not used with Device Flow)
   - Click **Register application**
   - Copy the **Client ID**

2. In the extension:
   - Open the inline panel on any GitHub page
   - Scroll to **GitHub OAuth** section
   - Paste your **Client ID**
   - Click **Connect GitHub**
   - Copy the code shown and open the verification URL
   - Authorize the application
   - The token will be saved automatically

#### Option 2: Personal Access Token (Alternative)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` and `read:org` scopes
3. Open extension Options page
4. Paste the token in **GitHub token** field
5. Click **Save**

## Configuration

### Options Page

Access via:
- Right-click extension icon → **Options**
- Or click **"Open Options"** button in the inline panel

**Settings:**
- **GitLab hosts** - One per line (e.g., `https://gitlab.com`, `https://git.rolustech.com`)
- **GitHub hosts** - One per line (default: `https://github.com`)
- **GitHub API base** - For GitHub Enterprise (default: `https://api.github.com`)
- **GitHub token** - Personal Access Token (alternative to OAuth)
- **GitHub OAuth Client ID** - For OAuth authentication

## How It Works

### GitLab
- Uses your existing session cookies (no authentication needed)
- Fetches all projects you have access to
- Searches commits across branches within the date range
- Filters by author ID or username

### GitHub
- Uses OAuth token or Personal Access Token
- Fetches repositories you have access to (or public repos if no token)
- Searches commits by author within the date range
- Aggregates statistics across all matching commits

## Date Ranges

- **This week** - Monday to Sunday of current week
- **Last week** - Previous Monday to Sunday
- **This month** - First to last day of current month
- **Last month** - First to last day of previous month
- **Custom** - Pick any start and end date

## Troubleshooting

### "No users found" or "Search failed"
- **GitLab**: Ensure you're logged in to the GitLab instance
- **GitHub**: Check that OAuth is connected or a token is set in Options

### "API rate limit exceeded" (GitHub)
- GitHub has strict rate limits for unauthenticated requests
- **Solution**: Connect via OAuth or add a Personal Access Token in Options

### "Requires authentication" (GitHub)
- GitHub's `/user/repos` endpoint requires authentication
- **Solution**: Connect via OAuth or add a token

### Commits showing from wrong date range
- Check the console logs (F12 → Console) for date filtering details
- Ensure date range is set correctly (custom dates must be valid)

### Extension not appearing on page
- Reload the page after installing the extension
- Check that the page URL matches the content script patterns (gitlab.com, github.com, etc.)

### OAuth "Failed to start device flow"
- Verify the Client ID is correct
- Check that the OAuth app is properly configured on GitHub
- Ensure you have internet connectivity

## Development

### Project Structure

```
loc/
├── manifest.json          # Extension manifest (MV3)
├── src/
│   ├── background.js     # Service worker (orchestrates providers)
│   ├── content.js        # Inline UI injection
│   ├── popup.html/js/css # Extension popup (legacy)
│   ├── options.html/js   # Options page
│   ├── storage.js       # Settings management
│   └── providers/
│       ├── gitlab.js    # GitLab API provider
│       └── github.js    # GitHub API provider
└── README.md
```

### Logging

The extension includes comprehensive logging:

- **`[Content]`** - Inline UI logs (page console)
- **`[BG]`** - Background service worker logs (extension console)
- **`[GL]`** - GitLab provider logs
- **`[GH]`** - GitHub provider logs

To view logs:
- **Page console**: F12 → Console (for content script)
- **Extension console**: `chrome://extensions/` → Extension → Service Worker → Inspect

## Permissions

- **storage** - Save settings and tokens
- **scripting** - Inject content scripts
- **activeTab** - Detect current page URL
- **host_permissions** - Access GitLab/GitHub APIs (uses your session)

## License

This project is provided as-is for personal and commercial use.

## Contributing

Contributions welcome! Please ensure:
- Code follows existing style
- Logging is added for debugging
- Error handling is comprehensive
- Tested on both GitLab and GitHub

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review console logs for error messages
3. Verify your authentication setup (OAuth/token)
4. Ensure you're logged in to the platform

---

**Note**: This extension respects your existing authentication and does not store passwords. All API calls use your session cookies (GitLab) or OAuth tokens (GitHub).
