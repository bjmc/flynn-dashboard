import * as React from 'react';

import { Checkmark as CheckmarkIcon, StatusWarning as WarningIcon } from 'grommet-icons';
import { Box } from 'grommet';
import Button from '../Button';
import Notification from '../Notification';
import copyToClipboard from '../util/copyToClipboard';
import {
	Entry,
	hasIndex as hasDataIndex,
	nextIndex as nextDataIndex,
	getEntries,
	mapEntries,
	MapEntriesOption,
	DataActionType
} from './Data';
import { State, Dispatcher, ActionType } from './common';
import { SearchInput } from './SearchInput';
import { Row } from './Row';

export interface Props {
	state: State;
	dispatch: Dispatcher;
	keyPlaceholder?: string;
	valuePlaceholder?: string;
	submitLabel?: string;
	conflictsMessage?: string;
	copyButtonTitle?: string;
	resetButtonTitle?: string;
	resetConfirmText?: string;
}

function Editor({
	state: { suggestions, data, hasConflicts, selectedSuggestions, keyInputSuggestions, inputs },
	dispatch,
	keyPlaceholder = 'Key',
	valuePlaceholder = 'Value',
	submitLabel = 'Review Changes',
	conflictsMessage = 'Some entries have conflicts',
	copyButtonTitle = 'Copy data to clipboard',
	resetButtonTitle = 'Reset data',
	resetConfirmText = 'Are you sure you want to reset the data?'
}: Props) {
	// focus next entry's input when entry deleted
	// and maintain current selection
	React.useLayoutEffect(
		() => {
			let timeoutId: number | undefined;
			if (!inputs.currentSelection) return;
			const { entryIndex, entryInnerIndex } = inputs.currentSelection;
			if (!hasDataIndex(data, entryIndex)) {
				// focus next input down when entry removed
				const nextIndex = nextDataIndex(data, entryIndex);
				const ref = (inputs.refs[nextIndex] || [])[entryInnerIndex];
				if (ref) {
					const length = ref.value.length;
					const selectionStart = length;
					const selectionEnd = length;
					const selectionDirection = 'forward';
					ref.focus();
					ref.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
				}
			} else {
				// setTimeout required in order to work with input validation
				timeoutId = setTimeout(() => {
					// maintain current selection
					const ref = (inputs.refs[entryIndex] || [])[entryInnerIndex];
					if (ref && inputs.currentSelection) {
						const { selectionStart, selectionEnd, direction } = inputs.currentSelection;
						ref.focus();
						ref.setSelectionRange(selectionStart, selectionEnd, direction);
					}
				}, 0);
			}
			return () => clearTimeout(timeoutId);
		},
		undefined // eslint-disable-line react-hooks/exhaustive-deps
	);

	const handleCopyButtonClick = React.useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();

			const text = getEntries(data)
				.map(([key, val]: [string, string]) => {
					if (val.indexOf('\n') > -1) {
						if (val.indexOf('"')) {
							// escape existing quotes (e.g. JSON)
							val = `${val.replace(/"/g, '\\"')}`;
						}
						// wrap multiline values in quotes
						val = `"${val.replace(/\n/g, '\\n')}"`;
					}
					return `${key}=${val}`;
				})
				.join('\n');

			copyToClipboard(text);
		},
		[data]
	);

	const handleResetButtonClick = React.useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			if (window.confirm(resetConfirmText)) {
				dispatch({ type: DataActionType.RESET });
			}
		},
		[dispatch, resetConfirmText]
	);

	const handleSubmit = React.useCallback(
		(event: React.SyntheticEvent) => {
			event.preventDefault();
			dispatch({ type: ActionType.SUBMIT_DATA, data });
		},
		[dispatch, data]
	);

	return (
		<form onSubmit={handleSubmit}>
			<Box direction="column" gap="xsmall">
				{hasConflicts ? <Notification status="warning" message={conflictsMessage} /> : null}
				<SearchInput dispatch={dispatch} />
				{mapEntries(
					data,
					(entry: Entry, index: number) => {
						return (
							<Box key={index} direction="row" gap="xsmall">
								<Row
									key={index}
									keyPlaceholder={keyPlaceholder}
									valuePlaceholder={valuePlaceholder}
									entry={entry}
									index={index}
									keyInputSuggestions={keyInputSuggestions}
									selectedKeySuggestion={selectedSuggestions.get(index) || null}
									dispatch={dispatch}
								/>
							</Box>
						);
					},
					MapEntriesOption.APPEND_EMPTY_ENTRY
				)}
			</Box>
			<Box direction="row" margin={{ top: 'xsmall', bottom: 'xsmall' }}>
				<Button
					disabled={!data.hasChanges}
					type="submit"
					primary
					icon={hasConflicts ? <WarningIcon /> : <CheckmarkIcon />}
					label={submitLabel}
				/>
				<Button
					type="button"
					label="copy"
					title={copyButtonTitle}
					onClick={handleCopyButtonClick}
					margin={{ left: 'xsmall' }}
				/>
				<Button
					disabled={!data.hasChanges}
					type="button"
					label="reset"
					title={resetButtonTitle}
					onClick={handleResetButtonClick}
					margin={{ left: 'xsmall' }}
				/>
			</Box>
		</form>
	);
}
export default React.memo(Editor);

(Editor as any).whyDidYouRender = true;
