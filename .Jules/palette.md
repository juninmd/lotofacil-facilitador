## 2026-01-13 - [Visual Data Presentation]
**Learning:** Displaying lottery numbers as visual "balls" rather than comma-separated text significantly improves scannability and cognitive processing for the user.
**Action:** When displaying set-based data (like lottery numbers, tags, or categories), prefer distinct visual elements over text lists.

## 2026-01-20 - [Form Semantics]
**Learning:** Wrapping search inputs in a form element with a submit button is critical for expected user behavior (Enter to submit) and accessibility (landmark navigation).
**Action:** Always wrap single-input interactions in a `<form>` element and handle the `onSubmit` event, even for simple search components.

## 2026-01-19 - [Visual Meters for Frequency]
**Learning:** Adding visual meters (like progress bars) to numeric frequency lists helps users quickly grasp relative scale without parsing each number.
**Action:** Augment numeric frequency or ranking lists with background progress bars or similar visual indicators of relative magnitude.

## 2026-01-22 - [Action Button Cues]
**Learning:** Adding icon cues and distinct loading spinners to primary action buttons significantly improves user confidence in complex operations (like AI generation/simulation).
**Action:** Ensure all async or complex action buttons have both a representative icon and a distinct loading state.
