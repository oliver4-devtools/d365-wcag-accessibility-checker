/*!
 * Oliver4 - Dynamics 365 Accessibility Checker - WCAG 2.2 A/AA pre-audit aid
 * Version 1.5.0
 *
 * A developer aid. NOT an accessibility audit and NOT evidence of conformance.
 * No criterion is ever reported as passing.
 *
 * No network calls. No data leaves the browser.
 */
(function () {
  'use strict';

  var HOST_ID = 'd365-accessibility-aid-host';
  var VERSION = '1.5.0';
  var STORE = 'oliver4.a11y.';

  /* Re-run guard: toggle the panel instead of stacking instances. The previous
     instance publishes its own teardown on the host, because removing the host
     alone would strand that instance's window listeners and the closure they
     hold. Older builds without the hook fall back to a bare remove. */
  var existing = document.getElementById(HOST_ID);
  if (existing) {
    if (typeof existing.__oliver4Teardown === 'function') existing.__oliver4Teardown();
    else existing.remove();
    return;
  }

  /* ------------------------------------------------------------------ */
  /* 1. Criteria manifest - all 55 Level A and AA criteria              */
  /*    mode: 'auto'   = automated checks exist and can detect failures */
  /*          'part'   = partial automation, produces review flags only */
  /*          'manual' = cannot be automated, human assessment required */
  /*          'cond'   = only applies if a trigger is present           */
  /*          'na'     = does not apply to desktop forms and views      */
  /*    est:  relative size of the manual work. NEVER SHOWN - the team had  */
  /*          every duration removed from the UI and the report on       */
  /*          29/08/2026. It survives only to order "fix these first",   */
  /*          smallest and most contained job at the top.                */
  /* ------------------------------------------------------------------ */
  var CRITERIA = [
    ['1.1.1','Non-text Content','A','part','Automated checks find images and controls with no accessible name. They cannot judge whether alt text is meaningful. Review every image and icon manually.',5],
    ['1.2.1','Audio-only and Video-only (Prerecorded)','A','cond','Applies only if audio or video is embedded. Inventory any media and check for transcripts.',10],
    ['1.2.2','Captions (Prerecorded)','A','cond','Applies only if video with audio is embedded. Check captions exist and are accurate, not auto-generated.',10],
    ['1.2.3','Audio Description or Media Alternative (Prerecorded)','A','cond','Applies only if video is embedded.',10],
    ['1.2.4','Captions (Live)','AA','na','No live synchronised media in standard forms or views.',0],
    ['1.2.5','Audio Description (Prerecorded)','AA','cond','Applies only if video is embedded.',10],
    ['1.3.1','Info and Relationships','A','part','Automated checks cover labels, headings, tables and grouping. They cannot confirm that visual grouping matches structural grouping. Navigate with a screen reader to confirm.',20],
    ['1.3.2','Meaningful Sequence','A','part','The tool flags multi-column sections, where Unified Interface reads column by column rather than across rows. Read the form linearly with a screen reader to confirm meaning is preserved.',15],
    ['1.3.3','Sensory Characteristics','A','manual','Read every field description, notification and instruction. Fails if any says "click the red icon", "the field on the right" or similar.',10],
    ['1.3.4','Orientation','AA','cond','Applies to the Dynamics 365 mobile app and tablets only. Rotate the device and confirm the form remains operable.',10],
    ['1.3.5','Identify Input Purpose','AA','part','Applies only where the form collects the logged-in user’s own details. The tool reports whether autocomplete attributes are present. Decide applicability yourself.',10],
    ['1.4.1','Use of Colour','A','manual','Screenshot the form and view, convert to greyscale, and confirm no information is lost. Check status indicators, priority colouring and chart series.',10],
    ['1.4.2','Audio Control','A','na','No auto-playing audio in standard forms or views.',0],
    ['1.4.3','Contrast (Minimum)','AA','auto','Automated where the background resolves to a solid colour. Text over images, gradients and canvas-rendered charts must be checked manually.',10],
    ['1.4.4','Resize Text','AA','manual','Set browser zoom to 200% at 1280px width. Confirm nothing is clipped and all functions still work. JavaScript cannot set browser zoom.',10],
    ['1.4.5','Images of Text','AA','manual','Inspect every image on the form. Fails if any contains essential text that is not a logo.',5],
    ['1.4.10','Reflow','AA','part','The tool flags fixed-width elements. Confirm properly at 400% zoom or a 320px viewport. Data grids are exempt from the two-dimensional scrolling rule.',15],
    ['1.4.11','Non-text Contrast','AA','part','The tool samples control boundaries and fills, icon glyphs, and - in deep mode - focus indicators, against the surface behind them. Charts, images and anything drawn on a canvas still need sampling by hand.',20],
    ['1.4.12','Text Spacing','AA','auto','The tool applies the WCAG spacing overrides and measures for clipping. Re-check visually as well.',10],
    ['1.4.13','Content on Hover or Focus','AA','manual','Hover each tooltip trigger. Press Escape without moving the pointer (dismissible). Move onto the tooltip (hoverable). Confirm it does not auto-hide (persistent).',15],
    ['2.1.1','Keyboard','A','part','The tool flags click targets that cannot receive focus. Full coverage requires unplugging the mouse and completing the whole journey by keyboard.',30],
    ['2.1.2','No Keyboard Trap','A','manual','Tab forwards and backwards through every dialog, lookup and rich text editor. Confirm focus always escapes.',20],
    ['2.1.4','Character Key Shortcuts','A','manual','Focus a text field and type through the alphabet. Confirm no unexpected action fires. Review client scripts for global key listeners.',10],
    ['2.2.1','Timing Adjustable','A','manual','Record the environment session and inactivity timeout. Leave a form idle and observe the warning, the extension mechanism and whether unsaved data survives.',30],
    ['2.2.2','Pause, Stop, Hide','A','manual','Identify any auto-refreshing dashboard or grid. Confirm a pause control exists.',10],
    ['2.3.1','Three Flashes or Below Threshold','A','manual','Confirm nothing flashes more than three times per second. Low risk but must be evidenced as checked.',5],
    ['2.4.1','Bypass Blocks','A','part','The tool checks for landmarks and a skip link. Confirm you can actually reach the form content without tabbing the whole site map.',10],
    ['2.4.2','Page Titled','A','auto','The tool checks the document title exists and is not generic. Confirm it distinguishes this record from others.',5],
    ['2.4.3','Focus Order','A','part','The tool flags positive tabindex values and compares DOM order against declared form order. Tab through the form and confirm the order matches the data entry task.',20],
    ['2.4.4','Link Purpose (In Context)','A','part','The tool flags generic and raw-URL link text. Judge the rest against the column header context.',10],
    ['2.4.5','Multiple Ways','AA','manual','Assessed at app level. Confirm at least two routes exist to find a record: site map, search, recently viewed, dashboards.',10],
    ['2.4.6','Headings and Labels','AA','part','The tool flags default-looking, duplicate and over-long labels. Whether a label is genuinely descriptive is a human judgement.',15],
    ['2.4.7','Focus Visible','AA','part','Run in deep mode to focus each element and compare styles. Confirm visually, including in high contrast mode.',15],
    ['2.4.11','Focus Not Obscured (Minimum)','AA','manual','Tab down a long form and watch for fields scrolling behind the sticky header, command bar or notification bar. Repeat at 200% zoom.',15],
    ['2.5.1','Pointer Gestures','A','cond','Applies only where a path-based or multipoint gesture is required. Rare on desktop.',10],
    ['2.5.2','Pointer Cancellation','A','manual','Press the mouse down on each button, move away, then release. The action must not fire. Test destructive commands especially.',15],
    ['2.5.3','Label in Name','A','auto','The tool compares visible text against the computed accessible name. This is one of the most reliably automatable criteria.',10],
    ['2.5.4','Motion Actuation','A','na','No device-motion functionality in desktop forms or views.',0],
    ['2.5.7','Dragging Movements','AA','manual','Inventory every drag interaction: column reorder, Kanban, file drop zones. Confirm each has a non-drag equivalent.',20],
    ['2.5.8','Target Size (Minimum)','AA','auto','The tool measures target geometry and applies the spacing exception. It cannot judge the "equivalent control" exception, so review flagged items before logging them.',15],
    ['3.1.1','Language of Page','A','auto','The tool checks the html lang attribute.',5],
    ['3.1.2','Language of Parts','AA','cond','Applies if any content is in a second language. Significant for Welsh delivery. Simultaneous bilingual labels will fail.',20],
    ['3.2.1','On Focus','A','manual','Tab through every field. Nothing may change beyond the focus indicator.',15],
    ['3.2.2','On Input','A','manual','Change every field value. Watch for form switching, reloads or dialogs opening without prior warning.',30],
    ['3.2.3','Consistent Navigation','AA','manual','Compare several forms and views. Navigation must appear in the same relative order.',15],
    ['3.2.4','Consistent Identification','AA','manual','Build an inventory of command labels across the app. The same function must have the same label everywhere.',30],
    ['3.2.6','Consistent Help','A','cond','Applies only if a help mechanism exists. If it does, it must sit in the same relative position on every page.',10],
    ['3.3.1','Error Identification','A','manual','Trigger every validation path. Errors must be described in text and identify the field. Confirm they are announced.',30],
    ['3.3.2','Labels or Instructions','A','part','The tool finds inputs with no label. Whether format guidance is adequate is a human judgement.',15],
    ['3.3.3','Error Suggestion','AA','manual','Trigger errors and judge whether each message tells the user how to fix the problem.',30],
    ['3.3.4','Error Prevention (Legal, Financial, Data)','AA','manual','Every data-modifying action must be reversible, checked or confirmed. Test bulk actions and destructive commands.',20],
    ['3.3.7','Redundant Entry','A','manual','Walk each end-to-end process. Information entered once must not be requested again.',30],
    ['3.3.8','Accessible Authentication (Minimum)','AA','manual','Assessed at process level with your identity team. Confirm paste works in the password field and a non-transcription MFA route exists.',20],
    ['4.1.2','Name, Role, Value','A','part','The tool finds controls with no accessible name and checks common role and state patterns. Confirm state changes are announced with a screen reader.',20],
    ['4.1.3','Status Messages','AA','part','The tool reports live regions present on the page. Trigger a save, a validation failure and a filter, and confirm each is announced.',20]
  ];

  var PRINCIPLES = [
    ['1', 'Perceivable'], ['2', 'Operable'], ['3', 'Understandable'], ['4', 'Robust']
  ];

  /* ------------------------------------------------------------------ */
  /* 1b. Plain-English reference content                                */
  /*     req   - what the criterion actually requires, said without the */
  /*             standard's own wording.                                */
  /*     d365  - where it turns up in a model-driven app, so a tester    */
  /*             knows which part of the product to go and look at.     */
  /*     fails - the ways it is most often failed here.                 */
  /*     One entry per criterion in CRITERIA. These drive the WCAG      */
  /*     reference view and the "what this criterion requires" line on  */
  /*     every issue detail screen.                                     */
  /* ------------------------------------------------------------------ */
  var GUIDE = {
    '1.1.1': {
      req: "Anything that is not text - an image, an icon, a chart, a button drawn as a glyph - needs a text equivalent that serves the same purpose. Decoration gets an empty alt so assistive technology skips it.",
      d365: "Icon-only command bar buttons, entity images, status and priority icons in views, chart visuals, images placed on a form through an HTML web resource, and images inside rich text fields.",
      fails: "An icon button announced as 'button' with no name. A decorative divider given a filename as its alt text. A chart with no text alternative anywhere near it."
    },
    '1.2.1': {
      req: "Pre-recorded audio-only content needs a transcript. Pre-recorded video-only content needs a transcript or an audio description.",
      d365: "Training or guidance media embedded in a web resource, on a dashboard, or linked from a form. Standard forms and views carry none.",
      fails: "A silent screen-capture video showing how to complete a form, with nothing describing what it shows."
    },
    '1.2.2': {
      req: "Pre-recorded video that has sound needs captions that carry the dialogue and the meaningful non-speech audio.",
      d365: "Any embedded player in a web resource or on a dashboard.",
      fails: "Relying on auto-generated captions that get product and entity names wrong, or no captions at all."
    },
    '1.2.3': {
      req: "Pre-recorded video needs either an audio description of what is shown or a full text alternative that carries the same information.",
      d365: "Embedded guidance video in a web resource or dashboard.",
      fails: "A demonstration video where the narration says 'click here' and nothing describes what is on screen."
    },
    '1.2.4': {
      req: "Live synchronised media needs real-time captions.",
      d365: "Not present in standard forms and views. It would only apply if a live stream were embedded in a web resource.",
      fails: "An uncaptioned live broadcast embedded on a dashboard."
    },
    '1.2.5': {
      req: "Pre-recorded video needs an audio description track at Level AA, not just a text alternative.",
      d365: "Embedded guidance video in a web resource or dashboard.",
      fails: "Video with important on-screen information and no audio description."
    },
    '1.3.1': {
      req: "Structure and relationships that are shown visually must also exist in the markup, so they survive when the visual presentation is stripped away. Labels must be tied to their fields, headings marked as headings, tables given headers, and grouped controls grouped.",
      d365: "Field labels, section and tab structure, required-field markers, subgrid column headers, business process stages, and any table built inside an HTML web resource.",
      fails: "A section that looks like a group but is only a bold paragraph. A custom control where the label is a floating span with no programmatic tie to the input. A layout table used for positioning in a web resource."
    },
    '1.3.2': {
      req: "When the order content is read in changes its meaning, that reading order must be correct in the markup, not just visually.",
      d365: "Multi-column form sections, header fields, and any absolutely positioned content in a web resource.",
      fails: "A two-column section where the reading order goes down the first column then down the second, so a question and its answer are read far apart."
    },
    '1.3.3': {
      req: "Instructions must not depend on shape, size, position, colour or sound alone. Something has to identify the target in words.",
      d365: "Field descriptions, form notifications, business rule messages, custom validation text and help panes.",
      fails: "A notification saying 'complete the fields marked in red' or 'use the button on the right'."
    },
    '1.3.4': {
      req: "Content must work in both portrait and landscape unless one orientation is essential.",
      d365: "The Dynamics 365 mobile app and tablet layouts. Desktop browsers are not in scope.",
      fails: "A custom PCF control that is locked to landscape or reflows into an unusable state when the device is rotated."
    },
    '1.3.5': {
      req: "Fields that collect information about the person filling the form in must identify what they collect, normally with an autocomplete attribute, so browsers and assistive technology can fill and explain them.",
      d365: "Only applies where a form collects the signed-in user's own details. A staff-facing CRM mostly collects customer data, which is out of scope.",
      fails: "A self-service or expenses form asking the user for their own name, address, phone or email with no autocomplete tokens."
    },
    '1.4.1': {
      req: "Colour must never be the only way something is conveyed. There has to be a second cue - text, an icon, a pattern or an underline.",
      d365: "View row colouring, status and priority indicators, chart series, business process stage colours, and conditional formatting.",
      fails: "A view where overdue rows are red and nothing else marks them. A chart whose only key is the line colour. Errors shown by turning a field border red with no message."
    },
    '1.4.2': {
      req: "Audio that plays automatically for more than three seconds needs a way to pause it or control its volume independently of the system volume.",
      d365: "Nothing in standard forms and views plays audio. Only an embedded player in a web resource could.",
      fails: "A dashboard web resource that autoplays a video with sound."
    },
    '1.4.3': {
      req: "Normal text needs at least 4.5:1 contrast against its background. Large text - 18.66px bold or 24px and above - needs 3:1. Disabled controls and logos are exempt.",
      d365: "Theme colours, custom CSS in web resources, PCF controls, chart palettes, and any text placed over an image or a gradient.",
      fails: "A brand colour used for body text that only reaches 3.5:1. Placeholder text in a light grey. White text over a mid-tone accent colour in a custom header."
    },
    '1.4.4': {
      req: "Text must scale to 200 per cent without loss of content or function, and without the user needing a special mechanism to do it.",
      d365: "Browser zoom on forms, dialogs, subgrids and the command bar.",
      fails: "A fixed-height container in a web resource that clips its text at 200 per cent. A dialog whose buttons scroll out of reach."
    },
    '1.4.5': {
      req: "Use real text rather than a picture of text, unless the exact presentation is essential or it is a logo.",
      d365: "Images placed on forms and dashboards, and screenshots used as guidance inside web resources.",
      fails: "A process diagram supplied as a PNG with the steps baked into the image and no text equivalent."
    },
    '1.4.10': {
      req: "Content must reflow into a single column at 320 CSS pixels wide - equivalently 400 per cent zoom at 1280px - without needing to scroll in two directions. Data tables are exempt from that rule.",
      d365: "Form sections, dialogs, the command bar and custom controls. Subgrids and views are data tables and may scroll horizontally.",
      fails: "A web resource or PCF control with a hard-coded pixel width. A form section that keeps two columns at 320px so the user has to scroll sideways to read a sentence."
    },
    '1.4.11': {
      req: "The visual information needed to identify a control, its state, or a meaningful part of a graphic must reach 3:1 against what is next to it. A control that carries visible text or a contrasting icon does not also need a boundary.",
      d365: "Input and lookup field borders, checkbox and toggle outlines, focus rings, icon-only command bar buttons, and the meaningful parts of charts.",
      fails: "An empty text field whose only boundary is a pale grey line at 1.6:1. A toggle whose off state cannot be distinguished from the surface. A focus ring that vanishes against a dark band."
    },
    '1.4.12': {
      req: "Content must survive the user overriding line height to 1.5, paragraph spacing to twice the font size, letter spacing to 0.12em and word spacing to 0.16em. Nothing may be clipped or lost.",
      d365: "Field labels, notification text, command bar labels, and anything in a fixed-height container in a web resource.",
      fails: "A label in a fixed-height row that gets cut off once line height increases. A button whose text overflows and is hidden by overflow:hidden."
    },
    '1.4.13': {
      req: "Content that appears on hover or focus must be dismissible without moving the pointer, hoverable so the pointer can move onto it, and persistent until dismissed or no longer relevant.",
      d365: "Tooltips on command bar buttons and field labels, lookup hover cards, and chart tooltips.",
      fails: "A tooltip that disappears the moment the pointer moves towards it, so a magnifier user can never read it. A tooltip that cannot be dismissed with Escape."
    },
    '2.1.1': {
      req: "Everything that can be done with a mouse must also be doable from the keyboard alone, without needing precise timing on individual keystrokes.",
      d365: "The command bar, lookups, subgrid row actions, the record set navigator, timeline controls, business process flows and every custom control.",
      fails: "A div with a click handler and no tabindex or role, so it can be clicked but never reached by Tab. A grid row action that only responds to a right click."
    },
    '2.1.2': {
      req: "Keyboard focus must always be able to move away from a component using the keyboard alone.",
      d365: "Modal dialogs, lookup dialogs, rich text editors, date pickers, and iframes hosting a web resource.",
      fails: "A rich text control that swallows Tab so focus never leaves it. A dialog that keeps focus behind it after it is closed."
    },
    '2.1.4': {
      req: "A shortcut made only of letter, punctuation, number or symbol keys must be switchable off, remappable, or active only while a component has focus.",
      d365: "Custom key handlers added by form scripts, and shortcuts in third-party or PCF controls.",
      fails: "A form script listening for 's' on the document to save, which fires while the user is typing into a text field."
    },
    '2.2.1': {
      req: "Where there is a time limit, the user must be able to turn it off, adjust it, or extend it - with at least twenty seconds warning and the ability to extend at least ten times.",
      d365: "The environment session timeout and the inactivity timeout, plus any countdown built into a custom control.",
      fails: "A session that ends without warning and loses unsaved form data. A warning dialog that appears for ten seconds and cannot be extended."
    },
    '2.2.2': {
      req: "Anything that moves, blinks, scrolls or updates automatically for more than five seconds needs a way to pause, stop or hide it.",
      d365: "Auto-refreshing dashboards, live scorecards, ticker-style controls and animated loading states.",
      fails: "A dashboard that reloads its charts every thirty seconds and moves focus each time, with no way to stop it."
    },
    '2.3.1': {
      req: "Nothing may flash more than three times in one second unless it stays below the general flash and red flash thresholds.",
      d365: "Very low risk in standard forms. Only custom animation, a video, or a flashing alert in a web resource could breach it.",
      fails: "An error state implemented as a rapidly flashing red banner."
    },
    '2.4.1': {
      req: "There must be a way to skip past blocks of content that repeat on every page - usually a skip link, or correctly used landmark regions.",
      d365: "The app header, site map and command bar repeat on every page. Unified Interface provides its own skip mechanism.",
      fails: "A web resource that renders a full page inside an iframe with its own repeated navigation and no way past it."
    },
    '2.4.2': {
      req: "Every page needs a title that describes its topic or purpose and distinguishes it from other pages.",
      d365: "The browser tab title, which Unified Interface builds from the record name, the entity and the app name.",
      fails: "Every record showing the same title, so a user with several tabs open cannot tell them apart."
    },
    '2.4.3': {
      req: "When the order focus moves in affects meaning or operability, that order must preserve meaning and operability.",
      d365: "Tab order across form sections and columns, dialog focus placement, and focus after a save or a business rule shows a field.",
      fails: "A positive tabindex on one field that pulls it to the front of the whole page. Focus jumping to the top of the form after every save."
    },
    '2.4.4': {
      req: "The purpose of every link must be clear from the link text alone, or from the link text together with the sentence, list item, table cell or column header it sits in.",
      d365: "Links in view columns, timeline entries, rich text fields and web resources.",
      fails: "A column full of links that all read 'click here' or show a raw URL. A 'more' link with nothing around it to give it context."
    },
    '2.4.5': {
      req: "There must be more than one way to reach a page, unless it is a step inside a process.",
      d365: "Assessed at app level: the site map, global search, recently viewed, dashboards and saved views.",
      fails: "An app with search disabled and a single site map entry, so a record can only be reached one way."
    },
    '2.4.6': {
      req: "Headings and labels must describe the topic or purpose of what they head or label.",
      d365: "Tab and section labels, field labels, subgrid names, view column headers and dialog titles.",
      fails: "A tab still labelled 'Tab 1'. A field labelled with its schema name. Three fields on one form all labelled 'Name'."
    },
    '2.4.7': {
      req: "Any control that can take keyboard focus must show a visible focus indicator when it has it.",
      d365: "All native controls, custom controls, command bar buttons and grid cells.",
      fails: "A custom control with outline:none and no replacement indicator. A focus ring that is drawn but is invisible against the control's own background."
    },
    '2.4.11': {
      req: "When a control receives keyboard focus it must not be completely hidden by author-created content such as a sticky header or a floating panel.",
      d365: "The sticky command bar, the form header, notification bars and the business process flow bar.",
      fails: "Tabbing down a long form and having the focused field scroll underneath the sticky command bar, so the user cannot see where they are."
    },
    '2.5.1': {
      req: "Any function that uses a path-based or multipoint gesture must also work with a single pointer without a path, unless the gesture is essential.",
      d365: "Rare on desktop. Kanban drag, timeline swipe on tablets, and signature or drawing controls.",
      fails: "A signature control that only accepts a drawn path with no typed alternative."
    },
    '2.5.2': {
      req: "A single-pointer action must not fire on the down event. The user has to be able to move away before releasing and have nothing happen, or be able to undo it.",
      d365: "Command bar buttons, grid row actions and custom controls.",
      fails: "A custom delete control wired to mousedown, so pressing on it by mistake destroys the record with no chance to move away."
    },
    '2.5.3': {
      req: "Where a control has visible text, its accessible name must contain that text, in the same order, so speech input users can say what they see.",
      d365: "Command bar buttons, dialog buttons, tabs and any control given an aria-label that differs from its caption.",
      fails: "A button reading 'Save' with aria-label='Submit form'. A button whose visible text is 'Next' and whose name is 'Continue to stage two'."
    },
    '2.5.4': {
      req: "Function triggered by device motion or user motion must also be available through the interface, and the motion response must be switchable off.",
      d365: "Not present in desktop forms or views. Shake-to-undo style behaviour would only exist in a custom mobile control.",
      fails: "A mobile control that only submits when the device is shaken."
    },
    '2.5.7': {
      req: "Any function that uses dragging must also be achievable with a single pointer without dragging, unless dragging is essential.",
      d365: "Kanban control, column reordering, timeline attachment drop zones and drag-and-drop file upload.",
      fails: "A Kanban board where the only way to move a record between columns is to drag it."
    },
    '2.5.8': {
      req: "Pointer targets must be at least 24 by 24 CSS pixels, unless they are spaced so a 24px circle around each one does not overlap another target, are inline in a sentence, are the browser's own default, or have an equivalent control elsewhere that does meet the size.",
      d365: "Grid action icons, subgrid row commands, the command bar overflow, small toggle and lookup clear buttons.",
      fails: "A row of 16px icon buttons in a grid action column packed tightly together."
    },
    '3.1.1': {
      req: "The default human language of the page must be set in the markup so a screen reader picks the right voice and pronunciation.",
      d365: "The lang attribute on the html element, written by Unified Interface from the user's language personalisation.",
      fails: "No lang attribute at all, so the screen reader reads English content with a French voice. A lang value that is not a valid language tag."
    },
    '3.1.2': {
      req: "Any passage in a different language from the rest of the page must be marked with its own language, unless it is a proper name, a technical term or a word that has entered the surrounding language.",
      d365: "Bilingual labels and content, which matters for Welsh Language Standards delivery.",
      fails: "A form showing English and Welsh labels side by side with no lang markup, so the Welsh is read with an English voice."
    },
    '3.2.1': {
      req: "Moving focus to a component must not by itself cause a change of context - no navigation, no new window, no reordering of the page.",
      d365: "OnFocus handlers in form scripts and custom controls.",
      fails: "A field that opens a lookup dialog as soon as it is tabbed into, so a keyboard user can never get past it."
    },
    '3.2.2': {
      req: "Changing a setting must not cause a change of context unless the user was told in advance that it would.",
      d365: "OnChange handlers, business rules that switch forms, and controls that trigger a save or a reload.",
      fails: "Selecting a value in an option set immediately switching to a different form, losing the user's place with no warning."
    },
    '3.2.3': {
      req: "Navigation that repeats across pages must appear in the same relative order every time.",
      d365: "The site map, the command bar and the record set navigator across forms and views in one app.",
      fails: "One form putting the related-records tab first and another putting it last, so users have to re-learn each form."
    },
    '3.2.4': {
      req: "Components with the same function across a set of pages must be identified consistently - the same label, the same icon, the same name.",
      d365: "Custom command bar buttons and ribbon commands across entities.",
      fails: "The same action called 'Send' on one entity, 'Submit' on another and 'Dispatch' on a third."
    },
    '3.2.6': {
      req: "If a help mechanism is available, it must appear in the same relative place on every page that has it.",
      d365: "Custom help panes, guidance web resources and links to a knowledge base.",
      fails: "A help link in the command bar on some forms and buried at the bottom of a tab on others."
    },
    '3.3.1': {
      req: "When an input error is detected automatically, the field in error must be identified and the error described in text.",
      d365: "Form-level notifications, field-level notifications, business rule messages and custom validation in form scripts.",
      fails: "A field turning red with no message. A single banner saying 'there are errors' without naming the fields."
    },
    '3.3.2': {
      req: "Labels or instructions must be provided wherever content requires user input, including the format expected where that is not obvious.",
      d365: "Field labels, field descriptions, placeholder guidance and section-level instructions.",
      fails: "A reference number field with no format hint, so users guess and fail validation. A field whose only label is placeholder text that disappears on typing."
    },
    '3.3.3': {
      req: "Where an input error is detected and a correction is known, the suggestion must be offered to the user, unless doing so would compromise security or the purpose of the content.",
      d365: "Validation messages from business rules, form scripts and plug-ins surfaced to the form.",
      fails: "A message that says 'invalid date' rather than 'enter the date as dd/mm/yyyy'."
    },
    '3.3.4': {
      req: "For pages with legal commitments, financial transactions or the modification or deletion of user-controllable data, the action must be reversible, checked for errors, or confirmed before it takes effect.",
      d365: "Deactivate, delete, bulk edit, bulk delete, custom commands that write to other records, and anything that fires an integration.",
      fails: "A bulk delete that runs immediately with no confirmation and no way back."
    },
    '3.3.7': {
      req: "Information the user has already entered in the same process must be auto-populated or offered for selection, rather than asked for again. Exceptions include re-entry for security and where the earlier answer is no longer valid.",
      d365: "Multi-stage business process flows, quote to order to invoice conversions, and case creation from an existing contact.",
      fails: "A process that asks for the customer address at stage one and asks for it again at stage three with an empty field."
    },
    '3.3.8': {
      req: "An authentication step must not rely on the user remembering, transcribing or solving a cognitive test, unless there is an alternative, a mechanism to help, or the test is object or personal-content recognition.",
      d365: "Assessed with the identity team - Entra ID sign-in, conditional access and MFA methods.",
      fails: "Blocking paste in the password field. An MFA route that only offers transcribing a code read aloud."
    },
    '4.1.2': {
      req: "Every user interface component must expose a name, a role, and - where it has them - its states, properties and values, and changes to those must be available to assistive technology.",
      d365: "Native controls, PCF controls, custom HTML in web resources, command bar buttons, tabs and grid cells.",
      fails: "A div acting as a toggle with no role and no aria-pressed. An icon button whose only text is inside an aria-hidden span, so it has no name at all."
    },
    '4.1.3': {
      req: "A status message that does not take focus must still be announced to assistive technology, normally through a live region.",
      d365: "Save confirmations, form and field notifications, validation summaries, grid filter result counts and progress indicators.",
      fails: "A save confirmation that appears and fades with nothing announcing it. A result count that updates silently after a filter is applied."
    }
  };


  /* ------------------------------------------------------------------ */
  /* 2. Remediation content                                             */
  /*    One entry per finding type the checks can emit. `why` is the    */
  /*    plain-English impact shown on the triage row and detail screen. */
  /*    `steps` are written for whoever fixes it - usually a maker in   */
  /*    the form designer, occasionally a developer.                    */
  /*    `mins` is a relative per-issue size. NEVER SHOWN - see the note */
  /*    on `est` above. It only orders the "fix these first" queue.     */
  /* ------------------------------------------------------------------ */
  var FIXES = {

    /* --- Form metadata, Client API ---------------------------------- */
    'tab-label-missing': {
      why: 'A tab with no label is announced as an unnamed tab. Screen reader users navigating by tab list cannot tell what is behind it.',
      mins: 2,
      steps: [
        'Open the form in the maker portal and select the tab in the tree view.',
        'Set the Label property to the business name for what the tab contains.',
        'Save and publish, then press Refresh.'
      ]
    },
    'tab-label-default': {
      why: 'The tab is still carrying a designer default such as "Tab 1" or "General". It is announced verbatim and tells the user nothing.',
      mins: 2,
      steps: [
        'Select the tab in the form designer tree view.',
        'Replace the label with the business name for the group of information it holds.',
        'If the tab exists only for layout and holds one section, consider whether it should exist at all.'
      ]
    },
    'section-label-default': {
      why: 'Section labels become group headings in the accessibility tree. A default label adds a heading that carries no meaning.',
      mins: 2,
      steps: [
        'Select the section in the form designer.',
        'Either give it a label that describes the fields it groups, or untick "Show label of this section on the form" so it stops emitting a meaningless heading.',
        'Do not leave a visible default label in place.'
      ]
    },
    'field-label-missing': {
      why: 'The control has no label, so a screen reader announces an unlabelled edit box. The user cannot tell what to type.',
      mins: 3,
      steps: [
        'Open the form in the maker portal and select the listed field.',
        'Set the Label property. Dynamics wires the label to the control for you.',
        'Leave "Hide label" unticked. If the design needs the label hidden visually, it must still be set - hiding it removes the programmatic association too, and that is the failure.',
        'Save, publish, press Refresh, then confirm with a screen reader.'
      ]
    },
    'field-label-schema': {
      why: 'The label reads like a schema name or a designer default rather than business language. Screen reader users and sighted users both hear or read the developer name for the column.',
      mins: 3,
      steps: [
        'Select the field on the form and set the Label to the business term the users actually use.',
        'Changing the label on the form does not change the column display name in the table - fix both if the column is exposed in views as well.',
        'Watch for underscores and prefixes leaking through from the schema name.'
      ]
    },
    'field-label-long': {
      why: 'Very long labels truncate once the WCAG text spacing overrides are applied and at 200% zoom, so part of the label is lost.',
      mins: 4,
      steps: [
        'Shorten the label to the shortest phrase that still identifies the field.',
        'Move the explanatory detail into the field Description, which surfaces as help text and is announced after the label.',
        'Re-test at 200% zoom to confirm nothing clips.'
      ]
    },
    'field-label-duplicate': {
      why: 'Two or more visible controls share the same label. A screen reader user moving between them hears the same announcement twice and cannot tell them apart.',
      mins: 5,
      steps: [
        'Decide which control keeps the shared label and give the others a qualifier - "Contact phone" and "Site phone" rather than two fields both labelled "Phone".',
        'If the duplication is deliberate because the fields sit in visually distinct sections, the section heading does not disambiguate them for a screen reader. Change the labels anyway.',
        'Re-check after publishing, as quick create and card forms may carry the same pair.'
      ]
    },
    'field-order-mismatch': {
      why: 'The order the form declares does not match the order the page renders, so tab order will not match the order the fields are read or the order the task expects.',
      mins: 10,
      steps: [
        'Tab through the form from the first field and note where the order stops matching the visual layout.',
        'Check for client script using setVisible, moveControl or direct DOM manipulation that reorders controls at runtime.',
        'Where the platform is reordering, record it as a platform observation and check it against the Microsoft ACR rather than trying to fix it in configuration.'
      ]
    },
    'multi-column-section': {
      why: 'Unified Interface reads a multi-column section column by column, top to bottom, not across each row. Fields that belong together visually can be separated in the reading order.',
      mins: 8,
      steps: [
        'Read the section linearly with a screen reader, or tab through it, and confirm each column makes sense on its own.',
        'Where a pair belongs together - a date range, a value and its unit - put them in the same column, one above the other.',
        'A single-column section is always safe. Use multiple columns only where each column is independently coherent.'
      ]
    },
    'webresource-present': {
      why: 'The form hosts a web resource or IFRAME. Its content is rendered by something other than the form designer, so this tool cannot see inside it and it is not covered by a standard-forms conformance claim.',
      mins: 30,
      steps: [
        'Test the web resource content separately against WCAG 2.2 AA, as its own page.',
        'If it is custom HTML you own, apply the Microsoft guidance for accessible web resources.',
        'If it is a third-party control, get its accessibility conformance report and record any gaps in the accessibility statement.'
      ]
    },

    /* --- Page-level -------------------------------------------------- */
    'lang-missing': {
      why: 'With no lang attribute a screen reader falls back to its own default voice, so English content can be read with the wrong pronunciation rules.',
      mins: 5,
      steps: [
        'This is emitted by the platform shell, not your configuration. Confirm the user\'s personalisation language is set.',
        'Raise it with Microsoft against the Accessibility Conformance Report for your version if it persists.',
        'Record it in the accessibility statement as a platform issue.'
      ]
    },
    'lang-invalid': {
      why: 'The lang attribute is present but is not a valid BCP 47 language tag, so assistive technology cannot act on it.',
      mins: 5,
      steps: [
        'Check the user language and organisation base language settings.',
        'If the value comes from the platform, raise it with Microsoft rather than patching it with client script.'
      ]
    },
    'title-missing': {
      why: 'The page has no title, so browser tabs, window lists and screen reader page announcements give the user nothing to identify where they are.',
      mins: 5,
      steps: [
        'Confirm the record has a value in the primary name column.',
        'If the title is empty with a named record present, this is a platform defect - raise it with Microsoft.'
      ]
    },
    'title-generic': {
      why: 'The title does not identify this record. Users with several tabs open cannot tell them apart, and a screen reader announces the same thing on every record.',
      mins: 10,
      steps: [
        'Check the table\'s primary name column is populated and meaningful for this record.',
        'Where the primary name is an auto-number, consider a calculated or rollup column that produces a human-readable name and set it as the primary name column - note this cannot be changed after the table is created, so it may be a design decision for new tables only.'
      ]
    },
    'title-recorded': {
      why: 'The title was captured so you can judge whether it distinguishes this record from every other record.',
      mins: 3,
      steps: [
        'Open two records of the same table side by side and compare the browser tab titles.',
        'If they are indistinguishable, treat it as a fail against 2.4.2 and fix the primary name column.'
      ]
    },

    /* --- Names and roles --------------------------------------------- */
    'name-missing': {
      why: 'The control exposes no accessible name. A screen reader announces only its role - "button", "link" - so the user has no idea what it does.',
      mins: 6,
      steps: [
        'If it is a custom command bar button, set the Label in the command designer. An icon-only command still needs a label; use the tooltip and label properties rather than leaving it blank.',
        'If it is a PCF or custom control, expose a name through aria-label or aria-labelledby in the control manifest and render.',
        'If it comes from the platform shell, tag it as a platform issue and check it against the Microsoft ACR rather than patching the DOM.',
        'Never fix this with client script that writes attributes onto platform DOM - Microsoft changes those elements between releases.'
      ]
    },
    'img-alt-missing': {
      why: 'The image has no alt attribute at all. A screen reader falls back to announcing the file name, which is noise if the image is decorative and useless if it is meaningful.',
      mins: 4,
      steps: [
        'Decide whether the image carries information or is decoration.',
        'If it carries information, give it alt text that conveys the same information - not a description of the picture.',
        'If it is decoration, set alt="" so assistive technology skips it entirely.',
        'For images in a web resource you own, fix the markup. For images the platform renders, record it as a platform issue.'
      ]
    },
    'img-alt-filename': {
      why: 'The alt text repeats the file name. That is almost always a placeholder rather than a description, so the image is effectively unlabelled.',
      mins: 4,
      steps: [
        'Decide whether the image is decorative or meaningful.',
        'Replace the file name with text that conveys what the image tells the user, or set alt="" if it is decorative.'
      ]
    },
    'label-in-name': {
      why: 'The visible text and the accessible name differ. A speech recognition user saying "click" followed by the visible label will not activate the control.',
      mins: 5,
      steps: [
        'Make the accessible name start with, or contain, the visible text word for word.',
        'On custom commands, check the Label and the tooltip are not saying different things - the tooltip commonly becomes the accessible name and overrides the visible label.',
        'Do not remove the visible label to make the mismatch go away.'
      ]
    },
    'duplicate-id': {
      why: 'Duplicate id values break aria-labelledby and label-for associations, so labels can silently stop reaching the controls they belong to.',
      mins: 10,
      steps: [
        'Identify which duplicate comes from your web resources or PCF controls and make those ids unique.',
        'Duplicates emitted entirely by the platform are a Microsoft issue - record and raise rather than patch.',
        'Note that 4.1.1 Parsing was removed in WCAG 2.2, so this is only a failure where it actually breaks a name or relationship.'
      ]
    },

    /* --- Colour and size --------------------------------------------- */
    'contrast-text': {
      why: 'Text does not meet the minimum contrast ratio against its background, so users with low vision cannot read it reliably.',
      mins: 8,
      steps: [
        'If a custom theme is applied, this is yours to fix. Adjust the theme colour so the ratio reaches 4.5:1 for normal text, or 3:1 for text at 24px, or 18.66px bold and above.',
        'If no custom theme is applied, the colour is coming from the platform - record it, check it against the Microsoft ACR and raise it rather than overriding with CSS.',
        'Never fix contrast by injecting CSS into the platform shell. It breaks on the next release and hides the real defect.',
        'Re-measure with a contrast analyser after changing the theme, including hover and disabled states.'
      ]
    },
    /* Not a defect in the page. The scan ran while something outside the page
       was re-colouring it, so any ratio computed would describe neither the
       page as authored nor what is actually on screen. */
    'contrast-env-altered': {
      why: 'Contrast could not be measured, because the page is being re-coloured while the scan runs. A high-contrast browser extension, a Windows forced-colours theme or an inverted display changes what you see without changing what a scan can read, so no ratio reported now would be trustworthy.',
      mins: 5,
      steps: [
        'Turn off the high-contrast extension, the Windows High Contrast or Contrast theme and any display inversion, then press Refresh. WCAG is assessed against the default presentation, so that is the state to measure.',
        'A browser extension that re-colours a page almost always does it with a CSS filter over the whole document. A filter changes the pixels that get painted, not the colours in the CSS, so getComputedStyle still returns the original values and no scan can see the improvement. That is why switching the extension on does not move these numbers.',
        'Windows High Contrast and the Windows contrast themes are a user override. They do not make a page conformant, and 1.4.3 and 1.4.11 still have to be met without them.',
        'Whether the page survives forced colours is a separate manual check: confirm nothing disappears, no meaning is carried by colour alone, and every icon and control boundary is still visible.'
      ]
    },
    'contrast-unmeasured': {
      why: 'These text nodes sit over a background image, a gradient, or a background that resolves to transparent, so the ratio cannot be computed. They are not passing - they are unmeasured.',
      mins: 10,
      steps: [
        'Sample each one manually with a contrast analyser eyedropper at its worst point over the background.',
        'Canvas-rendered charts cannot be measured programmatically at all. Sample the series colours and the axis labels by hand.',
        'Record the sampled results in the evidence pack so this shows as checked rather than skipped.'
      ]
    },
    /* --- 1.4.11 Non-text contrast ------------------------------------ */
    'control-boundary-contrast': {
      why: 'An empty field has nothing in it to see, so its boundary is the only thing that says a field is there. Below 3:1 a user with low vision cannot tell the field from the page around it.',
      mins: 8,
      steps: [
        'If a custom theme is applied, raise the control border colour until it reaches 3:1 against the surface behind it. The theme designer in the maker portal sets this once for the whole app.',
        'A filled control counts as its own boundary, so a light grey fill against a white form is an alternative to a darker border - but the fill has to reach 3:1 too.',
        'If no custom theme is applied, the colour is the platform default. Record it, check it against the Microsoft accessibility conformance report and raise it rather than overriding with CSS.',
        'Do not fix this by injecting CSS into the platform shell. It breaks on the next release.',
        'Re-measure the hover and read-only states as well. Only the disabled state is exempt.'
      ]
    },
    'control-no-boundary': {
      why: 'The control has no visible text, no icon and no boundary that reaches 3:1, so there is nothing at all to show a sighted user that a control is there.',
      mins: 10,
      steps: [
        'Give the control a visible label, an icon that reaches 3:1, or a border or fill that does.',
        'Only one of the three is needed. A control carrying visible text does not need a boundary at all under 1.4.11.',
        'If this is a platform control, record it with a screenshot and raise it with Microsoft.'
      ]
    },
    'state-indicator-contrast': {
      why: 'A checkbox, radio button or toggle carries its state in its own box. If that box does not reach 3:1 against the form behind it, a user with low vision cannot see whether the option is on or off.',
      mins: 8,
      steps: [
        'Check both states. The unchecked box and the checked fill are separate measurements and both need 3:1.',
        'Raise the border or fill colour in the app theme until both states clear 3:1.',
        'Confirm the tick or dot inside a checked control is also visible against its fill.',
        'Confirm in Windows high contrast mode, where these controls are commonly lost.'
      ]
    },
    'icon-contrast': {
      why: 'The control shows nothing but an icon, so the icon is what identifies it. Below 3:1 against the surface behind it the control is effectively invisible to a user with low vision.',
      mins: 8,
      steps: [
        'Darken the icon colour until it reaches 3:1 against the button surface behind it.',
        'If the icon sits on a coloured button, measure against the button fill and not the page.',
        'Where the icon is decorative and the control also carries text, this one can be closed as not applicable - record why.',
        'Icons drawn as a font glyph rather than an SVG are measured as text under 1.4.3 instead.'
      ]
    },
    'focus-indicator-contrast': {
      why: 'The focus indicator is visible but does not reach 3:1 against the colours it sits against, so a keyboard user with low vision still cannot see where they are.',
      mins: 10,
      steps: [
        'Raise the outline colour until it reaches 3:1 against both the control and the background it sits over, or use a two-colour indicator so one half always contrasts.',
        'Add an outline-offset so the ring does not merge into the control border.',
        'This is measured with the control focused, so re-run deep mode after changing it.',
        'A platform focus ring is a Microsoft issue - record it rather than overriding it with CSS.'
      ]
    },
    'nontext-unmeasured': {
      why: 'These controls sit over a background image, a gradient, or a background that resolves to transparent, so their boundary contrast cannot be computed. They are not passing - they are unmeasured.',
      mins: 10,
      steps: [
        'Sample each one by hand with a contrast analyser at the worst point of the background behind it.',
        'Record the sampled results in the evidence pack so this shows as checked rather than skipped.'
      ]
    },
    'graphics-review': {
      why: 'Charts, diagrams and icons carry meaning that has to survive at 3:1. Only a person can say which parts of a graphic are required to understand it, so no tool can decide this one.',
      mins: 15,
      steps: [
        'For each graphic, decide which parts are required to understand it. Decoration is exempt.',
        'Sample those parts against the colours next to them with a contrast analyser. Canvas-rendered charts cannot be measured programmatically at all.',
        'For charts, check the series colours against each other and against the plot background, not just against white.',
        'Where a chart relies on colour alone to separate series, that is a 1.4.1 failure as well - add a pattern, a direct label or a marker shape.'
      ]
    },

    'target-size': {
      why: 'The target is smaller than 24 by 24 CSS pixels and another target sits inside its 24px spacing circle, so users with motor impairments are likely to hit the wrong one.',
      mins: 8,
      steps: [
        'Check the "equivalent control" exception first: if the same action is available from a larger control on the same page, the criterion is met and this is not a defect. This tool cannot determine that for you.',
        'Where the small target is in your own PCF or web resource, increase the hit area with padding rather than by scaling the icon.',
        'Where it is a platform control such as a grid row action, record it as a platform observation and check it against the Microsoft ACR.'
      ]
    },
    'fixed-width': {
      why: 'A fixed pixel width blocks reflow, so content is cut off or requires two-dimensional scrolling at a 320px viewport or 400% zoom.',
      mins: 10,
      steps: [
        'Find the source. Fixed widths in a form usually come from a web resource, a PCF control or injected client script rather than the form designer.',
        'Replace the fixed width with a percentage or a max-width so the element can shrink.',
        'Data grids are exempt from the two-dimensional scrolling requirement. Confirm the flagged element is not inside one before logging it.'
      ]
    },
    'text-clipped': {
      why: 'The text overflows its container once the WCAG 1.4.12 text spacing overrides are applied, so users who increase spacing to read more comfortably lose content.',
      mins: 10,
      steps: [
        'Shorten the label or column name so it fits at the wider spacing.',
        'Where a fixed height or a nowrap style is causing the clip and it belongs to your web resource or PCF, allow the container to grow.',
        'Where the clipping is in a platform-rendered element, record it as a platform issue with a screenshot at the WCAG spacing values.'
      ]
    },

    'text-overflow': {
      why: 'The text no longer fits its container once the WCAG text spacing values are applied. Nothing is clipped, so instead it overlaps or pushes whatever sits next to it, and the layout stops being readable.',
      mins: 10,
      steps: [
        'Let the container grow rather than pinning its height, so the text reflows instead of spilling.',
        'Shorten the label or column name so it fits at the wider spacing.',
        'Check what sits immediately below and to the right of it at the WCAG values - the damage usually shows there, not on the element itself.',
        'Where the container belongs to a platform-rendered element, record it as a platform issue with a screenshot at the WCAG spacing values.'
      ]
    },

    /* --- Keyboard and focus ------------------------------------------ */
    'tabindex-positive': {
      why: 'A positive tabindex forces the element out of the natural document order, which makes the whole page focus order unpredictable for keyboard users.',
      mins: 8,
      steps: [
        'Change the value to 0 so the element takes its natural place in the order, or -1 if it should only be focusable programmatically.',
        'If the positive value was there to fix a perceived ordering problem, fix the order of the markup instead.',
        'Positive tabindex in a platform element is a Microsoft issue - record and raise it.'
      ]
    },
    'not-focusable': {
      why: 'The element responds to clicks but cannot be reached by keyboard, so keyboard-only and screen reader users cannot use it at all.',
      mins: 8,
      steps: [
        'In your own web resource or PCF, use a real button element rather than a div with a click handler. That gives you focus, Enter and Space handling for free.',
        'If it must stay a div, add tabindex="0", a role, and keyboard handlers for Enter and Space.',
        'Confirm by unplugging the mouse and reaching the control by Tab alone.'
      ]
    },
    'focus-invisible': {
      why: 'The element looks identical focused and unfocused, so a keyboard user has no way of knowing where they are on the form.',
      mins: 8,
      steps: [
        'Remove any CSS that sets outline:none or outline:0 without providing a replacement indicator.',
        'In your own controls, use :focus-visible with an outline of at least 2px and an offset so it does not merge into the control border.',
        'Check it against 1.4.11 too - the indicator itself needs 3:1 contrast against both the control and the background.',
        'Confirm in Windows high contrast mode as well as the default theme.'
      ]
    },
    'bypass-missing': {
      why: 'There is no skip link and no main landmark, so keyboard and screen reader users have to move through the navigation and site map before reaching the record on every single page.',
      mins: 10,
      steps: [
        'This is the platform shell. Confirm empirically by tabbing from the address bar - a skip link may exist but only appear on focus.',
        'If nothing is present, raise it with Microsoft and record it in the accessibility statement.',
        'Do not inject your own skip link into the shell.'
      ]
    },
    'bypass-found': {
      why: 'A sufficient bypass technique is present in the markup. That is not the same as it working.',
      mins: 5,
      steps: [
        'Load a record, put focus in the address bar, then press Tab and confirm the first stop actually offers a way past the navigation.',
        'Confirm the target of the skip link receives focus, not just scroll position.'
      ]
    },

    /* --- Structure ---------------------------------------------------- */
    'headings-none': {
      why: 'Screen reader users navigate long pages by heading. With no headings on the page they have to tab through everything instead.',
      mins: 10,
      steps: [
        'Turn on section labels where they group meaningful sets of fields - Unified Interface emits these into the accessibility tree.',
        'Check whether the page is a dashboard or custom page where you control the markup, and add real heading elements there.',
        'Where the whole page structure is platform-rendered, record it as a platform observation.'
      ]
    },
    'heading-skip': {
      why: 'The heading level jumps a level, so the outline implies a nesting that is not there and users navigating by heading lose the structure.',
      mins: 8,
      steps: [
        'In content you control, correct the level so it steps by one.',
        'Do not fix a level skip by changing font size - the level, not the appearance, is what assistive technology uses.',
        'Where the skip is between a platform heading and your web resource heading, adjust yours to fit the platform outline.'
      ]
    },
    'grid-no-headers': {
      why: 'A grid with no column headers gives screen reader users no context for any cell value - they hear the data with nothing to attach it to.',
      mins: 10,
      steps: [
        'If this is a custom grid in a web resource or PCF, mark up the header row properly with th or role="columnheader".',
        'If it is a platform grid rendering without headers, capture the case and raise it with Microsoft.'
      ]
    },
    'grid-header-blank': {
      why: 'One or more column headers have no accessible name, so cells in those columns are announced with no context.',
      mins: 8,
      steps: [
        'Icon-only columns such as a status flag still need a name. Set the column display name in the view.',
        'Where the column exists only for a row action, check whether it should be in the view at all.'
      ]
    },
    'grid-column-schema': {
      why: 'The view column is showing a schema name or a default rather than business language.',
      mins: 5,
      steps: [
        'Change the column display name in the table designer, or override the label on the view column if only this view is affected.',
        'Republish the view and press Refresh.'
      ]
    },
    'grid-column-duplicate': {
      why: 'The same column name appears more than once in one grid, so a screen reader user cannot tell the columns apart when navigating cell by cell.',
      mins: 6,
      steps: [
        'Rename one of them on the view - for example "Owner (Account)" and "Owner (Case)" rather than two columns both called "Owner".',
        'This commonly happens with related-record columns; the relationship name is what needs to appear in the label.'
      ]
    },
    'grid-sampled': {
      why: 'The modern grid virtualises rows, so only the rows currently rendered were scanned. This is a sample, not full coverage.',
      mins: 5,
      steps: [
        'Scroll the grid and press Refresh to cover more rows.',
        'Record in the evidence pack how many rows were actually scanned.'
      ]
    },
    'link-generic': {
      why: 'The link text does not say where it goes. Screen reader users often pull up a list of links out of context, where "click here" means nothing.',
      mins: 6,
      steps: [
        'Rewrite the link text so it makes sense read on its own.',
        'Inside a grid, the column header may supply enough context under 2.4.4 Link Purpose (In Context) - judge it against the header rather than assuming a failure.',
        'On a form, there is usually no such context, so treat it as a failure.'
      ]
    },
    'link-raw-url': {
      why: 'A screen reader reads a raw URL out character by character. A long URL as link text is unusable.',
      mins: 5,
      steps: [
        'Where you control the rendering, show a descriptive label and put the URL in the href.',
        'Where the URL comes from a Dataverse URL column rendered as a link, consider adding a separate text column for the label and showing that instead.'
      ]
    },

    /* --- Status and input purpose ------------------------------------- */
    'live-region-none': {
      why: 'No live regions were found, so save confirmations, validation counts and filter results may never be announced to a screen reader user.',
      mins: 15,
      steps: [
        'Live regions are often created on demand. Trigger a save and a validation failure, then press Refresh before concluding this is a defect.',
        'Use the Client API notification methods - formContext.ui.setFormNotification and setNotification on the control - rather than writing your own banner, so the platform handles the announcement.',
        'In your own web resources, use role="status" for informational messages and role="alert" for errors.'
      ]
    },
    'live-region-present': {
      why: 'Live regions exist in the markup. Their presence does not prove anything is actually announced.',
      mins: 10,
      steps: [
        'Trigger a save, a validation failure and a grid filter with a screen reader running and confirm each one is spoken.',
        'Check the message is inserted into an existing live region rather than the region being added at the same moment as the text, which is often not announced.'
      ]
    },
    'autocomplete-count': {
      why: 'Recorded so you can decide applicability. 1.3.5 applies only where the form collects the logged-in user\'s own details, which is uncommon in a staff-facing CRM where users type customer data.',
      mins: 10,
      steps: [
        'Decide whether any field on this form collects information about the user who is signed in.',
        'If none do, record the criterion as not applicable with that reasoning in the evidence pack rather than leaving it unanswered.',
        'If some do - a self-service portal form, an expenses form - confirm the correct autocomplete tokens are emitted, and raise it with Microsoft if the platform does not emit them.'
      ]
    }
  };


  /* ------------------------------------------------------------------ */
  /* 2b. Why the observation breaches the criterion                     */
  /*     One line per finding TYPE, said in terms of what the criterion */
  /*     asks for - not what to do about it, which is FIXES. This is    */
  /*     what the detail screen shows under "Why this does not meet".   */
  /*     Every type in FIXES needs an entry here.                       */
  /* ------------------------------------------------------------------ */
  var FAILS = {
    'tab-label-missing': "2.4.6 asks for headings and labels that describe what they label. A tab with no label describes nothing - the tab list is a heading structure for the form, and one of its headings is empty.",
    'tab-label-default': "2.4.6 asks the label to describe the topic or purpose. A designer default such as 'Tab 1' or 'General' is announced verbatim and carries no topic, so the criterion is not met even though a label exists.",
    'section-label-default': "2.4.6 covers section headings as well as field labels. A section still carrying its designer default groups fields under a heading that does not say what the group is.",
    'field-label-missing': "3.3.2 requires a label wherever content needs user input, and 4.1.2 requires every component to expose a name. A control with neither is announced as its type alone, so the user is told there is an edit field but not what to put in it.",
    'field-label-schema': "2.4.6 asks the label to describe the field. A schema name such as new_field1 is a developer identifier, not a description, and it is read out literally.",
    'field-label-long': "2.4.6 is about a label that describes the field. A label long enough to be a paragraph buries the description inside a sentence the user has to sit through on every pass of the form.",
    'field-label-duplicate': "2.4.6 asks labels to describe their purpose, which implies distinguishing one field from another. Two fields with the same label cannot be told apart by name alone when a screen reader lists the form controls.",
    'field-order-mismatch': "2.4.3 requires the focus order to preserve meaning and operability where order matters. The order the form declares and the order the DOM presents have diverged, so tab order is unlikely to follow the data entry task.",
    'multi-column-section': "1.3.2 requires the reading sequence to preserve meaning. Unified Interface reads a multi-column section column by column rather than across the row, so fields that belong together visually are read far apart.",
    'webresource-present': "Web resources render their own markup, which none of the platform's own accessibility work covers. Everything in this list applies inside it, and the tool cannot see into a cross-origin frame.",
    'lang-missing': "3.1.1 requires the default human language of the page to be programmatically determinable. With no lang attribute the screen reader falls back to its own voice setting and may read the content with the wrong pronunciation rules.",
    'lang-invalid': "3.1.1 needs a valid language tag. A value that is not a well-formed BCP 47 tag is ignored, which leaves the page in the same state as having no lang at all.",
    'title-missing': "2.4.2 requires a title that describes the topic or purpose of the page. There is no title to describe anything, so a user with several tabs open has nothing to navigate by.",
    'title-generic': "2.4.2 asks the title to describe the topic and distinguish the page. A generic title is present but identifies neither the record nor the task.",
    'title-recorded': "Recorded so the title can be judged against 2.4.2 rather than assumed. The criterion asks whether it distinguishes this page from others, which only a person can decide.",
    'name-missing': "4.1.2 requires every user interface component to expose a name. A control with no accessible name is announced as its role alone - 'button', 'link', 'edit' - so a screen reader user cannot tell what it does before activating it.",
    'img-alt-missing': "1.1.1 requires a text alternative for non-text content. An img with no alt attribute is announced by its file path or skipped entirely, so whatever the image conveys is lost.",
    'img-alt-filename': "1.1.1 asks for a text alternative that serves an equivalent purpose. A filename repeated as alt text serves no purpose - it is read out character by character and tells the user nothing about the image.",
    'label-in-name': "2.5.3 requires the accessible name to contain the visible label text. When it does not, a speech input user who says the words on the button cannot activate it, because the name the software matches against is different.",
    'duplicate-id': "4.1.2 depends on names and relationships resolving correctly, and aria-labelledby, aria-describedby and label-for all resolve by id. A duplicated id makes those references ambiguous, so a control can end up with the wrong name or no name.",
    'contrast-text': "1.4.3 sets a floor of 4.5:1 for normal text and 3:1 for large text. The measured ratio is below the floor for this text size and weight, so it is not readable by users with moderately low vision without assistive technology.",
    'contrast-env-altered': "The criterion is unmeasured - not met and not failed. Something outside the page is re-colouring it while the scan runs, so no ratio computed here would describe the page as it is normally presented.",
    'contrast-unmeasured': "1.4.3 still applies here, but the background did not resolve to a solid colour - an image, a gradient or a canvas - so the ratio cannot be computed and has to be sampled by hand.",
    'control-boundary-contrast': "1.4.11 requires the visual information needed to identify a control to reach 3:1. This field is empty until it is typed into, so its boundary is the only thing identifying it, and the boundary is below the threshold.",
    'control-no-boundary': "1.4.11 requires a control to be identifiable. This one carries no visible text, no icon and no boundary at 3:1, so there is nothing to tell a sighted user a control is there at all.",
    'state-indicator-contrast': "1.4.11 covers the indication of state as well as the control itself. The box that carries checked or unchecked is below 3:1 against the surface, so the state cannot be seen reliably. Only the unchecked state can be measured from a scan - check the checked state by hand.",
    'icon-contrast': "1.4.11 applies to the graphical parts needed to identify a control. This control has no text, so the glyph is what identifies it, and the glyph is below 3:1 against the control's own surface.",
    'focus-indicator-contrast': "1.4.11 covers focus indicators. An indicator is drawn when this control takes focus, but it is below 3:1 against the surface behind it, so a keyboard user cannot see where they are.",
    'nontext-unmeasured': "1.4.11 still applies, but the adjacent colour did not resolve to something measurable, so the ratio has to be sampled by hand.",
    'graphics-review': "1.4.11 applies to graphical objects only where they are required to understand the content, which no tool can decide. Each of these needs a person to say whether it carries meaning, and if it does, whether its meaningful parts reach 3:1.",
    'target-size': "2.5.8 requires a pointer target of at least 24 by 24 CSS pixels unless an exception applies. This target is smaller and none of the exceptions - spacing, inline in a sentence, user agent default, equivalent control elsewhere - was found to apply.",
    'fixed-width': "1.4.10 requires content to reflow to 320 CSS pixels without two-dimensional scrolling. A hard-coded pixel width cannot reflow, so at 400 per cent zoom the user has to scroll sideways to read.",
    'text-clipped': "1.4.12 requires no loss of content when the user applies the spacing overrides. Applying them clipped this element, so text that was readable before is now cut off and unrecoverable.",
    'text-overflow': "1.4.12 is about loss of content, not about tidiness. Applying the spacing overrides pushed this text outside its container. Nothing is lost yet, but it will collide with neighbouring content, so a person has to judge whether anything becomes unreadable.",
    'tabindex-positive': "2.4.3 requires focus order to preserve meaning. A positive tabindex pulls the element out of document order and in front of everything with tabindex 0, which breaks the order for the whole page, not just this control.",
    'not-focusable': "2.1.1 requires all functionality to be operable from the keyboard. This element has a click handler but cannot receive focus, so there is no keyboard route to the function it performs.",
    'focus-invisible': "2.4.7 requires a visible focus indicator on any control that can take keyboard focus. Focusing this control changed nothing measurable in its computed style, so a keyboard user has no way of telling where they are.",
    'bypass-missing': "2.4.1 requires a way to skip blocks that repeat on every page. No skip link and no main landmark were found, so a keyboard user tabs through the app header and site map before reaching the form every time.",
    'bypass-found': "Recorded as evidence for 2.4.1 rather than as a pass. A mechanism exists in the markup, but the criterion asks whether it actually works, which needs a keyboard pass to confirm.",
    'headings-none': "1.3.1 requires structure that is shown visually to exist in the markup. No headings were found at all, so a screen reader user has no heading list to navigate this page by.",
    'heading-skip': "1.3.1 covers the heading hierarchy as a relationship. A level skipped in the sequence implies a nesting that is not there, so the outline a screen reader builds does not match the visual structure.",
    'grid-no-headers': "1.3.1 requires table relationships to be programmatic. Without column headers, a screen reader reading a cell cannot say which column it belongs to, so the value is announced with no context.",
    'grid-header-blank': "1.3.1 needs the header to name the column it heads. A blank header leaves every cell in that column announced with no column name.",
    'grid-column-schema': "2.4.6 asks labels to describe their purpose. A column header showing a schema name is a developer identifier read out to the user in place of a description.",
    'grid-column-duplicate': "2.4.6 asks labels to distinguish what they label. Two columns with the same header cannot be told apart when a cell is announced with its column name.",
    'grid-sampled': "Recorded so the sample size is visible. Grid content is virtualised, so only the rendered rows could be checked - the rest of the view has not been assessed against 1.3.1.",
    'link-generic': "2.4.4 asks for link purpose to be clear from the link text, or from the text with its surrounding context. Generic link text gives none, and a screen reader user listing the links on the page sees the same phrase repeatedly.",
    'link-raw-url': "2.4.4 asks for a purpose a user can understand. A raw URL as link text is read out character by character and does not describe where it goes.",
    'live-region-none': "4.1.3 requires status messages to be available to assistive technology without taking focus. With no live region on the page, a save confirmation or a validation count is shown visually and never announced.",
    'live-region-present': "Recorded as evidence for 4.1.3, not as a pass. A live region existing in the markup does not prove any message is inserted into it, or that the insertion is announced.",
    'autocomplete-count': "Recorded so applicability of 1.3.5 can be decided. The criterion only applies where the form collects the signed-in user's own details, which a tool cannot determine."
  };


  /* ------------------------------------------------------------------ */
  /* 3. Utilities                                                       */
  /* ------------------------------------------------------------------ */

  var findings = [];
  var ranChecks = {};      /* sc -> true when an automated check executed  */
  var notes = [];          /* scan-level notes: skipped frames, etc.       */
  var scanMs = 0;
  var scanAt = null;
  /* Set at the start of every scan by detectRenderMode(). When something
     outside the page is re-colouring the rendering, the contrast checks are
     skipped rather than run against numbers that describe neither the authored
     page nor what is on screen. */
  var renderAltered = { altered: false, reasons: [], advisory: [] };

  /* A finding is one observation about one element (or the page).
     The UI groups findings into issues by sc + type. */
  function add(sc, severity, type, message, el, detail, owner, ev) {
    findings.push({
      sc: sc, severity: severity, type: type, message: message,
      el: el || null, detail: detail || '', owner: owner || 'unknown',
      /* A Client API finding has no element but does belong to the form, so
         it says so explicitly rather than being filed as page-level. */
      region: (ev && ev.region) || regionOf(el),
      label: ev && ev.label ? ev.label : (el ? describeEl(el).label : ''),
      schema: ev && ev.schema ? ev.schema : (el ? describeEl(el).schema : ''),
      evidence: ev && ev.evidence ? ev.evidence : '',
      /* Who can actually fix it. A heuristic - see classify(). */
      cls: (ev && ev.cls) || classify(type, el)
    });
  }
  /* Every check that stops early says so. A capped scan that reports nothing
     about the cap reads as a complete one, and the report is the artefact
     someone else relies on. */
  function capped(label, shown, skipped, advice) {
    if (!skipped) return;
    notes.push(label + ': ' + shown + ' of ' + (shown + skipped) + ' shown. ' +
      (advice || 'The check stops early to keep the panel usable. Fix these and re-run to see the rest.'));
  }
  function markRan() {
    for (var i = 0; i < arguments.length; i++) ranChecks[arguments[i]] = true;
  }
  function txt(el) { return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim(); }
  function attr(el, n) { return el && el.getAttribute ? el.getAttribute(n) : null; }
  function safe(fn, label) {
    try { return fn(); }
    catch (e) { notes.push('Check "' + label + '" failed to run: ' + (e && e.message)); return null; }
  }

  /* Is something re-colouring this page while we measure it?
     Two different mechanisms, and they fail in opposite directions:
     - FORCED COLOURS (Windows High Contrast, the Windows contrast themes)
       replaces the used colours, so the ratios we read are not the ones the
       page declares and a page could look measured-and-fine while its own
       palette is unchanged and still failing.
     - A HIGH-CONTRAST BROWSER EXTENSION almost always paints a CSS filter over
       the whole document. A filter is a paint-time operation, so
       getComputedStyle on a descendant still returns the ORIGINAL colours -
       the scan literally cannot see the extension. This is why the results do
       not move when the extension is switched on, and it is not a defect in
       either the extension or the tool.
     Either way the honest answer is "not measured", not a ratio. And a user
     contrast override does not make a page conformant: WCAG is assessed on the
     default presentation, which is the state that has to be scanned. */
  function detectRenderMode() {
    var reasons = [], advisory = [];
    function mq(q) {
      try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; }
    }
    if (mq('(forced-colors: active)')) {
      reasons.push('Forced colours is active - a Windows High Contrast or Windows contrast theme is replacing the page colours.');
    }
    if (mq('(inverted-colors: inverted)')) {
      reasons.push('The display is inverting colours.');
    }
    [['documentElement', 'the html element'], ['body', 'the body element']].forEach(function (pair) {
      var el = document[pair[0]], cs;
      if (!el) return;
      try { cs = getComputedStyle(el); } catch (e) { return; }
      if (!cs) return;
      var f = cs.filter || cs.webkitFilter;
      if (f && f !== 'none') {
        reasons.push('A CSS filter is painted over the whole page (' + pair[1] + ': filter: ' +
          String(f).slice(0, 60) + '), which is how a high-contrast browser extension works. It changes the pixels, not the colours the scan can read.');
      }
      if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') {
        reasons.push('A blend mode is applied to ' + pair[1] + ' (' + cs.mixBlendMode + '), which changes the colours that get painted.');
      }
    });
    if (mq('(prefers-contrast: more)')) {
      advisory.push('The operating system is asking for more contrast (prefers-contrast: more). Nothing in this page appears to respond to it, so colours were measured as the page declares them.');
    }
    return { altered: reasons.length > 0, reasons: reasons, advisory: advisory };
  }

  /* One shared finding, raised against whichever criterion could not be
     measured. Severity is 'review' so the criterion cannot roll up to
     "No issues detected" on the back of a check that never ran.
     Two explicit call sites rather than one add() with a variable criterion:
     manifest.spec.js reads add() calls straight out of the source and can only
     see a literal criterion. That is the right contract - a finding type the
     source does not visibly declare against a criterion is one nothing can
     police for its FIXES, FAILS and classification entries. */
  function contrastEnvFinding(sc) {
    var msg = 'Contrast was not measured - the page is being re-coloured while the scan runs';
    var det = renderAltered.reasons.join(' ') +
      ' Nothing here is a pass or a failure: the check did not run. Switch the override off and press Refresh.';
    var ev = { region: 'page', label: 'whole page', schema: 'rendering environment', evidence: 'contrast not measured' };
    if (sc === '1.4.11') add('1.4.11', 'review', 'contrast-env-altered', msg, null, det, 'unknown', ev);
    else add('1.4.3', 'review', 'contrast-env-altered', msg, null, det, 'unknown', ev);
  }

  /* Is this element part of the platform shell rather than your configuration? */
  var SHELL_SELECTORS = [
    '[data-id="navbar-container"]', '#navbar', '[data-id="topBar"]',
    '[data-id="shell-container"]', '[role="banner"]', '[data-id="site-map"]',
    '[data-id="navbar-collapse-button"]', '[data-id="appLauncher"]',
    '[data-id="officeWaffle"]', '[data-id="mectrl_main_trigger"]'
  ];
  function isShell(el) {
    if (!el || !el.closest) return false;
    for (var i = 0; i < SHELL_SELECTORS.length; i++) {
      try { if (el.closest(SHELL_SELECTORS[i])) return true; } catch (e) {}
    }
    return false;
  }
  function ownerOf(el) { return isShell(el) ? 'platform' : 'yours'; }

  /* Which region of the page the element sits in. Drives the Scope filter.
     These selectors are not contractual - Microsoft changes them between
     releases. Expect to adjust them. */
  var CMD_SELECTORS = [
    '[data-id="form-command-bar"]', '[data-id*="commandbar" i]',
    '[data-lp-id*="CommandBar" i]', '.ms-CommandBar', '[role="menubar"]',
    '[data-id="MoreCommands"]', '[aria-label="Command bar" i]'
  ];
  var GRID_SELECTORS = [
    '[role="grid"]', '[role="treegrid"]', 'table',
    '[data-id$="-subgrid"]', '[data-lp-id*="Grid" i]',
    '[data-id*="DataSetHostContainer" i]', '.ag-root'
  ];
  function matchesAny(el, list) {
    if (!el || !el.closest) return false;
    for (var i = 0; i < list.length; i++) {
      try { if (el.closest(list[i])) return true; } catch (e) {}
    }
    return false;
  }
  var REGIONS = [
    ['form', 'This form'],
    ['command', 'Command bar'],
    ['grid', 'Subgrids and views']
  ];
  /* An element-less finding - lang, page title, bypass blocks, live regions,
     and everything that comes from the Client API rather than the DOM -
     belongs to no region. It used to be filed under 'form', so unticking
     "This form" hid whole-page failures. 'page' is never filtered out. */
  function regionOf(el) {
    if (!el) return 'page';
    if (matchesAny(el, CMD_SELECTORS)) return 'command';
    if (matchesAny(el, GRID_SELECTORS)) return 'grid';
    return 'form';
  }

  /* ------------------------------------------------------------------ */
  /* Who can actually fix it - Microsoft, or you                        */
  /*                                                                     */
  /* 'custom'   naming, a missing label, or where something sits on the   */
  /*            form or view - or anything inside a PCF control or a web  */
  /*            resource your team wrote. Your team MIGHT be able to      */
  /*            change it; the designers do not expose everything.        */
  /* 'platform' Unified Interface renders it. No amount of configuration */
  /*            changes it, so it belongs in a Microsoft support case    */
  /*            and in the accessibility statement, not in your backlog. */
  /* 'triage'   nothing in the DOM said either way. Someone has to look. */
  /*                                                                     */
  /* This is a heuristic built on data-id patterns, and Microsoft changes */
  /* those between releases. Treat 'platform' as a strong hint to check,  */
  /* not as a verdict. Anything it cannot place is 'triage' rather than   */
  /* being guessed into one of the other two.                            */
  /* ------------------------------------------------------------------ */

  /* Out-of-box controls Microsoft draws inside your form, view or command
     bar. This list, compiled 29/08/2026. These are matched BEFORE YOURS_SELECTORS,
     which nothing else is, because a lookup's magnifying glass or a command
     bar's ... flyout is Microsoft's whatever container it happens to sit in -
     including a field that carries data-control-name. Whatever the finding is
     about - the name, the colour, the target size, the keyboard behaviour -
     the answer for these is Microsoft. */
  var OOB_SELECTORS = [
    /* Lookup fields: how the value is displayed, the magnifying glass, the
       clear button and the results flyout. */
    '[data-id*="LookupResultsDropdown" i]', '[data-id*="lookupSearch" i]',
    '[data-id*="lookup-search" i]', '[data-id$="_search"]',
    '[data-id*="tagButton" i]', '[data-id*="selectedRecordList" i]',
    '[data-id*="DeleteRecordButton" i]', '[aria-label*="Search records" i]',
    /* Out-of-box command bar buttons - Close, Back, Save and the rest of the
       Mscrm.* ribbon. A solution publisher prefixes its own commands, so
       Mscrm.* is a usable marker for Microsoft's own. */
    '[data-id^="Mscrm." i]', '[data-lp-id^="Mscrm." i]',
    '[data-id*="dialogCloseIconButton" i]', '[data-id*="closeButton" i]',
    '[data-id*="close-button" i]', '[data-id*="backButton" i]',
    '[data-id*="back-button" i]', '[data-id*="navBack" i]',
    /* The ... flyout at the end of a command bar or a subgrid. */
    '[data-id*="OverflowButton" i]', '[data-id="MoreCommands"]',
    '[data-id*="moreCommands" i]', '[data-id*="flyoutRoot" i]',
    /* Row selection in views and subgrids - the per-row tick and the select-all
       in the header. Only the data-id spellings live here; the label and the
       positional rules are in isRowSelectControl(), which has to look at
       descendants as well as ancestors and so cannot be a selector. */
    '[data-id*="cell-checkbox" i]', '[data-id*="checkbox-cell" i]',
    '[data-id*="selectAll" i]', '[data-id*="SelectRow" i]',
    '[data-id*="select-row" i]', '[data-id*="rowSelect" i]',
    '[data-id*="header-checkbox" i]', '[data-id*="checkbox-header" i]'
  ];

  /* Out-of-box PRESENTATION. How Unified Interface draws a choice field, a
     subgrid or a scrolling region is Microsoft's and no form or view setting
     changes it - but the WORDS in them are still yours. So this list is
     consulted for every finding type EXCEPT the content ones (names, labels,
     alt text, column headings, link text), which stay with whoever wrote
     them. Also matched before YOURS_SELECTORS, for the same reason. */
  var OOB_PRESENTATION_SELECTORS = [
    '[data-id*="optionset" i]', '[data-id*="OptionSet" i]',
    '[data-id*="multiselect" i]', '[data-id*="MultiSelect" i]',
    '[data-id*="picklist" i]', 'select', '[role="combobox"]', '[role="listbox"]',
    '[data-id$="-subgrid"]', '[data-id*="DataSetHostContainer" i]',
    '[role="grid"]', '[role="treegrid"]',
    '[data-id*="scrollbar" i]', '[data-id*="ScrollRegion" i]',
    '[data-id*="scroll-region" i]'
  ];

  /* Chrome the platform draws and owns, even though it sits inside the
     form. Checked before the customisable containers, because a paging
     button lives inside a subgrid whose columns you do configure. */
  var PLATFORM_SELECTORS = [
    '[data-id*="notificationWrapper" i]',
    '[data-id*="form-selector" i]', '[data-id*="recordSetNavigator" i]',
    '[data-id*="paging" i]', '[data-id*="pagination" i]', '[data-id*="loading" i]',
    '[data-id*="quickFind" i]', '[data-id*="ViewSelector" i]', '[data-id*="EditableGrid" i][role="presentation"]',
    '[data-id*="columnSort" i]', '[data-id*="breadcrumb" i]', '[data-id*="TabBar" i]'
  ];

  /* Your own markup. Whatever the finding is about, if it is inside a web
     resource or a custom control then your team wrote it and owns all of it -
     the colours, the geometry, the roles, everything. */
  var YOURS_SELECTORS = [
    'iframe', '[data-id*="webresource" i]', '[data-id*="WebResource" i]',
    '[data-control-name]', '[data-lp-id*="customControl" i]', '[data-lp-id*="CustomControl" i]'
  ];

  /* Platform-rendered markup that nonetheless carries content you configured -
     a field and its label, a section, a view column, a ribbon command. The
     wrapper is Microsoft's; the words in it are yours. */
  var CONFIG_SELECTORS = [
    '[data-id$=".fieldControl"]', '[data-id$=".fieldLabel"]', '[data-id$=".fieldSectionItemContainer"]',
    '[data-id$="_section"]', '[data-id$="-section"]', 'section[data-id]',
    '[role="columnheader"]', 'th', '[role="grid"]', '[role="treegrid"]',
    '[data-id$="-subgrid"]', '[data-id*="DataSetHostContainer" i]'
  ].concat(CMD_SELECTORS);

  /* What is being reported about the element, which decides who owns it once
     the element itself has been placed.
       content - words a maker set: labels, names, alt text, column headings,
                 link text. Yours wherever the container is configurable.
       colour  - a contrast measurement. Microsoft's since 29/08/2026, unless
                 it is inside your own web resource or custom control. A scan
                 still cannot tell an environment theme from your CSS from
                 Microsoft's default palette; the assumption is that on a
                 model-driven form the platform palette is the usual cause.
       render  - geometry, focus, structure. Unified Interface draws these on
                 platform markup, so they are Microsoft's unless they are in
                 markup of yours. */
  var CONTENT_TYPES = {
    'name-missing': 1, 'img-alt-missing': 1, 'img-alt-filename': 1, 'label-in-name': 1,
    'grid-header-blank': 1, 'grid-column-schema': 1, 'grid-column-duplicate': 1,
    'link-generic': 1, 'link-raw-url': 1
  };
  var COLOUR_TYPES = {
    'contrast-text': 1, 'control-boundary-contrast': 1, 'control-no-boundary': 1,
    'state-indicator-contrast': 1, 'icon-contrast': 1, 'focus-indicator-contrast': 1
  };
  var RENDER_TYPES = {
    'target-size': 1, 'fixed-width': 1, 'text-clipped': 1, 'text-overflow': 1,
    'tabindex-positive': 1, 'not-focusable': 1, 'focus-invisible': 1,
    'heading-skip': 1, 'grid-no-headers': 1
  };

  /* Finding types whose answer never depends on the element, because the thing
     being reported is the page itself or the form definition. */
  var TYPE_CLASS = {
    /* Form definition - every one of these is a maker change. */
    'tab-label-missing': 'custom', 'tab-label-default': 'custom',
    'section-label-default': 'custom', 'field-label-missing': 'custom',
    'field-label-schema': 'custom', 'field-label-long': 'custom',
    'field-label-duplicate': 'custom', 'field-order-mismatch': 'custom',
    'multi-column-section': 'custom', 'webresource-present': 'custom',
    /* The page shell. Unified Interface writes these; a maker cannot. */
    'lang-missing': 'platform', 'lang-invalid': 'platform',
    'title-missing': 'platform', 'title-generic': 'platform', 'title-recorded': 'platform',
    'bypass-missing': 'platform', 'bypass-found': 'platform',
    'headings-none': 'platform', 'live-region-none': 'platform',
    'live-region-present': 'platform', 'autocomplete-count': 'platform',
    /* Genuinely unknown without a person. */
    'duplicate-id': 'triage', 'graphics-review': 'triage',
    'contrast-unmeasured': 'triage', 'nontext-unmeasured': 'triage',
    'contrast-env-altered': 'triage',
    'grid-sampled': 'triage'
  };

  /* Rule, set 29/08/2026: 'custom' is reserved for the things a maker can
     actually reach in the form and view designers - naming, labels, and where
     something sits. Everything else that a scan can place is Microsoft's.
     So:
       - a named out-of-box control is Microsoft's wherever it sits, and that
         is decided FIRST - see OOB_SELECTORS. A lookup's magnifying glass, an
         out-of-box command bar button, the ... flyout and a row-selection
         checkbox do not become yours by sitting inside a control of yours;
       - out-of-box PRESENTATION - how a choice field, a subgrid or a scrolling
         region is drawn - is Microsoft's for everything except the words in
         it. See OOB_PRESENTATION_SELECTORS;
       - otherwise, inside your own web resource or custom control, all of it
         is yours;
       - the platform shell and platform chrome are Microsoft's;
       - a CONTENT finding (a name, a label, alt text, a column heading, link
         text) on configurable markup is yours, because the words are yours;
       - a COLOUR finding is Microsoft's. CHANGED 29/08/2026, reversing
         the 0.5.0 rule that colour is never asserted. The trade: a scan
         cannot tell an environment theme from your
         own CSS from Microsoft's default palette, so a contrast finding caused
         by a theme your team chose will now be labelled Microsoft. Contrast
         inside your own web resource or custom control still comes back as
         yours, because YOURS_SELECTORS is matched first;
       - a RENDER finding (geometry, focus, structure, target size) is
         Microsoft's, because no form or view setting changes how Unified
         Interface draws a control;
       - anything the classifier could not place falls to Microsoft rather
         than to triage. That is a deliberate trade: fewer triage
         rows, but the tool will say Microsoft about markup it did not actually
         recognise - including a custom control that carries no data-control-name
         and no data-lp-id. 'Needs triage' is now left only for findings with
         no element to look at, duplicate ids, graphics, and checks that could
         not be run at all. */
  /* The tick that selects a record in a view or a subgrid. Microsoft draws it,
     Microsoft names it, and there is no form or view setting that reaches it -
     so it is never yours, whatever it sits inside. It matters that this is
     decided here rather than by CONTENT_TYPES: a missing accessible name on
     one of these is a content finding, and a grid row matches
     CONFIG_SELECTORS via [role="grid"], so without this rule the row tick came
     back as Customisable work for the team.
     Named instances are already in OOB_SELECTORS. This catches the unnamed
     ones by POSITION: a checkbox or switch with no text of its own, sitting in
     the first cell of a grid row or in a column header. A two-option field in
     an editable grid is not caught, because it carries its column's text and
     does not sit in the selection column. */
  /* The words Unified Interface puts on a selection control. Matched against
     the element's own label, its nearest labelled ancestor AND its labelled
     descendants - which is the whole reason this is a function and not another
     entry in OOB_SELECTORS. matchesAny() is closest(), so it only ever looks
     upwards, and the shape that got past 0.6.1 was a header cell whose label
     sits on a child: the finding lands on the cell, the label is below it, and
     nothing matched. */
  var ROW_SELECT_LABEL = /toggle selection|select(?:ion)?\s+(?:of\s+)?all\s+rows|deselect\s+all\s+rows|select\s+or\s+deselect|select(?:\s+(?:this|the))?\s+row|row\s+(?:selection|checkbox)|press\s+space\s+to\s+select/i;
  var GRID_HOSTS = '[role="grid"],[role="treegrid"],table,[data-id$="-subgrid"],[data-id*="DataSetHostContainer" i]';
  var CHECKBOXISH = '[role="checkbox"],[role="switch"],input[type="checkbox"],input[type="radio"],[data-id*="checkbox" i]';

  /* Every label in play for this element: its own, the nearest one above it,
     and the first few below it. Capped because a grid cell can contain a lot
     of markup and this runs once per finding. */
  function labelsAround(el) {
    var out = [];
    function push(v) { if (v) out.push(v); }
    push(el.getAttribute && el.getAttribute('aria-label'));
    push(el.getAttribute && el.getAttribute('title'));
    var up = el.closest('[aria-label],[title]');
    if (up && up !== el) { push(up.getAttribute('aria-label')); push(up.getAttribute('title')); }
    var down = el.querySelectorAll ? el.querySelectorAll('[aria-label],[title]') : [];
    for (var i = 0; i < down.length && i < 8; i++) {
      push(down[i].getAttribute('aria-label')); push(down[i].getAttribute('title'));
    }
    return out;
  }

  function isRowSelectControl(el) {
    if (!el || !el.closest) return false;
    /* Only ever inside a grid. Without this the label rule would claim a
       button of yours that happens to be called "Select all rows". */
    if (!el.closest(GRID_HOSTS)) return false;
    /* 1. By label. The most stable thing about these controls is that
       Microsoft names them, and it names them the same way everywhere. */
    var labels = labelsAround(el);
    for (var i = 0; i < labels.length; i++) {
      if (ROW_SELECT_LABEL.test(labels[i])) return true;
    }
    /* 2. By position, for the ones with no label at all. Deliberately does
       NOT require a role on the element itself: the tick is drawn as a plain
       div in some builds, so the test is that the CELL holds something
       checkbox-shaped and carries no words of its own. */
    var cell = el.closest('[role="gridcell"],[role="rowheader"],[role="columnheader"],td,th');
    if (!cell) return false;
    var row = cell.closest('[role="row"],tr');
    if (!row) return false;
    /* Select-all lives in the header; the per-row tick is the leading cell. */
    if (!cell.matches('[role="columnheader"],th') && cell !== row.firstElementChild) return false;
    if (!cell.matches(CHECKBOXISH) && !cell.querySelector(CHECKBOXISH)) return false;
    /* A selection control carries no words of its own - anything with a
       visible caption is a field, not the row tick. */
    return visText(cell).length === 0;
  }

  function domClass(type, el) {
    if (!el || !el.closest) return 'triage';
    if (isRowSelectControl(el)) return 'platform';
    if (matchesAny(el, OOB_SELECTORS)) return 'platform';
    if (!CONTENT_TYPES[type] && matchesAny(el, OOB_PRESENTATION_SELECTORS)) return 'platform';
    if (matchesAny(el, YOURS_SELECTORS)) return 'custom';
    if (isShell(el)) return 'platform';
    if (matchesAny(el, PLATFORM_SELECTORS)) return 'platform';
    if (COLOUR_TYPES[type]) return 'platform';
    if (CONTENT_TYPES[type]) return matchesAny(el, CONFIG_SELECTORS) ? 'custom' : 'platform';
    if (RENDER_TYPES[type]) return 'platform';
    return 'triage';
  }

  function classify(type, el) {
    if (TYPE_CLASS[type]) return TYPE_CLASS[type];
    return domClass(type, el);
  }


  var CLASS_LABEL = {
    custom: 'Customisable', platform: 'Microsoft', triage: 'Needs triage', mixed: 'Mixed'
  };
  var CLASS_LONG = {
    custom: 'Naming, a missing label, or where something sits on a form or view - or markup inside your own web resource or custom control. Your team might be able to change this. Confirm it is reachable in the form or view designer before logging it.',
    platform: 'Rendered by Unified Interface. Configuration will not change it - raise it with Microsoft and record it in the accessibility statement.',
    triage: 'Nothing in the markup said which side of the line this sits on. Someone has to look at it.'
  };
  var CLASS_FILTERS = [
    ['all', 'All components'],
    ['custom', 'Customisable only'],
    ['platform', 'Microsoft only'],
    ['triage', 'Needs triage only']
  ];

  /* Human-readable identity for an element, for the failing-elements list.
     label  - what a person would call it
     schema - the Dataverse logical name plus a compact selector */
  function describeEl(el) {
    if (!el || el.nodeType !== 1) return { label: '', schema: '' };
    var tag = el.tagName.toLowerCase();
    var logical = '';
    var host = el.closest ? el.closest('[data-id]') : null;
    var did = host ? (attr(host, 'data-id') || '') : '';
    var m = /^(.+?)\.(fieldControl|fieldLabel|fieldSectionItemContainer)/.exec(did);
    if (m) logical = m[1];
    else if (/^[a-z0-9]+_[a-z0-9_]+$/i.test(did)) logical = did;

    var sel = tag;
    if (el.id) sel += '#' + el.id;
    else if (attr(el, 'role')) sel += '[role=' + attr(el, 'role') + ']';
    else if (attr(el, 'data-id')) sel += '[data-id=' + attr(el, 'data-id') + ']';

    var label = accName(el) || txt(el).slice(0, 60);
    if (!label && logical) label = logical;
    if (!label) label = '<' + tag + '>';
    return { label: label, schema: (logical ? logical + ' · ' : '') + sel };
  }

  /* Ignore anything inside our own panel. */
  function inTool(el) {
    return !!(el && el.closest && el.closest('#' + HOST_ID));
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    if (inTool(el)) return false;
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    /* Visually-hidden patterns. These are exposed to assistive technology but
       have no visual presentation, so contrast, target size and reflow have
       nothing to measure on them. */
    if (r.right < -1000 || r.bottom < -1000) return false;
    if (/rect\(0px(,| ) *0px/.test(cs.clip || '')) return false;
    if ((cs.clipPath || '').indexOf('inset(50%') === 0) return false;
    if (r.width <= 1 && r.height <= 1 && cs.overflow === 'hidden') return false;
    return true;
  }

  /* Text a sighted user actually sees. An aria-hidden subtree contributes
     nothing to the accessible name, and textContent counts it anyway, which
     used to make an icon-only <button><span aria-hidden="true">glyph</span>
     look named - the exact shape of a D365 command bar button. */
  function visText(el) {
    if (!el) return '';
    var out = '';
    (function walk(node) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { out += n.nodeValue; continue; }
        if (n.nodeType !== 1) continue;
        if (n.getAttribute('aria-hidden') === 'true') continue;
        if (n.hasAttribute('hidden')) continue;
        walk(n);
      }
    })(el);
    return out.replace(/\s+/g, ' ').trim();
  }

  /* Pragmatic subset of the accessible name computation.
     Covers aria-labelledby, aria-label, native labels, alt, value, content, title.
     It is NOT the full W3C accname algorithm. Treat results as indicative. */
  function accName(el) {
    if (!el) return '';
    var lb = attr(el, 'aria-labelledby');
    if (lb) {
      var parts = lb.split(/\s+/).map(function (id) {
        var t = document.getElementById(id); return t ? txt(t) : '';
      }).filter(Boolean);
      if (parts.length) return parts.join(' ');
    }
    var al = attr(el, 'aria-label');
    if (al && al.trim()) return al.trim();

    var tag = el.tagName.toLowerCase();
    if (el.id) {
      var lab = null;
      try { lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); } catch (e) {}
      if (lab && visText(lab)) return visText(lab);
    }
    var wrap = el.closest ? el.closest('label') : null;
    if (wrap && visText(wrap)) return visText(wrap);

    if (tag === 'img') { var a = attr(el, 'alt'); if (a !== null) return a.trim(); }
    if (tag === 'input') {
      var type = (attr(el, 'type') || 'text').toLowerCase();
      if (type === 'button' || type === 'submit' || type === 'reset') return (el.value || '').trim();
    }
    if (tag === 'svg') {
      var title = el.querySelector('title');
      if (title) return txt(title);
    }
    if (tag === 'button' || tag === 'a' || attr(el, 'role')) {
      var t = visText(el);
      if (t) return t;
    }
    var ti = attr(el, 'title');
    if (ti && ti.trim()) return ti.trim();
    return '';
  }

  var INTERACTIVE = 'a[href],button,input,select,textarea,summary,[tabindex],' +
    '[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="combobox"],' +
    '[role="switch"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],' +
    '[role="option"],[role="treeitem"],[role="slider"],[role="spinbutton"]';

  /* Roving tabindex containers: every item but one carries tabindex="-1"
     and is still a real control the user reaches with the arrow keys. D365
     command bars, menus and grids all use the pattern, so excluding
     tabindex="-1" wholesale left most of a command bar unchecked. */
  var ROVING = '[role="toolbar"],[role="menubar"],[role="menu"],[role="tablist"],' +
    '[role="grid"],[role="treegrid"],[role="listbox"],[role="tree"],[role="radiogroup"]';

  function interactives(root) {
    var out = [];
    (root || document).querySelectorAll(INTERACTIVE).forEach(function (el) {
      if (attr(el, 'tabindex') === '-1' && !el.matches('a[href],button,input,select,textarea') &&
          !(el.closest && el.closest(ROVING))) return;
      if (el.disabled) return;
      if (!isVisible(el)) return;
      out.push(el);
    });
    return out;
  }

  /* Colour helpers ---------------------------------------------------- */
  function parseColour(str) {
    var m = /rgba?\(([^)]+)\)/.exec(str || '');
    if (!m) return null;
    var p = m[1].split(/[,\s\/]+/).filter(Boolean).map(function (x) { return parseFloat(x); });
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && !isNaN(p[3]) ? p[3] : 1 };
  }
  function toHex(c) {
    function h(n) { var s = Math.round(n).toString(16); return s.length < 2 ? '0' + s : s; }
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }
  function lum(c) {
    var v = [c.r, c.g, c.b].map(function (x) {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function blend(fg, bg) {
    return {
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1
    };
  }
  /* Walks ancestors for an opaque background. Returns null when it cannot
     be resolved (background image, gradient, or transparent to the root). */
  function effectiveBg(el) {
    var stack = [], node = el;
    while (node && node.nodeType === 1) {
      var cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      var c = parseColour(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; }
      node = node.parentElement;
    }
    if (!stack.length) return null;
    var last = stack[stack.length - 1];
    if (last.a !== 1) return null;
    var result = last;
    for (var i = stack.length - 2; i >= 0; i--) result = blend(stack[i], result);
    return result;
  }


  /* ------------------------------------------------------------------ */
  /* 4. Context discovery - Xrm Client API                              */
  /* ------------------------------------------------------------------ */

  function findXrm() {
    if (window.Xrm && window.Xrm.Utility) return window.Xrm;
    try { if (top.Xrm && top.Xrm.Utility) return top.Xrm; } catch (e) {}
    for (var i = 0; i < window.frames.length; i++) {
      try {
        if (window.frames[i].Xrm && window.frames[i].Xrm.Utility) return window.frames[i].Xrm;
      } catch (e) { /* cross-origin */ }
    }
    return null;
  }

  /* Markers that say a Dynamics 365 app is on this page. The app shell rather
     than the form, because a view, a dashboard and a form all sit inside it.
     [data-lp-id] is the Unified Interface control attribute and catches a page
     whose shell ids Microsoft has renamed again. */
  var D365_MARKERS = [
    '[data-id="shell-container"]', '[data-id="navbar-container"]', '[data-id="topBar"]',
    '[data-id="site-map"]', '[data-id="navbar-collapse-button"]', '[data-id="appLauncher"]',
    '[data-id="officeWaffle"]', '[data-id="mectrl_main_trigger"]', '[data-lp-id]'
  ];

  /* Is this a Dynamics 365 page at all? (1.5.0)
     Every DOM check in here works on any web page, so run somewhere else the
     tool would still produce numbers - and it would present them as a WCAG
     position on a model-driven app, which is worse than no answer. So the scan
     is gated, on load and on every Refresh.
     Either signal is enough:
       - the Xrm Client API is reachable. findXrm() walks to the top window and
         through same-origin frames, so this is true from inside a web resource
         as well as from the app itself;
       - the Unified Interface shell markup is on the page, which covers Xrm
         being slow to appear or out of reach.
     The hostname is deliberately NOT a signal. It says nothing about whether
     the app is loaded, it would have to be maintained for every sovereign
     cloud, and the fixtures run from file://. */
  var pageIsD365 = true;

  function detectD365() {
    if (Xrm) return true;
    for (var i = 0; i < D365_MARKERS.length; i++) {
      var hit = safe(function () { return document.querySelector(D365_MARKERS[i]); }, 'D365 marker');
      if (hit) return true;
    }
    return false;
  }

  var Xrm = null;
  var pageType = 'unknown', entityName = '', formContext = null;
  var userName = '', userInitials = '', orgHost = location.hostname;
  var entityDisplay = '';

  /* Unified Interface hangs screen-reader-only instructions off the same
     heading element it puts the page name in, and icon fonts leave private-use
     characters behind. Reading the h1 with textContent therefore produced
     "Active Enquiries - DAOOpen popup to change view." with a box glyph on the
     end - seen 29/08/2026 on a view page.
     visText() does not help: the instruction is not aria-hidden, it is there
     FOR a screen reader. So the phrases are named and stripped. */
  var UI_INSTRUCTIONS = /\s*(open popup to change view|press (?:enter|space)[^.]*|select to (?:open|change)[^.]*|change view|sort(?:ed)? (?:by|ascending|descending)[^.]*)\.?\s*$/i;
  var GLYPHS = /[\uE000-\uF8FF\uFFFC\uFFFD]/g;

  function cleanHeading(t) {
    if (!t) return '';
    var out = String(t).replace(GLYPHS, '').replace(/\s+/g, ' ').trim();
    /* Applied repeatedly - a view heading can carry both the popup
       instruction and a sort instruction. Bounded so a pathological string
       cannot loop. */
    for (var i = 0; i < 4; i++) {
      var next = out.replace(UI_INSTRUCTIONS, '').trim();
      if (next === out) break;
      out = next;
    }
    return out;
  }

  /* Everything about WHERE WE ARE, re-read on every scan. The panel stays open
     while the user navigates the app, so a heading, entity or form context
     captured once at load goes stale the moment they open a record. Refresh
     calls runScan(), runScan() calls this first. */
  function readContext() {
    Xrm = findXrm();
    pageIsD365 = detectD365();
    pageType = 'unknown'; entityName = ''; formContext = null;

    if (Xrm) {
      safe(function () {
        var ctx = Xrm.Utility.getPageContext();
        if (ctx && ctx.input) {
          pageType = ctx.input.pageType || 'unknown';
          entityName = ctx.input.entityName || '';
        }
      }, 'page context');
      /* Xrm.Page is deprecated but remains the only route to a form context
         from outside a registered form script. */
      safe(function () {
        if (pageType === 'entityrecord' && Xrm.Page && Xrm.Page.ui) formContext = Xrm.Page;
      }, 'form context');
      safe(function () {
        var g = Xrm.Utility.getGlobalContext();
        if (g && g.userSettings && g.userSettings.userName) userName = g.userSettings.userName;
        if (g && g.getClientUrl) {
          var u = g.getClientUrl();
          if (u) orgHost = u.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        }
      }, 'global context');
    } else if (pageIsD365) {
      /* Only worth saying on a page the tool is going to scan. Off a Dynamics
         page the panel says something much more direct. */
      notes.push('Xrm Client API was not reachable. Metadata checks were skipped and only DOM checks ran. Open the tool from the top window of a model-driven app.');
    }

    /* Fall back to the shell for a display name if the Client API is out of reach. */
    if (!userName) {
      safe(function () {
        var me = document.querySelector('[data-id="mectrl_headerPicture"],#mectrl_headerPicture,[aria-label^="Account manager" i]');
        var t = me ? (attr(me, 'aria-label') || attr(me, 'title') || '') : '';
        var m = /for ([^,]+)/i.exec(t);
        if (m) userName = m[1].trim();
      }, 'user name from shell');
    }
    userInitials = (userName || '')
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w[0].toUpperCase(); }).join('') || '··';

    /* The name of the record or view the panel is reporting on. Tried in the
       order that gives the most specific answer first, and each candidate is
       cleaned before it is accepted, because an h1 that is nothing BUT an
       instruction should fall through rather than become the heading. */
    entityDisplay = (function () {
      var sels = [
        '[data-id="form_header_title"]', '[data-id$="header_title"]',
        '[data-id="entity_header_title"]', '[data-id="ViewSelector"] [role="heading"]',
        'h1'
      ];
      for (var i = 0; i < sels.length; i++) {
        var el = safe(function () { return document.querySelector(sels[i]); }, 'heading lookup');
        if (!el) continue;
        /* Prefer the element's own first line of text over everything nested
           inside it - on a view selector the name is the first child and the
           instruction is a later sibling. */
        var c = cleanHeading(txt(el.firstElementChild || el)) || cleanHeading(txt(el));
        if (c) return c;
      }
      return cleanHeading(document.title) || entityName || 'Current page';
    })();
  }

  readContext();


  /* ------------------------------------------------------------------ */
  /* 5. Checks - Client API (form metadata)                             */
  /*    These enumerate every tab, section and control including ones    */
  /*    not currently rendered, which DOM-only tooling cannot do.        */
  /* ------------------------------------------------------------------ */

  var DEFAULT_LABEL = /^(new_|cr[0-9a-z]{3}_|tab[\s_]*\d*$|section[\s_]*\d*$|untitled|text field|field\s*\d*$|column\s*\d*$|general\s*$)/i;

  /* Client API findings have no element of their own - the control may not
     even be rendered, because inactive tabs are not in the DOM. Where it IS
     rendered, resolve it so Locate works instead of the row being a dead end. */
  function domForControl(name) {
    if (!name || !/^[A-Za-z0-9_]+$/.test(name)) return null;
    var el = document.querySelector('[data-id="' + name + '.fieldControl"]') ||
      document.querySelector('[data-id="' + name + '.fieldSectionItemContainer"]') ||
      document.querySelector('[data-id^="' + name + '."]');
    return el && isVisible(el) ? el : null;
  }

  function checkFormMetadata() {
    if (!formContext) return;
    markRan('1.3.1', '2.4.6', '3.3.2', '4.1.2', '1.3.2', '2.4.3');

    var labels = {};
    var declared = [];

    formContext.ui.tabs.forEach(function (tab) {
      var tLabel = safe(function () { return tab.getLabel(); }, 'tab label') || '';
      var tName = safe(function () { return tab.getName(); }, 'tab name') || '';
      if (!tLabel.trim()) {
        add('2.4.6', 'fail', 'tab-label-missing', 'Tab has no label', null,
          'Tab "' + tName + '" has an empty label. Every tab needs a name that describes what it contains.', 'yours',
          { label: tName || 'Unnamed tab', schema: 'tab · ' + tName, evidence: 'label empty', region: 'form' });
      } else if (DEFAULT_LABEL.test(tLabel.trim())) {
        add('2.4.6', 'review', 'tab-label-default', 'Tab label looks like a designer default', null,
          'Tab labelled "' + tLabel + '". Check this describes the content rather than being left at the designer default.', 'yours',
          { label: tLabel, schema: 'tab · ' + tName, evidence: 'matches default pattern', region: 'form' });
      }

      tab.sections.forEach(function (sec) {
        var sLabel = safe(function () { return sec.getLabel(); }, 'section label') || '';
        var sName = safe(function () { return sec.getName(); }, 'section name') || '';
        var shown = safe(function () { return sec.getVisible(); }, 'section visible');
        if (shown === false) return;

        if (sLabel.trim() && DEFAULT_LABEL.test(sLabel.trim())) {
          add('2.4.6', 'review', 'section-label-default', 'Section label looks like a designer default', null,
            'Section labelled "' + sLabel + '" on tab "' + tLabel + '". Check this is meaningful, or turn the label off if it adds nothing.', 'yours',
            { label: sLabel, schema: 'section · ' + sName, evidence: 'on tab "' + tLabel + '"', region: 'form' });
        }

        sec.controls.forEach(function (ctrl) {
          var cLabel = safe(function () { return ctrl.getLabel(); }, 'control label') || '';
          var cName = safe(function () { return ctrl.getName(); }, 'control name') || '';
          var vis = safe(function () { return ctrl.getVisible(); }, 'control visible');
          if (vis === false) return;
          var type = safe(function () { return ctrl.getControlType(); }, 'control type') || '';
          if (type === 'subgrid' || type === 'iframe' || type === 'webresource' || type === 'timercontrol') {
            if (type === 'iframe' || type === 'webresource') {
              add('4.1.2', 'review', 'webresource-present', 'Form contains a web resource or IFRAME', domForControl(cName),
                'Control "' + cName + '" is a ' + type + '. Content inside it is outside this tool\'s scope and outside a standard-forms conformance claim. Test it separately.', 'yours',
                { label: cLabel || cName, schema: cName + ' · ' + type, evidence: 'not scannable from here', region: 'form' });
            }
            return;
          }

          declared.push({ name: cName, label: cLabel, tab: tLabel, section: sLabel });

          if (!cLabel.trim()) {
            add('3.3.2', 'fail', 'field-label-missing', 'Field has no label', domForControl(cName),
              'Control "' + cName + '" on tab "' + tLabel + '" has an empty label. Every input needs a label.', 'yours',
              { label: cName, schema: cName + ' · control', evidence: 'label empty', region: 'form' });
          } else {
            var key = cLabel.trim().toLowerCase();
            (labels[key] = labels[key] || []).push({ name: cName, tab: tLabel, section: sLabel, label: cLabel });

            if (DEFAULT_LABEL.test(cLabel.trim()) || /_/.test(cLabel)) {
              add('2.4.6', 'fail', 'field-label-schema', 'Field label looks like a schema name or designer default', domForControl(cName),
                'Control "' + cName + '" is labelled "' + cLabel + '". Labels must be business language, not schema names.', 'yours',
                { label: cLabel, schema: cName + ' · control', evidence: 'on tab "' + tLabel + '"', region: 'form' });
            }
            if (cLabel.trim().length > 45) {
              add('1.4.12', 'review', 'field-label-long', 'Field label is very long', domForControl(cName),
                '"' + cLabel.slice(0, 60) + '..." is ' + cLabel.length + ' characters. Long labels truncate under text spacing overrides and at 200% zoom. Move the detail into the field description.', 'yours',
                { label: cLabel.slice(0, 50), schema: cName + ' · control', evidence: cLabel.length + ' characters', region: 'form' });
            }
          }
        });
      });
    });

    Object.keys(labels).forEach(function (k) {
      if (labels[k].length > 1) {
        var list = labels[k];
        add('2.4.6', 'fail', 'field-label-duplicate', 'Duplicate field label on the same form', domForControl(list[0].name),
          list.length + ' visible controls share the label "' + list[0].label + '": ' +
          list.map(function (x) { return x.name + ' (' + x.tab + ' / ' + x.section + ')'; }).join(', ') +
          '. A screen reader user cannot tell them apart.', 'yours',
          { label: list[0].label, schema: list.map(function (x) { return x.name; }).join(', '), evidence: list.length + ' controls share it', region: 'form' });
      }
    });

    /* Compare declared form order against rendered DOM order. */
    safe(function () {
      var domOrder = [], seen = {};
      document.querySelectorAll('[data-id]').forEach(function (el) {
        var id = attr(el, 'data-id') || '';
        var m = /^(.+?)\.fieldControl/.exec(id);
        if (m && !seen[m[1]] && isVisible(el)) { seen[m[1]] = 1; domOrder.push(m[1]); }
      });
      var declaredNames = declared.map(function (d) { return d.name; }).filter(function (n) { return seen[n]; });
      var rendered = domOrder.filter(function (n) { return declaredNames.indexOf(n) > -1; });
      for (var i = 0; i < Math.min(declaredNames.length, rendered.length); i++) {
        if (declaredNames[i] !== rendered[i]) {
          add('2.4.3', 'review', 'field-order-mismatch', 'Rendered field order differs from the declared form order', null,
            'First difference at position ' + (i + 1) + ': the form declares "' + declaredNames[i] +
            '" but the page renders "' + rendered[i] + '". Tab through the form and confirm the order still matches the data entry task.', 'yours',
            { label: 'Position ' + (i + 1), schema: declaredNames[i] + ' → ' + rendered[i], evidence: 'declared vs rendered', region: 'form' });
          break;
        }
      }
    }, 'field order');
  }

  /* Multi-column sections: detect controls sharing a horizontal row.
     Unified Interface reads these column by column, not across. */
  function checkMultiColumn() {
    markRan('1.3.2');
    var sections = document.querySelectorAll('section[data-id], [data-id$="_section"]');
    var flagged = 0, moreSections = 0;
    sections.forEach(function (sec) {
      if (!isVisible(sec) || inTool(sec)) return;
      var fields = [].slice.call(sec.querySelectorAll('[data-id$=".fieldControl"]')).filter(isVisible);
      if (fields.length < 2) return;
      var rows = {};
      fields.forEach(function (f) {
        var top = Math.round(f.getBoundingClientRect().top / 10) * 10;
        (rows[top] = rows[top] || []).push(f);
      });
      var multi = Object.keys(rows).filter(function (k) { return rows[k].length > 1; });
      if (!multi.length) return;
      if (flagged >= 8) { moreSections++; return; }
      flagged++;
      add('1.3.2', 'review', 'multi-column-section', 'Multi-column section detected', sec,
        'This section places ' + multi.length + ' row(s) of fields side by side. Unified Interface reads multi-column sections column by column, top to bottom, not across rows. Confirm each column reads coherently on its own, and that related fields such as a date range are not split across columns.', 'yours',
        { evidence: multi.length + ' side-by-side rows' });
    });
    capped('Multi-column sections', flagged, moreSections);
  }


  /* ------------------------------------------------------------------ */
  /* 6. Checks - DOM and ARIA                                           */
  /* ------------------------------------------------------------------ */

  function checkLang() {
    markRan('3.1.1');
    var l = attr(document.documentElement, 'lang');
    if (!l || !l.trim()) {
      add('3.1.1', 'fail', 'lang-missing', 'The page has no lang attribute', document.documentElement,
        'Screen readers cannot determine the language and may use the wrong pronunciation rules.', 'platform',
        { label: 'Document root', schema: 'html', evidence: 'lang absent' });
    } else if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(l.trim())) {
      add('3.1.1', 'fail', 'lang-invalid', 'The lang attribute is not a valid language tag', document.documentElement,
        'Found lang="' + l + '".', 'platform',
        { label: 'Document root', schema: 'html', evidence: 'lang="' + l + '"' });
    }
  }

  function checkTitle() {
    markRan('2.4.2');
    var t = (document.title || '').trim();
    if (!t) {
      add('2.4.2', 'fail', 'title-missing', 'The page has no title', null,
        'document.title is empty.', 'platform',
        { label: 'Page title', schema: 'document.title', evidence: 'empty' });
    } else if (/^(untitled|home|page|dynamics 365|power apps)$/i.test(t)) {
      add('2.4.2', 'fail', 'title-generic', 'The page title is generic', null,
        'Title is "' + t + '". It must identify this record or view.', 'yours',
        { label: 'Page title', schema: 'document.title', evidence: '"' + t + '"' });
    } else {
      add('2.4.2', 'info', 'title-recorded', 'Page title recorded for review', null,
        'Title is "' + t + '". Confirm it distinguishes this record from every other record. If your primary name column is an opaque auto-number, the title will be technically valid but useless.', 'yours',
        { label: 'Page title', schema: 'document.title', evidence: '"' + t.slice(0, 60) + '"' });
    }
  }

  function checkAccessibleNames() {
    markRan('4.1.2', '1.1.1');
    var els = interactives(document), missing = 0, moreNames = 0;
    els.forEach(function (el) {
      if (accName(el)) return;
      if (missing >= 40) { moreNames++; return; }
      missing++;
      add('4.1.2', 'fail', 'name-missing', 'Interactive element has no accessible name', el,
        '<' + el.tagName.toLowerCase() + (attr(el, 'role') ? ' role="' + attr(el, 'role') + '"' : '') +
        '> exposes no name to assistive technology. A screen reader announces only its role.', ownerOf(el),
        { evidence: 'no aria-label, no label, no text' });
    });
    capped('Accessible names', missing, moreNames);

    var imgs = 0, moreImgs = 0;
    document.querySelectorAll('img').forEach(function (img) {
      if (!isVisible(img) || inTool(img)) return;
      var alt = attr(img, 'alt');
      var src = (img.currentSrc || img.src || '');
      var file = src.split('/').pop().split('?')[0];
      if (alt === null && attr(img, 'role') !== 'presentation' && attr(img, 'aria-hidden') !== 'true') {
        if (imgs >= 15) { moreImgs++; return; }
        imgs++;
        add('1.1.1', 'fail', 'img-alt-missing', 'Image has no alt attribute', img,
          'src="' + src.slice(-60) + '". Add descriptive alt text, or alt="" if it is decorative.', ownerOf(img),
          { label: file || 'image', schema: 'img', evidence: 'alt attribute absent' });
      } else if (alt && file && (alt.trim() === file || alt.trim() === file.replace(/\.[a-z0-9]+$/i, ''))) {
        if (imgs >= 15) { moreImgs++; return; }
        imgs++;
        add('1.1.1', 'review', 'img-alt-filename', 'Alt text repeats the file name', img,
          'alt="' + alt + '" is the file name rather than a description. Confirm whether the image is decorative or meaningful.', ownerOf(img),
          { label: file, schema: 'img', evidence: 'alt = file name' });
      }
    });
    capped('Images', imgs, moreImgs);
  }

  function checkLabelInName() {
    markRan('2.5.3');
    var count = 0, more = 0;
    interactives(document).forEach(function (el) {
      var visible = visText(el);
      if (!visible || visible.length > 60) return;
      var name = accName(el);
      if (!name) return;
      var v = visible.toLowerCase().replace(/[^\w\s]/g, '').trim();
      var n = name.toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (!v) return;
      if (n.indexOf(v) === -1) {
        if (count >= 20) { more++; return; }
        count++;
        add('2.5.3', 'fail', 'label-in-name', 'Visible label is not contained in the accessible name', el,
          'Shows "' + visible + '" but announces as "' + name + '". A speech recognition user saying "click ' + visible + '" will not activate this control.', ownerOf(el),
          { label: visible, evidence: 'announces "' + name.slice(0, 40) + '"' });
      }
    });
    capped('Label in name', count, more);
  }

  function checkContrast() {
    if (renderAltered.altered) { contrastEnvFinding('1.4.3'); return; }
    markRan('1.4.3');
    var checked = 0, failed = 0, unresolved = 0;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || inTool(p) || !isVisible(p)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node, seen = {}, moreFails = 0, hitNodeCap = false;
    while ((node = walker.nextNode())) {
      if (checked >= 600) { hitNodeCap = true; break; }
      var p = node.parentElement;
      var cs = getComputedStyle(p);
      var fg = parseColour(cs.color);
      if (!fg) continue;
      var bg = effectiveBg(p);
      checked++;
      if (!bg) { unresolved++; continue; }
      if (fg.a < 1) fg = blend(fg, bg);
      var size = parseFloat(cs.fontSize) || 16;
      var weight = parseInt(cs.fontWeight, 10) || 400;
      var large = size >= 24 || (size >= 18.66 && weight >= 700);
      var need = large ? 3 : 4.5;
      var r = ratio(fg, bg);
      if (r < need - 0.05) {
        var key = cs.color + '|' + Math.round(r * 100) + '|' + p.tagName;
        if (seen[key]) continue;
        seen[key] = 1;
        if (failed >= 25) { moreFails++; continue; }
        failed++;
        add('1.4.3', 'fail', 'contrast-text',
          'Text contrast is ' + r.toFixed(2) + ':1, below the required ' + need + ':1', p,
          '"' + node.nodeValue.trim().slice(0, 60) + '" at ' + size.toFixed(0) + 'px weight ' + weight +
          '. Foreground ' + toHex(fg) + ' on background ' + toHex(bg) + '.', ownerOf(p),
          { label: node.nodeValue.trim().slice(0, 45), evidence: toHex(fg) + ' on ' + toHex(bg) + ' · ' + r.toFixed(2) + ':1' });
      }
    }
    capped('Text contrast', failed, moreFails, 'Distinct colour and size combinations only; each one usually stands for many elements.');
    if (hitNodeCap) {
      notes.push('Text contrast: stopped after 600 text nodes. Text further down the page was not measured. ' +
        'Scroll or collapse sections and re-run to cover the rest.');
    }
    if (unresolved) {
      add('1.4.3', 'info', 'contrast-unmeasured', unresolved + ' text nodes could not be measured', null,
        'Their background is an image, a gradient, or resolves to transparent. Sample these manually with a contrast analyser. Canvas-rendered charts cannot be measured at all.', 'unknown',
        { label: unresolved + ' text nodes', schema: 'various', evidence: 'background not resolvable' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 1.4.11 Non-text Contrast                                            */
  /*                                                                     */
  /* What the criterion asks, and what this does about it:               */
  /* - The visual information needed to identify a control and its state */
  /*   must reach 3:1 against the colours adjacent to it.                */
  /* - A control carrying visible text or a contrasting icon does not    */
  /*   need a boundary at all, so an unbordered text button is NOT a     */
  /*   failure. An empty text field has nothing but its boundary, so     */
  /*   there the boundary is the requirement. This distinction is the    */
  /*   whole reason the check is not just "measure every border".        */
  /* - Inactive controls are exempt, and so is anything left at the user */
  /*   agent's own appearance.                                           */
  /* - Focus indicators are in scope but can only be measured with the   */
  /*   control focused, so that part runs in deep mode.                  */
  /* - Graphical objects are only in scope where they are required to    */
  /*   understand the content, which no tool can decide. Those are       */
  /*   counted and handed back as a review item.                         */
  /* ------------------------------------------------------------------ */

  /* Fields that are empty until someone types in them. Their boundary is
     the only thing that says a control is there. */
  function needsBoundary(el) {
    var tag = el.tagName.toLowerCase();
    var role = (attr(el, 'role') || '').toLowerCase();
    if (tag === 'textarea' || tag === 'select') return true;
    if (tag === 'input') {
      var t = (attr(el, 'type') || 'text').toLowerCase();
      return ['text', 'email', 'tel', 'url', 'search', 'number', 'password',
        'date', 'datetime-local', 'time', 'month', 'week'].indexOf(t) > -1;
    }
    return ['combobox', 'textbox', 'searchbox', 'spinbutton', 'listbox'].indexOf(role) > -1;
  }

  /* Controls whose own box carries the state - checked, selected, on. */
  function isStateControl(el) {
    var role = (attr(el, 'role') || '').toLowerCase();
    if (['checkbox', 'radio', 'switch'].indexOf(role) > -1) return true;
    if (el.tagName.toLowerCase() !== 'input') return false;
    var t = (attr(el, 'type') || '').toLowerCase();
    return t === 'checkbox' || t === 'radio';
  }

  /* Anything a sighted user can see inside the control. An aria-hidden glyph
     is not an accessible name but it IS a visual identifier, so unlike
     accName this counts it. */
  function hasVisibleContent(el) {
    if (txt(el)) return true;
    return !!el.querySelector('svg,img,canvas,picture');
  }

  /* The best contrast the control's own edge manages against the surface
     behind it: any visible border side, its fill, its outline, or the first
     colour of a box-shadow, which is the whole boundary on a lot of modern
     controls. Best rather than worst, because one sufficient boundary is
     enough to identify the control. */
  function boundaryRatio(el, outside) {
    var cs = getComputedStyle(el);
    var best = 0, sample = null, uaDefault = false;
    function consider(c) {
      if (!c || c.a === 0) return;
      var col = c.a < 1 ? blend(c, outside) : c;
      var r = ratio(col, outside);
      if (r > best) { best = r; sample = col; }
    }
    ['Top', 'Right', 'Bottom', 'Left'].forEach(function (side) {
      var w = parseFloat(cs['border' + side + 'Width']) || 0;
      var st = cs['border' + side + 'Style'];
      if (!w || st === 'none' || st === 'hidden') return;
      /* Chromium draws its own inset border on an unstyled input. An author
         who has not touched it is exempt under the user agent exception. */
      if (st === 'inset' || st === 'outset') uaDefault = true;
      consider(parseColour(cs['border' + side + 'Color']));
    });
    consider(parseColour(cs.backgroundColor));
    if ((parseFloat(cs.outlineWidth) || 0) > 0 && cs.outlineStyle !== 'none') {
      consider(parseColour(cs.outlineColor));
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') consider(parseColour(cs.boxShadow));
    return { ratio: best, colour: sample, uaDefault: uaDefault };
  }

  function checkNonTextContrast() {
    markRan('1.4.11');
    /* The graphics count below is a human-judgement prompt, not a measurement,
       so it still runs. Everything that computes a ratio does not. */
    if (renderAltered.altered) contrastEnvFinding('1.4.11');
    var els = interactives(document).filter(function (el) { return !isShell(el); });
    var count = 0, more = 0, unresolved = 0, inactive = 0, uaDefault = 0;
    var icons = 0, moreIcons = 0;

    els.forEach(function (el) {
      if (renderAltered.altered) return;
      /* Inactive components are explicitly exempt. */
      if (el.disabled || attr(el, 'aria-disabled') === 'true') { inactive++; return; }

      var outside = effectiveBg(el.parentElement || el);
      if (!outside) { unresolved++; return; }

      var b = boundaryRatio(el, outside);
      var content = hasVisibleContent(el);
      var need = 3;
      var short = b.ratio < need - 0.05;

      if (short && b.uaDefault && !b.colour) { uaDefault++; return; }

      if (needsBoundary(el)) {
        if (short) {
          if (count >= 20) { more++; return; }
          count++;
          add('1.4.11', 'fail', 'control-boundary-contrast',
            'Field boundary contrast is ' + b.ratio.toFixed(2) + ':1, below the required 3:1', el,
            'An empty field shows nothing but its own boundary, so the boundary has to carry 3:1 on its own. ' +
            (b.colour ? 'Measured ' + toHex(b.colour) + ' against ' + toHex(outside) + '.' : 'No border, fill or shadow could be measured on it at all.'),
            ownerOf(el),
            { evidence: (b.colour ? toHex(b.colour) + ' on ' + toHex(outside) + ' · ' : '') + b.ratio.toFixed(2) + ':1' });
        }
      } else if (isStateControl(el)) {
        if (short) {
          if (count >= 20) { more++; return; }
          count++;
          add('1.4.11', 'review', 'state-indicator-contrast',
            'State control boundary is ' + b.ratio.toFixed(2) + ':1, below 3:1', el,
            'The box itself is what shows whether this is on or off. ' +
            (b.colour ? 'Measured ' + toHex(b.colour) + ' against ' + toHex(outside) + '. ' : '') +
            'Only the unchecked state could be measured from here - check the checked state by hand as well.',
            ownerOf(el),
            { evidence: (b.colour ? toHex(b.colour) + ' on ' + toHex(outside) + ' · ' : '') + b.ratio.toFixed(2) + ':1' });
        }
      } else if (!content && short) {
        if (count >= 20) { more++; return; }
        count++;
        add('1.4.11', 'fail', 'control-no-boundary',
          'Control has no visible text, no icon and no boundary at 3:1', el,
          'Nothing about this control is visible to a sighted user: no text, no image, and a boundary measuring ' +
          b.ratio.toFixed(2) + ':1 against ' + toHex(outside) + '. Any one of the three would satisfy 1.4.11.',
          ownerOf(el),
          { evidence: 'boundary ' + b.ratio.toFixed(2) + ':1' });
      }

      /* Icon-only controls: the glyph is what identifies the control, so it
         is the thing that has to reach 3:1. Measured against the control's
         own surface, not the page behind it. */
      if (!txt(el)) {
        var shape = el.querySelector('svg path,svg circle,svg rect,svg polygon,svg line,svg polyline,svg ellipse');
        if (shape) {
          var behind = effectiveBg(el) || outside;
          var ss = getComputedStyle(shape);
          var f = parseColour(ss.fill);
          if (!f || f.a === 0) f = parseColour(ss.stroke);
          if (f && f.a > 0 && behind) {
            if (f.a < 1) f = blend(f, behind);
            var ri = ratio(f, behind);
            if (ri < need - 0.05) {
              if (icons >= 12) { moreIcons++; return; }
              icons++;
              add('1.4.11', 'review', 'icon-contrast',
                'Icon contrast is ' + ri.toFixed(2) + ':1, below the required 3:1', el,
                'This control shows an icon and no text, so the icon is what identifies it. Measured ' +
                toHex(f) + ' against ' + toHex(behind) + '. If the icon is purely decorative and the control is identified some other way, close this as not applicable and record why.',
                ownerOf(el),
                { evidence: toHex(f) + ' on ' + toHex(behind) + ' · ' + ri.toFixed(2) + ':1' });
            }
          }
        }
      }
    });

    capped('Non-text contrast', count, more);
    capped('Icon contrast', icons, moreIcons);

    if (unresolved) {
      add('1.4.11', 'info', 'nontext-unmeasured', unresolved + ' control(s) could not be measured', null,
        'Their background is an image, a gradient, or resolves to transparent, so no ratio can be computed. Sample these by hand.',
        'unknown',
        { label: unresolved + ' controls', schema: 'various', evidence: 'background not resolvable' });
    }

    /* Graphical objects. Only the ones required to understand the content are
       in scope, which is a human judgement, so they are counted rather than
       verdicted. Charts are the case that matters in D365. */
    var graphics = [].slice.call(document.querySelectorAll('svg,canvas,img'))
      .filter(function (g) {
        if (inTool(g) || !isVisible(g) || isShell(g)) return false;
        if (attr(g, 'aria-hidden') === 'true' && !g.closest('[role="img"]')) return false;
        if (g.closest(INTERACTIVE)) return false;
        var r = g.getBoundingClientRect();
        return r.width >= 24 && r.height >= 24;
      });
    if (graphics.length) {
      add('1.4.11', 'review', 'graphics-review',
        graphics.length + ' graphic(s) need a contrast judgement', graphics[0],
        'Charts, diagrams and standalone images. Whether a part of a graphic is required to understand the content is a decision only a person can make, and a canvas-rendered chart cannot be sampled programmatically at all.',
        'yours',
        { label: graphics.length + ' graphics', schema: 'svg / canvas / img', evidence: 'human judgement required' });
    }

    if (inactive || uaDefault) {
      notes.push('Non-text contrast: ' + inactive + ' inactive control(s)' +
        (uaDefault ? ' and ' + uaDefault + ' left at the browser default appearance' : '') +
        ' were exempted, which is what 1.4.11 allows.');
    }
  }

  /* WCAG 2.5.8 inline exception: "the target is in a sentence, or its size is
     otherwise constrained by the line-height of non-target text". Two things
     have to hold, and both are tested here.

     This used to compare the target's text with its parent's ENTIRE text and
     exempt anything with 20 characters more around it. In a command bar or a
     toolbar the parent is a container full of OTHER buttons' labels, not a run
     of prose, so every small icon button in a toolbar was silently exempted -
     which is exactly the case 2.5.8 exists to catch. Only the parent's own
     direct text nodes count now: a sibling element's label is not a sentence
     this target sits in. */
  var INLINE_PROSE_CHARS = 15;

  function inlineInText(el) {
    var p = el.parentElement;
    if (!p) return false;

    /* A block-level target is not constrained by a line of text, whatever is
       around it. Covers inline, inline-block and inline-flex. */
    var disp = '';
    try { disp = window.getComputedStyle(el).display || ''; } catch (e) { return false; }
    if (disp.indexOf('inline') !== 0) return false;

    /* Direct text nodes only. Whitespace between sibling elements collapses to
       nothing, so a toolbar scores zero and a sentence does not. */
    var prose = 0;
    for (var n = p.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        prose += (n.nodeValue || '').replace(/\s+/g, ' ').trim().length;
      }
    }
    return prose >= INLINE_PROSE_CHARS;
  }

  function checkTargetSize() {
    markRan('2.5.8');
    var els = interactives(document).filter(function (el) { return !isShell(el); });
    var rects = els.map(function (el) { return { el: el, r: el.getBoundingClientRect() }; });

    /* The spacing exception needs to know whether any OTHER target falls
       inside a 24px circle. Comparing every target with every other one is
       O(n^2), which is fine on a test page and not fine on a form carrying a
       command bar and three subgrids. Each target is filed into the 32px grid
       cells its 24px-expanded box covers, so a candidate only has to look in
       the one cell its own centre falls in. Anything that would span a huge
       number of cells - a full-height container that happens to be focusable -
       goes on a short list checked linearly, so nothing is missed. */
    var CELL = 32, buckets = {}, large = [];
    rects.forEach(function (item, i) {
      var r = item.r;
      if (r.width === 0 || r.height === 0) return;
      var x0 = Math.floor((r.left - 24) / CELL), x1 = Math.floor((r.right + 24) / CELL);
      var y0 = Math.floor((r.top - 24) / CELL), y1 = Math.floor((r.bottom + 24) / CELL);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4000) { large.push(i); return; }
      for (var x = x0; x <= x1; x++) {
        for (var y = y0; y <= y1; y++) {
          var k = x + ':' + y;
          (buckets[k] = buckets[k] || []).push(i);
        }
      }
    });

    var count = 0, more = 0;
    rects.forEach(function (item) {
      var r = item.r;
      if (r.width >= 24 && r.height >= 24) return;
      if (r.width === 0 || r.height === 0) return;
      /* Inline exception - see inlineInText. */
      if (inlineInText(item.el)) return;
      /* Spacing exception: no other target within a 24px circle. */
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2, clash = false;
      var near = (buckets[Math.floor(cx / CELL) + ':' + Math.floor(cy / CELL)] || []).concat(large);
      for (var i = 0; i < near.length; i++) {
        var other = rects[near[i]];
        if (other.el === item.el) continue;
        var o = other.r;
        var ox = Math.max(o.left, Math.min(cx, o.right));
        var oy = Math.max(o.top, Math.min(cy, o.bottom));
        if (Math.hypot(cx - ox, cy - oy) < 24) { clash = true; break; }
      }
      if (!clash) return;
      if (count >= 20) { more++; return; }
      count++;
      add('2.5.8', 'review', 'target-size',
        'Target is ' + Math.round(r.width) + 'x' + Math.round(r.height) + 'px with insufficient spacing', item.el,
        'Below the 24x24 minimum and another target falls inside its 24px spacing circle. Before logging this, check the "equivalent control" exception: if the same action is available from a larger control on this page, it passes. This tool cannot determine that.', ownerOf(item.el),
        { evidence: Math.round(r.width) + '×' + Math.round(r.height) + 'px' });
    });
    capped('Target size', count, more);
  }

  function checkTabindexAndFocusability() {
    markRan('2.4.3', '2.1.1');
    document.querySelectorAll('[tabindex]').forEach(function (el) {
      if (inTool(el)) return;
      var v = parseInt(attr(el, 'tabindex'), 10);
      if (v > 0) {
        add('2.4.3', 'fail', 'tabindex-positive', 'Positive tabindex value', el,
          'tabindex="' + v + '" forces this element out of the natural document order and makes focus order unpredictable. Use 0 or restructure the form.', ownerOf(el),
          { evidence: 'tabindex="' + v + '"' });
      }
    });
    var c = 0, moreClicks = 0;
    document.querySelectorAll('[onclick],[role="button"],[role="link"]').forEach(function (el) {
      if (inTool(el) || !isVisible(el)) return;
      if (el.matches('a[href],button,input,select,textarea')) return;
      var ti = attr(el, 'tabindex');
      if (ti !== null && parseInt(ti, 10) >= 0) return;
      if (c >= 15) { moreClicks++; return; }
      c++;
      add('2.1.1', 'fail', 'not-focusable', 'Clickable element cannot receive keyboard focus', el,
        '<' + el.tagName.toLowerCase() + '> responds to clicks but has no tabindex, so keyboard users cannot reach it.', ownerOf(el),
        { evidence: 'no tabindex, not natively focusable' });
    });
    capped('Keyboard reachability', c, moreClicks);
  }

  function checkLandmarksAndHeadings() {
    markRan('2.4.1', '1.3.1');
    var main = document.querySelector('main,[role="main"]');
    var skip = null;
    var firstLinks = [].slice.call(document.querySelectorAll('a[href^="#"]')).slice(0, 5);
    firstLinks.forEach(function (a) { if (/skip|main content/i.test(txt(a) + ' ' + accName(a))) skip = a; });

    if (!main && !skip) {
      add('2.4.1', 'fail', 'bypass-missing', 'No main landmark and no skip link found', null,
        'Keyboard and screen reader users have no way to bypass the navigation bar and site map on every record.', 'platform',
        { label: 'Page', schema: 'document', evidence: 'no <main>, no skip link' });
    } else {
      add('2.4.1', 'info', 'bypass-found',
        'Bypass mechanism found: ' + (skip ? 'skip link' : '') + (skip && main ? ' and ' : '') + (main ? 'main landmark' : ''),
        main || skip,
        'One sufficient technique is present. Confirm by keyboard that you can actually reach the form content without tabbing through the whole site map.', 'platform',
        { label: skip ? 'Skip link' : 'Main landmark', evidence: 'present in markup' });
    }

    var headings = [].slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')).filter(isVisible);
    if (!headings.length) {
      add('1.3.1', 'review', 'headings-none', 'No headings found on the page', null,
        'Screen reader users navigate by heading. Without any, they must tab through everything.', 'platform',
        { label: 'Page', schema: 'document', evidence: '0 headings' });
    } else {
      var prev = 0;
      headings.forEach(function (h) {
        var lvl = h.tagName[0] === 'H' ? parseInt(h.tagName[1], 10) : parseInt(attr(h, 'aria-level') || '2', 10);
        if (prev && lvl > prev + 1) {
          add('1.3.1', 'review', 'heading-skip', 'Heading level skips from h' + prev + ' to h' + lvl, h,
            '"' + txt(h).slice(0, 50) + '". Skipped levels make the structure harder to follow.', ownerOf(h),
            { evidence: 'h' + prev + ' → h' + lvl });
        }
        prev = lvl;
      });
    }
  }

  function checkGrids() {
    markRan('1.3.1', '2.4.6');
    var grids = [].slice.call(document.querySelectorAll('[role="grid"],[role="table"],table')).filter(isVisible);
    if (!grids.length) return;
    grids.forEach(function (g, gi) {
      if (inTool(g)) return;
      var gName = accName(g) || 'Grid ' + (gi + 1);
      var heads = [].slice.call(g.querySelectorAll('[role="columnheader"],th'));
      if (!heads.length) {
        add('1.3.1', 'fail', 'grid-no-headers', 'Grid has no column headers', g,
          'A grid with no columnheader or th elements gives screen reader users no context for cell values.', ownerOf(g),
          { label: gName, evidence: '0 column headers' });
        return;
      }
      var names = {}, blank = 0;
      heads.forEach(function (h) {
        var n = accName(h) || txt(h);
        if (!n) { blank++; return; }
        var k = n.trim().toLowerCase();
        (names[k] = names[k] || []).push(n);
        if (DEFAULT_LABEL.test(n.trim()) || /_/.test(n)) {
          add('2.4.6', 'fail', 'grid-column-schema', 'View column name looks like a schema name or default', h,
            'Column "' + n + '" in ' + gName + '. Rename it to business language.', 'yours',
            { label: n, schema: 'columnheader', evidence: 'in ' + gName });
        }
      });
      if (blank) {
        add('1.3.1', 'fail', 'grid-header-blank', blank + ' column header(s) have no accessible name', g,
          'Cells in those columns will be announced with no context.', ownerOf(g),
          { label: gName, evidence: blank + ' unnamed headers' });
      }
      Object.keys(names).forEach(function (k) {
        if (names[k].length > 1) {
          add('2.4.6', 'fail', 'grid-column-duplicate', 'Duplicate column name in a grid', g,
            'The column "' + names[k][0] + '" appears ' + names[k].length + ' times in ' + gName + '.', 'yours',
            { label: names[k][0], schema: 'columnheader', evidence: names[k].length + ' occurrences' });
        }
      });
      var rows = g.querySelectorAll('[role="row"],tr').length;
      if (gi === 0) {
        add('1.3.1', 'info', 'grid-sampled', 'Grid scanned with ' + rows + ' rows rendered', g,
          'The modern grid virtualises rows, so only rendered rows were checked. Scroll the grid and re-run to cover more, or accept that this is a sample.', 'platform',
          { label: gName, evidence: rows + ' rows rendered' });
      }
    });
  }

  function checkLinkPurpose() {
    markRan('2.4.4');
    var count = 0, more = 0;
    document.querySelectorAll('a[href],[role="link"]').forEach(function (a) {
      if (inTool(a) || !isVisible(a) || isShell(a)) return;
      var t = accName(a) || txt(a);
      if (!t) return;
      if (/^(click here|here|more|read more|view|link|details|open)$/i.test(t.trim())) {
        if (count >= 12) { more++; return; }
        count++;
        add('2.4.4', 'review', 'link-generic', 'Generic link text', a,
          'Link reads "' + t + '". In a grid this may be acceptable if the column header supplies context. On a form it is not.', ownerOf(a),
          { label: t, evidence: 'non-descriptive text' });
      } else if (/^https?:\/\//i.test(t.trim()) && t.length > 40) {
        if (count >= 12) { more++; return; }
        count++;
        add('2.4.4', 'fail', 'link-raw-url', 'Raw URL used as link text', a,
          'A screen reader will read out the whole URL character by character: "' + t.slice(0, 70) + '...". Use a descriptive label.', 'yours',
          { label: t.slice(0, 40) + '…', evidence: t.length + ' characters' });
      }
    });
    capped('Link purpose', count, more);
  }

  /* 1.4.12 asks what happens WHEN the spacing values are applied, so the
     check measures each candidate before and after. Only content that newly
     overflows is reported: something already overflowing its box before the
     override is a 1.4.4 or 1.4.10 problem and reporting it here would be
     evidence for the wrong criterion. Text that overflows without clipping
     is reported too - it does not lose content, it lands on top of the
     content next to it. */
  function checkTextSpacing() {
    markRan('1.4.12');
    var candidates = [].slice.call(document.querySelectorAll(
      'label,[data-id$="-field-label"],[data-id$=".fieldLabel"],[role="columnheader"],' +
      'th,legend,button,[role="button"]'))
      .filter(function (el) { return !inTool(el) && isVisible(el); });

    /* letter-spacing puts a space after EVERY character including the last
       one, so a single-character icon button gains about 0.12em of trailing
       whitespace and reports as overflowing when nothing is actually lost.
       The horizontal tolerance is one letter-space wide for that reason. The
       vertical one is not: extra height means a line has nowhere to go. */
    function measure(el) {
      var fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      return { sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight,
        slack: Math.max(2, fs * 0.12 + 1) };
    }
    function over(m, slack) { return m.sw > m.cw + slack || m.sh > m.ch + 2; }

    var before = candidates.map(measure);
    var style = document.createElement('style');
    style.textContent = '*:not(#' + HOST_ID + ' *){line-height:1.5em !important;letter-spacing:0.12em !important;' +
      'word-spacing:0.16em !important;} p{margin-bottom:2em !important;}';
    document.head.appendChild(style);
    var count = 0, more = 0;
    try {
      candidates.forEach(function (el, i) {
        var after = measure(el);
        var slack = before[i].slack;
        if (!over(after, slack) || over(before[i], slack)) return;
        if (count >= 20) { more++; return; }
        count++;
        var cs = getComputedStyle(el);
        var clips = cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' ||
          cs.overflowX === 'hidden' || cs.overflowY === 'hidden';
        if (clips) {
          add('1.4.12', 'fail', 'text-clipped', 'Text is clipped when spacing overrides are applied', el,
            '"' + txt(el).slice(0, 50) + '" overflows its container at WCAG text spacing values and the overflow is hidden. The user loses content.', ownerOf(el),
            { evidence: after.sw + 'px content in ' + after.cw + 'px box' });
        } else {
          /* Clipped text is lost, which is a failure. Text that spills out of
             its box is still readable until it collides with something, so
             that one is a review: whether content is actually lost is a
             judgement about what sits next to it. */
          add('1.4.12', 'review', 'text-overflow', 'Text overflows its container when spacing overrides are applied', el,
            '"' + txt(el).slice(0, 50) + '" no longer fits its box at WCAG text spacing values. Nothing is clipped, so it will overlap or displace whatever sits next to it.', ownerOf(el),
            { evidence: after.sw + 'px content in ' + after.cw + 'px box' });
        }
      });
    } finally {
      style.remove();
    }
    capped('Text spacing', count, more);
  }

  function checkFixedWidths() {
    markRan('1.4.10');
    var count = 0, more = 0;
    document.querySelectorAll('[style*="width"]').forEach(function (el) {
      if (inTool(el) || !isVisible(el) || isShell(el)) return;
      var m = /width:\s*(\d+)px/.exec(el.getAttribute('style') || '');
      if (!m || parseInt(m[1], 10) < 400) return;
      if (el.closest('[role="grid"],table')) return;
      if (count >= 10) { more++; return; }
      count++;
      add('1.4.10', 'review', 'fixed-width', 'Fixed pixel width of ' + m[1] + 'px', el,
        'Fixed widths block reflow at a 320px viewport. Data grids are exempt; this element is not in one. Confirm at 400% zoom.', ownerOf(el),
        { evidence: 'width: ' + m[1] + 'px' });
    });
    capped('Fixed widths', count, more);
  }

  function checkLiveRegions() {
    markRan('4.1.3');
    var regions = [].slice.call(document.querySelectorAll('[aria-live],[role="status"],[role="alert"],[role="log"]'))
      .filter(function (el) { return !inTool(el); });
    if (!regions.length) {
      add('4.1.3', 'review', 'live-region-none', 'No live regions found on the page', null,
        'Status messages such as save confirmations and filter counts may not be announced. Note that live regions are often created on demand, so trigger a save and re-run before concluding this is a failure.', 'platform',
        { label: 'Page', schema: 'document', evidence: '0 live regions' });
    } else {
      add('4.1.3', 'info', 'live-region-present', regions.length + ' live region(s) present', regions[0],
        'Trigger a save, a validation failure and a grid filter, then confirm with a screen reader that each is actually announced. Presence of a region does not mean it is used.', 'platform',
        { label: regions.length + ' live regions', evidence: 'present in markup' });
    }
  }

  function checkAutocomplete() {
    markRan('1.3.5');
    var inputs = [].slice.call(document.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"],input:not([type])'))
      .filter(function (el) { return isVisible(el) && !inTool(el) && !isShell(el); });
    if (!inputs.length) return;
    var withAc = inputs.filter(function (el) { return attr(el, 'autocomplete') && attr(el, 'autocomplete') !== 'off'; }).length;
    add('1.3.5', 'info', 'autocomplete-count',
      withAc + ' of ' + inputs.length + ' text inputs carry an autocomplete attribute', null,
      'This criterion applies only where the form collects the logged-in user\'s own details, which is uncommon in a staff-facing CRM where users enter customer data. Decide applicability yourself before treating a low count as a failure.', 'platform',
      { label: 'Text inputs on this page', schema: 'input', evidence: withAc + ' of ' + inputs.length + ' carry autocomplete' });
  }

  function checkDuplicateIds() {
    markRan('4.1.2');
    var ids = {}, dupes = [];
    document.querySelectorAll('[id]').forEach(function (el) {
      if (inTool(el)) return;
      var id = el.id;
      if (ids[id]) { if (dupes.indexOf(id) === -1) dupes.push(id); } else { ids[id] = 1; }
    });
    if (dupes.length) {
      add('4.1.2', 'review', 'duplicate-id', dupes.length + ' duplicate id value(s) on the page', null,
        'Duplicates break aria-labelledby and label[for] associations. Examples: ' + dupes.slice(0, 5).join(', ') + '.', 'unknown',
        { label: dupes.length + ' duplicated ids', schema: dupes.slice(0, 3).join(', '), evidence: 'id reused' });
    }
  }

  function checkFrames() {
    var frames = [].slice.call(document.querySelectorAll('iframe')).filter(isVisible);
    if (!frames.length) return;
    var cross = 0;
    frames.forEach(function (f) {
      var ok = false;
      try { ok = !!f.contentDocument; } catch (e) { ok = false; }
      if (!ok) cross++;
    });
    if (cross) {
      notes.push(cross + ' cross-origin iframe(s) were not scanned, for example embedded canvas apps. Their content is outside this scan and outside a standard-forms conformance claim.');
    }
  }

  /* Deep mode: focus each element and diff computed styles. Accurate for
     2.4.7, and it is the only way to measure a focus indicator for 1.4.11,
     but it fires onfocus handlers, so it is opt-in. */
  function checkFocusVisible() {
    markRan('2.4.7');
    var all = interactives(document).filter(function (el) { return !isShell(el); });
    var els = all.slice(0, 120);
    if (all.length > els.length) {
      notes.push('Deep mode: focused the first 120 of ' + all.length + ' controls. ' +
        'The rest were not tested for 2.4.7.');
    }
    var active = document.activeElement;
    var count = 0, more = 0, dim = 0, moreDim = 0;
    /* The keys that can carry a focus indicator. Read as strings BEFORE
       focusing: getComputedStyle returns a live object, so holding onto it
       and reading it after the focus gives you the focused value twice. */
    var KEYS = ['outlineStyle', 'outlineWidth', 'outlineColor', 'boxShadow', 'borderColor', 'backgroundColor'];
    els.forEach(function (el) {
      var cs = getComputedStyle(el);
      var pre = {};
      KEYS.forEach(function (k) { pre[k] = cs[k]; });
      /* The surface the indicator sits against, sampled unfocused. */
      var outer = effectiveBg(el.parentElement || el);
      var inner = parseColour(pre.backgroundColor);
      if (inner && inner.a > 0 && inner.a < 1 && outer) inner = blend(inner, outer);

      try { el.focus({ preventScroll: true }); } catch (e) { return; }
      if (document.activeElement !== el) return;
      var after = getComputedStyle(el);
      var post = {};
      KEYS.forEach(function (k) { post[k] = after[k]; });

      var changed = KEYS.some(function (k) { return pre[k] !== post[k]; });
      if (!changed) {
        if (count >= 20) { more++; return; }
        count++;
        add('2.4.7', 'fail', 'focus-invisible', 'No visible style change when the element receives focus', el,
          '<' + el.tagName.toLowerCase() + '> "' + (accName(el) || txt(el)).slice(0, 40) +
          '" renders identically focused and unfocused. Keyboard users cannot tell where they are.', ownerOf(el),
          { evidence: 'computed style identical focused' });
        return;
      }

      /* There IS an indicator, so 1.4.11 applies to it. Whichever property
         changed is the indicator; measure that colour against both the
         surface outside the control and the control's own fill, and take the
         better of the two - an indicator only has to contrast with what it
         actually sits against, and a ring drawn on the boundary has a
         different colour on each side. */
      var indicator = null;
      if (post.outlineStyle !== 'none' && (parseFloat(post.outlineWidth) || 0) > 0 &&
        (pre.outlineColor !== post.outlineColor || pre.outlineStyle !== post.outlineStyle ||
          pre.outlineWidth !== post.outlineWidth)) {
        indicator = parseColour(post.outlineColor);
      } else if (pre.boxShadow !== post.boxShadow && post.boxShadow !== 'none') {
        indicator = parseColour(post.boxShadow);
      } else if (pre.borderColor !== post.borderColor) {
        indicator = parseColour(post.borderColor);
      } else if (pre.backgroundColor !== post.backgroundColor) {
        indicator = parseColour(post.backgroundColor);
      }
      if (!indicator || indicator.a === 0) return;
      /* 2.4.7 - is there an indicator at all - survives a re-coloured page.
         The 1.4.11 ratio does not, so it stops here. */
      if (renderAltered.altered) return;

      var best = 0, against = null;
      if (outer) {
        var c1 = indicator.a < 1 ? blend(indicator, outer) : indicator;
        var r1 = ratio(c1, outer);
        if (r1 > best) { best = r1; against = outer; }
      }
      if (inner && inner.a === 1) {
        var c2 = indicator.a < 1 ? blend(indicator, inner) : indicator;
        var r2 = ratio(c2, inner);
        if (r2 > best) { best = r2; against = inner; }
      }
      if (!against) return;
      if (best < 3 - 0.05) {
        if (dim >= 12) { moreDim++; return; }
        dim++;
        add('1.4.11', 'fail', 'focus-indicator-contrast',
          'Focus indicator contrast is ' + best.toFixed(2) + ':1, below the required 3:1', el,
          'The indicator is visible, so 2.4.7 is satisfied, but at ' + toHex(indicator) + ' against ' +
          toHex(against) + ' it is too faint for 1.4.11. Measured against the better of the control fill and the surface behind it.',
          ownerOf(el),
          { evidence: toHex(indicator) + ' on ' + toHex(against) + ' · ' + best.toFixed(2) + ':1' });
      }
    });
    capped('Focus visible', count, more);
    capped('Focus indicator contrast', dim, moreDim);
    try { if (active && active.focus) active.focus({ preventScroll: true }); } catch (e) {}
  }


  /* ------------------------------------------------------------------ */
  /* 7. Run and roll up                                                 */
  /* ------------------------------------------------------------------ */

  var deepMode = false;

  function runScan(deep) {
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    findings = []; ranChecks = {}; notes = [];
    deepMode = !!deep;
    /* Where are we NOW. The panel survives navigation inside the app, so this
       is what makes Refresh report on the record or view currently on screen
       rather than the one that was open when the tool was launched. */
    safe(readContext, 'page context');
    /* Off a Dynamics 365 page nothing runs at all - no checks, no notes, no
       timings. Findings and notes are already empty, and leaving them that way
       is what stops the panel showing 55 criteria as if they had been looked
       at. See detectD365(). */
    if (!pageIsD365) { scanMs = 0; scanAt = null; return; }
    renderAltered = safe(detectRenderMode, 'render mode') || { altered: false, reasons: [], advisory: [] };
    if (renderAltered.altered) {
      notes.push('CONTRAST CHECKS WERE SKIPPED. ' + renderAltered.reasons.join(' ') +
        ' Turn the override off and press Refresh. WCAG conformance is assessed against the default presentation, and a user contrast override does not make a page conformant.');
    }
    renderAltered.advisory.forEach(function (a) { notes.push(a); });
    safe(checkFormMetadata, 'form metadata');
    safe(checkMultiColumn, 'multi-column sections');
    safe(checkLang, 'lang');
    safe(checkTitle, 'title');
    safe(checkAccessibleNames, 'accessible names');
    safe(checkLabelInName, 'label in name');
    safe(checkContrast, 'contrast');
    safe(checkNonTextContrast, 'non-text contrast');
    safe(checkTargetSize, 'target size');
    safe(checkTabindexAndFocusability, 'tabindex');
    safe(checkLandmarksAndHeadings, 'landmarks and headings');
    safe(checkGrids, 'grids');
    safe(checkLinkPurpose, 'link purpose');
    safe(checkTextSpacing, 'text spacing');
    safe(checkFixedWidths, 'fixed widths');
    safe(checkLiveRegions, 'live regions');
    safe(checkAutocomplete, 'autocomplete');
    safe(checkDuplicateIds, 'duplicate ids');
    safe(checkFrames, 'frames');
    if (deep) safe(checkFocusVisible, 'focus visible');
    else notes.push('Deep mode was off, so focus indicators were not measured. 2.4.7 and the focus indicator half of 1.4.11 stay unchecked until it is run.');
    var t1 = (window.performance && performance.now) ? performance.now() : Date.now();
    scanMs = Math.round(t1 - t0);
    scanAt = new Date();
  }

  /* Roll findings up to a status per criterion. There is deliberately no
     "Pass" state: absence of a detected violation is not conformance. */
  function statusFor(c, list) {
    var sc = c[0], mode = c[3];
    var mine = (list || findings).filter(function (f) { return f.sc === sc; });
    if (mine.some(function (f) { return f.severity === 'fail'; })) return 'fail';
    if (mine.some(function (f) { return f.severity === 'review'; })) return 'review';
    if (mode === 'na') return 'na';
    if (mode === 'cond') return 'cond';
    if (mode === 'manual') return 'manual';
    if (ranChecks[sc]) return 'clear';
    return 'manual';
  }

  var STATUS = {
    fail:   { label: 'Fail',               glyph: '✕', k: 'fail' },
    review: { label: 'Needs review',       glyph: '!',      k: 'review' },
    manual: { label: 'Manual assessment',  glyph: '◐', k: 'manual' },
    clear:  { label: 'No issues detected', glyph: '✓', k: 'clear' },
    cond:   { label: 'Conditional',        glyph: '◇', k: 'cond' },
    na:     { label: 'Not applicable',     glyph: '–', k: 'na' }
  };
  var CRIT_HINT = {
    manual: 'not automatable', clear: 'checks ran, nothing found',
    cond: 'decide applicability', na: 'out of scope here'
  };
  var PRINCIPLE_OF = { '1': 'Perceivable', '2': 'Operable', '3': 'Understandable', '4': 'Robust' };
  var MODE_LABEL = {
    auto: 'Automated', part: 'Partly automated', manual: 'Manual only',
    cond: 'Conditional', na: 'Not applicable here'
  };
  var SEV_SHORT = { fail: 'Fail', review: 'Review', manual: 'Manual', clear: 'Clear', cond: 'Conditional', na: 'N/A', info: 'Note' };

  function criterion(sc) {
    for (var i = 0; i < CRITERIA.length; i++) if (CRITERIA[i][0] === sc) return CRITERIA[i];
    return null;
  }

  /* Pass a filtered findings list to count what the current scope shows.
     Called with no argument - from the scan announcement and the report -
     it counts the whole page. */
  function counts(list) {
    var out = { fail: 0, review: 0, clear: 0, manual: 0, cond: 0, na: 0 };
    CRITERIA.forEach(function (c) { out[statusFor(c, list)]++; });
    return out;
  }

  /* Group findings into issues. One issue = one criterion + one finding
     type, carrying every element it was observed on. */
  function buildIssues() {
    var map = {}, order = [];
    findings.forEach(function (f) {
      var key = f.sc + '|' + f.type;
      if (!map[key]) {
        var c = criterion(f.sc);
        var fx = FIXES[f.type] || {};
        map[key] = {
          key: key, sc: f.sc, type: f.type,
          name: c ? c[1] : '', level: c ? c[2] : '',
          severity: f.severity,
          message: f.message,
          why: fx.why || f.detail,
          steps: fx.steps || [],
          mins: fx.mins || (c ? c[5] : 10),
          owner: f.owner,
          elements: [], regions: {}, classes: {}
        };
        order.push(key);
      }
      var g = map[key];
      /* fail beats review beats info within a group */
      var rank = { fail: 0, review: 1, info: 2 };
      if (rank[f.severity] < rank[g.severity]) { g.severity = f.severity; g.message = f.message; }
      g.regions[f.region] = true;
      g.classes[f.cls] = (g.classes[f.cls] || 0) + 1;
      g.elements.push(f);
    });
    var list = order.map(function (k) { return map[k]; });
    list.forEach(function (g) {
      g.regionList = Object.keys(g.regions);
      g.classList = Object.keys(g.classes);
      /* One class when every element agrees, 'mixed' when they do not.
         Never collapsed to whichever came first - a single badge that
         hides half the elements is worse than saying it is mixed. */
      g.cls = g.classList.length === 1 ? g.classList[0] : 'mixed';
    });
    return list;
  }

  function sortIssues(list, by) {
    var sev = { fail: 0, review: 1, info: 2 };
    function scNum(sc) {
      var p = sc.split('.').map(Number);
      return p[0] * 10000 + p[1] * 100 + p[2];
    }
    return list.slice().sort(function (a, b) {
      if (by === 'criterion') return scNum(a.sc) - scNum(b.sc);
      if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
      return scNum(a.sc) - scNum(b.sc);
    });
  }

  /* Queue for the overview: smallest, most contained job first, so the team
     can clear the easy ones before the sprawling ones. The size figures that
     decide the order are never printed - every duration was taken out
     on 29/08/2026, because a per-issue minute count read as a commitment. */
  function fixFirst(list) {
    return list.filter(function (g) { return g.severity === 'fail' || g.severity === 'review'; })
      .slice()
      .sort(function (a, b) {
        var sev = { fail: 0, review: 1 };
        if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
        var ea = a.mins * Math.max(1, a.elements.length), eb = b.mins * Math.max(1, b.elements.length);
        return ea - eb;
      })
      .slice(0, 5);
  }

  function principleRows(list) {
    return PRINCIPLES.map(function (p) {
      var row = { label: p[1], fail: 0, review: 0, manual: 0, clear: 0 };
      CRITERIA.forEach(function (c) {
        if (c[0].split('.')[0] !== p[0]) return;
        var s = statusFor(c, list);
        if (s === 'fail') row.fail++;
        else if (s === 'review') row.review++;
        else if (s === 'manual' || s === 'cond') row.manual++;
        else if (s === 'clear') row.clear++;
      });
      row.total = row.fail + row.review + row.manual + row.clear;
      return row;
    });
  }


  /* ------------------------------------------------------------------ */
  /* 8. Markdown report                                                 */
  /* ------------------------------------------------------------------ */

  function pad(n) { return ('0' + n).slice(-2); }
  function stampUK(d) {
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function stampFile(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      '-' + pad(d.getHours()) + pad(d.getMinutes());
  }
  var REGION_LABEL = { page: 'Page level', form: 'This form', command: 'Command bar', grid: 'Subgrids and views' };
  var OWNER_LABEL = { yours: 'your configuration', platform: 'platform (Microsoft)', unknown: 'needs triage' };
  /* The report says the same thing the panel's component badge says, so a
     reader who never opens the panel still knows what they can act on. */
  var CLASS_REPORT = {
    custom: 'Customisable', platform: 'Microsoft (platform)',
    triage: 'Needs triage', mixed: 'Mixed'
  };
  function CLASS_LONG_REPORT(g) {
    if (g.cls !== 'mixed') return '- ' + CLASS_LONG[g.cls];
    return '- ' + g.classList.map(function (k) {
      return CLASS_REPORT[k] + ' x' + g.classes[k];
    }).join(', ') + '. Split the issue before logging it.';
  }

  function buildMarkdown() {
    var d = scanAt || new Date();
    var cnt = counts();
    var issues = buildIssues();

    var L = [];
    L.push('# Oliver4 Dynamics 365 Accessibility Checker - scan results');
    L.push('');
    L.push('> **This is not an accessibility audit and is not evidence of conformance.** It is an automated aid that detects a subset of WCAG 2.2 issues. No criterion is ever reported as passing. "No issues detected" means only that this tool\'s checks found nothing, and roughly 25 to 40 per cent of real accessibility issues are not machine-detectable at all.');
    L.push('');
    L.push('| | |');
    L.push('|---|---|');
    L.push('| Scanned | ' + stampUK(d) + ' (' + scanMs + ' ms) |');
    L.push('| Environment | ' + orgHost + ' |');
    L.push('| URL | ' + location.href.split('&')[0] + ' |');
    L.push('| Record | ' + entityDisplay + ' |');
    L.push('| Page type | ' + pageType + (entityName ? ' (' + entityName + ')' : '') + ' |');
    L.push('| Client API | ' + (formContext ? 'form context available' : (Xrm ? 'Xrm found, no form context' : 'not reachable')) + ' |');
    L.push('| Deep mode | ' + (deepMode ? 'on' : 'off') + ' |');
    /* The report is the whole scan. The panel's scope tickboxes are a reading
       aid for the person triaging, not a filter on the evidence. */
    L.push('| Scope | whole page - the panel\'s scope filter is not applied to this report |');
    L.push('| Run by | ' + (userName || 'unknown') + ' |');
    L.push('| Tool version | ' + VERSION + ' |');
    L.push('');
    L.push('## Summary');
    L.push('');
    L.push('| Status | Count | Meaning |');
    L.push('|---|---|---|');
    L.push('| Fail | ' + cnt.fail + ' | A violation was detected. Fix or triage to Microsoft. |');
    L.push('| Needs review | ' + cnt.review + ' | Something looks wrong but a human must decide. |');
    L.push('| Manual assessment | ' + cnt.manual + ' | Cannot be automated. Must be tested by a person. |');
    L.push('| No issues detected | ' + cnt.clear + ' | Automated checks ran and found nothing. **Not a pass.** |');
    L.push('| Conditional | ' + cnt.cond + ' | Applies only if a trigger is present. Decide applicability. |');
    L.push('| Not applicable | ' + cnt.na + ' | Does not apply to desktop forms and views. |');
    L.push('');

    L.push('### By WCAG principle');
    L.push('');
    L.push('| Principle | Fail | Needs review | Manual or conditional | No issues detected |');
    L.push('|---|---|---|---|---|');
    principleRows().forEach(function (p) {
      L.push('| ' + p.label + ' | ' + p.fail + ' | ' + p.review + ' | ' + p.manual + ' | ' + p.clear + ' |');
    });
    L.push('');

    var queue = fixFirst(issues);
    if (queue.length) {
      L.push('### Fix these first');
      L.push('');
      L.push('Ordered with the smallest, most contained job first.');
      L.push('');
      L.push('| SC | Issue | Elements |');
      L.push('|---|---|---|');
      queue.forEach(function (g) {
        L.push('| ' + g.sc + ' | ' + g.message + ' | ' + g.elements.length + ' |');
      });
      L.push('');
    }

    if (notes.length) {
      L.push('## Scan notes');
      L.push('');
      notes.forEach(function (n) { L.push('- ' + n); });
      L.push('');
    }

    L.push('## Findings');
    L.push('');
    ['fail', 'review', 'info'].forEach(function (sev) {
      var list = sortIssues(issues.filter(function (g) { return g.severity === sev; }), 'criterion');
      if (!list.length) return;
      L.push('### ' + (sev === 'fail' ? 'Failures' : sev === 'review' ? 'Needs review' : 'Information') + ' (' + list.length + ')');
      L.push('');
      list.forEach(function (g) {
        L.push('#### ' + g.sc + ' ' + g.name + ' (Level ' + g.level + ') - ' + g.message);
        L.push('');
        L.push('- **Component:** ' + CLASS_REPORT[g.cls] + ' ' + CLASS_LONG_REPORT(g));
        L.push('- **Owner:** ' + (OWNER_LABEL[g.owner] || g.owner));
        L.push('- **Region:** ' + g.regionList.map(function (r) { return REGION_LABEL[r] || r; }).join(', '));
        L.push('- **Why it matters:** ' + g.why);
        L.push('');
        if (g.elements.length) {
          L.push('| Element | Schema / selector | Evidence |');
          L.push('|---|---|---|');
          g.elements.slice(0, 40).forEach(function (f) {
            L.push('| ' + (f.label || '-').replace(/\|/g, '/') + ' | `' + (f.schema || '-').replace(/\|/g, '/') + '` | ' + (f.evidence || f.detail).replace(/\|/g, '/') + ' |');
          });
          if (g.elements.length > 40) L.push('| ...and ' + (g.elements.length - 40) + ' more | | |');
          L.push('');
        }
        if (g.steps.length) {
          L.push('**How to fix in Dynamics 365**');
          L.push('');
          g.steps.forEach(function (s, i) { L.push((i + 1) + '. ' + s); });
          L.push('');
        }
        L.push('Reference: ' + understandingUrl(g.sc));
        L.push('');
      });
    });

    L.push('## All 55 criteria');
    L.push('');
    L.push('| SC | Name | Level | Status | What still needs doing |');
    L.push('|---|---|---|---|---|');
    CRITERIA.forEach(function (c) {
      var s = statusFor(c);
      L.push('| ' + c[0] + ' | ' + c[1] + ' | ' + c[2] + ' | ' + STATUS[s].label + ' | ' + c[4].replace(/\|/g, '/') + ' |');
    });
    L.push('');
    L.push('---');
    L.push('');
    L.push('Generated by the Oliver4 Dynamics 365 Accessibility Checker v' + VERSION +
      '. Runs entirely in the browser with no network calls.');
    return L.join('\n');
  }

  /* W3C Understanding pages use the criterion name in kebab case. */
  var UNDERSTANDING = {};
  /* The bracketed qualifier is part of the slug - contrast-minimum, not
     contrast - so only the brackets come out, not what is inside them.
     W3C uses US spelling for 1.4.1, which our UK label does not. */
  var SLUG_OVERRIDE = { '1.4.1': 'use-of-color' };
  CRITERIA.forEach(function (c) {
    UNDERSTANDING[c[0]] = SLUG_OVERRIDE[c[0]] || c[1].toLowerCase()
      .replace(/[()]/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  });
  function understandingSlug(sc) { return UNDERSTANDING[sc] || ''; }
  function understandingUrl(sc) {
    return 'https://www.w3.org/WAI/WCAG22/Understanding/' + understandingSlug(sc) + '.html';
  }
  /* The quickref uses the same slug as the Understanding page, verified
     against the published index on 29/08/2026. If a slug is ever wrong it
     is wrong in both links, so there is one thing to fix, not two. */
  function quickrefUrl(sc) {
    return 'https://www.w3.org/WAI/WCAG22/quickref/#' + understandingSlug(sc);
  }

  /* Download plus clipboard. Blob URL, so still no network. */
  function exportReport() {
    var md = buildMarkdown();
    var name = 'a11y-scan-' + (entityName || 'page') + '-' + stampFile(scanAt || new Date()) + '.md';
    var copied = false;
    var result;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        /* writeText resolves asynchronously and a page that denies the
           clipboard-write permission rejects it. Assume success so the note
           renders now, then correct the note if the write actually failed -
           an unhandled rejection here used to surface as a page error and the
           panel claimed a copy that never happened. */
        var wrote = navigator.clipboard.writeText(md);
        copied = true;
        if (wrote && wrote.then) {
          wrote.catch(function () {
            if (result) result.copied = false;
            if (ui.view === 'report') render();
          });
        }
      }
    } catch (e) {}
    var downloaded = false;
    try {
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      a.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
      downloaded = true;
    } catch (e) {
      notes.push('Download was blocked by the browser. Copy the report from the panel instead.');
    }
    result = { md: md, name: name, copied: copied, downloaded: downloaded };
    return result;
  }


  /* ------------------------------------------------------------------ */
  /* 9. Panel - tokens and stylesheet                                   */
  /*    Rendered in a shadow root so it does not pollute the DOM it is   */
  /*    measuring, and so the host page cannot restyle it.               */
  /*                                                                     */
  /*    Note on typography: the design uses Public Sans and JetBrains    */
  /*    Mono. Both would need a network fetch from Google Fonts, which   */
  /*    breaks the no-network guarantee and is blocked under the Strict  */
  /*    CSP toggle. System stacks are used instead.                      */
  /* ------------------------------------------------------------------ */

  var SANS = '"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif';
  var MONO = 'ui-monospace,"Cascadia Mono","Cascadia Code",Consolas,"SF Mono",Menlo,monospace';

  var CSS_TEXT = [
    ':host{all:initial;}',
    /* ---- light tokens ---- */
    '.wrap{',
    '--surface:#ffffff;--band:#fafbfc;--inset:#f2f4f7;--border:#e4e6ea;--hair:#eef0f3;',
    '--text:#15171c;--muted:#565a62;--dim:#4c5057;--faint:#84888f;--off:#868c95;',
    '--accent:#2764cf;--accent-hi:#1c50b0;--chip:#edf3fe;--active:#eef4ff;--ctl-bd:#868c95;',
    '--ok-bg:#eaf7ee;--ok-bd:#bfe3ca;--ok-fg:#1f6b3d;--ok-dot:#2f9e5c;',
    '--fail-bg:#fdeceb;--fail-bd:#f0c4c1;--fail-fg:#96231d;--fail-dot:#c0342c;',
    '--rev-bg:#fdf3e2;--rev-bd:#ecd7ab;--rev-fg:#77500f;--rev-dot:#c98a1b;',
    '--man-bg:#f2f4f7;--man-bd:#dcdfe4;--man-fg:#3e434b;--man-dot:#9aa0a8;',
    '--con-bg:#edf3fe;--con-bd:#cadcf9;--con-fg:#1c4d9e;',
    '--warn-bg:#fdf6e6;--warn-bd:#eddfb6;--warn-fg:#5f4610;--warn-accent:#c98a1b;',
    '--grip:#84888f;',
    '--shadow:0 18px 56px rgba(20,22,28,.30),0 6px 18px rgba(20,22,28,.18),0 0 0 1px rgba(20,22,28,.07);',
    '}',
    /* ---- dark tokens ---- */
    '.wrap[data-theme="dark"]{',
    '--surface:#15171b;--band:#1a1d22;--inset:#22262d;--border:#2b2f37;--hair:#22262d;',
    '--text:#e9ebef;--muted:#a3a8b1;--dim:#c0c5ce;--faint:#7d838c;--off:#6b727c;',
    '--accent:#7eaef9;--accent-hi:#9dc2fb;--chip:#1d2a3f;--active:#1b2739;--ctl-bd:#6b727c;',
    '--ok-bg:#14291d;--ok-bd:#265238;--ok-fg:#7fd3a1;--ok-dot:#3fbd76;',
    '--fail-bg:#2c1618;--fail-bd:#5e2c2f;--fail-fg:#f3a9a4;--fail-dot:#d8615a;',
    '--rev-bg:#2b2210;--rev-bd:#57441d;--rev-fg:#e8c584;--rev-dot:#d8a341;',
    '--man-bg:#22262d;--man-bd:#373d47;--man-fg:#c8cdd6;--man-dot:#8b919b;',
    '--con-bg:#1d2a3f;--con-bd:#31507c;--con-fg:#a3c8fa;',
    '--warn-bg:#26200f;--warn-bd:#4a3d1c;--warn-fg:#e6d3a6;--warn-accent:#d8a341;',
    '--grip:#e9ebef;',
    '--shadow:0 18px 56px rgba(0,0,0,.70),0 6px 18px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.55);',
    '}',
    '*{box-sizing:border-box;font-family:' + SANS + ';}',
    '.mono,code,kbd{font-family:' + MONO + ';}',

    /* ---- shell ---- */
    '.wrap{height:100%;display:flex;flex-direction:column;background:var(--surface);',
    'border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);color:var(--text);',
    'overflow:hidden;container-type:inline-size;}',

    'button,[role="button"]{cursor:pointer;background:none;border:0;color:inherit;font-size:inherit;}',
    ':focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px;}',
    /* The shell takes programmatic focus on load so the keyboard shortcuts work
       without a click. That is not a keyboard journey the user made, so the
       panel itself never draws the ring - every control inside it still does. */
    '.wrap:focus,.wrap:focus-visible{outline:none;}',
    '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}',

    /* ---- header ---- */
    'header.bar{flex:none;height:56px;display:flex;align-items:center;gap:12px;',
    'padding:0 12px 0 14px;border-bottom:1px solid var(--border);background:var(--band);cursor:move;user-select:none;}',
    '.brandwrap{display:flex;align-items:center;gap:11px;flex:0 1 auto;min-width:0;}',
    '.grip{display:grid;grid-template-columns:2px 2px;gap:2px 3px;flex:none;opacity:.5;}',
    '.grip i{width:2px;height:2px;background:var(--faint);display:block;}',
    /* 38px, not the toolkit's 34: the toolkit stretches its artwork to fill the
       box, this PNG carries transparent padding, so the box has to be larger for
       the mark itself to land at the same size. */
    '.logo{width:38px;height:38px;flex:none;display:block;border-radius:7px;}',
    '.brand{display:flex;flex-direction:column;gap:1px;min-width:0;}',
    '.eyebrow{font-family:' + MONO + ';font-size:11px;letter-spacing:.2em;color:var(--accent);line-height:1.3;}',
    '.brand h1{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.scpill{flex:none;font-family:' + MONO + ';font-size:10.5px;letter-spacing:.06em;',
    'padding:3px 7px;border-radius:4px;background:var(--chip);color:var(--con-fg);',
    'border:1px solid var(--con-bd);white-space:nowrap;}',
    '.hdr-gap{flex:1;min-width:0;}',
    '.hdr-right{display:flex;align-items:center;gap:10px;flex:none;}',
    '.user{display:flex;align-items:center;gap:7px;}',
    '.avatar{width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-size:9.5px;',
    'font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;}',
    '.wrap[data-theme="dark"] .avatar{color:#0d1117;}',
    '.uname{font-size:12px;color:var(--muted);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;}',
    '.vrule{width:1px;height:18px;background:var(--border);flex:none;}',
    /* These two carry the toolkit's decorative --border rather than --ctl-bd, at
       changed 27/08/2026 - the darker control border read as heavy
       against the header band. It is a deliberate 1.4.11 trade-off: both are
       named, filled and hoverable, so the boundary is not the only cue. Swap
       these two back to var(--ctl-bd) to restore 3:1. */
    '.themetog{display:flex;align-items:center;gap:2px;padding:2px;background:var(--inset);',
    'border:1px solid var(--border);border-radius:6px;flex:none;}',
    '.themetog button{width:26px;height:20px;border-radius:4px;display:flex;align-items:center;',
    'justify-content:center;color:var(--muted);}',
    '.themetog button[aria-pressed="true"]{background:var(--surface);color:var(--text);box-shadow:0 1px 2px rgba(0,0,0,.10);}',
    '.ghost{display:flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:5px;',
    'border:1px solid var(--border);font-size:12.5px;color:var(--muted);background:transparent;white-space:nowrap;flex:none;}',
    '.ghost:hover{background:var(--inset);color:var(--text);}',
    '.ghost[aria-expanded="true"]{background:var(--chip);border-color:var(--accent);color:var(--accent);}',
    '.winbtns{display:flex;align-items:center;gap:2px;flex:none;}',
    '.winbtns button{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;',
    'justify-content:center;color:var(--muted);border:1px solid transparent;}',
    '.winbtns button:hover{background:var(--inset);color:var(--text);}',

    /* ---- context bar ---- */
    '.ctx{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;',
    'padding:14px 16px 13px;border-bottom:1px solid var(--border);}',
    '.ctx .left{display:flex;flex-direction:column;gap:8px;min-width:0;}',
    '.ctx h2{margin:0;font-size:19px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.metaline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '.pill{font-family:' + MONO + ';font-size:10.5px;padding:3px 7px;border-radius:4px;background:var(--chip);color:var(--accent);}',
    '.meta{font-family:' + MONO + ';font-size:10.5px;color:var(--muted);}',
    '.actions{display:flex;gap:8px;flex:none;}',
    '.btn{display:flex;align-items:center;gap:7px;min-height:34px;padding:8px 13px;border-radius:6px;',
    'border:1px solid var(--ctl-bd);background:var(--surface);font-size:12.5px;font-weight:500;color:var(--text);white-space:nowrap;}',
    '.btn:hover{background:var(--inset);}',
    '.btn.pri{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;}',
    '.wrap[data-theme="dark"] .btn.pri{color:#0d1117;}',
    '.btn.pri:hover{background:var(--accent-hi);border-color:var(--accent-hi);}',
    '.btn[aria-pressed="true"]{background:var(--chip);border-color:var(--accent);color:var(--accent);}',

    /* ---- banner ---- */
    '.banner{flex:none;display:flex;gap:11px;padding:11px 16px;background:var(--warn-bg);border-bottom:1px solid var(--warn-bd);}',
    '.banner .rail{width:3px;flex:none;border-radius:2px;background:var(--warn-accent);}',
    '.banner.alt .rail{background:var(--fail-dot);}',
    '.banner p{margin:0;font-size:12.5px;line-height:1.55;color:var(--warn-fg);}',
    '.banner button{flex:none;font-size:11.5px;color:var(--warn-fg);text-decoration:underline;white-space:nowrap;align-self:flex-start;}',

    '.banner.err{background:var(--fail-bg);border-bottom-color:var(--fail-bd);}',
    '.banner.err .rail{background:var(--fail-dot);}',
    '.banner.err p{color:var(--fail-fg);}',
    '.pill.err{background:var(--fail-bg);color:var(--fail-fg);}',

    /* ---- not a Dynamics 365 page ---- */
    '.blocked{flex:1;min-height:0;overflow-y:auto;padding:26px 20px;}',
    '.bstate{max-width:540px;display:flex;flex-direction:column;gap:11px;}',
    '.bstate h3{margin:0;font-size:16px;font-weight:700;letter-spacing:-.01em;}',
    '.bstate p{margin:0;font-size:12.5px;line-height:1.6;color:var(--muted);}',
    '.bstate ol{margin:0;padding-left:19px;font-size:12.5px;line-height:1.75;color:var(--text);}',

    /* ---- body ---- */
    '.body{flex:1;min-height:0;display:flex;}',
    '.side{width:290px;flex:none;border-right:1px solid var(--border);display:flex;flex-direction:column;',
    'background:var(--band);overflow-y:auto;}',
    '.side .caption{flex:none;padding:13px 16px 6px;display:flex;align-items:baseline;justify-content:space-between;',
    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600;}',
    '.side .caption span{font-family:' + MONO + ';font-size:9.5px;letter-spacing:0;text-transform:none;font-weight:400;}',
    '.buckets{flex:none;padding:0 10px 12px;display:flex;flex-direction:column;gap:2px;}',
    /* Two numbers live on this row and they count different things: the one
       on the right counts CRITERIA, the line under the name counts ISSUES.
       They routinely disagree - one failing criterion carries several
       issues - so each number is labelled where it sits rather than being
       left for the user to work out from the list it opens. */
    '.bucket{display:flex;align-items:center;gap:10px;min-height:44px;padding:5px 9px 5px 8px;border-radius:6px;',
    'border-left:3px solid transparent;text-align:left;width:100%;}',
    '.bucket:hover{background:var(--inset);}',
    '.bucket[aria-pressed="true"]{background:var(--active);border-left-color:var(--accent);}',
    '.bucket .btxt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}',
    '.bucket .name{font-size:13px;color:var(--dim);}',
    '.bucket[aria-pressed="true"] .name{font-weight:600;color:var(--text);}',
    '.bucket .sub{font-size:10.5px;line-height:1.35;color:var(--muted);}',
    '.bucket[aria-pressed="true"] .sub{color:var(--dim);}',
    '.bucket .nbox{flex:none;display:flex;flex-direction:column;align-items:flex-end;}',
    '.bucket .n{font-family:' + MONO + ';font-size:13.5px;font-weight:600;color:var(--muted);line-height:1.15;}',
    '.bucket[aria-pressed="true"] .n{color:var(--text);}',
    '.bucket .nlab{font-size:9.5px;letter-spacing:.04em;color:var(--muted);}',
    '.gly{width:20px;height:20px;flex:none;border-radius:4px;font-size:11px;font-weight:700;',
    'display:flex;align-items:center;justify-content:center;border:1px solid transparent;}',
    '.t-fail{background:var(--fail-bg);border-color:var(--fail-bd);color:var(--fail-fg);}',
    '.t-review{background:var(--rev-bg);border-color:var(--rev-bd);color:var(--rev-fg);}',
    '.t-manual{background:var(--man-bg);border-color:var(--man-bd);color:var(--man-fg);}',
    '.t-clear{background:var(--ok-bg);border-color:var(--ok-bd);color:var(--ok-fg);}',
    '.t-cond{background:var(--con-bg);border-color:var(--con-bd);color:var(--con-fg);}',
    '.t-na{background:var(--inset);border-color:var(--border);color:var(--muted);}',
    '.t-all{background:var(--inset);border-color:var(--border);color:var(--text);}',
    '.t-info{background:var(--inset);border-color:var(--border);color:var(--muted);}',
    '.rule{flex:none;height:1px;background:var(--border);margin:0 16px;}',
    '.scopes{flex:none;padding:0 10px 12px;display:flex;flex-direction:column;gap:1px;}',
    '.scope{display:flex;align-items:center;gap:10px;min-height:34px;padding:0 8px;border-radius:6px;width:100%;text-align:left;}',
    '.scope:hover{background:var(--inset);}',
    '.box{width:16px;height:16px;flex:none;border-radius:3px;border:1.5px solid var(--off);',
    'display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;}',
    '.wrap[data-theme="dark"] .box{color:#0d1117;}',
    '.scope[aria-checked="true"] .box{background:var(--accent);border-color:var(--accent);}',
    '.box.radio{border-radius:50%;}',
    '.scope .name{flex:1;font-size:13px;color:var(--muted);}',
    '.scope[aria-checked="true"] .name{color:var(--text);}',
    '.scope .n{font-family:' + MONO + ';font-size:10px;color:var(--muted);}',
    '.spacer{flex:1;min-height:8px;}',
    '.keycard{flex:none;margin:0 12px 12px;padding:10px 11px;border:1px solid var(--border);',
    'border-radius:8px;background:var(--surface);display:flex;flex-direction:column;gap:6px;}',
    '.keycard h3{margin:0;font-size:11px;font-weight:600;letter-spacing:.02em;}',
    '.keys{display:flex;flex-wrap:wrap;gap:5px 8px;}',
    '.keys div{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);white-space:nowrap;}',
    'kbd{font-size:10px;padding:2px 5px;border:1px solid var(--border);border-radius:4px;color:var(--text);background:var(--inset);}',

    /* ---- right pane ---- */
    '.pane{flex:1;min-width:0;display:flex;flex-direction:column;}',
    '.toolbar{flex:none;display:flex;align-items:center;gap:10px;padding:10px 14px;',
    'border-bottom:1px solid var(--border);background:var(--band);}',
    '.search{display:flex;align-items:center;gap:8px;min-height:32px;flex:1;min-width:0;padding:0 10px;',
    'border:1px solid var(--ctl-bd);border-radius:6px;background:var(--surface);}',
    '.search input{flex:1;min-width:0;border:0;outline:0;background:none;font-size:12.5px;color:var(--text);padding:6px 0;}',
    '.search input::placeholder{color:var(--muted);}',
    '.seg{display:flex;align-items:center;gap:2px;padding:2px;background:var(--inset);border-radius:6px;flex:none;}',
    '.seg button{padding:5px 10px;border-radius:4px;font-size:11px;color:var(--muted);min-height:26px;}',
    '.seg button[aria-pressed="true"]{background:var(--surface);color:var(--text);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08);}',
    '.scroll{flex:1;min-height:0;overflow-y:auto;}',
    '.empty{padding:32px 16px;font-size:13px;color:var(--muted);text-align:center;}',
    '.listcap{margin:0;padding:8px 14px 2px;font-size:11px;color:var(--muted);}',

    /* ---- triage rows ---- */
    '.row{display:flex;gap:13px;padding:13px 14px;border-bottom:1px solid var(--hair);width:100%;text-align:left;align-items:flex-start;}',
    '.row:hover{background:var(--band);}',
    '.row[data-cur="1"]{background:var(--active);}',
    '.row .sevcol{flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:88px;}',
    '.sev{display:flex;align-items:center;gap:5px;padding:3px 8px 3px 6px;border-radius:5px;border:1px solid transparent;}',
    '.sev .g{font-size:10px;font-weight:700;}',
    '.sev .w{font-size:10.5px;font-weight:600;}',
    '.lvl{font-family:' + MONO + ';font-size:9.5px;padding:2px 6px;border:1px solid var(--border);border-radius:4px;color:var(--muted);}',
    '.row .mid{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px;}',
    '.row .head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}',
    '.row .sc{font-family:' + MONO + ';font-size:11.5px;font-weight:500;color:var(--accent);}',
    '.row .nm{font-size:13.5px;font-weight:600;letter-spacing:-.01em;}',
    '.row .desc{font-size:12.5px;line-height:1.5;color:var(--dim);margin:0;}',
    '.tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;}',
    '.tag{font-family:' + MONO + ';font-size:10px;padding:3px 7px;border-radius:4px;background:var(--inset);color:var(--dim);}',
    /* Who can fix it. Blue is yours to change, grey is Microsoft's and not
       actionable in your backlog, amber is unresolved. Deliberately not
       green - nothing here is a pass. */
    '.cbadge{display:inline-flex;align-items:center;gap:5px;font-family:' + MONO + ';font-size:10px;',
    'padding:3px 7px;border-radius:4px;border:1px solid transparent;white-space:nowrap;}',
    '.c-custom{background:var(--chip);border-color:var(--con-bd);color:var(--con-fg);}',
    '.c-platform{background:var(--man-bg);border-color:var(--man-bd);color:var(--man-fg);}',
    '.c-triage{background:var(--rev-bg);border-color:var(--rev-bd);color:var(--rev-fg);}',
    '.c-mixed{background:var(--inset);border-color:var(--border);color:var(--dim);}',
    '.cbadges{display:flex;flex-wrap:wrap;gap:6px;}',
    '.row .act{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:7px;width:136px;}',
    '.row .count{font-family:' + MONO + ';font-size:10.5px;color:var(--muted);}',
    '.mini{padding:6px 11px;border-radius:6px;border:1px solid var(--ctl-bd);font-size:11.5px;',
    'font-weight:500;color:var(--text);white-space:nowrap;background:var(--surface);min-height:28px;}',
    '.mini:hover{background:var(--inset);}',
    '.mini.quiet{color:var(--muted);font-weight:400;}',

    /* ---- summary ---- */
    '.sum{padding:16px;display:flex;flex-direction:column;gap:18px;}',
    '.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}',
    '.stat{padding:13px;border:1px solid var(--border);border-radius:9px;display:flex;flex-direction:column;gap:6px;}',
    '.stat .top{display:flex;align-items:center;gap:7px;}',
    '.stat .l{font-size:11.5px;font-weight:600;overflow-wrap:anywhere;}',
    '.stat .n{font-size:30px;font-weight:700;letter-spacing:-.03em;line-height:1;display:flex;',
    'flex-direction:column;align-items:flex-start;gap:5px;}',
    '.stat .n .u{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;',
    'color:var(--muted);white-space:nowrap;}',
    '.lead{font-size:12.5px;line-height:1.55;color:var(--muted);}',
    '.lead strong{color:var(--text);}',
    '.stat .d{font-size:11.5px;line-height:1.45;color:var(--muted);}',
    '.stat .gly{width:18px;height:18px;font-size:10px;background:var(--surface);}',
    '.s-fail{background:var(--fail-bg);border-color:var(--fail-bd);color:var(--fail-fg);}',
    '.s-review{background:var(--rev-bg);border-color:var(--rev-bd);color:var(--rev-fg);}',
    '.s-manual{background:var(--man-bg);border-color:var(--man-bd);color:var(--man-fg);}',
    '.s-clear{background:var(--ok-bg);border-color:var(--ok-bd);color:var(--ok-fg);}',
    '.caps{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600;}',
    '.prow{display:flex;align-items:center;gap:14px;}',
    '.prow .pl{width:130px;flex:none;font-size:13px;font-weight:500;}',
    '.track{flex:1;height:12px;border-radius:6px;background:var(--inset);display:flex;overflow:hidden;}',
    '.track i{display:block;height:100%;}',
    '.prow .leg{width:230px;flex:none;font-family:' + MONO + ';font-size:10px;color:var(--muted);text-align:right;white-space:nowrap;}',
    '.next{display:flex;align-items:center;gap:12px;padding:11px 13px;border:1px solid var(--ctl-bd);',
    'border-radius:8px;width:100%;text-align:left;background:var(--surface);}',
    '.next:hover{background:var(--band);}',
    '.next .t{display:block;font-size:13px;font-weight:600;}',
    '.next .d{display:block;font-size:12px;color:var(--muted);margin-top:2px;}',

    /* ---- detail ---- */
    '.detail{padding:16px;display:flex;flex-direction:column;gap:15px;}',
    '.dhead{display:flex;align-items:flex-start;gap:12px;}',
    '.dtitle{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;}',
    '.dtitle .sc{font-family:' + MONO + ';font-size:13px;font-weight:500;color:var(--accent);}',
    '.dtitle h3{margin:0;font-size:19px;font-weight:700;letter-spacing:-.02em;}',
    '.dwhy{font-size:13px;line-height:1.6;color:var(--dim);margin:7px 0 0;max-width:70ch;}',
    '.captionrow{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}',
    '.elbox{border:1px solid var(--border);border-radius:8px;overflow:hidden;}',
    '.el{display:flex;align-items:center;gap:13px;padding:10px 12px;border-bottom:1px solid var(--hair);width:100%;text-align:left;background:var(--surface);}',
    '.el:last-child{border-bottom:0;}',
    '.el:hover{background:var(--band);}',
    '.el .info{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px;}',
    '.el .lab{display:block;font-size:13px;font-weight:500;overflow-wrap:anywhere;}',
    '.el .sch{display:block;font-family:' + MONO + ';font-size:10px;color:var(--dim);overflow-wrap:anywhere;}',
    '.el .ev{flex:none;font-family:' + MONO + ';font-size:10px;color:var(--muted);max-width:240px;text-align:right;overflow-wrap:anywhere;}',
    '.cols{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;}',
    '.card{flex:1;min-width:260px;padding:14px;border:1px solid var(--border);border-radius:8px;',
    'background:var(--band);display:flex;flex-direction:column;gap:9px;}',
    '.card.ref{flex:none;width:246px;background:var(--surface);}',
    '.card h4{margin:0;font-size:12.5px;font-weight:700;}',
    '.step{display:flex;gap:9px;font-size:12.5px;line-height:1.55;color:var(--dim);}',
    '.step .n{flex:none;width:17px;height:17px;border-radius:50%;background:var(--chip);color:var(--accent);',
    'font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:2px;}',
    '.card p{margin:0;font-size:12px;line-height:1.55;color:var(--dim);}',
    '.card small{font-size:11.5px;line-height:1.5;color:var(--muted);}',
    '.card a{font-size:12px;color:var(--accent);text-decoration:none;border-bottom:1px solid currentColor;}',
    '.hair{height:1px;background:var(--hair);}',
    /* What was found, what the criterion asks for, and why the two do not
       meet. Kept as its own block above the elements list because it is the
       part a developer has to be able to paste into a defect. */
    '.wbox{border:1px solid var(--border);border-radius:8px;background:var(--band);display:flex;flex-direction:column;}',
    '.wrow{padding:11px 13px;border-bottom:1px solid var(--hair);display:flex;flex-direction:column;gap:5px;}',
    '.wrow:last-child{border-bottom:0;}',
    '.wk{font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--muted);font-weight:600;}',
    '.wrow p{margin:0;font-size:12.5px;line-height:1.6;color:var(--dim);max-width:80ch;}',

    /* ---- report and about ---- */
    'textarea{width:100%;height:260px;font-family:' + MONO + ';font-size:10.5px;padding:9px;',
    'border:1px solid var(--ctl-bd);border-radius:6px;background:var(--surface);color:var(--text);resize:vertical;}',
    /* The popover is capped to the panel and scrolls its own body, so it stays
       readable when the panel is dragged down to its 380px minimum height. */
    '.pop{position:absolute;top:64px;right:14px;width:430px;max-width:calc(100% - 28px);z-index:30;',
    'max-height:calc(100% - 80px);display:flex;flex-direction:column;',
    'background:var(--surface);border:1px solid var(--border);border-radius:10px;',
    'box-shadow:var(--shadow);overflow:hidden;}',
    '.pop .phead{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;',
    'padding:11px 14px;background:var(--band);border-bottom:1px solid var(--border);}',
    '.pop .plockup{display:flex;align-items:center;gap:10px;min-width:0;}',
    /* 58px, twice the 29px square this used to be, and the artwork now carries
       the wordmark, so the width follows the aspect ratio rather than being
       squared off. No corner radius - it is a transparent mark, not a tile. */
    '.pop .plockup img{height:58px;width:auto;flex:none;display:block;}',
    '.pop .ptitles{display:flex;flex-direction:column;gap:1px;min-width:0;}',
    /* The badge and the version sit under the name, not beside it: the popover is
       a fixed 430px and the full product name plus the close button already fill
       that row. */
    '.pop .pmeta{display:flex;align-items:center;gap:8px;margin-top:5px;}',
    '.pop .pname{display:flex;align-items:baseline;gap:8px;min-width:0;}',
    '.pop .pname h4{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;}',
    '.pop .pmeta .v{font-family:' + MONO + ';font-size:12px;color:var(--muted);white-space:nowrap;}',
    '.pop .pclose{width:26px;height:26px;border-radius:6px;flex:none;display:flex;align-items:center;',
    'justify-content:center;color:var(--muted);}',
    '.pop .pclose:hover{background:var(--inset);color:var(--text);}',
    '.pop .pbody{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;',
    'gap:12px;font-size:13.5px;line-height:1.55;color:var(--text);}',
    '.pop .psite{align-self:flex-start;margin-top:5px;font-size:12px;color:var(--accent);',
    'text-decoration:none;border-bottom:1px solid currentColor;}',
    '.pop .pline{display:flex;gap:10px;}',
    '.pop .pline .rail{flex:none;width:3px;border-radius:2px;background:var(--accent);}',
    '.pop .pline .txt{min-width:0;}',
    '.pop .pdiv{height:1px;background:var(--border);margin:2px 0;}',

    /* ---- modal ---- */
    /* Replaces the browser confirm() the deep mode button used to raise. A
       native dialog cannot say what deep mode is, cannot be styled, and in a
       D365 tab it reads as the page having gone wrong. This one lives inside
       the shadow root and covers only the panel. */
    '.scrim{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;',
    'padding:18px;background:rgba(12,14,18,.48);}',
    '.modal{width:560px;max-width:100%;max-height:100%;display:flex;flex-direction:column;',
    'background:var(--surface);border:1px solid var(--border);border-radius:11px;',
    'box-shadow:var(--shadow);overflow:hidden;}',
    '.modal .mhead{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;',
    'padding:12px 15px;background:var(--band);border-bottom:1px solid var(--border);}',
    '.modal .mhead h3{margin:0;font-size:15px;font-weight:700;letter-spacing:-.01em;}',
    '.modal .mbody{flex:1;min-height:0;overflow-y:auto;padding:15px;display:flex;',
    'flex-direction:column;gap:13px;}',
    '.modal .mbody p{margin:0;font-size:12.5px;line-height:1.6;color:var(--dim);}',
    '.modal .mfoot{flex:none;display:flex;justify-content:flex-end;gap:9px;padding:11px 15px;',
    'border-top:1px solid var(--border);background:var(--band);}',
    '.cmp{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
    '.cmp .col{border:1px solid var(--border);border-radius:8px;padding:11px;background:var(--band);',
    'display:flex;flex-direction:column;gap:7px;}',
    '.cmp .col.hot{background:var(--chip);border-color:var(--con-bd);}',
    '.cmp h5{margin:0;font-size:11.5px;font-weight:700;color:var(--text);}',
    '.cmp ul{margin:0;padding-left:15px;display:flex;flex-direction:column;gap:4px;}',
    '.cmp li{font-size:12px;line-height:1.5;color:var(--dim);}',
    '.mwarn{display:flex;gap:10px;padding:11px;border-radius:8px;background:var(--warn-bg);',
    'border:1px solid var(--warn-bd);}',
    '.mwarn .rail{width:3px;flex:none;border-radius:2px;background:var(--warn-accent);}',
    '.mwarn div{font-size:12.5px;line-height:1.55;color:var(--warn-fg);}',

    /* ---- WCAG reference ---- */
    '.wcag{padding:16px;display:flex;flex-direction:column;gap:12px;}',
    '.wintro{margin:0;font-size:12.5px;line-height:1.6;color:var(--muted);max-width:84ch;}',
    '.wc{border:1px solid var(--border);border-radius:9px;overflow:hidden;background:var(--surface);}',
    '.wchead{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:10px 13px;',
    'background:var(--band);border-bottom:1px solid var(--border);}',
    '.wchead h3{margin:0;font-size:14px;font-weight:700;letter-spacing:-.01em;}',
    '.wchead .sc{font-family:' + MONO + ';font-size:12px;font-weight:500;color:var(--accent);}',
    '.wchead .spread{flex:1;min-width:0;}',
    '.wcrow{padding:10px 13px;border-bottom:1px solid var(--hair);display:flex;gap:14px;align-items:baseline;}',
    '.wcrow:last-child{border-bottom:0;}',
    '.wcrow .wk{flex:none;width:158px;}',
    '.wcrow p{margin:0;min-width:0;font-size:12.5px;line-height:1.6;color:var(--dim);}',
    '.wclinks{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px 13px;',
    'border-top:1px solid var(--border);background:var(--band);}',
    '.wclinks a{font-size:12px;color:var(--accent);text-decoration:none;border-bottom:1px solid currentColor;}',
    '.wclinks .mono{font-size:10.5px;color:var(--muted);}',

    /* ---- footer ---- */
    'footer{flex:none;height:34px;display:flex;align-items:center;gap:10px;',
    'padding:0 30px 0 22px;border-top:1px solid var(--border);background:var(--band);',
    'font-family:' + MONO + ';font-size:12px;color:var(--muted);}',
    'footer span{font-family:' + MONO + ';}',
    'footer .note{flex:1 3 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    'footer .ver{flex:none;}',
    '.orgchip{display:flex;align-items:center;gap:6px;flex:0 1 auto;min-width:0;height:20px;',
    'padding:0 8px;border-radius:10px;border:1px solid transparent;box-sizing:border-box;}',
    '.orgchip .host{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.orgchip.live{background:var(--ok-bg);border-color:var(--ok-bd);color:var(--ok-fg);}',
    '.dot{width:7px;height:7px;border-radius:4px;background:var(--off);flex:none;}',
    '.orgchip.live .dot{background:var(--ok-dot);}',

    /* ---- resize grips ---- */
    /* Both bottom corners, as the toolkit has them. The left one holds the
       right edge still, which is what a docked panel wants; the right one is
       the ordinary bottom-right resize and it undocks. */
    '.gripc{position:absolute;bottom:0;width:18px;height:18px;font-size:13px;line-height:17px;',
    'color:var(--grip);user-select:none;z-index:6;box-sizing:border-box;}',
    '.gripc.se{right:0;padding-right:4px;text-align:right;cursor:nwse-resize;}',
    '.gripc.sw{left:0;padding-left:4px;text-align:left;cursor:nesw-resize;}',

    /* ---- narrow panel ---- */
    '@container (max-width:820px){',
    '.side{width:230px;}',
    '.stats{grid-template-columns:repeat(2,1fr);}',
    '.row .act{width:110px;}',
    /* Only the header runs out of room. The About popover has space for its
       badge at every width, so the rule is scoped rather than global. */
    'header.bar .scpill{display:none;}',
    '.prow .leg{display:none;}',
    '.cmp{grid-template-columns:1fr;}',
    '.wcrow{flex-direction:column;gap:4px;}',
    '.wcrow .wk{width:auto;}',
    '}'
  ].join('');


  /* ------------------------------------------------------------------ */
  /* 10. Panel - state, geometry and rendering                          */
  /* ------------------------------------------------------------------ */

  /* The About lockup uses the full mark with the wordmark under it, at twice
     the size the old 29px square ran at. Source artwork lives in
     assets/brand/ - these are 168px-tall, 128-colour reductions of it, which
     is enough for a 58px render on a 2x display and costs about 4.5 KB each.
     Light-background art has the navy wordmark; dark-background art has the
     white one. Regenerate from assets/brand/ if the brand changes. */
  var ABOUT_LOGO_H = 168;
  var ABOUT_LOGO_LIGHT = 'data:image/png;base64,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';
  var ABOUT_LOGO_DARK = 'data:image/png;base64,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';

  var LOGO_LIGHT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAALXklEQVR4nO1ZeXBdVRn/fefc+5I0y0ta04WyFOlmI1QJWLC1QUXWEdlS7GIBmbJohaGOwIiaRgVGBUYtyliWOoDANOzTIs4AbSyWSrUL0oVCKW3SLWmSJk3edu85n/Od+166JW1acPwnZ+bMfe/de8/5/b7vd77vO+cB/a2/9bf+9v9sdIzPK6CagDrzP8ID1LBCBQhTKJqjhj0gnAyoKQhsHPf6Uw983DuGoRUAC9QBqNafOomaGoX1cwm1WeB386kApiO0V4PUGShQhJA/OvS1PhLIAh44fjg0nYLmuuWfHgkm1ECjlkKgFriTx0PhNjCqkY8iGAWExiApj8L0ZNW+gR/+hVEU898kz/8HhlTOjsDLvWOW4cFyAbEDfxuPwBwzH9a+Aw/Xw3IRkjaDjA3F7yDonqY6CoEaFYGfMIps7A1WejQzAtL+PAw9676IRNXxkahiD7Vk3fXW8A6QXQVfzYKFh5TNwLIBwwNDgYndDIT0sRBQQC3jhLMHkeXFUN5JYMoASrHlDOnYXRhSeQ9QH2ZJHINkWKGeQszKnI0Kuwy+/hUMlSFlMk4oAtwyOcuzeyd61XJHXwlQFG1kNvUUdGwUW2RAygNpAinN1gqJH2NI5Q+yJI6+nqoX6qxkLG7I3AXSy6DVOeSA28jihsnhlW6zwCnnAWo6dMheJq2OpDPsnDug/IsErAMfWVAGIsBqMAdE6rc8pPI/2F2/9IgLW6RSRyGq9w5ESfFjyFeXIzAWoQmYnMUBRZEWmcVy2emERPYLY1sfPOB0b3HCl8cQqVq2HAIqu4BkzUWvkMwm05AiAj0lUgPquMcxBbxIZmZLBYoHLIOnLkcqEKszjNEwdr+1GWCRzoFdbCZX8MY+EFjvpAPYX0H5+YCyYvKIgFyyRBwLrcAIoLzhFIYPRtM56R1gjyz46XsugCr4O8DjkNqXgc14MBkS5UCiI1sQW7BYPKf9LBKErJEBw/KGQ9H2HD2GTagk8layG1mpCHC3Hh1Ocq61kbmsMWDjM9uJaF6zP0fkLD+9eQZ03gJw6MGaAETaOVApkKcBnfWsjO2Ls+We9EhNUFoDphXQFbifdh3FA04es1kWKztb7Aef/Uzdvs72XLPmZ9GHcdxt+RnNNyI24EmYBCHoCmEzGggAGwI2ANtQOoEDcvYSj4gnjAVbmYusZAAYev9Q8D0vYtEy20vAJps89hNwazcbIg5YWvJdg01IwIVcNm4Sbp273CWnac03I1b0MFJ7QgqTRGJyrcFWQrsCrGAWG2mG5LScQZxHZEG7PMfwlZhyeU/GPpyApa+C1GCwmEIgW7AAl7Gd9SMC5MQqBpJ3rI1ucQZ+PM+FyWnbZ6Gg8GF07ghV2EXWKhKbCAFoiq7KmdbBYNbZNSBeyEpKniGlEPgEa1/vEwECV0VE2JISDwjyXHg7UE45CZnoV3nAK/g2mt5+A9Mbp6CgdD72NYSqaw9Zq6k4noey4hiYLZo6LNJhGAFkHclJPENCzouIOXKWWed5SCSb4Rf06IEe1gBXZONY1shCKgoLTjhyL+rkwEfrxIPO+y6aVr6Iaz44DwMGPYHORqP3bYXtStBpQ4FVD4yhDb8bQ5seGksTTlNAohPapgATdQpTIJMEgiQoTANhGhwGBhRjhJm/YR51oFrYHlVC9gQXBViEk1N6pHYnJ87JyBnIgCjGTHdi1ztPYOrGsYiPWIiOj2OqZZ0xgVLlAwuwqLaCRg4rQBgaeJ4C2bQDitBpCuT5YKslwYOUidQreVNbRalO4kTXUz1Zv2cCbAsisJEuXBzIxX8Xq7slFEbg7Xw0r/o1Ll1UhkFjFqJzV7nasTwAezrf9/HizyfS2BOLkMmEUBKR3ZspIExEBEgSepQrmaRS8QC5enmWoTV3Nr2PQR1vOjB1UTo7soTYhmLlqHfLpTu8ZbvMHGNrVqDyl7c6vidd/DjC1Om0+eWMsiltMwk8XTMBEys+g3QmhCclVG6KQAh0ORIUJkEiIZMGrMhGrgGQ7rKUlvBqHsH8swJULdWHxPPePMDtUjtJEOaoXDjgppOWOEXBhm0oGDgDr12Sxk2ZuxFTl9Pav2Q80+kFCcJDP/0GXTHpZPdWXkzyl3COxuIwmdU+nISiTByLjKQtyASWQ/KgzG5w7HFn/frDNzM9eoCt+QgSFZ0LjJOMeILlNykY2QgzzezNRsOSzbiu6SuI+bW08aXAS+3QQVsCd914Fn3/ytPdeGs2bMXW7c0umeaCAssaMF2ASUREZD0EicgTib1AZ6sliinY1ANYfEZbZP0s+6NLiNdEJUI2I2ZJRGHTGAL5sGYhWv79NC56sgSx8kfRuEp7LSsoaEvRtdeMp/tumeyG2tLYjG/dcB93dqWiUJur12QNGAGcBFyPIhF3NQPJVtG5z+mWzVCtf3B75frzet26Hk5AYQWsYVgpl0X7ke5J8rpkF7YtKBxyu3u2fNq96OoY7TU8nwn2BurCr4/Go3df6m7t7Ujgm9/5CW9r2IGS4oKDbeSsnoi6hNKwE+jcDkq1CTuZlGASc7DosgTWV1Bv1u+ZAIJ3wHaH5H1XjLjQ6bolkpzvz0XD6zswZftEmPAWb8uCIGxt12eeOQILf3MNeVKcAZh681xet2YDykrzIv0fOKlNy74RSmqiVCvQ/jGQ2iurO4TyY5xqeQZLrnrFbYDqphzx4OBwAq0fdjCzpG0W0Yt8SK6AxyZch4GTHgEqfaiSB1VLvQp3rsUppw6lVx6aSSWF+ejY14VLp87h1555wWm7becuWT8HVb17Wlop3NmITONGoKMBEEnZwMAGMaRaPobl2U46det6tXyu9bYNfALM1wpBF3Tc9FJd+b/Ah/PSuKJhpkrt+hJveTEoGzRQv/LH62n44LgriXbuasL4z52KyfNqkQlC5PkKZaXFkbUkqAH40czJ2H3BWOxuacfvn1wqQc1CxRRMOsUmNQUr57TipOM/tiHZ31J85FoqHW0RH5Wi0jFM8THrMK46hqoF+XTZhg3q7PttbOS1weL69ywz20QiZdPpjPvcUzfGdPfcb0+//JZB+ZWBP+6mgD5/O2PcD692CKpq+nzg1sMakBOG+pBZ3euq0WzsY9IPY31dBoXjr6DOzWPtntVhfPAgdcnkCvdWQUEeYjH/6DPuFwU/tvANC8WK2Xic7rgO6x94zoGvrw37SqAHpnLCAIWOTc8hPvJfUKoSbFqRn7fQ3U42fY9bV7CU9unEPix49lWUFBU4+eRaRJulOnZF5cVfOxeFhQO6F/Nf31yJ7dubw3+u3hBDgR/YsHMGPnj2mWMF7+bq5fcoPZaNnkRMy9jyC+jYdBXOX3o62t9dTW1vk5w3oXMrsK892pBHC2X/sPJdap3iAdi6+iU6+cRhMMa4XD5iwrSw4b1tMTW0vJE8f6bZ/MISVFV5qHfGO6bWm9aiMrFt01so+exzIG+lQ9W+6Wrq2qIRJjKUbPJg0tDFA7KYuzea0T5HalljUVRUAC07rOwZg9LaH1gWj+0s8RYPLc2/qXFt3XZ3pnQc4I9EIDchMZlZ8HxByUhuvYCTW0FdjSTgZQNiAqlx5HDiYA84GRnLJvRltyYe1dJCYxuGlhfds7b5rT81NsuzLtocF/hopr62c58fjN3Pv4/294opTFkoT9JjlCXlbEgA78+YpJT2pDYriRdh25pXES8p3BQEwZ+TyeT8eDzeImtEWtZQx936EK7kyLDeoPHZ8ZTeVgqpJElrt3fN7RUiyN3bHlc5WclO2KQJy3Y1NS+KlxQuicVi7nC2urpaE7n/AfiTgI9m69szjNIvngLuuooIFWCczGzLQTSA3JEjCbB2kNoJoo8Y/C5Yr8L5Y9ejbn8yYpZ/W2DEW58UeH/rb/2tv/U3fBrtvyxpIPLNz6C5AAAAAElFTkSuQmCC';
  var LOGO_DARK  = 'data:image/png;base64,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';

  function store(k, v) {
    try {
      if (v === undefined) {
        var raw = localStorage.getItem(STORE + k);
        return raw === null ? undefined : JSON.parse(raw);
      }
      localStorage.setItem(STORE + k, JSON.stringify(v));
    } catch (e) {}
    return undefined;
  }

  /* ---- geometry -------------------------------------------------------
     The panel floats over the form in every window state. It is inset from
     all four viewport edges, so the shadow reads as a lift rather than as a
     border and no corner is ever squared off against an edge. One function
     turns state into pixels; everything that moves or resizes the panel
     writes that state and calls applyGeometry.                            */

  var PANEL_INSET = 16;           /* gap to every viewport edge            */
  var MIN_W = 560, MIN_H = 380;   /* the sidebar and the pane need this    */
  var HEADER_H = 56;
  var MINI_SCALE = 0.5;           /* collapsed width, as a share of open   */
  var MINI_MIN_W = 300;
  var DOCK_SNAP = 32;             /* how near the right edge re-docks      */

  var DEFAULT_W = Math.min(980, Math.round(window.innerWidth * 0.72));

  var ui = {
    theme: store('theme') || 'light',
    view: 'summary',
    bucket: 'fail',
    scope: { form: true, command: true, grid: true },
    /* Which side of the Microsoft line the user wants to look at. Like the
       scope tickboxes this is a reading filter, so the bucket counts follow
       it and the sidebar never disagrees with the list it opens. */
    comp: 'all',
    query: '',
    wq: '',
    modal: null,
    sort: 'severity',
    detail: null,
    banner: true,
    about: false,
    report: null,
    mode: 'normal',
    cursor: 0,
    /* Deliberately NOT restored from storage: a reload puts the panel back in
       the dock at its default size. Moves and resizes last for the life of the
       page only. */
    geo: { docked: true, w: DEFAULT_W, h: 0, top: 0, left: 0 }
  };
  if (!ui.geo.w || ui.geo.w < MIN_W) ui.geo.w = Math.max(MIN_W, DEFAULT_W);

  var issues = [];

  var host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-a11y-tool', 'true');
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  function clampN(v, lo, hi) {
    if (hi < lo) return lo;
    return Math.max(lo, Math.min(hi, v));
  }

  /* The inset shrinks on a small viewport rather than eating a fixed 32px of
     a 420px-tall window. */
  function insetFor() {
    return Math.max(0, Math.min(PANEL_INSET,
      Math.floor(Math.min(window.innerWidth, window.innerHeight) / 12)));
  }

  /* The collapsed width for a panel of this open width - its own floor, since
     the bar has none of the columns MIN_W exists for. */
  function miniWidth(openW) {
    return clampN(Math.round(openW * MINI_SCALE), Math.min(MINI_MIN_W, openW), openW);
  }

  function geometryFor(mode) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var inset = insetFor();
    var roomW = Math.max(MIN_W, vw - inset * 2);
    var roomH = Math.max(MIN_H, vh - inset * 2);
    if (mode === 'max') return { left: inset, top: inset, w: roomW, h: roomH };

    var g = ui.geo;
    var w = clampN(g.w || DEFAULT_W, MIN_W, roomW);
    var box;
    if (g.docked !== false) {
      /* Docked is full height unless the bottom-left grip has set one. */
      box = {
        left: Math.max(inset, vw - w - inset), top: inset, w: w,
        h: g.dockedH ? clampN(g.dockedH, MIN_H, roomH) : roomH
      };
    } else {
      var h = clampN(g.h || Math.min(860, roomH), MIN_H, roomH);
      box = {
        left: clampN(g.left, inset, Math.max(inset, vw - w - inset)),
        top: clampN(g.top, inset, Math.max(inset, vh - h - inset)),
        w: w, h: h
      };
    }
    if (mode === 'min') {
      /* The header and its two borders, and half the width, anchored on the
         top right corner of where the open panel was: the right edge is the
         edge the panel docks to and the edge the window controls sit on, so
         shrinking towards the left would walk the close button across the
         screen every time. */
      var right = box.left + box.w;
      box.h = HEADER_H + 2;
      box.w = miniWidth(box.w);
      box.left = clampN(right - box.w, inset, Math.max(inset, vw - box.w - inset));
      box.top = clampN(box.top, inset, Math.max(inset, vh - box.h - inset));
    }
    return box;
  }

  function applyGeometry() {
    var b = geometryFor(ui.mode);
    host.style.cssText = 'position:fixed;z-index:2147483647;left:' + b.left + 'px;top:' + b.top +
      'px;width:' + b.w + 'px;height:' + b.h + 'px;';
    return b;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --- row model ---------------------------------------------------- */

  function scopeOk(g) {
    /* Page-level issues are never filtered out. Unticking a region must not
       be able to hide a whole-page failure such as a missing lang attribute. */
    if (g.regionList.indexOf('page') > -1) return true;
    for (var i = 0; i < g.regionList.length; i++) if (ui.scope[g.regionList[i]]) return true;
    return false;
  }
  /* The findings the current scope is showing. Drives the bucket counts and
     the criterion rows so the numbers in the sidebar always match the list. */
  function scopedFindings() {
    return findings.filter(function (f) {
      return (f.region === 'page' || ui.scope[f.region]) && compOk(f);
    });
  }
  /* Unlike the scope tickboxes, this one DOES hide page-level findings.
     Asking for customisable components only is a deliberate request to see
     nothing but your own work, and the page shell is not your work. */
  function compOk(f) { return ui.comp === 'all' || f.cls === ui.comp; }
  function compOkIssue(g) {
    return ui.comp === 'all' || (g.classes && g.classes[ui.comp] > 0);
  }
  function queryOk(text) {
    if (!ui.query) return true;
    return text.toLowerCase().indexOf(ui.query.toLowerCase()) > -1;
  }

  function rows() {
    var out = [];
    var sf = scopedFindings();
    var b = ui.bucket;
    var wantIssue = (b === 'all' || b === 'fail' || b === 'review');
    if (wantIssue) {
      var list = issues.filter(function (g) {
        if (g.severity === 'info') return false;
        if (b !== 'all' && g.severity !== b) return false;
        if (!scopeOk(g)) return false;
        if (!compOkIssue(g)) return false;
        var hay = g.sc + ' ' + g.name + ' ' + g.message + ' ' + g.why + ' ' +
          g.elements.map(function (f) { return f.label + ' ' + f.schema; }).join(' ');
        return queryOk(hay);
      });
      sortIssues(list, ui.sort).forEach(function (g) { out.push({ kind: 'issue', g: g, key: g.key }); });
    }
    var wantCrit = (b === 'all' || b === 'manual' || b === 'clear' || b === 'cond' || b === 'na');
    if (wantCrit) {
      CRITERIA.forEach(function (c) {
        var s = statusFor(c, sf);
        if (s === 'fail' || s === 'review') return;
        if (b !== 'all' && s !== b) return;
        if (!queryOk(c[0] + ' ' + c[1] + ' ' + c[4])) return;
        out.push({ kind: 'criterion', c: c, status: s, key: 'c|' + c[0] });
      });
    }
    return out;
  }

  function scopeCounts() {
    var out = { form: 0, command: 0, grid: 0 };
    findings.forEach(function (f) { if (out[f.region] !== undefined) out[f.region]++; });
    return out;
  }
  function compCounts() {
    var out = { all: 0, custom: 0, platform: 0, triage: 0 };
    findings.forEach(function (f) {
      out.all++;
      if (out[f.cls] !== undefined) out[f.cls]++;
    });
    return out;
  }
  /* Issues, not criteria - one row of the triage list each, filtered exactly
     as that list filters minus the search box. This is the number the
     sidebar prints under each bucket name, because the number beside it
     counts criteria and the two are not the same thing. */
  function issueCounts() {
    var out = { all: 0, fail: 0, review: 0, allSc: 0 };
    var scs = {};
    issues.forEach(function (g) {
      if (g.severity === 'info') return;
      if (!scopeOk(g) || !compOkIssue(g)) return;
      out.all++;
      scs[g.sc] = 1;
      if (out[g.severity] !== undefined) out[g.severity]++;
    });
    out.allSc = Object.keys(scs).length;
    return out;
  }

  /* The one sentence the panel says in three places - the sidebar, the
     Overview and the top of the triage list - so the two numbers never look
     like they disagree. Issues are what the list shows; criteria are what
     every count in the sidebar and every tile on the Overview is measured in. */
  function issuesAcross(n, nsc) {
    if (!n) return 'No issues found by the automated checks';
    return n + (n === 1 ? ' issue' : ' issues') + ' found across ' +
      nsc + (nsc === 1 ? ' WCAG criterion' : ' WCAG criteria');
  }

  /* The same sentence without the word "found", for the places that sit
     directly under a number - the Fail and Needs review rows in the sidebar
     and their two tiles on the Overview. `nsc` is the number printed beside
     it, so the line says out loud what that number counts. Rule, set
     29/08/2026: the rows with no issues behind them - Manual, No issues
     detected, Conditional, Not applicable - keep their own wording, because
     "0 issues across 9 WCAG criteria" says nothing useful. */
  function acrossLine(n, nsc) {
    return n + (n === 1 ? ' issue' : ' issues') + ' across ' +
      nsc + (nsc === 1 ? ' WCAG criterion' : ' WCAG criteria');
  }

  /* --- fragments ---------------------------------------------------- */

  function glyph(kind, cls) {
    var g = { fail: '✕', review: '!', manual: '◐', clear: '✓', cond: '◇', na: '–', all: '≡', info: 'ⓘ' }[kind] || '·';
    return '<span class="gly t-' + (cls || kind) + '" aria-hidden="true">' + g + '</span>';
  }

  /* Window chrome, drawn as strokes so every icon takes the button colour.
     Same set and same paths as the Oliver4 toolkit: a single rule for
     collapse, the bar dropping back out from under it for reopen, corner
     brackets out and in for maximise and restore. */
  var ICON = {
    collapse: ['M3.5 8h9'],
    reopen: ['M3.5 4.4h9', 'M8 7.1v4.5', 'M5.4 9L8 11.6 10.6 9'],
    expand: ['M6.6 3.2H3.2v3.4', 'M3.2 3.2L6.9 6.9', 'M9.4 12.8h3.4V9.4', 'M12.8 12.8L9.1 9.1'],
    restore: ['M3.4 6.9h3.4V3.5', 'M6.8 6.9L3.1 3.2', 'M12.6 9.1H9.2v3.4', 'M9.2 9.1l3.7 3.7'],
    sun: ['M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z', 'M8 1.9v1.4', 'M8 12.7v1.4',
      'M1.9 8h1.4', 'M12.7 8h1.4', 'M3.7 3.7l1 1', 'M11.3 11.3l1 1', 'M12.3 3.7l-1 1',
      'M4.7 11.3l-1 1'],
    moon: ['M12.6 9.8A5 5 0 0 1 6.2 3.4 5.1 5.1 0 1 0 12.6 9.8z'],
    info: ['M8 2.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6z', 'M8 7.3v3.6', 'M8 5.2h.01'],
    close: ['M4 4l8 8', 'M12 4l-8 8']
  };

  function ico(paths, size) {
    return '<svg viewBox="0 0 16 16" width="' + (size || 13) + '" height="' + (size || 13) +
      '" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:block;flex:none">' +
      paths.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
  }

  function logoSrc() { return ui.theme === 'dark' ? LOGO_DARK : LOGO_LIGHT; }

  function hdrHtml() {
    /* Collapsed, the bar is half width, so the theme switch, About and the
       identity chip go with the body: none of them acts on anything you can
       see while the panel is a bar, and the room they take is the room the
       tool's own name needs. What is left is the mark, the name and the three
       window controls. */
    var mini = ui.mode === 'min';
    var maxed = ui.mode === 'max';
    return '<header class="bar" part="drag">' +
      '<div class="brandwrap">' +
        '<span class="grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
        '<img class="logo" alt="" src="' + logoSrc() + '">' +
        '<span class="brand"><span class="eyebrow">OLIVER4</span>' +
        '<h1>Dynamics 365 Accessibility Checker</h1></span>' +
        (mini ? '' : '<span class="scpill">WCAG 2.2 AA</span>') +
      '</div>' +
      '<span class="hdr-gap"></span>' +
      '<div class="hdr-right">' +
        (!mini && userName ? '<span class="user"><span class="avatar" aria-hidden="true">' + esc(userInitials) + '</span>' +
          '<span class="uname">' + esc(userName) + '</span></span><span class="vrule"></span>' : '') +
        (mini ? '' : '<div class="themetog" role="group" aria-label="Colour theme">' +
          '<button data-act="theme" data-theme="light" aria-pressed="' + (ui.theme === 'light') + '" title="Light theme">' +
          ico(ICON.sun) + '<span class="sr">Light theme</span></button>' +
          '<button data-act="theme" data-theme="dark" aria-pressed="' + (ui.theme === 'dark') + '" title="Dark theme">' +
          ico(ICON.moon) + '<span class="sr">Dark theme</span></button></div>') +
        (mini ? '' : '<button class="ghost" data-act="about" title="About this tool" aria-expanded="' +
          (ui.about ? 'true' : 'false') + '">' + ico(ICON.info) + '<span>About</span></button>') +
        '<div class="winbtns">' +
          '<button data-act="min" title="' + (mini ? 'Expand the panel' : 'Collapse to the header') +
            '" aria-pressed="' + (mini ? 'true' : 'false') + '">' + ico(mini ? ICON.reopen : ICON.collapse) +
            '<span class="sr">' + (mini ? 'Expand the panel' : 'Collapse to the header') + '</span></button>' +
          '<button data-act="max" title="' + (maxed ? 'Restore the panel size' : 'Grow the panel over the form') +
            '" aria-pressed="' + (maxed ? 'true' : 'false') + '">' + ico(maxed ? ICON.restore : ICON.expand) +
            '<span class="sr">' + (maxed ? 'Restore the panel size' : 'Grow the panel over the form') + '</span></button>' +
          '<button data-act="close" title="Close">' + ico(ICON.close) +
            '<span class="sr">Close the accessibility checker</span></button>' +
        '</div>' +
      '</div></header>';
  }

  function aboutLogoSrc() { return ui.theme === 'dark' ? ABOUT_LOGO_DARK : ABOUT_LOGO_LIGHT; }

  function aboutHtml() {
    /* A popover anchored under the header has nothing to sit against once the
       panel is a bare header, so it closes with the panel. The lockup now
       carries the wordmark, so the OLIVER4 eyebrow that used to sit above the
       product name has gone - it was saying the same thing twice. */
    if (!ui.about || ui.mode === 'min') return '';
    function line(text) {
      return '<div class="pline"><span class="rail" aria-hidden="true"></span>' +
        '<div class="txt">' + text + '</div></div>';
    }
    return '<div class="pop" role="dialog" aria-label="About the Dynamics 365 Accessibility Checker">' +
      '<div class="phead">' +
        '<div class="plockup"><img alt="Oliver4" src="' + aboutLogoSrc() + '">' +
        '<div class="ptitles">' +
        '<div class="pname"><h4>Dynamics 365 Accessibility Checker</h4></div>' +
        '<div class="pmeta"><span class="scpill">WCAG 2.2 AA</span>' +
        '<span class="v">v' + VERSION + '</span></div>' +
        '<a class="psite" href="https://www.oliver4-devtools.com" target="_blank" rel="noopener noreferrer">' +
        'www.oliver4-devtools.com</a>' +
        '</div></div>' +
        '<button class="pclose" data-act="about" title="Close">' + ico(ICON.close) +
        '<span class="sr">Close</span></button>' +
      '</div>' +
      '<div class="pbody">' +
        line('A pre-audit aid for Dynamics 365 model-driven forms and views, checked against ' +
          'WCAG 2.2 Level A and AA. It runs from a browser bookmark rather than from a solution, ' +
          'so nothing is installed in the environment and the panel exists only in the page you ' +
          'opened it on.') +
        line('It detects roughly a quarter to two fifths of real accessibility issues. It reports ' +
          'no criterion as passing, ever. Use it to clear the machine-detectable defects before ' +
          'manual testing, not instead of it.') +
        '<div class="pdiv"></div>' +
        line('This is not a Microsoft supported tool.') +
        line('Runs entirely in this browser tab. It makes no network calls and nothing leaves ' +
          'the page. The one file it writes is the Markdown report, and only when you ask for one. ' +
          'The links to w3.org open in a new tab only when you click them.') +
        line('Deep mode focuses controls programmatically and fires OnFocus handlers, so do not ' +
          'run it in Production or on a form with unsaved changes.') +
      '</div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Deep mode dialog                                                    */
  /*                                                                     */
  /* This used to be a browser confirm(). A native dialog cannot explain */
  /* what deep mode is, cannot be styled, and inside a D365 tab it reads */
  /* as the page having gone wrong. It lives in the shadow root and      */
  /* covers only the panel. There is no click-outside dismiss - the      */
  /* choice matters enough to be made deliberately.                      */
  /* ------------------------------------------------------------------ */
  function modalHtml() {
    if (ui.modal !== 'deep') return '';
    return '<div class="scrim">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-label="Run a deep scan?">' +
      '<div class="mhead"><h3>Run a deep scan?</h3>' +
      '<button class="pclose" data-act="modalcancel" title="Cancel">' + ico(ICON.close) +
      '<span class="sr">Cancel</span></button></div>' +
      '<div class="mbody">' +
      '<p>A standard scan reads the page as it sits. A deep scan does everything the standard ' +
      'scan does, then moves keyboard focus onto each control in turn and measures what changes. ' +
      'Focusing the control is the only way to see a focus indicator, so two criteria stay ' +
      'unanswered until you run it.</p>' +
      '<div class="cmp">' +
      '<div class="col"><h5>Standard scan</h5><ul>' +
      '<li>Reads the DOM, the computed styles and the Xrm Client API.</li>' +
      '<li>Changes nothing and touches nothing on the form.</li>' +
      '<li>2.4.7 Focus Visible is left unchecked.</li>' +
      '<li>The focus indicator half of 1.4.11 Non-text Contrast is left unchecked.</li>' +
      '<li>Usually under a second.</li>' +
      '</ul></div>' +
      '<div class="col hot"><h5>Deep scan</h5><ul>' +
      '<li>Everything the standard scan does.</li>' +
      '<li>Focuses up to 120 controls and compares their computed styles before and after.</li>' +
      '<li>Reports controls with no visible focus indicator (2.4.7).</li>' +
      '<li>Measures whether each focus indicator reaches 3:1 against what is behind it (1.4.11).</li>' +
      '<li>Slower, and focus moves around the form while it runs.</li>' +
      '</ul></div></div>' +
      '<div class="mwarn"><span class="rail" aria-hidden="true"></span>' +
      '<div><strong>Do not run this in Production, or on a form with unsaved changes.</strong> ' +
      'Focusing a control fires whatever is attached to its OnFocus event, which can set values, ' +
      'show notifications, open a lookup or trigger a business rule. The scan saves nothing ' +
      'itself, but it can leave the form dirty.</div></div>' +
      '<p>Deep mode stays on for later refreshes until you switch it off. Press Deep mode again ' +
      'to go back to a standard scan.</p>' +
      '</div>' +
      '<div class="mfoot">' +
      '<button class="btn" data-act="modalcancel">Cancel</button>' +
      '<button class="btn pri" data-act="deepgo">Run the deep scan</button>' +
      '</div></div></div>';
  }

  function ctxHtml() {
    var t = scanAt ? pad(scanAt.getHours()) + ':' + pad(scanAt.getMinutes()) : '--:--';
    return '<div class="ctx"><div class="left">' +
      '<h2>' + esc(entityDisplay) + '</h2>' +
      '<div class="metaline">' +
        (entityName ? '<span class="pill">' + esc(entityName) + '</span>' : '') +
        '<span class="meta">' + esc(pageType) + ' · ' +
          (formContext ? 'form context available' : (Xrm ? 'no form context' : 'Xrm not reachable')) + '</span>' +
        '<span class="meta">scanned ' + t + ' · ' + (scanMs < 1000 ? scanMs + ' ms' : (scanMs / 1000).toFixed(1) + ' s') + '</span>' +
      '</div></div>' +
      '<div class="actions">' +
        '<button class="btn pri" data-act="refresh" ' +
          'title="Scan whatever is on screen now - browse to another record or view, then press this" ' +
          'aria-label="Refresh: scan the record or view currently on screen">' +
          '<span aria-hidden="true">↻</span> Refresh</button>' +
        '<button class="btn" data-act="deep" aria-pressed="' + (deepMode ? 'true' : 'false') + '"><span aria-hidden="true">◐</span> Deep mode</button>' +
        '<button class="btn" data-act="report"><span aria-hidden="true">↧</span> Report</button>' +
      '</div></div>';
  }

  /* Everything below the header when the gate says this is not a Dynamics 365
     page. There is deliberately NO sidebar and no results pane: an empty
     triage list under 55 criteria reads as "scanned and found nothing", which
     is the one thing this state must not say. Deep mode and Report are not
     drawn at all rather than drawn disabled - same rule as the resize grips,
     a dead control is worse than no control. Refresh stays live, because it is
     how you recover after browsing back into the app. */
  function blockedHtml() {
    return '<div class="ctx"><div class="left">' +
      '<h2>' + esc(cleanHeading(document.title) || 'This page') + '</h2>' +
      '<div class="metaline">' +
        '<span class="pill err">not a Dynamics 365 page</span>' +
        '<span class="meta">nothing scanned</span>' +
      '</div></div>' +
      '<div class="actions">' +
        '<button class="btn pri" data-act="refresh" ' +
          'title="Check the page that is on screen now" ' +
          'aria-label="Refresh: check the page currently on screen">' +
          '<span aria-hidden="true">\u21bb</span> Refresh</button>' +
      '</div></div>' +
      '<div class="banner err"><span class="rail" aria-hidden="true"></span>' +
      '<p><strong>This is not a Dynamics 365 page, so nothing was scanned.</strong> ' +
      'Neither the Xrm Client API nor the Dynamics 365 app shell was found here. ' +
      'The checker reports on model-driven apps built on Unified Interface, and any result ' +
      'it produced on this page would be about something else.</p></div>' +
      '<div class="blocked"><div class="bstate">' +
      '<h3>The panel is read only</h3>' +
      '<p>No checks ran, so there is nothing to show. Results, filters, the WCAG reference, ' +
      'deep mode and the report stay unavailable until the tool is on a Dynamics 365 page.</p>' +
      '<ol><li>Browse to a form, view or dashboard in a model-driven app.</li>' +
      '<li>Press Refresh.</li></ol>' +
      '<p>If you are already in a model-driven app and still see this, the app may not have ' +
      'finished loading, or the tool may have been opened from a page outside the app shell. ' +
      'Wait for the page to render and press Refresh.</p>' +
      '</div></div>';
  }

  function bannerHtml() {
    var h = '';
    /* Not dismissible. It says the numbers on screen are not measurements. */
    if (renderAltered.altered) {
      h += '<div class="banner alt"><span class="rail" aria-hidden="true"></span>' +
        '<p><strong>Contrast was not measured on this scan.</strong> ' + esc(renderAltered.reasons.join(' ')) +
        ' 1.4.3 and 1.4.11 are marked Needs review rather than given a ratio. Turn the override off and press Refresh - ' +
        'WCAG is assessed on the page as it is normally presented, so that is the state to measure.</p></div>';
    }
    if (!ui.banner) return h;
    var c = counts(scopedFindings());
    h += '<div class="banner"><span class="rail" aria-hidden="true"></span>' +
      '<p><strong>This is not an audit.</strong> Nothing is ever marked as passed. A scan can only tell you what it found, ' +
      'not that a page would pass an accessibility audit, so "No issues detected" means the checks ran and found nothing - ' +
      'no more than that. Many problems can only be found by a person, which is what the ' +
      c.manual + ' manual checks below are for.</p>' +
      '<button data-act="hidebanner">Hide</button></div>';
    return h;
  }

  function sideHtml() {
    var sf = scopedFindings();
    var c = counts(sf);
    /* Two numbers, two different things. The one on the right of each row
       counts CRITERIA, because the whole panel is organised around criteria
       and 55 of them is the denominator everywhere else. The line under the
       name counts ISSUES, which is what the list actually shows - one failing
       criterion routinely carries several. They used to disagree silently,
       which read as a bug. Now each number says what it is counting. */
    var iss = issueCounts();
    var defs = [
      ['all', 'All criteria', CRITERIA.length, ''],
      ['fail', 'Fail', c.fail, acrossLine(iss.fail, c.fail)],
      ['review', 'Needs review', c.review, acrossLine(iss.review, c.review)],
      ['manual', 'Manual assessment', c.manual, 'no automated check exists'],
      ['clear', 'No issues detected', c.clear, 'checks ran, nothing found'],
      ['cond', 'Conditional', c.cond, 'decide applicability'],
      ['na', 'Not applicable', c.na, 'out of scope on this page']
    ];
    var sc = scopeCounts();
    var cc = compCounts();
    var h = '<nav class="side" aria-label="Results, scope and reference">' +
      '<div class="caption">Result <span>WCAG criteria, not issues</span></div>' +
      '<div class="buckets" role="group" aria-label="Filter by result">';
    defs.forEach(function (d) {
      var on = ui.view === 'wcag' ? false
        : (ui.view === 'summary' ? (d[0] === 'all') : (ui.bucket === d[0]));
      h += '<button class="bucket" data-bucket="' + d[0] + '" aria-pressed="' + on + '" ' +
        'aria-label="' + esc(d[1] + ': ' + d[2] + ' WCAG criteria' + (d[3] ? ', ' + d[3] : '')) + '">' +
        glyph(d[0]) +
        '<span class="btxt"><span class="name">' + d[1] + '</span>' +
        (d[3] ? '<span class="sub">' + esc(d[3]) + '</span>' : '') + '</span>' +
        '<span class="nbox" aria-hidden="true"><span class="n">' + d[2] + '</span>' +
        '<span class="nlab">WCAG criteria</span></span></button>';
    });
    h += '</div><div class="rule"></div>' +
      '<div class="caption">Scope <span>whole-page findings always show</span></div>' +
      '<div class="scopes" role="group" aria-label="Filter findings by region of the page">';
    REGIONS.forEach(function (r) {
      h += '<button class="scope" role="checkbox" data-scope="' + r[0] + '" aria-checked="' + (ui.scope[r[0]] ? 'true' : 'false') + '" ' +
        'aria-label="' + esc(r[1] + ': ' + sc[r[0]] + ' findings') + '">' +
        '<span class="box" aria-hidden="true">' + (ui.scope[r[0]] ? '✓' : '') + '</span>' +
        '<span class="name">' + r[1] + '</span><span class="n">' + sc[r[0]] + '</span></button>';
    });
    h += '</div><div class="rule"></div>' +
      '<div class="caption">Components <span>who might be able to fix it</span></div>' +
      '<div class="scopes" role="radiogroup" aria-label="Filter findings by who owns the component">';
    CLASS_FILTERS.forEach(function (f) {
      var on = ui.comp === f[0];
      h += '<button class="scope" role="radio" data-comp="' + f[0] + '" aria-checked="' + (on ? 'true' : 'false') + '" ' +
        'aria-label="' + esc(f[1] + ': ' + (cc[f[0]] || 0) + ' findings') + '">' +
        '<span class="box radio" aria-hidden="true">' + (on ? '•' : '') + '</span>' +
        '<span class="name">' + f[1] + '</span><span class="n">' + (cc[f[0]] || 0) + '</span></button>';
    });
    h += '</div><div class="rule"></div>' +
      '<div class="caption">Reference</div>' +
      '<div class="buckets" role="group" aria-label="Reference material">' +
      '<button class="bucket" data-act="wcag" aria-pressed="' + (ui.view === 'wcag') + '" ' +
      'aria-label="WCAG 2.2 reference: all 55 Level A and AA criteria explained">' +
      '<span class="gly t-all" aria-hidden="true">§</span>' +
      '<span class="btxt"><span class="name">WCAG 2.2 reference</span>' +
      '<span class="sub">what each criterion asks for</span></span>' +
      '<span class="nbox" aria-hidden="true"><span class="n">' + CRITERIA.length + '</span>' +
      '<span class="nlab">WCAG criteria</span></span></button></div>' +
      '<div class="spacer"></div>' +
      '<div class="keycard"><h3>Keyboard</h3><div class="keys">' +
      '<div><kbd class="mono">J</kbd> <kbd class="mono">K</kbd> Next, previous</div>' +
      '<div><kbd class="mono">Enter</kbd> Open</div>' +
      '<div><kbd class="mono">L</kbd> Locate</div>' +
      '<div><kbd class="mono">Esc</kbd> Back, then close</div>' +
      '</div></div></nav>';
    return h;
  }

  function footerHtml() {
    /* Green with a lit pip means there is a live Dynamics client on this page.
       Long host names lose their tail rather than pushing the version off the
       bar. */
    var envName = orgHost || 'not connected';
    return '<footer>' +
      '<span class="note">&copy; 2026 Oliver4 Dynamics 365 Accessibility Checker</span>' +
      '<span class="orgchip' + (Xrm ? ' live' : '') + '" title="' + esc(envName) + '">' +
      '<span class="dot" aria-hidden="true"></span><span class="host">' + esc(envName) + '</span></span>' +
      '<span class="ver">v' + VERSION + '</span></footer>';
  }


  /* ------------------------------------------------------------------ */
  /* 11. Panel - the three views                                        */
  /* ------------------------------------------------------------------ */

  function summaryHtml() {
    var sf = scopedFindings();
    var c = counts(sf);
    /* Every tile counts CRITERIA. It used to be possible to read them as issue
       counts, which is the one number people quote in a stand-up, so each tile
       now carries its unit and the line above says what the issue count is. */
    var iss = issueCounts();
    var stats = [
      ['fail', 'Fail', c.fail, c.fail ? acrossLine(iss.fail, c.fail) : 'No failures detected'],
      ['review', 'Needs review', c.review, c.review ? acrossLine(iss.review, c.review) + ', each one for a person to judge' : 'Nothing flagged for review'],
      ['manual', 'Manual', c.manual, 'WCAG criteria with no automated check at all'],
      ['clear', 'No issues detected', c.clear, 'WCAG criteria where the checks ran and found nothing. Not a pass']
    ];
    var h = '<div class="scroll"><div class="sum">' +
      '<div class="lead">Each tile below counts WCAG criteria, not issues - one failing criterion often carries several separate issues.</div>' +
      '<div class="stats">';
    stats.forEach(function (s) {
      h += '<div class="stat s-' + s[0] + '"><div class="top">' + glyph(s[0]) +
        '<span class="l">' + s[1] + '</span></div>' +
        '<div class="n">' + s[2] + '<span class="u">' + (s[2] === 1 ? 'WCAG criterion' : 'WCAG criteria') + '</span></div>' +
        '<div class="d">' + esc(s[3]) + '</div></div>';
    });
    h += '</div><div style="display:flex;flex-direction:column;gap:10px">' +
      '<div class="caps">By WCAG principle</div>';
    principleRows().forEach(function (p) {
      function w(n) { return p.total ? (n / p.total * 100).toFixed(1) + '%' : '0%'; }
      h += '<div class="prow"><span class="pl">' + p.label + '</span>' +
        '<span class="track" role="img" aria-label="' + p.label + ': ' + p.fail + ' fail, ' + p.review +
        ' needs review, ' + p.manual + ' manual or conditional, ' + p.clear + ' no issues detected">' +
        '<i style="width:' + w(p.fail) + ';background:var(--fail-dot)"></i>' +
        '<i style="width:' + w(p.review) + ';background:var(--rev-dot)"></i>' +
        '<i style="width:' + w(p.manual) + ';background:var(--man-dot)"></i>' +
        '<i style="width:' + w(p.clear) + ';background:var(--ok-dot)"></i></span>' +
        '<span class="leg">' + p.fail + ' fail · ' + p.review + ' review · ' + p.manual + ' manual · ' + p.clear + ' clear</span></div>';
    });
    h += '</div>';

    var scopedIssues = issues.filter(function (g) { return scopeOk(g) && compOkIssue(g); });
    var filtered = ui.comp !== 'all' || !REGIONS.every(function (r) { return ui.scope[r[0]]; });
    var queue = fixFirst(scopedIssues);
    h += '<div style="display:flex;flex-direction:column;gap:9px"><div class="caps">Fix these first</div>';
    if (!queue.length) {
      h += '<p class="empty" style="padding:18px 0;text-align:left">' +
        (filtered
          ? 'No failures or review flags match the scope and component filters on the left. Widen them to see the rest.'
          : 'No failures or review flags were detected. That is not a pass — work through the ' +
            c.manual + ' manual checks next.') + '</p>';
    }
    queue.forEach(function (g) {
      h += '<button class="next" data-open="' + esc(g.key) + '">' + glyph(g.severity) +
        '<span style="min-width:0;flex:1"><span class="t">' + esc(g.sc + ' ' + g.name) + '</span>' +
        '<span class="d">' + esc(g.message) + '</span></span>' +
        '<span class="mono" style="font-size:10px;color:var(--muted);flex:none">' + g.elements.length +
        (g.elements.length === 1 ? ' element' : ' elements') + '</span>' +
        '<span class="mini" style="flex:none">Open</span></button>';
    });
    h += '<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:2px">' +
      '<button class="btn" data-bucket="fail">Open the ' + c.fail + ' failure' + (c.fail === 1 ? '' : 's') + '</button>' +
      '<button class="btn" data-bucket="manual">Work the ' + c.manual + ' manual checks</button>' +
      '<button class="btn" data-act="allcrit">Review all 55 criteria</button>' +
      '<button class="btn" data-act="wcag">Read the WCAG 2.2 reference</button>' +
      '</div>';
    h += '</div></div></div>';
    return h;
  }

  function toolbarHtml() {
    return '<div class="toolbar">' +
      '<label class="search"><span aria-hidden="true">⌕</span>' +
      '<input type="search" data-role="filter" placeholder="Filter by criterion, name or element" ' +
      'aria-label="Filter results" value="' + esc(ui.query) + '"></label>' +
      '<div class="seg" role="group" aria-label="Sort order">' +
      '<button data-sort="severity" aria-pressed="' + (ui.sort === 'severity') + '">Severity</button>' +
      '<button data-sort="criterion" aria-pressed="' + (ui.sort === 'criterion') + '">Criterion</button>' +
      '</div>' +
      '<button class="mini quiet mono" data-act="copy" style="font-size:10px">copy</button></div>';
  }

  function triageHtml() {
    var list = rows();
    var h = toolbarHtml() + '<div class="scroll" data-role="list">';
    if (!list.length) {
      h += '<p class="empty">Nothing matches this filter.</p></div>';
      return h;
    }
    /* The sidebar counts criteria; this list counts issues, and one failing
       criterion routinely carries several. Two numbers that never match and
       never explain themselves read as a bug, so the list says which is which. */
    var issueRows = 0, scs = {};
    list.forEach(function (r) { if (r.kind === 'issue') { issueRows++; scs[r.g.sc] = 1; } });
    var critRows = list.length - issueRows;
    var nSc = Object.keys(scs).length;
    var cap = [];
    if (issueRows) cap.push(issuesAcross(issueRows, nSc));
    if (critRows) cap.push(critRows + (critRows === 1 ? ' criterion' : ' criteria') + ' listed');
    h += '<p class="listcap"><strong>' + esc(cap.join(' · ')) + '.</strong> ' +
      (issueRows
        ? 'The number beside each result in the sidebar counts CRITERIA. The line under it counts ISSUES, ' +
          'which is what this list shows - one failing criterion often carries several separate issues.'
        : 'These are criteria, not issues. Nothing was detected against them.') + '</p>';
    list.forEach(function (r, i) {
      var cur = (i === ui.cursor) ? '1' : '0';
      if (r.kind === 'issue') {
        var g = r.g;
        var seen = {}, tagVals = [];
        g.elements.slice(0, 2).forEach(function (f) {
          var v = f.label || f.schema;
          if (v && !seen[v]) { seen[v] = 1; tagVals.push(v); }
        });
        var ev0 = g.elements[0] && g.elements[0].evidence;
        if (ev0 && !seen[ev0]) tagVals.push(ev0);
        var tags = '<span class="cbadge c-' + g.cls + '" title="' + esc(classTitle(g)) + '">' +
          esc(CLASS_LABEL[g.cls]) + '</span>' +
          tagVals.map(function (t) { return '<span class="tag">' + esc(t.slice(0, 34)) + '</span>'; }).join('');
        if (g.elements.length > 2) tags += '<span class="tag">+' + (g.elements.length - 2) + '</span>';
        h += '<div class="row" data-cur="' + cur + '" data-idx="' + i + '">' +
          '<div class="sevcol"><span class="sev t-' + g.severity + '"><span class="g" aria-hidden="true">' +
            (g.severity === 'fail' ? '✕' : '!') + '</span><span class="w">' + SEV_SHORT[g.severity] + '</span></span>' +
          '<span class="lvl">Level ' + g.level + '</span></div>' +
          '<div class="mid"><span class="head"><span class="sc mono">' + esc(g.sc) + '</span>' +
            '<span class="nm">' + esc(g.name) + '</span></span>' +
            '<p class="desc">' + esc(g.why || g.message) + '</p>' +
            '<span class="tags">' + tags + '</span></div>' +
          '<div class="act"><span class="count mono">' + g.elements.length +
            (g.elements.length === 1 ? ' element' : ' elements') + '</span>' +
            (g.elements.some(function (f) { return f.el; })
              ? '<button class="mini" data-locate-issue="' + esc(g.key) + '"><span aria-hidden="true">◎</span> Show on form</button>' : '') +
            '<button class="mini quiet" data-open="' + esc(g.key) + '">How to fix</button></div></div>';
      } else {
        var c = r.c, s = r.status;
        h += '<div class="row" data-cur="' + cur + '" data-idx="' + i + '">' +
          '<div class="sevcol"><span class="sev t-' + s + '"><span class="g" aria-hidden="true">' +
            STATUS[s].glyph + '</span><span class="w">' + SEV_SHORT[s] + '</span></span>' +
          '<span class="lvl">Level ' + c[2] + '</span></div>' +
          '<div class="mid"><span class="head"><span class="sc mono">' + esc(c[0]) + '</span>' +
            '<span class="nm">' + esc(c[1]) + '</span></span>' +
            '<p class="desc">' + esc(c[4]) + '</p>' +
            '<span class="tags">' +
            '<span class="tag">Level ' + c[2] + ' · ' + PRINCIPLE_OF[c[0].split('.')[0]] + '</span></span></div>' +
          '<div class="act"><span class="count mono">' + CRIT_HINT[s] + '</span>' +
            '<button class="mini quiet" data-open="c|' + esc(c[0]) + '">What to do</button></div></div>';
      }
    });
    h += '</div>';
    return h;
  }

  /* Hover text for a component badge - the long form of what the badge says,
     including the split when an issue spans both sides of the line. */
  function classTitle(g) {
    if (g.cls !== 'mixed') return CLASS_LONG[g.cls];
    return g.classList.map(function (k) {
      return CLASS_LABEL[k] + ': ' + g.classes[k];
    }).join(' · ') + '. Split this before logging it.';
  }

  /* The block that says, in order: what the scan saw, what the criterion asks
     for, why the two do not meet, and who can act on it. This is the part a
     developer pastes into a defect, so it is above the elements list rather
     than below the fix steps. */
  function wcagBoxHtml(g) {
    var gd = GUIDE[g.sc] || {};
    var head = g.severity === 'fail'
      ? 'Why this does not meet ' + g.sc
      : 'Why this needs checking against ' + g.sc;
    var badges = g.classList.map(function (k) {
      return '<span class="cbadge c-' + k + '">' + esc(CLASS_LABEL[k]) + ' · ' +
        g.classes[k] + (g.classes[k] === 1 ? ' element' : ' elements') + '</span>';
    }).join('');
    /* g.message is a fragment written for a list row, so it does not always
       carry its own full stop. */
    var found = g.message.replace(/[.\s]+$/, '');
    return '<div class="wbox">' +
      '<div class="wrow"><span class="wk">What the scan found</span><p>' +
        esc(found) + '. Observed on ' + g.elements.length +
        (g.elements.length === 1 ? ' element' : ' elements') + ', listed below.</p></div>' +
      '<div class="wrow"><span class="wk">What ' + esc(g.sc + ' ' + g.name) + ' requires</span><p>' +
        esc(gd.req || 'See the Understanding page linked in the Reference card.') + '</p></div>' +
      '<div class="wrow"><span class="wk">' + esc(head) + '</span><p>' +
        esc(FAILS[g.type] || g.why) + '</p></div>' +
      /* The impact line is already under the title, so it is not repeated
         here - four rows that each say something new, not five with one
         duplicate. */
      '<div class="wrow"><span class="wk">Component</span>' +
        '<div class="cbadges">' + badges + '</div>' +
        '<p>' + esc(classTitle(g)) + '</p></div>' +
      '</div>';
  }

  function detailTarget() {
    if (!ui.detail) return null;
    if (ui.detail.indexOf('c|') === 0) {
      var c = criterion(ui.detail.slice(2));
      return c ? { kind: 'criterion', c: c, status: statusFor(c) } : null;
    }
    for (var i = 0; i < issues.length; i++) if (issues[i].key === ui.detail) return { kind: 'issue', g: issues[i] };
    return null;
  }

  function detailHtml() {
    var t = detailTarget();
    if (!t) return '<p class="empty">That issue is no longer in the results. Press Refresh or go back.</p>';
    var list = rows();
    var pos = -1;
    for (var i = 0; i < list.length; i++) if (list[i].key === ui.detail) { pos = i; break; }

    var nav = '<div class="toolbar">' +
      '<button class="mini quiet" data-act="back"><span aria-hidden="true">←</span> Back to the list</button>' +
      '<span style="flex:1"></span>' +
      (pos > -1 ? '<span class="mono" style="font-size:10px;color:var(--muted)">' + (pos + 1) + ' of ' + list.length + '</span>' : '') +
      '<span class="seg" style="background:none;padding:0;gap:4px">' +
      '<button class="mini" data-act="prev" title="Previous result"><span aria-hidden="true">↑</span><span class="sr">Previous result</span></button>' +
      '<button class="mini" data-act="next" title="Next result"><span aria-hidden="true">↓</span><span class="sr">Next result</span></button>' +
      '</span></div>';

    if (t.kind === 'criterion') {
      var c = t.c, s = t.status;
      var infos = findings.filter(function (f) { return f.sc === c[0]; });
      var h = nav + '<div class="scroll"><div class="detail">' +
        '<div class="dhead"><span class="sev t-' + s + '" style="margin-top:4px"><span class="g" aria-hidden="true">' +
          STATUS[s].glyph + '</span><span class="w">' + STATUS[s].label + '</span></span>' +
        '<div style="min-width:0"><div class="dtitle"><span class="sc mono">' + esc(c[0]) + '</span>' +
          '<h3>' + esc(c[1]) + '</h3><span class="lvl">Level ' + c[2] + '</span></div>' +
          '<p class="dwhy">' + esc(c[4]) + '</p></div></div>' +
        critBoxHtml(c);
      if (infos.length) {
        h += '<div class="captionrow"><span class="caps">Observations from this scan</span>' +
          '<span class="mono" style="font-size:10px;color:var(--muted)">' + infos.length + '</span></div><div class="elbox">';
        infos.forEach(function (f, i) {
          h += '<div class="el"><span class="gly t-info" aria-hidden="true">ⓘ</span>' +
            '<span class="info"><span class="lab">' + esc(f.message) + '</span>' +
            '<span class="sch">' + esc(f.detail) + '</span></span>' +
            (f.el ? '<button class="mini" data-locate="' + findings.indexOf(f) + '"><span aria-hidden="true">◎</span> Locate</button>' : '') +
            '</div>';
        });
        h += '</div>';
      }
      h += '<div class="cols"><div class="card"><h4>What to do</h4>' +
        '<p>' + esc(c[4]) + '</p></div>' +
        refCardHtml(c[0], c[1], c[2], s) + '</div></div></div>';
      return h;
    }

    var g = t.g;
    var h2 = nav + '<div class="scroll"><div class="detail">' +
      '<div class="dhead"><span class="sev t-' + g.severity + '" style="margin-top:4px"><span class="g" aria-hidden="true">' +
        (g.severity === 'fail' ? '✕' : '!') + '</span><span class="w">' + SEV_SHORT[g.severity] + '</span></span>' +
      '<div style="min-width:0"><div class="dtitle"><span class="sc mono">' + esc(g.sc) + '</span>' +
        '<h3>' + esc(g.name) + '</h3><span class="lvl">Level ' + g.level + '</span></div>' +
        '<p class="dwhy">' + esc(g.why) + '</p></div></div>' +
      wcagBoxHtml(g) +
      '<div class="captionrow"><span class="caps">' + (g.severity === 'fail' ? 'Failing' : 'Flagged') + ' elements</span>' +
      '<span class="mono" style="font-size:10px;color:var(--muted)">' + g.elements.length + ' found' +
        (g.elements.some(function (f) { return f.el; }) ? ' · use Locate to highlight on the form' : '') + '</span></div>' +
      '<div class="elbox">';
    g.elements.slice(0, 60).forEach(function (f) {
      h2 += '<div class="el">' + glyph(g.severity) +
        '<span class="info"><span class="lab">' + esc(f.label || '(unnamed)') + '</span>' +
        '<span class="sch">' + esc(f.schema || '—') + '</span></span>' +
        '<span class="cbadge c-' + f.cls + '" title="' + esc(CLASS_LONG[f.cls] || '') + '">' +
          esc(CLASS_LABEL[f.cls]) + '</span>' +
        '<span class="ev">' + esc(f.evidence || f.detail.slice(0, 80)) + '</span>' +
        (f.el ? '<button class="mini" data-locate="' + findings.indexOf(f) + '"><span aria-hidden="true">◎</span> Locate</button>'
              : '<span class="mini quiet" style="opacity:.5">not in DOM</span>') +
        '</div>';
    });
    if (g.elements.length > 60) h2 += '<div class="el"><span class="info"><span class="lab">…and ' + (g.elements.length - 60) + ' more</span></span></div>';
    h2 += '</div><div class="cols">' +
      '<div class="card"><h4>How to fix in Dynamics 365</h4>';
    if (g.steps.length) {
      g.steps.forEach(function (s, i) {
        h2 += '<div class="step"><span class="n" aria-hidden="true">' + (i + 1) + '</span><span>' + esc(s) + '</span></div>';
      });
    } else {
      h2 += '<p>' + esc((criterion(g.sc) || [])[4] || '') + '</p>';
    }
    h2 += '<div class="hair"></div><small>Owner: ' + esc(OWNER_LABEL[g.owner] || g.owner) +
      ' · Region: ' + g.regionList.map(function (r) { return esc(REGION_LABEL[r]); }).join(', ') +
      '</small></div>' +
      refCardHtml(g.sc, g.name, g.level, g.severity) + '</div></div></div>';
    return h2;
  }

  /* The reference content for a criterion with no findings against it. Same
     three questions the WCAG reference view answers, so a person who lands
     here from the list does not have to go and find it. */
  function critBoxHtml(c) {
    var gd = GUIDE[c[0]] || {};
    return '<div class="wbox">' +
      '<div class="wrow"><span class="wk">What it requires</span><p>' + esc(gd.req || '') + '</p></div>' +
      '<div class="wrow"><span class="wk">In Dynamics 365</span><p>' + esc(gd.d365 || '') + '</p></div>' +
      '<div class="wrow"><span class="wk">Commonly fails when</span><p>' + esc(gd.fails || '') + '</p></div>' +
      '</div>';
  }

  function refCardHtml(sc, name, level, state) {
    return '<div class="card ref"><h4>Reference</h4>' +
      '<p>WCAG 2.2 · Success criterion ' + esc(sc) + ' ' + esc(name) + ' (Level ' + esc(level) + ')</p>' +
      '<a href="' + understandingUrl(sc) + '" target="_blank" rel="noopener noreferrer">Understanding ' + esc(sc) + ' ↗</a>' +
      '<a href="' + quickrefUrl(sc) + '" target="_blank" rel="noopener noreferrer">How to Meet ' + esc(sc) + ' ↗</a>' +
      '<button class="mini quiet" data-act="wcag">Open the full WCAG reference</button>' +
      '<div class="hair"></div>' +
      '<small>' + (state === 'fail' || state === 'review'
        ? 'Detected automatically. Confirm with a screen reader before signing this criterion off.'
        : 'This tool cannot report a pass. Test it by hand and record the evidence.') + '</small></div>';
  }

  /* ------------------------------------------------------------------ */
  /* The WCAG 2.2 reference                                             */
  /*                                                                     */
  /* Static. It is the same 55 rows whatever the scan found, so it can   */
  /* be read before a scan, during triage, or by someone writing an      */
  /* accessibility statement who never runs the tool at all. The only    */
  /* live thing on it is the status chip, which is what the last scan    */
  /* concluded - and no criterion is ever reported as passing.           */
  /* ------------------------------------------------------------------ */
  function wcagHtml() {
    var sf = scopedFindings();
    var q = (ui.wq || '').toLowerCase();
    var list = CRITERIA.filter(function (c) {
      if (!q) return true;
      var gd = GUIDE[c[0]] || {};
      return (c[0] + ' ' + c[1] + ' ' + c[2] + ' ' + PRINCIPLE_OF[c[0].split('.')[0]] + ' ' +
        (gd.req || '') + ' ' + (gd.d365 || '') + ' ' + (gd.fails || '') + ' ' + c[4])
        .toLowerCase().indexOf(q) > -1;
    });
    var h = '<div class="toolbar">' +
      '<label class="search"><span aria-hidden="true">⌕</span>' +
      '<input type="search" data-role="wfilter" placeholder="Filter the 55 criteria by number, name or wording" ' +
      'aria-label="Filter the WCAG criteria" value="' + esc(ui.wq) + '"></label>' +
      '<span class="mono" style="font-size:10px;color:var(--muted);flex:none">' +
        list.length + ' of ' + CRITERIA.length + '</span>' +
      '<button class="mini quiet" data-act="back">Back to results</button></div>' +
      '<div class="scroll"><div class="wcag">' +
      '<p class="wintro">Every Level A and AA success criterion in WCAG 2.2, in plain English, ' +
      'with what it means for a model-driven app and how it is usually failed. This is reference ' +
      'material and does not change with the scan. The chip on each row is what the last scan ' +
      'concluded about it - "No issues detected" means this tool found nothing, not that the ' +
      'criterion passes.</p>';
    list.forEach(function (c) {
      var gd = GUIDE[c[0]] || {};
      var st = statusFor(c, sf);
      h += '<div class="wc">' +
        '<div class="wchead">' +
          '<span class="sc mono">' + esc(c[0]) + '</span>' +
          '<h3>' + esc(c[1]) + '</h3>' +
          '<span class="lvl">Level ' + esc(c[2]) + '</span>' +
          '<span class="tag">' + esc(PRINCIPLE_OF[c[0].split('.')[0]]) + '</span>' +
          '<span class="tag">' + esc(MODE_LABEL[c[3]] || c[3]) + '</span>' +
          '<span class="spread"></span>' +
          '<span class="sev t-' + st + '"><span class="g" aria-hidden="true">' + STATUS[st].glyph +
            '</span><span class="w">' + STATUS[st].label + '</span></span>' +
        '</div>' +
        '<div class="wcrow"><span class="wk">What it requires</span><p>' + esc(gd.req || '') + '</p></div>' +
        '<div class="wcrow"><span class="wk">In Dynamics 365</span><p>' + esc(gd.d365 || '') + '</p></div>' +
        '<div class="wcrow"><span class="wk">Commonly fails when</span><p>' + esc(gd.fails || '') + '</p></div>' +
        '<div class="wcrow"><span class="wk">How this tool covers it</span><p>' + esc(c[4]) + '</p></div>' +
        '<div class="wclinks">' +
          '<a href="' + understandingUrl(c[0]) + '" target="_blank" rel="noopener noreferrer">Understanding ' + esc(c[0]) + ' ↗</a>' +
          '<a href="' + quickrefUrl(c[0]) + '" target="_blank" rel="noopener noreferrer">How to Meet ' + esc(c[0]) + ' ↗</a>' +
        '</div></div>';
    });
    if (!list.length) h += '<p class="empty">Nothing matches that filter.</p>';
    h += '</div></div>';
    return h;
  }

  function reportHtml() {
    var r = ui.report;
    return '<div class="scroll"><div class="detail">' +
      '<div class="dtitle"><h3>Markdown report</h3></div>' +
      '<p class="dwhy">' +
        (r.downloaded ? 'Downloaded as <code class="mono">' + esc(r.name) + '</code>. ' : 'The download was blocked by the browser. ') +
        (r.copied ? 'Also copied to your clipboard.' : 'Select the text below and copy it.') +
      '</p>' +
      '<textarea readonly aria-label="Markdown report">' + esc(r.md) + '</textarea>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn" data-act="back">Back to results</button>' +
      '<button class="btn" data-act="report">Download again</button></div>' +
      '</div></div>';
  }


  /* ------------------------------------------------------------------ */
  /* 12. Panel - render, events and boot                                */
  /* ------------------------------------------------------------------ */

  var liveMsg = '';

  function paneHtml() {
    if (ui.view === 'wcag') return wcagHtml();
    if (ui.view === 'report') return reportHtml();
    if (ui.view === 'detail') return detailHtml();
    if (ui.view === 'summary') return summaryHtml();
    return triageHtml();
  }

  /* render() rebuilds the whole shadow tree, which destroys whatever was
     focused inside it. The key handler lives on .wrap, so losing focus used to
     kill every keyboard shortcut after the first click. These two put focus
     back on the same control - by its data attribute, since the node itself is
     gone - and fall back to the shell so the shortcuts keep working. Focus is
     only ever restored if it was already inside the panel: the form underneath
     must never have focus taken from it. */
  var FOCUS_ATTRS = ['data-act', 'data-bucket', 'data-scope', 'data-comp', 'data-sort',
    'data-open', 'data-locate', 'data-locate-issue', 'data-resize', 'data-role'];

  function focusKey(el) {
    if (!el || !el.getAttribute) return null;
    for (var i = 0; i < FOCUS_ATTRS.length; i++) {
      var v = el.getAttribute(FOCUS_ATTRS[i]);
      if (v === null) continue;
      var sel = '[' + FOCUS_ATTRS[i] + '="' + v.replace(/[\\"]/g, '\\$&') + '"]';
      /* The theme switch is two buttons sharing one data-act. */
      var th = el.getAttribute('data-theme');
      if (th) sel += '[data-theme="' + th + '"]';
      return sel;
    }
    return '*';   /* focused inside the panel, but on nothing addressable */
  }

  function restoreFocus(key) {
    if (!key) return;
    var el = null;
    if (key !== '*') { try { el = root.querySelector(key); } catch (e) {} }
    if (!el) el = root.querySelector('.wrap');
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) {} }
  }

  function render(keepFocus) {
    var prevFocus = focusKey(root.activeElement);
    applyGeometry();
    var html = '<style>' + CSS_TEXT + '</style>' +
      '<div class="wrap" tabindex="-1" data-theme="' + ui.theme + '" role="region" ' +
      'aria-label="Dynamics 365 Accessibility Checker">' +
      hdrHtml() + aboutHtml();

    if (ui.mode !== 'min') {
      html += pageIsD365
        ? ctxHtml() + bannerHtml() +
          '<div class="body">' + sideHtml() +
          '<div class="pane">' + paneHtml() + '</div></div>'
        : blockedHtml();
      html += footerHtml();
      /* Both bottom corners. Maximised there is nothing to drag them to, so
         they are not drawn - a dead control is worse than no control. */
      if (ui.mode === 'normal') {
        html += '<span class="gripc sw" data-resize="sw" title="Drag to resize" aria-hidden="true">◣</span>' +
          '<span class="gripc se" data-resize="se" title="Drag to resize" aria-hidden="true">◢</span>';
      }
    }
    html += modalHtml() +
      '<div class="sr" role="status" aria-live="polite">' + esc(liveMsg) + '</div></div>';
    root.innerHTML = html;
    bind();
    if (keepFocus === 'filter' || keepFocus === 'wfilter') {
      var inp = root.querySelector('[data-role="' + keepFocus + '"]');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    } else if (keepFocus === 'modal') {
      /* Opening the dialog must move focus into it. Without this the restore
         puts focus back on the Deep mode button, which is now behind a scrim. */
      var mb = root.querySelector('[data-act="deepgo"]');
      if (mb) { try { mb.focus(); } catch (e) {} }
    } else {
      restoreFocus(prevFocus);
    }
    scrollCursorIntoView();
  }

  function scrollCursorIntoView() {
    var el = root.querySelector('.row[data-cur="1"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function setView(v, bucket) {
    ui.view = v;
    if (bucket) ui.bucket = bucket;
    ui.cursor = 0;
    render();
  }

  function openKey(key) {
    ui.detail = key;
    ui.view = 'detail';
    render();
  }

  function stepDetail(dir) {
    var list = rows();
    var pos = -1;
    for (var i = 0; i < list.length; i++) if (list[i].key === ui.detail) { pos = i; break; }
    var next = pos + dir;
    if (next < 0 || next >= list.length) return;
    ui.cursor = next;
    ui.detail = list[next].key;
    render();
  }

  function locate(el) {
    if (!el || !el.scrollIntoView) { liveMsg = 'That element is no longer on the page.'; render(); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var prev = el.style.outline, prevOff = el.style.outlineOffset, prevSh = el.style.boxShadow;
    el.style.outline = '3px solid #c0342c';
    el.style.outlineOffset = '2px';
    el.style.boxShadow = '0 0 0 6px rgba(192,52,44,.25)';
    setTimeout(function () {
      el.style.outline = prev; el.style.outlineOffset = prevOff; el.style.boxShadow = prevSh;
    }, 10000);
  }

  function doScan(deep) {
    liveMsg = 'Scanning…';
    var was = entityDisplay;
    runScan(deep);
    issues = buildIssues();
    if (!pageIsD365) {
      /* Say it once, plainly, and put the panel back to a state with nothing
         selected in it - a detail screen or a filter belongs to the page that
         produced it, and that page is gone. */
      liveMsg = 'This is not a Dynamics 365 page. Nothing was scanned and the panel is read only. ' +
        'Browse to a model-driven app page and press Refresh.';
      ui.view = 'summary'; ui.detail = null; ui.query = ''; ui.cursor = 0;
      ui.about = false; ui.modal = null;
      return;
    }
    var c = counts();
    /* Name what was scanned. Refresh is meant to be pressed after navigating,
       so "scan complete" on its own leaves the user guessing whether it
       picked up the new page. */
    liveMsg = 'Scanned ' + entityDisplay + ' in ' + scanMs + ' milliseconds. ' + c.fail + ' failures, ' + c.review +
      ' need review, ' + c.manual + ' manual checks, ' + c.clear + ' with no issues detected. No criterion is reported as passing.';
    ui.cursor = 0;
    /* A detail screen or a filtered list belongs to the page that produced it.
       Landing back on the Overview after a scan of a DIFFERENT page is the
       honest result; staying put would show the new page's findings under the
       old page's selection. */
    if (was !== entityDisplay) { ui.view = 'summary'; ui.detail = null; ui.query = ''; }
    else if (ui.view === 'detail' || ui.view === 'report') ui.view = 'summary';
  }

  /* The only actions that still work when the page is not Dynamics 365. */
  var ALWAYS_ON = { refresh: 1, close: 1, theme: 1, about: 1, min: 1, max: 1 };

  /* --- binding ------------------------------------------------------- */

  function bind() {
    var wrap = root.querySelector('.wrap');

    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = b.getAttribute('data-act');
        if (a === 'close') { cleanup(); return; }
        /* Read only off a Dynamics 365 page. Only the panel's own chrome and
           Refresh - the way back - still act. Nothing here is drawn in that
           state anyway; the guard is so a keyboard shortcut or a stale node
           cannot reach a results action either. */
        if (!pageIsD365 && !ALWAYS_ON[a]) return;
        if (a === 'theme') { ui.theme = b.getAttribute('data-theme'); store('theme', ui.theme); render(); return; }
        if (a === 'about') { ui.about = !ui.about; render(); return; }
        if (a === 'hidebanner') { ui.banner = false; render(); return; }
        if (a === 'refresh') { doScan(deepMode); render(); return; }
        if (a === 'deep') {
          /* Switching deep mode OFF needs no confirmation - it only ever makes
             the scan do less. Switching it on opens the dialog. */
          if (deepMode) { doScan(false); render(); return; }
          ui.about = false;
          ui.modal = 'deep'; render('modal'); return;
        }
        if (a === 'deepgo') { ui.modal = null; doScan(true); render(); return; }
        if (a === 'modalcancel') { ui.modal = null; render(); return; }
        if (a === 'wcag') { ui.view = 'wcag'; ui.detail = null; ui.about = false; render(); return; }
        if (a === 'report') { ui.report = exportReport(); ui.view = 'report'; render(); return; }
        if (a === 'allcrit') { ui.bucket = 'all'; setView('triage', 'all'); return; }
        if (a === 'copy') {
          /* Same asynchronous rejection as exportReport: announce the copy, then
             correct the announcement if the page denies clipboard-write. */
          var md = buildMarkdown();
          try {
            var wr = navigator.clipboard.writeText(md);
            liveMsg = 'Report copied to the clipboard.';
            if (wr && wr.then) {
              wr.catch(function () {
                liveMsg = 'Could not copy. Use the Report button instead.';
                render();
              });
            }
          } catch (err) { liveMsg = 'Could not copy. Use the Report button instead.'; }
          render(); return;
        }
        if (a === 'back') { ui.view = 'triage'; ui.detail = null; render(); return; }
        if (a === 'prev') { stepDetail(-1); return; }
        if (a === 'next') { stepDetail(1); return; }
        if (a === 'min') {
          ui.mode = ui.mode === 'min' ? 'normal' : 'min';
          if (ui.mode === 'min') ui.about = false;
          render(); return;
        }
        if (a === 'max') {
          ui.mode = ui.mode === 'max' ? 'normal' : 'max';
          render(); return;
        }
      });
    });

    root.querySelectorAll('[data-bucket]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-bucket');
        ui.detail = null;
        if (k === 'all') { ui.bucket = 'all'; setView('summary'); }
        else setView('triage', k);
      });
    });

    root.querySelectorAll('[data-scope]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-scope');
        ui.scope[k] = !ui.scope[k];
        if (!ui.scope.form && !ui.scope.command && !ui.scope.grid) ui.scope[k] = true;
        ui.cursor = 0;
        render();
      });
    });

    root.querySelectorAll('[data-comp]').forEach(function (b) {
      b.addEventListener('click', function () {
        ui.comp = b.getAttribute('data-comp');
        ui.cursor = 0;
        render();
      });
    });

    root.querySelectorAll('[data-sort]').forEach(function (b) {
      b.addEventListener('click', function () { ui.sort = b.getAttribute('data-sort'); ui.cursor = 0; render(); });
    });

    root.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); openKey(b.getAttribute('data-open')); });
    });

    root.querySelectorAll('[data-locate]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        locate(findings[+b.getAttribute('data-locate')].el);
      });
    });

    root.querySelectorAll('[data-locate-issue]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var key = b.getAttribute('data-locate-issue');
        for (var i = 0; i < issues.length; i++) {
          if (issues[i].key !== key) continue;
          var withEl = issues[i].elements.filter(function (f) { return f.el; });
          if (withEl.length) locate(withEl[0].el);
          return;
        }
      });
    });

    root.querySelectorAll('.row').forEach(function (r) {
      r.addEventListener('click', function () {
        ui.cursor = +r.getAttribute('data-idx');
        var list = rows();
        if (list[ui.cursor]) openKey(list[ui.cursor].key);
      });
    });

    var inp = root.querySelector('[data-role="filter"]');
    if (inp) {
      inp.addEventListener('input', function () { ui.query = inp.value; ui.cursor = 0; render('filter'); });
    }

    var winp = root.querySelector('[data-role="wfilter"]');
    if (winp) {
      winp.addEventListener('input', function () { ui.wq = winp.value; render('wfilter'); });
    }

    var hdr = root.querySelector('header.bar');
    if (hdr) hdr.addEventListener('pointerdown', startDrag);

    root.querySelectorAll('[data-resize]').forEach(function (gr) {
      gr.addEventListener('pointerdown', function (e) { startResize(e, gr.getAttribute('data-resize')); });
    });

    if (wrap) wrap.addEventListener('keydown', onKey);
  }

  /* --- keyboard ------------------------------------------------------ */

  function onKey(e) {
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

    if (e.key === 'Escape') {
      e.stopPropagation();
      if (ui.modal) { ui.modal = null; render(); return; }
      if (ui.about) { ui.about = false; render(); return; }
      if (ui.view === 'detail' || ui.view === 'report' || ui.view === 'wcag') {
        ui.view = 'triage'; ui.detail = null; render(); return;
      }
      cleanup();
      return;
    }
    /* While the dialog is up it is the only thing on screen that can be acted
       on. Tab is trapped inside it and the list shortcuts do not fire behind
       it - this tool reports on 2.1.2 and 2.4.3, so its own dialog has to hold
       up to them. Escape is handled above and is the way out. */
    if (ui.modal) {
      if (e.key === 'Tab') trapTab(e, '.modal');
      return;
    }
    if (typing) return;

    /* Read only: the list shortcuts act on rows that are not on screen. */
    if (!pageIsD365) return;

    if (ui.view === 'wcag') return;

    var k = e.key.toLowerCase();
    if (k === 'j' || k === 'k') {
      e.preventDefault();
      var list = rows();
      if (!list.length) return;
      if (ui.view === 'detail') { stepDetail(k === 'j' ? 1 : -1); return; }
      if (ui.view === 'summary') { setView('triage'); return; }
      ui.cursor = Math.max(0, Math.min(list.length - 1, ui.cursor + (k === 'j' ? 1 : -1)));
      render();
      return;
    }
    if (k === 'enter') {
      var l2 = rows();
      if (ui.view === 'triage' && l2[ui.cursor]) { e.preventDefault(); openKey(l2[ui.cursor].key); }
      return;
    }
    if (k === 'l') {
      e.preventDefault();
      var target = null;
      if (ui.view === 'detail') {
        var d = detailTarget();
        if (d && d.kind === 'issue') {
          var w = d.g.elements.filter(function (f) { return f.el; });
          if (w.length) target = w[0].el;
        }
      } else {
        var l3 = rows();
        var r = l3[ui.cursor];
        if (r && r.kind === 'issue') {
          var w2 = r.g.elements.filter(function (f) { return f.el; });
          if (w2.length) target = w2[0].el;
        }
      }
      if (target) locate(target);
      else { liveMsg = 'Nothing to locate for this result.'; render(); }
    }
  }

  /* Keeps Tab inside a container. Only used by the deep mode dialog, which is
     the one place in the panel where focus must not reach what is behind it. */
  function trapTab(e, sel) {
    var box = root.querySelector(sel);
    if (!box) return;
    var f = [].slice.call(box.querySelectorAll('button,a[href],input,select,textarea,[tabindex]'))
      .filter(function (el) { return !el.disabled && el.getAttribute('tabindex') !== '-1'; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    var cur = root.activeElement;
    if (e.shiftKey && (cur === first || !box.contains(cur))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (cur === last || !box.contains(cur))) { e.preventDefault(); first.focus(); }
  }

  /* --- drag and resize ------------------------------------------------ */

  function startDrag(e) {
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (t && t.closest && t.closest('button,.themetog,.pop')) return;
    if (e.button !== 0) return;
    /* Maximised the header does not drag at all - there is nowhere for a full
       viewport panel to go. */
    if (ui.mode === 'max') return;
    e.preventDefault();

    var g = ui.geo;
    var box = geometryFor(ui.mode);
    /* What the panel would be if it were open. Dragging a collapsed bar must
       not shrink the panel behind it: the stored size is always the open
       panel's, and the bar is derived from it, so the drag records the open
       geometry and converts the pointer back into it. */
    var open = geometryFor('normal');
    var shift = ui.mode === 'min' ? open.w - box.w : 0;
    var sx = e.clientX, sy = e.clientY;
    /* Undocking happens on the first actual movement, not on the press: a
       press that never moves is a click, and a click must not rearrange the
       window. */
    var moved = false;

    function move(ev) {
      if (!moved) {
        if (ev.clientX === sx && ev.clientY === sy) return;
        moved = true;
        g.docked = false;
        g.w = open.w;
        g.h = open.h;
      }
      g.left = clampN(box.left + (ev.clientX - sx), 0, Math.max(0, window.innerWidth - box.w)) - shift;
      g.top = clampN(box.top + (ev.clientY - sy), 0, Math.max(0, window.innerHeight - box.h));
      applyGeometry();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) return;
      /* Measured against where the dock actually puts the right edge, which is
         one inset in from the viewport, not on it. */
      if (g.left + shift + box.w >= window.innerWidth - insetFor() - DOCK_SNAP) g.docked = true;
      render();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function startResize(e, edge) {
    if (ui.mode !== 'normal') return;
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();

    var g = ui.geo;
    var box = geometryFor('normal');
    var right = box.left + box.w;
    var docked = g.docked !== false;
    var sx = e.clientX, sy = e.clientY;

    function move(ev) {
      var inset = insetFor();
      var vw = window.innerWidth, vh = window.innerHeight;
      if (edge === 'se') {
        /* Bottom right: width and height, top left corner pinned. A docked
           panel cannot be resized this way without leaving the dock, so it
           undocks. */
        g.docked = false;
        g.left = box.left;
        g.top = box.top;
        g.w = clampN(box.w + (ev.clientX - sx), MIN_W, Math.max(MIN_W, vw - box.left - inset));
        g.h = clampN(box.h + (ev.clientY - sy), MIN_H, Math.max(MIN_H, vh - box.top - inset));
      } else {
        /* Bottom left: the left and bottom edges, with the right edge pinned.
           That is the whole difference - this one resizes a panel without
           taking it out of the dock, so a docked height goes on its own key
           and the floating height is left alone. */
        var w = clampN(box.w - (ev.clientX - sx), MIN_W, Math.max(MIN_W, right - inset));
        var h = clampN(box.h + (ev.clientY - sy), MIN_H, Math.max(MIN_H, vh - inset - box.top));
        g.w = w;
        if (docked) {
          g.dockedH = h;
        } else {
          g.h = h;
          g.left = right - w;
          g.top = box.top;
        }
      }
      applyGeometry();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      render();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /* --- lifecycle ------------------------------------------------------ */

  /* Every key the panel handles is handled on .wrap by onKey. There is no
     document-level key listener: one used to exist here and every branch of it
     returned without doing anything. */
  function cleanup() {
    window.removeEventListener('resize', onWinResize);
    host.remove();
  }
  host.__oliver4Teardown = cleanup;

  function onWinResize() {
    /* geometryFor clamps everything to the viewport it is given, so a resize
       only has to re-run it. The stored width is left alone: shrinking the
       window should not lose the size the panel had. */
    applyGeometry();
  }

  window.addEventListener('resize', onWinResize);

  try {
    console.info('[Oliver4 Dynamics 365 Accessibility Checker] v' + VERSION + ' loaded from ' +
      (document.currentScript ? document.currentScript.src : 'unknown source'));
  } catch (e) {}

  doScan(false);
  render();
  /* Focus the shell once on open so the keyboard shortcuts work without a
     click. Every later render restores focus itself. */
  restoreFocus('*');
})();
