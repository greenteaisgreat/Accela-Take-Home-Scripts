/**
 * Author: Nathan Gregory Bornstein
 * Date: June 8th, 2025
 * Purpose: Copy child "Estimated Value" to parent "Latest Sub–Value" on RecordCreateBefore
 * Assumptions:
 *  - AInfo is already populated for the child record being created
 *  - capId property exists on getParentCapID method
 *  - .getId1(), .getId2(), etc. exists on getParentCapID, per Accela docs
 *  - there is only a single field for "Latest Sub-Value" while iterating parentASIArray
 */
// log initiation of script
logDebug("Starting script: CopyASIOnCreate.js");
logDebug("Event: Retrieving Child's Estimated Value");

// retrieve the child's 'Estimated Value' custom field, assuming AInfo exists
var childEstimatedValue = AInfo["Estimated Value"];

// handle failure in retrieving childEstimatedValue
if (!childEstimatedValue) {
  logDebug("Child 'Estimated Value' is blank. Exiting script");
  return;
}
// handle success in retrieving childEstimatedValue
logDebug("Child 'Estimated Value' found: " + childEstimatedValue);

// check if the current record has a parent record, assuming capId exists on getParentCapID
var parentCapID = capId.getParentCapID();

// handle failure in retrieving parent record
if (!parentCapID) {
  logDebug("No parent record found for this child record. Exiting script");
  return;
}
// handle success in retrieving parent record, assuming getIDx methods exist
logDebug(
  "Parent CapID found: " +
    parentCapID.getID1() +
    "-" +
    parentCapID.getID2() +
    "-" +
    parentCapID.getID3()
);

// extract id components from the parent CapIDModel
var parentID1 = parentCapID.getID1();
var parentID2 = parentCapID.getID2();
var parentID3 = parentCapID.getID3();

// read the parent record's ASI array
var parentASIResult = aa.appSpecificInfo.getByPK(
  parentID1,
  parentID2,
  parentID3
);

// handle failure in retrieving parent ASI array
if (!parentASIResult.getSuccess()) {
  logDebug(
    "ERROR: Failed to get parent ASI: " + parentASIResult.getErrorMessage()
  );
  return;
} // handle success in retrieving parent ASI array
else logDebug("Successfully retrieved parent ASI");

// get AppSpecificModel array of objects
var parentASIArray = parentASIResult.getOutput();

// handle failure if parentASIArray is invalid or empty
if (!parentASIArray || parentASIArray.length === 0) {
  logDebug("Parent ASI array is empty or invalid. Exiting script");
  return;
}
// otherwise, log success for valid parentASIArray
else logDebug("Parent ASI array is valid, continuing script...");

// indicator for finding Sub-Value
var latestSubValueFound = false;

// loop through the returned AppSpecificModel array to locate "Latest Sub–Value" field
for (var i = 0; i < parentASIArray.length; i++) {
  var asiModel = parentASIArray[i]; // current model
  var asiLabel = asiModel.getCheckboxDesc(); // get ASI field name label...
  logDebug("Checking ASI field: " + asiLabel + "..."); // and log it

  // check if the label matches the target field
  if (asiLabel === "Latest Sub-Value") {
    logDebug("'Latest Sub-Value' field found on parent. Updating value");

    // call asiModel to set the new value
    asiModel.setChecklistComment(childEstimatedValue);

    // save the update on the ASI model
    var editASIResult = aa.appSpecificInfo.editAppSpecInfo(asiModel);

    // handle failure on saving the updated parent ASI
    if (!editASIResult.getSuccess()) {
      logDebug(
        "ERROR: Failed to save updated parent ASI: " +
          editASIResult.getErrorMessage()
      );
      return;
    }
    //handle success on saving the updated parent ASI
    else {
      logDebug(
        "Successfully copied '" +
          childEstimatedValue +
          "' to parent 'Latest Sub-Value'"
      );
      latestSubValueFound = true; // set indicator to true
    }
    // assuming only one field with this label, we can break the loop
    break;
  }
}
// handle failure if target field was not found on the parent
if (!latestSubValueFound) {
  logDebug("'Latest Sub-Value' field not found on the parent record");
}

// log completion of script
logDebug("Finished script: CopyASIOnCreate.js");
