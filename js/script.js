// script.js

// ===========================================================================
// Global Variables and IndexedDB Setup
// ===========================================================================

// IndexedDB database name and version
// Increment dbVersion when changing object store structure (adding/removing stores, indexes, etc.)
const dbName = 'jobTrackerDB';
const dbVersion = 1;

let db; // Variable to hold the database connection globally


/**
 * Opens the IndexedDB database, creating object stores and indexes if needed.
 * Handles schema upgrades via the onupgradeneeded event.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database connection.
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to open IndexedDB: "${dbName}" v${dbVersion}`);
        // Request to open the database
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => {
            // Log the error code from the DOMError
            console.error("IndexedDB database error:", event.target.error);
            // Reject the promise with a user-friendly error message or the native error
            reject(new Error("Database error: Could not open IndexedDB."));
        };

        request.onsuccess = (event) => {
            // Database connection is successful
            db = event.target.result;
            console.log(`Database "${dbName}" opened successfully (version ${db.version}).`);
            resolve(db); // Resolve the promise with the database connection
        };

        request.onupgradeneeded = (event) => {
            // This event is triggered if the database version is lower than the version specified in open()
            console.log(`Database upgrade needed from version ${event.oldVersion} to ${event.newVersion}`);
            const db = event.target.result;
            let objectStore;

            // Create 'applications' object store if it doesn't exist (only needed for version 1 initial creation)
            if (!db.objectStoreNames.contains('applications')) {
                console.log("Creating 'applications' object store...");
                // Create an object store named 'applications'.
                // keyPath 'id' means each object must have an 'id' property, which will be used as the unique key.
                // { autoIncrement: true } could be used instead of keyPath if you don't generate your own IDs.
                objectStore = db.createObjectStore('applications', { keyPath: 'id' });

                // Create indexes for properties that will be queried frequently.
                // Indexes allow for efficient searching/filtering/sorting without scanning the entire store.
                console.log("Creating indexes on 'applications' store...");
                objectStore.createIndex('status', 'status', { unique: false });
                objectStore.createIndex('companyName', 'companyName', { unique: false });
                objectStore.createIndex('applicationDate', 'applicationDate', { unique: false });
                objectStore.createIndex('deadline', 'deadline', { unique: false, multiEntry: false });
                 objectStore.createIndex('progressStage', 'progressStage', { unique: false });

                console.log("'applications' object store and indexes created.");

            } else if (event.oldVersion < 2) {
                 // Example for a future upgrade (version 2)
                 // This block would run if upgrading from version 1 to 2
                 // const transaction = event.target.transaction; // Get transaction for this upgrade
                 // objectStore = transaction.objectStore('applications');
                 // if (!objectStore.indexNames.contains('newFieldName')) {
                 //    console.log("Adding new index 'newFieldName'...");
                 //    objectStore.createIndex('newFieldName', 'newFieldName', { unique: false });
                 //    console.log("Index 'newFieldName' created.");
                 // }
                 console.log("Upgrade logic for future versions would go here.");
            }
            // Add more else if blocks for subsequent versions (e.g., event.oldVersion < 3)

            console.log("Database upgrade event finished.");
        };

         // Handle unexpected database version changes (e.g., if another tab opens a newer version)
         request.onversionchange = (event) => {
             console.warn(`Database "${dbName}" version change detected (from ${event.oldVersion} to ${event.newVersion}). Closing database connection.`);
             db.close(); // Close the current database connection
             // Notify the user that the page needs to be reloaded to work with the new database version.
             alert("The application database has been updated. Please reload this page to continue.");
             // Prevent default event handling to avoid infinite loops in some browsers
             event.preventDefault();
         };
    });
}

/**
 * Ensures the global database connection (`db`) is open and ready.
 * If not open, attempts to open it. This function should be awaited
 * before performing any IndexedDB transactions.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the open database connection.
 * @throws {Error} If the database cannot be opened.
 */
async function ensureDatabaseOpen() {
    // Check if the 'db' variable holds an open database connection
    if (db && db.readyState === 'open') {
        return db; // Return the existing open connection
    }

    // If db is null, closed, or closing, attempt to open it
    console.log("Database connection not open. Attempting to open...");
    try {
        const connection = await openDatabase();
        db = connection; // Store the new connection globally
        console.log("IndexedDB connection established.");
        return db;
    } catch (error) {
        console.error("FATAL ERROR: Failed to open IndexedDB during ensureDatabaseOpen.", error);
        // Re-throw the error so the caller knows it failed and can handle it (e.g., show error UI)
        throw error;
    }
}


// ===========================================================================
// Utility Functions
// ===========================================================================

/**
 * Escape HTML special characters from a string to prevent XSS attacks.
 * Safely displays user-provided text in HTML.
 * @param {*} text - The input value to escape. Can be null, undefined, string, or number.
 * @returns {string|*} The escaped string, or the original value if not a string.
 */
function escapeHtml(text) {
    // Handle non-string inputs gracefully
    if (typeof text !== 'string') {
        // If text is null, undefined, number etc., return it directly.
        // toString() might be an option depending on desired output.
        return text;
    }
    // Create a temporary div element
    const div = document.createElement('div');
    // Set the text content of the div (browser automatically escapes HTML)
    div.textContent = text;
    // Return the inner HTML of the div, which contains the escaped string
    return div.innerHTML;
}

/**
 * Generates a unique ID string. Uses timestamp and a random part.
 * Ensures the ID is unlikely to collide.
 * @returns {string} A unique string ID.
 */
function generateUniqueId() {
    // Using timestamp plus a random string for a reasonably unique ID
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}


/**
 * Resets the application form to the default 'Add New Application' state.
 * Clears all input fields, resets the form title and submit button text,
 * clears the hidden application ID, and sets the default application date.
 * Assumes HTML elements have specific IDs ('applicationForm', 'formTitle',
 * 'applicationId', 'applicationDate') and the submit button has class 'submit-btn'.
 */
function resetForm() {
    const form = document.getElementById('applicationForm');
    const formTitle = document.getElementById('formTitle');
    const appIdInput = document.getElementById('applicationId'); // Hidden input
    // Find the submit button specifically within the form
    const submitButton = form ? form.querySelector('.submit-btn') : null;

    if (!form) {
        console.error("Application form (#applicationForm) not found. Cannot reset form.");
        return; // Cannot reset if form element is missing
    }

    // Use the built-in form reset method
    form.reset();
    console.log("Form fields reset.");

    // Clear the hidden application ID field (essential for switching from Edit to Add)
    if (appIdInput) {
        appIdInput.value = '';
        console.log("Application ID input cleared.");
    } else {
         console.warn("Hidden application ID input (#applicationId) not found.");
    }


    // Reset form title back to 'Add New Application' state
    if (formTitle) {
        formTitle.textContent = 'Add New Application';
         console.log("Form title reset to 'Add New Application'.");
    } else {
         console.warn("Form title element (#formTitle) not found.");
    }


    // Reset the submit button text back to 'Add Application'
    if (submitButton) {
        submitButton.textContent = 'Add Application';
        console.log("Submit button text reset.");
    } else {
         console.warn("Submit button (.submit-btn) not found within form.");
    }


    // Set the default value for the application date input to today's date
    const today = new Date().toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
    const dateInput = document.getElementById('applicationDate');
     if (dateInput) {
         dateInput.value = today;
          console.log(`Application date set to today: ${today}`);
     } else {
         console.warn("Application Date input (#applicationDate) not found.");
     }
}


// ===========================================================================
// View Management & Navigation
// ===========================================================================

/**
 * Switches the active view displayed to the user. Hides all '.view' elements
 * and shows the one corresponding to viewName. Updates navigation button states.
 * Also triggers view-specific setup/data loading logic.
 * Assumes view containers have IDs like 'viewNameView' and navigation buttons
 * have IDs like 'viewNameBtn'.
 * @param {string} viewName - The name of the view to show ('home', 'list', 'dashboard', 'kanban').
 * @param {string} [subViewAction] - Optional parameter for view-specific actions (e.g., 'edit' in 'home' view).
 * @param {*} [subViewData] - Optional data for sub-view actions (e.g., application ID for editing).
 */
function switchView(viewName, subViewAction = null, subViewData = null) {
    console.log(`Switching view: ${viewName}${subViewAction ? ' (' + subViewAction + ')' : ''}`);

    // --- Hide all views ---
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
         if(view) {
             view.classList.remove('active');
             // Potentially set aria-hidden="true" for hidden views for accessibility
             view.setAttribute('aria-hidden', 'true');
         }
     });

     // --- Determine and Show the Target View ---
     const targetViewId = viewName + 'View'; // Construct the target view element ID
     const targetView = document.getElementById(targetViewId);

     if (targetView) {
         targetView.classList.add('active'); // Add 'active' class to show it
         targetView.setAttribute('aria-hidden', 'false'); // Make visible to screen readers
         console.log(`View "${targetViewId}" set to active.`);
     } else {
         console.error(`Target view element with ID "${targetViewId}" not found! Cannot switch view.`);
         // Optionally, fall back to a default view like 'home'
         if (viewName !== 'home' && document.getElementById('homeView')) {
             console.log("Falling back to home view.");
             document.getElementById('homeView').classList.add('active');
             document.getElementById('homeView').setAttribute('aria-hidden', 'false');
             // Still log the error about the requested view missing
         } else {
              // If home view also doesn't exist, there's a critical issue
              console.error("Critical error: Could not find requested view or fallback home view.");
              // Could display a global error message here
         }
         return; // Stop the function if the target view element isn't found
     }


    // --- Update Navigation Buttons State ---
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
         const buttonViewName = btn.id.replace('Btn', ''); // Get the view name from button ID

         // If the button's view name matches the target view name
         if (buttonViewName === viewName) {
             btn.classList.add('active');
             btn.setAttribute('aria-pressed', 'true'); // Indicate selected state
         } else {
             btn.classList.remove('active');
              btn.setAttribute('aria-pressed', 'false'); // Indicate not selected
         }
     });


    // --- Trigger View-Specific Logic ---
    // This section calls functions needed specifically when entering a view.
    // Add conditions for each implemented view.
    if (viewName === 'list') {
        console.log("Entering List view: Triggering application display.");
        // When switching to the list view, fetch and render all applications
        getAllApplicationsFromDB() // This function will fetch data
            .then(applications => {
                renderApplicationsList(applications); // This function will render the HTML cards
                 // setupActionButtonsListeners() should be called once on init, not here
                 // renderApplicationsList will regenerate the cards, but event delegation handles clicks on the new elements
            })
            .catch(error => {
                console.error("Failed to display applications in list view:", error);
                 // Display a prominent error message to the user within the list area
                 const jobsListElement = document.getElementById('jobsList');
                 const jobsCountElement = document.getElementById('jobsCount');
                 if(jobsListElement) {
                     jobsListElement.innerHTML = `
                         <div class="empty-state" style="color: var(--error-color); border-color: var(--error-color);">
                              <h3>Error Loading Applications</h3>
                              <p>Could not load your application data. Please check your browser's developer console for details.</p>
                              <p>${error.message || 'Unknown error'}</p>
                         </div>
                     `; // Use empty state styling for error message
                      if(jobsCountElement) jobsCountElement.textContent = 'Error'; // Update count display
                 } else {
                      // Fallback to basic alert if list container isn't found
                      alert("Error loading applications for list view.");
                 }

            });

    } else if (viewName === 'dashboard') {
        console.log("Entering Dashboard view: Triggering stats display.");
        // Implement and call your function to fetch data and update stats/charts
        // updateStatsDisplay(); // Function to be created later
        // renderDashboardCharts(); // Function to be created later

    } else if (viewName === 'kanban') {
        console.log("Entering Kanban view: Triggering board display.");
        // Implement and call your function to fetch data filtered by status and render kanban columns/cards
        // renderKanbanBoard(); // Function to be created later
        // setupDragAndDrop(); // Setup drag/drop listeners *within the kanban view* (to be created later)

    } else if (viewName === 'home') {
        console.log("Entering Home (Add/Edit) view.");
        // When switching to the home view, we should reset the form *unless*
        // we are switching specifically for an edit action.

         if (subViewAction === 'edit' && subViewData) {
             console.log(`Specific action: load application ID ${subViewData} for editing.`);
             // loadApplicationForEdit handles populating the form AND changing title/button
             loadApplicationForEdit(subViewData).catch(console.error); // Load data if editing
         } else {
             console.log("No specific action: resetting form for new application.");
             // Reset form to 'Add New Application' state if not editing
             resetForm(); // Ensure form is clear for adding
         }
         // setupApplicationForm() is called once on init to set up the listener.

    }
    // Add logic for any other custom views here
}

/**
 * Sets up click event listeners for the navigation buttons in the header.
 * Assumes button IDs match view names followed by 'Btn' (e.g., 'homeBtn').
 * Assumes buttons have class 'nav-btn'.
 */
function setupNavButtons() {
    // Select all navigation buttons using the class name
    const navButtons = document.querySelectorAll('.nav-btn');

    // Add a click listener to each button
    navButtons.forEach(btn => {
        // Use optional chaining ? safely
        btn.addEventListener('click', () => {
            // Extract the view name from the button's ID (e.g., 'homeBtn' -> 'home')
            const viewName = btn.id.replace('Btn', '');
            // Call switchView with the extracted view name
            switchView(viewName);
        });
         // Add initial aria-pressed attribute for accessibility (handled in switchView now)
         // btn.setAttribute('aria-pressed', 'false');
    });
     console.log("Navigation button click listeners set up.");
}


/**
 * Sets up the submit event listener for the main application form.
 * Assumes the form element has the ID 'applicationForm' and calls handleFormSubmit
 * when the form is submitted. Also sets the default value for the application date.
 */
function setupApplicationForm() {
    const form = document.getElementById('applicationForm');
    if (form) {
        // Add event listener for the form's submit event
        form.addEventListener('submit', handleFormSubmit);

        // Set the default value of the application date input to today's date
        // (Also done in resetForm, but doing it here handles the initial state)
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('applicationDate'); // Assumes input has this ID
         if (dateInput) {
             dateInput.value = today;
              console.log(`Initial application date set to today: ${today}`);
         } else {
             console.warn("Application Date input (#applicationDate) not found during form setup.");
         }

        console.log("Application form submit listener set up.");
    } else {
        console.error("Application form (#applicationForm) not found for setupForm function!");
    }
}


/**
 * Sets up a click event listener on the main list container using event delegation.
 * Catches clicks on action buttons (like Edit and Delete) dynamically rendered
 * within the job cards and handles the corresponding logic.
 * Assumes the container has ID 'jobsList' and buttons have class 'action-btn'
 * with a 'data-id' attribute storing the application ID.
 */
function setupActionButtonsListeners() {
    const jobsListContainer = document.getElementById('jobsList'); // The parent container for all job cards
    if (!jobsListContainer) {
        console.error("Jobs list container (#jobsList) not found for setting up action button listeners!");
        return; // Cannot set up listeners if the container doesn't exist
    }

    // Attach a single click event listener to the parent container
    jobsListContainer.addEventListener('click', async (event) => {
        // Use .closest() to check if the clicked element or any of its ancestors is a button with class 'action-btn'
        const targetButton = event.target.closest('.action-btn');

        // If the click wasn't on an action button, do nothing
        if (!targetButton) {
            return;
        }

        // Get the application ID from the data-id attribute of the clicked button
        const appId = targetButton.dataset.id;

        // Ensure the button has an ID associated with it
        if (!appId) {
            console.error("Clicked action button is missing a data-id attribute!", targetButton);
            // Provide user feedback if button is misconfigured
            // showNotification('warning', 'Error: Cannot identify application for this action.'); // Replace alert
             alert("Error: Cannot identify application for this action.");
            return;
        }

        console.log(`Action button "${targetButton.textContent.trim()}" clicked for application ID: ${appId}`);


        // --- Handle Different Action Button Types ---
        // Check which specific action button was clicked using its class
        if (targetButton.classList.contains('edit')) {
            console.log(`Edit action triggered for ID: ${appId}`);
            // Switch to the 'home' view and pass parameters to load the application for editing
             // switchView will handle the resetForm and then loadApplicationForEdit will fill it
            switchView('home', 'edit', appId);

        } else if (targetButton.classList.contains('delete')) {
            console.log(`Delete action triggered for ID: ${appId}`);

            // Confirm deletion with the user
            const confirmDelete = confirm('Are you sure you want to delete this application? This action cannot be undone.');

            if (confirmDelete) {
                try {
                    // Perform the delete operation using the IndexedDB helper
                    await deleteApplicationFromDB(appId);
                    console.log(`Application ID ${appId} successfully deleted from DB.`);

                    // Provide success feedback to the user
                    // showNotification('success', 'Application deleted.'); // Replace alert
                     alert('Application deleted successfully!'); // Basic feedback

                    // --- Update UI after Deletion ---
                    // Re-fetch and re-render the list to show the updated state.
                    // This is simpler than trying to remove the DOM element manually,
                    // especially when filtering/sorting is applied.
                    getAllApplicationsFromDB()
                        .then(applications => {
                            renderApplicationsList(applications); // Re-render the entire list
                            console.log("Application list re-rendered after deletion.");
                            // setupActionButtonsListeners(); // NOT needed here because using delegation on static parent
                        })
                        .catch(error => {
                            console.error("Error re-rendering list after deletion:", error);
                            // showNotification('error', 'Error refreshing list after deletion.'); // Replace alert
                             alert("Error refreshing application list.");
                        });


                } catch (error) {
                    // Handle errors during the deletion process
                    console.error(`Failed to delete application ID ${appId}:`, error);
                     // showNotification('error', `Error deleting: ${error.message || error}`); // Replace alert
                    alert(`Error deleting application: ${error.message || error}`); // Basic error feedback
                }
            } else {
                console.log(`Delete of application ID ${appId} cancelled by user.`);
            }
        }
         // Add more action button types here as features are added (e.g., toggle status, view details modal, add interview)
         // Make sure the button in HTML has the appropriate class (e.g., 'action-btn add-interview')
         // } else if (targetButton.classList.contains('add-interview')) {
         //      // Open modal or sub-form to add interview for this appId
         //      openAddInterviewModal(appId);
         // }

    }); // End of jobsListContainer click listener

    console.log("Delegated action button listeners set up on #jobsList container.");
}


/**
 * Fetches a specific application by its ID and populates the form for editing.
 * Assumes the form has standard input IDs matching application properties
 * and a hidden input field with ID 'applicationId'. Updates form title and button text.
 * @param {string} id - The ID of the application to load.
 * @returns {Promise<void>} A promise that resolves when the form is populated.
 */
async function loadApplicationForEdit(id) {
    const form = document.getElementById('applicationForm');
    const formTitle = document.getElementById('formTitle'); // Element to change form title
    const appIdInput = document.getElementById('applicationId'); // Hidden input for storing the ID
    const submitButton = form ? form.querySelector('.submit-btn') : null; // Submit button

    // Check for critical form elements
    if (!form || !formTitle || !appIdInput || !submitButton) {
        console.error("Required form elements (#applicationForm, #formTitle, #applicationId, .submit-btn) not found for loadApplicationForEdit!");
         // showNotification('error', 'Internal error: Cannot prepare form.'); // Replace alert
        alert("Internal error: Cannot prepare form for editing.");
        return; // Cannot proceed
    }

    try {
        // Fetch the application data from IndexedDB
        const application = await getApplicationFromDB(id);

        // Check if the application was found
        if (!application) {
            console.warn(`Application with ID ${id} not found for editing. Could have been deleted.`);
             // showNotification('warning', 'Application not found. It may have been deleted.'); // Replace alert
            alert("Application not found. It may have been deleted.");
            // Switch back to list view which will refresh and show it's missing
            switchView('list');
            return; // Stop processing
        }

        console.log(`Loading application ID ${id} into form.`);

        // --- Populate the Form Fields ---
        // Access form elements by their 'name' property on the form element (more reliable than ID on form)
        // Or by document.getElementById if name/id match. Use graceful accessors (?. or check)
        // if a field might be missing in old data or the HTML.

        // Basic fields (assume these exist in form based on initial HTML structure)
        if (form.elements.jobTitle) form.elements.jobTitle.value = application.jobTitle || '';
        if (form.elements.companyName) form.elements.companyName.value = application.companyName || '';
        if (form.elements.applicationDate) form.elements.applicationDate.value = application.applicationDate || '';
        if (form.elements.status) form.elements.status.value = application.status || '';
        if (form.elements.notes) form.elements.notes.value = application.notes || '';

        // Advanced fields (check if these exist in your HTML form before trying to set value)
        if (form.elements.jobPostingUrl) form.elements.jobPostingUrl.value = application.jobPostingUrl || '';
        if (form.elements.salary) form.elements.salary.value = application.salary || '';
        if (form.elements.location) form.elements.location.value = application.location || '';
        if (form.elements.deadline) form.elements.deadline.value = application.deadline || '';
        if (form.elements.progressStage) form.elements.progressStage.value = application.progressStage || '';

        // --- Populating arrays (interviews, contacts, documents) UI ---
        // This is complex and requires dynamic creation of form elements or lists.
        // We are not implementing the UI to *edit* these arrays here yet, only basic fields.
        // When the form is submitted (handleFormSubmit), it merges the saved array data back in.
        // TODO: Implement functions like renderInterviewsForm(application.interviewDates) when building full edit UI.


        // --- Set the Hidden Application ID ---
        // This tells handleFormSubmit that the form is for an update, not an add.
        appIdInput.value = application.id;
        console.log(`Hidden application ID set to: ${application.id}`);

        // --- Update Form UI for Editing Mode ---
        formTitle.textContent = 'Edit Application'; // Change form title
        submitButton.textContent = 'Save Changes'; // Change button text
        console.log("Form UI updated for 'Edit' mode.");

        // Optional: Scroll the form into view after populating it
         form.scrollIntoView({ behavior: 'smooth', block: 'start' });


    } catch (error) {
        console.error(`Failed to load application ID ${id} for editing:`, error);
         // showNotification('error', `Error loading application data: ${error.message || error}`); // Replace alert
        alert(`Error loading application data for editing: ${error.message || error}`); // Basic error feedback
        // Optionally switch back to list view or show error overlay
    }
}


/**
 * Handles the main form submission for adding new applications or updating existing ones.
 * Checks the hidden 'applicationId' field to determine if it's an add or edit operation.
 * Collects form data, saves to IndexedDB, resets form, and updates UI.
 * Assumes the form has ID 'applicationForm'.
 */
async function handleFormSubmit(event) {
    event.preventDefault(); // Prevent default page reload on form submission

    const form = event.target; // The form element
    const appIdInput = document.getElementById('applicationId'); // The hidden input for ID


    // --- Basic Form Validation ---
    if (!form.checkValidity()) {
        console.log("Form validation failed.");
        form.reportValidity(); // Trigger native browser validation feedback
        // Optional: Add custom validation feedback here
        // showNotification('warning', 'Please fill in all required fields.'); // Replace alert
        alert('Please fill in all required fields.');
        return; // Stop the function if form is not valid
    }

    console.log("Form is valid. Collecting data...");

    // --- Collect Data from Form ---
    // Get data from the form fields. Ensure IDs match the HTML.
    // Access form elements by name or ID. Using form.elements is robust.
    const applicationDataFromForm = {
        // Get the ID from the hidden input. If it's empty, it's an ADD operation.
        id: appIdInput ? appIdInput.value.trim() : '',

        jobTitle: form.elements.jobTitle ? form.elements.jobTitle.value.trim() : '',
        companyName: form.elements.companyName ? form.elements.companyName.value.trim() : '',
        applicationDate: form.elements.applicationDate ? form.elements.applicationDate.value : '',
        status: form.elements.status ? form.elements.status.value : '', // Selected value from dropdown
        notes: form.elements.notes ? form.elements.notes.value.trim() : '',

        // Get values for advanced fields if they exist in the HTML form
        jobPostingUrl: form.elements.jobPostingUrl ? form.elements.jobPostingUrl.value.trim() : '',
        salary: form.elements.salary ? form.elements.salary.value.trim() : '',
        location: form.elements.location ? form.elements.location.value.trim() : '',
        deadline: form.elements.deadline ? form.elements.deadline.value : '',
        progressStage: form.elements.progressStage ? form.elements.progressStage.value : '',

        // Interview dates, contacts, documents:
        // If you implement complex sub-forms for these, you'll need to collect data here.
        // For now, we will merge existing arrays from the DB when editing, as these fields
        // are just static placeholders in the initial HTML.
        interviewDates: [], // Will be overwritten with existing data if editing
        contacts: [],     // Will be overwritten with existing data if editing
        documents: [],    // Will be overwritten with existing data if editing

        dateAdded: '', // Will be overwritten with existing data if editing, or set for new add
    };


    // --- Determine Add or Edit Mode and Prepare Final Data Object ---
    const isEditing = !!applicationDataFromForm.id; // Check if the ID field has a value

    let finalApplicationObjectToSave = { ...applicationDataFromForm }; // Start with form data


     // --- Logic for EDIT Mode: Merge with Existing Data ---
    if (isEditing) {
        console.log(`Detected Edit mode for application ID: ${applicationDataFromForm.id}`);
        try {
            // Fetch the current version of the application from the DB
            const existingApp = await getApplicationFromDB(applicationDataFromForm.id);

            if (existingApp) {
                console.log("Merging form data with existing DB data...");
                // Merge data: form data overwrites existing data for fields present in form.
                // Existing data is preserved for fields NOT in the form (like our arrays).
                finalApplicationObjectToSave.interviewDates = existingApp.interviewDates || []; // Preserve existing array
                finalApplicationObjectToSave.contacts = existingApp.contacts || [];         // Preserve existing array
                finalApplicationObjectToSave.documents = existingApp.documents || [];       // Preserve existing array
                finalApplicationObjectToSave.dateAdded = existingApp.dateAdded || new Date().toISOString(); // Preserve original dateAdded
                 // Preserve progressStage if it wasn't explicitly set via the form in edit mode
                 if (!finalApplicationObjectToSave.progressStage) {
                     finalApplicationObjectToSave.progressStage = existingApp.progressStage || existingApp.status;
                 }


                // Double-check essential fields even after merge (should be caught by form validation already)
                 if (!finalApplicationObjectToSave.jobTitle || !finalApplicationObjectToSave.companyName || !finalApplicationObjectToSave.applicationDate || !finalApplicationObjectToSave.status) {
                     console.warn("Merged object is missing required data.");
                     alert('Error processing data: Missing required fields.');
                     return; // Stop processing
                 }


            } else {
                // This happens if the hidden ID was set, but the record doesn't exist (e.g., deleted in another tab)
                console.warn(`Application with ID ${applicationDataFromForm.id} not found for update. It might have been deleted.`);
                alert("The application you were trying to edit was not found. It might have been deleted.");
                // Optionally, reset the form to add mode and stop processing
                 resetForm();
                 // switchView('list'); // Could switch back to list which will show it missing
                 return; // Stop processing
            }

        } catch (error) {
             console.error("Error fetching existing application for merge during update:", error);
             alert("Error preparing data for saving changes. Please try again.");
             return; // Stop the process on error
         }
     }


     // --- Logic for ADD Mode: Generate ID, Set Date Added, Initial Stage ---
    if (!isEditing) {
        console.log("Detected Add mode.");
        // Generate a unique ID for the new application
        finalApplicationObjectToSave.id = generateUniqueId();
        console.log("Generated new unique ID:", finalApplicationObjectToSave.id);

        // Set the date the application was added to the database
        finalApplicationObjectToSave.dateAdded = new Date().toISOString();

        // Set the initial progress stage to match the selected status
         finalApplicationObjectToSave.progressStage = finalApplicationObjectToSave.status;

        // Ensure required fields from the form are present for adding (should be caught by form validation)
        if (!finalApplicationObjectToSave.jobTitle || !finalApplicationObjectToSave.companyName || !finalApplicationObjectToSave.applicationDate || !finalApplicationObjectToSave.status) {
            console.warn("Final object missing required data for adding.");
             alert('Error processing data: Missing required fields for new entry.');
             return; // Stop processing
         }
         // Initialize arrays for new entries explicitly if needed (handled by default values in object)
         finalApplicationObjectToSave.interviewDates = [];
         finalApplicationObjectToSave.contacts = [];
         finalApplicationObjectToSave.documents = [];

    }


    // --- Perform IndexedDB Operation (Add or Update) ---
    try {
        if (isEditing) {
            // If in edit mode, call the update function
            await updateApplicationInDB(finalApplicationObjectToSave);
            console.log(`Application ID ${finalApplicationObjectToSave.id} updated successfully.`);
            // showNotification('success', 'Changes saved!'); // Replace alert later
            alert('Changes saved successfully!'); // Basic feedback

        } else {
            // If in add mode, call the add function
            await addApplicationToDB(finalApplicationObjectToSave);
            console.log(`New application ID ${finalApplicationObjectToSave.id} added successfully.`);
             // showNotification('success', 'Application added!'); // Replace alert later
            alert('Application added successfully!'); // Basic feedback
        }

        // --- Post-Operation Actions ---
        // Reset the form back to the default 'Add New Application' state
        resetForm();

        // Switch to the list view to allow the user to see their entries
        // switchView will automatically fetch and re-render the list
        switchView('list'); // You could change this to 'home' if they might want to add another

    } catch (error) {
        // Handle errors during the add/update operation
        console.error('Failed to save/update application in IndexedDB:', error);
        const errorMessage = isEditing ? 'saving changes' : 'adding application';
         // showNotification('error', `Error ${errorMessage}: ${error.message || error}`); // Replace alert later
        alert(`Error ${errorMessage}. Please try again.\nDetails: ${error.message || error}`); // Basic error feedback
    }
}


// ===========================================================================
// Data Display (List View) & Card Rendering
// ===========================================================================

/**
 * Renders the list of job applications in the UI (#jobsList element).
 * Clears existing content and inserts dynamically created job card elements.
 * Also updates the application count display.
 * Assumes HTML structure includes #jobsList (container) and #jobsCount (count display).
 * This function only renders; data fetching (e.g., getAllApplicationsFromDB) is done elsewhere (e.g., in switchView).
 * @param {Array<object>} applications - An array of application objects to display.
 */
function renderApplicationsList(applications) {
    const jobsListContainer = document.getElementById('jobsList'); // The div where cards go
    const jobsCountElement = document.getElementById('jobsCount'); // The element showing the total count

    // Ensure essential display elements exist
    if (!jobsListContainer || !jobsCountElement) {
        console.error("Required DOM elements for application list rendering (#jobsList or #jobsCount) not found!");
        return; // Cannot render without them
    }

    console.log(`Starting to render ${applications ? applications.length : 0} applications.`);

    // Clear any existing content in the list container
    jobsListContainer.innerHTML = '';

    // Update the displayed count
    const count = applications ? applications.length : 0;
    jobsCountElement.textContent = `${count} Application${count !== 1 ? 's' : ''}`;
    // Set aria-live for accessibility readers to announce count changes
    jobsCountElement.setAttribute('aria-live', 'polite');


    // Check if the provided applications array is empty or null
    if (!applications || applications.length === 0) {
        console.log("No applications to display. Rendering empty state.");
        // Insert the empty state HTML (copied from your HTML/CSS)
        jobsListContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No Applications Yet</h3>
                <p>Start tracking your job applications by adding your first one using the "Add Application" button.</p>
            </div>
        `;
        return; // Stop here, no cards to render
    }

    // --- Default Sorting (Initial Render) ---
    // If you've implemented search/filter/sort controls, you'd typically sort the
    // array based on the current controls' state *before* calling renderApplicationsList.
    // For this consolidated snippet, we'll add a simple default sort by dateAdded descending.
    console.log("Sorting applications by dateAdded (newest first) for display.");
    const applicationsToRender = [...applications]; // Create a copy to avoid modifying the original array if needed elsewhere

     applicationsToRender.sort((a, b) => {
        // Use dateAdded for the primary sort, fallback to applicationDate if missing?
         // Assuming dateAdded is always present as we set it.
        const dateA = new Date(a.dateAdded || 0);
        const dateB = new Date(b.dateAdded || 0);
        // Sort descending (newest first)
        return dateB.getTime() - dateA.getTime();
    });
    // --- End Default Sorting ---


    // Loop through the (potentially sorted) array of applications
    applicationsToRender.forEach(application => {
        // For each application object, create its corresponding HTML card element
        const applicationCardElement = createApplicationCard(application);
        // Append the created card element to the list container
        jobsListContainer.appendChild(applicationCardElement);
    });

    console.log(`Rendered ${applicationsToRender.length} application cards.`);
    // Note: Action button listeners are set up once via delegation in setupActionButtonsListeners() on page load.
    // No need to re-attach listeners after rendering cards in renderApplicationsList.
}

/**
 * Creates a single job application card HTML element (as a DOM node).
 * This function should build the complex card structure defined in your CSS.
 * Populates the card with application data, includes status/deadline/progress indicators,
 * action buttons (Edit/Delete), and data attributes needed for interaction.
 * This function requires careful mapping of application data properties to HTML elements and CSS classes.
 * @param {object} application - The application data object from IndexedDB.
 * @returns {HTMLElement} The dynamically created job card element (a DIV).
 */
function createApplicationCard(application) {
    // Create the main div element for the job card
    const card = document.createElement('div');
    // Add the base CSS class for job cards
    card.className = 'job-card';
    // Store the application ID using a data attribute (essential for interactions)
    card.setAttribute('data-id', application.id);
    // Make the card draggable for the Kanban board functionality later
    card.setAttribute('draggable', true);

     // Add CSS classes based on the status and progress stage for visual styling/filtering
     // Normalize status/stage names for use as class names (lowercase, replace spaces/slashes with hyphens)
     const statusClass = `status-${(application.status || '').toLowerCase().replace(/\s+|\//g, '-')}`;
     const stageClass = `stage-${(application.progressStage || application.status || '').toLowerCase().replace(/\s+|\//g, '-')}`;
     card.classList.add(statusClass, stageClass);


    // --- Format Data and Determine Dynamic Content ---

    // Format application date for display
    const formattedApplicationDate = application.applicationDate
        ? new Date(application.applicationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A'; // Handle missing date


    // Determine status text and CSS class based on the 'status' property
    // Define a mapping of status values (from DB/form) to display text and CSS classes
    const statusDisplayMapping = {
        'applied': { text: 'Applied', class: 'status-applied' },
        'screening': { text: 'Screening', class: 'status-screening' },
        'interviewing': { text: 'Interviewing', class: 'status-interviewing' },
        'offer': { text: 'Offer', class: 'status-offer' },
        'rejected': { text: 'Rejected', class: 'status-rejected' },
        'offer accepted': { text: 'Accepted', class: 'status-accepted' }, // Example of a specific final stage
         // Add mappings for all possible status/stage values in your application
    };
    // Get the display info for the current status, default to showing the raw value if not mapped
    const currentStatusInfo = statusDisplayMapping[(application.status || '').toLowerCase()] || { text: application.status || 'Unknown', class: 'status-unknown' };


     // --- Deadline Indicator Logic and HTML ---
     let deadlineHtml = '';
     if (application.deadline) {
         try {
             const deadlineDate = new Date(application.deadline);
             const today = new Date();
             today.setHours(0, 0, 0, 0); // Reset time component for accurate day calculation

             const timeDiff = deadlineDate.getTime() - today.getTime(); // Difference in milliseconds
             const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Difference in full days, rounded up

             let indicatorClass = 'deadline-normal'; // Default class (green)
             let indicatorText = `${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; // Default text (formatted date)
             let indicatorIcon = '📅'; // Default icon

             if (dayDiff < 0) {
                 indicatorClass = 'deadline-urgent'; // Red for overdue
                 indicatorText = `OVERDUE (${Math.abs(dayDiff)} days ago)`;
                 indicatorIcon = '🚨';
             } else if (dayDiff <= 7) { // Within the next 7 days (including today)
                 indicatorClass = 'deadline-soon'; // Orange for soon
                 indicatorText = `Ends in ${dayDiff} day${dayDiff !== 1 ? 's' : ''}`;
                 indicatorIcon = '⏳';
             } // Else remains deadline-normal (>= 8 days or no deadline)


             // Construct the HTML snippet for the deadline detail item
             deadlineHtml = `
                 <div class="job-detail-item">
                      <span class="job-label">Deadline:</span>
                      <span class="job-value">
                          <span class="deadline-indicator ${indicatorClass}" aria-label="Deadline: ${indicatorText}">${indicatorIcon} ${indicatorText}</span>
                      </span>
                  </div>
             `;
         } catch (e) {
             console.error("Error processing deadline date for application ID", application.id, application.deadline, e);
             // Render an error state for the deadline if date parsing fails
             deadlineHtml = `
                 <div class="job-detail-item">
                      <span class="job-label">Deadline:</span>
                      <span class="job-value error-text" title="Invalid Deadline Date">⚠️ Invalid Date</span>
                  </div>
             `;
         }
     }
     // --- End Deadline Indicator HTML ---


    // --- Progress Bar Logic and HTML ---
     // Define the ordered list of stages for progress calculation.
     // This array order determines the 'sequence' for the progress bar.
     const orderedProgressStages = ['Applied', 'Screening', 'Interview 1', 'Interview 2', 'Final Interview', 'Offer Received']; // Define your sequential stages
     const terminationStages = ['Offer Accepted', 'Rejected']; // Stages that end the process (not part of sequential steps)

     const currentStage = application.progressStage || application.status; // Prefer progressStage if set, fallback to status
     // Optional: Normalize the current stage string for comparison if needed
     const currentStageNormalized = (currentStage || '').charAt(0).toUpperCase() + (currentStage || '').slice(1).toLowerCase(); // Example: "applied" -> "Applied"

     let progressPercentage = 0; // Default 0%
     let progressBarColorClass = 'progress-initial'; // Optional class for bar coloring

     const stageIndex = orderedProgressStages.indexOf(currentStageNormalized);

     if (stageIndex !== -1) {
         // Calculate percentage based on sequential stages completed vs total sequential stages
         // Avoid dividing by zero if orderedStages is empty or has 1 item
         if (orderedProgressStages.length > 1) {
             progressPercentage = ((stageIndex + 1) / orderedProgressStages.length) * 90; // Reach up to 90% before final steps
         } else if (orderedProgressStages.length === 1 && stageIndex === 0) {
              progressPercentage = 50; // Just applied might be 50% if only 1 stage defined? Or 20%? Define based on feel.
         }

     } else if (currentStageNormalized === 'Offer Received') {
          // Special case: Offer Received is a significant step
          progressPercentage = 95; // Close to complete, but not 100% yet
           progressBarColorClass = 'progress-offer';
     }
     else if (currentStageNormalized === 'Offer Accepted') {
         progressPercentage = 100; // Complete!
         progressBarColorClass = 'progress-complete';
     } else if (currentStageNormalized === 'Rejected') {
         progressPercentage = 0; // Rejected, maybe progress goes back to 0 or shows a specific state
         progressBarColorClass = 'progress-rejected';
         // You might add CSS to dim rejected cards or progress bars
         card.classList.add('job-card-rejected'); // Add class to card for specific styling
     }
     // Handle any other stage names not in the defined lists as 0% or a specific percentage

    // Clamp percentage between 0 and 100
    progressPercentage = Math.max(0, Math.min(100, progressPercentage));

    const progressBarHtml = `
         <div class="progress-bar ${progressBarColorClass}" role="progressbar" aria-valuenow="${progressPercentage.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="Application progress: ${currentStage || 'Unknown Stage'}">
             <div class="progress-fill" style="width: ${progressPercentage.toFixed(0)}%;"></div>
         </div>
    `;
    // --- End Progress Bar HTML ---


     // --- Interviews List HTML ---
     let interviewsHtml = '';
     if (application.interviewDates && application.interviewDates.length > 0) {
         interviewsHtml = `
             <div class="job-interview-list">
                 <strong>Interviews:</strong>
                 <ul>
                     ${application.interviewDates.map((interview, index) => {
                         // Safely format interview date/time and escape data
                         const interviewDate = interview.date ? new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date N/A';
                         const interviewTime = interview.time ? `at ${escapeHtml(interview.time)}` : '';
                         const interviewType = escapeHtml(interview.type || 'Call');
                         const interviewLink = interview.link ? `<a href="${escapeHtml(interview.link)}" target="_blank" rel="noopener noreferrer" aria-label="${interviewType} link">Link</a>` : '';
                         const interviewLocation = interview.location ? `, Location: ${escapeHtml(interview.location)}` : '';

                         return `
                             <li>
                                 ${interviewDate} - ${interviewType} ${interviewTime} ${interviewLocation} ${interviewLink}
                                 {/* TODO: Add Edit/Delete buttons for individual interviews here */}
                             </li>
                         `;
                     }).join('')} {/* map returns array, join to a string */}
                 </ul>
                  {/* TODO: Add 'Add Interview' button here if allowing inline add from card */}
             </div>
         `;
     }
     // --- End Interviews List HTML ---


     // --- Contacts List HTML ---
     let contactsHtml = '';
     if (application.contacts && application.contacts.length > 0) {
         contactsHtml = `
             <div class="job-contact-list">
                 <strong>Contacts:</strong>
                 <ul>
                     ${application.contacts.map((contact, index) => {
                         // Safely escape contact details
                         const contactName = escapeHtml(contact.name || 'Anonymous');
                         const contactTitle = escapeHtml(contact.title || 'N/A');
                         const contactEmail = contact.email ? `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : '';
                         const contactPhone = escapeHtml(contact.phone || '');
                          const contactLinkedIn = contact.linkedInUrl ? `<a href="${escapeHtml(contact.linkedInUrl)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile for ${contactName}">LinkedIn</a>` : '';

                         return `
                             <li>
                                 ${contactName} (${contactTitle}) ${contactEmail} ${contactPhone} ${contactLinkedIn}
                                 {/* TODO: Add Edit/Delete buttons for individual contacts here */}
                             </li>
                         `;
                     }).join('')}
                 </ul>
                  {/* TODO: Add 'Add Contact' button here if allowing inline add from card */}
             </div>
         `;
     }
     // --- End Contacts List HTML ---


     // --- Documents List HTML (Metadata only) ---
      let documentsHtml = '';
      if (application.documents && application.documents.length > 0) {
          documentsHtml = `
              <div class="job-document-list">
                  <strong>Documents:</strong>
                   <ul>
                       ${application.documents.map((doc, index) => {
                            // Safely escape document metadata
                            const docName = escapeHtml(doc.fileName || 'Untitled Document');
                            const docType = escapeHtml(doc.fileType || 'File');
                            // Assuming no actual file content or URL stored in DB for this basic implementation
                           return `<li>${docName} (${docType}) {/* TODO: Add View/Download button if path/URL stored */}</li>`;
                       }).join('')}
                   </ul>
                  {/* TODO: Add 'Add Document' button here if allowing inline add from card */}
              </div>
          `;
      }
     // --- End Documents List HTML ---


    // --- Action Buttons HTML ---
    // These buttons are crucial for Edit, Delete, and triggering modals for Interviews/Contacts
     const actionButtonsHtml = `
         <div class="job-actions">
             <button class="action-btn edit" data-id="${application.id}" aria-label="Edit application: ${escapeHtml(application.jobTitle)} at ${escapeHtml(application.companyName)}">
                 <span aria-hidden="true">✏️</span> Edit
             </button>
             <button class="action-btn delete" data-id="${application.id}" aria-label="Delete application: ${escapeHtml(application.jobTitle)} at ${escapeHtml(application.companyName)}">
                 <span aria-hidden="true">🗑️</span> Delete
             </button>
             {/* TODO: Add 'Add Interview' button that triggers a modal, related to this application */}
             {/* <button class="action-btn add" data-action="add-interview" data-id="${application.id}" aria-label="Add interview for ${escapeHtml(application.jobTitle)} at ${escapeHtml(application.companyName)}">
                 <span aria-hidden="true">📞</span> Add Interview
             </button> */}
              {/* TODO: Add 'Add Contact' button */}
              {/* <button class="action-btn add" data-action="add-contact" data-id="${application.id}" aria-label="Add contact for ${escapeHtml(application.jobTitle)} at ${escapeHtml(application.companyName)}">
                 <span aria-hidden="true">👥</span> Add Contact
             </button> */}
             {/* Add other specific action buttons as features are added (e.g., Mark as Offer, Mark as Rejected) */}
         </div>
     `;
     // --- End Action Buttons HTML ---


    // --- Construct the final card inner HTML using template literals ---
    // Include the structure and CSS class names defined in your style.css
    // Use ternary operators or check for presence of optional fields before including their HTML
    card.innerHTML = `
        <div class="job-header">
            <div>
                <div class="job-title">${escapeHtml(application.jobTitle || 'Untitled')}</div>
                <div class="job-company">${escapeHtml(application.companyName || 'No Company')}</div>
            </div>
            <div class="job-status ${currentStatusInfo.class}">${currentStatusInfo.text}</div>
        </div>

        <div class="job-details">
            <div class="job-detail-item">
                <span class="job-label">Applied:</span>
                <span class="job-value">${formattedApplicationDate}</span>
            </div>
            ${deadlineHtml} {/* Include deadline HTML if generated */}
            ${application.location ? `
                 <div class="job-detail-item">
                     <span class="job-label">Location:</span>
                     <span class="job-value">${escapeHtml(application.location)}</span>
                 </div>
            ` : ''}
            ${application.salary ? `
                 <div class="job-detail-item">
                     <span class="job-label">Salary:</span>
                     <span class="job-value">${escapeHtml(application.salary)}</span>
                 </div>
            ` : ''}
            ${application.jobPostingUrl ? `
                 <div class="job-detail-item">
                     <span class="job-label">Link:</span>
                     <span class="job-value"><a href="${escapeHtml(application.jobPostingUrl)}" target="_blank" rel="noopener noreferrer">View Posting</a></span>
                 </div>
            ` : ''}
             <div class="job-detail-item">
                 <span class="job-label">Stage:</span>
                 <span class="job-value">${escapeHtml(currentStage || 'N/A')}</span> {/* Display current stage/status */}
             </div>
        </div>

        ${progressBarHtml} {/* Include progress bar HTML */}

        ${application.notes ? `
            <div class="job-notes">
                <strong>Notes:</strong> ${escapeHtml(application.notes)}
            </div>
        ` : ''}

        ${interviewsHtml} {/* Include interviews HTML if generated */}
        ${contactsHtml} {/* Include contacts HTML if generated */}
        ${documentsHtml} {/* Include documents HTML if generated */}


        ${actionButtonsHtml} {/* Include action buttons HTML */}
    `;

    return card; // Return the created DOM element
}

// --- Add other data retrieval/display functions here later (e.g., for Dashboard, Kanban) ---

// ===========================================================================
// Action Button Handling (Edit/Delete/Modal triggers using Delegation)
// Moved setupActionButtonsListeners above renderApplicationsList in the consolidated list
// but it functions the same.
// ===========================================================================


// ===========================================================================
// Modal Handling (Generic functions - implementation needed for specific modals)
// ===========================================================================

/**
 * Shows a modal dialog.
 * Assumes modals have class 'modal' and the main modal container has an 'id'.
 * @param {string} modalId - The ID of the modal element to show (e.g., 'editModal').
 * @param {object} [data] - Optional data to pass to the modal handler (e.g., application ID).
 */
function showModal(modalId, data = null) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false'); // Make modal visible to screen readers

        // Optional: Add specific logic based on modalId and data
        // For example, load application data for an edit modal
         if (modalId === 'editModal' && data && data.appId) {
              console.log(`Loading data for editModal for app ID: ${data.appId}`);
             // loadApplicationDataIntoEditModal(data.appId); // Function to implement
         }
        // TODO: Implement other modal-specific setup handlers here
         setupModalCloseListeners(modal); // Ensure close button/overlay closes modal

    } else {
        console.error(`Modal element with ID "${modalId}" not found!`);
    }
}

/**
 * Hides the currently active modal dialog.
 * Assumes modals have class 'modal' and use the 'active' class to be shown.
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId); // Pass ID or hide the currently active one
    // Or find the currently active modal: const activeModal = document.querySelector('.modal.active');

    if (modal && modal.classList.contains('active')) {
         // TODO: Clean up any modal-specific listeners or state before closing
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true'); // Hide from screen readers

         // TODO: Implement other modal-specific cleanup handlers here
    } else if (modalId) {
         console.warn(`Attempted to hide modal ID "${modalId}", but it was not active.`);
    } else {
         console.warn("hideModal called but no active modal found.");
    }
}

/**
 * Sets up event listeners to close a modal (e.g., clicking close button or outside).
 * Call this when showing a modal.
 * @param {HTMLElement} modalElement - The modal DOM element.
 */
function setupModalCloseListeners(modalElement) {
    // Listener for clicking the close button
    const closeButton = modalElement.querySelector('.modal-close');
    if (closeButton) {
        // Remove any previous listener to prevent duplicates if modal content is re-rendered
        // closeButton.removeEventListener('click', ...); // Need reference to the listener function
         closeButton.onclick = () => hideModal(modalElement.id); // Simple approach for this structure
         console.log(`Close listener added for modal ID: ${modalElement.id}`);
    } else {
        console.warn(`Modal close button (.modal-close) not found for modal ID: ${modalElement.id}.`);
    }

    // Listener for clicking outside the modal content (on the overlay)
    // Ensure click is directly on the modal container, not propagation from inside modal-content
    modalElement.onclick = (event) => {
        // Check if the clicked element is the modal background itself
        if (event.target === modalElement) {
            hideModal(modalElement.id);
             console.log(`Modal ID ${modalElement.id} closed by clicking overlay.`);
        }
    };
     console.log(`Overlay listener added for modal ID: ${modalElement.id}`);

     // Optional: Add Escape key listener for accessibility
     // document.addEventListener('keydown', handleEscapeKey);
     // function handleEscapeKey(event) {
     //    if (event.key === 'Escape' || event.key === 'Esc') {
     //       const activeModal = document.querySelector('.modal.active');
     //       if (activeModal) {
     //          hideModal(activeModal.id);
     //           // Remove this keydown listener or ensure it only runs when a modal is active
     //           document.removeEventListener('keydown', handleEscapeKey); // Remove after use or manage state
     //       }
     //    }
     // }
     // This requires careful management if multiple things use Escape.
}


// ===========================================================================
// Notification Handling (Simple example)
// ===========================================================================

// Container where notifications will be appended (ensure this ID exists in HTML)
const notificationContainer = document.getElementById('notificationContainer');
if (!notificationContainer) {
     console.warn("Notification container (#notificationContainer) not found. Notifications will not be displayed.");
}

/**
 * Shows a temporary notification message to the user.
 * Assumes HTML has a container with ID 'notificationContainer' and CSS styles for '.notification'.
 * @param {string} type - The type of notification ('success', 'error', 'warning', 'info'). Maps to CSS classes.
 * @param {string} message - The message text to display.
 * @param {number} [duration=5000] - How long the notification stays visible in milliseconds.
 */
function showNotification(type, message, duration = 5000) {
    if (!notificationContainer) {
        console.error(`Notification container not found, logging message instead: [${type.toUpperCase()}] ${message}`);
         alert(`Notification: ${message}`); // Fallback alert
        return;
    }

    // Create the notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // Add base class and type class
    notification.textContent = message; // Set the message text

    // Append to the container
    notificationContainer.appendChild(notification);

    // Force a reflow to ensure the transition happens
    void notification.offsetWidth;

    // Add the 'show' class to trigger the transition
    notification.classList.add('show');
    console.log(`Showing "${type}" notification: "${message}"`);

    // Set a timeout to remove the notification
    const timer = setTimeout(() => {
        // Start the fade-out transition by removing the 'show' class
        notification.classList.remove('show');
        console.log("Hiding notification.");

        // After the transition ends, remove the element from the DOM
        // Listen for the 'transitionend' event
        notification.addEventListener('transitionend', () => {
             // Check if the notification is actually transitioning *out* (opacity becoming 0)
             // to avoid removing it if some other property transitions.
            if (parseFloat(getComputedStyle(notification).opacity) < 0.1) {
                 notification.remove();
                 console.log("Notification element removed from DOM.");
            }
        }, { once: true }); // Use { once: true } to automatically remove the listener after it fires

         // Fallback removal in case transitionend doesn't fire for some reason (less common now)
         // setTimeout(() => { notification.remove(); }, 300); // Match CSS transition duration

    }, duration); // The duration the notification stays fully visible


     // Optional: Allow clicking to dismiss the notification
     // notification.addEventListener('click', () => {
     //    clearTimeout(timer); // Cancel the auto-hide timer
     //     notification.classList.remove('show'); // Start fade-out
     //     // The transitionend listener attached by the initial timer setup will handle removal
     // });

}


// ===========================================================================
// Initialization
// ===========================================================================

/**
 * Main initialization function that runs after the DOM is fully loaded.
 * Sets up the database, initial event listeners, and the first view.
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded. Starting application initialization...');

    try {
        // 1. Ensure the IndexedDB database is open and schema is set up.
        await ensureDatabaseOpen();
        console.log("IndexedDB database is ready.");
         // You can add a success notification here if the container exists
         if (notificationContainer) {
              showNotification('info', 'Database ready.', 2000); // Show info notification for a short time
         }


        // 2. Set up event listeners for navigation buttons.
        setupNavButtons();
        console.log("Navigation buttons setup complete.");


        // 3. Set up the main application form listener and default date.
        setupApplicationForm();
        console.log("Application form setup complete.");


        // 4. Set up the delegated event listener for actions on job cards (Edit/Delete/etc.)
        setupActionButtonsListeners();
        console.log("Job card action button delegation setup complete.");


        // 5. Reset the form to ensure it's in a clean 'Add' state initially.
        resetForm();
        console.log("Initial form reset complete.");


        // 6. Set up the dark mode toggle functionality (to be implemented)
         setupDarkModeToggle(); // Function will handle button click and theme class
         console.log("Dark mode toggle setup initiated (logic to be implemented).");

         // 7. Set up Search, Filter, Sort controls (to be implemented)
         setupSearchFilterSort();
          console.log("Search, Filter, Sort setup initiated (logic to be implemented).");

          // 8. Set up Drag and Drop for Kanban (called when Kanban view is rendered)


        // 9. Determine and show the initial view the user sees.
        // Default to the 'home' (Add Application) view.
        // switchView also triggers data loading for the list/dashboard/kanban views when they are selected.
        console.log("Determining initial view...");
        // You could add logic here to load a specific view based on URL hash or a stored preference.
        // Example: if(window.location.hash === '#list') { switchView('list'); } else { switchView('home'); }
         switchView('home'); // Start by showing the Add Application form


        console.log('Job Application Tracker: Initialization complete! Application is ready.');

    } catch (err) {
        // Catch any errors during the initial setup (most likely IndexedDB failure)
        console.error("FATAL ERROR during application initialization:", err);
         // Display a prominent error message to the user if the app can't start properly
         // Ensure this message is visible even if other parts of the UI fail
         const container = document.querySelector('.container');
         if(container) {
             // Clear content and add an error message
             container.innerHTML = `
                 <div style="padding: 40px; text-align: center; color: var(--error-color);">
                     <h1>Error Loading Application</h1>
                     <p>Could not start the job application tracker.</p>
                     <p>This may be due to your browser settings (e.g., IndexedDB disabled) or a critical error.</p>
                     <p>Please check your browser's console for details.</p>
                      <p><strong>Error:</strong> ${err.message || 'Unknown Initialization Error'}</p>
                 </div>
             `;
         } else {
             // Fallback if even the main container is missing
             document.body.innerHTML = `
                 <div style="padding: 20px; text-align: center; color: red;">
                      <h1>Error Loading Application</h1>
                      <p>A critical error occurred during startup: ${err.message || 'Unknown Error'}</p>
                 </div>
             `;
         }

         // showNotification('error', `Critical startup error: ${err.message || error}`, 0); // Display a persistent error notification

    }
});

// --- END of DOMContentLoaded Listener ---

// ===========================================================================
// Dark Mode Toggle (Placeholder - Implementation needed)
// ===========================================================================

function setupDarkModeToggle() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const body = document.body;

    if (!themeToggleBtn || !body) {
        console.warn("Theme toggle button or body element not found. Dark mode toggle will not work.");
        return;
    }

    // Function to set the theme based on a theme name ('light' or 'dark')
    function setTheme(themeName) {
        body.setAttribute('data-theme', themeName);
         // Update button text/icon based on theme
        themeToggleBtn.innerHTML = themeName === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        themeToggleBtn.setAttribute('aria-label', `Switch to ${themeName === 'dark' ? 'light' : 'dark'} mode`);

         // Store preference in localStorage (optional)
         localStorage.setItem('themePreference', themeName);
         console.log(`Theme set to: ${themeName}`);
    }

    // Check for saved theme preference on load
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme) {
        setTheme(savedTheme); // Apply the saved theme
    } else {
        // If no saved preference, check system preference (optional)
         if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
             setTheme('dark');
         } else {
            setTheme('light'); // Default to light mode
         }
    }


    // Add event listener to the toggle button
    themeToggleBtn.addEventListener('click', () => {
        // Toggle between 'light' and 'dark'
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme); // Apply the new theme
    });

    console.log("Dark mode toggle setup complete.");
}


// ===========================================================================
// Search, Filter, Sort Functionality (Placeholder - Implementation needed)
// ===========================================================================

function setupSearchFilterSort() {
     const searchInput = document.getElementById('searchInput');
     const statusFilter = document.getElementById('statusFilter');
     const dateFilter = document.getElementById('dateFilter');
     const sortButtons = document.querySelectorAll('.sort-btn');
     const resetFiltersBtn = document.getElementById('resetFiltersBtn');

     if (!searchInput || !statusFilter || !dateFilter || sortButtons.length === 0 || !resetFiltersBtn) {
         console.warn("Search, Filter, or Sort elements not fully found. Functionality will be limited.");
         // Optionally disable or hide the controls if elements are missing
         // return;
     }

     // --- State Variables for Filtering and Sorting ---
     let currentFilters = {
         searchText: '',
         status: '', // or an array for multiple statuses
         dateRange: '', // e.g., 'last-7-days', 'this-month'
         // Add other filters here
     };

     let currentSort = {
         field: 'dateAdded', // Default sort field
         order: 'desc',      // Default sort order ('asc' or 'desc')
     };

     // --- Filtering Logic ---
     // Function to apply filters to an array of applications
     function applyFilters(applications) {
         let filtered = applications;

         // 1. Apply Search Text Filter
         if (currentFilters.searchText) {
             const searchTerm = currentFilters.searchText.toLowerCase();
             filtered = filtered.filter(app =>
                 (app.jobTitle && app.jobTitle.toLowerCase().includes(searchTerm)) ||
                 (app.companyName && app.companyName.toLowerCase().includes(searchTerm)) ||
                 (app.notes && app.notes.toLowerCase().includes(searchTerm)) ||
                  (app.location && app.location.toLowerCase().includes(searchTerm))
                 // Add other searchable fields like contact names, interview notes if you want
             );
         }

         // 2. Apply Status Filter
         if (currentFilters.status) {
              // Assuming single status selection for now
             filtered = filtered.filter(app => app.status && app.status.toLowerCase() === currentFilters.status.toLowerCase());
             // If supporting multiple statuses, use an array: currentFilters.statuses.includes(app.status.toLowerCase())
         }

         // 3. Apply Date Range Filter
         if (currentFilters.dateRange && currentFilters.dateRange !== '') {
             const today = new Date();
             today.setHours(0, 0, 0, 0); // Start of today

             filtered = filtered.filter(app => {
                  if (!app.applicationDate) return false; // Cannot filter if no date
                  const appDate = new Date(app.applicationDate);
                 appDate.setHours(0,0,0,0); // Reset time for comparison

                 switch (currentFilters.dateRange) {
                     case 'last-7-days':
                         const lastWeek = new Date(today);
                         lastWeek.setDate(today.getDate() - 6); // 6 days before today to include 7 total
                         return appDate >= lastWeek && appDate <= today;
                     case 'last-30-days':
                          const lastMonth = new Date(today);
                         lastMonth.setDate(today.getDate() - 29); // 29 days before today to include 30 total
                         return appDate >= lastMonth && appDate <= today;
                     case 'this-month':
                         const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                         const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
                          endOfMonth.setHours(23, 59, 59, 999); // End of day
                         return appDate >= startOfMonth && appDate <= endOfMonth;
                     case 'this-year':
                         const startOfYear = new Date(today.getFullYear(), 0, 1);
                         const endOfYear = new Date(today.getFullYear(), 11, 31);
                          endOfYear.setHours(23, 59, 59, 999);
                         return appDate >= startOfYear && appDate <= endOfYear;
                     default:
                         return true; // No filter applied
                 }
             });
         }

         // --- Add other filters here (e.g., by location, salary range) ---


         console.log(`Applications filtered. Original count: ${applications.length}, Filtered count: ${filtered.length}`);
         return filtered; // Return the filtered array
     }


     // --- Sorting Logic ---
     // Function to apply current sort settings to an array of applications
     function applySorting(applications) {
         if (!currentSort.field) {
              // If no sort field selected, maybe default to date added desc
             return [...applications].sort((a, b) => {
                  const dateA = new Date(a.dateAdded || 0);
                  const dateB = new Date(b.dateAdded || 0);
                  return dateB.getTime() - dateA.getTime();
             });
         }

         const sorted = [...applications].sort((a, b) => {
             const fieldA = a[currentSort.field];
             const fieldB = b[currentSort.field];

             // Handle different data types for sorting (dates, numbers, strings)
             let compareResult = 0;
             if (typeof fieldA === 'string' && typeof fieldB === 'string') {
                 // String comparison (case-insensitive might be needed)
                 compareResult = fieldA.toLowerCase().localeCompare(fieldB.toLowerCase());
             } else if (fieldA instanceof Date && fieldB instanceof Date) {
                 // Date comparison
                 compareResult = fieldA.getTime() - fieldB.getTime();
             } else if (typeof fieldA === 'number' && typeof fieldB === 'number') {
                 // Number comparison
                 compareResult = fieldA - fieldB;
             } else {
                 // Handle missing/undefined values
                 if (fieldA == null && fieldB != null) compareResult = -1;
                 else if (fieldA != null && fieldB == null) compareResult = 1;
                 else if (fieldA == null && fieldB == null) compareResult = 0;
                 else {
                     // Fallback comparison for mixed types or complex objects
                     compareResult = String(fieldA).toLowerCase().localeCompare(String(fieldB).toLowerCase());
                 }
             }

             // Apply the sort order (ascending or descending)
             return currentSort.order === 'asc' ? compareResult : -compareResult;
         });

          console.log(`Applications sorted by ${currentSort.field} ${currentSort.order}.`);
         return sorted; // Return the sorted array
     }

     // --- Combine Filtering and Sorting ---
     // This is the main function to get data, apply controls, and trigger rendering
     async function filterSortAndRender() {
         console.log("Applying filters and sort, then rendering list.");
         try {
             // 1. Fetch ALL data from the database
             const allApplications = await getAllApplicationsFromDB(); // Reuses existing fetch function

             // 2. Apply current filters to the data
             const filteredApplications = applyFilters(allApplications);

             // 3. Apply current sort order to the filtered data
             const sortedApplications = applySorting(filteredApplications);

             // 4. Render the final, processed list to the UI
             renderApplicationsList(sortedApplications); // Reuses existing render function

             // Note: The jobsCount element is updated inside renderApplicationsList

         } catch (error) {
             console.error("Error filtering, sorting, and rendering applications:", error);
             // Show an error message in the list area or notification
             // renderApplicationsList() already has basic error handling if passed null/empty array,
             // but could add specific UI error display here.
             alert("Error applying filters/sort.");
         }
     }

     // --- Event Listeners for Controls ---

     // Search input listener (use debounce for performance on typing)
     let searchTimeoutId;
     searchInput?.addEventListener('input', (event) => {
          clearTimeout(searchTimeoutId); // Clear previous timer
          searchTimeoutId = setTimeout(() => {
              currentFilters.searchText = event.target.value;
               console.log("Search text changed:", currentFilters.searchText);
              filterSortAndRender(); // Re-filter, sort, and render
          }, 300); // Wait 300ms after typing stops
     });

     // Filter select listeners
     statusFilter?.addEventListener('change', (event) => {
          currentFilters.status = event.target.value;
          console.log("Status filter changed:", currentFilters.status);
          filterSortAndRender();
     });
      dateFilter?.addEventListener('change', (event) => {
           currentFilters.dateRange = event.target.value;
          console.log("Date filter changed:", currentFilters.dateRange);
           filterSortAndRender();
      });
     // Add listeners for other filter controls


     // Sort button listeners (handle toggle state and icon)
      sortButtons.forEach(button => {
          button.addEventListener('click', (event) => {
              const sortField = event.target.dataset.sort; // Get sort field from data attribute
              if (!sortField) return; // Button must have data-sort attribute

              // If clicking the currently active sort button, toggle the order
              if (currentSort.field === sortField) {
                  currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
              } else {
                  // If clicking a new sort button, set it as active and default to ascending (or descending?)
                  // Let's default to descending for date, ascending for string fields like company
                   currentSort.field = sortField;
                   // Determine default order: desc for date, asc for others? Or just stick to one default.
                   // Let's toggle order every click, regardless of current state for simplicity now.
                   currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc'; // Simplest: always toggle
                   // Or, a better default: if field changes, default to 'asc' for strings/numbers, 'desc' for dates
                  if (sortField === 'applicationDate' || sortField === 'dateAdded') currentSort.order = 'desc';
                   else currentSort.order = 'asc';
              }

              // Update button visuals (active state, arrow)
               sortButtons.forEach(btn => {
                  btn.classList.remove('active');
                   // Reset arrows for all buttons first
                   const arrowSpan = btn.querySelector('.sort-arrow');
                   if(arrowSpan) arrowSpan.textContent = ''; // Clear arrow
               });

              // Set the active class on the clicked button
              event.target.classList.add('active');

               // Update the arrow icon on the active button
               const activeArrowSpan = event.target.querySelector('.sort-arrow');
               if(activeArrowSpan) {
                   activeArrowSpan.textContent = currentSort.order === 'asc' ? '↑' : '↓';
               }

              console.log(`Sorting set: Field = ${currentSort.field}, Order = ${currentSort.order}`);
              filterSortAndRender(); // Re-sort and render
          });
      });

      // Set initial sort button active state and arrow on page load (or when list view is first shown)
     function setInitialSortButtonState() {
         sortButtons.forEach(button => {
             const field = button.dataset.sort;
             if (field === currentSort.field) {
                 button.classList.add('active');
                 const arrowSpan = button.querySelector('.sort-arrow');
                 if(arrowSpan) {
                     arrowSpan.textContent = currentSort.order === 'asc' ? '↑' : '↓';
                 }
             }
         });
     }
     // Call this function after setupSearchFilterSort completes in DOMContentLoaded, or in switchView('list')
      // Let's call it in switchView('list') or from renderApplicationsList's completion promise.
      // A simple approach is just to call it after setupSearchFilterSort.
      setInitialSortButtonState();


     // Reset Filters/Sort button
     resetFiltersBtn?.addEventListener('click', () => {
         // Reset filter state variables
         currentFilters = {
             searchText: '',
             status: '',
             dateRange: '',
         };
          // Reset sort state variables to default
         currentSort = {
             field: 'dateAdded', // Or null/empty
             order: 'desc',
         };

         // Reset UI controls
         if (searchInput) searchInput.value = '';
         if (statusFilter) statusFilter.value = '';
         if (dateFilter) dateFilter.value = '';

         // Reset sort button UI
          sortButtons.forEach(btn => {
              btn.classList.remove('active');
              const arrowSpan = btn.querySelector('.sort-arrow');
              if(arrowSpan) arrowSpan.textContent = '';
          });
          // Re-activate the default sort button state if a default is defined
          setInitialSortButtonState(); // Re-apply default visual state


         console.log("Filters and sort reset.");
         filterSortAndRender(); // Re-render with no filters/default sort
     });

     console.log("Search, Filter, Sort control listeners set up.");
     // Note: filterSortAndRender needs to be called initially when the list view is first shown (done in switchView('list')).

     // Populate status filter dropdown options dynamically?
     // You might want to populate the statusFilter dropdown based on actual statuses present in the DB,
     // or just use a predefined list matching your form options. Predefined is simpler for now.
}

// --- Add Dashboard Setup (updateStatsDisplay) later ---
// --- Add Kanban Setup (renderKanbanBoard, setupDragAndDrop) later ---
// --- Add Modal Listeners (setupModalListeners etc.) later ---
// --- Add Notification functions (showNotification) later ---


// ===========================================================================
// Main Initialization on DOM Ready
// ===========================================================================

/**
 * Entry point for the application. Runs when the HTML document is fully loaded and parsed.
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded: Starting app initialization.');

    try {
        // 1. Initialize IndexedDB
        // This ensures the database is open and object stores/indexes are created/updated.
        // We use await because subsequent operations depend on a valid DB connection.
        await ensureDatabaseOpen();
        console.log("IndexedDB connection successfully established and ready.");

        // 2. Set up main UI event listeners that are static
        // These are listeners on elements that exist when the DOM loads.
        setupNavButtons();             // Handles clicks on navigation buttons
        setupApplicationForm();        // Handles the form submit event
        setupActionButtonsListeners(); // Handles clicks on dynamically generated action buttons (Edit/Delete etc.) using delegation

        // 3. Set up features that need global initialization
        setupDarkModeToggle();         // Initializes and sets up toggle listener
        setupSearchFilterSort();       // Sets up listeners for filter/sort controls

        // 4. Reset the form to its default state (Add New Application)
        // This ensures the form is clean and ready when the user first sees the Home view.
        resetForm();

        // 5. Determine and show the initial view the user sees upon loading.
        // 'home' view by default. This call will trigger data loading/rendering for the chosen view.
        // The list view data will be loaded when switchView('list') is called for the first time.
        console.log("Initializing UI with default view...");
         switchView('home'); // Start by showing the Add Application form


        console.log('Application Initialization Complete.');

    } catch (err) {
        // If there's a critical error during initial setup (like IndexedDB failing)
        console.error('FATAL ERROR during DOMContentLoaded initialization:', err);
        // Display a prominent error message to the user as early as possible
        // The try...catch in ensureDatabaseOpen handles this by throwing, caught here.
        // The catch block in DOMContentLoaded provides a fallback UI message.
         const container = document.querySelector('.container');
         if(container) {
             container.innerHTML = `
                 <div style="padding: 40px; text-align: center; color: var(--error-color); background: var(--bg-primary);">
                     <h1 style="color: var(--error-color);">Application Error</h1>
                     <p>The application could not start.</p>
                     <p>Reason: ${err.message || 'Unknown initialization failure'}</p>
                     <p>Please ensure your browser supports IndexedDB and is configured correctly, or try refreshing.</p>
                     <small>See browser console for more details.</small>
                 </div>
             `;
         } else {
             document.body.innerHTML = `
                 <div style="padding: 20px; text-align: center; color: red;">
                      <h1>Application Initialization Failed</h1>
                      <p>A critical error prevented the application from starting.</p>
                      <p>Error: ${err.message || 'Unknown Error'}</p>
                 </div>
             `;
         }
         // showNotification('error', `Application failed to load: ${err.message || error}`, 0); // Use notification if container was missing
    }
});
