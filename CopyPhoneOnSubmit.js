/**
 * Author: Nathan Gregory Bornstein
 * Date: June 8th, 2025
 * Purpose: Exercise 1: Copy Applicant’s phone to Owner on ApplicationSubmit
 * Assumptions:
 * - aa global object is available and all necessary methods within it
 * - capId is provided by the EMSE engine in this context
 */

// log initiation of script
logDebug("Starting script: CopyPhoneOnSubmit.js");
logDebug("Event: ApplicationSubmit");

// retrieve all CapContactScriptModel entries for the current record
var capContactResult = aa.people.getCapContactByCapID(capId);

// handle API call failure
if (!capContactResult.getSuccess()) {
  logDebug(
    "ERROR: Failed to get Cap Contacts: " + capContactResult.getErrorMessage()
  );
  return;
}
// handle API call success and retrieve CapContactScriptModel
else {
  logDebug("Successfully retrieved " + contacts.length + " contacts");
  var contacts = capContactResult.getOutput(); // returns CapContactScriptModel array

  // initialize variables for Owner and Applicant models
  var ownerContactScriptModel = null;
  var applicantContactScriptModel = null;

  // locate the “Owner” and “Applicant” models, if any
  if (contacts && contacts.length > 0) {
    for (var i = 0; i < contacts.length; i++) {
      var contact = contacts[i];
      var contactType = contact.getCapContactModel().getContactType(); // get contact type
      logDebug("Found contact type: " + contactType);

      // determine if contact is an Owner or Applicant, disregarding string case
      if (contactType && contactType.equalsIgnoreCase("Owner")) {
        ownerContactScriptModel = contact; // assign Owner
        logDebug("Identified Owner contact");
      } else if (contactType && contactType.equalsIgnoreCase("Applicant")) {
        applicantContactScriptModel = contact; //assign Applicant
        logDebug("Identified Applicant contact");
      }
      // stop searching if both are found to optimize an inherent O(n) time complexity
      if (ownerContactScriptModel && applicantContactScriptModel) {
        break;
      }
    }
  }
  // handle no results found for Owner or Applicant models
  else {
    logDebug("No contacts found for this record");
    return;
  }

  // proceed only if Owner contact is found
  if (ownerContactScriptModel) {
    logDebug("Processing Owner contact...");

    // fetch the PeopleModel for the Owner contact
    var ownerPeopleResult = aa.people.getPeopleByCapContact(
      ownerContactScriptModel
    );

    // handle failure for retrieving Owner's PeopleModel
    if (!ownerPeopleResult.getSuccess()) {
      logDebug(
        "ERROR: Failed to get PeopleModel for Owner: " +
          ownerPeopleResult.getErrorMessage()
      );
      return;
    }
    //handle success for retrieving Owner's PeopleModel
    else {
      logDebug("Successfully retrieved PeopleModel for Owner");
      var ownerPeopleModel = ownerPeopleResult.getOutput(); // Owner's PeopleModel

      // attempt to retrieve Owner's phone number
      logDebug("Retrieving Owner's Phone Number...");
      var ownerPhone = ownerPeopleModel.getPhone1();

      // if Owner's phone is blank, assign Owner's number to Applicant's
      if (!ownerPhone || ownerPhone == "") {
        logDebug("Owner's phone is blank. Checking Applicant phone...");

        // attempt to retrieve Applicant PeopleModel
        if (applicantContactScriptModel) {
          var applicantPeopleResult = aa.people.getPeopleByCapContact(
            applicantContactScriptModel
          );
          // handle failure in retrieving Applicant's PeopleModel
          if (!applicantPeopleResult.getSuccess()) {
            logDebug(
              "ERROR: Failed to get PeopleModel for Applicant: " +
                applicantPeopleResult.getErrorMessage()
            );
            return;
          }
          //handle success in retrieving Applicant's PeopleModel/phone number
          else {
            logDebug("Successfully retrieved PeopleModel for Applicant");
            var applicantPeopleModel = applicantPeopleResult.getOutput();
            var applicantPhone = applicantPeopleModel.getPhone1();
            logDebug("Applicant's phone1: " + applicantPhone);

            // if Applicant has a phone number
            if (applicantPhone && applicantPhone != "") {
              logDebug("Applicant has a phone. Copying to Owner");

              // assign Applicant's phone number to Owner's phone number
              ownerPeopleModel.setPhone1(applicantPhone);
              logDebug(
                "Set Owner's Phone1 to: " + ownerPeopleModel.getPhone1()
              );
              // save Applicant's phone number to Owner's
              var saveResult = aa.people.editCapContact(
                ownerContactScriptModel
              );
              // handle error for saving the phone number
              if (!saveResult.getSuccess()) {
                logDebug(
                  "**ERROR: Failed to save updated Owner contact: " +
                    saveResult.getErrorMessage()
                );
                return;
              }
              // handle success for saving the phone number
              else {
                logDebug(
                  "Successfully saved updated Owner contact with Applicant phone."
                );
              }
            }
            // handle unsuccessful check for Applicant's phone number
            else {
              logDebug(
                "Applicant does not have a phone number. No phone number to copy."
              );
            }
          }
        }
        // handle unsuccessful check for Applicant PeopleModel
        else {
          logDebug(
            "Applicant contact not found for this record. Cannot copy phone number."
          );
        }
      }
      // handle Owner already having a phone number
      else {
        logDebug("Owner already has a phone number. No action needed.");
      }
    }
  } // handle unsuccessful check for Owner PeopleModel
  else {
    logDebug(
      "Owner contact not found for this record. Cannot copy phone number."
    );
  }
}
// log completion of script
logDebug("Finished script: CopyPhoneOnSubmit.js");
