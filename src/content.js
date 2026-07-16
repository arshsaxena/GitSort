// content.js — Main content script for GitSort

(function () {
	'use strict';

	const TIMESTAMP_TIMEOUT = 15000;
	const TIMESTAMP_POLL_INTERVAL = 500;
	const MUTATION_DEBOUNCE = 300;

	let currentPrefs = { sortMode: 'alphabetical', showAbsoluteTime: false };
	let lastUrl = '';
	let timestampPollTimer = null;
	let mutationObserver = null;
	let tableMutationDebounceTimer = null;
	let globalMutationDebounceTimer = null;
	let orderCaptured = false;
	let isSorting = false;

	async function init() {
		try {
			currentPrefs = await GitSortStorage.getPreferences();
		} catch (e) {
			// Ignore
		}

		lastUrl = window.location.href;
		trySetup();

		document.addEventListener('turbo:load', onNavigation);
		document.addEventListener('turbo:render', onNavigation);
		window.addEventListener('popstate', onNavigation);
		document.addEventListener('pjax:end', onNavigation);
		document.addEventListener('turbo:before-render', cleanup);

		setInterval(() => {
			if (window.location.href !== lastUrl) {
				lastUrl = window.location.href;
				onNavigation();
			}
		}, 1000);

		setupGlobalMutationObserver();
	}

	function onNavigation() {
		lastUrl = window.location.href;
		setTimeout(() => {
			cleanup();
			trySetup();
		}, 100);
	}

	function cleanup() {
		removeAbsoluteTimeOverlays();
		GitSortUI.removeToolbar();
		orderCaptured = false;
		isSorting = false;
		if (timestampPollTimer) {
			clearInterval(timestampPollTimer);
			timestampPollTimer = null;
		}
		if (tableMutationDebounceTimer) {
			clearTimeout(tableMutationDebounceTimer);
			tableMutationDebounceTimer = null;
		}
		if (mutationObserver) {
			mutationObserver.disconnect();
			mutationObserver = null;
		}
	}

	function trySetup() {
		if (!GitSortUtils.isRepoDirectoryPage()) return;

		const table = GitSortUtils.findDirectoryTable();
		if (!table) {
			setTimeout(() => {
				const retryTable = GitSortUtils.findDirectoryTable();
				if (retryTable && GitSortUtils.isRepoDirectoryPage()) {
					setupForTable(retryTable);
				}
			}, 1000);
			return;
		}

		setupForTable(table);
	}

	function setupForTable(table) {
		if (GitSortUI.isToolbarPresent()) return;

		const tbody = GitSortUtils.getDirectoryTbody(table);
		if (!tbody) return;

		const rows = GitSortUtils.getDirectoryRows(table);
		if (rows.length === 0) return;

		if (!orderCaptured) {
			GitSortSorter.captureOriginalOrder(rows);
			orderCaptured = true;
		}

		const timestampsAvailable = GitSortSorter.hasTimestamps(rows);

		GitSortUI.createToolbar(
			table,
			currentPrefs.sortMode,
			currentPrefs.showAbsoluteTime,
			timestampsAvailable,
			(mode) => handleSortChange(mode, table),
			(showAbsolute) => handleAbsoluteTimeChange(showAbsolute, table),
		);

		if (timestampsAvailable && currentPrefs.sortMode === 'recent') {
			applySorting('recent', table);
		}

		if (timestampsAvailable && currentPrefs.showAbsoluteTime) {
			applyAbsoluteTimeOverlays(table);
		}

		if (!timestampsAvailable) {
			waitForTimestamps(table);
		}

		setupTableMutationObserver(tbody, table);
	}

	function waitForTimestamps(table) {
		const startTime = Date.now();
		if (timestampPollTimer) clearInterval(timestampPollTimer);

		timestampPollTimer = setInterval(() => {
			const rows = GitSortUtils.getDirectoryRows(table);
			if (rows.length === 0) {
				clearInterval(timestampPollTimer);
				timestampPollTimer = null;
				return;
			}

			const available = GitSortSorter.hasTimestamps(rows);
			if (available) {
				clearInterval(timestampPollTimer);
				timestampPollTimer = null;

				if (GitSortSorter.hasStaleReferences()) {
					GitSortSorter.captureOriginalOrder(rows);
				}

				GitSortUI.enableRecentButton();

				if (currentPrefs.sortMode === 'recent') {
					applySorting('recent', table);
				}
				if (currentPrefs.showAbsoluteTime) {
					applyAbsoluteTimeOverlays(table);
				}
				return;
			}

			if (Date.now() - startTime > TIMESTAMP_TIMEOUT) {
				clearInterval(timestampPollTimer);
				timestampPollTimer = null;
				GitSortUI.disableRecentButton(
					"GitHub doesn't expose commit timestamps on this page.",
				);
			}
		}, TIMESTAMP_POLL_INTERVAL);
	}

	async function handleSortChange(mode, table) {
		currentPrefs.sortMode = mode;
		GitSortUI.setActiveMode(mode);
		applySorting(mode, table);

		try {
			await GitSortStorage.setPreferences({ sortMode: mode });
		} catch (e) {
			// Ignore
		}
	}

	function handleAbsoluteTimeChange(showAbsolute, table) {
		currentPrefs.showAbsoluteTime = showAbsolute;
		if (showAbsolute) {
			applyAbsoluteTimeOverlays(table);
		} else {
			removeAbsoluteTimeOverlays();
		}
	}

	let savedColgroup = null;

	function removeColgroup(table) {
		if (!table) return;
		const colgroup = table.querySelector('colgroup');
		if (colgroup) {
			savedColgroup = colgroup;
			colgroup.remove();
		}
	}

	function restoreColgroup(table) {
		if (!table || !savedColgroup) return;
		if (!table.querySelector('colgroup')) {
			table.insertBefore(savedColgroup, table.firstChild);
		}
		savedColgroup = null;
	}

	function applyAbsoluteTimeOverlays(table) {
		if (!table) return;
		table.classList.add('gitsort-show-absolute');

		const rows = GitSortUtils.getDirectoryRows(table);
		for (const row of rows) {
			const relTimeEls = row.querySelectorAll(
				'relative-time[datetime], time-ago[datetime]',
			);
			for (const el of relTimeEls) {
				if (
					el.nextElementSibling &&
					el.nextElementSibling.classList.contains('gitsort-abs-time')
				) {
					continue;
				}

				const dt = el.getAttribute('datetime');
				if (!dt) continue;

				const date = new Date(dt);
				if (isNaN(date.getTime())) continue;

				const formatted = formatAbsoluteDate(date);

				el.style.display = 'none';
				el.dataset.gitsortHidden = 'true';

				const span = document.createElement('span');
				span.className = 'gitsort-abs-time';
				span.textContent = formatted;
				span.title = date.toISOString();
				el.parentNode.insertBefore(span, el.nextSibling);
			}
		}
		removeColgroup(table);
		// eslint-disable-next-line no-unused-expressions
		table.offsetHeight;
	}

	function removeAbsoluteTimeOverlays() {
		const table = GitSortUtils.findDirectoryTable();
		if (table) {
			table.classList.remove('gitsort-show-absolute');
			restoreColgroup(table);
			// eslint-disable-next-line no-unused-expressions
			table.offsetHeight;
		}

		const overlays = document.querySelectorAll('.gitsort-abs-time');
		for (const span of overlays) {
			span.parentNode.removeChild(span);
		}

		const hidden = document.querySelectorAll(
			'[data-gitsort-hidden="true"]',
		);
		for (const el of hidden) {
			el.style.display = '';
			delete el.dataset.gitsortHidden;
		}
	}

	function formatAbsoluteDate(date) {
		try {
			return date.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				second: '2-digit',
			});
		} catch (e) {
			return date.toISOString().replace('T', ' ').slice(0, 19);
		}
	}

	function applySorting(mode, table) {
		const tbody = GitSortUtils.getDirectoryTbody(table);
		if (!tbody) return;

		const rows = GitSortUtils.getDirectoryRows(table);
		if (rows.length === 0) return;

		isSorting = true;
		if (mutationObserver) mutationObserver.disconnect();

		try {
			const sortedRows = GitSortSorter.sortRows(rows, mode);
			GitSortSorter.applyOrder(tbody, sortedRows);
		} catch (e) {
			console.warn('[GitSort] applySorting error:', e);
		}

		requestAnimationFrame(() => {
			isSorting = false;
			if (tbody && GitSortUtils.isRepoDirectoryPage()) {
				setupTableMutationObserver(tbody, table);
			}
		});
	}

	function setupTableMutationObserver(tbody, table) {
		if (mutationObserver) mutationObserver.disconnect();

		mutationObserver = new MutationObserver(() => {
			if (isSorting) return;

			if (tableMutationDebounceTimer)
				clearTimeout(tableMutationDebounceTimer);
			tableMutationDebounceTimer = setTimeout(() => {
				handleTableMutation(table);
			}, MUTATION_DEBOUNCE);
		});

		mutationObserver.observe(tbody, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['datetime'],
		});
	}

	function handleTableMutation(table) {
		if (isSorting) return;

		const rows = GitSortUtils.getDirectoryRows(table);
		if (rows.length === 0) return;

		if (GitSortSorter.hasStaleReferences()) {
			GitSortSorter.captureOriginalOrder(rows);
			orderCaptured = true;

			if (
				currentPrefs.sortMode === 'recent' &&
				GitSortSorter.hasTimestamps(rows)
			) {
				applySorting('recent', table);
			}
			if (
				currentPrefs.showAbsoluteTime &&
				GitSortSorter.hasTimestamps(rows)
			) {
				applyAbsoluteTimeOverlays(table);
			}
			return;
		}

		if (GitSortSorter.hasTimestamps(rows)) {
			GitSortUI.enableRecentButton();

			if (currentPrefs.sortMode === 'recent') {
				applySorting('recent', table);
			}
			if (currentPrefs.showAbsoluteTime) {
				applyAbsoluteTimeOverlays(table);
			}
		}
	}

	function setupGlobalMutationObserver() {
		const globalObserver = new MutationObserver(() => {
			if (
				GitSortUtils.isRepoDirectoryPage() &&
				!GitSortUI.isToolbarPresent()
			) {
				if (globalMutationDebounceTimer)
					clearTimeout(globalMutationDebounceTimer);
				globalMutationDebounceTimer = setTimeout(() => {
					trySetup();
				}, MUTATION_DEBOUNCE);
			}
		});

		const main =
			document.querySelector(
				'main, [role="main"], turbo-frame#repo-content-turbo-frame, #js-repo-pjax-container',
			) || document.body;

		globalObserver.observe(main, {
			childList: true,
			subtree: true,
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
