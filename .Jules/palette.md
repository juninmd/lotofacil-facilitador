## 2026-01-13 - [Visual Data Presentation]
**Learning:** Displaying lottery numbers as visual "balls" rather than comma-separated text significantly improves scannability and cognitive processing for the user.
**Action:** When displaying set-based data (like lottery numbers, tags, or categories), prefer distinct visual elements over text lists.

## 2026-01-18 - [Relative Scale Visualization]
**Learning:** Adding background bars to ranked lists allows users to compare values (like frequency) at a glance.
**Action:** Augment numeric lists with visual meters (like background progress bars) when relative scale matters.

## 2026-01-20 - [Form Semantics]
**Learning:** Wrapping search inputs in a form element with a submit button is critical for expected user behavior (Enter to submit) and accessibility (landmark navigation).
**Action:** Always wrap single-input interactions in a `<form>` element and handle the `onSubmit` event, even for simple search components.
