/**
 * Author: Nathan Gregory Bornstein
 * Date: June 8th, 2025
 * Purpose: Expire "Pending Fee" Records using a Batch Function
 * Assumptions:
 *  - aa global object is available and all necessary methods within it
 */

// helper function to return the number of full days between two Date objects
function dateDiffInDays(d1, d2) {
  // convert both dates to UTC to prevent problems with daylight saving time,
  // calculating the difference in milliseconds...
  var diffMs =
    Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate()) -
    Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());

  // ...and then converting milliseconds to days:
  // 1000 ms/sec × 60 sec/min × 60 min/hour × 24 hour/day;
  // this is a standardized calcuation for Unix Epoch time
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// batch function to expire records with "Pending Fee" status older than 30 calendar days
function expireStalePendingFeeRecords(capIdArray) {
  logDebug("Starting expireStalePendingFeeRecords batch function...");

  // handle falsy/empty capIdArray
  if (!capIdArray || capIdArray.length === 0) {
    logDebug("No CapIDs provided in the input array. Exiting script");
    return;
  }

  // get the current date and log it
  var currentDate = new Date();
  logDebug("Current Date: " + currentDate);

  // define the staleness threshold, 30 days in this case
  var thresholdDays = 30;

  // define the necessary arguments for use in aa.cap.updateCapStatus
  var expiredStatus = "Expired";
  var expiryComment =
    "Auto-expired due to 'Pending Fee' status older than " +
    thresholdDays +
    " days";
  var systemUser = "System";

  // iterate through capIdArray of capId objects
  for (var i = 0; i < capIdArray.length; i++) {
    var capId = capIdArray[i];

    // ensure capId object is valid and has expected methods
    if (
      !capId ||
      typeof capId.getID1 !== "function" ||
      typeof capId.getID2 !== "function" ||
      typeof capId.getID3 !== "function"
    ) {
      logDebug(
        "Skipping invalid object in capIdArray at index " +
          i +
          ". Expected CapID-like object"
      );
      continue; // skip to the next item in the array
    }

    logDebug(
      "Processing CapID: " +
        capId.getID1() +
        "-" +
        capId.getID2() +
        "-" +
        capId.getID3()
    );

    // fetch the record's status and file date
    var capResult = aa.cap.getCap(capId);

    // handle failure in retrieving Cap
    if (!capResult.getSuccess()) {
      logDebug(
        "ERROR: Failed to get Cap details for CapID " +
          capId.getID1() +
          "-" +
          capId.getID2() +
          "-" +
          capId.getID3() +
          ". Error: " +
          capResult.getErrorMessage()
      );
      continue; // skip to the next capId
    }
    // retrieve Cap model
    var capModel = capResult.getOutput();

    // handle falsy Cap model; shouldn't happen if getSuccess
    // is true, but is a possible edge case
    if (!capModel) {
      logDebug(
        "ERROR: CapModel is null for CapID " +
          capId.getID1() +
          "-" +
          capId.getID2() +
          "-" +
          capId.getID3() +
          " despite successful aa.cap.getCap call"
      );
      continue; // skip to the next Cap model
    }

    var capStatus = capModel.getCapStatus(); // get status
    var fileDateJava = capModel.getFileDate(); // get file date

    logDebug("Status: " + capStatus + ", File Date: " + fileDateJava);

    // check if fileDateJava is valid before proceeding with
    // date calculations; skip and log reason if invalid
    if (!fileDateJava) {
      logDebug(
        "Skipping CapID " +
          capId.getID1() +
          "-" +
          capId.getID2() +
          "-" +
          capId.getID3() +
          ": File date is missing"
      );
      continue;
    }

    // convert java.util.Date to javascript date, per hint and log result
    var fileDateJS = new Date(
      fileDateJava.getYear() + 1900,
      fileDateJava.getMonth(),
      fileDateJava.getDate()
    );
    logDebug("File Date (JS): " + fileDateJS);

    // calculate the difference in days using our helper function and log result
    var daysDifference = dateDiffInDays(fileDateJS, currentDate);
    logDebug("Days since File Date: " + daysDifference);

    // check if status is "Pending Fee" and file date is more than 30 days ago
    if (capStatus === "Pending Fee" && daysDifference > thresholdDays) {
      logDebug(
        "  CapID " +
          capId.getID1() +
          "-" +
          capId.getID2() +
          "-" +
          capId.getID3() +
          " meets expiry criteria (Status: " +
          capStatus +
          ", Days Old: " +
          daysDifference +
          "). Proceeding to expire"
      );

      // update status to "Expired" if conditions met
      var updateStatusResult = aa.cap.updateCapStatus(
        capId,
        expiredStatus,
        expiryComment,
        systemUser
      );
      // handle failure in updating status, while still processing further records
      if (!updateStatusResult.getSuccess()) {
        logDebug(
          "ERROR: Failed to update status for CapID " +
            capId.getID1() +
            "-" +
            capId.getID2() +
            "-" +
            capId.getID3() +
            ". Error: " +
            updateStatusResult.getErrorMessage()
        );
      }
      // handle success in updating status
      else {
        logDebug(
          "  Successfully updated status for CapID " +
            capId.getID1() +
            "-" +
            capId.getID2() +
            "-" +
            capId.getID3() +
            " to '" +
            expiredStatus +
            "'"
        );
      }

      // create Cap comment, per hint
      var createCommentResult = aa.cap.createCapComment(capId, expiryComment);

      // handle failure in creating comment, while still processing further records
      if (!createCommentResult.getSuccess()) {
        logDebug(
          "ERROR: Failed to add comment for CapID " +
            capId.getID1() +
            "-" +
            capId.getID2() +
            "-" +
            capId.getID3() +
            ". Error: " +
            createCommentResult.getErrorMessage()
        );
      }
      // handle success in creating comment
      else {
        logDebug(
          "  Successfully added comment to CapID " +
            capId.getID1() +
            "-" +
            capId.getID2() +
            "-" +
            capId.getID3() +
            "."
        );
      }
    }
    // if status isn't "Pending Fee" and more than 30 days old, continue
    else {
      logDebug(
        "  Skipping CapID " +
          capId.getID1() +
          "-" +
          capId.getID2() +
          "-" +
          capId.getID3() +
          ". Status is '" +
          capStatus +
          "' (expected 'Pending Fee') or is only " +
          daysDifference +
          " days old (expected >" +
          thresholdDays +
          ")"
      );
    } // log completion of current capId
    logDebug(
      "Finished processing CapID: " +
        capId.getID1() +
        "-" +
        capId.getID2() +
        "-" +
        capId.getID3()
    );
  }
  // log completion of batch function
  logDebug("Finished expireStalePendingFeeRecords batch function");
}

// --- sample code snippet to call expireStalePendingFeeRecords --- //

// i'm thinking there's a more imperative approach to this, but i was unable
// to figure out how to loop through internal Accela records, without having direct
// access to an accela environment, so my solution is a more declarative approach

// log start of sample invocation
logDebug("~* Sample invocation of expireStalePendingFeeRecords *~");

// initialize an array to hold CapId objects
var exampleCapIDs = [];

// example of getting a single CapID and adding it to the array, per hint;
// any possible way to loop through Accela CapIDs without having to declare
// each one as its own variable?
var exampleCapIdResult1 = aa.cap.getCapID("2025PA", "00000", "00001");

// handle failure in retrieving CapId result
if (!exampleCapIdResult1.getSuccess()) {
  logDebug(
    "ERROR: Failed to obtain sample CapID 1. Error: " +
      exampleCapIdResult1.getErrorMessage()
  );
}
// handle success in retrieving CapId result
else {
  var exampleCapId1 = exampleCapIdResult1.getOutput();
  if (exampleCapId1) {
    exampleCapIDs.push(exampleCapId1);
    logDebug("Sample CapID 1 obtained");
  }
  // handle falsy/invalid CapId
  else {
    logDebug("ERROR: Output of aa.cap.getCapID is null for sample ID 1");
  }
}

// add more example CapId's if needed, using the same logic as before
var exampleCapIdResult2 = aa.cap.getCapID("2025PA-000002", "00000", "00002");

if (!exampleCapIdResult2.getSuccess()) {
  var exampleCapId2 = exampleCapIdResult2.getOutput();
  if (exampleCapId2) {
    exampleCapIDs.push(exampleCapId2);
    logDebug("Sample CapID 2 obtained.");
  } else {
    logDebug("ERROR: Output of aa.cap.getCapID is null for sample ID 2");
  }
} else {
  logDebug(
    "ERROR: Failed to obtain sample CapID 2. Error: " +
      exampleCapIdResult2.getErrorMessage()
  );
}

// call the batch function with the example CapIDs array
expireStalePendingFeeRecords(exampleCapIDs);

// log completion of example function call
logDebug("~* Sample Function Call Snippet Ends *~");

// log completion of script
logDebug("Finished script: ExpirePendingFeeBatch.js");
