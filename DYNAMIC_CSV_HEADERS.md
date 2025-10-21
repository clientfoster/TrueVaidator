# Dynamic CSV Header Selection Feature

## Overview
This feature enhances the CSV upload functionality by allowing users to dynamically select which column contains email addresses, rather than requiring them to manually type the column name.

## Changes Made

### 1. Backend Changes (app.js)
- Added a new endpoint `/v1/csv/headers` that parses and returns the headers from an uploaded CSV file
- The existing CSV validation endpoint continues to accept the selected email column name

### 2. Frontend Changes (public/index.html)
- Added a dropdown select element for email column selection
- Added a warning message for validation
- Added appropriate CSS classes for showing/hiding elements

### 3. Frontend Logic Changes (public/script.js)
- Added event listener for CSV file input changes
- Implemented logic to parse CSV headers and populate the dropdown
- Modified the validation process to use either the dropdown selection or text input
- Added validation to ensure an email column is selected

### 4. Styling Changes (public/styles.css)
- Added styles for the hidden utility class
- Added styles for warning messages
- Updated form element styles to include select elements

## How It Works

1. When a user selects a CSV file, the frontend automatically sends the file to the new `/v1/csv/headers` endpoint
2. The backend parses the CSV and returns the column headers
3. The frontend populates a dropdown with these headers
4. The user selects the appropriate column that contains email addresses
5. When the user clicks "Validate CSV", the selected column name is sent to the validation endpoint
6. The backend processes the CSV using the specified email column

## Benefits

- Improved user experience by providing a visual selection of columns
- Reduced errors from typos in column names
- Automatic detection of available columns
- Fallback to manual input if headers cannot be parsed