// sorter.js — Core sorting logic for GitSort rows

var GitSortSorter = (function () {
	'use strict';

	let originalOrder = [];
	let currentSortMode = 'alphabetical';

	// Reconstruct default alphabetical folders-first directory order.
	function reconstructDefaultOrder(rows) {
		const list = rows.slice();
		list.sort((a, b) => {
			const aDir = GitSortUtils.isDirectoryRow(a);
			const bDir = GitSortUtils.isDirectoryRow(b);

			if (aDir && !bDir) return -1;
			if (!aDir && bDir) return 1;

			const nameA = GitSortUtils.getRowName(a);
			const nameB = GitSortUtils.getRowName(b);
			return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
		});
		return list;
	}

	function captureOriginalOrder(rows) {
		originalOrder = rows.slice();
	}

	function getOriginalOrder() {
		return originalOrder.slice();
	}

	function hasStaleReferences() {
		return (
			originalOrder.length > 0 &&
			originalOrder.some((row) => !row.isConnected)
		);
	}

	function hasTimestamps(rows) {
		return rows.some((row) => GitSortUtils.extractTimestamp(row) !== null);
	}

	// Sort rows array in-place based on the sorting mode.
	function sortRows(rows, mode) {
		currentSortMode = mode;

		if (mode === 'alphabetical') {
			return reconstructDefaultOrder(rows);
		}

		const tsMap = new Map();
		rows.forEach((row) => {
			const ts = GitSortUtils.extractTimestamp(row);
			tsMap.set(row, ts ? ts.getTime() : 0);
		});

		rows.sort((a, b) => {
			const ta = tsMap.get(a);
			const tb = tsMap.get(b);

			if (ta !== tb) {
				if (ta === 0) return 1;
				if (tb === 0) return -1;
				return tb - ta;
			}

			// Fallback to alphabetical order
			const aDir = GitSortUtils.isDirectoryRow(a);
			const bDir = GitSortUtils.isDirectoryRow(b);
			if (aDir && !bDir) return -1;
			if (!aDir && bDir) return 1;

			const nameA = GitSortUtils.getRowName(a);
			const nameB = GitSortUtils.getRowName(b);
			return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
		});

		return rows;
	}

	// Re-append sorted rows to the tbody element.
	function applyOrder(tbody, sortedRows) {
		if (!tbody || sortedRows.length === 0) return;

		const nonDataRows = [];
		for (const child of Array.from(tbody.children)) {
			if (
				child.tagName === 'TR' &&
				!child.classList.contains('react-directory-row')
			) {
				nonDataRows.push(child);
			}
		}

		const fragment = document.createDocumentFragment();
		nonDataRows.forEach((row) => fragment.appendChild(row));
		sortedRows.forEach((row) => fragment.appendChild(row));
		tbody.appendChild(fragment);
	}

	return {
		captureOriginalOrder,
		getOriginalOrder,
		hasStaleReferences,
		hasTimestamps,
		sortRows,
		applyOrder,
		getCurrentMode: () => currentSortMode,
	};
})();
