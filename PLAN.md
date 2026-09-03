# Org chart app — draft plan

## Objective

Replace the separate SFC and BBS HTML pages with one app for opening, editing,
and exporting organizational charts. Preserve both approved designs and their
reporting relationships during the migration.

Implementation is complete for the local first version described below. The
remaining scope decision concerns future shared access and accounts.

## Proposed first version

- **Chart library:** Open SFC or BBS, create a chart from either template, and
  duplicate or rename a chart.
- **Editor:** Show a page preview in the center, the chart hierarchy on the left,
  and contextual settings on the right. Select a role to edit its title, reporting
  relationships, and sibling order. Support adding and removing roles, with undo
  and redo.
- **Brand settings:** Store the company name, logo, colors, footer, logo size and
  clear space, plus watermark size, position, and opacity per company.
- **Layout:** Start from the existing A3 landscape compositions. Keep connectors
  attached to their roles and provide automatic spacing with manual adjustment
  where needed. Preserve deliberate line breaks and acronym capitalization.
- **Saving:** Autosave locally for the proposed first version. Offer an editable
  project-file download and import for backup and moving charts between computers.
- **Export:** Offer PDF and 300 DPI PNG for every chart, generated from the current
  saved editing state. Exclude editor controls and preserve fonts and page colors.

## Shared structure

- **Company:** Identity, assets, and default brand settings.
- **Chart:** Name, company, page settings, roles, reporting connections, and layout.
- **Role:** Stable ID, title, optional line breaks, visual style, and placement.
- **Reporting connection:** Source and destination role IDs, with routing settings
  when necessary. Store connections separately rather than assuming every role
  has exactly one parent; SFC's shared reporting connections must remain intact.
- **Renderer:** Use the same geometry and styling for the editor preview and both
  export formats. Recompute exports after edits rather than embedding old files.

Move required fonts and branding assets into maintained project folders. SFC
currently depends on the source PDF in Downloads and supporting files in `tmp`;
the app should operate from its own assets.

## Delivery sequence

1. **Unify viewing:** Introduce the chart library and shared data structure. Load
   both current charts in one app and compare them with the approved exports.
2. **Add editing:** Implement role and connection editing, company settings, undo,
   redo, and layout updates. Prevent circular reporting relationships.
3. **Add persistence:** Implement local autosave and project-file import/export.
   Confirm a reload restores roles, connections, layout, and branding.
4. **Unify exports:** Generate PDF and PNG from the active chart and verify long
   titles, logos, watermarks, connectors, page dimensions, and font rendering.

## Completion checks

- SFC retains its 21 roles; BBS retains its 20 roles and existing hierarchy.
- Switching charts preserves independent content and branding.
- Editing a title or reporting line updates the preview and subsequent exports.
- Both companies support PDF and PNG from the same export menu.
- The BBS logo clear space and centered watermark survive migration.
- Existing standalone files remain available as reference copies.

## Scope decision to discuss

Is this primarily a personal app used on one computer, or should multiple people
share and edit the charts? The proposal assumes personal use initially. Shared
editing would change the storage, accounts, and synchronization plan.

Publishing, accounts, and collaboration are outside the proposed first version
unless shared use is required.
