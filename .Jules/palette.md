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

## 2026-01-28 - [Accessible Toggle Groups]
**Learning:** Using `aria-pressed` on a group of buttons is a lightweight, accessible alternative to radio inputs for "pick one" UI patterns, preserving existing styles while informing screen readers.
**Action:** When using buttons for selection, wrap them in a container with `role="group"` and proper labeling, and use `aria-pressed` to indicate the active state.

## 2026-02-13 - [Semantic Radio Groups]
**Learning:** Groups of radio buttons visually styled as cards often lose their semantic grouping context. Screen readers need a container to announce the group name.
**Action:** Always wrap radio button groups in a `<fieldset>` with a `<legend>` (can be `sr-only`) to provide the necessary "question" context for the "answer" options.
