// storage.js — Persistence layer for GitSort preferences

var GitSortStorage = (function () {
	'use strict';

	const DEFAULTS = {
		sortMode: 'alphabetical',
	};

	// Read preferences from storage, falling back to defaults.
	async function getPreferences() {
		if (
			typeof chrome === 'undefined' ||
			!chrome.runtime ||
			!chrome.runtime.id
		) {
			return { ...DEFAULTS };
		}
		try {
			const result = await chrome.storage.local.get(DEFAULTS);
			return {
				sortMode: result.sortMode || DEFAULTS.sortMode,
			};
		} catch (err) {
			if (
				err.message &&
				err.message.includes('Extension context invalidated')
			) {
				return { ...DEFAULTS };
			}
			console.warn(
				'[GitSort] storage.getPreferences failed, using defaults:',
				err,
			);
			return { ...DEFAULTS };
		}
	}

	// Save preferences to storage.
	async function setPreferences(prefs) {
		if (
			typeof chrome === 'undefined' ||
			!chrome.runtime ||
			!chrome.runtime.id
		) {
			return;
		}
		try {
			await chrome.storage.local.set(prefs);
		} catch (err) {
			if (
				err.message &&
				err.message.includes('Extension context invalidated')
			) {
				return;
			}
			console.warn('[GitSort] storage.setPreferences failed:', err);
		}
	}

	return { getPreferences, setPreferences, DEFAULTS };
})();
