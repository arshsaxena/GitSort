// utils.js — DOM selectors and helper routines for GitSort

// eslint-disable-next-line no-var
var GitSortUtils = (function () {
	'use strict';

	function isRepoDirectoryPage() {
		const path = window.location.pathname;
		const segments = path.split('/').filter(Boolean);
		if (segments.length < 2) return false;

		const NON_DIRECTORY_SEGMENTS = new Set([
			'issues',
			'pull',
			'pulls',
			'actions',
			'projects',
			'wiki',
			'security',
			'pulse',
			'graphs',
			'network',
			'settings',
			'releases',
			'tags',
			'packages',
			'discussions',
			'compare',
			'commit',
			'commits',
			'blob',
			'edit',
			'new',
			'delete',
			'find',
			'archive',
			'stargazers',
			'watchers',
			'forks',
			'contributors',
			'codespaces',
			'activity',
			'labels',
			'milestones',
			'search',
			'suites',
			'runs',
			'deployments',
			'environments',
			'branches',
		]);

		if (segments.length >= 3 && NON_DIRECTORY_SEGMENTS.has(segments[2])) {
			return false;
		}

		if (segments.length === 2) return true;
		if (segments.length >= 3 && segments[2] === 'tree') return true;

		return false;
	}

	function findDirectoryTable() {
		const headingEl = document.getElementById('folders-and-files');
		if (headingEl) {
			const table =
				headingEl.closest('table') ||
				document.querySelector(
					'table[aria-labelledby="folders-and-files"]',
				);
			if (table) return table;
		}

		const sampleRow = document.querySelector('tr.react-directory-row');
		if (sampleRow) {
			const table = sampleRow.closest('table');
			if (table) return table;
		}

		const reactRoot = document.querySelector(
			'[data-target="react-app.reactRoot"]',
		);
		if (reactRoot) {
			const table = reactRoot.querySelector('table');
			if (table) return table;
		}

		return null;
	}

	function getDirectoryRows(table) {
		if (!table) return [];
		return Array.from(table.querySelectorAll('tr.react-directory-row'));
	}

	function isDirectoryRow(row) {
		const link = row.querySelector('a.Link--primary');
		if (link) {
			const label = link.getAttribute('aria-label') || '';
			if (label.includes('(Directory)')) return true;
			if (label.includes('(File)')) return false;
		}

		const svg = row.querySelector('svg.octicon');
		if (svg) {
			const classes = svg.getAttribute('class') || '';
			if (classes.includes('octicon-file-directory')) return true;
			if (classes.includes('octicon-file')) return false;
		}

		const id = row.id || '';
		if (id.startsWith('folder-row')) return true;
		if (id.startsWith('file-row')) return false;

		return !!row.querySelector(
			'.icon-directory, .octicon-file-directory-fill',
		);
	}

	function extractTimestamp(row) {
		const relTimeEl = row.querySelector('relative-time[datetime]');
		if (relTimeEl) {
			const dt = relTimeEl.getAttribute('datetime');
			const date = new Date(dt);
			if (!isNaN(date.getTime())) return date;
		}

		const timeAgoEl = row.querySelector('time-ago[datetime]');
		if (timeAgoEl) {
			const dt = timeAgoEl.getAttribute('datetime');
			const date = new Date(dt);
			if (!isNaN(date.getTime())) return date;
		}

		const ageCell = row.querySelector(
			'.react-directory-commit-age, [class*="commit-age"]',
		);
		if (ageCell) {
			const anyDt = ageCell.querySelector('[datetime]');
			if (anyDt) {
				const date = new Date(anyDt.getAttribute('datetime'));
				if (!isNaN(date.getTime())) return date;
			}

			const text = ageCell.textContent.trim();
			if (text && !text.includes('Loading')) {
				const parsed = parseRelativeTime(text);
				if (parsed) return parsed;
			}
		}

		return null;
	}

	function parseRelativeTime(text) {
		const now = Date.now();
		const lower = text.toLowerCase().trim();

		if (/^(just now|now)$/i.test(lower)) {
			return new Date(now);
		}
		if (/yesterday/i.test(lower)) {
			return new Date(now - 24 * 60 * 60 * 1000);
		}
		if (/last week/i.test(lower)) {
			return new Date(now - 7 * 24 * 60 * 60 * 1000);
		}
		if (/last month/i.test(lower)) {
			return new Date(now - 30 * 24 * 60 * 60 * 1000);
		}
		if (/last year/i.test(lower)) {
			return new Date(now - 365 * 24 * 60 * 60 * 1000);
		}

		const match = lower.match(
			/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/,
		);
		if (match) {
			const num = parseInt(match[1], 10);
			const unit = match[2];
			const multipliers = {
				second: 1000,
				minute: 60 * 1000,
				hour: 60 * 60 * 1000,
				day: 24 * 60 * 60 * 1000,
				week: 7 * 24 * 60 * 60 * 1000,
				month: 30 * 24 * 60 * 60 * 1000,
				year: 365 * 24 * 60 * 60 * 1000,
			};
			if (multipliers[unit]) {
				return new Date(now - num * multipliers[unit]);
			}
		}

		const dateAttempt = new Date(lower.replace(/^on\s+/, ''));
		if (!isNaN(dateAttempt.getTime())) {
			return dateAttempt;
		}

		return null;
	}

	function getRowName(row) {
		const nameCell = row.querySelector(
			'.react-directory-truncate a, .react-directory-filename-cell a',
		);
		return nameCell ? nameCell.textContent.trim() : '';
	}

	function getDirectoryTbody(table) {
		return table ? table.querySelector('tbody') : null;
	}

	return {
		isRepoDirectoryPage,
		findDirectoryTable,
		getDirectoryRows,
		isDirectoryRow,
		extractTimestamp,
		parseRelativeTime,
		getRowName,
		getDirectoryTbody,
	};
})();
