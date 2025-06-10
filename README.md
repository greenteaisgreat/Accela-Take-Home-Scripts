# Accela-Take-Home-Scripts

1. Introduction & Purpose
   This document is intended to guide you through a set of take-home scripting exercises that
   mirror real tasks you would perform as an Accela EMSE developer. Since you will not have
   direct access to our production instance, your goal is to write clear, complete
   JavaScript/EMSE-DOM scripts that a reviewer can read and verify for correct API usage,
   logical flow, and error handling.
   Note: You have 4 full days to complete these exercises to the best of your ability. Plan on
   approximately 2–3 hours of focused coding time, but use the additional days to review,
   refine, and ensure your solutions follow the guidelines below.

Below you will find:

1. An overview of Accela EMSE and the API documentation link.
2. General instructions and assumptions.
3. Four discrete scripting exercises, each with:

- A description of the business requirement.
- Specific deliverables (what to submit).
- Hints on which DOM APIs to use.

4. Submission guidelines (file formats, naming conventions, deadlines).
5. Evaluation criteria.

6. Accela EMSE Overview & API Reference
   Accela EMSE (Event-Based Script Engine)

- EMSE allows you to attach JavaScript code to Accela events (e.g., record creation,
  inspection result submission).
- The code runs on the server using Accela’s built-in JavaScript engine and a set of “aa” APIs
  (the “EMSE DOM”) for reading/updating records, contacts, inspections, fees, etc.
  API Reference:
  All class and method details are documented here (navigate to the “aa.emse.dom” packages
  for core functionality):
  https://default.sfplanning.org/EMSE-API/com/accela/aa/emse/dom/package-
  summary.html

3. General Instructions & Environment Assumptions

JavaScript Flavor:

- Assume standard ECMAScript 5 syntax (no ES6 modules).
- Accela’s engine provides a global `aa` object. You do not need to load or import anything
  else.

No Live Testing:

- You will not deploy these scripts to a running Accela instance. Instead, a reviewer will read
  your code and verify that it would work if placed in the correct event hook.
- If any part of your logic depends on, for example, a custom library or special CapID, please
  note that in comments.
  Error Handling & Logging:
- Every call to `aa.<module>.<method>(…)` should be followed by a `getSuccess()` check.
- Use `logDebug(...)` (or comments) to indicate where you would log errors or informational
  messages.

Helper Functions:

- If you need date calculations (e.g., “add 3 business days”), write a small helper function in
  the same file. Do not rely on external libraries.
  Naming Conventions:
- Use descriptive variable names (e.g., `ownerContactScriptModel`, `inspResult`).
- Keep indentation consistent (2 or 4 spaces, your choice).

Comments:
etc.).

- Comment each major block (e.g., “// 1. Fetch all contacts,” “// 2. Check if inspection failed,”
- Comments help the reviewer understand your logic.

4. Scripting Exercises
   4.1. Exercise 1: ApplicationSubmit Event – Copy Applicant’s Phone to Owner
   Requirement:
   Whenever a new permit application is submitted (the ApplicationSubmit event), ensure that
   the “Owner” contact has a valid phone number. If the Owner’s phone is blank and the
   “Applicant” contact has a phone, copy the Applicant’s phone to the Owner contact.

Deliverables:
• A JavaScript snippet (e.g., CopyPhoneOnSubmit.js) that would run in an ApplicationSubmit
event (e.g., ACA_OnSubmit or WTUA).

• The snippet must:

1. Retrieve all CapContactScriptModel entries for the current record
   (`aa.people.getCapContactByCapID(capId)`).

2. Locate the “Owner” and “Applicant” contacts by checking
   `getCapContactModel().getContactType()`.

3. For the Owner contact:

- Use `aa.people.getPeopleByCapContact(ownerScriptModel)` to fetch the PeopleModel.
- Check `PeopleModel.getPhone1()`.
- If blank, retrieve Applicant’s phone via
  `aa.people.getPeopleByCapContact(applicantScriptModel)`, then
  `peopleModel.getPhone1()`.
- Set the Owner’s phone with `ownerPeopleModel.setPhone1(...)`.
- Inject the updated PeopleModel back into the CapContactScriptModel (e.g.,
  `ownerScriptModel.getPeople().setPhone1(...)`).
- Save via `aa.people.editCapContact(ownerScriptModel)`.

4. After each `aa` call, include error checks (`if (!result.getSuccess()) { logDebug(...) }`).

5. Use `logDebug(...)` (or comments) to show where you would log successes or failures.
   API Hints:
   • `aa.people.getCapContactByCapID(capId)` → Result/array of `CapContactScriptModel`.
   • `contactScriptModel.getCapContactModel().getContactType()`.
   • `aa.people.getPeopleByCapContact(capContactScriptModel)` → PeopleModel.
   • `peopleModel.getPhone1()`, `peopleModel.setPhone1(phoneString)`.
   • `aa.people.editCapContact(capContactScriptModel)` saves changes.

4.2. Exercise 2: InspectionResultSubmit Event – Failed Inspection → Email + Re-Schedule
Requirement:
When an inspection result is submitted (InspectionResultSubmit event), check if
`inspResult` is “Fail.” If it is, do two things:

1. Email the record’s primary contact (Owner or Applicant) a notification about the failure.

2. Schedule a re-inspection of the same type exactly 3 business days later at 9:00 AM.

Deliverables:
• A JavaScript snippet (e.g., FailInspectResubmit.js) that would run in the
InspectionResultSubmit context. It must:

1. Retrieve InspectionScriptModel and InspectionResultScriptModel from `aa.env` (e.g.,
   `aa.env.getValue("Inspection")`, `aa.env.getValue("Result")`).

2. Check `inspResult = resultObj.getInsResult()`. If not "Fail", exit early.

3. Fetch all contacts via `aa.people.getCapContactByCapID(capId)`. Loop through until you
   find Owner or Applicant with a non-blank `peopleModel.getEmail()`.

4. Invoke `aa.document.sendEmail(fromAddr, toAddr, cc, bcc, subject, body)`. Use a hard-
   coded “from” (e.g., "no-reply@agency.gov"). If no email is found, log a message and skip
   scheduling.

5. Calculate a JavaScript Date that is 3 business days from today. Include a helper function
   to skip weekends.

6. Call `aa.inspection.scheduleInspection(capId, inspectionType, targetDate, "09:00")`.

7. Check each `getSuccess()` and use `logDebug(...)` accordingly.
   API Hints:
   • `aa.env.getValue("Inspection")` → InspectionScriptModel.
   • `InspectionResultScriptModel.getInsResult()` to read "Pass"/"Fail."
   • `aa.people.getCapContactByCapID(capId)` + `aa.people.getPeopleByCapContact(...)` →
   `PeopleModel.getEmail()`.
   • `aa.document.sendEmail(from, to, cc, bcc, subject, body)`.
   • JavaScript date arithmetic:
   function addBusinessDays(startDate, days) { … }
   var threeBizDays = addBusinessDays(new Date(), 3);
   • `aa.inspection.scheduleInspection(capId, inspType, javaDate, timeString)`.

4.3. Exercise 3: RecordCreateBefore Event – Copy Child “Estimated Value” to Parent
Requirement:
When a “Sub-Permit” (child) is created under a parent “Master Permit”
(RecordCreateBefore event), copy the child’s custom field named “Estimated Value” into the
parent record’s custom field “Latest Sub–Value.”

Deliverables:
• A JavaScript snippet (e.g., CopyASIOnCreate.js) that would run in RecordCreateBefore (for
Permit/Sub-Permit/Application). It must:

1. Assume `AInfo` is already populated for the child (i.e., `AInfo["Estimated Value"]` exists).
   If the child’s Estimated Value is blank, exit.

2. Check `capId.getParentCapID()`. If there is no parent, exit.

3. Read the parent’s ASI array using `aa.appSpecificInfo.getByPK(parentID1, parentID2,
parentID3)`.

4. Loop through the returned `AppSpecificModel[]` to locate the field whose
   `getCheckboxDesc()` (the ASI label) equals "Latest Sub–Value".

5. Call `asiModel.setChecklistComment(childEstimatedValue)` (for a free-text ASI) to
   overwrite.

6. Save the update using `aa.appSpecificInfo.editAppSpecInfo(asiModel)`.

7. After each `aa` call, include `getSuccess()` checks and `logDebug(...)`.

API Hints:
• `capId.getParentCapID()` (returns a CapIDModel or null).
• `aa.appSpecificInfo.getByPK(ID1, ID2, ID3)`.
• `AppSpecificModel.getCheckboxDesc()` to read the field name.
• `AppSpecificModel.setChecklistComment(newValue)` to set the new text.
• `aa.appSpecificInfo.editAppSpecInfo(appSpecificModel)` to save.

4.4. Exercise 4: Batch Function – Expire “Pending Fee” Records
Requirement:
Write a self-contained JavaScript function named
`expireStalePendingFeeRecords(capIdArray)` that, given an array of CapID-like objects (`{
getID1:…, getID2:…, getID3:… }`), does the following for each record:

1. Fetch the record’s status and file date via `aa.cap.getCap(capId)`.

2. If status equals “Pending Fee” and the file date is more than 30 calendar days ago:

- Update status to “Expired” using `aa.cap.updateCapStatus(capId, "Expired", comment,
userID)`.
- Add a comment via `aa.cap.createCapComment(capId, comment)`.

3. Otherwise, skip to the next record.
   Deliverables:
   • A JavaScript file (e.g., ExpirePendingFeeBatch.js) containing:

1. The function `expireStalePendingFeeRecords(capIdArray)`.

1. A small helper, e.g.:
   function dateDiffInDays(d1, d2) { /_…_/ }.

1. A short code snippet at the bottom showing how you’d call it with an example array of
   CapIDs (e.g., from `aa.cap.getCapID("2025PA-000001", "00000", "00001").getOutput()`).

1. After every `aa.cap.getCap(...)`, `aa.cap.updateCapStatus(...)`, and
   `aa.cap.createCapComment(...)` call, include a `getSuccess()` check.

1. Use `logDebug(...)` (or comments) to indicate success/failure or skipping logic.
   API Hints:
   • `aa.cap.getCap(capId)` → CapScriptResult → CapModel (use `getCapStatus()` and
   `getFileDate()`).
   • Convert `java.util.Date` → JavaScript `Date` when computing age:
   var jsDate = new Date(javaDate.getYear()+1900, javaDate.getMonth(), javaDate.getDate());
   • `aa.cap.updateCapStatus(capId, "Expired", "Auto-expired…", "System").
• `aa.cap.createCapComment(capId, commentText)`.

1. Submission Guidelines
   File Organization:
   • Submit four separate `.js` files (one per exercise), named exactly:

- CopyPhoneOnSubmit.js
- FailInspectResubmit.js
- CopyASIOnCreate.js
- ExpirePendingFeeBatch.js

• Or combine all scripts into a single file (e.g., AccelaTakeHome.js) with clearly marked
sections (using comments such as “// --- Exercise 1: ApplicationSubmit … ---”).

Directory Structure (if zipping):
AccelaTakeHome/
├─ CopyPhoneOnSubmit.js
├─ FailInspectResubmit.js
├─ CopyASIOnCreate.js
└─ ExpirePendingFeeBatch.js

Coding Style:
• Use 2 or 4 spaces for indentation—be consistent.
• Use descriptive variable names (e.g., `ownerContactModel`, `inspectionResultModel`).
• Include comments for each major step.
• Check `getSuccess()` on every `aa.*` API call before accessing `getOutput()`.
Assumptions & Comments:
• At the top of each file, include a brief comment stating:
/\*\*

- Author: <Your Name>
- Date: <Submission Date>
- Purpose: <“Exercise 1: Copy Applicant’s phone to Owner on ApplicationSubmit”>
- Assumptions: capId is provided by the EMSE engine in this context.
  \*/
  • If you need to write a helper (e.g., for date arithmetic), wrap it inside the same file and
  comment its purpose.
  File Format & Deadline:
  • Submissions must be plain `.js` files (UTF-8 encoding) or a single ZIP containing only the
  `.js` files. Do not submit `.docx` or screenshot files.
  • Submit by: June 8, 2025 at 12:00 AM EDT to csantiago@leegov.com

6. Evaluation Criteria
   Your submission will be reviewed for the following:

1. Correct API Usage:
   • Are the proper `aa.*` modules and methods used?
   • Is `getSuccess()` checked after each API call?
   • Are the correct models accessed (e.g., `CapContactScriptModel`, `PeopleModel`,
   `AppSpecificModel`, `CapModel`)?

1. Logical Flow & Completeness:
   • Does the script fully satisfy the business requirement?
   • Are edge cases handled (e.g., missing contact, missing ASI field, no parent record,
   inspection not “Fail”)?
   • Is the code organized so a reviewer can follow each step?

1. Error Handling & Logging:
   • Does the code handle API failures gracefully (e.g., `if (!result.getSuccess()) { logDebug(...)
return; }`)?
   • Are there appropriate debug/log messages to indicate what would happen at runtime?

1. Commenting & Readability:
   • Is each major block commented (e.g., “// 1. Fetch parent’s ASI fields”)?
   • Are helper functions (date diffs, business-day additions) clearly explained?
   • Overall indentation, spacing, and naming conventions.

1. Submission Organization:
   • Are files named correctly?
   • Is the ZIP (or combined file) easy to navigate?
   • Is there a short header comment in each file summarizing purpose, author, and
   assumptions?

1. Additional Resources
   Accela EMSE “aa” API quick reference (browse the package root to find `aa.cap`, `aa.people`,
   `aa.inspection`, `aa.document`, `aa.appSpecificInfo`):
   https://default.sfplanning.org/EMSE-API/com/accela/aa/emse/dom/package-
   summary.html
   JavaScript Date utilities (for date-difference and business-day logic):

- Built-in `Date.getTime()`, `Date.setDate()`, `Date.getDay()`.
- Example helper:
  function addBusinessDays(startDate, n) {
  var d = new Date(startDate.getTime());
  var count = 0;
  while (count < n) {
  d.setDate(d.getDate() + 1);
  if (d.getDay() !== 0 && d.getDay() !== 6) {
  count++;
  }
  }
  return d;
  }
