/**
 * Author: Nathan Gregory Bornstein
 * Date: June 8th, 2025
 * Purpose: Exercise 2: reschedule and email Contact after a failed inspection
 * Assumptions:
 *  - capId is provided by the EMSE engine in this context.
 *  - aa global object is available and all necessary methods within it
 *  - inspection time is based on a 24hr format
 *  - Accela's scheduleInspection date format is MM/DD/YYYY, per the docs
 */

// helper function to add business days, omitting weekends
function addBusinessDays(startDate, days) {
  var count = 0;
  // create a copy to avoid modifying original date
  var date = new Date(startDate.getTime());

  while (count < days) {
    // move to the next day
    date.setDate(date.getDate() + 1);

    // getDay() returns 0 for sunday, 6 for saturday; increments count only on weekdays
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      count++;
    }
  }
  return date;
}

// log initiation of script
logDebug("Starting script: FailInspectResubmit.js");
logDebug("Event: Retrieving Inspection Models");

// retrieve Inspection models
var inspectionScriptModel = aa.env.getValue("Inspection");
var inspectionResultScriptModel = aa.env.getValue("Result");

// our custom InspectionScriptModel
var inspectionModel = null;

// exit early if InspectionScriptModel is not available
if (!inspectionScriptModel.getSuccess()) {
  logDebug("ERROR: Could not retrieve InspectionScriptModel from aa.env");
  return;
}
// retrieve the returned InspectionScriptModel
else {
  logDebug("Successfully retrieved InspectionScriptModel");
  inspectionModel = inspectionScriptModel;
}
// our custom InspectionResultScriptModel
var resultObj = null;

// exit early if InspectionResultScriptModel is not available
if (!inspectionResultScriptModel.getSuccess()) {
  logDebug("ERROR: Could not retrieve InspectionResultScriptModel from aa.env");
  return;
}
// retrieve the returned InspectionResultScriptModel
else {
  resultObj = inspectionResultScriptModel;
  logDebug("Successfully retrieved Inspection Model Result");
}

// our custom inspectionResult
var inspResult = null;

// check if getInsResult method is present on resultObj
if (resultObj && typeof resultObj.getInsResult === "function") {
  inspResult = resultObj.getInsResult();
  logDebug("Inspection Result: " + inspResult);
} else {
  logDebug(
    "WARNING: Could not determine inspection result. Skipping further actions"
  );
  return;
}

// if the inspection result is not "Fail", exit early
if (inspResult !== "Fail") {
  logDebug("Inspection result is not 'Fail'. Exiting script");
  return;
} else {
  logDebug("Inspection result is 'Fail'. Proceeding with email and reschedule");
}

// continue only if inspResult is "Fail"
if (inspResult === "Fail") {
  // fetch all contacts and find Owner or Applicant with a non-blank email
  var capContactResult = aa.people.getCapContactByCapID(capId);

  // our custom Owner/Applicant email
  var primaryContactEmail = null;
  var primaryContactType = null;

  // handle failure retrieving Owner/Applicant
  if (!capContactResult.getSuccess()) {
    logDebug(
      "ERROR: Failed to get Cap Contacts by Cap ID: " +
        capContactResult.getErrorMessage()
    );
  }
  // handle success in retrieving Owner/Applicant
  else {
    var capContactList = capContactResult.getOutput(); // array

    if (capContactList && capContactList.length > 0) {
      logDebug("Found " + capContactList.length + " contacts for the record");

      // iterate through capContactList to find Owner or Applicant with email
      for (var i = 0; i < capContactList.length; i++) {
        var capContactScriptModel = capContactList[i];

        // locate Owner and Applicant models
        var contactType = capContactScriptModel
          .getCapContactModel()
          .getContactType();

        // check if the contact type is Owner or Applicant
        if (contactType === "Owner" || contactType === "Applicant") {
          // get the PeopleModel for this contact
          var peopleResult = aa.people.getPeopleByCapContact(
            capContactScriptModel
          );

          // handle failure in retrieving PeopleModel with position detail & error msg
          if (!peopleResult.getSuccess()) {
            logDebug(
              "ERROR: Failed to get PeopleModel for contact " +
                i +
                ": " +
                peopleResult.getErrorMessage()
            );
          }
          // handle success in retrieving PeopleModel
          else {
            var peopleModel = peopleResult.getOutput(); // get the PeopleModel

            // check if getEmail method exists
            if (peopleModel && typeof peopleModel.getEmail === "function") {
              var contactEmail = peopleModel.getEmail(); // get email address

              // check if email is not blank
              if (contactEmail && contactEmail !== "") {
                primaryContactEmail = contactEmail; // assign email
                primaryContactType = contactType; // and type to custom vars

                logDebug(
                  // log the found email and type for Contact
                  "Found primary Contact (" +
                    contactType +
                    ") with email: " +
                    primaryContactEmail
                );
                // exit early if we find our Contact
                break;
              }
              // if email is blank, request Contact's email to be updated
              else {
                logDebug(
                  "Contact " +
                    contactType +
                    " found, but email is blank. \n Please Update " +
                    i +
                    "'s email"
                );
                return;
              }
            } // log failure in retrieving PeopleModel
            else {
              logDebug(
                "WARNING: Could not retrieve PeopleModel or getEmail method for contact " +
                  i +
                  " (" +
                  contactType +
                  ")"
              );
              return;
            }
          }
        } else {
          // log skipped contacts
          logDebug("Skipping contact type: " + contactType);
        }
      }

      // check if no email was found after the loop
      if (!primaryContactEmail) {
        logDebug(
          "WARNING: No Owner or Applicant contact with a non-blank email found. Skipping email and reschedule."
        );
      }
    } // log if no contacts found
    else {
      logDebug(
        "WARNING: No contacts found for this record. Skipping email and reschedule."
      );
    }
  }

  // invoke aa.document.sendEmail if an email was found
  if (primaryContactEmail) {
    var fromAddr = "no-reply@agency.gov"; //hard-coded email
    var toAddr = primaryContactEmail; // intended Contact recipient
    var cc = ""; // no cc
    var bcc = ""; // or bcc specified
    var subject = "Inspection Failed for Record " + capId.getCustomID(); // example subject

    // sample body for email message
    var body =
      "Dear " +
      primaryContactType +
      ",\n\nYour inspection for record " +
      capId.getCustomID() +
      " has resulted in a 'Fail' status.\n\nA re-inspection has been scheduled for 3 business days from now at 9:00 AM.\n\nThank you.";

    // attempt to send email and log indication of doing so
    logDebug("Attempting to send email to: " + toAddr + "...");
    var sendEmailResult = aa.document.sendEmail(
      fromAddr,
      toAddr,
      cc,
      bcc,
      subject,
      body
    );
    // handle email send failure
    if (!sendEmailResult.getSuccess()) {
      logDebug(
        "ERROR: Failed to send email: " + sendEmailResult.getErrorMessage()
      );
      return;
    } // handle email send success
    else {
      logDebug("Email sent successfully to " + toAddr + "!");
    }
  }

  // get current date
  var today = new Date();

  // use helper function to get 3 business days from 'today' var,
  // adhering to Accela requirements of MM/DD/YYYY format
  var threeBizDays = addBusinessDays(today, 3).toLocaleDateString();
  logDebug("Calculated target date: " + threeBizDays);

  // our custom inspection type model
  var inspectionTypeToSchedule = null;

  // get inspection type from InspectionScriptModel retrieved earlier
  if (
    // add check if getInspectionType method exists
    inspectionModel &&
    typeof inspectionModel.getInspectionType === "function"
  ) {
    inspectionTypeToSchedule = inspectionModel.getInspectionType();
    logDebug("Scheduling re-inspection of type: " + inspectionTypeToSchedule);
  }
  // handle failure in retrieving inspection type
  else {
    logDebug(
      "WARNING: Could not determine inspection type from InspectionScriptModel.\nSkipping re-scheduling"
    );
    return;
  }
  // log the re-inspection date and time
  if (inspectionTypeToSchedule) {
    var timeString = "09:00"; // hard-coded time
    logDebug(
      "Scheduling re-inspection for " + threeBizDays + " at " + timeString
    );
    // schedule the re-inspection
    var scheduleResult = aa.inspection.scheduleInspection(
      capId,
      inspectionTypeToSchedule,
      threeBizDays,
      timeString
    );
    // handle failure in scheduling the re-inspection
    if (!scheduleResult.getSuccess()) {
      logDebug(
        "ERROR: Failed to schedule re-inspection: " +
          scheduleResult.getErrorMessage()
      );
      return;
    } // handle success in scheduling the re-inspection
    else {
      logDebug("Re-inspection scheduled successfully");
      return;
    }
  } // handle failure in retrieving inspection type
  else {
    logDebug("Re-scheduling skipped due to missing inspection type");
    return;
  }
}
// log completion of script
logDebug("Exercise 2 script finished");
